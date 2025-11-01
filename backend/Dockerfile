# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
