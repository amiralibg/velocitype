# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies (cached unless lockfile changes)
COPY package.json package-lock.json ./
RUN npm ci

# Build the static site
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS runtime

# SPA-friendly nginx config (history fallback + asset caching)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Serve the compiled assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
