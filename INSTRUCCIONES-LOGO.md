# 📸 Instrucciones para Agregar el Logo ROSTOB PUBLICACIONES

## 🎯 Pasos para Agregar la Imagen del Logo

### 1. Ubicación del Archivo
- **Directorio destino**: `frontend/src/assets/images/branding/`
- **Nombre del archivo**: `rostob-logo.jpg`
- **Ruta completa**: `frontend/src/assets/images/branding/rostob-logo.jpg`

### 2. Cómo Agregar la Imagen
1. ✅ **COMPLETADO** - Ya agregaste la imagen como `rostob-logo.jpg`
2. ✅ **COMPLETADO** - Archivo ubicado en: `c:\Users\Victus\Desktop\proyectomateria\hospital-system\frontend\src\assets\images\branding\`
3. ✅ **COMPLETADO** - Sistema actualizado para usar formato JPEG

### 3. Verificar la Implementación
Después de agregar la imagen, el sistema ya está configurado para usarla:
- ✅ El componente `RostobLogoComponent` ya está actualizado
- ✅ Todos los componentes (login, register, dashboards) ya usan el nuevo componente
- ✅ La ruta está configurada como `/assets/images/branding/rostob-logo.jpg`

### 4. Reconstruir el Sistema
Una vez que agregues la imagen, ejecuta:
```bash
cd c:\Users\Victus\Desktop\proyectomateria\hospital-system
docker-compose up --build -d
```

### 5. Formatos Soportados
- **Recomendado**: PNG (fondo transparente)
- **Alternativo**: JPG, SVG
- **Tamaño sugerido**: 400x160 píxeles o similar

### 6. Verificar Funcionamiento
Después de reconstruir, ve a:
- **Login**: http://localhost:4200
- **Register**: http://localhost:4200/register

El logo debería aparecer en la parte superior de estas páginas.

---
**Nota**: El archivo placeholder que creé será reemplazado por tu imagen real cuando la copies a la carpeta correcta.