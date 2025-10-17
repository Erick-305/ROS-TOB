const express = require('express');
const pool = require('../config/pool');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Obtener todos los libros con filtros
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, category, author, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                b.id,
                b.title,
                b.isbn,
                b.description,
                b.publication_date,
                b.pages,
                b.language,
                b.price,
                b.stock_quantity,
                b.image_url,
                c.name as category_name,
                p.name as publisher_name,
                STRING_AGG(a.name, ', ') as authors
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN publishers p ON b.publisher_id = p.id
            LEFT JOIN book_authors ba ON b.id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (category) {
            paramCount++;
            query += ` AND c.id = $${paramCount}`;
            params.push(category);
        }

        if (search) {
            paramCount++;
            query += ` AND (LOWER(b.title) LIKE LOWER($${paramCount}) OR LOWER(a.name) LIKE LOWER($${paramCount + 1}))`;
            params.push(`%${search}%`, `%${search}%`);
            paramCount++;
        }

        query += `
            GROUP BY b.id, b.title, b.isbn, b.description, b.publication_date, 
                     b.pages, b.language, b.price, b.stock_quantity, b.image_url, 
                     c.name, p.name
            ORDER BY b.title
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total de registros para paginación
        let countQuery = 'SELECT COUNT(DISTINCT b.id) as total FROM books b';
        if (category || search) {
            countQuery += ' LEFT JOIN categories c ON b.category_id = c.id';
            if (search) {
                countQuery += ' LEFT JOIN book_authors ba ON b.id = ba.book_id LEFT JOIN authors a ON ba.author_id = a.id';
            }
            countQuery += ' WHERE 1=1';
        }

        const countParams = [];
        let countParamCount = 0;

        if (category) {
            countParamCount++;
            countQuery += ` AND c.id = $${countParamCount}`;
            countParams.push(category);
        }

        if (search) {
            countParamCount++;
            countQuery += ` AND (LOWER(b.title) LIKE LOWER($${countParamCount}) OR LOWER(a.name) LIKE LOWER($${countParamCount + 1}))`;
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            books: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener libros:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Obtener un libro por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                b.*,
                c.name as category_name,
                p.name as publisher_name,
                p.address as publisher_address,
                STRING_AGG(a.name, ', ') as authors,
                ARRAY_AGG(a.id) as author_ids
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN publishers p ON b.publisher_id = p.id
            LEFT JOIN book_authors ba ON b.id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.id
            WHERE b.id = $1
            GROUP BY b.id, c.name, p.name, p.address
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Libro no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener libro:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Crear un nuevo libro (solo empleados y admin)
router.post('/', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para crear libros' });
        }

        const {
            title,
            isbn,
            description,
            publication_date,
            pages,
            language,
            price,
            stock_quantity,
            category_id,
            publisher_id,
            author_ids,
            image_url
        } = req.body;

        // Validaciones básicas
        if (!title || !price || !category_id) {
            return res.status(400).json({ message: 'Título, precio y categoría son obligatorios' });
        }

        // Insertar libro
        const bookResult = await pool.query(`
            INSERT INTO books (title, isbn, description, publication_date, pages, language, 
                              price, stock_quantity, category_id, publisher_id, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [title, isbn, description, publication_date, pages, language || 'Español',
            price, stock_quantity || 0, category_id, publisher_id, image_url]);

        const book = bookResult.rows[0];

        // Relacionar con autores si se proporcionaron
        if (author_ids && author_ids.length > 0) {
            for (const authorId of author_ids) {
                await pool.query(
                    'INSERT INTO book_authors (book_id, author_id) VALUES ($1, $2)',
                    [book.id, authorId]
                );
            }
        }

        // Registrar movimiento de inventario inicial
        if (stock_quantity > 0) {
            await pool.query(`
                INSERT INTO inventory_movements (book_id, movement_type, quantity, reference_type, notes, created_by)
                VALUES ($1, 'in', $2, 'initial', 'Stock inicial', $3)
            `, [book.id, stock_quantity, req.user.id]);
        }

        res.status(201).json({ message: 'Libro creado exitosamente', book });
    } catch (error) {
        console.error('Error al crear libro:', error);
        if (error.code === '23505') { // Violación de clave única
            return res.status(400).json({ message: 'El ISBN ya existe' });
        }
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Actualizar un libro (solo empleados y admin)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar libros' });
        }

        const { id } = req.params;
        const {
            title,
            isbn,
            description,
            publication_date,
            pages,
            language,
            price,
            category_id,
            publisher_id,
            author_ids,
            image_url
        } = req.body;

        // Actualizar libro
        await pool.query(`
            UPDATE books 
            SET title = $1, isbn = $2, description = $3, publication_date = $4,
                pages = $5, language = $6, price = $7, category_id = $8,
                publisher_id = $9, image_url = $10, updated_at = CURRENT_TIMESTAMP
            WHERE id = $11
        `, [title, isbn, description, publication_date, pages, language,
            price, category_id, publisher_id, image_url, id]);

        // Actualizar relaciones con autores
        if (author_ids) {
            // Eliminar relaciones existentes
            await pool.query('DELETE FROM book_authors WHERE book_id = $1', [id]);
            
            // Crear nuevas relaciones
            for (const authorId of author_ids) {
                await pool.query(
                    'INSERT INTO book_authors (book_id, author_id) VALUES ($1, $2)',
                    [id, authorId]
                );
            }
        }

        res.json({ message: 'Libro actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar libro:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Actualizar stock de un libro (solo empleados y admin)
router.patch('/:id/stock', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar stock' });
        }

        const { id } = req.params;
        const { quantity, movement_type, notes } = req.body;

        if (!quantity || !movement_type) {
            return res.status(400).json({ message: 'Cantidad y tipo de movimiento son obligatorios' });
        }

        // Obtener stock actual
        const currentStock = await pool.query('SELECT stock_quantity FROM books WHERE id = $1', [id]);
        
        if (currentStock.rows.length === 0) {
            return res.status(404).json({ message: 'Libro no encontrado' });
        }

        const current = currentStock.rows[0].stock_quantity;
        let newStock;

        if (movement_type === 'in') {
            newStock = current + parseInt(quantity);
        } else if (movement_type === 'out') {
            newStock = current - parseInt(quantity);
            if (newStock < 0) {
                return res.status(400).json({ message: 'Stock insuficiente' });
            }
        } else {
            newStock = parseInt(quantity); // adjustment
        }

        // Actualizar stock
        await pool.query('UPDATE books SET stock_quantity = $1 WHERE id = $2', [newStock, id]);

        // Registrar movimiento
        await pool.query(`
            INSERT INTO inventory_movements (book_id, movement_type, quantity, reference_type, notes, created_by)
            VALUES ($1, $2, $3, 'manual', $4, $5)
        `, [id, movement_type, quantity, notes, req.user.id]);

        res.json({ 
            message: 'Stock actualizado exitosamente',
            old_stock: current,
            new_stock: newStock
        });
    } catch (error) {
        console.error('Error al actualizar stock:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Eliminar un libro (solo admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo los administradores pueden eliminar libros' });
        }

        const { id } = req.params;

        // Verificar si el libro existe
        const bookExists = await pool.query('SELECT id FROM books WHERE id = $1', [id]);
        
        if (bookExists.rows.length === 0) {
            return res.status(404).json({ message: 'Libro no encontrado' });
        }

        // Eliminar libro (las relaciones se eliminan por CASCADE)
        await pool.query('DELETE FROM books WHERE id = $1', [id]);

        res.json({ message: 'Libro eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar libro:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;