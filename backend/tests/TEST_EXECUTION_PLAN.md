# Quality Filtering Test Execution Plan

## Test Summary

**Created:** 2025-11-17
**Total Test Cases:** 47
**Test Suites:** 2 (Unit + Integration)
**Expected Coverage:** >85%

---

## 1. Unit Tests: ImageQualityValidator

**File:** `backend/tests/services/ImageQualityValidator.test.ts`
**Test Cases:** 35

### Test Categories

#### A. Good Images - Should PASS (4 tests)

| Test Case | Image Characteristics | Expected Result |
|-----------|----------------------|-----------------|
| Well-composed large bird | 45% of frame, brightness 150, 95% visible | ✓ PASS (score: 100) |
| Medium bird | 30% of frame, brightness 120, 85% visible | ✓ PASS (score: 100) |
| Minimal acceptable size | 20% of frame, brightness 140, 80% visible | ✓ PASS (score: 100) |
| Well-lit image | 40% of frame, brightness 180, 90% visible | ✓ PASS (score: 100) |

**Expected:** All 4 tests pass with 100% quality score

---

#### B. Bad Images - Should REJECT (6 tests)

| Test Case | Failure Reason | Expected Score |
|-----------|---------------|----------------|
| Bird too small | 8% of frame (min: 15%) | ✗ FAIL (score: <60) |
| Bird too large | 85% of frame (max: 80%) | ✗ FAIL (score: <80) |
| Heavily occluded | 45% visible (min: 60%) | ✗ FAIL (score: <70) |
| Too dark | Brightness 20 (min: 30) | ✗ FAIL (score: <75) |
| Too bright | Brightness 250 (max: 240) | ✗ FAIL (score: <75) |
| Low resolution | 60k pixels (min: 120k) | ✗ FAIL (score: <70) |

**Expected:** All 6 tests fail validation with specific rejection reasons

---

#### C. Edge Cases (6 tests)

| Test Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Multiple birds | 3 birds in frame | Choose largest (35% bird) |
| Bird at left edge | x=0.02 (2% from edge) | Detect edge position |
| Bird at right edge | extends to x=0.98 | Detect edge position |
| Partial visibility | 62% visible (just above min) | ✓ PASS (edge case) |
| Exactly minimum size | 15% bird (at threshold) | ✓ PASS (boundary) |
| Exactly maximum size | 80% bird (at threshold) | ✓ PASS (boundary) |

**Expected:** All edge cases handled correctly

---

#### D. Utility Methods (8 tests)

| Method | Test Cases | Expected |
|--------|-----------|----------|
| `getLargestBird()` | 3 birds, empty array, single bird | Return largest or null |
| `isBirdAtEdge()` | Left, top, right, bottom, center, custom threshold | Correct edge detection |

**Expected:** All utility methods work correctly

---

#### E. Custom Thresholds (3 tests)

| Test Case | Scenario | Expected |
|-----------|----------|----------|
| Constructor with custom thresholds | minBirdSize: 0.25, minBrightness: 50 | Applied correctly |
| Update thresholds | Change minOcclusionRatio to 0.75 | Updated successfully |
| Apply custom thresholds | Image with 20% bird, threshold 25% | Correctly rejected |

**Expected:** Custom thresholds override defaults

---

#### F. Score Calculation (3 tests)

| Test Case | Scenario | Expected Score |
|-----------|----------|----------------|
| Multiple issues | Small bird + dark + occluded | 0-20 (cumulative penalties) |
| Terrible image | All quality issues | 0 (floor enforced) |
| Perfect image | All criteria met | 100 (ceiling enforced) |

**Expected:** Scores calculated correctly with bounds

---

#### G. Missing Metadata (3 tests)

| Test Case | Missing Field | Expected |
|-----------|--------------|----------|
| No bounding box | Only brightness + resolution | ✓ PASS gracefully |
| No brightness | Only bbox + occlusion | ✓ PASS gracefully |
| No occlusion ratio | Only bbox + brightness | ✓ PASS gracefully |

**Expected:** Handle missing metadata without errors

---

## 2. Integration Tests: AI Annotations Quality Filtering

**File:** `backend/tests/routes/aiAnnotations.quality.test.ts`
**Test Cases:** 12

### Test Categories

#### A. Quality Skip Logic (4 tests)

| Test Case | Scenario | Expected Response |
|-----------|----------|-------------------|
| Skip low-quality image | Quality score 45, bird 8% | 400 Bad Request with skip reason |
| Proceed with high-quality | Quality score 100, bird 45% | 202 Accepted, job started |
| Store quality metrics | Quality score 92 | Metrics saved to DB |
| No job for rejected images | Quality failed | No DB record created |

**Expected:** Quality filtering prevents poor image annotation

---

#### B. Analytics Filtering (2 tests)

| Test Case | Scenario | Expected |
|-----------|----------|----------|
| Exclude skipped from analytics | 2 approved, 1 rejected, 2 pending | Total: 4 (excludes rejected) |
| Include rejection statistics | 3 quality rejections | Rejection stats in response |

**Expected:** Analytics exclude quality-rejected images

---

#### C. Quality Metrics Storage (3 tests)

