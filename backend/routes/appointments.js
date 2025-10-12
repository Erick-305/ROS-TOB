const express = require('express');
const postgres = require('postgres');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Configurar conexión directa con postgres
const sql = postgres({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// GET /api/appointments/specialties - Obtener todas las especialidades
router.get('/specialties', async (req, res) => {
    try {
        const specialties = await sql`
            SELECT id, name, description, icon, color, duration_minutes
            FROM specialties 
            ORDER BY name
        `;
        
        res.json(specialties);
    } catch (error) {
        console.error('Error fetching specialties:', error);
        res.status(500).json({ message: 'Error al obtener especialidades' });
    }
});

// GET /api/appointments/doctors - Obtener todos los doctores
router.get('/doctors', async (req, res) => {
    try {
        const doctors = await sql`
            SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, d.specialty_id
            FROM users u
            JOIN doctors d ON u.id = d.id
            WHERE u.role_id = 2 
            ORDER BY u.first_name, u.last_name
        `;
        
        res.json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Error al obtener doctores' });
    }
});

// GET /api/appointments/doctors/:specialtyId - Obtener doctores por especialidad
router.get('/doctors/:specialtyId', async (req, res) => {
    try {
        const { specialtyId } = req.params;
        
        const doctors = await sql`
            SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
            FROM users u
            JOIN doctors d ON u.id = d.id
            WHERE u.role_id = 2 
            AND d.specialty_id = ${specialtyId}
            ORDER BY u.first_name, u.last_name
        `;
        
        res.json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Error al obtener doctores' });
    }
});

// GET /api/appointments/availability/:doctorId/:date - Obtener horarios disponibles
router.get('/availability/:doctorId/:date', async (req, res) => {
    try {
        const { doctorId, date } = req.params;
        
        // Obtener el día de la semana (0 = Domingo, 1 = Lunes, etc.)
        const appointmentDate = new Date(date);
        let dayOfWeek = appointmentDate.getDay();
        
        // Convertir de formato JavaScript (0=Domingo) a formato DB (1=Lunes)
        // JavaScript: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
        // DB: 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Domingo (0) o Sábado (6) - no hay atención
            return res.json([]);
        }
        
        // Convertir a formato de DB: 1=Lunes, 2=Martes, etc.
        const dbDayOfWeek = dayOfWeek; // 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie
        
        // Obtener horarios del doctor para ese día
        const schedules = await sql`
            SELECT start_time, end_time
            FROM doctor_schedules
            WHERE doctor_id = ${doctorId}
            AND day_of_week = ${dbDayOfWeek}
        `;
        
        if (schedules.length === 0) {
            return res.json([]);
        }
        
        // Obtener citas ya agendadas para ese día
        const existingAppointments = await sql`
            SELECT appointment_date
            FROM appointments
            WHERE doctor_id = ${doctorId}
            AND DATE(appointment_date) = ${date}
            AND status IN ('scheduled', 'confirmed')
        `;
        
        const bookedTimes = existingAppointments.map(apt => {
            const appointmentDate = new Date(apt.appointment_date);
            return appointmentDate.toTimeString().slice(0, 5); // HH:MM
        });
        
        // Generar slots de tiempo disponibles
        const timeSlots = [];
        const schedule = schedules[0];
        
        const startTime = new Date(`2000-01-01T${schedule.start_time}`);
        const endTime = new Date(`2000-01-01T${schedule.end_time}`);
        
        // Generar slots cada 30 minutos
        const current = new Date(startTime);
        while (current < endTime) {
            const timeString = current.toTimeString().slice(0, 5);
            const isBooked = bookedTimes.some(bookedTime => 
                bookedTime === timeString
            );
            
            // No permitir citas en el pasado si es hoy
            const now = new Date();
            const isToday = appointmentDate.toDateString() === now.toDateString();
            const isPast = isToday && current <= now;
            
            timeSlots.push({
                time: timeString,
                available: !isBooked && !isPast
            });
            
            current.setMinutes(current.getMinutes() + 30);
        }
        
        res.json(timeSlots);
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ message: 'Error al obtener disponibilidad' });
    }
});

