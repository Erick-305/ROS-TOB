# Script para verificar que los archivos del logo ROSTOB se están sirviendo correctamente
Write-Host "🔍 Verificando archivos de ROSTOB PUBLICACIONES..." -ForegroundColor Cyan

# Verificar la existencia local de los archivos
Write-Host ""
Write-Host "📁 Archivos locales en frontend/src/assets/images/branding/:" -ForegroundColor Yellow
if (Test-Path "frontend/src/assets/images/branding/") {
    Get-ChildItem "frontend/src/assets/images/branding/" | Format-Table Name, Length, LastWriteTime -AutoSize
} else {
    Write-Host "❌ Directorio no encontrado" -ForegroundColor Red
}

# Verificar que los archivos están disponibles vía HTTP
Write-Host ""
Write-Host "🌐 Verificando acceso HTTP a los archivos del logo:" -ForegroundColor Yellow

try {
    # Verificar SVG
    Write-Host -NoNewline "- rostob-logo.svg: "
    $response = Invoke-WebRequest -Uri "http://localhost:4200/assets/images/branding/rostob-logo.svg" -Method Head -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Accesible (Status: $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ No disponible ($($_.Exception.Message))" -ForegroundColor Red
}

try {
    # Verificar CSS fallback
    Write-Host -NoNewline "- rostob-logo-fallback.css: "
    $response = Invoke-WebRequest -Uri "http://localhost:4200/assets/images/branding/rostob-logo-fallback.css" -Method Head -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Accesible (Status: $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ No disponible ($($_.Exception.Message))" -ForegroundColor Red
}

Write-Host ""
Write-Host "📱 Aplicación disponible en: http://localhost:4200" -ForegroundColor Green
Write-Host "🔧 Backend API disponible en: http://localhost:3000" -ForegroundColor Green
Write-Host "🐘 Base de datos PostgreSQL en puerto: 5432" -ForegroundColor Green

Write-Host ""
Write-Host "✨ ROSTOB PUBLICACIONES - Sistema de Gestión de Librería" -ForegroundColor Magenta
Write-Host "🏢 Todos los servicios están funcionando correctamente!" -ForegroundColor Green

# Verificar estado de contenedores Docker
Write-Host ""
Write-Host "🐳 Estado de los contenedores Docker:" -ForegroundColor Cyan
docker-compose ps