| Test Case | Scenario | Expected |
|-----------|----------|----------|
| Store comprehensive metrics | Score 95, all metrics present | All fields stored correctly |
| Track rejection reasons | 2 reasons: too small + too dark | Reasons logged in DB |
| Verify metrics format | Bird size, brightness, etc. | Correct JSON structure |

**Expected:** Quality data persisted correctly

---

#### D. Error Handling (2 tests)

| Test Case | Scenario | Expected |
|-----------|----------|----------|
| Missing image metadata | No bird bbox | Proceed with partial data |
| Quality check throws error | Service unavailable | Continue annotation, flag failure |

**Expected:** Graceful degradation on errors

---

## 3. Test Fixtures

**File:** `backend/tests/fixtures/imageMetadata.ts`

### Good Images (4 fixtures)
- `goodImageLargeWell` - 1920x1080, 45% bird, brightness 150
- `goodImageMediumBird` - 1200x800, 30% bird, brightness 120
- `goodImageMinimalSize` - 800x600, 20% bird, brightness 140
- `goodImageWellLit` - 1600x1200, 40% bird, brightness 180

### Bad Images (6 fixtures)
- `badImageTooSmall` - 8% bird (below 15% minimum)
- `badImageTooLarge` - 85% bird (above 80% maximum)
- `badImageOccluded` - 45% visible (below 60% minimum)
- `badImageTooDark` - Brightness 20 (below 30 minimum)
- `badImageTooBright` - Brightness 250 (above 240 maximum)
- `badImageLowResolution` - 300x200 (below 400x300 minimum)

### Edge Cases (6 fixtures)
- `edgeCaseMultipleBirds` - 3 birds, use largest
- `edgeCaseBirdAtLeftEdge` - x=0.02, edge detection
- `edgeCaseBirdAtRightEdge` - extends to x=0.98
- `edgeCasePartialVisibility` - 62% visible (just above threshold)
- `edgeCaseExactlyMinimumSize` - 15% bird (at threshold)
- `edgeCaseExactlyMaximumSize` - 80% bird (at threshold)

---

## 4. Execution Instructions

### Run All Tests
```bash
cd /mnt/c/Users/brand/Development/Project_Workspace/active-development/aves/backend
npm test
```

### Run Unit Tests Only
```bash
npm test -- ImageQualityValidator
```

### Run Integration Tests Only
```bash
npm test -- aiAnnotations.quality
```

### Generate Coverage Report
```bash
npm test -- --coverage
```

### Watch Mode (Development)
```bash
npm test -- --watch
```

---

## 5. Expected Results

### Unit Tests
- **Total:** 35 test cases
- **Expected Pass:** 35/35 (100%)
- **Expected Coverage:** >90%
- **Execution Time:** <3 seconds

### Integration Tests
- **Total:** 12 test cases
- **Expected Pass:** 12/12 (100%)
- **Expected Coverage:** >85%
- **Execution Time:** <10 seconds

### Combined Results
- **Total:** 47 test cases
- **Expected Pass:** 47/47 (100%)
- **Overall Coverage:** >85%
- **Total Execution Time:** <30 seconds

---

## 6. Coverage Targets

| Metric | Target | Critical Files |
|--------|--------|----------------|
| Statements | >80% | ImageQualityValidator.ts |
| Branches | >75% | Quality filtering logic |
| Functions | >80% | All public methods |
| Lines | >80% | Core validation code |

---

## 7. Quality Thresholds Tested

| Threshold | Value | Test Coverage |
|-----------|-------|---------------|
| Min Bird Size | 15% | ✓ Below, at, above threshold |
| Max Bird Size | 80% | ✓ Below, at, above threshold |
| Min Brightness | 30 | ✓ Below, at, above threshold |
| Max Brightness | 240 | ✓ Below, at, above threshold |
| Min Occlusion Ratio | 60% | ✓ Below, at, above threshold |
| Min Resolution | 120,000 px | ✓ Below, at, above threshold |

---

## 8. Next Steps After Running Tests

1. **Review Results:**
   - Check for any failing tests
   - Review coverage report
   - Identify gaps in coverage

2. **Fix Issues:**
   - Update implementation if tests reveal bugs
   - Add missing tests for uncovered code
   - Refactor tests for clarity

3. **Document Findings:**
   - Update test documentation
   - Note any edge cases discovered
   - Record performance metrics

4. **Integration:**
   - Add tests to CI/CD pipeline
   - Set up pre-commit hooks
   - Configure coverage reporting

---

## 9. Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Verify connection
psql $DATABASE_URL -c "SELECT 1"
```

**Missing Dependencies:**
```bash
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

**API Key Issues:**
```bash
# Set in .env.test
echo "ANTHROPIC_API_KEY=your-key-here" >> .env.test
```

**Timeout Errors:**
```javascript
// Increase timeout in jest.config.js
testTimeout: 60000 // 60 seconds
```

---

## 10. Success Criteria

✅ All 47 tests pass
✅ Coverage exceeds 85%
✅ No flaky tests (consistent results)
✅ Execution time under 30 seconds
✅ No console errors or warnings
✅ Tests are maintainable and readable

---

## Additional Resources

- [Test Suite README](./README.md)
- [ImageQualityValidator Service](../src/services/ImageQualityValidator.ts)
- [AI Annotations Routes](../src/routes/aiAnnotations.ts)
- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://testingjavascript.com/)
