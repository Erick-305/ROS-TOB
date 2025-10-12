const { Pool } = require('pg');
require('dotenv').config();

// Pool de conexiones para consultas SQL directas
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hospital_db',
    user: process.env.DB_USER || 'hospital_user',
    password: process.env.DB_PASSWORD || 'hospital_password',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

module.exports = pool;