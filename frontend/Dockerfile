# Multi-stage build for production Vite frontend

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=http://localhost:3001
ARG VITE_API_VERSION=v1
ARG VITE_ENABLE_UNSPLASH=false
ARG VITE_ENABLE_AI_EXERCISES=true
ARG VITE_ENABLE_VISION_AI=true
ARG VITE_DEBUG_MODE=false

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL \
    VITE_API_VERSION=$VITE_API_VERSION \
    VITE_ENABLE_UNSPLASH=$VITE_ENABLE_UNSPLASH \
    VITE_ENABLE_AI_EXERCISES=$VITE_ENABLE_AI_EXERCISES \
    VITE_ENABLE_VISION_AI=$VITE_ENABLE_VISION_AI \
    VITE_DEBUG_MODE=$VITE_DEBUG_MODE

# Build the Vite application
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx user (if not exists) and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html

# Create nginx config for SPA routing
RUN echo 'server { \
    listen 8080; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass '"$VITE_API_URL"'; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json; \
}' > /etc/nginx/conf.d/default.conf

# Use non-root user
USER nginx

# Expose frontend port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
