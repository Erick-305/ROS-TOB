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

// Obtener todos los clientes (solo empleados y admin)
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para ver clientes' });
        }

        const { page = 1, limit = 10, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                c.*,
                u.name,
                u.email,
                u.phone,
                u.address,
                u.created_at as user_created_at,
                COUNT(i.id) as total_invoices,
                COALESCE(SUM(i.total_amount), 0) as total_purchased
            FROM customers c
            INNER JOIN users u ON c.user_id = u.id
            LEFT JOIN invoices i ON c.id = i.customer_id AND i.status != 'cancelled'
        `;

        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            query += ` WHERE (LOWER(u.name) LIKE LOWER($${paramCount}) OR LOWER(u.email) LIKE LOWER($${paramCount + 1}) OR LOWER(c.company_name) LIKE LOWER($${paramCount + 2}))`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            paramCount += 2;
        }

        query += `
            GROUP BY c.id, c.user_id, c.company_name, c.tax_id, c.credit_limit, 
                     c.discount_percentage, c.preferred_payment_method, c.created_at,
                     u.name, u.email, u.phone, u.address, u.created_at
            ORDER BY u.name
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;

        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM customers c
            INNER JOIN users u ON c.user_id = u.id
        `;

        const countParams = [];

        if (search) {
            countQuery += ` WHERE (LOWER(u.name) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($2) OR LOWER(c.company_name) LIKE LOWER($3))`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            customers: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Obtener un cliente por ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar permisos: admin/employee pueden ver cualquier cliente, 
        // customer solo puede ver su propia información
        if (req.user.role === 'customer') {
            const customerCheck = await pool.query(`
                SELECT c.id FROM customers c
                INNER JOIN users u ON c.user_id = u.id
                WHERE c.id = $1 AND u.id = $2
            `, [id, req.user.id]);

            if (customerCheck.rows.length === 0) {
                return res.status(403).json({ message: 'No tienes permisos para ver este cliente' });
            }
        } else if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para ver clientes' });
        }

        const customerResult = await pool.query(`
            SELECT 
                c.*,
                u.name,
                u.email,
                u.phone,
                u.address,
                u.created_at as user_created_at
            FROM customers c
            INNER JOIN users u ON c.user_id = u.id
            WHERE c.id = $1
        `, [id]);

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Obtener estadísticas del cliente
        const statsResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_invoices,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
                COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_purchased,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as total_paid,
                MAX(invoice_date) as last_purchase_date
            FROM invoices
            WHERE customer_id = $1
        `, [id]);

        // Obtener facturas recientes
        const invoicesResult = await pool.query(`
            SELECT 
                id,
                invoice_number,
                invoice_date,
                total_amount,
                status
            FROM invoices
            WHERE customer_id = $1 AND status != 'cancelled'
            ORDER BY invoice_date DESC
            LIMIT 10
        `, [id]);

        const customer = {
            ...customerResult.rows[0],
            statistics: statsResult.rows[0],
            recent_invoices: invoicesResult.rows
        };

        res.json(customer);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Crear nuevo cliente (solo empleados y admin)
router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para crear clientes' });
        }

        await client.query('BEGIN');

        const {
            name,
            email,
            phone,
            address,
            company_name,
            tax_id,
            credit_limit = 0,
            discount_percentage = 0,
            preferred_payment_method
        } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Nombre y email son obligatorios' });
        }

        // Verificar si el email ya existe
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        // Crear usuario con contraseña temporal
        const tempPassword = Math.random().toString(36).slice(-8);
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const userResult = await client.query(`
            INSERT INTO users (name, email, password, phone, address, role, is_verified)
            VALUES ($1, $2, $3, $4, $5, 'customer', true)
            RETURNING id
        `, [name, email, hashedPassword, phone, address]);

        const userId = userResult.rows[0].id;

        // Crear información del cliente
        const customerResult = await client.query(`
            INSERT INTO customers (user_id, company_name, tax_id, credit_limit, discount_percentage, preferred_payment_method)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [userId, company_name, tax_id, credit_limit, discount_percentage, preferred_payment_method]);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Cliente creado exitosamente',
            customer: {
                ...customerResult.rows[0],
                name,
                email,
                phone,
                address,
                temp_password: tempPassword
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear cliente:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// Actualizar cliente (empleados, admin o el propio cliente)
router.put('/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;

        // Verificar permisos
        if (req.user.role === 'customer') {
            const customerCheck = await client.query(`
                SELECT c.id FROM customers c
                INNER JOIN users u ON c.user_id = u.id
                WHERE c.id = $1 AND u.id = $2
            `, [id, req.user.id]);

            if (customerCheck.rows.length === 0) {
                return res.status(403).json({ message: 'No tienes permisos para actualizar este cliente' });
            }
        } else if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar clientes' });
        }

        await client.query('BEGIN');

        const {
            name,
            phone,
            address,
            company_name,
            tax_id,
            credit_limit,
            discount_percentage,
            preferred_payment_method
        } = req.body;

        // Obtener user_id del cliente
        const customerInfo = await client.query('SELECT user_id FROM customers WHERE id = $1', [id]);
        
        if (customerInfo.rows.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const userId = customerInfo.rows[0].user_id;

        // Actualizar información del usuario
        if (name || phone || address) {
            await client.query(`
                UPDATE users 
                SET name = COALESCE($1, name),
                    phone = COALESCE($2, phone),
                    address = COALESCE($3, address)
                WHERE id = $4
            `, [name, phone, address, userId]);
        }

        // Actualizar información del cliente
        const customerResult = await client.query(`
            UPDATE customers 
            SET company_name = COALESCE($1, company_name),
                tax_id = COALESCE($2, tax_id),
                credit_limit = COALESCE($3, credit_limit),
                discount_percentage = COALESCE($4, discount_percentage),
                preferred_payment_method = COALESCE($5, preferred_payment_method)
            WHERE id = $6
            RETURNING *
        `, [company_name, tax_id, credit_limit, discount_percentage, preferred_payment_method, id]);

        await client.query('COMMIT');

        res.json({
            message: 'Cliente actualizado exitosamente',
            customer: customerResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// Eliminar cliente (solo admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo los administradores pueden eliminar clientes' });
        }

        const { id } = req.params;

        // Verificar si hay facturas asociadas
        const invoicesResult = await pool.query('SELECT COUNT(*) as count FROM invoices WHERE customer_id = $1', [id]);
        
        if (parseInt(invoicesResult.rows[0].count) > 0) {
            return res.status(400).json({ 
                message: 'No se puede eliminar el cliente porque tiene facturas asociadas' 
            });
        }

        // Obtener user_id antes de eliminar
        const customerInfo = await pool.query('SELECT user_id FROM customers WHERE id = $1', [id]);
        
        if (customerInfo.rows.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const userId = customerInfo.rows[0].user_id;

        // Eliminar cliente (esto eliminará también el usuario por CASCADE si está configurado)
        await pool.query('DELETE FROM customers WHERE id = $1', [id]);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ message: 'Cliente eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;