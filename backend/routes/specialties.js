const express = require('express');
const router = express.Router();
const postgres = require('postgres');

// Configuración de la base de datos
const sql = postgres({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// GET /api/specialties - Obtener todas las especialidades con médicos
router.get('/', async (req, res) => {
    try {
        console.log('Obteniendo especialidades con médicos...');

        const result = await sql`
            SELECT 
                s.id, 
                s.name, 
                s.description,
                u.id as doctor_id,
                u.first_name as doctor_first_name,
                u.last_name as doctor_last_name,
                u.email as doctor_email,
                d.license_number
            FROM specialties s
            LEFT JOIN doctors d ON s.id = d.specialty_id
            LEFT JOIN users u ON d.id = u.id AND u.role_id = 2
            ORDER BY s.name, u.first_name
        `;

        // Agrupar médicos por especialidad
        const specialtiesMap = new Map();
        
        result.forEach(row => {
            if (!specialtiesMap.has(row.id)) {
                specialtiesMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    doctors: []
                });
            }
            
            if (row.doctor_id) {
                specialtiesMap.get(row.id).doctors.push({
                    id: row.doctor_id,
                    first_name: row.doctor_first_name,
                    last_name: row.doctor_last_name,
                    email: row.doctor_email,
                    license_number: row.license_number,
                    full_name: `Dr. ${row.doctor_first_name} ${row.doctor_last_name}`
                });
            }
        });

        const specialties = Array.from(specialtiesMap.values());
        
        console.log(`Encontradas ${specialties.length} especialidades con médicos`);
        specialties.forEach(s => {
            console.log(`- ${s.name}: ${s.doctors.length} médicos`);
        });
        
        res.json(specialties);

    } catch (error) {
        console.error('Error obteniendo especialidades:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al obtener especialidades',
            error: error.message 
        });
    }
});

module.exports = router;