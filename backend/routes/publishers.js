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

// Obtener todas las editoriales
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM publishers';
        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            query += ` WHERE (LOWER(name) LIKE LOWER($${paramCount}) OR LOWER(country) LIKE LOWER($${paramCount + 1}))`;
            params.push(`%${search}%`, `%${search}%`);
            paramCount++;
        }

        query += ' ORDER BY name LIMIT $' + (paramCount + 1) + ' OFFSET $' + (paramCount + 2);
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total
        let countQuery = 'SELECT COUNT(*) as total FROM publishers';
        const countParams = [];

        if (search) {
            countQuery += ` WHERE (LOWER(name) LIKE LOWER($1) OR LOWER(country) LIKE LOWER($2))`;
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            publishers: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener editoriales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Obtener una editorial por ID con sus libros
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const publisherResult = await pool.query('SELECT * FROM publishers WHERE id = $1', [id]);

        if (publisherResult.rows.length === 0) {
            return res.status(404).json({ message: 'Editorial no encontrada' });
        }

        // Obtener libros de esta editorial
        const booksResult = await pool.query(`
            SELECT 
                b.id,
                b.title,
                b.isbn,
                b.price,
                b.stock_quantity,
                b.publication_date,
                STRING_AGG(DISTINCT a.name, ', ') as authors
            FROM books b
            LEFT JOIN book_authors ba ON b.id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.id
            WHERE b.publisher_id = $1
            GROUP BY b.id, b.title, b.isbn, b.price, b.stock_quantity, b.publication_date
            ORDER BY b.title
            LIMIT 10
        `, [id]);

        // Obtener estadísticas
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_books,
                COALESCE(SUM(stock_quantity), 0) as total_stock,
                COALESCE(AVG(price), 0) as average_price
            FROM books 
            WHERE publisher_id = $1
        `, [id]);

        const publisher = {
            ...publisherResult.rows[0],
            books: booksResult.rows,
            statistics: statsResult.rows[0]
        };

        res.json(publisher);
    } catch (error) {
        console.error('Error al obtener editorial:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Crear nueva editorial (solo empleados y admin)
router.post('/', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para crear editoriales' });
        }

        const { name, country, website, email, phone, address } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }

        // Verificar si ya existe una editorial con el mismo nombre
        const existingPublisher = await pool.query('SELECT id FROM publishers WHERE LOWER(name) = LOWER($1)', [name]);

        if (existingPublisher.rows.length > 0) {
            return res.status(400).json({ message: 'Ya existe una editorial con este nombre' });
        }

        const result = await pool.query(`
            INSERT INTO publishers (name, country, website, email, phone, address)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, country, website, email, phone, address]);

        res.status(201).json({
            message: 'Editorial creada exitosamente',
            publisher: result.rows[0]
        });
    } catch (error) {
        console.error('Error al crear editorial:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Actualizar editorial (solo empleados y admin)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar editoriales' });
        }

        const { id } = req.params;
        const { name, country, website, email, phone, address } = req.body;

        // Verificar si la editorial existe
        const existingPublisher = await pool.query('SELECT * FROM publishers WHERE id = $1', [id]);

        if (existingPublisher.rows.length === 0) {
            return res.status(404).json({ message: 'Editorial no encontrada' });
        }

        // Verificar si ya existe otra editorial con el mismo nombre (si se está cambiando el nombre)
        if (name && name !== existingPublisher.rows[0].name) {
            const duplicateCheck = await pool.query('SELECT id FROM publishers WHERE LOWER(name) = LOWER($1) AND id != $2', [name, id]);

            if (duplicateCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Ya existe otra editorial con este nombre' });
            }
        }

        const result = await pool.query(`
            UPDATE publishers 
            SET name = COALESCE($1, name),
                country = COALESCE($2, country),
                website = COALESCE($3, website),
                email = COALESCE($4, email),
                phone = COALESCE($5, phone),
                address = COALESCE($6, address),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `, [name, country, website, email, phone, address, id]);

        res.json({
            message: 'Editorial actualizada exitosamente',
            publisher: result.rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar editorial:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Eliminar editorial (solo admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo los administradores pueden eliminar editoriales' });
        }

        const { id } = req.params;

        // Verificar si hay libros asociados a esta editorial
        const booksResult = await pool.query('SELECT COUNT(*) as count FROM books WHERE publisher_id = $1', [id]);

        if (parseInt(booksResult.rows[0].count) > 0) {
            return res.status(400).json({ 
                message: 'No se puede eliminar la editorial porque tiene libros asociados' 
            });
        }

        const deleteResult = await pool.query('DELETE FROM publishers WHERE id = $1 RETURNING *', [id]);

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ message: 'Editorial no encontrada' });
        }

        res.json({ message: 'Editorial eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar editorial:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Obtener libros de una editorial específica
router.get('/:id/books', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, search } = req.query;
        const offset = (page - 1) * limit;

        // Verificar que la editorial existe
        const publisherCheck = await pool.query('SELECT name FROM publishers WHERE id = $1', [id]);

        if (publisherCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Editorial no encontrada' });
        }

        let query = `
            SELECT 
                b.id,
                b.title,
                b.isbn,
                b.price,
                b.stock_quantity,
                b.publication_date,
                STRING_AGG(DISTINCT a.name, ', ') as authors,
                STRING_AGG(DISTINCT c.name, ', ') as categories
            FROM books b
            LEFT JOIN book_authors ba ON b.id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.id
            LEFT JOIN book_categories bc ON b.id = bc.book_id
            LEFT JOIN categories c ON bc.category_id = c.id
            WHERE b.publisher_id = $1
        `;

        const params = [id];
        let paramCount = 1;

        if (search) {
            paramCount++;
            query += ` AND (LOWER(b.title) LIKE LOWER($${paramCount}) OR b.isbn LIKE $${paramCount + 1})`;
            params.push(`%${search}%`, `%${search}%`);
            paramCount++;
        }

        query += `
            GROUP BY b.id, b.title, b.isbn, b.price, b.stock_quantity, b.publication_date
            ORDER BY b.title
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total
        let countQuery = `SELECT COUNT(*) as total FROM books WHERE publisher_id = $1`;
        const countParams = [id];

        if (search) {
            countQuery += ` AND (LOWER(title) LIKE LOWER($2) OR isbn LIKE $3)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            publisher_name: publisherCheck.rows[0].name,
            books: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener libros de la editorial:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;