#!/bin/bash
#
# Bounding Box Format Migration Script
# Purpose: Safely execute the bounding box normalization migration
# Created: 2025-10-17
#

set -e  # Exit on error

echo "========================================="
echo "Bounding Box Format Migration"
echo "========================================="
echo ""

# Load environment variables
if [ -f ../.env ]; then
    echo "✓ Loading environment from ../.env"
    export $(grep -v '^#' ../.env | xargs)
else
    echo "✗ Error: ../.env file not found"
    echo "  Please ensure you're running this from backend/scripts/"
    exit 1
fi

# Check required environment variables
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "✗ Error: Missing required database environment variables"
    echo "  Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
    exit 1
fi

echo "✓ Database configuration loaded"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Confirm execution
read -p "⚠️  This will normalize ALL bounding boxes in the database. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled by user"
    exit 0
fi

echo ""
echo "Starting migration..."
echo ""

# Build connection string
PGPASSWORD=$DB_PASSWORD psql \
    -h "$DB_HOST" \
    -p "${DB_PORT:-5432}" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 \
    -f ../src/database/migrations/012_normalize_bounding_box_format.sql

echo ""
echo "========================================="
echo "✓ Migration completed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Verify annotations render correctly in the application"
echo "2. Test annotation creation and editing workflows"
echo "3. After 24-48 hours of validation, drop backup tables:"
echo "   DROP TABLE annotations_bounding_box_backup;"
echo "   DROP TABLE ai_annotation_items_bounding_box_backup;"
echo ""
