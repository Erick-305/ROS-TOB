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

async function createDemoUsers() {
    try {
        console.log('🔧 Creando usuarios de demostración...');

        // Contraseña común para todos los usuarios de demo
        const demoPassword = 'password123';
        const hashedPassword = await bcrypt.hash(demoPassword, 12);

        // Usuarios de demostración
        const demoUsers = [
            {
                email: 'admin@hospital.com',
                firstName: 'Administrador',
                lastName: 'Sistema',
                phone: '+1234567890',
                roleId: 3 // Administrador
            },
            {
                email: 'dr.martinez@hospital.com',
                firstName: 'Carlos',
                lastName: 'Martínez',
                phone: '+1234567891',
                roleId: 2 // Doctor
            },
            {
                email: 'dr.rodriguez@hospital.com',
                firstName: 'Ana',
                lastName: 'Rodríguez',
                phone: '+1234567892',
                roleId: 2 // Doctor
            },
            {
                email: 'paciente@hospital.com',
                firstName: 'Juan',
                lastName: 'Pérez',
                phone: '+1234567893',
                roleId: 1 // Paciente
            },
            {
                email: 'paciente2@hospital.com',
                firstName: 'María',
                lastName: 'González',
                phone: '+1234567894',
                roleId: 1 // Paciente
            }
        ];

        // Verificar usuarios existentes y crear solo los que no existan
        for (const user of demoUsers) {
            const existing = await sql`
                SELECT id FROM users WHERE email = ${user.email}
            `;

            if (existing.length === 0) {
                await sql`
                    INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
                    VALUES (${user.email}, ${hashedPassword}, ${user.firstName}, ${user.lastName}, ${user.phone}, ${user.roleId})
                `;
                console.log(`✅ Usuario creado: ${user.email} (${user.firstName} ${user.lastName})`);
            } else {
                console.log(`⚠️  Usuario ya existe: ${user.email}`);
            }
        }

        // Mostrar resumen de usuarios
        const allUsers = await sql`
            SELECT 
                u.email, u.first_name, u.last_name, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            ORDER BY r.id, u.first_name
        `;

        console.log('\n📊 Usuarios en el sistema:');
        console.log('===============================');
        allUsers.forEach(user => {
            console.log(`👤 ${user.first_name} ${user.last_name} - ${user.email} [${user.role_name}]`);
        });

        console.log('\n🔐 Contraseña para todos los usuarios demo: password123');
        console.log('\n🎉 ¡Usuarios de demostración creados exitosamente!');

    } catch (error) {
        console.error('❌ Error creando usuarios demo:', error);
    } finally {
        await sql.end();
    }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    createDemoUsers();
}

module.exports = { createDemoUsers };