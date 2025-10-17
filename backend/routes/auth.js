const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/pool');
const { sendVerificationEmail } = require('../services/emailService');
const crypto = require('crypto');

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
        const { email, password, name, phone, address, role = 'customer' } = req.body;

        // Validaciones básicas
        if (!email || !password || !name) {
            return res.status(400).json({
                message: 'Email, contraseña y nombre son requeridos'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar roles válidos
        const validRoles = ['customer', 'employee', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: 'Rol inválido'
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

        // Generar código de verificación de 6 dígitos
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        // Crear usuario (sin verificar)
        const insertUserQuery = `
            INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, email_verified, email_verification_code, email_verification_expires)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, email, first_name, last_name, phone, role_id, created_at
        `;
        
        const newUserResult = await pool.query(insertUserQuery, [
            email, passwordHash, firstName, lastName, phone || null, roleId, false, verificationCode, verificationExpires
        ]);

        const newUser = newUserResult.rows[0];

        // Si es un paciente (roleId = 3), crear registro en tabla patients
        if (roleId === 3) {
            const insertPatientQuery = `
                INSERT INTO patients (id) VALUES ($1)
            `;
            await pool.query(insertPatientQuery, [newUser.id]);
            console.log('✅ Registro de paciente creado para:', email);
        }

        // Enviar email de verificación con código
        await sendVerificationEmail(email, `${firstName} ${lastName}`, verificationCode);

        console.log('✅ Usuario registrado, código de verificación enviado:', email, 'Código:', verificationCode);

        res.status(201).json({
            message: 'Usuario registrado exitosamente. Por favor verifica tu email antes de iniciar sesión.',
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                phone: newUser.phone,
                role: {
                    id: newUser.role_id,
                    name: 'patient' // Por defecto
                },
                emailVerified: false
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

// POST /api/auth/verify-email - Verificar email con código
router.post('/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;

        console.log('🔍 Verificación solicitada para email:', email, 'con código:', code);

        if (!email || !code) {
            console.log('❌ Email o código faltante');
            return res.status(400).json({
                message: 'Email y código de verificación son requeridos'
            });
        }

        // Buscar usuario por email y código
        const query = `
            SELECT id, email, first_name, last_name, email_verification_expires, email_verification_code
            FROM users 
            WHERE email = $1 AND email_verification_code = $2
        `;
        
        console.log('🔍 Buscando usuario con email y código en BD...');
        const result = await pool.query(query, [email, code]);

        if (result.rows.length === 0) {
            console.log('❌ Email o código incorrecto:', email, code);
            return res.status(400).json({
                message: 'Email o código de verificación incorrecto'
            });
        }

        const user = result.rows[0];
        console.log('✅ Usuario encontrado:', user.email);

        // Verificar si el código ha expirado
        if (new Date() > new Date(user.email_verification_expires)) {
            console.log('❌ Código expirado para:', user.email);
            return res.status(400).json({
                message: 'El código de verificación ha expirado. Solicita un nuevo registro.'
            });
        }

        // Activar la cuenta
        const updateQuery = `
            UPDATE users 
            SET email_verified = true, 
                email_verification_code = NULL, 
                email_verification_expires = NULL 
            WHERE id = $1
        `;
        
        await pool.query(updateQuery, [user.id]);

        console.log('✅ Email verificado exitosamente:', user.email);

        res.json({
            message: 'Email verificado exitosamente. Ahora puedes iniciar sesión.',
            verified: true
        });

    } catch (error) {
        console.error('❌ Error en verificación de email:', error);
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

        // Buscar usuario
        const query = `
            SELECT 
                id, email, password, name, phone, role, is_verified
            FROM users 
            WHERE email = $1
        `;
        
        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            console.log('❌ Usuario no encontrado:', email);
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        const user = result.rows[0];

        // Los usuarios en esta BD no tienen verificación de email ni estado activo
        // Solo verificamos credenciales básicas

        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(password, user.password);

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
            role: user.role,
            name: user.name
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '24h' }
        );

        console.log('✅ Login exitoso:', user.email, 'Rol:', user.role);

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role
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