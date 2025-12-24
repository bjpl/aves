#!/bin/bash
# Setup Test Database for Jest Integration Tests
# Usage: ./scripts/setup-test-db.sh

set -e

echo "🐘 Starting test database setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start the test database container
echo "📦 Starting test database container..."
docker-compose -f docker-compose.test.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker exec aves-test-db pg_isready -U postgres -d aves_test > /dev/null 2>&1; do
    sleep 1
done
echo "✅ Database is ready!"

# Copy local test env if it exists
if [ -f .env.test.local ]; then
    echo "📋 Using .env.test.local configuration"
    cp .env.test.local .env.test
fi

# Run migrations
echo "🔄 Running database migrations..."
npm run migrate

echo ""
echo "✅ Test database setup complete!"
echo ""
echo "To run tests with the local database:"
echo "  npm test"
echo ""
echo "To stop the test database:"
echo "  docker-compose -f docker-compose.test.yml down"
echo ""
