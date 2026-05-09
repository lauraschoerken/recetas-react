# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_BASE vacío → las llamadas a la API usan rutas relativas (/api/...)
# nginx del stage siguiente hace el proxy al contenedor del backend
ENV VITE_API_BASE=""
ENV VITE_API_MODE="api"
ENV VITE_APP_NAME="MealAgenda"

RUN npm run build

# ── Stage 2: Serve with nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
