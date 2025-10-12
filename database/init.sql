-- Crear extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear usuario para la aplicación
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'hospital_user') THEN
      
      CREATE ROLE hospital_user LOGIN PASSWORD 'hospital_password';
   END IF;
END
$do$;

-- Otorgar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE hospital_db TO hospital_user;
ALTER DATABASE hospital_db OWNER TO hospital_user;

-- Tabla de roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles por defecto
INSERT INTO roles (name, description) VALUES 
('admin', 'Administrador del sistema'),
('doctor', 'Médico'),
('patient', 'Paciente');

-- Tabla de usuarios (base para todos los tipos de usuario)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de especialidades médicas
CREATE TABLE specialties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar algunas especialidades por defecto
INSERT INTO specialties (name, description) VALUES 
('Medicina General', 'Atención médica general'),
('Cardiología', 'Especialista en corazón'),
('Neurología', 'Especialista en sistema nervioso'),
('Pediatría', 'Especialista en niños'),
('Ginecología', 'Especialista en salud femenina');

-- Tabla de médicos (extiende users)
CREATE TABLE doctors (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    specialty_id INTEGER REFERENCES specialties(id),
    years_experience INTEGER,
    consultation_fee DECIMAL(10,2),
    office_address TEXT,
    schedule JSONB, -- Horarios de atención en formato JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pacientes (extiende users)
CREATE TABLE patients (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    blood_type VARCHAR(10),
    allergies TEXT[],
    medical_conditions TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de citas
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, cancelled
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de historiales médicos
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor ON medical_records(doctor_id);

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Otorgar todos los permisos al usuario hospital_user sobre todas las tablas y secuencias
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hospital_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hospital_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hospital_user;

-- Asegurar que los permisos se apliquen a futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hospital_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hospital_user;

-- ===== DATOS DE PRUEBA =====

-- Insertar usuarios médicos predefinidos
INSERT INTO users (id, email, password_hash, role_id, first_name, last_name, phone, is_active) VALUES 
(uuid_generate_v4(), 'dr.martinez@hospital.com', '$2b$10$rOzHqFPYk.N8K8qH8K8K8uJ1J1J1J1J1J1J1J1J1J1J1J1J1J1J1', 2, 'Carlos', 'Martínez', '+1-555-0101', true),
(uuid_generate_v4(), 'dr.rodriguez@hospital.com', '$2b$10$rOzHqFPYk.N8K8qH8K8K8uJ1J1J1J1J1J1J1J1J1J1J1J1J1J1J1', 2, 'Ana', 'Rodríguez', '+1-555-0102', true),
(uuid_generate_v4(), 'dr.garcia@hospital.com', '$2b$10$rOzHqFPYk.N8K8qH8K8K8uJ1J1J1J1J1J1J1J1J1J1J1J1J1J1J1', 2, 'Luis', 'García', '+1-555-0103', true),
(uuid_generate_v4(), 'dr.lopez@hospital.com', '$2b$10$rOzHqFPYk.N8K8qH8K8K8uJ1J1J1J1J1J1J1J1J1J1J1J1J1J1J1', 2, 'María', 'López', '+1-555-0104', true),
(uuid_generate_v4(), 'dr.hernandez@hospital.com', '$2b$10$rOzHqFPYk.N8K8qH8K8K8uJ1J1J1J1J1J1J1J1J1J1J1J1J1J1J1', 2, 'José', 'Hernández', '+1-555-0105', true);

-- Insertar datos de médicos usando los IDs de usuarios
INSERT INTO doctors (id, license_number, specialty_id, years_experience, consultation_fee, office_address, schedule) 
SELECT 
    u.id,
    CASE 
        WHEN u.email = 'dr.martinez@hospital.com' THEN 'MED-001'
        WHEN u.email = 'dr.rodriguez@hospital.com' THEN 'MED-002'
        WHEN u.email = 'dr.garcia@hospital.com' THEN 'MED-003'
        WHEN u.email = 'dr.lopez@hospital.com' THEN 'MED-004'
        WHEN u.email = 'dr.hernandez@hospital.com' THEN 'MED-005'
    END as license_number,
    CASE 
        WHEN u.email = 'dr.martinez@hospital.com' THEN 1  -- Medicina General
        WHEN u.email = 'dr.rodriguez@hospital.com' THEN 2 -- Cardiología
        WHEN u.email = 'dr.garcia@hospital.com' THEN 3    -- Neurología
        WHEN u.email = 'dr.lopez@hospital.com' THEN 4     -- Pediatría
        WHEN u.email = 'dr.hernandez@hospital.com' THEN 5 -- Ginecología
    END as specialty_id,
    CASE 
        WHEN u.email = 'dr.martinez@hospital.com' THEN 10
        WHEN u.email = 'dr.rodriguez@hospital.com' THEN 15
        WHEN u.email = 'dr.garcia@hospital.com' THEN 12
        WHEN u.email = 'dr.lopez@hospital.com' THEN 8
        WHEN u.email = 'dr.hernandez@hospital.com' THEN 18
    END as years_experience,
    CASE 
        WHEN u.email = 'dr.martinez@hospital.com' THEN 150.00
        WHEN u.email = 'dr.rodriguez@hospital.com' THEN 200.00
        WHEN u.email = 'dr.garcia@hospital.com' THEN 180.00
        WHEN u.email = 'dr.lopez@hospital.com' THEN 120.00
        WHEN u.email = 'dr.hernandez@hospital.com' THEN 170.00
    END as consultation_fee,
    CASE 
        WHEN u.email = 'dr.martinez@hospital.com' THEN 'Consultorio 101, Primer Piso'
        WHEN u.email = 'dr.rodriguez@hospital.com' THEN 'Consultorio 205, Segundo Piso - Ala Cardiología'
        WHEN u.email = 'dr.garcia@hospital.com' THEN 'Consultorio 302, Tercer Piso - Ala Neurología'
        WHEN u.email = 'dr.lopez@hospital.com' THEN 'Consultorio 150, Primer Piso - Ala Pediatría'
        WHEN u.email = 'dr.hernandez@hospital.com' THEN 'Consultorio 220, Segundo Piso - Ala Ginecología'
    END as office_address,
    CASE 
        WHEN u.email = 'dr.martinez@hospital.com' THEN '{"lunes": "08:00-17:00", "martes": "08:00-17:00", "miercoles": "08:00-17:00", "jueves": "08:00-17:00", "viernes": "08:00-15:00"}'::jsonb
        WHEN u.email = 'dr.rodriguez@hospital.com' THEN '{"lunes": "09:00-16:00", "martes": "09:00-16:00", "miercoles": "09:00-16:00", "jueves": "09:00-16:00", "viernes": "09:00-14:00"}'::jsonb
        WHEN u.email = 'dr.garcia@hospital.com' THEN '{"lunes": "10:00-18:00", "martes": "10:00-18:00", "miercoles": "10:00-18:00", "jueves": "10:00-18:00", "viernes": "10:00-16:00"}'::jsonb
        WHEN u.email = 'dr.lopez@hospital.com' THEN '{"lunes": "07:00-15:00", "martes": "07:00-15:00", "miercoles": "07:00-15:00", "jueves": "07:00-15:00", "viernes": "07:00-13:00"}'::jsonb
        WHEN u.email = 'dr.hernandez@hospital.com' THEN '{"lunes": "08:00-16:00", "martes": "08:00-16:00", "miercoles": "08:00-16:00", "jueves": "08:00-16:00", "viernes": "08:00-14:00"}'::jsonb
    END as schedule
FROM users u 
WHERE u.role_id = 2;

-- Insertar usuario administrador
INSERT INTO users (id, email, password_hash, role_id, first_name, last_name, phone, is_active) VALUES 
(uuid_generate_v4(), 'admin@hospital.com', '$2b$10$rOzHqFPYk.N8K8qH8K8K8uJ1J1J1J1J1J1J1J1J1J1J1J1J1J1J1', 1, 'Administrador', 'Sistema', '+1-555-0001', true);

-- Insertar algunos pacientes de ejemplo
INSERT INTO users (id, email, password_hash, role_id, first_name, last_name, phone, is_active) VALUES 
(uuid_generate_v4(), 'paciente1@email.com', '$2b$10$rOzHqFPYk.N8K8qH8K8K8uJ1J1J1J1J1J1J1J1J1J1J1J1J1J1J1', 3, 'Juan', 'Pérez', '+1-555-1001', true),
(uuid_generate_v4(), 'paciente2@email.com', '$2b$10$rOzHqFPYk.N8K8qH8K8K8uJ1J1J1J1J1J1J1J1J1J1J1J1J1J1J1', 3, 'Laura', 'González', '+1-555-1002', true);

-- Insertar datos de pacientes
INSERT INTO patients (id, date_of_birth, gender, address, emergency_contact_name, emergency_contact_phone, blood_type) 
SELECT 
    u.id,
    CASE 
        WHEN u.email = 'paciente1@email.com' THEN '1985-05-15'::date
        WHEN u.email = 'paciente2@email.com' THEN '1990-08-22'::date
    END as date_of_birth,
    CASE 
        WHEN u.email = 'paciente1@email.com' THEN 'Masculino'
        WHEN u.email = 'paciente2@email.com' THEN 'Femenino'
    END as gender,
    CASE 
        WHEN u.email = 'paciente1@email.com' THEN 'Calle Principal 123, Ciudad'
        WHEN u.email = 'paciente2@email.com' THEN 'Avenida Central 456, Ciudad'
    END as address,
    CASE 
        WHEN u.email = 'paciente1@email.com' THEN 'María Pérez'
        WHEN u.email = 'paciente2@email.com' THEN 'Carlos González'
    END as emergency_contact_name,
    CASE 
        WHEN u.email = 'paciente1@email.com' THEN '+1-555-2001'
        WHEN u.email = 'paciente2@email.com' THEN '+1-555-2002'
    END as emergency_contact_phone,
    CASE 
        WHEN u.email = 'paciente1@email.com' THEN 'O+'
        WHEN u.email = 'paciente2@email.com' THEN 'A-'
    END as blood_type
FROM users u 
WHERE u.role_id = 3;