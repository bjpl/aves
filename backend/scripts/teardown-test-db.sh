#!/bin/bash
# Teardown Test Database
# Usage: ./scripts/teardown-test-db.sh

echo "🧹 Stopping test database..."
docker-compose -f docker-compose.test.yml down -v

echo "✅ Test database stopped and removed"
