const postgres = require('postgres');
require('dotenv').config();

async function testConnectionInContainer() {
    console.log('🔍 Probando conexión desde contenedor...');
    console.log('📋 Configuración:');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Puerto: ${process.env.DB_PORT}`);
    console.log(`   Base de datos: ${process.env.DB_NAME}`);
    console.log(`   Usuario: ${process.env.DB_USER}`);
    console.log(`   Contraseña: ${process.env.DB_PASSWORD ? '***' : '[VACÍA]'}`);

    const sql = postgres({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
    });

    try {
        console.log('🔌 Intentando conectar...');
        
        // Probar conexión básica
        const result = await sql`SELECT current_user, current_database(), version()`;
        console.log('✅ ¡Conexión exitosa!');
        console.log('📊 Información del servidor:');
        console.log(`   Usuario actual: ${result[0].current_user}`);
        console.log(`   Base de datos: ${result[0].current_database}`);
        console.log(`   Versión: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`);
        
        // Verificar tablas
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        
        console.log('\n📋 Tablas disponibles:');
        tables.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        // Verificar datos
        const doctors = await sql`SELECT COUNT(*) as total FROM doctors`;
        const patients = await sql`SELECT COUNT(*) as total FROM patients`;
        
        console.log('\n📊 Datos en la base:');
        console.log(`   👨‍⚕️ Doctores: ${doctors[0].total}`);
        console.log(`   🏥 Pacientes: ${patients[0].total}`);
        
        console.log('\n🎉 ¡Base de datos completamente funcional!');
        
        await sql.end();
        return true;
        
    } catch (error) {
        console.log(`❌ Error de conexión: ${error.message}`);
        try {
            await sql.end();
        } catch (e) {
            // Ignorar errores al cerrar
        }
        return false;
    }
}

// Ejecutar test
testConnectionInContainer()
    .then((success) => {
        if (success) {
            console.log('\n🚀 ¡Listo para iniciar el servidor backend!');
        } else {
            console.log('\n❌ Problema de conectividad');
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('💥 Error:', error);
        process.exit(1);
    });