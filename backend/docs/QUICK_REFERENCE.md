# Production Verification Quick Reference

## Immediate Post-Deployment Actions

### 1. Run Health Check (30 seconds)
```bash
cd backend
./scripts/production-health-check.sh https://your-production-url.com $ADMIN_TOKEN
```

### 2. Verify Stats Fix (2 minutes)
```bash
# Get baseline stats
curl -X GET "https://your-production-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data'

# Approve one annotation
ANNOT_ID=$(curl -s -X GET "https://your-production-url.com/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.annotations[0].id')

curl -X POST "https://your-production-url.com/api/ai/annotations/$ANNOT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Verification test"}'

# Verify stats updated
sleep 1
curl -X GET "https://your-production-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.pending, .data.approved'
```

### 3. Quick Smoke Test (1 minute)
```bash
# Health
curl https://your-production-url.com/health

# Stats
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-production-url.com/api/ai/annotations/stats

# Analytics
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-production-url.com/api/annotations/analytics
```

---

## Critical Endpoints to Monitor

| Endpoint | Expected Status | Max Response Time |
|----------|----------------|-------------------|
| `/health` | 200 | 100ms |
| `/api/ai/annotations/stats` | 200 (admin) | 500ms |
| `/api/ai/annotations/pending` | 200 (admin) | 1000ms |
| `/api/annotations/analytics` | 200 (admin) | 1500ms |
| `/api/ai/annotations/:id/approve` | 200 (admin) | 2000ms |
| `/api/ai/annotations/:id/reject` | 200 (admin) | 2000ms |

---

## Expected Behaviors After Fix

### Approve Action
- ✅ `pending` count **decreases by 1**
- ✅ `approved` count **increases by 1**
- ✅ Annotation moved to `annotations` table
- ✅ Review recorded in `ai_annotation_reviews`
- ✅ Stats update **immediately** (within 1 second)

### Reject Action
- ✅ `pending` count **decreases by 1**
- ✅ `rejected` count **increases by 1**
- ✅ Status set to "rejected"
- ✅ Category stored in review notes
- ✅ Stats update **immediately**

### Edit Without Approval (PATCH)
- ✅ `pending` count **unchanged**
- ✅ All other stats **unchanged**
- ✅ Status remains "pending"
- ✅ Changes visible in next GET

### Edit and Approve (POST /edit)
- ✅ `pending` count **decreases by 1**
- ✅ Status set to "edited" (not "approved")
- ✅ Edited values saved to main table
- ✅ Review action = "edit"

---

## Red Flags (Immediate Rollback)

### 🚨 Critical Issues
- Stats **not updating** after approve/reject
- HTTP **500 errors** on any endpoint
- Database connection **timeouts**
- Authentication **completely broken**
- **Data loss** or corruption

### ⚠️ Warning Signs
- Response times **> 5 seconds**
- Stats counts **decrease without actions**
- Admin endpoints accessible to **non-admins**
- Memory usage **continuously increasing**
- Error rate **> 1%**

---

## Rollback Commands

### Quick Rollback (Docker)
```bash
# Stop current
docker stop aves-backend

# Start previous version
docker run -d \
  --name aves-backend \
  -p 3001:3001 \
  --env-file .env \
  your-registry/aves-backend:v1.2.3-stable
```

### Git Rollback
```bash
git revert HEAD
git push origin main
# Trigger CI/CD redeploy
```

### Database Rollback (if needed)
```bash
# ONLY if migration caused corruption
npm run migrate:rollback
```

---

## Success Criteria Checklist

### Functional ✅
- [ ] Stats endpoint returns data from `ai_annotation_items`
- [ ] Approve decrements pending, increments approved
- [ ] Reject decrements pending, increments rejected
- [ ] Edit (PATCH) preserves pending count
- [ ] Analytics returns comprehensive data

### Performance ✅
- [ ] Health check < 100ms
- [ ] Stats < 500ms
- [ ] No database timeouts
- [ ] No memory leaks

### Security ✅
- [ ] Admin-only endpoints reject non-admins (403)
- [ ] Authentication required (401 without token)
- [ ] JWT_SECRET is strong
- [ ] Rate limiting active
- [ ] Security headers present

---

## Monitoring Dashboards

