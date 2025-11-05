# Frontend Dockerfile - Aves React Application
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_API_VERSION
ARG VITE_ENABLE_UNSPLASH
ARG VITE_ENABLE_AI_EXERCISES
ARG VITE_ENABLE_VISION_AI
ARG VITE_DEBUG_MODE

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL \
    VITE_API_VERSION=$VITE_API_VERSION \
    VITE_ENABLE_UNSPLASH=$VITE_ENABLE_UNSPLASH \
    VITE_ENABLE_AI_EXERCISES=$VITE_ENABLE_AI_EXERCISES \
    VITE_ENABLE_VISION_AI=$VITE_ENABLE_VISION_AI \
    VITE_DEBUG_MODE=$VITE_DEBUG_MODE

# Build application
RUN npm run build

# Stage 3: Production (Nginx)
FROM nginx:alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN addgroup -g 101 -S nginx || true && \
    adduser -S nginx -u 101 -G nginx || true && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html

# Use non-root user
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
