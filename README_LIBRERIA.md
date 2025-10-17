# 📚 ROSTOB PUBLICACIONES - Sistema de Gestión Completa

Un sistema completo de gestión para **ROSTOB PUBLICACIONES** desarrollado con **Angular** (Frontend), **Node.js/Express** (Backend) y **PostgreSQL** (Base de datos), todo containerizado con **Docker**.

## 🎯 Características Principales

### 👥 **Sistema de Roles**
- **🛡️ Administrador**: Gestión completa del sistema
- **👩‍💼 Empleado**: Ventas, inventario y atención al cliente  
- **📖 Cliente**: Catálogo, carrito y historial de compras

### 📊 **Funcionalidades**

#### **Para Clientes:**
- 🔍 Búsqueda avanzada en catálogo de libros
- 🛒 Carrito de compras con gestión de cantidades
- 🧾 Historial de compras y facturas
- 📱 Interfaz responsive y moderna

#### **Para Empleados:**
- 💰 Procesamiento de ventas y facturación
- 📦 Gestión de inventario y control de stock
- 👥 Administración de clientes
- 📊 Estadísticas de ventas en tiempo real

#### **Para Administradores:**
- 👤 Gestión completa de usuarios
- 📚 Administración del catálogo de libros
- 🏢 Gestión de editoriales y autores
- 🏷️ Organización por categorías
- 📈 Reportes y análisis avanzados

## 🛠️ **Stack Tecnológico**

### **Frontend**
- **Angular 18+** con componentes standalone
- **TypeScript** para tipado fuerte
- **CSS3** con efectos glassmorphism
- **Font Awesome** para iconografía

### **Backend**
- **Node.js** con **Express.js**
- **JWT** para autenticación segura
- **Bcrypt** para encriptación de contraseñas
- **Sequelize ORM** para manejo de base de datos

### **Base de Datos**
- **PostgreSQL 15+**
- Esquema optimizado con relaciones
- Índices para optimización de consultas
- Restricciones de integridad referencial

### **DevOps**
- **Docker & Docker Compose**
- Multi-stage builds optimizados
- Hot reload en desarrollo
- Variables de entorno configurables

## 🚀 **Instalación y Configuración**

### **Prerrequisitos**
```bash
- Docker >= 24.0
- Docker Compose >= 2.20
- Node.js >= 18 (opcional, para desarrollo)
```

### **🔧 Instalación con Docker (Recomendado)**

1. **Clonar el repositorio:**
```bash
git clone https://github.com/tu-usuario/bookstore-system.git
cd bookstore-system
```

2. **Configurar variables de entorno:**
```bash
# Crear archivo .env en la raíz del proyecto
cp .env.example .env

# Editar variables según tu entorno
nano .env
```

3. **Levantar todos los servicios:**
```bash
docker-compose up -d --build
```

4. **Verificar que los servicios estén ejecutándose:**
```bash
docker-compose ps
```

### **🌐 URLs de Acceso**
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Base de datos**: localhost:5432

### **👤 Usuarios de Prueba**
```bash
# Administrador
Email: admin@libreria.com
Password: admin123

# Empleado  
Email: empleado@libreria.com
Password: emp123

# Cliente
Email: cliente@libreria.com  
Password: client123
```

## 📁 **Estructura del Proyecto**

```
bookstore-system/
├── 🎨 frontend/          # Angular Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/           # Autenticación
│   │   │   ├── dashboards/     # Dashboards por rol
│   │   │   │   ├── customer-dashboard/
│   │   │   │   ├── employee-dashboard/  
│   │   │   │   └── admin-dashboard/
│   │   │   └── shared/         # Componentes compartidos
│   │   └── assets/             # Recursos estáticos
│   └── Dockerfile
├── ⚙️ backend/           # Node.js API
│   ├── routes/               # Rutas de la API
│   │   ├── auth.js          # Autenticación y registro
│   │   ├── books.js         # Gestión de libros
│   │   ├── customers.js     # Gestión de clientes
│   │   ├── invoices.js      # Sistema de facturación
│   │   ├── categories.js    # Categorías de libros
│   │   ├── authors.js       # Gestión de autores
│   │   └── publishers.js    # Gestión de editoriales
│   ├── config/              # Configuraciones
│   ├── services/            # Servicios (email, etc.)
│   └── Dockerfile
├── 💾 database/          # Scripts de base de datos
│   ├── bookstore_init.sql   # Schema inicial
│   └── migration scripts/
└── 🐳 docker-compose.yml # Orquestación de servicios
```

## 🔌 **API Endpoints**

### **🔐 Autenticación**
```http
POST /api/auth/register    # Registro de usuarios
POST /api/auth/login       # Inicio de sesión
POST /api/auth/logout      # Cerrar sesión
GET  /api/auth/profile     # Perfil del usuario
```

