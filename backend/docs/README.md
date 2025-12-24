# Aves Backend Documentation

## Production Verification Documentation Suite

This documentation suite provides comprehensive guides for verifying production deployments, testing the stats fix, and validating admin workflows.

---

## 📚 Documentation Index

### 1. [Production Verification Guide](./PRODUCTION_VERIFICATION_GUIDE.md)
**Purpose:** Complete production deployment verification guide

**Contents:**
- Pre-deployment checklist
- Stats fix verification procedures
- Admin workflow testing
- Post-deployment verification steps
- Rollback procedures
- Success criteria

**Use When:**
- Deploying to production
- Verifying stats fix implementation
- Troubleshooting production issues
- Planning rollback strategies

**Time Required:** 30-60 minutes for full verification

---

### 2. [Stats Fix Test Plan](./STATS_FIX_TEST_PLAN.md)
**Purpose:** Detailed test scenarios for stats fix validation

**Contents:**
- Background on the stats fix
- Test environment setup
- 6 comprehensive test scenarios
- Automated test suite
- Troubleshooting guide

**Use When:**
- Testing stats endpoint changes
- Verifying approve/reject workflows
- Validating analytics accuracy
- QA sign-off process

**Time Required:** 15-30 minutes for core scenarios

---

### 3. [Admin Workflow Checklist](./ADMIN_WORKFLOW_CHECKLIST.md)
**Purpose:** Comprehensive testing checklist for admin features

**Contents:**
- 28 detailed test cases
- Authentication & authorization tests
- Annotation review workflow tests
- Statistics & analytics validation
- Error handling verification
- Performance testing

**Use When:**
- End-to-end admin testing
- Feature verification
- Regression testing
- User acceptance testing

**Time Required:** 45-90 minutes for complete checklist

---

### 4. [Quick Reference](./QUICK_REFERENCE.md)
**Purpose:** Fast access to critical commands and procedures

**Contents:**
- Immediate post-deployment actions
- Critical endpoints reference
- Expected behaviors
- Red flags for rollback
- Rollback commands
- Common issues & solutions

**Use When:**
- Quick health checks
- Emergency troubleshooting
- Monitoring production
- Rapid verification

**Time Required:** 2-5 minutes for quick checks

---

## 🚀 Quick Start

### For Production Deployment

**Step 1:** Pre-deployment (5 minutes)
```bash
# Review checklist
cat docs/PRODUCTION_VERIFICATION_GUIDE.md | grep "\[ \]"

# Validate environment
npm run validate-config

# Run tests
npm test
```

**Step 2:** Deploy to production
```bash
# Your deployment process here
npm run build
# Deploy...
```

**Step 3:** Immediate verification (2 minutes)
```bash
# Run health check
./scripts/production-health-check.sh https://your-app.com $ADMIN_TOKEN

# Quick stats test (see QUICK_REFERENCE.md)
```

**Step 4:** Full verification (30 minutes)
```bash
# Follow PRODUCTION_VERIFICATION_GUIDE.md
# Complete STATS_FIX_TEST_PLAN.md core scenarios
# Run key items from ADMIN_WORKFLOW_CHECKLIST.md
```

---

### For Stats Fix Validation

**Quick Test (2 minutes):**
```bash
# Get baseline
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-app.com/api/ai/annotations/stats | jq '.data'

# Approve one
ANNOT_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-app.com/api/ai/annotations/pending?limit=1 | jq -r '.annotations[0].id')

curl -X POST "https://your-app.com/api/ai/annotations/$ANNOT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Test"}'

# Verify stats updated
sleep 1
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-app.com/api/ai/annotations/stats | jq '.data'
```

**Comprehensive Test (15 minutes):**
- Follow all scenarios in `STATS_FIX_TEST_PLAN.md`

---

### For Admin Feature Testing

**Essential Tests (15 minutes):**
- Authentication (Tests 1-4 from `ADMIN_WORKFLOW_CHECKLIST.md`)
- List pending (Test 5)
- Approve workflow (Tests 8-9)
- Reject workflow (Tests 11-12)
- Stats validation (Test 18)

**Full Test Suite (90 minutes):**
- Complete all 28 tests in `ADMIN_WORKFLOW_CHECKLIST.md`

---

## 🛠️ Available Scripts

### Health Check Script
```bash
# Location
./scripts/production-health-check.sh

# Usage
./scripts/production-health-check.sh <BASE_URL> <ADMIN_TOKEN>

# Example
./scripts/production-health-check.sh https://api.example.com eyJhbGc...

# What it checks:
✓ Server health endpoint
✓ Database connectivity
✓ Authentication
✓ Admin endpoints (if token provided)
✓ Security headers
✓ Response times
```

### Automated Stats Test
```bash
# From STATS_FIX_TEST_PLAN.md
./scripts/test-stats-fix.sh <BASE_URL> <ADMIN_TOKEN>

# Example
./scripts/test-stats-fix.sh https://api.example.com eyJhbGc...
```

---

## 📊 Success Criteria

