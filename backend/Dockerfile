# Usar imagen base que incluya Node.js
FROM node:18-bullseye

# Instalar PostgreSQL client y herramientas necesarias
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos del backend
COPY package*.json ./
RUN npm install

# Copiar código fuente
COPY . .

# Dar permisos de ejecución al script de espera
COPY wait-for-it.sh /wait-for-it.sh
RUN sed -i 's/\r$//' /wait-for-it.sh && chmod +x /wait-for-it.sh

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["/bin/bash", "-c", "/wait-for-it.sh postgres && npm run dev"]