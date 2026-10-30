# syntax=docker/dockerfile:1
# --- сборка ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Адреса API зашиваются в сборку Vite на этапе build.
ARG VITE_API_URL=http://localhost:8000/api
ARG VITE_MEDIA_URL=http://localhost:8000
ARG VITE_DJANGO_ADMIN_URL=http://localhost:8000/admin/
ENV VITE_API_URL=$VITE_API_URL VITE_MEDIA_URL=$VITE_MEDIA_URL VITE_DJANGO_ADMIN_URL=$VITE_DJANGO_ADMIN_URL
RUN npm run build

# --- раздача статики ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
