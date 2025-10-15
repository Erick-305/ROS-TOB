-- Migración para agregar las columnas faltantes en la base de datos
-- Ejecutar después de la inicialización de la base de datos

-- Agregar columnas de verificación de email a la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;

-- Comentario: La columna 'reason' ya existe en la tabla appointments según el init.sql
-- pero si por alguna razón no existe, la agregaríamos así:
-- ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason TEXT;

-- Actualizar usuarios existentes para marcar emails como verificados (opcional para desarrollo)
-- En producción, los usuarios deberían verificar su email
UPDATE users SET email_verified = true WHERE email_verified IS NULL;

-- Crear índice para mejorar las consultas de verificación
CREATE INDEX IF NOT EXISTS idx_users_email_verification ON users(email_verification_code);

COMMIT;