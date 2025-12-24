# Stats Fix Test Plan

## Overview
This document provides detailed test scenarios for verifying the stats fix that changes the `/api/ai/annotations/stats` endpoint to query from `ai_annotation_items` instead of `ai_annotations` job table.

## Background

### The Problem
Previously, the stats endpoint queried the `ai_annotations` table, which stores job-level records. When individual annotations were approved or rejected, the stats would not update because:
- Job-level status remained "pending"
- Individual item-level status changes weren't reflected

### The Solution
The fix changes stats queries to use `ai_annotation_items` table, which tracks individual annotations with their actual status (pending, approved, rejected, edited).

## Test Environment Setup

### Prerequisites
1. Admin account with authentication token
2. Access to production or staging environment
3. `curl` and `jq` installed for testing
4. At least 10 pending AI annotations in the system

### Get Admin Token
```bash
# Login as admin
curl -X POST "https://your-app-url.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }' | jq -r '.token'

# Save token for later use
export ADMIN_TOKEN="<token-from-above>"
```

## Test Scenarios

### Scenario 1: Baseline Stats Check

**Objective:** Verify stats endpoint returns correct initial counts

**Steps:**
```bash
# Get current stats
curl -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data'
```

**Expected Response:**
```json
{
  "data": {
    "total": 68,
    "pending": 68,
    "approved": 0,
    "rejected": 0,
    "edited": 0,
    "avgConfidence": "0.85",
    "recentActivity": [...]
  }
}
```

**Validation:**
- [ ] Response has `data` wrapper object
- [ ] `total` = `pending` + `approved` + `rejected` + `edited`
- [ ] All counts are non-negative integers
- [ ] `avgConfidence` is a decimal string (0.00-1.00)
- [ ] `recentActivity` is an array

---

### Scenario 2: Single Approval Updates Stats

**Objective:** Verify stats update correctly after approving one annotation

**Steps:**

```bash
# Step 1: Record initial stats
INITIAL_STATS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

INITIAL_PENDING=$(echo "$INITIAL_STATS" | jq -r '.data.pending')
INITIAL_APPROVED=$(echo "$INITIAL_STATS" | jq -r '.data.approved')

echo "Initial pending: $INITIAL_PENDING"
echo "Initial approved: $INITIAL_APPROVED"

# Step 2: Get a pending annotation ID
ANNOTATION_ID=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq -r '.annotations[0].id')

echo "Testing with annotation ID: $ANNOTATION_ID"

# Step 3: Approve the annotation
curl -X POST "https://your-app-url.com/api/ai/annotations/$ANNOTATION_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Test approval - stats fix verification"}'

# Step 4: Get updated stats
sleep 1  # Allow transaction to commit
UPDATED_STATS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

UPDATED_PENDING=$(echo "$UPDATED_STATS" | jq -r '.data.pending')
UPDATED_APPROVED=$(echo "$UPDATED_STATS" | jq -r '.data.approved')

echo "Updated pending: $UPDATED_PENDING"
echo "Updated approved: $UPDATED_APPROVED"

# Step 5: Verify changes
PENDING_DIFF=$((INITIAL_PENDING - UPDATED_PENDING))
APPROVED_DIFF=$((UPDATED_APPROVED - INITIAL_APPROVED))

if [ "$PENDING_DIFF" -eq 1 ] && [ "$APPROVED_DIFF" -eq 1 ]; then
  echo "✓ PASS: Stats updated correctly"
else
  echo "✗ FAIL: Stats did not update as expected"
  echo "  Pending decreased by: $PENDING_DIFF (expected: 1)"
  echo "  Approved increased by: $APPROVED_DIFF (expected: 1)"
fi
```

**Expected Behavior:**
- [ ] `pending` count decreases by exactly 1
- [ ] `approved` count increases by exactly 1
- [ ] `total` count remains unchanged
- [ ] `rejected` count remains unchanged
- [ ] Response time < 500ms

**Rollback (Optional):**
```bash
# If needed, delete the approved annotation to restore test state
# Note: This requires direct database access
psql $DATABASE_URL -c "DELETE FROM annotations WHERE id = '<approved-annotation-id>'"
psql $DATABASE_URL -c "UPDATE ai_annotation_items SET status = 'pending', approved_annotation_id = NULL WHERE id = '$ANNOTATION_ID'"
```

