const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración de la base de datos
const sequelize = new Sequelize({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rostob_publicaciones_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});

// Función para testear la conexión
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connection has been established successfully.');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to PostgreSQL database:', error);
        return false;
    }
}

module.exports = {
    sequelize,
    testConnection
};