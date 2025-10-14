const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/pool');

const router = express.Router();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// POST /api/auth/register - Registro básico
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, roleId = 3 } = req.body;

        // Validaciones básicas
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                message: 'Email, contraseña, nombre y apellido son requeridos'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar si el usuario ya existe
        const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
        const existingUserResult = await pool.query(existingUserQuery, [email]);

        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({
                message: 'El email ya está registrado'
            });
        }

        // Hashear contraseña
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Crear usuario
        const insertUserQuery = `
            INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, first_name, last_name, phone, role_id, created_at
        `;
        
        const newUserResult = await pool.query(insertUserQuery, [
            email, passwordHash, firstName, lastName, phone || null, roleId
        ]);

        const newUser = newUserResult.rows[0];

        // Obtener información del rol
        const userWithRoleQuery = `
            SELECT 
                u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at,
                r.id as role_id, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        `;
        
        const userWithRoleResult = await pool.query(userWithRoleQuery, [newUser.id]);
        const user = userWithRoleResult.rows[0];

        console.log('✅ Usuario registrado exitosamente:', email);

        res.status(201).json({
            message: 'Usuario registrado exitosamente.',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                role: {
                    id: user.role_id,
                    name: user.role_name
                },
                emailVerified: true
            }
        });

    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/auth/login - Inicio de sesión
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Intento de login:', { email, passwordProvided: !!password });

        // Validaciones básicas
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario con su rol
        const query = `
            SELECT 
                u.id, u.email, u.password_hash, u.first_name, u.last_name, 
                u.phone, u.is_active,
                r.id as role_id, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = $1
        `;
        
        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            console.log('❌ Usuario no encontrado:', email);
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        const user = result.rows[0];

        // Verificar si el usuario está activo
        if (!user.is_active) {
            console.log('❌ Usuario inactivo:', email);
            return res.status(401).json({
                message: 'Cuenta desactivada. Contacta al administrador.'
            });
        }

        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            console.log('❌ Contraseña incorrecta para:', email);
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        // Generar JWT
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            roleId: user.role_id,
            roleName: user.role_name
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '24h' }
        );

        console.log('✅ Login exitoso para:', email, 'Rol:', user.role_name);

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                role: {
                    id: user.role_id,
                    name: user.role_name
                }
            }
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/auth/me - Obtener información del usuario autenticado
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.email, u.first_name, u.last_name, u.phone, 
                u.is_active, u.email_verified, u.created_at,
                r.id as role_id, r.name as role_name, r.description as role_description
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        `;
        
        const result = await pool.query(query, [req.user.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        const user = result.rows[0];

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                isActive: user.is_active,
                emailVerified: user.email_verified,
                createdAt: user.created_at,
                role: {
                    id: user.role_id,
                    name: user.role_name,
                    description: user.role_description
                }
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo información del usuario:', error);
        res.status(500).json({
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;