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

// Obtener todos los autores
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                a.*,
                COUNT(ba.book_id) as book_count
            FROM authors a
            LEFT JOIN book_authors ba ON a.id = ba.author_id
        `;

        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            query += ` WHERE LOWER(a.name) LIKE LOWER($${paramCount})`;
            params.push(`%${search}%`);
        }

        query += `
            GROUP BY a.id, a.name, a.bio, a.birth_date, a.nationality, a.created_at
            ORDER BY a.name
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total
        let countQuery = 'SELECT COUNT(*) as total FROM authors';
        const countParams = [];

        if (search) {
            countQuery += ' WHERE LOWER(name) LIKE LOWER($1)';
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            authors: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener autores:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Obtener un autor por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const authorResult = await pool.query(`
            SELECT 
                a.*,
                COUNT(ba.book_id) as book_count
            FROM authors a
            LEFT JOIN book_authors ba ON a.id = ba.author_id
            WHERE a.id = $1
            GROUP BY a.id, a.name, a.bio, a.birth_date, a.nationality, a.created_at
        `, [id]);

        if (authorResult.rows.length === 0) {
            return res.status(404).json({ message: 'Autor no encontrado' });
        }

        // Obtener libros del autor
        const booksResult = await pool.query(`
            SELECT 
                b.id,
                b.title,
                b.isbn,
                b.publication_date,
                b.price,
                c.name as category_name
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            INNER JOIN book_authors ba ON b.id = ba.book_id
            WHERE ba.author_id = $1
            ORDER BY b.publication_date DESC
        `, [id]);

        const author = {
            ...authorResult.rows[0],
            books: booksResult.rows
        };

        res.json(author);
    } catch (error) {
        console.error('Error al obtener autor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Crear nuevo autor (solo empleados y admin)
router.post('/', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para crear autores' });
        }

        const { name, bio, birth_date, nationality } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'El nombre del autor es obligatorio' });
        }

        const result = await pool.query(`
            INSERT INTO authors (name, bio, birth_date, nationality)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [name, bio, birth_date, nationality]);

        res.status(201).json({
            message: 'Autor creado exitosamente',
            author: result.rows[0]
        });
    } catch (error) {
        console.error('Error al crear autor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Actualizar autor (solo empleados y admin)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar autores' });
        }

        const { id } = req.params;
        const { name, bio, birth_date, nationality } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'El nombre del autor es obligatorio' });
        }

        const result = await pool.query(`
            UPDATE authors 
            SET name = $1, bio = $2, birth_date = $3, nationality = $4
            WHERE id = $5
            RETURNING *
        `, [name, bio, birth_date, nationality, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Autor no encontrado' });
        }

        res.json({
            message: 'Autor actualizado exitosamente',
            author: result.rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar autor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Eliminar autor (solo admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo los administradores pueden eliminar autores' });
        }

        const { id } = req.params;

        // Verificar si hay libros asociados
        const booksResult = await pool.query('SELECT COUNT(*) as count FROM book_authors WHERE author_id = $1', [id]);
        
        if (parseInt(booksResult.rows[0].count) > 0) {
            return res.status(400).json({ 
                message: 'No se puede eliminar el autor porque tiene libros asociados' 
            });
        }

        const result = await pool.query('DELETE FROM authors WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Autor no encontrado' });
        }

        res.json({ message: 'Autor eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar autor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;