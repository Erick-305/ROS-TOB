const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/pool');

const router = express.Router();

// Middleware para autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.user = user;
        next();
    });
};

// Middleware para verificar rol de administrador
const requireAdmin = (req, res, next) => {
    console.log('Verificando rol de administrador. Usuario:', req.user);
    if (req.user.roleId !== 1) { // 1 es el ID del rol de administrador
        return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
};

// Test endpoint para verificar autenticación
router.get('/test', authenticateToken, requireAdmin, async (req, res) => {
    res.json({ 
        message: 'Admin auth working!', 
        user: req.user 
    });
});

// GET /api/admin/stats - Obtener estadísticas del sistema
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('Obteniendo estadísticas de administrador...');

        // Usar una sola consulta para todas las estadísticas
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM users u JOIN patients p ON u.id = p.id WHERE u.is_active = true) as total_patients,
                (SELECT COUNT(*) FROM users u JOIN doctors d ON u.id = d.id WHERE u.is_active = true) as total_doctors,
                (SELECT COUNT(*) FROM appointments WHERE DATE(appointment_date) = CURRENT_DATE) as today_appointments,
                (SELECT COUNT(*) FROM appointments WHERE status = 'completed') as completed_appointments,
                (SELECT COUNT(*) FROM appointments WHERE status = 'scheduled') as scheduled_appointments,
                (SELECT COUNT(*) FROM appointments WHERE status = 'cancelled') as cancelled_appointments
        `;
        
        const result = await pool.query(statsQuery);
        const stats = result.rows[0];

        // Convertir a números enteros y ajustar nombres
        const finalStats = {
            totalPatients: parseInt(stats.total_patients) || 0,
            totalDoctors: parseInt(stats.total_doctors) || 0,
            todayAppointments: parseInt(stats.today_appointments) || 0,
            completedAppointments: parseInt(stats.completed_appointments) || 0,
            scheduledAppointments: parseInt(stats.scheduled_appointments) || 0,
            cancelledAppointments: parseInt(stats.cancelled_appointments) || 0,
            monthlyRevenue: (parseInt(stats.total_patients) || 0) * 50 // $50 por paciente
        };

        console.log('Estadísticas obtenidas:', finalStats);
        res.json(finalStats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ 
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
});

// GET /api/admin/users - Obtener todos los usuarios
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('Obteniendo lista de usuarios...');

        const query = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.is_active,
                u.created_at,
                u.role_id,
                r.name as role_name,
                s.name as specialty_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN doctors d ON u.id = d.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            ORDER BY u.created_at DESC
        `;

        const result = await pool.query(query);
        const users = result.rows;

        console.log(`Encontrados ${users.length} usuarios`);
        res.json(users);

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al obtener usuarios',
            error: error.message 
        });
    }
});

// POST /api/admin/users - Crear nuevo usuario
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { email, firstName, lastName, phone, password, roleId, specialtyId } = req.body;

        console.log('Creando nuevo usuario:', { email, firstName, lastName, roleId });

        // Validar campos requeridos
        if (!email || !firstName || !password || !roleId) {
            return res.status(400).json({ message: 'Email, nombre, contraseña y rol son requeridos' });
        }

        // Verificar si el email ya existe
        const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
        const existingUser = await pool.query(existingUserQuery, [email]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Ya existe un usuario con este email' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 12);

        // Crear usuario
        const userQuery = `
            INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active, email_verified)
            VALUES ($1, $2, $3, $4, $5, $6, true, true)
            RETURNING id
        `;
        const userValues = [email, hashedPassword, firstName, lastName || '', phone || '', roleId];
        const userResult = await pool.query(userQuery, userValues);
        const userId = userResult.rows[0].id;

        // Si es doctor, crear entrada en tabla doctors
        if (roleId == 2) {
            const doctorQuery = 'INSERT INTO doctors (id, license_number, specialty_id) VALUES ($1, $2, $3)';
            const licenseNumber = `DOC${Date.now()}`;
            await pool.query(doctorQuery, [userId, licenseNumber, specialtyId || null]);
        }

        // Si es paciente, crear entrada en tabla patients
        if (roleId == 3) {
            const patientQuery = 'INSERT INTO patients (id) VALUES ($1)';
            await pool.query(patientQuery, [userId]);
        }

        console.log('Usuario creado exitosamente:', userId);
        res.status(201).json({ 
            message: 'Usuario creado exitosamente',
            userId: userId
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al crear usuario',
            error: error.message 
        });
    }
});