// POST /api/appointments/create - Crear nueva cita
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { 
            specialty_id, 
            doctor_id, 
            appointment_date, 
            appointment_time, 
            reason_for_visit 
        } = req.body;

        // Log de depuración
        console.log('Request body:', req.body);
        console.log('User from token:', req.user);

        // Validaciones básicas
        if (!specialty_id || !doctor_id || !appointment_date || !appointment_time || !reason_for_visit) {
            return res.status(400).json({
                message: 'Todos los campos son requeridos'
            });
        }

        // Obtener patient_id del usuario autenticado
        const userId = req.user?.userId; // Cambiar de id a userId
        
        if (!userId) {
            return res.status(400).json({
                message: 'ID de usuario no encontrado en el token'
            });
        }
        
        // Verificar que el usuario existe y tiene rol de paciente
        const patientResult = await sql`
            SELECT id FROM users 
            WHERE id = ${userId} AND role_id = 3
            LIMIT 1
        `;
        
        if (patientResult.length === 0) {
            return res.status(400).json({
                message: 'Usuario no encontrado o no es un paciente'
            });
        }
        
        const patient_id = patientResult[0].id;

        // Combinar fecha y hora en un solo timestamp
        const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}:00`);

        // Verificar que el horario aún esté disponible
        const existingAppointment = await sql`
            SELECT id FROM appointments
            WHERE doctor_id = ${doctor_id}
            AND appointment_date = ${appointmentDateTime}
            AND status IN ('scheduled', 'confirmed')
        `;

        if (existingAppointment.length > 0) {
            return res.status(400).json({
                message: 'Este horario ya no está disponible'
            });
        }

        // Obtener duración de la especialidad
        const specialty = await sql`
            SELECT duration_minutes FROM specialties WHERE id = ${specialty_id}
        `;
        
        const duration_minutes = specialty[0]?.duration_minutes || 30;

        // Crear la cita
        const newAppointment = await sql`
            INSERT INTO appointments (
                patient_id, doctor_id, 
                appointment_date, duration_minutes,
                reason, status
            )
            VALUES (
                ${patient_id}, ${doctor_id},
                ${appointmentDateTime}, ${duration_minutes},
                ${reason_for_visit}, 'scheduled'
            )
            RETURNING id, appointment_date, status, created_at
        `;

        // Obtener información completa de la cita creada
        const appointmentDetails = await sql`
            SELECT 
                a.id, a.appointment_date, a.duration_minutes,
                a.reason, a.status, a.created_at,
                u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                s.name as specialty_name, s.icon as specialty_icon
            FROM appointments a
            JOIN users u ON a.doctor_id = u.id
            JOIN doctors d ON u.id = d.id
            JOIN specialties s ON d.specialty_id = s.id
            WHERE a.id = ${newAppointment[0].id}
        `;

        res.status(201).json({
            message: 'Cita agendada exitosamente',
            appointment: appointmentDetails[0]
        });

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ 
            message: 'Error al crear la cita',
            error: error.message 
        });
    }
});

// GET /api/appointments/my-appointments/:patientId - Obtener citas del paciente
router.get('/my-appointments/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        
        const appointments = await sql`
            SELECT 
                a.id, a.appointment_date, a.appointment_time, a.duration_minutes,
                a.reason_for_visit, a.status, a.created_at,
                u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                s.name as specialty_name, s.icon as specialty_icon, s.color as specialty_color
            FROM appointments a
            JOIN users u ON a.doctor_id = u.id
            JOIN specialties s ON a.specialty_id = s.id
            WHERE a.patient_id = ${patientId}
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `;
        
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching patient appointments:', error);
        res.status(500).json({ message: 'Error al obtener citas' });
    }
});

// PUT /api/appointments/:appointmentId/cancel - Cancelar cita
router.put('/:appointmentId/cancel', authenticateToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user?.userId;
        
        // Verificar que la cita pertenece al usuario autenticado
        const existingAppointment = await sql`
            SELECT id FROM appointments
            WHERE id = ${appointmentId}
            AND patient_id = ${userId}
            AND status = 'scheduled'
        `;

        if (existingAppointment.length === 0) {
            return res.status(404).json({
                message: 'Cita no encontrada o no se puede cancelar'
            });
        }

        const updatedAppointment = await sql`
            UPDATE appointments 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${appointmentId}
            RETURNING id, status, updated_at
        `;

        res.json({
            message: 'Cita cancelada exitosamente',
            appointment: updatedAppointment[0]
        });
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ message: 'Error al cancelar la cita' });
    }
});

// PUT /api/appointments/:appointmentId/reschedule - Reprogramar cita
router.put('/:appointmentId/reschedule', authenticateToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { appointment_date, appointment_time } = req.body;
        const userId = req.user?.userId;

        if (!appointment_date || !appointment_time) {
            return res.status(400).json({
                message: 'Fecha y hora son requeridas para reprogramar'
            });
        }

        // Combinar fecha y hora en un solo timestamp
        const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}:00`);

        // Verificar que la cita pertenece al usuario autenticado
        const existingAppointment = await sql`
            SELECT id, doctor_id FROM appointments
            WHERE id = ${appointmentId}
            AND patient_id = ${userId}
            AND status = 'scheduled'
        `;

        if (existingAppointment.length === 0) {
            return res.status(404).json({
                message: 'Cita no encontrada o no se puede reprogramar'
            });
        }

        const doctorId = existingAppointment[0].doctor_id;

        // Verificar que el nuevo horario esté disponible
        const conflictingAppointment = await sql`
            SELECT id FROM appointments
            WHERE doctor_id = ${doctorId}
            AND appointment_date = ${appointmentDateTime}
            AND status IN ('scheduled', 'confirmed')
            AND id != ${appointmentId}
        `;

        if (conflictingAppointment.length > 0) {
            return res.status(400).json({
                message: 'El horario seleccionado ya no está disponible'
            });
        }

        // Actualizar la cita
        const updatedAppointment = await sql`
            UPDATE appointments 
            SET appointment_date = ${appointmentDateTime}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${appointmentId}
            RETURNING id, appointment_date, status, updated_at
        `;

        // Formatear respuesta
        const appointmentDate = new Date(updatedAppointment[0].appointment_date);
        const responseData = {
            ...updatedAppointment[0],
            appointment_date: appointmentDate.toISOString().split('T')[0],
            appointment_time: appointmentDate.toTimeString().slice(0, 5)
        };

        res.json({
            message: 'Cita reprogramada exitosamente',
            appointment: responseData
        });
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        res.status(500).json({ 
            message: 'Error al reprogramar la cita',
            error: error.message 
        });
    }
});

