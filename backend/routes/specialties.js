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

// GET /api/specialties - Obtener todas las especialidades
router.get('/', async (req, res) => {
    try {
        console.log('Obteniendo especialidades...');

        const specialties = await sql`
            SELECT id, name, description, icon, color
            FROM specialties
            ORDER BY name
        `;

        console.log(`Encontradas ${specialties.length} especialidades`);
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