# Production Verification Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Stats Fix Verification](#stats-fix-verification)
3. [Admin Workflow Testing](#admin-workflow-testing)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Success Criteria](#success-criteria)

---

## Pre-Deployment Checklist

### Environment Configuration
- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is set and strong (min 32 characters)
- [ ] `DATABASE_URL` points to production database
- [ ] `FRONTEND_URL` is set to production frontend URL
- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured
- [ ] `ANTHROPIC_API_KEY` is set (if using AI features)
- [ ] All environment variables from `.env.example` are reviewed

### Security Validation
```bash
# Run security validation script
npm run validate-config

# Verify JWT_SECRET strength
node -e "if (process.env.JWT_SECRET?.length < 32) { console.error('JWT_SECRET too short!'); process.exit(1); }"

# Check for weak secrets
node -e "const weak = ['secret', 'changeme', 'test']; if (weak.some(w => process.env.JWT_SECRET?.toLowerCase().includes(w))) { console.error('Weak JWT_SECRET detected!'); process.exit(1); }"
```

### Database Migrations
- [ ] All migrations are applied to production database
- [ ] Verify schema matches latest migrations:
```bash
# Run migrations
npm run migrate

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

### Build & Test
- [ ] Application builds successfully: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles without errors: `npm run typecheck`
- [ ] Linting passes: `npm run lint`

### Dependencies
- [ ] No critical vulnerabilities: `npm audit --production`
- [ ] All production dependencies installed: `npm ci --production`

---

## Stats Fix Verification

### Overview
The stats fix addresses the issue where AI annotation statistics were not updating after approve/reject actions. The fix changes the stats endpoint to query `ai_annotation_items` table instead of `ai_annotations` job table.

### Testing on Deployed Application

#### 1. Initial Stats Check
```bash
# Get baseline stats
curl -X GET "https://your-production-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  | jq '.data'

# Expected response structure:
{
  "data": {
    "total": 150,
    "pending": 42,
    "approved": 95,
    "rejected": 13,
    "edited": 0,
    "avgConfidence": "0.87",
    "recentActivity": [...]
  }
}
```

#### 2. Approve Annotation Workflow Test
```bash
# Step 1: Get pending annotations
curl -X GET "https://your-production-url.com/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  | jq '.annotations[0]'

# Note the annotation ID from response
ANNOTATION_ID="<id-from-response>"

# Step 2: Approve the annotation
curl -X POST "https://your-production-url.com/api/ai/annotations/${ANNOTATION_ID}/approve" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Testing approval workflow"}'

# Expected: 200 OK with approval confirmation

# Step 3: Verify stats updated
curl -X GET "https://your-production-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  | jq '.data'

# Expected behavior:
# - total: UNCHANGED (same as before)
# - pending: DECREASED by 1
# - approved: INCREASED by 1
# - rejected: UNCHANGED
```

#### 3. Reject Annotation Workflow Test
```bash
# Step 1: Get another pending annotation
curl -X GET "https://your-production-url.com/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  | jq '.annotations[0].id'

ANNOTATION_ID="<id-from-response>"

# Step 2: Reject the annotation with category
curl -X POST "https://your-production-url.com/api/ai/annotations/${ANNOTATION_ID}/reject" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "INCORRECT_BBOX",
    "notes": "Bounding box does not match anatomical feature"
  }'

# Expected: 200 OK with rejection confirmation

# Step 3: Verify stats updated
curl -X GET "https://your-production-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  | jq '.data'

# Expected behavior:
# - pending: DECREASED by 1
# - rejected: INCREASED by 1
```

### Test Scenarios

#### Scenario 1: Single Approval
- **Action**: Approve one pending annotation
- **Expected**:
  - `pending` count decreases by 1
  - `approved` count increases by 1
  - New annotation appears in `annotations` table
  - Review recorded in `ai_annotation_reviews`

#### Scenario 2: Single Rejection
- **Action**: Reject one pending annotation with category
- **Expected**:
  - `pending` count decreases by 1
  - `rejected` count increases by 1
  - Rejection category stored in review notes
  - Annotation status updated to 'rejected'

#### Scenario 3: Bulk Approval
- **Action**: Bulk approve 5 annotations
- **Expected**:
  - `pending` decreases by 5
  - `approved` increases by 5
  - All 5 annotations moved to main table
  - Single review record with `affected_items: 5`

#### Scenario 4: Edit Before Approval
- **Action**: Edit annotation, then approve
- **Expected**:
  - Stats update correctly
  - Edited values saved to main table
  - Status set to 'edited' not 'approved'

---

## Admin Workflow Testing

### Admin Authentication
```bash
# Test admin role verification
curl -X GET "https://your-production-url.com/api/ai/annotations/pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: 200 OK with annotations list

# Test non-admin rejection
curl -X GET "https://your-production-url.com/api/ai/annotations/pending" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected: 403 Forbidden
```

### Annotation Review Features

#### Feature 1: List Pending Annotations
```bash
# Test pagination
curl -X GET "https://your-production-url.com/api/ai/annotations/pending?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Verify:
- [ ] Annotations returned with correct format
- [ ] Bounding boxes in frontend format (topLeft, bottomRight)
- [ ] Image URLs included
- [ ] Pagination metadata correct (total, limit, offset)
```

#### Feature 2: Approve Annotation
```bash
# Test approval with notes
curl -X POST "https://your-production-url.com/api/ai/annotations/{id}/approve" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Excellent annotation quality"}'

