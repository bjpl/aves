# Production stage using tsx runtime
FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (tsx and others needed at runtime)
RUN npm install

# Copy source code
COPY src ./src

# Create data directory for vector databases
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start the server using tsx
CMD ["npm", "start"]
