-- Sistema de Agendamiento de Citas Médicas Profesional

-- Tabla de Especialidades Médicas
CREATE TABLE IF NOT EXISTS specialties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50), -- Para iconos de UI
    color VARCHAR(7), -- Color hex para UI
    duration_minutes INTEGER DEFAULT 30, -- Duración típica de cita
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Horarios de Doctores
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id SERIAL PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty_id INTEGER NOT NULL REFERENCES specialties(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo, 6=Sábado
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doctor_id, specialty_id, day_of_week, start_time)
);

-- Tabla de Citas
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty_id INTEGER NOT NULL REFERENCES specialties(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    reason_for_visit TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(doctor_id, appointment_date, appointment_time)
);

-- Tabla de Notificaciones de Citas
CREATE TABLE IF NOT EXISTS appointment_notifications (
    id SERIAL PRIMARY KEY,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('reminder', 'confirmation', 'cancellation')),
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar especialidades médicas comunes
INSERT INTO specialties (name, description, icon, color, duration_minutes) VALUES
('Medicina General', 'Consulta médica general y chequeos preventivos', '🩺', '#4CAF50', 30),
('Cardiología', 'Especialista en enfermedades del corazón y sistema cardiovascular', '❤️', '#F44336', 45),
('Neurología', 'Especialista en enfermedades del sistema nervioso', '🧠', '#9C27B0', 45),
('Pediatría', 'Especialista en salud infantil', '👶', '#FF9800', 30),
('Ginecología', 'Especialista en salud femenina', '👩‍⚕️', '#E91E63', 45),
('Dermatología', 'Especialista en enfermedades de la piel', '🔬', '#00BCD4', 30),
('Traumatología', 'Especialista en huesos, músculos y articulaciones', '🦴', '#795548', 45),
('Oftalmología', 'Especialista en enfermedades de los ojos', '👁️', '#3F51B5', 30),
('Odontología', 'Especialista en salud dental', '🦷', '#2196F3', 45),
('Psiquiatría', 'Especialista en salud mental', '🧘‍♀️', '#673AB7', 60)
ON CONFLICT (name) DO NOTHING;

-- Asignar especialidades a doctores existentes
INSERT INTO doctor_schedules (doctor_id, specialty_id, day_of_week, start_time, end_time) 
SELECT 
    u.id,
    (CASE 
        WHEN u.email = 'dr.garcia@hospital.com' THEN 1 -- Medicina General
        WHEN u.email = 'dr.hernandez@hospital.com' THEN 2 -- Cardiología
        WHEN u.email = 'dr.lopez@hospital.com' THEN 5 -- Ginecología
        WHEN u.email = 'dr.martinez@hospital.com' THEN 3 -- Neurología
        WHEN u.email = 'dr.rodriguez@hospital.com' THEN 6 -- Dermatología
    END),
    generate_series(1, 5), -- Lunes a Viernes
    '08:00'::time,
    '17:00'::time
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE r.name = 'doctor'
ON CONFLICT DO NOTHING;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor_day ON doctor_schedules(doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_specialties_active ON specialties(is_active);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_specialties_updated_at BEFORE UPDATE ON specialties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctor_schedules_updated_at BEFORE UPDATE ON doctor_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();