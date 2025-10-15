const bcrypt = require('bcryptjs');
const pool = require('./config/pool');

async function fixExistingDoctors() {
    try {
        console.log('🔧 Arreglando contraseñas de médicos existentes...');
        
        // Lista de médicos originales
        const doctors = [
            'dr.martinez@hospital.com',
            'dr.rodriguez@hospital.com', 
            'dr.garcia@hospital.com',
            'dr.lopez@hospital.com',
            'dr.hernandez@hospital.com'
        ];
        
        // Generar hash correcto para "1234"
        const hash = await bcrypt.hash('1234', 10);
        console.log('🔐 Hash generado para "1234":', hash);
        
        // Actualizar cada médico individualmente
        for (const email of doctors) {
            const result = await pool.query(
                'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
                [hash, email]
            );
            
            if (result.rows.length > 0) {
                console.log(`✅ Actualizado: ${email}`);
                
                // Verificar que la contraseña funciona
                const testUser = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
                const testMatch = await bcrypt.compare('1234', testUser.rows[0].password_hash);
                console.log(`🔑 Test ${email}: ${testMatch ? '✅ FUNCIONA' : '❌ FALLA'}`);
            } else {
                console.log(`❌ No se encontró: ${email}`);
            }
        }
        
        console.log('\n📊 Verificando médicos con citas...');
        
        // Verificar qué médicos tienen citas
        const appointmentsQuery = `
            SELECT 
                u.email, 
                u.first_name, 
                u.last_name,
                COUNT(a.id) as total_citas
            FROM users u
            LEFT JOIN appointments a ON u.id = a.doctor_id
            WHERE u.email LIKE 'dr.%@hospital.com'
            GROUP BY u.id, u.email, u.first_name, u.last_name
            ORDER BY total_citas DESC
        `;
        
        const appointmentsResult = await pool.query(appointmentsQuery);
        
        console.log('\n🏥 Médicos y sus citas:');
        appointmentsResult.rows.forEach(doctor => {
            console.log(`👨‍⚕️ ${doctor.first_name} ${doctor.last_name} (${doctor.email}): ${doctor.total_citas} citas`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

fixExistingDoctors();