// GET /api/appointments/my-appointments - Obtener citas del usuario autenticado
router.get('/my-appointments', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(400).json({
                message: 'ID de usuario no encontrado en el token'
            });
        }

        // Obtener las citas del usuario con información del doctor y especialidad (excluyendo canceladas)
        const appointments = await sql`
            SELECT 
                a.id, 
                a.appointment_date, 
                a.duration_minutes,
                a.reason, 
                a.status, 
                a.created_at,
                u.first_name as doctor_first_name, 
                u.last_name as doctor_last_name,
                s.name as specialty_name, 
                s.icon as specialty_icon,
                s.color as specialty_color
            FROM appointments a
            JOIN users u ON a.doctor_id = u.id
            JOIN doctors d ON u.id = d.id
            JOIN specialties s ON d.specialty_id = s.id
            WHERE a.patient_id = ${userId}
            AND a.status != 'cancelled'
            ORDER BY a.appointment_date DESC
        `;

        // Formatear las citas para el frontend
        const formattedAppointments = appointments.map(appointment => {
            const appointmentDate = new Date(appointment.appointment_date);
            return {
                ...appointment,
                appointment_date: appointmentDate.toISOString().split('T')[0], // YYYY-MM-DD
                appointment_time: appointmentDate.toTimeString().slice(0, 5), // HH:MM
                doctor_name: `${appointment.doctor_first_name} ${appointment.doctor_last_name}`
            };
        });

        res.json(formattedAppointments);
    } catch (error) {
        console.error('Error fetching user appointments:', error);
        res.status(500).json({ 
            message: 'Error al obtener las citas',
            error: error.message 
        });
    }
});

