# Production Validation System

## Overview

The aves project includes a comprehensive production validation system to ensure code quality, security, and deployment readiness before pushing to production environments.

## Quick Start

```bash
# Run full validation suite
npm run validate

# Check for hardcoded secrets only
npm run check-secrets

# Validate before deployment (runs automatically with predeploy hook)
npm run predeploy
```

## Validation Checks

### 1. Required Files ✓
Ensures all critical project files exist:
- `package.json` (root, frontend, backend)
- `README.md`
- `LICENSE`
- `.gitignore`
- `.env.example` files

**Why it matters**: Missing files can cause deployment failures or legal issues.

### 2. Dependencies Installation ✓
Verifies that all dependencies are installed:
- Root workspace dependencies
- Backend dependencies
- Frontend dependencies
- Checks for `package-lock.json` (ensures version pinning)

**Why it matters**: Missing dependencies cause runtime errors in production.

### 3. TypeScript Compilation ✓
Compiles TypeScript code without emitting files:
- Backend TypeScript (`npx tsc --noEmit`)
- Frontend TypeScript (if configured)

**Why it matters**: Type errors can cause subtle bugs that only appear at runtime.

### 4. Code Linting ✓
Runs ESLint across all workspaces:
- Checks code style consistency
- Identifies potential bugs
- Enforces best practices

**Why it matters**: Maintains code quality and catches common errors.

### 5. Test Suite ✓
Executes all test suites:
- Backend tests (Jest)
- Frontend tests (Vitest)
- E2E tests (Playwright)

**Why it matters**: Ensures functionality works as expected and prevents regressions.

### 6. Build Process ✓
Verifies the build process succeeds:
- Backend build
- Frontend build (if `build:all` exists)

**Why it matters**: Build failures prevent deployment and indicate configuration issues.

### 7. Production Code Quality ⚠️
Scans for `console.log` statements in production code:
- Checks `src/` directories
- Excludes test files
- Reports files with console statements

**Why it matters**: Console statements can expose sensitive data and impact performance.

### 8. Environment Configuration ✓
Validates environment variable documentation:
- Checks `.env.example` files exist
- Counts documented variables
- Verifies placeholder values are used

**Why it matters**: Proper documentation helps deployment and prevents config errors.

### 9. Secret Detection 🔒
Scans for hardcoded secrets and credentials:
- API keys (OpenAI, Anthropic, AWS, Stripe, etc.)
- Database URLs with credentials
- JWT secrets
- Passwords
- Private keys
- GitHub tokens

**Why it matters**: Hardcoded secrets are a critical security vulnerability.

### 10. Git Configuration ✓
Validates `.gitignore` setup:
- Ensures `.env` files are excluded
- Checks `node_modules` is excluded
- Verifies build directories are excluded
- Confirms no `.env` files are tracked

**Why it matters**: Prevents accidental commit of sensitive data.

### 11. Dependency Versioning ⚠️
Reviews package version specifications:
- Identifies wildcard versions (`*`, `latest`)
- Counts semver range dependencies (`^`, `~`)
- Reports pinned versions

**Why it matters**: Loose versioning can cause unexpected breaking changes.

### 12. Runtime Environment ✓
Checks Node.js version compatibility:
- Compares current version with `engines.node`
- Warns if version is incompatible

**Why it matters**: Wrong Node version causes deployment failures.

## Secret Detection Patterns

The `check-secrets.js` script detects:

### Critical Patterns
- OpenAI API Keys: `sk-...`
- Anthropic API Keys: `sk-ant-api...`
- AWS Access Keys: `AKIA...`
- Stripe Live Keys: `sk_live_...`
- Private Keys: `-----BEGIN PRIVATE KEY-----`
- Database URLs with credentials
- GitHub Tokens: `ghp_...`, `gho_...`

### High Severity Patterns
- Generic API keys
- JWT secrets (non-placeholder)
- Hardcoded passwords
- Secret keys

## Usage Examples

### Pre-Deployment Check
```bash
# This runs automatically before deployment
npm run predeploy

# Or run validation separately
npm run validate
```

### CI/CD Integration
```yaml
# .github/workflows/validate.yml
name: Production Validation
on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run validate
```

### Local Development Workflow
```bash
# Before committing
npm run check-secrets  # Quick secret scan
npm run lint           # Fix linting issues
npm test               # Ensure tests pass

# Before deploying
npm run validate       # Full validation suite
```

## Exit Codes