### **📚 Libros**
```http
GET    /api/books          # Listar libros (con filtros)
GET    /api/books/:id      # Obtener libro específico
POST   /api/books          # Crear libro (empleado/admin)
PUT    /api/books/:id      # Actualizar libro (empleado/admin)
DELETE /api/books/:id      # Eliminar libro (admin)
```

### **🧾 Facturación**
```http
GET    /api/invoices       # Listar facturas
GET    /api/invoices/:id   # Obtener factura específica
POST   /api/invoices       # Crear nueva factura
PUT    /api/invoices/:id   # Actualizar factura
GET    /api/invoices/stats # Estadísticas de ventas
```

### **👥 Clientes**
```http
GET    /api/customers      # Listar clientes (empleado/admin)
GET    /api/customers/:id  # Obtener cliente específico
POST   /api/customers      # Crear cliente (empleado/admin)
PUT    /api/customers/:id  # Actualizar cliente
DELETE /api/customers/:id  # Eliminar cliente (admin)
```

## 🔧 **Desarrollo**

### **🏃‍♂️ Ejecutar en modo desarrollo:**

```bash
# Backend (Puerto 3000)
cd backend
npm install
npm run dev

# Frontend (Puerto 4200)
cd frontend  
npm install
ng serve

# Base de datos (Puerto 5432)
docker run -d \
  --name bookstore-postgres \
  -e POSTGRES_DB=bookstore \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

### **🧪 Testing:**

```bash
# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
ng test

# E2E tests
ng e2e
```

## 📊 **Base de Datos**

### **📋 Tablas Principales:**
- **users**: Usuarios del sistema (clientes, empleados, admins)
- **books**: Catálogo de libros con información completa
- **authors**: Autores con biografías y libros asociados
- **categories**: Categorías para organización del catálogo
- **publishers**: Editoriales con información de contacto
- **customers**: Información específica de clientes
- **invoices**: Facturas de ventas con items detallados
- **inventory_movements**: Historial de movimientos de stock

### **🔗 Relaciones:**
- Users 1:1 Customers (para clientes)
- Books N:M Authors (libros pueden tener múltiples autores)
- Books N:M Categories (libros en múltiples categorías)
- Books N:1 Publishers (editorial por libro)
- Invoices 1:N Invoice_Items (items por factura)

## 🚀 **Despliegue en Producción**

### **🌊 Docker Swarm:**
```bash
docker swarm init
docker stack deploy -c docker-compose.prod.yml bookstore
```

### **☸️ Kubernetes:**
```bash
kubectl apply -f k8s/
kubectl get pods -n bookstore
```

### **☁️ Variables de Entorno de Producción:**
```env
NODE_ENV=production
DATABASE_URL=postgres://user:pass@host:5432/bookstore
JWT_SECRET=tu_jwt_secret_super_seguro
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
CORS_ORIGIN=https://tu-dominio.com
```

## 🔒 **Seguridad**

- ✅ Autenticación JWT con tokens seguros
- ✅ Contraseñas encriptadas con bcrypt
- ✅ Validación de entrada en todos los endpoints
- ✅ Control de acceso basado en roles (RBAC)
- ✅ Protección CORS configurada
- ✅ Validación de esquemas con Joi
- ✅ Rate limiting para prevenir abuse

## 📈 **Optimización y Performance**

- ⚡ Paginación en todas las listas
- ⚡ Índices de base de datos optimizados
- ⚡ Lazy loading en componentes Angular
- ⚡ Compresión gzip habilitada
- ⚡ Cache de consultas frecuentes
- ⚡ Optimización de imágenes automática

## 🐛 **Troubleshooting**

### **Problemas Comunes:**

**🔗 Error de conexión a la base de datos:**
```bash
# Verificar que PostgreSQL esté ejecutándose
docker ps | grep postgres

# Revisar logs
docker-compose logs database
```

**🚫 Error de permisos CORS:**
```bash
# Verificar configuración en backend/index.js
# Asegurar que CORS_ORIGIN esté configurado correctamente
```

**📦 Error de dependencias:**
```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 🤝 **Contribución**

1. Fork del proyecto
2. Crear branch de feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit de cambios (`git commit -am 'Add nueva característica'`)
4. Push al branch (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para detalles.

## 👨‍💻 **Autor**

**Tu Nombre**
- GitHub: [@Erick-305](https://github.com/tu-usuario)
- Email: ericks.mejia2005@gmail.com
- LinkedIn: [Tu Perfil](https://linkedin.com/in/tu-perfil)

## 🙏 **Agradecimientos**

- Angular Team por el excelente framework
- Express.js por la simplicidad del backend
- PostgreSQL por la robustez de la base de datos
- Docker por facilitar el despliegue
- Font Awesome por los iconos

---

⭐ **¡Dale una estrella al proyecto si te fue útil!** ⭐