# Usar imagen base de Node.js 20 (requerido por Angular CLI 20)
FROM node:20-alpine

# Instalar Angular CLI globalmente
RUN npm install -g @angular/cli@20

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Exponer puerto 4200 (puerto por defecto de Angular dev server)
EXPOSE 4200

# Comando para ejecutar Angular en modo desarrollo
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]