// GET /api/appointments/my-appointments-history - Obtener historial completo de citas (incluyendo canceladas)
router.get('/my-appointments-history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(400).json({
                message: 'ID de usuario no encontrado en el token'
            });
        }

        // Obtener todas las citas del usuario (incluyendo canceladas)
        const appointments = await sql`
            SELECT 
                a.id, 
                a.appointment_date, 
                a.duration_minutes,
                a.reason, 
                a.status, 
                a.created_at,
                u.first_name as doctor_first_name, 
                u.last_name as doctor_last_name,
                s.name as specialty_name, 
                s.icon as specialty_icon,
                s.color as specialty_color
            FROM appointments a
            JOIN users u ON a.doctor_id = u.id
            JOIN doctors d ON u.id = d.id
            JOIN specialties s ON d.specialty_id = s.id
            WHERE a.patient_id = ${userId}
            ORDER BY a.appointment_date DESC
        `;

        // Formatear las citas para el frontend
        const formattedAppointments = appointments.map(appointment => {
            const appointmentDate = new Date(appointment.appointment_date);
            return {
                ...appointment,
                appointment_date: appointmentDate.toISOString().split('T')[0], // YYYY-MM-DD
                appointment_time: appointmentDate.toTimeString().slice(0, 5), // HH:MM
                doctor_name: `${appointment.doctor_first_name} ${appointment.doctor_last_name}`
            };
        });

        res.json(formattedAppointments);
    } catch (error) {
        console.error('Error fetching user appointment history:', error);
        res.status(500).json({ 
            message: 'Error al obtener el historial de citas',
            error: error.message 
        });
    }
});

// GET /api/appointments/doctor-appointments - Obtener citas del doctor autenticado
router.get('/doctor-appointments', authenticateToken, async (req, res) => {
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

        // Obtener las citas del doctor con información del paciente
        const appointments = await sql`
            SELECT 
                a.id, 
                a.appointment_date, 
                a.duration_minutes,
                a.reason, 
                a.status, 
                a.created_at,
                u.first_name as patient_first_name, 
                u.last_name as patient_last_name,
                u.email as patient_email,
                u.phone as patient_phone,
                s.name as specialty_name
            FROM appointments a
            JOIN users u ON a.patient_id = u.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN specialties s ON d.specialty_id = s.id
            WHERE a.doctor_id = ${doctorId}
            AND a.status != 'cancelled'
            ORDER BY a.appointment_date ASC
        `;

        // Formatear las citas para el frontend
        const formattedAppointments = appointments.map(appointment => {
            const appointmentDate = new Date(appointment.appointment_date);
            return {
                ...appointment,
                appointment_date: appointmentDate.toISOString().split('T')[0], // YYYY-MM-DD
                appointment_time: appointmentDate.toTimeString().slice(0, 5), // HH:MM
                patient_name: `${appointment.patient_first_name} ${appointment.patient_last_name}`
            };
        });

        res.json(formattedAppointments);
    } catch (error) {
        console.error('Error fetching doctor appointments:', error);
        res.status(500).json({ 
            message: 'Error al obtener las citas del doctor',
            error: error.message 
        });
    }
});