---

### Scenario 3: Single Rejection Updates Stats

**Objective:** Verify stats update correctly after rejecting one annotation

**Steps:**

```bash
# Step 1: Record initial stats
INITIAL_STATS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

INITIAL_PENDING=$(echo "$INITIAL_STATS" | jq -r '.data.pending')
INITIAL_REJECTED=$(echo "$INITIAL_STATS" | jq -r '.data.rejected')

# Step 2: Get a pending annotation
ANNOTATION_ID=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq -r '.annotations[0].id')

# Step 3: Reject with category
curl -X POST "https://your-app-url.com/api/ai/annotations/$ANNOTATION_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "INCORRECT_BBOX",
    "notes": "Bounding box does not match anatomical feature"
  }'

# Step 4: Verify stats updated
sleep 1
UPDATED_STATS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

UPDATED_PENDING=$(echo "$UPDATED_STATS" | jq -r '.data.pending')
UPDATED_REJECTED=$(echo "$UPDATED_STATS" | jq -r '.data.rejected')

echo "Pending: $INITIAL_PENDING → $UPDATED_PENDING"
echo "Rejected: $INITIAL_REJECTED → $UPDATED_REJECTED"

# Verify
if [ $((INITIAL_PENDING - UPDATED_PENDING)) -eq 1 ] && \
   [ $((UPDATED_REJECTED - INITIAL_REJECTED)) -eq 1 ]; then
  echo "✓ PASS: Rejection stats updated correctly"
else
  echo "✗ FAIL: Stats did not update as expected"
fi
```

**Expected Behavior:**
- [ ] `pending` decreases by 1
- [ ] `rejected` increases by 1
- [ ] `total` remains unchanged
- [ ] Category stored in review notes as `[INCORRECT_BBOX] ...`

---

### Scenario 4: Bulk Approval Updates Stats

**Objective:** Verify stats update correctly after bulk approving multiple annotations

**Steps:**

```bash
# Step 1: Get initial stats
INITIAL_STATS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
INITIAL_PENDING=$(echo "$INITIAL_STATS" | jq -r '.data.pending')
INITIAL_APPROVED=$(echo "$INITIAL_STATS" | jq -r '.data.approved')

# Step 2: Get 5 pending annotations and collect job IDs
JOB_IDS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/pending?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq -r '[.annotations[].id] | unique')

echo "Job IDs for bulk approval: $JOB_IDS"

# Step 3: Bulk approve (Note: This endpoint approves by job_id, not annotation item id)
# For testing individual item bulk approval, you'd need to approve each individually
# or create a custom bulk endpoint for annotation items

# Alternative: Approve 5 annotations individually and measure cumulative effect
ANNOTATIONS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/pending?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq -r '.annotations[].id')

COUNT=0
for ANNOT_ID in $ANNOTATIONS; do
  curl -s -X POST "https://your-app-url.com/api/ai/annotations/$ANNOT_ID/approve" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"notes": "Bulk approval test"}' > /dev/null
  ((COUNT++))
done

echo "Approved $COUNT annotations"

# Step 4: Verify stats
sleep 2
UPDATED_STATS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
UPDATED_PENDING=$(echo "$UPDATED_STATS" | jq -r '.data.pending')
UPDATED_APPROVED=$(echo "$UPDATED_STATS" | jq -r '.data.approved')

PENDING_DIFF=$((INITIAL_PENDING - UPDATED_PENDING))
APPROVED_DIFF=$((UPDATED_APPROVED - INITIAL_APPROVED))

echo "Pending decreased by: $PENDING_DIFF (expected: $COUNT)"
echo "Approved increased by: $APPROVED_DIFF (expected: $COUNT)"

if [ "$PENDING_DIFF" -eq "$COUNT" ] && [ "$APPROVED_DIFF" -eq "$COUNT" ]; then
  echo "✓ PASS: Bulk approval stats correct"
else
  echo "✗ FAIL: Stats mismatch"
fi
```

**Expected Behavior:**
- [ ] `pending` decreases by number of approved items
- [ ] `approved` increases by number of approved items
- [ ] All operations complete without errors
- [ ] Total time < 5 seconds for 5 approvals

---

### Scenario 5: Edit Without Approval Preserves Status

**Objective:** Verify that PATCH (edit without approval) keeps annotation in pending state

