-- Rename the reason column to reason_for_visit
ALTER TABLE appointments RENAME COLUMN reason TO reason_for_visit;

-- Grant permissions to hospital_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hospital_user;