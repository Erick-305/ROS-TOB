const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transportador de email
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verificar configuración de email
const verifyEmailConfig = async () => {
    try {
        await transporter.verify();
        console.log('✅ Configuración de email verificada correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error en configuración de email:', error);
        return false;
    }
};

// Plantilla HTML para email de verificación
const getVerificationEmailTemplate = (userName, verificationUrl) => {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificación de Cuenta - Hospital System</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
                margin: 0;
                padding: 0;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2rem;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 2rem;
                font-weight: 700;
            }
            .header p {
                margin: 0.5rem 0 0 0;
                opacity: 0.9;
            }
            .content {
                padding: 2rem;
            }
            .welcome {
                font-size: 1.2rem;
                color: #2c3e50;
                margin-bottom: 1rem;
            }
            .message {
                color: #7f8c8d;
                margin-bottom: 2rem;
                font-size: 1rem;
            }
            .verification-btn {
                display: inline-block;
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                color: white;
                text-decoration: none;
                padding: 1rem 2rem;
                border-radius: 10px;
                font-weight: 600;
                font-size: 1.1rem;
                box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
                transition: all 0.3s ease;
                margin: 1rem 0;
            }
            .verification-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
            }
            .alternative {
                background: #f8f9fa;
                padding: 1.5rem;
                border-radius: 10px;
                margin: 2rem 0;
                border-left: 4px solid #3498db;
            }
            .alternative p {
                margin: 0 0 0.5rem 0;
                color: #2c3e50;
                font-weight: 600;
            }
            .alternative code {
                background: #e9ecef;
                padding: 0.2rem 0.5rem;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                word-break: break-all;
                display: block;
                margin-top: 0.5rem;
            }
            .footer {
                background: #2c3e50;
                color: #bdc3c7;
                padding: 1.5rem;
                text-align: center;
                font-size: 0.9rem;
            }
            .footer p {
                margin: 0;
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 1rem;
                border-radius: 8px;
                margin: 1rem 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏥 Sistema Hospitalario</h1>
                <p>Verificación de Cuenta</p>
            </div>
            
            <div class="content">
                <div class="welcome">
                    ¡Hola ${userName}! 👋
                </div>
                
                <div class="message">
                    ¡Gracias por registrarte en nuestro Sistema Hospitalario! Para completar tu registro y poder acceder a todos nuestros servicios médicos, necesitamos verificar tu dirección de correo electrónico.
                </div>
                
                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="verification-btn">
                        🔐 Verificar mi cuenta
                    </a>
                </div>
                
                <div class="alternative">
                    <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                    <code>${verificationUrl}</code>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong> Este enlace de verificación expirará en 24 horas. Si no verificas tu cuenta dentro de este tiempo, deberás registrarte nuevamente.
                </div>
                
                <div class="message">
                    Una vez verificada tu cuenta, podrás:
                    <ul style="color: #2c3e50; margin: 1rem 0;">
                        <li>🗓️ Agendar citas médicas</li>
                        <li>📋 Consultar tu historial médico</li>
                        <li>💊 Ver tus recetas y tratamientos</li>
                        <li>📞 Contactar con nuestros especialistas</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>Este correo fue enviado automáticamente. Por favor no respondas a esta dirección.</p>
                <p>© 2025 Sistema Hospitalario. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Función para enviar email de verificación
const sendVerificationEmail = async (userEmail, userName, verificationToken) => {
    try {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        
        const mailOptions = {
            from: {
                name: 'Sistema Hospitalario',
                address: process.env.EMAIL_FROM
            },
            to: userEmail,
            subject: '🏥 Verificación de Cuenta - Sistema Hospitalario',
            html: getVerificationEmailTemplate(userName, verificationUrl),
            text: `
Hola ${userName},

¡Gracias por registrarte en nuestro Sistema Hospitalario!

Para completar tu registro, por favor verifica tu cuenta haciendo clic en el siguiente enlace:
${verificationUrl}

Este enlace expirará en 24 horas.

Una vez verificada tu cuenta, podrás agendar citas médicas y acceder a todos nuestros servicios.

Saludos,
Equipo del Sistema Hospitalario
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email de verificación enviado:', info.messageId);
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ Error enviando email de verificación:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    verifyEmailConfig,
    sendVerificationEmail
};