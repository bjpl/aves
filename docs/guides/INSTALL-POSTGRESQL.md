# Installing PostgreSQL for Local Testing

## Quick Installation (Windows)

### Option 1: Using Chocolatey (Recommended - Fastest)

If you have Chocolatey installed:

```bash
# Install PostgreSQL
choco install postgresql

# Verify installation
psql --version
```

### Option 2: Direct Download (If no Chocolatey)

1. **Download PostgreSQL:**
   - Go to: https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Choose PostgreSQL 16 (latest stable)

2. **Run the Installer:**
   - Click through the installer
   - **Important settings:**
     - Port: `5432` (default)
     - Password: Set to `postgres` (for local dev simplicity)
     - Install pgAdmin 4: Yes (optional, useful GUI)
     - Install Command Line Tools: **YES** (required)

3. **Add to PATH (if not automatic):**
   - The installer usually does this
   - If `psql --version` doesn't work after install:
     - Add to PATH: `C:\Program Files\PostgreSQL\16\bin`
     - Restart your terminal

### Option 3: Using WSL/Ubuntu (If you prefer Linux)

```bash
# In WSL terminal
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start

# Set postgres user password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

## Verify Installation

After installation, verify it works:

```bash
# Check version
psql --version
# Should show: psql (PostgreSQL) 16.x

# Try connecting (will prompt for password: postgres)
psql -U postgres -h localhost
# If successful, you'll see: postgres=#
# Type \q to quit
```

## Default Credentials

After installation, the default setup is:
- **Host:** localhost
- **Port:** 5432
- **User:** postgres
- **Password:** postgres (or what you set during install)
- **Database:** postgres (default)

## Next Steps

Once PostgreSQL is installed and verified:

1. I'll update your `.env.test` to use local PostgreSQL
2. Create the `aves_test` database
3. Run migrations
4. Run tests!

**Let me know when PostgreSQL is installed and I'll continue with the setup!**

## Troubleshooting

### "psql: command not found"
- PostgreSQL bin directory not in PATH
- Restart terminal after installation
- Manually add to PATH: `C:\Program Files\PostgreSQL\16\bin`

### "connection refused"
- PostgreSQL service not running
- Windows: Check Services → PostgreSQL should be running
- WSL: Run `sudo service postgresql start`

### "password authentication failed"
- Password might not be 'postgres'
- Reset it:
  ```bash
  # As admin
  psql -U postgres
  ALTER USER postgres PASSWORD 'postgres';
  ```
