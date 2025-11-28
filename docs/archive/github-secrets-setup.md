# GitHub Secrets Setup for CI/CD

This document explains how to set up GitHub secrets for the AVES project CI/CD pipeline.

## Required Secrets

The following secrets need to be configured in your GitHub repository settings:

### 1. **ANTHROPIC_API_KEY**
- **Description**: API key for Anthropic Claude AI service
- **Where to get it**: [Anthropic Console](https://console.anthropic.com/)
- **Format**: `sk-ant-api...`
- **Usage**: Used for AI-powered exercise generation tests

### 2. **TEST_JWT_SECRET**
- **Description**: Secret key for JWT token generation in test environment
- **Value**: Generate a secure random string (64+ characters)
- **Generator**: `openssl rand -hex 32`
- **Usage**: Used for authentication in integration tests

### 3. **TEST_SESSION_SECRET**
- **Description**: Secret key for session management in test environment
- **Value**: Generate a secure random string (64+ characters)
- **Generator**: `openssl rand -hex 32`
- **Usage**: Used for session encryption in tests

### 4. **INTEGRATION_DB_HOST** (Optional)
- **Description**: Database host for integration testing
- **Value**: Your staging database host
- **Usage**: Only used for integration tests on main branch

### 5. **INTEGRATION_DB_PASSWORD** (Optional)
- **Description**: Database password for integration testing
- **Value**: Your staging database password
- **Usage**: Only used for integration tests on main branch

## How to Add Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the name and value specified above
5. Click **Add secret**

## Generating Secure Secrets

### For JWT and Session Secrets

**Option 1: Using OpenSSL (Recommended)**
```bash
# Generate a 64-character hex string
openssl rand -hex 32

# Generate a 96-character hex string (more secure)
openssl rand -hex 48
```

**Option 2: Using Node.js**
```javascript
// Run in Node.js console or create a script
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
```

**Option 3: Using Python**
```python
import secrets
print(secrets.token_hex(32))
```

## Environment-Specific Configuration

### Development Environment
- Use `.env.test` file locally with actual credentials
- Never commit real credentials to version control
- Keep `.env.test` in `.gitignore`

### CI Environment (GitHub Actions)
- Secrets are injected from GitHub Secrets
- PostgreSQL service container provides test database
- No SSL required for localhost database

### Production Environment
- Use separate production secrets
- Enable SSL for database connections
- Use environment variables from hosting platform

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Update secrets every 90 days
   - Immediately rotate if compromised

2. **Use Different Secrets per Environment**
   - Never use production secrets in test/CI
   - Generate unique secrets for each environment

3. **Limit Secret Access**
   - Only give repository admin access to production secrets
   - Use environment-specific secrets where possible

4. **Monitor Secret Usage**
   - Review GitHub Actions logs regularly
   - Enable alerts for failed authentication attempts

## Troubleshooting

### Tests Failing with Authentication Errors
- Verify `TEST_JWT_SECRET` and `TEST_SESSION_SECRET` are set
- Check that secrets don't contain quotes or special characters
- Ensure secrets are at least 32 characters long

### AI Tests Failing
- Verify `ANTHROPIC_API_KEY` is valid and active
- Check API key has sufficient credits/quota
- Ensure the key has the necessary permissions

### Database Connection Issues
- PostgreSQL service should start automatically in CI
- Database name: `aves_test`
- Username: `postgres`
- Password: `postgres`
- No SSL required for CI environment

## GitHub Actions Workflow

The workflow file (`.github/workflows/test.yml`) is configured to:
1. Start a PostgreSQL service container
2. Create test database and schema
3. Run migrations
4. Execute tests with secrets from GitHub
5. Upload coverage reports
6. Archive test results on failure

## Local Testing with CI Configuration

To test the CI configuration locally:

```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash  # Linux

# Create .secrets file (don't commit this!)
cat > .secrets << EOF
ANTHROPIC_API_KEY=your_api_key_here
TEST_JWT_SECRET=your_jwt_secret_here
TEST_SESSION_SECRET=your_session_secret_here
EOF

# Run the workflow locally
act -j test --secret-file .secrets

# Clean up
rm .secrets
```

## Support

For issues with CI/CD setup:
1. Check GitHub Actions logs for detailed error messages
2. Verify all required secrets are configured
3. Ensure workflow file syntax is correct
4. Open an issue if problems persist

## Next Steps

After setting up secrets:
1. Push the workflow file to trigger first run
2. Monitor the Actions tab for build status
3. Review test results and coverage reports
4. Set up branch protection rules requiring CI to pass