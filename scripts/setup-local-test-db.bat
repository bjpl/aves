@echo off
REM Setup local PostgreSQL test database (Windows)
REM Run this after installing PostgreSQL locally

echo Setting up local PostgreSQL test database...

set DB_USER=postgres
set DB_NAME=aves_test
set PGPASSWORD=postgres

REM Check if PostgreSQL is accessible
pg_isready -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo PostgreSQL is not running!
    echo Check Services - PostgreSQL should be running
    exit /b 1
)

echo PostgreSQL is running

REM Drop and create database
echo Creating database: %DB_NAME%
psql -U %DB_USER% -h localhost -c "DROP DATABASE IF EXISTS %DB_NAME%;" 2>nul
psql -U %DB_USER% -h localhost -c "CREATE DATABASE %DB_NAME%;"

echo Database created: %DB_NAME%

REM Run migrations
echo Running migrations...
cd backend
call npx tsx ..\scripts\migrate-test-schema.ts

echo.
echo Local test database setup complete!
echo.
echo Database: %DB_NAME%
echo Host: localhost
echo Port: 5432
echo User: %DB_USER%
echo.
echo Run tests with: npm test