// PUT /api/appointments/:appointmentId/complete - Marcar cita como completada (solo doctores)
router.put('/:appointmentId/complete', authenticateToken, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user?.userId;
        const { notes } = req.body; // Notas opcionales del doctor

        // Verificar que la cita pertenece al doctor autenticado
        const existingAppointment = await sql`
            SELECT id FROM appointments
            WHERE id = ${appointmentId}
            AND doctor_id = ${userId}
            AND status IN ('scheduled', 'confirmed')
        `;

        if (existingAppointment.length === 0) {
            return res.status(404).json({
                message: 'Cita no encontrada o no se puede completar'
            });
        }

        const updatedAppointment = await sql`
            UPDATE appointments 
            SET status = 'completed', 
                notes = ${notes || ''},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${appointmentId}
            RETURNING id, status, updated_at
        `;

        res.json({
            message: 'Cita marcada como completada',
            appointment: updatedAppointment[0]
        });
    } catch (error) {
        console.error('Error completing appointment:', error);
        res.status(500).json({ message: 'Error al completar la cita' });
    }
});

// GET /api/appointments/doctor-stats - Obtener estadísticas del doctor
router.get('/doctor-stats', authenticateToken, async (req, res) => {
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

        // Obtener estadísticas
        const today = new Date().toISOString().split('T')[0];
        
        // Citas de hoy
        const todayAppointments = await sql`
            SELECT COUNT(*) as count
            FROM appointments
            WHERE doctor_id = ${doctorId}
            AND DATE(appointment_date) = ${today}
            AND status IN ('scheduled', 'confirmed')
        `;

        // Total de pacientes únicos
        const totalPatients = await sql`
            SELECT COUNT(DISTINCT patient_id) as count
            FROM appointments
            WHERE doctor_id = ${doctorId}
        `;

        // Citas esta semana
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const weekAppointments = await sql`
            SELECT COUNT(*) as count
            FROM appointments
            WHERE doctor_id = ${doctorId}
            AND DATE(appointment_date) >= ${weekStartStr}
            AND status IN ('scheduled', 'confirmed')
        `;

        // Citas completadas este mes
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthStartStr = monthStart.toISOString().split('T')[0];
        
        const monthCompletedAppointments = await sql`
            SELECT COUNT(*) as count
            FROM appointments
            WHERE doctor_id = ${doctorId}
            AND DATE(appointment_date) >= ${monthStartStr}
            AND status = 'completed'
        `;

        const stats = {
            todayAppointments: parseInt(todayAppointments[0].count),
            totalPatients: parseInt(totalPatients[0].count),
            weekAppointments: parseInt(weekAppointments[0].count),
            monthCompletedAppointments: parseInt(monthCompletedAppointments[0].count)
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching doctor stats:', error);
        res.status(500).json({ 
            message: 'Error al obtener estadísticas del doctor',
            error: error.message 
        });
    }
});

// GET /api/appointments/doctor-patients - Obtener resumen de pacientes del doctor
router.get('/doctor-patients', authenticateToken, async (req, res) => {
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

        // Obtener resumen de pacientes únicos del doctor
        const patients = await sql`
            SELECT DISTINCT
                p.id as patient_id,
                u.first_name || ' ' || u.last_name as patient_name,
                u.email as patient_email,
                u.phone as patient_phone,
                (
                    SELECT COUNT(*) 
                    FROM medical_records mr 
                    WHERE mr.patient_id = p.id AND mr.doctor_id = ${doctorId}
                ) as medical_records_count
            FROM appointments a
            JOIN users u ON a.patient_id = u.id
            JOIN patients p ON u.id = p.id
            WHERE a.doctor_id = ${doctorId}
            ORDER BY u.first_name, u.last_name
        `;

        res.json(patients);
    } catch (error) {
        console.error('Error fetching doctor patients:', error);
        res.status(500).json({ 
            message: 'Error al obtener pacientes del doctor',
            error: error.message 
        });
    }
});

module.exports = router;