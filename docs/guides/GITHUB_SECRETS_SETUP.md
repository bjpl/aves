# GitHub Secrets Setup Guide

## Overview

This guide explains how to set up the required GitHub Secrets to enable automated testing and CI/CD workflows for the AVES project.

---

## Required Secrets

### 1. TEST_JWT_SECRET

**Purpose**: JWT signing key for test environment
**Used by**: `test.yml`, `e2e-tests.yml`
**Security Level**: High

**How to Generate**:
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 64

# Option 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(64))"
```

**Example Output** (DO NOT USE THIS - generate your own):
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
```

---

### 2. TEST_SESSION_SECRET

**Purpose**: Session encryption key for test environment
**Used by**: `test.yml`, `e2e-tests.yml`
**Security Level**: High

**How to Generate**:
```bash
# Use the same methods as TEST_JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Note**: Must be different from TEST_JWT_SECRET

---

### 3. ANTHROPIC_API_KEY

**Purpose**: Access to Claude AI API for annotation generation and AI features
**Used by**: `test.yml`, `e2e-tests.yml`
**Security Level**: Critical

**How to Obtain**:

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in to your Anthropic account
3. Navigate to "API Keys" section
4. Click "Create Key"
5. Give it a name (e.g., "AVES GitHub Actions")
6. Copy the API key (starts with `sk-ant-`)

**Format**:
```
sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Cost Considerations**:
- Tests use Claude API for AI features
- Estimated cost: ~$0.10-0.50 per test run
- Consider using a separate API key for CI/CD to track costs
- Free tier: $5 credit (sufficient for initial testing)

**Alternative for Testing**:
- Tests can be configured to mock AI responses
- Reduces costs but doesn't test real AI integration
- See `backend/src/test/mocks/aiService.ts` for mock setup

---

### 4. SNYK_TOKEN (Optional)

**Purpose**: Security scanning with Snyk
**Used by**: `code-quality.yml` (security-audit job)
**Security Level**: Medium

**How to Obtain**:

