const express = require('express');
const postgres = require('postgres');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Configurar conexión directa con postgres
const sql = postgres({
    host: process.env.DB_HOST || 'hospital_postgres',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'hospital_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123'
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            message: 'Token de acceso requerido' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ 
                message: 'Token inválido' 
            });
        }
        req.user = user;
        next();
    });
};

// GET /api/medical-records/patient/:patientId - Obtener historiales de un paciente
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { patientId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                message: 'ID de usuario no encontrado en el token'
            });
        }

        // Verificar que el usuario es un doctor
        const doctorCheck = await sql`
            SELECT id FROM users 
            WHERE id = ${userId} AND role_id = 2
        `;

        if (doctorCheck.length === 0) {
            return res.status(403).json({
                message: 'Acceso denegado. Solo doctores pueden acceder a esta información.'
            });
        }

        // Primero obtener el doctor_id del usuario
        const doctorInfo = await sql`
            SELECT id as doctor_id FROM doctors 
            WHERE id = ${userId}
        `;

        if (doctorInfo.length === 0) {
            return res.status(404).json({
                message: 'Información de doctor no encontrada'
            });
        }

        const doctorId = doctorInfo[0].doctor_id;

        // Obtener historiales médicos del paciente creados por este doctor
        const medicalRecords = await sql`
            SELECT 
                mr.id,
                mr.patient_id,
                mr.doctor_id,
                mr.appointment_id,
                mr.date,
                mr.diagnosis,
                mr.treatment,
                mr.prescription,
                mr.notes,
                mr.follow_up_date,
                mr.created_at
            FROM medical_records mr
            WHERE mr.patient_id = ${patientId}
            AND mr.doctor_id = ${doctorId}
            ORDER BY mr.date DESC, mr.created_at DESC
        `;

        res.json(medicalRecords);
    } catch (error) {
        console.error('Error fetching medical records:', error);
        res.status(500).json({ 
            message: 'Error al obtener historiales médicos',
            error: error.message 
        });
    }
});

// POST /api/medical-records - Crear nuevo historial médico
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { patient_id, diagnosis, treatment, prescription, notes, follow_up_date } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                message: 'ID de usuario no encontrado en el token'
            });
        }

        // Verificar que el usuario es un doctor
        const doctorCheck = await sql`
            SELECT id FROM users 
            WHERE id = ${userId} AND role_id = 2
        `;

        if (doctorCheck.length === 0) {
            return res.status(403).json({
                message: 'Acceso denegado. Solo doctores pueden crear historiales médicos.'
            });
        }

        // Validar campos obligatorios
        if (!patient_id || !diagnosis || !treatment) {
            return res.status(400).json({
                message: 'Los campos paciente, diagnóstico y tratamiento son obligatorios'
            });
        }

        // Verificar que el paciente existe
        const patientCheck = await sql`
            SELECT id FROM patients WHERE id = ${patient_id}
        `;

        if (patientCheck.length === 0) {
            return res.status(404).json({
                message: 'Paciente no encontrado'
            });
        }

        // Primero obtener el doctor_id del usuario
        const doctorInfo = await sql`
            SELECT id as doctor_id FROM doctors 
            WHERE id = ${userId}
        `;

        if (doctorInfo.length === 0) {
            return res.status(404).json({
                message: 'Información de doctor no encontrada'
            });
        }

        const doctorId = doctorInfo[0].doctor_id;

        // Crear el historial médico
        const newRecord = await sql`
            INSERT INTO medical_records (
                patient_id, 
                doctor_id, 
                date,
                diagnosis, 
                treatment, 
                prescription, 
                notes, 
                follow_up_date
            )
            VALUES (
                ${patient_id}, 
                ${doctorId}, 
                CURRENT_TIMESTAMP,
                ${diagnosis}, 
                ${treatment}, 
                ${prescription}, 
                ${notes}, 
                ${follow_up_date}
            )
            RETURNING *
        `;

        res.status(201).json({
            message: 'Historial médico creado exitosamente',
            medical_record: newRecord[0]
        });

    } catch (error) {
        console.error('Error creating medical record:', error);
        res.status(500).json({ 
            message: 'Error al crear historial médico',
            error: error.message 
        });
    }
});

// GET /api/medical-records/doctor - Obtener todos los historiales del doctor
router.get('/doctor', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(400).json({
                message: 'ID de usuario no encontrado en el token'
            });
        }

        // Verificar que el usuario es un doctor
        const doctorCheck = await sql`
            SELECT id FROM users 
            WHERE id = ${userId} AND role_id = 2
        `;

        if (doctorCheck.length === 0) {
            return res.status(403).json({
                message: 'Acceso denegado. Solo doctores pueden acceder a esta información.'
            });
        }

        // Primero obtener el doctor_id del usuario
        const doctorInfo = await sql`
            SELECT id as doctor_id FROM doctors 
            WHERE id = ${userId}
        `;

        if (doctorInfo.length === 0) {
            return res.status(404).json({
                message: 'Información de doctor no encontrada'
            });
        }

        const doctorId = doctorInfo[0].doctor_id;

        // Obtener todos los historiales médicos del doctor
        const medicalRecords = await sql`
            SELECT 
                mr.id,
                mr.patient_id,
                mr.doctor_id,
                mr.appointment_id,
                mr.date,
                mr.diagnosis,
                mr.treatment,
                mr.prescription,
                mr.notes,
                mr.follow_up_date,
                mr.created_at,
                u.first_name || ' ' || u.last_name as patient_name,
                u.email as patient_email
            FROM medical_records mr
            JOIN users u ON mr.patient_id = u.id
            WHERE mr.doctor_id = ${doctorId}
            ORDER BY mr.date DESC, mr.created_at DESC
        `;

        res.json(medicalRecords);
    } catch (error) {
        console.error('Error fetching doctor medical records:', error);
        res.status(500).json({ 
            message: 'Error al obtener historiales médicos del doctor',
            error: error.message 
        });
    }
});

module.exports = router;