const express = require('express');
const pool = require('../config/pool');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

// GET /api/appointments/specialties - Obtener todas las especialidades
router.get('/specialties', async (req, res) => {
    try {
        const query = 'SELECT id, name, description FROM specialties ORDER BY name';
        const result = await pool.query(query);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching specialties:', error);
        res.status(500).json({ message: 'Error al obtener especialidades' });
    }
});

// GET /api/appointments/doctors - Obtener todos los doctores
router.get('/doctors', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, d.specialty_id
            FROM users u
            JOIN doctors d ON u.id = d.id
            WHERE u.role_id = 2 
            ORDER BY u.first_name, u.last_name
        `;
        const result = await pool.query(query);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Error al obtener doctores' });
    }
});

// GET /api/appointments/doctors/:specialtyId - Obtener doctores por especialidad
router.get('/doctors/:specialtyId', async (req, res) => {
    try {
        const { specialtyId } = req.params;
        
        const query = `
            SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
            FROM users u
            JOIN doctors d ON u.id = d.id
            WHERE u.role_id = 2 
            AND d.specialty_id = $1
            ORDER BY u.first_name, u.last_name
        `;
        const result = await pool.query(query, [specialtyId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Error al obtener doctores' });
    }
});

// POST /api/appointments/create - Crear una nueva cita
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { doctorId, appointmentDate, reason } = req.body;
        const patientId = req.user.userId;

        console.log('🏥 === CREAR CITA - DATOS RECIBIDOS ===');
        console.log('📋 Request body:', { doctorId, appointmentDate, reason });
        console.log('👤 Usuario autenticado:', { userId: req.user.userId, roleId: req.user.roleId });
        console.log('🆔 PatientId a usar:', patientId);

        // Validaciones básicas
        if (!doctorId || !appointmentDate) {
            console.log('❌ Validación fallida - Datos faltantes:', { doctorId, appointmentDate });
            return res.status(400).json({
                message: 'Doctor ID y fecha de cita son requeridos'
            });
        }

        // Verificar que el usuario es un paciente
        if (req.user.roleId !== 3) {
            console.log('❌ Usuario no es paciente - roleId:', req.user.roleId);
            return res.status(403).json({
                message: 'Solo los pacientes pueden agendar citas'
            });
        }

        console.log('✅ Validaciones pasadas, creando cita...');

        // Crear la cita
        const insertQuery = `
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, reason_for_visit, status)
            VALUES ($1, $2, $3, $4, 'scheduled')
            RETURNING id, patient_id, doctor_id, appointment_date, reason_for_visit as reason, status, created_at
        `;
        
        console.log('📝 SQL Query:', insertQuery);
        console.log('📊 SQL Params:', [patientId, doctorId, appointmentDate, reason || null]);
        
        const result = await pool.query(insertQuery, [patientId, doctorId, appointmentDate, reason || null]);
        const newAppointment = result.rows[0];

        console.log('✅ Cita creada exitosamente:', newAppointment);

        res.status(201).json({
            message: 'Cita agendada exitosamente',
            appointment: newAppointment
        });

    } catch (error) {
        console.log('❌ === ERROR AL CREAR CITA ===');
        console.error('📋 Error completo:', error);
        console.error('🔍 Error message:', error.message);
        console.error('📊 Error code:', error.code);
        console.error('📝 Error detail:', error.detail);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// GET /api/appointments/my-appointments - Obtener citas del paciente autenticado
router.get('/my-appointments', authenticateToken, async (req, res) => {
    try {
        const patientId = req.user.userId;
        
        console.log('📋 === CARGAR CITAS PACIENTE ===');
        console.log('👤 Usuario autenticado:', { userId: req.user.userId, roleId: req.user.roleId });
        console.log('🆔 PatientId a buscar:', patientId);
        
        // Verificar que el usuario es un paciente
        if (req.user.roleId !== 3) {
            console.log('❌ Usuario no es paciente - roleId:', req.user.roleId);
            return res.status(403).json({
                message: 'Solo los pacientes pueden ver sus citas'
            });
        }

        console.log('✅ Usuario es paciente, ejecutando consulta...');

        const query = `
            SELECT 
                a.id, a.appointment_date, a.reason_for_visit as reason, a.status, a.created_at,
                u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                CONCAT('Dr. ', u.first_name, ' ', u.last_name) as doctor_name,
                s.name as specialty_name
            FROM appointments a
            JOIN users u ON a.doctor_id = u.id
            LEFT JOIN doctors d ON u.id = d.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE a.patient_id = $1
            ORDER BY a.appointment_date DESC
        `;
        
        console.log('📝 SQL Query:', query);
        console.log('📊 SQL Params:', [patientId]);
        
        const result = await pool.query(query, [patientId]);
        
        console.log('✅ Citas encontradas:', result.rows.length);
        console.log('📋 Citas:', result.rows);
        
        res.json(result.rows);
    } catch (error) {
        console.log('❌ === ERROR AL CARGAR CITAS ===');
        console.error('📋 Error completo:', error);
        console.error('🔍 Error message:', error.message);
        console.error('📊 Error code:', error.code);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// PUT /api/appointments/:id/reschedule - Reprogramar una cita
router.put('/:id/reschedule', authenticateToken, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { appointmentDate } = req.body;
        const patientId = req.user.userId;

        console.log('🔄 === REPROGRAMAR CITA ===');
        console.log('📋 AppointmentId:', appointmentId);
        console.log('👤 PatientId:', patientId);
        console.log('📅 Nueva fecha:', appointmentDate);

        // Validaciones básicas
        if (!appointmentDate) {
            console.log('❌ Fecha de cita requerida');
            return res.status(400).json({
                message: 'Nueva fecha de cita es requerida'
            });
        }

        // Verificar que el usuario es un paciente
        if (req.user.roleId !== 3) {
            console.log('❌ Usuario no es paciente');
            return res.status(403).json({
                message: 'Solo los pacientes pueden reprogramar citas'
            });
        }

        // Verificar que la cita existe y pertenece al paciente
        const checkQuery = `
            SELECT id FROM appointments 
            WHERE id = $1 AND patient_id = $2
        `;
        const checkResult = await pool.query(checkQuery, [appointmentId, patientId]);

        if (checkResult.rows.length === 0) {
            console.log('❌ Cita no encontrada o no pertenece al paciente');
            return res.status(404).json({
                message: 'Cita no encontrada o no tienes permisos para modificarla'
            });
        }

        // Actualizar la cita
        const updateQuery = `
            UPDATE appointments 
            SET appointment_date = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND patient_id = $3
            RETURNING id, appointment_date, status, updated_at
        `;
        
        console.log('📝 SQL Query:', updateQuery);
        console.log('📊 SQL Params:', [appointmentDate, appointmentId, patientId]);

        const result = await pool.query(updateQuery, [appointmentDate, appointmentId, patientId]);
        const updatedAppointment = result.rows[0];

        console.log('✅ Cita reprogramada:', updatedAppointment);

        res.json({
            message: 'Cita reprogramada exitosamente',
            appointment: updatedAppointment
        });

    } catch (error) {
        console.log('❌ === ERROR AL REPROGRAMAR CITA ===');
        console.error('📋 Error completo:', error);
        console.error('🔍 Error message:', error.message);
        console.error('📊 Error code:', error.code);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// PUT /api/appointments/:id/cancel - Cancelar una cita
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const patientId = req.user.userId;

        console.log('❌ === CANCELAR CITA ===');
        console.log('📋 AppointmentId:', appointmentId);
        console.log('👤 PatientId:', patientId);

        // Verificar que el usuario es un paciente
        if (req.user.roleId !== 3) {
            console.log('❌ Usuario no es paciente');
            return res.status(403).json({
                message: 'Solo los pacientes pueden cancelar citas'
            });
        }

        // Verificar que la cita existe y pertenece al paciente
        const checkQuery = `
            SELECT id, status FROM appointments 
            WHERE id = $1 AND patient_id = $2
        `;
        const checkResult = await pool.query(checkQuery, [appointmentId, patientId]);

        if (checkResult.rows.length === 0) {
            console.log('❌ Cita no encontrada o no pertenece al paciente');
            return res.status(404).json({
                message: 'Cita no encontrada o no tienes permisos para modificarla'
            });
        }

        const appointment = checkResult.rows[0];
        
        // Verificar que la cita no esté ya cancelada
        if (appointment.status === 'cancelled') {
            console.log('❌ Cita ya está cancelada');
            return res.status(400).json({
                message: 'La cita ya está cancelada'
            });
        }

        // Cancelar la cita
        const updateQuery = `
            UPDATE appointments 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND patient_id = $2
            RETURNING id, status, updated_at
        `;
        
        console.log('📝 SQL Query:', updateQuery);
        console.log('📊 SQL Params:', [appointmentId, patientId]);

        const result = await pool.query(updateQuery, [appointmentId, patientId]);
        const cancelledAppointment = result.rows[0];

        console.log('✅ Cita cancelada:', cancelledAppointment);

        res.json({
            message: 'Cita cancelada exitosamente',
            appointment: cancelledAppointment
        });

    } catch (error) {
        console.log('❌ === ERROR AL CANCELAR CITA ===');
        console.error('📋 Error completo:', error);
        console.error('🔍 Error message:', error.message);
        console.error('📊 Error code:', error.code);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// GET /api/appointments/doctor-appointments - Obtener citas del doctor autenticado
router.get('/doctor-appointments', authenticateToken, async (req, res) => {
    try {
        const doctorId = req.user.userId;
        
        console.log('👨‍⚕️ === CARGAR CITAS DOCTOR ===');
        console.log('👤 Usuario autenticado:', { userId: req.user.userId, roleId: req.user.roleId });
        console.log('🆔 DoctorId a buscar:', doctorId);
        
        // Verificar que el usuario es un doctor
        if (req.user.roleId !== 2) {
            console.log('❌ Usuario no es doctor - roleId:', req.user.roleId);
            return res.status(403).json({
                message: 'Solo los doctores pueden ver sus citas'
            });
        }

        const query = `
            SELECT 
                a.id, 
                a.appointment_date, 
                a.duration_minutes,
                a.reason_for_visit as reason, 
                a.status, 
                a.created_at,
                pu.first_name as patient_name,
                pu.last_name as patient_last_name,
                pu.email as patient_email,
                pu.phone as patient_phone,
                CONCAT(pu.first_name, ' ', pu.last_name) as patient_full_name,
                s.name as specialty_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users pu ON p.id = pu.id
            JOIN doctors d ON a.doctor_id = d.id
            LEFT JOIN specialties s ON d.specialty_id = s.id
            WHERE a.doctor_id = $1
            ORDER BY a.appointment_date DESC
        `;
        
        console.log('📝 SQL Query:', query);
        console.log('📊 SQL Params:', [doctorId]);
        
        const result = await pool.query(query, [doctorId]);
        
        console.log('✅ Citas encontradas:', result.rows.length);
        console.log('📋 Citas:', result.rows);
        
        res.json(result.rows);
    } catch (error) {
        console.log('❌ === ERROR AL CARGAR CITAS DOCTOR ===');
        console.error('📋 Error completo:', error);
        console.error('🔍 Error message:', error.message);
        console.error('📊 Error code:', error.code);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// GET /api/appointments/doctor-stats - Obtener estadísticas del doctor autenticado
router.get('/doctor-stats', authenticateToken, async (req, res) => {
    try {
        const doctorId = req.user.userId;
        
        console.log('📊 === CARGAR ESTADÍSTICAS DOCTOR ===');
        console.log('🆔 DoctorId:', doctorId);
        
        // Verificar que el usuario es un doctor
        if (req.user.roleId !== 2) {
            console.log('❌ Usuario no es doctor - roleId:', req.user.roleId);
            return res.status(403).json({
                message: 'Solo los doctores pueden ver sus estadísticas'
            });
        }

        const statsQuery = `
            SELECT 
                COUNT(CASE WHEN DATE(appointment_date) = CURRENT_DATE AND status != 'cancelled' THEN 1 END) as todayAppointments,
                COUNT(DISTINCT patient_id) as totalPatients,
                COUNT(CASE WHEN appointment_date >= DATE_TRUNC('week', CURRENT_DATE) AND status != 'cancelled' THEN 1 END) as weekAppointments,
                COUNT(CASE WHEN DATE_TRUNC('month', appointment_date) = DATE_TRUNC('month', CURRENT_DATE) AND status = 'completed' THEN 1 END) as monthCompletedAppointments
            FROM appointments 
            WHERE doctor_id = $1
        `;
        
        console.log('📝 Stats Query:', statsQuery);
        console.log('📊 Stats Params:', [doctorId]);
        
        const result = await pool.query(statsQuery, [doctorId]);
        const stats = result.rows[0];
        
        console.log('✅ Estadísticas calculadas:', stats);
        
        res.json({
            todayAppointments: parseInt(stats.todayappointments) || 0,
            totalPatients: parseInt(stats.totalpatients) || 0,
            weekAppointments: parseInt(stats.weekappointments) || 0,
            monthCompletedAppointments: parseInt(stats.monthcompletedappointments) || 0
        });
        
    } catch (error) {
        console.log('❌ === ERROR AL CARGAR ESTADÍSTICAS ===');
        console.error('📋 Error completo:', error);
        console.error('🔍 Error message:', error.message);
        console.error('📊 Error code:', error.code);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

module.exports = router;