**Steps:**

```bash
# Step 1: Get initial stats
INITIAL_PENDING=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.pending')

# Step 2: Get an annotation to edit
ANNOTATION=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.annotations[0]')

ANNOTATION_ID=$(echo "$ANNOTATION" | jq -r '.id')
ORIGINAL_BBOX=$(echo "$ANNOTATION" | jq '.boundingBox')

echo "Editing annotation: $ANNOTATION_ID"
echo "Original bbox: $ORIGINAL_BBOX"

# Step 3: Edit bounding box only
curl -X PATCH "https://your-app-url.com/api/ai/annotations/$ANNOTATION_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "boundingBox": {
      "x": 0.45,
      "y": 0.35,
      "width": 0.15,
      "height": 0.12
    }
  }'

# Step 4: Verify stats unchanged
sleep 1
UPDATED_PENDING=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.pending')

echo "Pending before edit: $INITIAL_PENDING"
echo "Pending after edit: $UPDATED_PENDING"

if [ "$INITIAL_PENDING" -eq "$UPDATED_PENDING" ]; then
  echo "✓ PASS: Pending count preserved after edit"
else
  echo "✗ FAIL: Pending count changed unexpectedly"
fi

# Step 5: Verify annotation still in pending list with updated bbox
UPDATED_ANNOTATION=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/pending?limit=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq ".annotations[] | select(.id == \"$ANNOTATION_ID\")")

UPDATED_BBOX=$(echo "$UPDATED_ANNOTATION" | jq '.boundingBox')
echo "Updated bbox: $UPDATED_BBOX"

if [ "$UPDATED_BBOX" != "$ORIGINAL_BBOX" ]; then
  echo "✓ PASS: Bounding box updated successfully"
else
  echo "✗ FAIL: Bounding box not updated"
fi
```

**Expected Behavior:**
- [ ] `pending` count unchanged
- [ ] `approved` count unchanged
- [ ] Annotation still appears in pending list
- [ ] Bounding box changes visible in next GET request

---

### Scenario 6: Edit and Approve Sets Status to 'edited'

**Objective:** Verify POST /edit endpoint approves with 'edited' status

**Steps:**

```bash
# Get annotation
ANNOTATION_ID=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.annotations[0].id')

# Record initial counts
INITIAL_STATS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data')
INITIAL_PENDING=$(echo "$INITIAL_STATS" | jq -r '.pending')
INITIAL_EDITED=$(echo "$INITIAL_STATS" | jq -r '.edited // 0')

# Edit and approve
curl -X POST "https://your-app-url.com/api/ai/annotations/$ANNOTATION_ID/edit" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spanishTerm": "el pico modificado",
    "notes": "Corrected terminology"
  }'

# Verify stats
sleep 1
UPDATED_STATS=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data')

echo "Before: pending=$INITIAL_PENDING, edited=$INITIAL_EDITED"
echo "After: pending=$(echo "$UPDATED_STATS" | jq -r '.pending'), edited=$(echo "$UPDATED_STATS" | jq -r '.edited // 0')"
```

**Expected Behavior:**
- [ ] `pending` decreases by 1
- [ ] `edited` count increases by 1 (if tracked separately)
- [ ] Annotation no longer in pending list
- [ ] Edited values saved to main annotations table

---

## Analytics Endpoint Tests

### Test 1: Analytics Structure Validation

```bash
curl -X GET "https://your-app-url.com/api/annotations/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.'
```

**Validate Response Contains:**
- [ ] `overview` object with total, pending, approved, rejected, avgConfidence
- [ ] `bySpecies` object with species names as keys
- [ ] `byType` object with annotation types
- [ ] `rejectionsByCategory` object
- [ ] `qualityFlags` object with tooSmall and lowConfidence counts

### Test 2: Quality Flags Accuracy

**Objective:** Verify quality flags are calculated correctly

