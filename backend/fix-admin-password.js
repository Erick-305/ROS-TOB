const postgres = require('postgres');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const sql = postgres({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function updateAdminPassword() {
    try {
        console.log('🔧 Actualizando contraseña del administrador...');

        // Contraseña para el admin
        const adminPassword = 'password123';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Actualizar la contraseña del admin
        const result = await sql`
            UPDATE users 
            SET password_hash = ${hashedPassword},
                email_verified = true
            WHERE email = 'admin@hospital.com'
        `;

        console.log('✅ Contraseña del admin actualizada exitosamente');
        console.log('📧 Email: admin@hospital.com');
        console.log('🔐 Contraseña: password123');
        
        // Verificar que el usuario existe y tiene el rol correcto
        const adminUser = await sql`
            SELECT u.email, u.first_name, u.last_name, r.name as role_name, u.role_id
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = 'admin@hospital.com'
        `;

        if (adminUser.length > 0) {
            const user = adminUser[0];
            console.log('👤 Usuario verificado:', {
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role_name,
                roleId: user.role_id
            });
        }

        console.log('🎉 ¡Administrador listo para usar!');
        
    } catch (error) {
        console.error('❌ Error actualizando admin:', error);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

updateAdminPassword();