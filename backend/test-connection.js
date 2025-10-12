const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    console.log('🔍 Probando conexión a PostgreSQL...');
    console.log('📋 Configuración:');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '***' : 'NO DEFINIDA'}`);
    console.log('');

    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: false,
        // Timeout settings para Windows/Docker
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        query_timeout: 60000,
        // Configuraciones adicionales para resolver problemas de conectividad
        keepAlive: true,
        keepAliveInitialDelayMillis: 0,
    });

    try {
        console.log('🔌 Intentando conectar...');
        await client.connect();
        console.log('✅ ¡Conexión exitosa!');
        
        // Probar una consulta simple
        console.log('🔍 Probando consulta simple...');
        const result = await client.query('SELECT current_user, current_database(), version()');
        console.log('📊 Resultado:');
        console.log(`   Usuario actual: ${result.rows[0].current_user}`);
        console.log(`   Base de datos: ${result.rows[0].current_database}`);
        console.log(`   Versión PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
        
        // Probar que existan las tablas
        console.log('🔍 Verificando tablas...');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📋 Tablas encontradas:');
        tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Error de conexión:');
        console.error(`   Código: ${error.code}`);
        console.error(`   Mensaje: ${error.message}`);
        console.error(`   Detalles: ${error.detail || 'No disponibles'}`);
        
        if (error.code === '28P01') {
            console.log('');
            console.log('💡 Sugerencias para error de autenticación:');
            console.log('   1. Verificar que las credenciales en .env sean correctas');
            console.log('   2. Verificar que PostgreSQL esté ejecutándose');
            console.log('   3. Verificar que el usuario exista en la base de datos');
        }
        
    } finally {
        try {
            await client.end();
            console.log('🔌 Conexión cerrada');
        } catch (closeError) {
            console.error('⚠️  Error al cerrar conexión:', closeError.message);
        }
    }
}

// Ejecutar test
testConnection().then(() => {
    console.log('');
    console.log('🏁 Test de conexión completado');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Error inesperado:', error);
    process.exit(1);
});