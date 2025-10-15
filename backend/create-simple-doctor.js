const bcrypt = require('bcryptjs');
const pool = require('./config/pool');

async function createSimpleDoctor() {
    try {
        console.log('🏥 Creando médico con contraseña simple...');
        
        // Eliminar el médico existente si existe
        await pool.query('DELETE FROM users WHERE email = $1', ['doctor@test.com']);
        
        // Hash simple para la contraseña "1234"
        const hash = await bcrypt.hash('1234', 10); // Usando menos rounds
        console.log('🔐 Hash generado:', hash);
        
        // Crear nuevo médico
        const result = await pool.query(`
            INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, is_active, email_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, email
        `, ['doctor@test.com', hash, 'Dr. Test', 'Medico', '+1234567890', 2, true, true]);
        
        console.log('✅ Médico creado:', result.rows[0]);
        
        // Verificar que la contraseña funciona
        const testUser = await pool.query('SELECT password_hash FROM users WHERE email = $1', ['doctor@test.com']);
        const testMatch = await bcrypt.compare('1234', testUser.rows[0].password_hash);
        console.log('🔑 Test de contraseña:', testMatch ? '✅ FUNCIONA' : '❌ FALLA');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

createSimpleDoctor();