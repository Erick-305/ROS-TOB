const express = require('express');
const { sequelize } = require('../config/database');
const jwt = require('jsonwebtoken');

const router = express.Router();

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
        const doctorCheck = await sequelize.query(`
            SELECT id FROM doctors WHERE id = :userId
        `, {
            replacements: { userId },
            type: sequelize.QueryTypes.SELECT
        });

        if (!doctorCheck.length) {
            return res.status(403).json({
                message: 'Acceso denegado. Solo los doctores pueden ver historiales médicos'
            });
        }

        const doctorId = doctorCheck[0].id;

        // Obtener los historiales médicos del paciente
        const medicalRecords = await sequelize.query(`
            SELECT 
                mr.*,
                u.first_name as patient_first_name,
                u.last_name as patient_last_name,
                u.email as patient_email,
                dr.first_name as doctor_first_name,
                dr.last_name as doctor_last_name
            FROM medical_records mr
            JOIN patients p ON mr.patient_id = p.id
            JOIN users u ON p.id = u.id
            JOIN doctors d ON mr.doctor_id = d.id
            JOIN users dr ON d.id = dr.id
            WHERE mr.patient_id = :patientId
            ORDER BY mr.date DESC
        `, {
            replacements: { patientId },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: medicalRecords,
            count: medicalRecords.length
        });

    } catch (error) {
        console.error('Error fetching patient medical records:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
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
        const doctorCheck = await sequelize.query(`
            SELECT id FROM doctors WHERE id = :userId
        `, {
            replacements: { userId },
            type: sequelize.QueryTypes.SELECT
        });

        if (!doctorCheck.length) {
            return res.status(403).json({
                message: 'Acceso denegado. Solo los doctores pueden crear historiales médicos'
            });
        }

        const doctorId = doctorCheck[0].id;

        // Validar campos requeridos
        if (!patient_id || !diagnosis || !treatment) {
            return res.status(400).json({
                message: 'Los campos patient_id, diagnosis y treatment son requeridos'
            });
        }

        // Verificar que el paciente existe
        const patientCheck = await sequelize.query(`
            SELECT id FROM patients WHERE id = :patient_id
        `, {
            replacements: { patient_id },
            type: sequelize.QueryTypes.SELECT
        });

        if (!patientCheck.length) {
            return res.status(404).json({
                message: 'Paciente no encontrado'
            });
        }

        // Crear el historial médico
        const result = await sequelize.query(`
            INSERT INTO medical_records (patient_id, doctor_id, diagnosis, treatment, prescription, notes, follow_up_date, date)
            VALUES (:patient_id, :doctorId, :diagnosis, :treatment, :prescription, :notes, :follow_up_date, NOW())
            RETURNING *
        `, {
            replacements: { 
                patient_id, 
                doctorId, 
                diagnosis, 
                treatment, 
                prescription: prescription || null, 
                notes: notes || null, 
                follow_up_date: follow_up_date || null 
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.status(201).json({
            success: true,
            message: 'Historial médico creado exitosamente',
            data: result[0][0]
        });

    } catch (error) {
        console.error('Error creating medical record:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// GET /api/medical-records/doctor - Obtener pacientes del doctor (basado en citas agendadas)
router.get('/doctor', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(400).json({
                message: 'ID de usuario no encontrado en el token'
            });
        }

        // Verificar que el usuario es un doctor
        const doctorCheck = await sequelize.query(`
            SELECT id FROM doctors WHERE id = :userId
        `, {
            replacements: { userId },
            type: sequelize.QueryTypes.SELECT
        });

        if (!doctorCheck.length) {
            return res.status(403).json({
                message: 'Acceso denegado. Solo los doctores pueden acceder a esta información'
            });
        }

        const doctorId = doctorCheck[0].id;

        // Obtener pacientes que tienen citas con este doctor (y opcionalmente historiales médicos)
        const patients = await sequelize.query(`
            SELECT DISTINCT
                p.id as patient_id,
                u.first_name as patient_name,
                u.last_name as patient_last_name,
                u.email as patient_email,
                u.phone as patient_phone,
                COALESCE(COUNT(mr.id), 0) as total_records,
                MAX(a.appointment_date) as last_appointment,
                MAX(mr.date) as last_medical_record
            FROM patients p
            JOIN users u ON p.id = u.id
            JOIN appointments a ON p.id = a.patient_id
            LEFT JOIN medical_records mr ON p.id = mr.patient_id AND mr.doctor_id = :doctorId
            WHERE a.doctor_id = :doctorId
            GROUP BY p.id, u.first_name, u.last_name, u.email, u.phone
            ORDER BY MAX(a.appointment_date) DESC
        `, {
            replacements: { doctorId },
            type: sequelize.QueryTypes.SELECT
        });

        // Formatear los datos para el frontend
        const formattedPatients = patients.map(patient => ({
            patient_id: patient.patient_id,
            patient_name: `${patient.patient_name} ${patient.patient_last_name}`,
            patient_email: patient.patient_email,
            patient_phone: patient.patient_phone,
            total_records: parseInt(patient.total_records),
            last_appointment: patient.last_appointment,
            last_medical_record: patient.last_medical_record
        }));

        res.json({
            success: true,
            data: formattedPatients,
            count: formattedPatients.length
        });

    } catch (error) {
        console.error('Error fetching doctor patients:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

module.exports = router;