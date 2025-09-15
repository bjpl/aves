# Aves Setup Guide

## 🚀 Quick Start

This guide will help you get Aves running on your local machine for development and testing purposes.

## 📋 Prerequisites

### Required Software
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **PostgreSQL** (v14.0 or higher)
- **Git** (for version control)

### Optional Services
- **Unsplash Account** (for bird image sourcing)
  - Sign up at [unsplash.com/developers](https://unsplash.com/developers)
  - Create an application to get API keys

## 🔧 Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/bjpl/aves.git
cd aves
```

### 2. Install Dependencies

```bash
# Install all dependencies (frontend + backend)
npm install

# Or install separately
cd frontend && npm install
cd ../backend && npm install
```

### 3. Database Setup

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE aves;

# Create user (optional)
CREATE USER aves_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE aves TO aves_user;

# Exit psql
\q
```

#### Run Migrations

```bash
# From project root
npm run db:migrate

# Or manually
psql -U postgres -d aves -f database/schemas/001_initial_schema.sql
psql -U postgres -d aves -f database/schemas/002_vocabulary_disclosure.sql
psql -U postgres -d aves -f database/schemas/003_exercises.sql
psql -U postgres -d aves -f database/schemas/004_species_taxonomy.sql
psql -U postgres -d aves -f database/schemas/005_image_management.sql
```

### 4. Environment Configuration

Create `.env` files in both frontend and backend directories:

#### Backend Environment (`backend/.env`)

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://aves_user:your_secure_password@localhost:5432/aves
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aves
DB_USER=aves_user
DB_PASSWORD=your_secure_password

# Session Configuration
SESSION_SECRET=your_session_secret_here_change_in_production

# External APIs
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
UNSPLASH_SECRET_KEY=your_unsplash_secret_key

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Environment (`frontend/.env`)

```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_API_VERSION=v1

# Feature Flags
VITE_ENABLE_UNSPLASH=true
VITE_ENABLE_ANALYTICS=false

# Development
VITE_DEBUG_MODE=true
```

### 5. Seed Sample Data (Optional)

```bash
# Run seed script
npm run db:seed

# Or use the SQL file
psql -U postgres -d aves -f database/seeds/sample_data.sql
```

## 🏃 Running the Application

### Development Mode

#### Option 1: Run Both Frontend and Backend

```bash
# From project root
npm run dev
```

#### Option 2: Run Separately

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Production Mode

```bash
# Build both projects
npm run build

# Start production server
npm run start
```

## 🧪 Testing

### Run All Tests

```bash
npm run test
```

### Run Specific Test Suites

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## 🐛 Common Issues & Solutions

### Issue: PostgreSQL Connection Failed

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
1. Ensure PostgreSQL is running: `sudo service postgresql start`
2. Check PostgreSQL is listening on correct port: `sudo netstat -plnt | grep 5432`
3. Verify credentials in `.env` file

### Issue: Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
1. Find process using port: `lsof -i :3000`
2. Kill process: `kill -9 <PID>`
3. Or change port in `.env` file

### Issue: Unsplash API Rate Limit

**Error**: `429 Too Many Requests`

**Solution**:
1. Check rate limit status in response headers
2. Implement caching for frequently accessed images
3. Use fallback images when rate limited

### Issue: TypeScript Compilation Errors

**Error**: `Cannot find module or type definitions`

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild TypeScript
npm run build:types
```

## 📱 Browser Support

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

Mobile browsers:
- iOS Safari 14+
- Chrome Mobile 90+

## 🔍 Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "christian-kohler.npm-intellisense",
    "formulahendry.auto-rename-tag"
  ]
}
```

### Database Management

- **pgAdmin**: GUI for PostgreSQL
- **DBeaver**: Universal database tool
- **TablePlus**: Modern database GUI

### API Testing

- **Postman**: API development platform
- **Insomnia**: REST client
- **Thunder Client**: VS Code extension

## 🚢 Deployment

### Docker Deployment

```dockerfile
# Dockerfile included in project
docker build -t aves .
docker run -p 3000:3000 aves
```

### Platform Deployment Guides

- **Vercel**: Frontend deployment ([guide](docs/deployment/vercel.md))
- **Railway**: Full-stack deployment ([guide](docs/deployment/railway.md))
- **Heroku**: Backend + database ([guide](docs/deployment/heroku.md))

## 📊 Monitoring

### Development Monitoring

```bash
# Watch for file changes
npm run dev:watch

# Monitor performance
npm run perf:monitor

# Check bundle size
npm run analyze
```

### Production Monitoring

- Set up error tracking (Sentry)
- Configure performance monitoring (New Relic)
- Enable application logs (Winston)

## 🔐 Security Checklist

- [ ] Change default session secret
- [ ] Use strong database passwords
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Sanitize user inputs
- [ ] Keep dependencies updated

## 📚 Additional Resources

- [Project Documentation](docs/)
- [API Reference](docs/api/)
- [Contributing Guide](CONTRIBUTING.md)
- [Architecture Decision Records](docs/adr/)

## 🆘 Getting Help

- Check [FAQ](docs/FAQ.md)
- Search [existing issues](https://github.com/bjpl/aves/issues)
- Join our [Discord community](#)
- Contact maintainers

---

**Happy coding! 🦅**