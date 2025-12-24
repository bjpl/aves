# Production Scripts

## Health Check Script

### Overview
The `production-health-check.sh` script provides automated verification of production deployment health, including server status, database connectivity, authentication, admin endpoints, security headers, and performance metrics.

### Usage

```bash
./scripts/production-health-check.sh <BASE_URL> [ADMIN_TOKEN]
```

**Parameters:**
- `BASE_URL` (required): The base URL of your deployed application
  - Example: `https://api.example.com`
  - Example: `http://localhost:3001` (for local testing)
- `ADMIN_TOKEN` (optional): Admin JWT token for testing admin-only endpoints
  - If not provided, admin endpoint checks will be skipped

### Examples

**Full health check with admin verification:**
```bash
./scripts/production-health-check.sh https://api.example.com eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Basic health check (no admin token):**
```bash
./scripts/production-health-check.sh https://api.example.com
```

**Local development testing:**
```bash
./scripts/production-health-check.sh http://localhost:3001 $ADMIN_TOKEN
```

### What It Checks

1. **Server Health Check**
   - Tests `/health` endpoint
   - Validates response status is "ok"
   - Checks timestamp in response

2. **Database Connectivity**
   - Queries database through `/api/species` endpoint
   - Verifies data can be retrieved
   - Confirms connection pool is working

3. **Authentication**
   - Tests unauthenticated access is rejected (401/403)
   - Verifies authentication middleware is active

4. **Admin Endpoints** (if ADMIN_TOKEN provided)
   - `/api/ai/annotations/stats` - Validates stats structure
   - `/api/ai/annotations/pending` - Tests pending annotations list
   - `/api/annotations/analytics` - Verifies analytics structure

5. **Security Headers**
   - X-Content-Type-Options
   - X-Frame-Options
   - Strict-Transport-Security (HSTS)
   - Content-Security-Policy (CSP)

6. **Performance**
   - Measures health endpoint response time
   - Warns if response > 500ms
   - Alerts if response > 2000ms

### Output

The script provides color-coded output:
- 🟢 **Green ✓**: Check passed
- 🔴 **Red ✗**: Check failed
- 🟡 **Yellow ⚠**: Warning or check skipped

**Example Output:**
```
==========================================
Production Health Check
==========================================
Base URL: https://api.example.com
Timestamp: 2025-10-17 12:00:00 UTC
==========================================

1. Server Health Check
---
✓ Health endpoint (HTTP 200)
✓ Server is healthy (timestamp: 2025-10-17T12:00:00Z)

2. Database Connectivity
---
✓ Database query (HTTP 200)
✓ Database connectivity verified (returned 1 species)

3. Authentication
---
✓ Unauthenticated request correctly rejected (HTTP 401)

4. Admin Endpoints
---
✓ Stats endpoint (HTTP 200)
✓ Stats structure valid (total: 150, pending: 42, approved: 95, rejected: 13)
✓ Pending annotations (HTTP 200)
✓ Pending annotations retrieved (showing 5 of 42)
✓ Analytics endpoint (HTTP 200)
✓ Analytics structure valid

5. Security Headers
---
✓ X-Content-Type-Options header present
✓ X-Frame-Options header present
✓ Strict-Transport-Security header present
✓ Content-Security-Policy header present

6. Performance Check
---
✓ Health endpoint response time: 87ms (excellent)

==========================================
Health Check Summary
==========================================
✓ All health checks passed!
```

### Exit Codes

- **0**: All checks passed
- **1**: One or more checks failed

This makes the script suitable for CI/CD pipelines and automated monitoring.

### Integration with CI/CD

**GitHub Actions Example:**
```yaml
- name: Run health check
  run: |
    ./scripts/production-health-check.sh ${{ secrets.PRODUCTION_URL }} ${{ secrets.ADMIN_TOKEN }}
```

**Jenkins Example:**
```groovy
stage('Health Check') {
    steps {
        sh '''
            ./scripts/production-health-check.sh ${PRODUCTION_URL} ${ADMIN_TOKEN}
        '''
    }
}
```

**Docker Compose Healthcheck:**
```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "./scripts/production-health-check.sh", "http://localhost:3001"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Troubleshooting

#### Script Permission Denied
```bash
chmod +x scripts/production-health-check.sh
```

#### jq Not Found
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Windows (WSL)
sudo apt-get install jq
```

#### Timeout Errors
The script has a 10-second timeout for each request. If you're getting timeout errors:
1. Check network connectivity
2. Verify server is running
3. Check firewall settings
4. Increase timeout in script (edit `TIMEOUT=10` variable)

#### Admin Token Invalid
If admin endpoint checks fail:
1. Verify token is not expired (default: 24 hours)
2. Re-login to get fresh token:
   ```bash
   curl -X POST "https://api.example.com/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@example.com", "password": "your-password"}' \
     | jq -r '.token'
   ```

### Dependencies

Required tools (must be installed):
- `curl` - HTTP client
- `jq` - JSON processor
- `bash` - Shell interpreter (version 4.0+)
- `date` - Date/time utilities

Optional but recommended:
- `tput` - Terminal control (for colors)

### Customization

To customize the health check:

1. **Add new endpoints:**
   ```bash
   # Add after line 200
   if response=$(check_response "Custom endpoint" \
       "${BASE_URL}/api/custom" \
       "200" \
       "Authorization: Bearer $ADMIN_TOKEN"); then
       log_success "Custom check passed"
   fi
   ```

2. **Change timeout:**
   ```bash
   # Edit line 15
   TIMEOUT=30  # Increase to 30 seconds
   ```

3. **Add custom validation:**
   ```bash
   # Add custom logic after response checks
   if [ "$custom_value" = "expected" ]; then
       log_success "Custom validation passed"
   else
       log_error "Custom validation failed"
   fi
   ```

### Best Practices

1. **Run after every deployment** to catch issues immediately
2. **Include in CI/CD pipeline** for automated verification
3. **Set up scheduled checks** (e.g., every 5 minutes) in production
4. **Alert on failures** via email, Slack, PagerDuty, etc.
5. **Keep ADMIN_TOKEN secure** - use environment variables or secrets management
6. **Review logs** when checks fail to diagnose root cause

### Related Documentation

- **Production Verification Guide:** `/docs/PRODUCTION_VERIFICATION_GUIDE.md`
- **Stats Fix Test Plan:** `/docs/STATS_FIX_TEST_PLAN.md`
- **Admin Workflow Checklist:** `/docs/ADMIN_WORKFLOW_CHECKLIST.md`
- **Quick Reference:** `/docs/QUICK_REFERENCE.md`

### Maintenance

**Update the script when:**
- New critical endpoints are added
- Authentication mechanism changes
- Expected response formats change
- Performance baselines change
- Security headers requirements change

**Review script quarterly** to ensure:
- All checks are still relevant
- Timeouts are appropriate
- Expected values are current
- Error handling is comprehensive

---

## Other Scripts

### run-bounding-box-migration.sh
Migrates bounding box format from backend (x, y, width, height) to frontend format (topLeft, bottomRight, width, height).

**Usage:**
```bash
./scripts/run-bounding-box-migration.sh
```

### set-admin.sql
SQL script to grant admin role to a user.

**Usage:**
```bash
psql $DATABASE_URL -f scripts/set-admin.sql
```

---

**Last Updated:** 2025-10-17
**Maintained By:** Backend Team
