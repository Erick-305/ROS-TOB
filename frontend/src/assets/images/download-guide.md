# 📥 Guía de Descarga de Imágenes

## 🎯 URLs Directas para Descargar:

### **1. Logo/Header (hospital-header.jpg)**
```
https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80
```

### **2. Fondo Login (login-bg.jpg)**
```
https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80
```

### **3. Doctor Principal (doctor-male.jpg)**
```
https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&q=80
```

### **4. Doctora Principal (doctor-female.jpg)**
```
https://images.unsplash.com/photo-1594824395176-a8feb81c7d57?w=600&q=80
```

### **5. Estetoscopio (stethoscope.jpg)**
```
https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&q=80
```

### **6. Cruz Médica (medical-cross.jpg)**
```
https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80
```

### **7. Dashboard Background (dashboard-bg.jpg)**
```
https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=1200&q=80
```

### **8. Hospital Header (hospital-header.jpg) - ACTUALIZADA**
```
https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&q=80
```

### **9. Doctora (doctor-female.jpg) - ACTUALIZADA**
```
https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80
```

### **URLS ALTERNATIVAS (Por si alguna falla):**

### **Hospital Interior (hospital-header-alt.jpg)**
```
https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800&q=80
```

### **Doctora Alternativa (doctor-female-alt.jpg)**
```
https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80
```

### **Equipo Médico (medical-team.jpg)**
```
https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80
```

## 📁 Donde Guardar Cada Imagen:

```
frontend/src/assets/images/
├── backgrounds/
│   ├── login-bg.jpg
│   ├── dashboard-bg.jpg
│   └── hospital-header.jpg
├── medical/
│   ├── doctor-male.jpg
│   ├── doctor-female.jpg
│   ├── stethoscope.jpg
│   └── medical-cross.jpg
├── ui/
│   ├── logo.png
│   └── hospital-exterior.jpg
└── icons/
    └── favicon.ico
```

## 🔧 Cómo Descargar:

1. **Copia la URL** de la imagen que quieres
2. **Pégala en tu navegador** y presiona Enter
3. **Click derecho** en la imagen → "Guardar imagen como..."
4. **Guárdala** en la carpeta correspondiente con el nombre sugerido

## 📱 Tamaños Recomendados:

- **Backgrounds**: 1200x800px o superiores
- **Logos**: 400x400px máximo
- **Doctores/Personal**: 600x600px
- **Iconos**: 64x64px, 128x128px, 256x256px

## 🎨 Aplicación en el Código:

Una vez descargadas, las puedes usar así:

```css
/* En tu CSS */
.login-container {
  background-image: url('../../assets/images/backgrounds/login-bg.jpg');
}

.doctor-card {
  background-image: url('../../assets/images/medical/doctor-male.jpg');
}
```

```html
<!-- En tu HTML -->
<img src="assets/images/medical/doctor-female.jpg" alt="Doctora">
<div class="logo">
  <img src="assets/images/ui/logo.png" alt="Hospital Logo">
</div>
```