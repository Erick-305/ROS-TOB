const bcrypt = require('bcryptjs');
const pool = require('./config/pool');

async function testPassword() {
    try {
        console.log('🔍 Probando verificación de contraseña...');
        
        // Buscar el Dr. Martínez
        const query = `
            SELECT email, password_hash 
            FROM users 
            WHERE email = 'dr.martinez@hospital.com'
        `;
        
        const result = await pool.query(query);
        const user = result.rows[0];
        
        if (!user) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        console.log('👤 Usuario encontrado:', user.email);
        console.log('🔐 Hash en BD:', user.password_hash);
        
        // Probar con diferentes contraseñas
        const passwords = ['1234', 'password123', '12345', 'admin'];
        
        for (const pass of passwords) {
            const match = await bcrypt.compare(pass, user.password_hash);
            console.log(`🔑 Contraseña "${pass}": ${match ? '✅ CORRECTA' : '❌ INCORRECTA'}`);
        }
        
        // Generar nuevo hash para 1234
        const newHash = await bcrypt.hash('1234', 12);
        console.log('🆕 Nuevo hash para "1234":', newHash);
        
        // Verificar el nuevo hash
        const newMatch = await bcrypt.compare('1234', newHash);
        console.log('✔️ Verificación nuevo hash:', newMatch ? 'OK' : 'FALLO');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

testPassword();