### Application Logs
```bash
# Docker
docker logs aves-backend --tail 100 --follow | grep -i error

# PM2
pm2 logs aves-backend --lines 100

# System
tail -f /var/log/aves-backend/app.log
```

### Database Performance
```bash
# Slow queries
psql $DATABASE_URL -c "
  SELECT query, calls, mean_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Active connections
psql $DATABASE_URL -c "
  SELECT count(*), state
  FROM pg_stat_activity
  GROUP BY state;
"
```

### System Resources
```bash
# Memory
free -h

# CPU
top -bn1 | grep "Cpu(s)"

# Disk
df -h

# Network
netstat -an | grep 3001 | wc -l
```

---

## Common Issues & Solutions

### Issue: Stats Not Updating

**Diagnosis:**
```bash
# Check database directly
psql $DATABASE_URL -c "
  SELECT status, COUNT(*)
  FROM ai_annotation_items
  GROUP BY status;
"

# Compare to API response
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-production-url.com/api/ai/annotations/stats | jq '.data'
```

**Solution:**
1. Verify transaction committed
2. Check application logs for errors
3. Restart application if caching suspected (shouldn't exist)

---

### Issue: Slow Response Times

**Diagnosis:**
```bash
# Check database indexes
psql $DATABASE_URL -c "\d ai_annotation_items"

# Run EXPLAIN on stats query
psql $DATABASE_URL -c "
  EXPLAIN ANALYZE
  SELECT status, COUNT(*)
  FROM ai_annotation_items
  GROUP BY status;
"
```

**Solution:**
```sql
-- Add index if missing
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_status
  ON ai_annotation_items(status);

-- Vacuum if needed
VACUUM ANALYZE ai_annotation_items;
```

---

### Issue: Authentication Failures

**Diagnosis:**
```bash
# Check JWT_SECRET is set
env | grep JWT_SECRET

# Test token generation
curl -X POST https://your-production-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}'
```

**Solution:**
1. Verify JWT_SECRET environment variable
2. Check Supabase configuration
3. Review authentication middleware logs

---

## Contact Information

**Emergency Contacts:**
- DevOps: devops@example.com
- Backend Lead: backend@example.com
- Database Admin: dba@example.com

**Documentation:**
- Full Guide: `/docs/PRODUCTION_VERIFICATION_GUIDE.md`
- Test Plan: `/docs/STATS_FIX_TEST_PLAN.md`
- Admin Checklist: `/docs/ADMIN_WORKFLOW_CHECKLIST.md`

**Monitoring:**
- Metrics: https://metrics.example.com
- Errors: https://errors.example.com
- Logs: https://logs.example.com

---

## Testing Credentials (Staging Only)

**Admin Account:**
```
Email: admin@staging.example.com
Password: [See secrets manager]
```

**Regular User:**
```
Email: user@staging.example.com
Password: [See secrets manager]
```

⚠️ **NEVER use staging credentials in production**

---

## Post-Deployment Checklist

**Immediate (0-5 minutes):**
- [ ] Run health check script
- [ ] Verify stats fix with one approve action
- [ ] Check error logs for immediate issues
- [ ] Test critical endpoints

**Short-term (5-30 minutes):**
- [ ] Monitor error rate
- [ ] Check response times
- [ ] Verify database performance
- [ ] Test admin workflow end-to-end

**Medium-term (30-60 minutes):**
- [ ] Monitor memory usage trend
- [ ] Check for slow queries
- [ ] Verify all features working
- [ ] Test rate limiting

**Long-term (1-24 hours):**
- [ ] Monitor uptime
- [ ] Check for memory leaks
- [ ] Review user reports
- [ ] Analyze performance metrics

---

## Version Information

**Current Version:** v1.3.0
**Previous Stable:** v1.2.3
**Deployment Date:** [Fill in]
**Deployed By:** [Fill in]

**Key Changes:**
- Stats endpoint queries `ai_annotation_items` instead of `ai_annotations`
- Immediate stats updates after approve/reject actions
- Enhanced analytics with quality flags

---

## Additional Resources

- **API Documentation:** `/docs/API.md`
- **Database Schema:** `/docs/DATABASE_SCHEMA.md`
- **Deployment Guide:** `/docs/DEPLOYMENT.md`
- **GitHub Issues:** https://github.com/your-org/aves/issues
- **Slack Channel:** #aves-backend-alerts