- **0**: All checks passed - ready for deployment
- **1**: One or more checks failed - fix issues before deploying

## Output Format

### Success
```
═══════════════════════════════════════════════════════════════════════
  PRODUCTION VALIDATION SCRIPT
  Aves Project Pre-Deployment Checks
═══════════════════════════════════════════════════════════════════════

[... detailed check results ...]

═══════════════════════════════════════════════════════════════════════
  VALIDATION SUMMARY
═══════════════════════════════════════════════════════════════════════

Total Checks: 42
Passed: 42
Failed: 0
Warnings: 0
Pass Rate: 100.0%

═══════════════════════════════════════════════════════════════════════
✓ PRODUCTION VALIDATION PASSED
  All checks passed - ready for deployment!
═══════════════════════════════════════════════════════════════════════
```

### Failure
```
═══════════════════════════════════════════════════════════════════════
  VALIDATION SUMMARY
═══════════════════════════════════════════════════════════════════════

Total Checks: 42
Passed: 38
Failed: 4
Warnings: 2
Pass Rate: 90.5%

──────────────────────────────────────────────────────────────────────
FAILED CHECKS:
──────────────────────────────────────────────────────────────────────

1. Backend TypeScript compilation
   → TypeScript errors detected - fix before deploying

2. Test suite
   → Some tests are failing

[...]

═══════════════════════════════════════════════════════════════════════
✗ PRODUCTION VALIDATION FAILED
  Fix 4 failed check(s) before deploying
═══════════════════════════════════════════════════════════════════════
```

## Customization

### Adding Custom Checks

Edit `scripts/validate-production.js`:

```javascript
function checkCustomValidation() {
  logSection('13. Custom Check');

  try {
    // Your validation logic
    const result = performCheck();
    recordResult('Custom check name', result, 'Optional message');
  } catch (error) {
    recordResult('Custom check name', false, error.message);
  }
}

// Add to main():
async function main() {
  // ... existing checks ...
  checkCustomValidation();
  // ...
}
```

### Adding Secret Patterns

Edit `scripts/check-secrets.js`:

```javascript
const secretPatterns = [
  // ... existing patterns ...
  {
    name: 'Custom API Key Pattern',
    pattern: /custom-api-[a-zA-Z0-9]{32}/g,
    severity: 'high',
  },
];
```

## Best Practices

1. **Run validation before every deployment**
   - The `predeploy` hook does this automatically
   - Manual: `npm run validate`

2. **Never commit secrets**
   - Use environment variables
   - Use `.env.example` for documentation
   - Rotate exposed credentials immediately

3. **Keep dependencies updated**
   - Regularly run `npm audit`
   - Update dependencies for security patches
   - Test after updates

4. **Fix warnings promptly**
   - Warnings indicate potential issues
   - Don't let them accumulate
   - Prioritize security warnings

5. **Test in staging first**
   - Run validation in CI/CD
   - Deploy to staging before production
   - Verify functionality in staging

## Troubleshooting

### Validation Fails with TypeScript Errors
```bash
# Check specific errors
cd backend && npx tsc --noEmit

# Fix errors and re-validate
npm run validate
```

### Secret Detection False Positives
Add exclusions to `check-secrets.js`:
```javascript
const realMatches = matches.filter(match => {
  const lower = match.toLowerCase();
  return !(
    lower.includes('your-custom-false-positive')
  );
});
```

### Build Failures
```bash
# Clean build artifacts
rm -rf backend/dist frontend/dist

# Reinstall dependencies
rm -rf node_modules backend/node_modules frontend/node_modules
npm install

# Rebuild
npm run build:all
```

## Integration with Deployment Platforms

### Railway
```bash
# Validation runs automatically with predeploy hook
railway up
```

### Vercel
```json
// package.json
{
  "scripts": {
    "vercel-build": "npm run validate && npm run build:all"
  }
}
```

### Docker
```dockerfile
# Dockerfile
RUN npm run validate
RUN npm run build:all
```

## Continuous Improvement

The validation system should evolve with your project:

1. Add checks for new technologies
2. Tighten security patterns as needed
3. Include performance benchmarks
4. Add custom business logic validation
5. Integrate with monitoring tools

## Support

For issues or improvements:
1. Check this documentation
2. Review script output carefully
3. Consult team guidelines
4. Create issue if needed

---

**Last Updated**: November 27, 2025
**Scripts Version**: 1.0.0
**Maintained By**: Aves Development Team