1. Go to [snyk.io](https://snyk.io)
2. Sign up for free account
3. Navigate to Account Settings
4. Find "API Token" section
5. Copy your token

**Note**:
- This is optional - the security-audit job will be skipped if not provided
- Free tier: Unlimited tests for open source projects
- Alternative: Use `npm audit` only (no Snyk)

---

## How to Add Secrets to GitHub

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. In left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Each Secret

For each secret listed above:

1. Click **New repository secret**
2. Enter the **Name** exactly as shown (e.g., `TEST_JWT_SECRET`)
3. Paste the **Value** (the generated key)
4. Click **Add secret**

### Visual Guide

```
GitHub Repository
  ├── Settings
  │   ├── Secrets and variables
  │   │   ├── Actions
  │   │   │   ├── New repository secret
  │   │   │   │   ├── Name: TEST_JWT_SECRET
  │   │   │   │   └── Value: [generated hex string]
  │   │   │   ├── TEST_SESSION_SECRET
  │   │   │   ├── ANTHROPIC_API_KEY
  │   │   │   └── SNYK_TOKEN (optional)
```

---

## Verification

### 1. Check Secrets are Added

In GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. You should see:
   - ✅ TEST_JWT_SECRET
   - ✅ TEST_SESSION_SECRET
   - ✅ ANTHROPIC_API_KEY
   - 🟡 SNYK_TOKEN (optional)

### 2. Test Workflows

**Option A: Automatic** (push a commit)
```bash
git add .
git commit -m "test: Verify CI/CD workflows"
git push
```

**Option B: Manual** (workflow_dispatch)
1. Go to Actions tab in GitHub
2. Select "Run Tests" workflow
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow" button

**Expected Result**:
- ✅ code-quality.yml should pass
- ✅ test.yml should pass (if secrets added)
- ✅ e2e-tests.yml should pass (if secrets added)

### 3. Check Workflow Logs

If a workflow fails:
1. Click on the failed workflow run
2. Click on the failed job
3. Expand the failing step
4. Look for error messages

**Common Issues**:
- Missing secrets: "Error: Input required and not supplied: <SECRET_NAME>"
- Invalid API key: "Anthropic API returned 401 Unauthorized"
- Wrong format: "Invalid JWT secret length"

---

## Security Best Practices

### Secret Rotation

**Recommendation**: Rotate secrets every 90 days

**Process**:
1. Generate new secret value
2. Update GitHub Secret
3. Update `.env` files in local development (if needed)
4. Old secret remains valid for 24 hours (grace period)

### Access Control

- ✅ Secrets are only accessible to workflow runs
- ✅ Secrets are not visible in logs (GitHub masks them)
- ✅ Secrets cannot be accessed by forks (PRs from forks won't have access)

**For sensitive operations**:
- Require manual approval for workflow_dispatch
- Use environment protection rules
- Set up required reviewers

### Separate Keys for Different Environments

**Recommendation**:
- Development: Personal API keys
- Testing/CI: Dedicated CI/CD keys
- Staging: Staging-specific keys
- Production: Production-only keys

**Benefits**:
- Cost tracking per environment
- Easy revocation if compromised
- Rate limiting isolation

---

## Alternative: Environment Secrets

For production deployments, consider using **Environment Secrets** instead of repository secrets:

### Setup

1. Go to Settings → Environments
2. Create environment (e.g., "production", "staging")
3. Add secrets specific to that environment
4. Configure workflow to use environment

### Example Workflow

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Uses production secrets
    steps:
      - name: Deploy
        env:
          API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}  # Production key
        run: npm run deploy
```

**Benefits**:
- Environment-specific secrets
- Deployment protection rules
- Required reviewers for production

---

## Cost Management

### Anthropic API Usage

**Monitoring**:
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to "Usage" section
3. Monitor API calls and costs

**Cost Reduction Strategies**:
1. **Mock AI Responses in Tests**
   ```typescript
   // backend/src/test/mocks/aiService.ts
   export const mockAIResponse = {
     annotations: { /* mock data */ }
   };
   ```

2. **Conditional AI Tests**
   ```yaml
   - name: Run AI tests
     if: github.event_name != 'pull_request'  # Skip on PRs
     run: npm test -- --testPathPattern=ai
   ```

3. **Separate Test Suites**
   - Quick tests (no AI): Run on every commit
   - AI tests: Run on main branch only

4. **Use Anthropic Credits Wisely**
   - Cache AI responses when possible
   - Use smaller models for tests (claude-3-haiku)
   - Set API call limits in tests

---

## Troubleshooting

### Issue: "Error: Input required and not supplied"

**Cause**: Secret not added to GitHub
**Solution**: Add the missing secret following steps above

### Issue: "Anthropic API returned 401 Unauthorized"

**Cause**: Invalid or expired API key
**Solution**:
1. Verify API key is correct
2. Check if API key is active in Anthropic console
3. Regenerate key if necessary

### Issue: "Invalid JWT secret length"

**Cause**: Secret too short (minimum 32 characters recommended)
**Solution**: Generate longer secret (64 bytes = 128 hex characters)

### Issue: "npm ci failed"

**Cause**: Missing package-lock.json or mismatched dependencies
**Solution**:
1. Ensure package-lock.json is committed
2. Run `npm install` locally to regenerate
3. Commit updated package-lock.json

---

## Quick Reference

| Secret Name | Purpose | Required | How to Generate |
|-------------|---------|----------|----------------|
| TEST_JWT_SECRET | JWT signing | Yes | `openssl rand -hex 64` |
| TEST_SESSION_SECRET | Session encryption | Yes | `openssl rand -hex 64` |
| ANTHROPIC_API_KEY | Claude AI access | Yes | console.anthropic.com |
| SNYK_TOKEN | Security scanning | No | snyk.io |

---

## Next Steps

After adding secrets:

1. ✅ Push a commit to trigger workflows
2. ✅ Verify workflows pass in GitHub Actions
3. ✅ Review workflow logs for any issues
4. ✅ Enable branch protection rules (require passing checks)
5. ✅ Set up Codecov for test coverage tracking (optional)

---

**Last Updated**: November 17, 2025
**Maintainer**: AVES Development Team