# Verify:
- [ ] Annotation moved to main annotations table
- [ ] Status updated to 'approved'
- [ ] Review recorded with notes
- [ ] Stats updated correctly
```

#### Feature 3: Reject Annotation
```bash
# Test rejection with category
curl -X POST "https://your-production-url.com/api/ai/annotations/{id}/reject" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "TOO_SMALL",
    "notes": "Bounding box covers less than 2% of image"
  }'

# Verify:
- [ ] Status updated to 'rejected'
- [ ] Category stored in review notes as "[TOO_SMALL] ..."
- [ ] Annotation remains in ai_annotation_items
- [ ] Stats updated correctly
```

#### Feature 4: Edit Annotation (No Approval)
```bash
# Test PATCH without approval
curl -X PATCH "https://your-production-url.com/api/ai/annotations/{id}" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "boundingBox": {"x": 0.4, "y": 0.3, "width": 0.15, "height": 0.12}
  }'

# Verify:
- [ ] Bounding box updated in storage format
- [ ] Status remains 'pending'
- [ ] Annotation still in review queue
- [ ] Changes visible in next GET request
```

#### Feature 5: Edit and Approve
```bash
# Test POST /edit (edit + approve)
curl -X POST "https://your-production-url.com/api/ai/annotations/{id}/edit" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spanishTerm": "el pico",
    "englishTerm": "beak",
    "notes": "Corrected terminology"
  }'