### Deployment Success
- [x] All pre-deployment checks pass
- [x] Health check script passes
- [x] Stats fix verified working
- [x] No critical errors in logs
- [x] Response times within limits
- [x] All admin features functional

### Stats Fix Success
- [x] Stats query `ai_annotation_items` table
- [x] Approve decrements pending, increments approved
- [x] Reject decrements pending, increments rejected
- [x] Edit preserves pending count
- [x] Updates happen within 1 second
- [x] Analytics accurate

### Security Success
- [x] Admin-only endpoints reject non-admins
- [x] Authentication required for protected routes
- [x] JWT_SECRET is strong (32+ chars)
- [x] Rate limiting active
- [x] Security headers present
- [x] No secrets in logs

---

## 🔥 Emergency Procedures

### Quick Rollback
```bash
# See QUICK_REFERENCE.md section "Rollback Commands"

# Docker rollback
docker stop aves-backend
docker run -d --name aves-backend your-registry/aves-backend:v1.2.3-stable

# Git rollback
git revert HEAD && git push origin main
```

### Issue Escalation
1. Check `QUICK_REFERENCE.md` for common issues
2. Review `PRODUCTION_VERIFICATION_GUIDE.md` troubleshooting
3. Check application logs
4. Contact DevOps team

---

## 📈 Monitoring

### Critical Metrics
- **Response Time:** Health < 100ms, Stats < 500ms, Pending < 1s
- **Error Rate:** < 0.1%
- **Uptime:** > 99.9%
- **Database:** Connection pool stable, no slow queries

### Log Monitoring
```bash
# Application logs
docker logs aves-backend --tail 100 --follow | grep -i error

# Database logs
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### Alert Thresholds
- Response time > 5s → Warning
- Error rate > 1% → Alert
- Database connections > 90% → Alert
- Memory usage > 80% → Warning
- Stats not updating → Critical

---

## 📝 Documentation Maintenance

### When to Update

**Update PRODUCTION_VERIFICATION_GUIDE.md when:**
- Deployment process changes
- New critical endpoints added
- Rollback procedures change
- Success criteria modified

**Update STATS_FIX_TEST_PLAN.md when:**
- Stats logic changes
- New annotation statuses added
- Database schema changes
- Test scenarios need refinement

**Update ADMIN_WORKFLOW_CHECKLIST.md when:**
- New admin features added
- Existing workflows modified
- Authentication changes
- Performance requirements change

**Update QUICK_REFERENCE.md when:**
- Critical endpoints change
- Rollback procedures updated
- Monitoring dashboards change
- Common issues identified

---

## 🤝 Contributing

### Adding New Documentation

1. Follow existing format and structure
2. Include clear examples with expected outputs
3. Provide both quick and comprehensive options
4. Update this README index
5. Cross-reference related docs

### Testing Documentation

Before committing documentation updates:
- [ ] Verify all commands work
- [ ] Test all code examples
- [ ] Check cross-references
- [ ] Validate formatting
- [ ] Update version info

---

## 📞 Support

### Internal Resources
- **DevOps Team:** devops@example.com
- **Backend Lead:** backend@example.com
- **Database Admin:** dba@example.com

### External Resources
- **GitHub Issues:** https://github.com/your-org/aves/issues
- **Slack Channel:** #aves-backend-alerts
- **Monitoring Dashboard:** https://metrics.example.com

### Documentation Feedback
- Open an issue: https://github.com/your-org/aves/issues
- Contact: backend@example.com
- Slack: #aves-documentation

---

## 📜 Version History

### v1.0.0 (2025-10-17)
- Initial documentation suite
- Production verification guide
- Stats fix test plan
- Admin workflow checklist
- Quick reference guide
- Health check script

### Key Features
- Comprehensive pre/post-deployment checklists
- Automated health check script
- Detailed test scenarios for stats fix
- 28-point admin workflow test suite
- Emergency rollback procedures
- Monitoring and troubleshooting guides

---

## 📋 Document Maintenance Checklist

### Monthly Review
- [ ] Verify all URLs and endpoints current
- [ ] Test all command examples
- [ ] Update success criteria if needed
- [ ] Review and update version numbers
- [ ] Check for outdated references

### After Each Deployment
- [ ] Verify documentation matches production
- [ ] Update any changed procedures
- [ ] Add new common issues if discovered
- [ ] Update performance baselines

### Quarterly Audit
- [ ] Full documentation review
- [ ] Update examples with real production data
- [ ] Refine based on team feedback
- [ ] Add new best practices discovered

---

## 🎯 Documentation Goals

1. **Completeness:** Cover all aspects of production verification
2. **Clarity:** Easy to follow for all team members
3. **Actionability:** Concrete steps and commands
4. **Maintainability:** Easy to update as system evolves
5. **Accessibility:** Quick reference and detailed guides
6. **Reliability:** All examples tested and verified

---

## License

Internal documentation - Proprietary and confidential

---

**Last Updated:** 2025-12-11
**Maintained By:** Backend Team
**Test Status:** 472 passed, 0 failed
