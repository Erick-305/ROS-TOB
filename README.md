# 🏥 ROS-TOB - Sistema Ho

Sistema completo de gestión hospitalaria **ROS-TOB** con dashboard de pacientes, doctores y administradores.

## 🚀 Características

### ✅ **Dashboard de Paciente**
- Portal interactivo para pacientes
- Agendamiento de citas médicas
- Visualización de citas programadas
- Cancelación y reprogramación de citas
- Interfaz moderna y responsive

### ✅ **Dashboard de Doctor**
- Gestión de citas asignadas
- Visualización de pacientes
- Horarios y disponibilidad

### ✅ **Dashboard de Administrador**
- Gestión completa de usuarios
- Supervisión de todas las citas
- Reportes y estadísticas

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
├── frontend/          # Aplicación Angular
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
- **Email**: admin@hospital.com
- **Password**: admin123

### **Paciente**
- **Email**: test@test.com  
- **Password**: password123

### **Doctor**
- **Email**: dr.martinez@hospital.com
- **Password**: doctor123

## 📱 Funcionalidades del Dashboard de Paciente

1. **🏥 Portal Principal**
   - Bienvenida personalizada
   - Información del sistema

2. **📅 Agendamiento de Citas**
   - Selección de especialidad médica
   - Filtrado automático de doctores por especialidad
   - Selección de fecha y hora
   - Descripción del motivo de consulta

3. **📋 Gestión de Citas**
   - Visualización de citas programadas
   - Estado de las citas (programada, confirmada, completada)
   - Reprogramación de citas
   - Cancelación de citas

4. **🎨 Diseño Moderno**
   - Interfaz intuitiva y atractiva
   - Colores diferenciados por especialidad
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

## 📊 Especialidades Médicas Disponibles

- 🫀 **Cardiología** - Especialista en enfermedades del corazón
- 👩‍⚕️ **Ginecología** - Especialista en salud femenina  
- 🩺 **Medicina General** - Consulta médica general
- 🧠 **Neurología** - Especialista en sistema nervioso
- 👶 **Pediatría** - Especialista en salud infantil

## 🔐 Seguridad

- Autenticación JWT
- Encriptación de contraseñas con bcrypt
- Verificación de roles y permisos
- Validación de datos en frontend y backend

## 🐳 Docker

El proyecto incluye configuración completa de Docker:
- **Frontend**: Angular en contenedor optimizado
- **Backend**: Node.js con dependencias
- **Database**: PostgreSQL con datos iniciales

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

## 👨‍💻 Desarrollador

**Erick-305**
- GitHub: [@Erick-305](https://github.com/Erick-305)
- Repositorio: [ROS-TOB](https://github.com/Erick-305/ROS-TOB)

---

⭐ **¡Si te gusta este proyecto ROS-TOB, dale una estrella en GitHub!** ⭐

## 🎯 Acerca de ROS-TOB

**ROS-TOB** es un sistema hospitalario completo diseñado para optimizar la gestión médica y administrativa en centros de salud. El nombre refleja nuestra misión de crear un sistema robusto y eficiente para la atención hospitalaria moderna.

### 🚀 Características Principales de ROS-TOB:
- **R**obust - Sistema robusto y confiable
- **O**ptimized - Optimizado para rendimiento
- **S**ecure - Seguridad de datos garantizada
- **T**echnology - Tecnología moderna
- **O**rganized - Organización eficiente
- **B**est - Las mejores prácticas implementadas