#!/bin/bash
# Setup local PostgreSQL test database
# Run this after installing PostgreSQL locally

set -e

echo "🔧 Setting up local PostgreSQL test database..."

# Database credentials
DB_USER="postgres"
DB_NAME="aves_test"

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running!"
    echo "   Windows: Check Services → PostgreSQL should be running"
    echo "   WSL: Run 'sudo service postgresql start'"
    exit 1
fi

echo "✓ PostgreSQL is running"

# Drop database if it exists (for clean setup)
echo "📦 Creating database: $DB_NAME"
psql -U "$DB_USER" -h localhost -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
psql -U "$DB_USER" -h localhost -c "CREATE DATABASE $DB_NAME;"

echo "✓ Database created: $DB_NAME"

# Run migrations
echo "🔄 Running migrations..."
cd "$(dirname "$0")/../backend"
npx tsx ../scripts/migrate-test-schema.ts

echo ""
echo "✨ Local test database setup complete!"
echo ""
echo "Database: $DB_NAME"
echo "Host: localhost"
echo "Port: 5432"
echo "User: $DB_USER"
echo ""
echo "Run tests with: npm test"
