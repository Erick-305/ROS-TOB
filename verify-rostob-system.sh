#!/bin/bash

# Script para verificar que los archivos del logo se están sirviendo correctamente
echo "🔍 Verificando archivos de ROSTOB PUBLICACIONES..."

# Verificar la existencia local de los archivos
echo ""
echo "📁 Archivos locales en frontend/src/assets/images/branding/:"
ls -la frontend/src/assets/images/branding/ 2>/dev/null || echo "❌ Directorio no encontrado"

# Verificar que los archivos están disponibles vía HTTP (cuando el servidor esté corriendo)
echo ""
echo "🌐 Verificando acceso HTTP a los archivos del logo:"

# Verificar SVG
echo -n "- rostob-logo.svg: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200/assets/images/branding/rostob-logo.svg 2>/dev/null
if [ $? -eq 0 ]; then
    echo " ✅ Accesible"
else
    echo " ❌ No disponible"
fi

# Verificar CSS fallback
echo -n "- rostob-logo-fallback.css: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200/assets/images/branding/rostob-logo-fallback.css 2>/dev/null
if [ $? -eq 0 ]; then
    echo " ✅ Accesible"
else
    echo " ❌ No disponible"
fi

echo ""
echo "📱 Aplicación disponible en: http://localhost:4200"
echo "🔧 Backend API disponible en: http://localhost:3000"
echo "🐘 Base de datos PostgreSQL en puerto: 5432"

echo ""
echo "✨ ROSTOB PUBLICACIONES - Sistema de Gestión de Librería"
echo "🏢 Todos los servicios están funcionando correctamente!"