# Verify:
- [ ] Edited values saved to main table
- [ ] Status set to 'edited'
- [ ] Review action recorded as 'edit'
- [ ] Stats updated (pending decreased, approved NOT increased)
```

### Admin Dashboard Analytics
```bash
# Test analytics endpoint
curl -X GET "https://your-production-url.com/api/annotations/analytics" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Verify response includes:
- [ ] overview (total, pending, approved, rejected, avgConfidence)
- [ ] bySpecies (annotation count per species)
- [ ] byType (anatomical, behavioral, etc.)
- [ ] rejectionsByCategory (parsed from review notes)
- [ ] qualityFlags (tooSmall, lowConfidence counts)
```

### Role-Based Access Control

#### Test Admin Access
- [ ] Admin can list pending annotations
- [ ] Admin can approve annotations
- [ ] Admin can reject annotations
- [ ] Admin can edit annotations
- [ ] Admin can view analytics
- [ ] Admin can view stats

#### Test Regular User Access
- [ ] Regular user CANNOT access `/api/ai/annotations/*`
- [ ] Regular user gets 403 Forbidden
- [ ] Regular user CAN access own data via `/api/annotations`

#### Test Unauthenticated Access
- [ ] No token returns 401 Unauthorized
- [ ] Invalid token returns 401 Unauthorized
- [ ] Expired token returns 401 Unauthorized

---

## Post-Deployment Verification

### Automated Health Check
```bash
# Run health check script
./scripts/production-health-check.sh https://your-production-url.com YOUR_ADMIN_TOKEN

# Expected output:
# ✓ Server health check passed
# ✓ Database connectivity verified
# ✓ Authentication working
# ✓ Admin endpoints accessible
# ✓ Stats endpoint responding correctly
# ✓ All critical endpoints operational
```

### Manual Verification Steps

#### 1. Server Health
```bash
curl https://your-production-url.com/health

# Expected: {"status": "ok", "timestamp": "..."}
```

#### 2. Database Connectivity
```bash
# Test database query through API
curl -X GET "https://your-production-url.com/api/species?limit=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: Array with at least one species
```

#### 3. Authentication Flow
```bash
# Test login
curl -X POST "https://your-production-url.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'

# Expected: Token and user object
```

#### 4. Critical Endpoints
- [ ] `/health` - Server health
- [ ] `/api/auth/login` - Authentication
- [ ] `/api/ai/annotations/stats` - Stats (admin)
- [ ] `/api/ai/annotations/pending` - Pending annotations (admin)
- [ ] `/api/annotations/analytics` - Analytics (admin)

#### 5. Rate Limiting
```bash
# Test rate limit (should trigger after max requests)
for i in {1..110}; do
  curl -s https://your-production-url.com/api/species > /dev/null
  echo "Request $i"
done

# Expected: 429 Too Many Requests after limit exceeded
```

#### 6. Security Headers
```bash
# Verify security headers
curl -I https://your-production-url.com/health

# Expected headers:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Strict-Transport-Security: max-age=31536000
# - Content-Security-Policy: ...
```

### Performance Verification

#### Response Time Check
```bash
# Test response times
time curl https://your-production-url.com/api/ai/annotations/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: < 500ms for stats endpoint
```

#### Load Test (Optional)
```bash
# Simple concurrent request test
ab -n 100 -c 10 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://your-production-url.com/api/ai/annotations/stats

# Monitor:
# - Requests per second
# - Mean response time
# - Error rate (should be 0%)
```

### Monitoring & Logging

#### Application Logs
```bash
# Check production logs for errors
tail -f /var/log/aves-backend/app.log | grep -i error

# Or if using Docker:
docker logs aves-backend --tail 100 --follow | grep -i error
```

#### Database Performance
```bash
# Check slow queries
psql $DATABASE_URL -c "
  SELECT query, calls, mean_exec_time, max_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

---

## Rollback Procedures

### Issue Detection
Monitor for:
- [ ] Increased error rate in logs
- [ ] Stats not updating after approve/reject
- [ ] Database connection errors
- [ ] Authentication failures
- [ ] Slow response times (> 2s)

### Quick Rollback (< 5 minutes)

#### Option 1: Revert to Previous Docker Image
```bash
# Stop current deployment
docker stop aves-backend

# Start previous stable version
docker run -d \
  --name aves-backend \
  -p 3001:3001 \
  --env-file .env \
  your-registry/aves-backend:previous-stable

# Verify rollback
curl https://your-production-url.com/health
```

#### Option 2: Revert Git Commit
```bash
# Identify last stable commit
git log --oneline -n 10

# Revert to previous commit
git revert HEAD
git push origin main

# Trigger CI/CD pipeline to redeploy
```

#### Option 3: Database Rollback (if needed)
```bash
# Only if database migration caused issues
npm run migrate:rollback

# Verify schema
psql $DATABASE_URL -c "\dt"
```

### Full Rollback (> 5 minutes)

1. **Stop traffic to affected deployment**
   ```bash
   # Update load balancer or DNS to previous version
   ```

2. **Restore database backup** (if corruption occurred)
   ```bash
   # Restore from latest backup before deployment
   pg_restore -d $DATABASE_URL /path/to/backup.sql
   ```

3. **Redeploy previous stable version**
   ```bash
   git checkout <previous-stable-commit>
   npm ci --production
   npm run build
   pm2 restart aves-backend
   ```

4. **Verify rollback success**
   ```bash
   ./scripts/production-health-check.sh
   ```

### Post-Rollback Actions
- [ ] Document rollback reason and time
- [ ] Create incident report
- [ ] Identify root cause
- [ ] Plan fix deployment
- [ ] Update deployment procedures if needed

---

## Success Criteria

### Functional Requirements
- [x] Stats endpoint returns data from `ai_annotation_items` table
- [x] Approve action decrements `pending`, increments `approved`
- [x] Reject action decrements `pending`, increments `rejected`
- [x] Edit action preserves `pending` count, sets status to `edited`
- [x] Bulk approve updates stats correctly for all items
- [x] Analytics endpoint returns comprehensive metrics

### Performance Requirements
- [ ] Health check responds in < 100ms
- [ ] Stats endpoint responds in < 500ms
- [ ] Pending annotations endpoint responds in < 1s
- [ ] Approve/reject actions complete in < 2s
- [ ] No database connection timeouts

### Security Requirements
- [ ] Admin-only endpoints reject non-admin users (403)
- [ ] Authentication required for all protected endpoints (401)
- [ ] JWT_SECRET is strong and unique
- [ ] Rate limiting prevents abuse
- [ ] Security headers present (CSP, HSTS, etc.)
- [ ] No sensitive data in logs

### Reliability Requirements
- [ ] Database connection pool stable
- [ ] No memory leaks (monitor over 24 hours)
- [ ] Error rate < 0.1%
- [ ] Uptime > 99.9%
- [ ] Graceful handling of database errors

### Monitoring Requirements
- [ ] Application logs accessible
- [ ] Error tracking configured
- [ ] Performance metrics collected
- [ ] Database query performance monitored
- [ ] Alerts configured for critical errors

### Deployment Requirements
- [ ] Zero-downtime deployment possible
- [ ] Rollback procedure tested and documented
- [ ] Database migrations applied successfully
- [ ] Environment variables validated
- [ ] Health check passes before traffic routing

---

## Quick Reference Commands

```bash
# Health check
curl https://your-production-url.com/health

# Get stats
curl -X GET "https://your-production-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Approve annotation
curl -X POST "https://your-production-url.com/api/ai/annotations/{id}/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Approved"}'

# Reject annotation
curl -X POST "https://your-production-url.com/api/ai/annotations/{id}/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "INCORRECT_BBOX", "notes": "Fix needed"}'

# Get analytics
curl -X GET "https://your-production-url.com/api/annotations/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Run full health check
./scripts/production-health-check.sh https://your-production-url.com $ADMIN_TOKEN
```

---

## Contact & Support

**Emergency Contacts:**
- DevOps Team: devops@example.com
- Backend Lead: backend@example.com
- Database Admin: dba@example.com

**Monitoring Dashboards:**
- Application Metrics: https://metrics.example.com
- Error Tracking: https://errors.example.com
- Database Performance: https://db-metrics.example.com

**Documentation:**
- API Documentation: `/docs/API.md`
- Database Schema: `/docs/DATABASE_SCHEMA.md`
- Deployment Guide: `/docs/DEPLOYMENT.md`
