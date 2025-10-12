const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/pool');
const { sendVerificationEmail } = require('../services/emailService');

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

// POST /api/auth/register - Registro de nuevos usuarios
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
        const existingUser = await sql`
            SELECT id FROM users WHERE email = ${email}
        `;

        if (existingUser.length > 0) {
            return res.status(400).json({
                message: 'El email ya está registrado'
            });
        }

        // Hashear contraseña
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Generar token de verificación
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        // Crear usuario (sin verificar inicialmente)
        const newUser = await sql`
            INSERT INTO users (
                email, password_hash, first_name, last_name, phone, role_id,
                email_verified, verification_token, verification_expires_at
            )
            VALUES (
                ${email}, ${passwordHash}, ${firstName}, ${lastName}, ${phone || null}, ${roleId},
                false, ${verificationToken}, ${verificationExpires}
            )
            RETURNING id, email, first_name, last_name, phone, role_id, created_at
        `;

        // Obtener información del rol
        const userWithRole = await sql`
            SELECT 
                u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at,
                r.id as role_id, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ${newUser[0].id}
        `;

        const user = userWithRole[0];

        // Enviar email de verificación
        const emailResult = await sendVerificationEmail(
            user.email, 
            `${user.first_name} ${user.last_name}`, 
            verificationToken
        );

        if (!emailResult.success) {
            console.error('❌ Error enviando email de verificación:', emailResult.error);
            // Continuar con el registro aunque falle el email
        }

        // TODO: Remover estos logs en producción
        console.log(`🔗 Token de verificación para ${email}: ${verificationToken}`);
        console.log(`🌐 URL de verificación: http://localhost:4200/verify-email?token=${verificationToken}`);

        // No generar token JWT hasta que se verifique el email
        res.status(201).json({
            message: 'Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.',
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
                emailVerified: false
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
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
                u.phone, u.is_active, u.email_verified,
                r.id as role_id, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = $1 AND u.is_active = true
        `;
        
        const result = await pool.query(query, [email]);
        const users = result.rows;

        console.log('👤 Usuario encontrado:', users.length > 0 ? 'Sí' : 'No');

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        const user = users[0];

        // Verificar si el email está verificado
        if (!user.email_verified) {
            return res.status(401).json({
                message: 'Debes verificar tu email antes de iniciar sesión. Revisa tu correo electrónico.'
            });
        }

        console.log('🔍 Verificando contraseña...');

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        console.log('🔐 Contraseña válida:', isValidPassword);

        if (!isValidPassword) {
            return res.status(401).json({
                message: 'Credenciales inválidas'
            });
        }

        // Generar JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                roleId: user.role_id,
                roleName: user.role_name
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '24h' }
        );

        console.log('✅ Login exitoso para:', email);

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

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const users = await sql`
            SELECT 
                u.id, u.email, u.first_name, u.last_name, u.phone,
                r.id as role_id, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ${req.user.userId} AND u.is_active = true
        `;

        if (users.length === 0) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        const user = users[0];

        res.json({
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
        console.error('Error al obtener usuario:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/auth/roles - Obtener roles disponibles
router.get('/roles', async (req, res) => {
    try {
        const roles = await sql`
            SELECT id, name, description FROM roles ORDER BY id
        `;

        res.json({
            roles: roles
        });

    } catch (error) {
        console.error('Error al obtener roles:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// 🔐 Endpoint para verificar email
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                message: 'Token de verificación requerido'
            });
        }

        // Buscar usuario con el token de verificación
        const users = await sql`
            SELECT 
                u.id, u.email, u.first_name, u.last_name, u.phone,
                u.email_verified, u.verification_expires_at,
                r.id as role_id, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.verification_token = ${token}
            AND u.email_verified = false
        `;

        if (users.length === 0) {
            return res.status(400).json({
                message: 'Token de verificación inválido o ya utilizado'
            });
        }

        const user = users[0];

        // Verificar si el token ha expirado
        if (new Date() > new Date(user.verification_expires_at)) {
            return res.status(400).json({
                message: 'El token de verificación ha expirado. Por favor, regístrate nuevamente.'
            });
        }

        // Actualizar usuario como verificado
        await sql`
            UPDATE users 
            SET email_verified = true, 
                verification_token = null, 
                verification_expires_at = null
            WHERE id = ${user.id}
        `;

        // Generar JWT token para login automático
        const jwtToken = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                roleId: user.role_id,
                roleName: user.role_name
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: '24h' }
        );

        console.log(`✅ Usuario verificado exitosamente: ${user.email}`);

        res.json({
            message: 'Email verificado exitosamente',
            token: jwtToken,
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
        console.error('Error en verificación de email:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

// 📧 Endpoint para verificar si un email ya existe
router.post('/check-email', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'Email es requerido'
            });
        }

        // Verificar si el email ya existe
        const existingUser = await sql`
            SELECT id FROM users WHERE email = ${email}
        `;

        res.json({
            exists: existingUser.length > 0,
            message: existingUser.length > 0 ? 'Este email ya está registrado' : 'Email disponible'
        });

    } catch (error) {
        console.error('Error verificando email:', error);
        res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;