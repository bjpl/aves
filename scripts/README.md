# Aves Scripts Directory

This directory contains utility and validation scripts for the aves project.

## Available Scripts

### Production Validation

#### `validate-production.js`
Comprehensive pre-deployment validation script that performs 12 critical checks:

**Usage:**
```bash
npm run validate
# or directly
node scripts/validate-production.js
```

**What it checks:**
- Required files exist (README, LICENSE, package.json, etc.)
- Dependencies are installed
- TypeScript compiles without errors
- ESLint passes
- Tests pass
- Build process succeeds
- No console.log in production code
- Environment variables are documented
- Secrets are not hardcoded
- .gitignore is properly configured
- Package versions are specified
- Node.js version compatibility

**Exit codes:**
- `0` - All checks passed (ready for deployment)
- `1` - One or more checks failed (fix before deploying)

---

#### `check-secrets.js`
Security-focused script that scans for hardcoded secrets and credentials.

**Usage:**
```bash
npm run check-secrets
# or directly
node scripts/check-secrets.js
```

**What it detects:**
- API keys (OpenAI, Anthropic, AWS, Stripe, etc.)
- Database connection strings with credentials
- JWT secrets
- Hardcoded passwords
- Private keys (RSA, SSH)
- GitHub tokens
- Generic API keys and secrets

**Exit codes:**
- `0` - No secrets detected
- `1` - Potential secrets found

---

## Integration with NPM Scripts

These scripts are integrated into the root `package.json`:

```json
{
  "scripts": {
    "validate": "node scripts/validate-production.js",
    "check-secrets": "node scripts/check-secrets.js",
    "predeploy": "npm run validate"
  }
}
```

The `predeploy` hook automatically runs validation before deployment commands.

## CI/CD Integration

### GitHub Actions Example

```yaml
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

### Railway Deployment

Validation runs automatically via the `predeploy` hook:

```bash
railway up  # Runs npm run predeploy first
```

## Adding Custom Scripts

When adding new scripts to this directory:

1. **Make them executable:**
   ```bash
   chmod +x scripts/your-script.js
   ```

2. **Add shebang line:**
   ```javascript
   #!/usr/bin/env node
   ```

3. **Document in this README**

4. **Add to package.json scripts if needed:**
   ```json
   {
     "scripts": {
       "your-script": "node scripts/your-script.js"
     }
   }
   ```

## Script Organization

- Production validation scripts (current)
- Database migration scripts (future)
- Data seeding scripts (future)
- Utility scripts (future)
- Testing helpers (future)

## Best Practices

1. **Always test scripts locally** before committing
2. **Use meaningful exit codes** (0 = success, 1 = failure)
3. **Provide clear output** with colors and formatting
4. **Handle errors gracefully** with try/catch blocks
5. **Document usage** in this README

## Troubleshooting

### Permission Errors
```bash
# Make script executable
chmod +x scripts/script-name.js
```

### Path Issues
Scripts should use `path.resolve(__dirname, '..')` to reference the project root.

### Dependencies
Scripts should use only Node.js built-ins or dependencies already in package.json.

## Contributing

When modifying these scripts:

1. Test thoroughly on your local environment
2. Update documentation if behavior changes
3. Maintain backward compatibility when possible
4. Add appropriate error handling
5. Follow existing code style

---

**Last Updated**: November 27, 2025
**Maintained By**: Aves Development Team