// PUT /api/admin/users/:id - Actualizar usuario
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, firstName, lastName, phone, roleId } = req.body;

        console.log('🔄 PUT /users/:id recibida');
        console.log('ID:', id);
        console.log('Body completo:', req.body);
        console.log('Campos extraídos:', { email, firstName, lastName, phone, roleId });

        // Verificar si el email ya existe (excluyendo el usuario actual)
        const existingUserQuery = 'SELECT id FROM users WHERE email = $1 AND id != $2';
        const existingUser = await pool.query(existingUserQuery, [email, id]);

        if (existingUser.rows.length > 0) {
            console.log('❌ Email ya existe para otro usuario');
            return res.status(409).json({ message: 'Ya existe otro usuario con este email' });
        }

        // Actualizar usuario
        const updateQuery = `
            UPDATE users 
            SET email = $1, first_name = $2, last_name = $3, phone = $4, role_id = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `;
        const updateValues = [email, firstName, lastName || '', phone || '', roleId, id];
        
        console.log('Query de actualización:', updateQuery);
        console.log('Valores:', updateValues);
        
        const result = await pool.query(updateQuery, updateValues);
        
        console.log('Filas afectadas:', result.rowCount);
        console.log('✅ Usuario actualizado exitosamente:', id);
        
        res.json({ message: 'Usuario actualizado exitosamente' });

    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al actualizar usuario',
            error: error.message 
        });
    }
});

// PATCH /api/admin/users/:id/status - Activar/desactivar usuario
router.patch('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        console.log('🔄 PATCH /users/:id/status recibida');
        console.log('ID:', id);
        console.log('is_active:', is_active);
        console.log('Body completo:', req.body);

        // Actualizar estado en la base de datos
        const updateQuery = 'UPDATE users SET is_active = $1 WHERE id = $2';
        const result = await pool.query(updateQuery, [is_active, id]);

        console.log('Filas afectadas:', result.rowCount);

        if (result.rowCount === 0) {
            console.log('❌ Usuario no encontrado');
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        console.log('✅ Estado actualizado exitosamente');
        res.json({ 
            message: 'Estado actualizado exitosamente',
            success: true
        });

    } catch (error) {
        console.error('❌ Error actualizando estado:', error);
        res.status(500).json({ 
            message: 'Error al actualizar estado',
            error: error.message 
        });
    }
});

// GET /api/admin/appointments - Obtener todas las citas
router.get('/appointments', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('Obteniendo todas las citas...');

        const query = `
            SELECT 
                a.id,
                a.appointment_date,
                a.duration_minutes,
                a.status,
                a.reason,
                a.notes,
                a.created_at,
                pu.first_name as patient_first_name,
                pu.last_name as patient_last_name,
                pu.email as patient_email,
                du.first_name as doctor_first_name,
                du.last_name as doctor_last_name,
                du.email as doctor_email,
                s.name as specialty_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users pu ON p.id = pu.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.id = du.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            ORDER BY a.appointment_date DESC
        `;

        const result = await pool.query(query);
        const appointments = result.rows;

        console.log(`Encontradas ${appointments.length} citas`);
        res.json(appointments);

    } catch (error) {
        console.error('Error obteniendo citas:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al obtener citas',
            error: error.message 
        });
    }
});

module.exports = router;