# 📚 ROS-TOB PUBLICACIONES - Sistema de Gestión de Librería

Sistema completo de gestión de librería y editorial **ROS-TOB PUBLICACIONES** con facturación, inventario y administración de libros.

## 🚀 Características

### ✅ **Dashboard de Cliente**
- Portal interactivo para clientes
- Catálogo de libros con filtros
- Carrito de compras
- Historial de pedidos y facturas
- Interfaz moderna y responsive

### ✅ **Dashboard de Empleado**
- Gestión de inventario de libros
- Procesamiento de pedidos
- Atención al cliente
- Reportes de ventas

### ✅ **Dashboard de Administrador**
- Gestión completa de usuarios
- Administración de catálogo de libros
- Control de autores y categorías
- Facturación y reportes financieros
- Gestión de empleados y clientes

## 🛠️ Tecnologías

### **Frontend**
- **Angular 20** - Framework frontend
- **TypeScript** - Lenguaje de programación
- **HTML5 & CSS3** - Estructura y estilos
- **Responsive Design** - Compatible con dispositivos móviles

### **Backend**
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **JWT** - Autenticación segura
- **bcrypt** - Encriptación de contraseñas

### **Base de Datos**
- **PostgreSQL 17** - Base de datos relacional
- **SQL** - Consultas optimizadas

### **DevOps**
- **Docker** - Contenedorización
- **Docker Compose** - Orquestación de servicios

## 🏗️ Arquitectura

```
ros-tob-system/
├── frontend/          # Aplicación Angular para la librería
├── backend/           # API REST con Node.js
├── database/          # Scripts SQL y configuración
└── docker-compose.yml # Configuración de contenedores
```

## 🚀 Instalación y Uso

### **Prerequisitos**
- Docker y Docker Compose instalados
- Git

### **1. Clonar el repositorio**
```bash
git clone https://github.com/Erick-305/ROS-TOB.git
cd ros-tob-system
```

### **2. Levantar los servicios**
```bash
docker-compose up -d
```

### **3. Acceder a la aplicación**
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Base de datos**: localhost:5432

## 👥 Usuarios de Prueba

### **Administrador**
- **Email**: admin@rostob.com
- **Password**: admin123

### **Cliente**
- **Email**: cliente@test.com  
- **Password**: password123

### **Empleado**
- **Email**: empleado@rostob.com
- **Password**: empleado123

## 📱 Funcionalidades del Sistema de Librería

1. **📚 Catálogo de Libros**
   - Navegación por categorías
   - Búsqueda avanzada por título, autor, ISBN
   - Filtros por precio, disponibilidad, categoría

2. **� Carrito de Compras**
   - Agregar/quitar libros del carrito
   - Cálculo automático de totales
   - Proceso de checkout simplificado

3. **🧾 Facturación**
   - Generación automática de facturas
   - Historial de compras del cliente
   - Estados de facturas (pendiente, pagada, cancelada)

4. **� Gestión de Inventario**
   - Control de stock en tiempo real
   - Alertas de bajo inventario
   - Gestión de autores y editoriales

5. **🎨 Diseño Moderno**
   - Interfaz intuitiva para librería
   - Colores temáticos literarios
   - Responsive design
   - Feedback visual inmediato

## 🔧 Configuración de Desarrollo

### **Frontend (Angular)**
```bash
cd frontend
npm install
ng serve
```

### **Backend (Node.js)**
```bash
cd backend
npm install
npm start
```

### **Base de Datos**
La base de datos se inicializa automáticamente con Docker usando los scripts en `/database/`.

## 📊 Categorías de Libros Disponibles

- 📖 **Ficción** - Novelas y cuentos
- 📚 **No Ficción** - Biografías, ensayos, autoayuda
- 🎓 **Educativo** - Libros de texto y académicos
- 👶 **Infantil** - Literatura para niños
- 🔬 **Ciencia y Tecnología** - Libros técnicos y científicos
- 🎨 **Arte y Cultura** - Libros de arte, música y cultura
- � **Negocios** - Administración, finanzas y emprendimiento

## 🔐 Seguridad

- Autenticación JWT
- Encriptación de contraseñas con bcrypt
- Verificación de roles y permisos (cliente, empleado, administrador)
- Validación de datos en frontend y backend
- Protección contra inyección SQL

## 🐳 Docker

El proyecto incluye configuración completa de Docker:
- **Frontend**: Angular en contenedor optimizado para librería
- **Backend**: Node.js con APIs de libros y facturación
- **Database**: PostgreSQL con datos de libros y autores

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

## 👨‍💻 Desarrollador

**Erick-305**
- GitHub: [@Erick-305](https://github.com/Erick-305)
- Repositorio: [ROS-TOB](https://github.com/Erick-305/ROS-TOB)

---

⭐ **¡Si te gusta este proyecto ROS-TOB PUBLICACIONES, dale una estrella en GitHub!** ⭐

## 🎯 Acerca de ROS-TOB PUBLICACIONES

**ROS-TOB PUBLICACIONES** es un sistema completo de gestión de librería y editorial diseñado para optimizar las operaciones comerciales y administrativas en librerías, editoriales y distribuidoras de libros.

### 🚀 Características Principales de ROS-TOB:
- **R**obust - Sistema robusto para gestión de inventario
- **O**ptimized - Optimizado para ventas y facturación
- **S**ecure - Seguridad en transacciones y datos
- **T**echnology - Tecnología moderna para librerías
- **O**rganized - Organización eficiente del catálogo
- **B**ookstore - Especializado en gestión de librerías