#!/bin/bash
# Aves User Testing - Quick Setup Script
# This script automates the setup process for local user testing

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Aves - User Testing Environment Setup                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step counter
STEP=1

function print_step() {
    echo ""
    echo -e "${BLUE}[Step $STEP/$TOTAL_STEPS]${NC} $1"
    STEP=$((STEP + 1))
}

function print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

function print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

function print_error() {
    echo -e "${RED}✗${NC} $1"
}

TOTAL_STEPS=8

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
print_step "Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION installed"
else
    print_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION installed"
else
    print_error "npm not found. Please install npm 9+"
    exit 1
fi

# Check PostgreSQL (optional)
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version)
    print_success "PostgreSQL installed: $PSQL_VERSION"
    HAS_POSTGRES=true
else
    print_warning "PostgreSQL not found - will use SQLite instead (recommended for testing)"
    HAS_POSTGRES=false
fi

# =============================================================================
# Step 2: Install Dependencies
# =============================================================================
print_step "Installing dependencies..."

if [ -d "node_modules" ]; then
    print_success "Dependencies already installed (skipping)"
else
    npm install --loglevel=error
    print_success "Dependencies installed successfully"
fi

# =============================================================================
# Step 3: Configure Backend
# =============================================================================
print_step "Configuring backend environment..."

if [ -f "backend/.env" ]; then
    print_success "Backend .env already exists (skipping)"
else
    cp backend/.env.example backend/.env
    print_success "Created backend/.env from template"

    # Update to use SQLite if no PostgreSQL
    if [ "$HAS_POSTGRES" = false ]; then
        # Comment out PostgreSQL settings and enable SQLite
        sed -i.bak 's/^DB_HOST=/#DB_HOST=/g' backend/.env
        sed -i.bak 's/^DB_PORT=/#DB_PORT=/g' backend/.env
        sed -i.bak 's/^DB_NAME=/#DB_NAME=/g' backend/.env
        sed -i.bak 's/^DB_USER=/#DB_USER=/g' backend/.env
        sed -i.bak 's/^DB_PASSWORD=/#DB_PASSWORD=/g' backend/.env
        echo "DATABASE_URL=sqlite:./aves-test.db" >> backend/.env
        print_success "Configured to use SQLite database"
    fi
fi

# =============================================================================
# Step 4: Configure Frontend
# =============================================================================
print_step "Configuring frontend environment..."

if [ -f "frontend/.env" ]; then
    print_success "Frontend .env already exists (skipping)"
else
    cp frontend/.env.example frontend/.env
    # Update API URL to correct port
    sed -i.bak 's|VITE_API_URL=.*|VITE_API_URL=http://localhost:3001|g' frontend/.env
    print_success "Created frontend/.env"
fi

# =============================================================================
# Step 5: Check Anthropic API Key
# =============================================================================
print_step "Checking AI configuration..."

if grep -q "YOUR_ANTHROPIC_API_KEY_HERE" backend/.env || grep -q "your_anthropic_api_key_here" backend/.env; then
    print_warning "Anthropic API key not configured!"
    echo ""
    echo "  To test AI features (annotations, exercises), you need an API key:"
    echo "  1. Get a key from: https://console.anthropic.com/"
    echo "  2. Edit backend/.env"
    echo "  3. Replace ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE"
    echo "     with your actual key (starts with sk-ant-)"
    echo ""
    echo "  The app will run without it, but AI features will be disabled."
    echo ""
else
    print_success "Anthropic API key configured"
fi

# =============================================================================
# Step 6: Database Setup
# =============================================================================
print_step "Setting up database..."

cd backend

# Run migrations
if npm run migrate > /dev/null 2>&1; then
    print_success "Database migrations completed"
else
    print_warning "Database migrations failed (may need manual setup)"
fi

cd ..

# =============================================================================
# Step 7: Verify Setup
# =============================================================================
print_step "Verifying configuration..."

# Check if .env files exist
if [ -f "backend/.env" ] && [ -f "frontend/.env" ]; then
    print_success "Environment files configured"
else
    print_error "Environment files missing"
    exit 1
fi

# =============================================================================
# Step 8: Summary
# =============================================================================
print_step "Setup complete!"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Setup Summary                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_success "Dependencies: Installed"
print_success "Backend config: backend/.env"
print_success "Frontend config: frontend/.env"

if [ "$HAS_POSTGRES" = true ]; then
    print_success "Database: PostgreSQL"
else
    print_success "Database: SQLite (aves-test.db)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Next Steps                                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Configure Anthropic API Key (required for AI features):"
echo "   ${YELLOW}Edit backend/.env and set ANTHROPIC_API_KEY${NC}"
echo ""
echo "2. Start development servers:"
echo "   ${BLUE}npm run dev${NC}"
echo ""
echo "3. Open your browser:"
echo "   Frontend: ${BLUE}http://localhost:5173${NC}"
echo "   Backend:  ${BLUE}http://localhost:3001/api/health${NC}"
echo ""
echo "4. Begin testing:"
echo "   ${BLUE}See docs/USER_TESTING_GUIDE.md${NC}"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Testing Documentation                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  📖 docs/USER_TESTING_GUIDE.md    - Complete testing guide"
echo "  📖 docs/TESTING_SCRIPT.md        - Step-by-step test script"
echo "  📖 docs/BUG_REPORT_TEMPLATE.md   - Bug tracking template"
echo "  📖 docs/LOCAL_TESTING_SETUP.md   - Detailed setup instructions"
echo ""
echo "Happy testing! 🚀"
echo ""