```bash
# Get analytics
ANALYTICS=$(curl -s -X GET "https://your-app-url.com/api/annotations/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOO_SMALL=$(echo "$ANALYTICS" | jq -r '.qualityFlags.tooSmall')
LOW_CONFIDENCE=$(echo "$ANALYTICS" | jq -r '.qualityFlags.lowConfidence')

echo "Quality flags:"
echo "  Too small (< 2% area): $TOO_SMALL"
echo "  Low confidence (< 70%): $LOW_CONFIDENCE"

# Manually verify a few samples
PENDING=$(curl -s -X GET "https://your-app-url.com/api/ai/annotations/pending?limit=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.annotations')

echo "$PENDING" | jq '.[] | select(.boundingBox.width * .boundingBox.height < 0.02) | {id, bbox: .boundingBox}'
echo "$PENDING" | jq '.[] | select(.confidenceScore < 0.70) | {id, confidence: .confidenceScore}'
```

**Expected:**
- [ ] Counts match manual filtering
- [ ] Calculation considers both width and height
- [ ] Confidence threshold is 0.70 (70%)

---

## Automated Test Suite

For CI/CD integration, here's a complete test script:

```bash
#!/bin/bash
# Save as: scripts/test-stats-fix.sh

set -e

BASE_URL="${1:-http://localhost:3001}"
ADMIN_TOKEN="$2"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Usage: $0 <BASE_URL> <ADMIN_TOKEN>"
  exit 1
fi

echo "Testing stats fix on: $BASE_URL"

# Test 1: Baseline stats
echo "Test 1: Baseline stats..."
INITIAL=$(curl -s -X GET "$BASE_URL/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.pending')
echo "  Initial pending: $INITIAL"

# Test 2: Approve one
echo "Test 2: Single approval..."
ANNOT_ID=$(curl -s -X GET "$BASE_URL/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.annotations[0].id')

curl -s -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Test"}' > /dev/null

sleep 1
AFTER_APPROVE=$(curl -s -X GET "$BASE_URL/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.pending')

if [ "$AFTER_APPROVE" -eq $((INITIAL - 1)) ]; then
  echo "  ✓ PASS"
else
  echo "  ✗ FAIL: Expected pending=$((INITIAL - 1)), got $AFTER_APPROVE"
  exit 1
fi

# Test 3: Reject one
echo "Test 3: Single rejection..."
ANNOT_ID=$(curl -s -X GET "$BASE_URL/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.annotations[0].id')

curl -s -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "TEST", "notes": "Test rejection"}' > /dev/null

sleep 1
AFTER_REJECT=$(curl -s -X GET "$BASE_URL/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.pending')

if [ "$AFTER_REJECT" -eq $((AFTER_APPROVE - 1)) ]; then
  echo "  ✓ PASS"
else
  echo "  ✗ FAIL"
  exit 1
fi

echo ""
echo "All tests passed!"
```

---

## Troubleshooting

### Stats Not Updating

**Symptom:** Stats counts don't change after approve/reject

**Checks:**
1. Verify database transaction committed:
   ```sql
   SELECT status, COUNT(*) FROM ai_annotation_items GROUP BY status;
   ```

2. Check for caching issues (should not exist, but verify):
   ```bash
   curl -H "Cache-Control: no-cache" ...
   ```

3. Verify correct table being queried:
   ```bash
   # Should say "ai_annotation_items" not "ai_annotations"
   grep -n "ai_annotation_items" src/routes/aiAnnotations.ts
   ```

### Wrong Counts Returned

**Symptom:** Counts don't match database reality

**Diagnosis:**
```sql
-- Manual count verification
SELECT
  status,
  COUNT(*) as count
FROM ai_annotation_items
GROUP BY status;

-- Compare to API response
```

### Response Time Issues

**Symptom:** Stats endpoint takes > 2 seconds

**Optimization:**
```sql
-- Add index if missing
CREATE INDEX IF NOT EXISTS idx_ai_annotation_items_status ON ai_annotation_items(status);

-- Check query performance
EXPLAIN ANALYZE
SELECT status, COUNT(*) as count
FROM ai_annotation_items
GROUP BY status;
```

---

## Sign-Off Checklist

After completing all tests, verify:

- [ ] All scenarios pass
- [ ] Stats update in < 500ms
- [ ] No database errors in logs
- [ ] Approve workflow works correctly
- [ ] Reject workflow works correctly
- [ ] Edit workflow preserves pending status
- [ ] Bulk operations update stats correctly
- [ ] Analytics endpoint returns valid data
- [ ] Quality flags calculated correctly
- [ ] Admin authentication enforced
- [ ] No memory leaks during repeated operations

**Tested by:** ___________________
**Date:** ___________________
**Environment:** ___________________
**Sign-off:** ___________________
