# GitHub Actions CI/CD Documentation

This directory contains the automated workflows for the Aves project.

## Workflows Overview

### 1. `ci.yml` - Continuous Integration (Fast, No Secrets Required)

**Purpose**: Quick feedback on all PRs and commits without requiring any secrets.

**What it does**:
- ✅ ESLint code quality checks
- ✅ TypeScript type checking
- ✅ Build verification (backend & frontend)
- ✅ Security audit (non-blocking)
- ✅ Works on forks without any configuration

**Runs on**: All pushes and PRs to `main` and `develop` branches

**No secrets required** - This workflow will pass on any fork or PR!

---

### 2. `test.yml` - Full Integration Tests

**Purpose**: Complete test suite with database integration and optional AI features.

**What it does**:
- ✅ All linting and type checking
- ✅ PostgreSQL database setup and migrations
- ✅ Full Jest test suite with coverage
- ✅ AI-powered tests (if API key configured)
- ✅ Coverage reporting to Codecov

**Runs on**: All pushes and PRs to `main` and `develop` branches

**Secrets (all optional)**:
- `TEST_JWT_SECRET` - Custom JWT secret for testing (auto-generated if not set)
- `TEST_SESSION_SECRET` - Custom session secret for testing (auto-generated if not set)
- `ANTHROPIC_API_KEY` - Only needed for AI feature tests (tests skip if not set)

**Note**: This workflow will run successfully even without any secrets configured!

---

### 3. `code-quality.yml` - Code Quality Checks

**Purpose**: Additional code quality and security validation.

**What it does**:
- ✅ ESLint on backend and frontend
- ✅ TypeScript type checking
- ✅ Production build verification
- ✅ npm security audit (non-blocking)
- ✅ Snyk security scan (if configured)

**Runs on**: All pushes and PRs to `main` and `develop` branches

**Secrets (optional)**:
- `SNYK_TOKEN` - Only needed for Snyk security scanning (skipped if not set)

---

## Secret Configuration (Optional)

All workflows will run successfully **without any secrets configured**. Secrets are only needed for:

1. **Custom test secrets** (optional): Use your own JWT/Session secrets instead of CI defaults
2. **AI features** (optional): Enable AI-powered tests with Anthropic API
3. **Enhanced security scanning** (optional): Enable Snyk integration

### How to Configure Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add any of these optional secrets:

| Secret Name | Purpose | Required? |
|-------------|---------|-----------|
| `TEST_JWT_SECRET` | Custom JWT secret for testing | ❌ No (auto-generated) |
| `TEST_SESSION_SECRET` | Custom session secret for testing | ❌ No (auto-generated) |
| `ANTHROPIC_API_KEY` | Enable AI-powered tests | ❌ No (tests skip if missing) |
| `SNYK_TOKEN` | Enable Snyk security scanning | ❌ No (scan skips if missing) |

### Generating Secure Secrets

If you want to configure custom secrets, generate them securely:

```bash
# Generate JWT secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Session secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Fork-Friendly Design

All workflows are designed to work on forks without any configuration:

- ✅ **No required secrets** - All secrets have safe defaults
- ✅ **AI tests gracefully skip** - Tests don't fail if API key missing
- ✅ **Database auto-configured** - PostgreSQL service container included
- ✅ **Fast feedback** - `ci.yml` runs basic checks in ~2-3 minutes

---

## Workflow Triggers

All workflows can be triggered:

1. **Automatically**: On push/PR to `main` or `develop`
2. **Manually**: Via "Actions" tab → Select workflow → "Run workflow"

---

## Understanding Test Results

### ✅ All Checks Passing

Great! Your code meets all quality standards.

### ⚠️ Some AI Tests Skipped

This is normal if `ANTHROPIC_API_KEY` is not configured. AI features will be tested when the secret is added.

### ❌ Security Audit Warning

Security vulnerabilities detected in dependencies. Review the npm audit output and update vulnerable packages.

### ❌ Tests Failed

1. Check the failing test output in the workflow run
2. Run tests locally: `cd backend && npm test`
3. Fix the issues and push again

---

## Local Development

To run the same checks locally:

```bash
# Backend checks
cd backend
npm run lint              # ESLint
npx tsc --noEmit         # Type checking
npm test                  # Run tests
npm run build            # Build verification

# Frontend checks
cd frontend
npm run lint              # ESLint
npx tsc --noEmit         # Type checking
npm run build            # Build verification
```

---

## Continuous Deployment

Currently, this project uses manual deployment. CI/CD workflows validate code quality but do not automatically deploy.

For deployment instructions, see:
- Production deployment: `docs/deployment/RAILWAY_DEPLOYMENT.md`
- Security setup: `docs/security/SECURITY_CHECKLIST.md`

---

## Troubleshooting

### Workflow fails with "Missing secrets"

**Solution**: No action needed! As of the latest update, all secrets are optional. The workflow should pass with fallback values.

### Database connection errors in tests

**Solution**: The workflow includes a PostgreSQL service container. If tests fail locally, ensure you have PostgreSQL running.

### AI tests always skipped

**Solution**: This is expected behavior if `ANTHROPIC_API_KEY` is not configured. Add the secret to enable AI tests.

### Codecov upload fails

**Solution**: This is non-blocking. Coverage reports are optional and the workflow will pass even if Codecov is unavailable.

---

## Best Practices

1. **Run checks locally before pushing** - Faster feedback loop
2. **Keep dependencies updated** - Regular `npm audit fix`
3. **Review security warnings** - Don't ignore npm audit results
4. **Monitor workflow runs** - Check for flaky tests
5. **Add tests for new features** - Maintain test coverage

---

## Contact & Support

For issues with CI/CD workflows:
1. Check this documentation
2. Review workflow logs in GitHub Actions
3. Open an issue with the `ci/cd` label

---

*Last updated: November 27, 2025*
