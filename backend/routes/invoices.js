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

// Obtener todas las facturas
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, customer_id, date_from, date_to } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                i.id,
                i.invoice_number,
                i.invoice_date,
                i.due_date,
                i.subtotal,
                i.tax_amount,
                i.discount_amount,
                i.total_amount,
                i.status,
                i.notes,
                u.name as customer_name,
                c.company_name,
                emp.name as employee_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN users emp ON i.employee_id = emp.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (status) {
            paramCount++;
            query += ` AND i.status = $${paramCount}`;
            params.push(status);
        }

        if (customer_id) {
            paramCount++;
            query += ` AND i.customer_id = $${paramCount}`;
            params.push(customer_id);
        }

        if (date_from) {
            paramCount++;
            query += ` AND i.invoice_date >= $${paramCount}`;
            params.push(date_from);
        }

        if (date_to) {
            paramCount++;
            query += ` AND i.invoice_date <= $${paramCount}`;
            params.push(date_to);
        }

        query += ` ORDER BY i.invoice_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total para paginación
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM invoices i 
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE 1=1
        `;

        const countParams = [];
        let countParamCount = 0;

        if (status) {
            countParamCount++;
            countQuery += ` AND i.status = $${countParamCount}`;
            countParams.push(status);
        }

        if (customer_id) {
            countParamCount++;
            countQuery += ` AND i.customer_id = $${countParamCount}`;
            countParams.push(customer_id);
        }

        if (date_from) {
            countParamCount++;
            countQuery += ` AND i.invoice_date >= $${countParamCount}`;
            countParams.push(date_from);
        }

        if (date_to) {
            countParamCount++;
            countQuery += ` AND i.invoice_date <= $${countParamCount}`;
            countParams.push(date_to);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            invoices: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener facturas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Obtener una factura específica con detalles
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener información de la factura
        const invoiceResult = await pool.query(`
            SELECT 
                i.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                u.address as customer_address,
                c.company_name,
                c.tax_id,
                emp.name as employee_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN users emp ON i.employee_id = emp.id
            WHERE i.id = $1
        `, [id]);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        // Obtener detalles de la factura
        const detailsResult = await pool.query(`
            SELECT 
                id.*,
                b.title as book_title,
                b.isbn,
                a.name as author
            FROM invoice_details id
            LEFT JOIN books b ON id.book_id = b.id
            LEFT JOIN book_authors ba ON b.id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.id
            WHERE id.invoice_id = $1
            ORDER BY id.id
        `, [id]);

        // Obtener pagos asociados
        const paymentsResult = await pool.query(`
            SELECT * FROM payments 
            WHERE invoice_id = $1 
            ORDER BY payment_date DESC
        `, [id]);

        const invoice = {
            ...invoiceResult.rows[0],
            details: detailsResult.rows,
            payments: paymentsResult.rows
        };

        res.json(invoice);
    } catch (error) {
        console.error('Error al obtener factura:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Crear nueva factura
router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para crear facturas' });
        }

        await client.query('BEGIN');

        const {
            customer_id,
            due_date,
            tax_percentage = 18,
            discount_amount = 0,
            notes,
            details // Array de { book_id, quantity, unit_price, discount_percentage }
        } = req.body;

        if (!customer_id || !details || details.length === 0) {
            return res.status(400).json({ message: 'Cliente y detalles son obligatorios' });
        }

        // Generar número de factura
        const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
        const countResult = await client.query(
            'SELECT COUNT(*) + 1 as next_number FROM invoices WHERE invoice_number LIKE $1',
            [`${yearMonth}%`]
        );
        const invoiceNumber = `${yearMonth}${String(countResult.rows[0].next_number).padStart(4, '0')}`;

        // Calcular subtotal
        let subtotal = 0;
        const processedDetails = [];

        for (const detail of details) {
            const { book_id, quantity, unit_price, discount_percentage = 0 } = detail;
            
            // Verificar stock disponible
            const stockResult = await client.query('SELECT stock_quantity FROM books WHERE id = $1', [book_id]);
            
            if (stockResult.rows.length === 0) {
                throw new Error(`Libro con ID ${book_id} no encontrado`);
            }

            if (stockResult.rows[0].stock_quantity < quantity) {
                throw new Error(`Stock insuficiente para el libro ID ${book_id}`);
            }

            const lineTotal = quantity * unit_price * (1 - discount_percentage / 100);
            subtotal += lineTotal;

            processedDetails.push({
                ...detail,
                line_total: lineTotal
            });
        }

        const taxAmount = subtotal * (tax_percentage / 100);
        const totalAmount = subtotal + taxAmount - discount_amount;

        // Crear factura
        const invoiceResult = await client.query(`
            INSERT INTO invoices (invoice_number, customer_id, employee_id, due_date,
                                subtotal, tax_amount, discount_amount, total_amount, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [invoiceNumber, customer_id, req.user.id, due_date, subtotal, taxAmount, discount_amount, totalAmount, notes]);

        const invoice = invoiceResult.rows[0];

        // Crear detalles de factura y actualizar stock
        for (const detail of processedDetails) {
            const { book_id, quantity, unit_price, discount_percentage, line_total } = detail;

            // Insertar detalle
            await client.query(`
                INSERT INTO invoice_details (invoice_id, book_id, quantity, unit_price, discount_percentage, line_total)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [invoice.id, book_id, quantity, unit_price, discount_percentage || 0, line_total]);

            // Actualizar stock
            await client.query(`
                UPDATE books 
                SET stock_quantity = stock_quantity - $1 
                WHERE id = $2
            `, [quantity, book_id]);

            // Registrar movimiento de inventario
            await client.query(`
                INSERT INTO inventory_movements (book_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
                VALUES ($1, 'out', $2, 'sale', $3, 'Venta por factura', $4)
            `, [book_id, quantity, invoice.id, req.user.id]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Factura creada exitosamente',
            invoice: {
                ...invoice,
                details: processedDetails
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear factura:', error);
        res.status(500).json({ message: error.message || 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// Actualizar estado de factura
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar facturas' });
        }

        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        const result = await pool.query(`
            UPDATE invoices 
            SET status = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        res.json({ message: 'Estado actualizado exitosamente', invoice: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Registrar pago
router.post('/:id/payments', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para registrar pagos' });
        }

        const { id } = req.params;
        const { amount, payment_method, reference_number, notes } = req.body;

        if (!amount || !payment_method) {
            return res.status(400).json({ message: 'Monto y método de pago son obligatorios' });
        }

        // Verificar que la factura existe y obtener información
        const invoiceResult = await pool.query(`
            SELECT total_amount, 
                   COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = $1), 0) as paid_amount
            FROM invoices WHERE id = $1
        `, [id]);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        const { total_amount, paid_amount } = invoiceResult.rows[0];
        const remaining = total_amount - paid_amount;

        if (amount > remaining) {
            return res.status(400).json({ 
                message: `El monto excede lo pendiente. Pendiente: $${remaining}` 
            });
        }

        // Registrar pago
        const paymentResult = await pool.query(`
            INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [id, amount, payment_method, reference_number, notes]);

        // Verificar si la factura está completamente pagada
        const newPaidAmount = parseFloat(paid_amount) + parseFloat(amount);
        
        if (newPaidAmount >= parseFloat(total_amount)) {
            await pool.query(`
                UPDATE invoices 
                SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
                WHERE id = $1
            `, [id]);
        }

        res.status(201).json({
            message: 'Pago registrado exitosamente',
            payment: paymentResult.rows[0],
            remaining_amount: parseFloat(total_amount) - newPaidAmount
        });
    } catch (error) {
        console.error('Error al registrar pago:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Obtener reporte de ventas
router.get('/reports/sales', authenticateToken, async (req, res) => {
    try {
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para ver reportes' });
        }

        const { date_from, date_to, group_by = 'day' } = req.query;

        let dateFormat;
        switch (group_by) {
            case 'month':
                dateFormat = 'YYYY-MM';
                break;
            case 'year':
                dateFormat = 'YYYY';
                break;
            default:
                dateFormat = 'YYYY-MM-DD';
        }

        let query = `
            SELECT 
                TO_CHAR(invoice_date, '${dateFormat}') as period,
                COUNT(*) as invoice_count,
                SUM(total_amount) as total_sales,
                AVG(total_amount) as average_sale
            FROM invoices
            WHERE status != 'cancelled'
        `;

        const params = [];
        let paramCount = 0;

        if (date_from) {
            paramCount++;
            query += ` AND invoice_date >= $${paramCount}`;
            params.push(date_from);
        }

        if (date_to) {
            paramCount++;
            query += ` AND invoice_date <= $${paramCount}`;
            params.push(date_to);
        }

        query += ` GROUP BY TO_CHAR(invoice_date, '${dateFormat}') ORDER BY period`;

        const result = await pool.query(query, params);

        res.json({
            report: result.rows,
            summary: {
                total_invoices: result.rows.reduce((sum, row) => sum + parseInt(row.invoice_count), 0),
                total_sales: result.rows.reduce((sum, row) => sum + parseFloat(row.total_sales), 0),
                periods: result.rows.length
            }
        });
    } catch (error) {
        console.error('Error al generar reporte:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;