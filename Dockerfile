FROM node:22-alpine

# Native better-sqlite3 module requires build tooling on Alpine.
RUN apk add --no-cache python3 make g++

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV INHUBFLOW_DB_PATH=/app/data/social-selling.db

# Copiar definiciones de dependencias
COPY package*.json ./

# Instalar todas las dependencias incluyendo devDependencies (TypeScript, Tailwind, loaders)
# --include=dev garantiza que se instalen aunque Coolify inyecte NODE_ENV=production
RUN npm ci --include=dev

# Copiar el codigo fuente completo
COPY . .

# Soportar BASE_PATH en buildtime para rutas como /dashboard
ARG BASE_PATH=""
ARG NEXT_PUBLIC_BASE_PATH=""
ENV BASE_PATH=$BASE_PATH
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NODE_ENV=production

# Compilar la aplicacion Next.js y eliminar inmediatamente la cache pesada de compilacion
RUN npm run build && \
    rm -rf /app/.next/cache && \
    npm cache clean --force

# Preparar el volumen SQLite y permisos para el usuario del contenedor en runtime
# NOTA: Solo se otorga permisos a /app/data para evitar que Docker duplique /app/.next en una nueva capa
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

# Variables de runtime
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["npm", "start"]
