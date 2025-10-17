const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./config/database');
const { verifyEmailConfig } = require('./services/emailService');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas básicas
app.get('/', (req, res) => {
    res.json({
        message: 'Bookstore Management System API',
        version: '1.0.0',
        status: 'running'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
    });
});

// Nuevo endpoint de prueba para demostrar hot reload
app.get('/api/test', (req, res) => {
    res.json({
        message: '¡Hot reload funcionando!',
        timestamp: new Date().toISOString(),
        backend: 'editado localmente y actualizado en Docker'
    });
});

// Importar y usar rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/publishers', require('./routes/publishers'));

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Ruta no encontrada - debe ir al final de todas las rutas
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// Función para iniciar el servidor
async function startServer() {
    try {
        // Verificar conexión a la base de datos
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        
        // Verificar configuración de email
        await verifyEmailConfig();
        
        // Sincronizar modelos (opcional - solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✅ Database models synchronized.');
        }
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 API URL: http://localhost:${PORT}`);
        });
        
    } catch (error) {
        console.error('❌ Unable to start server:', error);
        process.exit(1);
    }
}

// Iniciar el servidor
startServer();

module.exports = app;