-- Base de datos para ROSTOB PUBLICACIONES - Sistema de gestión integral
-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear usuario para la aplicación
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'bookstore_user') THEN
      
      CREATE ROLE bookstore_user LOGIN PASSWORD 'bookstore_password';
   END IF;
END
$do$;

-- Otorgar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE rostob_publicaciones_db TO bookstore_user;
ALTER DATABASE rostob_publicaciones_db OWNER TO bookstore_user;

-- Tabla de usuarios (clientes, empleados, administradores)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(20) CHECK (role IN ('customer', 'employee', 'admin')) DEFAULT 'customer',
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de categorías de libros
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de autores
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    birth_date DATE,
    nationality VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de editoriales
CREATE TABLE publishers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de libros
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    description TEXT,
    publication_date DATE,
    pages INTEGER,
    language VARCHAR(50) DEFAULT 'Español',
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    category_id INTEGER REFERENCES categories(id),
    publisher_id INTEGER REFERENCES publishers(id),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla intermedia libro-autor (muchos a muchos)
CREATE TABLE book_authors (
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES authors(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, author_id)
);

-- Tabla de clientes (extiende información de usuarios customer)
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(100),
    tax_id VARCHAR(20),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    preferred_payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de facturas
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    employee_id INTEGER REFERENCES users(id),
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de detalles de factura
CREATE TABLE invoice_details (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    payment_date DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de inventario (movimientos de stock)
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES books(id),
    movement_type VARCHAR(20) CHECK (movement_type IN ('in', 'out', 'adjustment')) NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50), -- 'purchase', 'sale', 'adjustment', 'return'
    reference_id INTEGER, -- ID de la referencia (factura, compra, etc.)
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Insertar datos iniciales

-- Categorías de ejemplo
INSERT INTO categories (name, description) VALUES
('Ficción', 'Novelas y cuentos de ficción'),
('No Ficción', 'Libros de hechos reales, biografías, ensayos'),
('Ciencia y Tecnología', 'Libros sobre ciencias, tecnología e ingeniería'),
('Historia', 'Libros de historia mundial y local'),
('Literatura Clásica', 'Obras clásicas de la literatura universal'),
('Autoayuda', 'Libros de desarrollo personal y autoayuda'),
('Negocios', 'Libros sobre negocios, economía y finanzas'),
('Educación', 'Libros educativos y académicos'),
('Arte y Cultura', 'Libros sobre arte, música y cultura'),
('Infantil y Juvenil', 'Libros para niños y jóvenes');

-- Autores de ejemplo
INSERT INTO authors (name, bio, nationality) VALUES
('Gabriel García Márquez', 'Escritor colombiano, Premio Nobel de Literatura 1982', 'Colombiana'),
('Isabel Allende', 'Escritora chilena, una de las novelistas más leídas del mundo', 'Chilena'),
('Mario Vargas Llosa', 'Escritor peruano, Premio Nobel de Literatura 2010', 'Peruana'),
('Octavio Paz', 'Poeta y ensayista mexicano, Premio Nobel de Literatura 1990', 'Mexicana'),
('Jorge Luis Borges', 'Escritor argentino, maestro del cuento fantástico', 'Argentina');

-- Editoriales de ejemplo
INSERT INTO publishers (name, address, phone, email) VALUES
('Editorial Planeta', 'Calle de los Libros 123, Madrid', '+34 91 123 4567', 'info@planeta.com'),
('Penguin Random House', 'Avenida de los Escritores 456, Barcelona', '+34 93 987 6543', 'contacto@penguinrandomhouse.com'),
('Editorial Sudamericana', 'Boulevard Literario 789, Buenos Aires', '+54 11 5555 1234', 'ventas@sudamericana.com'),
('Fondo de Cultura Económica', 'Calle Universidad 321, Ciudad de México', '+52 55 1234 5678', 'info@fce.com.mx');

-- Usuario administrador por defecto
INSERT INTO users (name, email, password, role, is_verified) VALUES
('Administrador', 'admin@bookstore.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', true);

-- Usuario empleado de ejemplo
INSERT INTO users (name, email, password, phone, role, is_verified) VALUES
('Juan Pérez', 'empleado@bookstore.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '555-1234', 'employee', true);

-- Cliente de ejemplo
INSERT INTO users (name, email, password, phone, address, role, is_verified) VALUES
('María González', 'cliente@email.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '555-5678', 'Calle Principal 456', 'customer', true);

-- Información adicional del cliente
INSERT INTO customers (user_id, company_name, credit_limit, discount_percentage) VALUES
(3, 'Librería El Saber', 5000.00, 5.0);

-- Libros de ejemplo
INSERT INTO books (title, isbn, description, publication_date, pages, price, stock_quantity, category_id, publisher_id) VALUES
('Cien Años de Soledad', '978-84-376-0494-7', 'Obra maestra del realismo mágico', '1967-06-05', 417, 25.99, 50, 1, 1),
('La Casa de los Espíritus', '978-84-204-8360-5', 'Primera novela de Isabel Allende', '1982-10-01', 448, 22.50, 30, 1, 2),
('Conversación en La Catedral', '978-84-204-2848-3', 'Novela política de Mario Vargas Llosa', '1969-01-01', 720, 28.75, 25, 1, 3),
('El Laberinto de la Soledad', '978-968-16-0123-4', 'Ensayo sobre la identidad mexicana', '1950-01-01', 200, 18.99, 40, 2, 4),
('Ficciones', '978-84-376-2187-6', 'Colección de cuentos fantásticos', '1944-01-01', 180, 20.00, 35, 5, 1);

-- Relacionar libros con autores
INSERT INTO book_authors (book_id, author_id) VALUES
(1, 1), -- Cien Años de Soledad - García Márquez
(2, 2), -- La Casa de los Espíritus - Isabel Allende
(3, 3), -- Conversación en La Catedral - Vargas Llosa
(4, 4), -- El Laberinto de la Soledad - Octavio Paz
(5, 5); -- Ficciones - Borges

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_inventory_movements_book ON inventory_movements(book_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at);

-- Crear vistas útiles
CREATE VIEW book_details AS
SELECT 
    b.id,
    b.title,
    b.isbn,
    b.description,
    b.publication_date,
    b.pages,
    b.language,
    b.price,
    b.stock_quantity,
    c.name as category_name,
    p.name as publisher_name,
    STRING_AGG(a.name, ', ') as authors
FROM books b
LEFT JOIN categories c ON b.category_id = c.id
LEFT JOIN publishers p ON b.publisher_id = p.id
LEFT JOIN book_authors ba ON b.id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.id
GROUP BY b.id, b.title, b.isbn, b.description, b.publication_date, 
         b.pages, b.language, b.price, b.stock_quantity, c.name, p.name;

CREATE VIEW invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.status,
    u.name as customer_name,
    c.company_name,
    COUNT(id_det.id) as total_items
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN invoice_details id_det ON i.id = id_det.invoice_id
GROUP BY i.id, i.invoice_number, i.invoice_date, i.due_date, 
         i.total_amount, i.status, u.name, c.company_name;