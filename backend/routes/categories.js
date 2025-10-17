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

// Obtener todas las categorías
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.*,
                COUNT(b.id) as book_count
            FROM categories c
            LEFT JOIN books b ON c.id = b.category_id
            GROUP BY c.id, c.name, c.description, c.created_at
            ORDER BY c.name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Obtener una categoría por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                c.*,
                COUNT(b.id) as book_count
            FROM categories c
            LEFT JOIN books b ON c.id = b.category_id
            WHERE c.id = $1
            GROUP BY c.id, c.name, c.description, c.created_at
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Crear nueva categoría (solo empleados y admin)
router.post('/', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para crear categorías' });
        }

        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
        }

        const result = await pool.query(`
            INSERT INTO categories (name, description)
            VALUES ($1, $2)
            RETURNING *
        `, [name, description]);

        res.status(201).json({
            message: 'Categoría creada exitosamente',
            category: result.rows[0]
        });
    } catch (error) {
        console.error('Error al crear categoría:', error);
        if (error.code === '23505') { // Violación de clave única
            return res.status(400).json({ message: 'Ya existe una categoría con ese nombre' });
        }
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Actualizar categoría (solo empleados y admin)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar categorías' });
        }

        const { id } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
        }

        const result = await pool.query(`
            UPDATE categories 
            SET name = $1, description = $2
            WHERE id = $3
            RETURNING *
        `, [name, description, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }

        res.json({
            message: 'Categoría actualizada exitosamente',
            category: result.rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar categoría:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Ya existe una categoría con ese nombre' });
        }
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Eliminar categoría (solo admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo los administradores pueden eliminar categorías' });
        }

        const { id } = req.params;

        // Verificar si hay libros asociados
        const booksResult = await pool.query('SELECT COUNT(*) as count FROM books WHERE category_id = $1', [id]);
        
        if (parseInt(booksResult.rows[0].count) > 0) {
            return res.status(400).json({ 
                message: 'No se puede eliminar la categoría porque tiene libros asociados' 
            });
        }

        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }

        res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;