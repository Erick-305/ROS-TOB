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

        // Validaciones básicas
        if (!doctorId || !appointmentDate) {
            return res.status(400).json({
                message: 'Doctor ID y fecha de cita son requeridos'
            });
        }

        // Verificar que el usuario es un paciente
        if (req.user.roleId !== 3) {
            return res.status(403).json({
                message: 'Solo los pacientes pueden agendar citas'
            });
        }

        // Crear la cita
        const insertQuery = `
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, reason_for_visit, status)
            VALUES ($1, $2, $3, $4, 'scheduled')
            RETURNING id, patient_id, doctor_id, appointment_date, reason_for_visit, status, created_at
        `;
        
        const result = await pool.query(insertQuery, [patientId, doctorId, appointmentDate, reason || null]);
        const newAppointment = result.rows[0];

        res.status(201).json({
            message: 'Cita agendada exitosamente',
            appointment: newAppointment
        });

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/appointments/my-appointments - Obtener citas del paciente autenticado
router.get('/my-appointments', authenticateToken, async (req, res) => {
    try {
        const patientId = req.user.userId;
        
        // Verificar que el usuario es un paciente
        if (req.user.roleId !== 3) {
            return res.status(403).json({
                message: 'Solo los pacientes pueden ver sus citas'
            });
        }

        const query = `
            SELECT 
                a.id, a.appointment_date, a.reason_for_visit, a.status, a.created_at,
                u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                s.name as specialty_name
            FROM appointments a
            JOIN users u ON a.doctor_id = u.id
            JOIN doctors d ON u.id = d.id
            JOIN specialties s ON d.specialty_id = s.id
            WHERE a.patient_id = $1
            ORDER BY a.appointment_date DESC
        `;
        
        const result = await pool.query(query, [patientId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching patient appointments:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;