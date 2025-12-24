# Admin Workflow Testing Checklist

## Overview
This checklist provides a comprehensive guide for testing admin features in the Aves annotation review system on the deployed production application.

---

## Pre-Testing Setup

### 1. Admin Account Access
- [ ] Obtain admin credentials
- [ ] Login to application
- [ ] Verify admin role assignment
- [ ] Save authentication token for API testing

### 2. Test Data Preparation
- [ ] Ensure at least 10 pending AI annotations exist
- [ ] Verify annotations span multiple species
- [ ] Confirm variety of annotation types (anatomical, behavioral, etc.)
- [ ] Check that some annotations have quality flags (too small, low confidence)

### 3. Tools Setup
```bash
# Install required tools
which curl jq || echo "Install curl and jq"

# Set environment variables
export BASE_URL="https://your-production-url.com"
export ADMIN_TOKEN="your-admin-jwt-token"

# Verify connectivity
curl -s "$BASE_URL/health" | jq
```

---

## Authentication & Authorization Testing

### Admin Access Control

#### Test 1: Admin Login
```bash
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }' | jq
```

**Expected:**
- [ ] HTTP 200 OK
- [ ] Token returned
- [ ] User object contains admin email
- [ ] Token valid for 24 hours

**Failure Cases:**
- [ ] Wrong password returns 401
- [ ] Non-existent email returns 401
- [ ] Missing credentials returns 400

---

#### Test 2: Admin Endpoint Access
```bash
# Test with admin token
curl -X GET "$BASE_URL/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: 200 OK with stats data
```

**Verify:**
- [ ] Admin can access `/api/ai/annotations/*`
- [ ] Admin can access `/api/annotations/analytics`
- [ ] Admin receives full data, not filtered

---

#### Test 3: Non-Admin Rejection
```bash
# Create regular user
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "ValidPassword123"
  }' | jq -r '.token'

USER_TOKEN="<token-from-above>"

# Try accessing admin endpoint
curl -X GET "$BASE_URL/api/ai/annotations/stats" \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected: 403 Forbidden
```

**Verify:**
- [ ] Regular users get 403 Forbidden
- [ ] Error message indicates insufficient permissions
- [ ] No data leakage in error response

---

#### Test 4: Unauthenticated Rejection
```bash
curl -X GET "$BASE_URL/api/ai/annotations/stats"

# Expected: 401 Unauthorized
```

**Verify:**
- [ ] No token returns 401
- [ ] Invalid token returns 401
- [ ] Expired token returns 401

---

## Annotation Review Workflow

### Pending Annotations Management

#### Test 5: List Pending Annotations
```bash
curl -X GET "$BASE_URL/api/ai/annotations/pending?limit=10&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Verify Response Structure:**
- [ ] `annotations` array present
- [ ] `total` count accurate
- [ ] `limit` matches request
- [ ] `offset` matches request
- [ ] `status` is "pending"

**Verify Each Annotation:**
- [ ] Has `id` (UUID format)
- [ ] Has `imageId` (UUID format)
- [ ] Has `imageUrl` (valid URL)
- [ ] Has `spanishTerm` (non-empty string)
- [ ] Has `englishTerm` (non-empty string)
- [ ] Has `boundingBox` with correct format:
  ```json
  {
    "topLeft": {"x": 0.1, "y": 0.2},
    "bottomRight": {"x": 0.3, "y": 0.4},
    "width": 0.2,
    "height": 0.2
  }
  ```
- [ ] Has `type` (anatomical, behavioral, color, pattern)
- [ ] Has `difficultyLevel` (1-5)
- [ ] Has `confidenceScore` (0-1)
- [ ] Has `status` = "pending"
- [ ] Has `aiGenerated` = true
- [ ] Has `createdAt` timestamp
- [ ] Has `updatedAt` timestamp

---

#### Test 6: Pagination
```bash
# Page 1
curl -s -X GET "$BASE_URL/api/ai/annotations/pending?limit=5&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.annotations | length'

# Expected: 5 (or less if fewer exist)

# Page 2
curl -s -X GET "$BASE_URL/api/ai/annotations/pending?limit=5&offset=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.annotations | length'

# Verify different annotations
```

**Verify:**
- [ ] Offset controls starting position
- [ ] Limit controls page size
- [ ] No duplicate annotations across pages
- [ ] Total count consistent across pages

---

#### Test 7: Filter by Status
```bash
# Pending
curl -s "$BASE_URL/api/ai/annotations/pending?status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.status'

# Expected: "pending"

# Approved
curl -s "$BASE_URL/api/ai/annotations/pending?status=approved" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.status'

# Expected: "approved"
```

**Verify:**
- [ ] Status filter works
- [ ] Only matching status returned
- [ ] Total count reflects filter

---

### Annotation Approval

#### Test 8: Single Approval Without Notes
```bash
# Get annotation ID
ANNOT_ID=$(curl -s "$BASE_URL/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.annotations[0].id')

# Approve
curl -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

**Expected Response:**
```json
{
  "message": "Annotation approved successfully",
  "annotationId": "550e8400-e29b-41d4-a716-446655440000",
  "approvedAnnotationId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Verify:**
- [ ] HTTP 200 OK
- [ ] `annotationId` matches request
- [ ] `approvedAnnotationId` is new UUID
- [ ] Annotation removed from pending list
- [ ] Annotation added to main `annotations` table
- [ ] AI annotation item status = "approved"
- [ ] Review recorded in `ai_annotation_reviews`

---

#### Test 9: Approval With Notes
```bash
curl -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Excellent annotation quality, perfect bounding box"
  }' | jq
```

**Verify:**
- [ ] Notes stored in review record
- [ ] Notes retrievable via review history
- [ ] Approval succeeds same as without notes

---

#### Test 10: Approve Already Processed Annotation
```bash
# Try approving same annotation twice
curl -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

**Expected:**
- [ ] HTTP 404 Not Found
- [ ] Error: "Annotation not found or already processed"
- [ ] No duplicate entry in main table

---

### Annotation Rejection

#### Test 11: Rejection With Category and Notes
```bash
ANNOT_ID=$(curl -s "$BASE_URL/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.annotations[0].id')

curl -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "INCORRECT_BBOX",
    "notes": "Bounding box does not accurately capture the anatomical feature"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "Annotation rejected successfully",
  "annotationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Verify:**
- [ ] HTTP 200 OK
- [ ] Status updated to "rejected"
- [ ] Category stored as "[INCORRECT_BBOX] Bounding box does not..."
- [ ] Review action recorded
- [ ] Annotation NOT in main table
- [ ] Annotation removed from pending list

---

#### Test 12: Rejection Categories
Test each rejection category:

```bash
# TOO_SMALL
curl -X POST "$BASE_URL/api/ai/annotations/<id>/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "TOO_SMALL", "notes": "Bounding box < 2% of image"}'

# NOT_REPRESENTATIVE
curl -X POST "$BASE_URL/api/ai/annotations/<id>/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "NOT_REPRESENTATIVE", "notes": "Feature not visible"}'

# INCORRECT_TERM
curl -X POST "$BASE_URL/api/ai/annotations/<id>/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "INCORRECT_TERM", "notes": "Wrong Spanish terminology"}'

# LOW_QUALITY
curl -X POST "$BASE_URL/api/ai/annotations/<id>/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "LOW_QUALITY", "notes": "Blurry image"}'
```

**Verify:**
- [ ] All categories accepted
- [ ] Category properly formatted in notes
- [ ] Retrievable via analytics endpoint

---

#### Test 13: Rejection Without Category (Backwards Compat)
```bash
curl -X POST "$BASE_URL/api/ai/annotations/<id>/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Generic rejection reason"
  }'
```

**Verify:**
- [ ] Legacy `reason` field still works
- [ ] Notes stored correctly
- [ ] No validation error

---

### Annotation Editing

#### Test 14: Edit Without Approval (PATCH)
```bash
ANNOT=$(curl -s "$BASE_URL/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.annotations[0]')

ANNOT_ID=$(echo "$ANNOT" | jq -r '.id')

# Edit bounding box
curl -X PATCH "$BASE_URL/api/ai/annotations/$ANNOT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "boundingBox": {
      "x": 0.45,
      "y": 0.35,
      "width": 0.15,
      "height": 0.12
    }
  }' | jq
```

**Expected:**
```json
{
  "message": "Annotation updated successfully",
  "annotationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Verify:**
- [ ] HTTP 200 OK
- [ ] Status remains "pending"
- [ ] Bounding box updated in storage
- [ ] Annotation still in pending list
- [ ] Changes visible in next GET request

---

#### Test 15: Edit Multiple Fields
```bash
curl -X PATCH "$BASE_URL/api/ai/annotations/$ANNOT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spanishTerm": "el pico modificado",
    "englishTerm": "modified beak",
    "pronunciation": "el PEE-koh moh-dee-fee-KAH-doh",
    "difficultyLevel": 3
  }' | jq
```

**Verify:**
- [ ] All fields updated
- [ ] Status still "pending"
- [ ] Changes persisted correctly

---

#### Test 16: Edit and Approve (POST /edit)
```bash
curl -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/edit" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spanishTerm": "el ala",
    "englishTerm": "wing",
    "notes": "Corrected term from pico to ala"
  }' | jq
```

**Expected:**
```json
{
  "message": "Annotation edited and approved successfully",
  "annotationId": "550e8400-e29b-41d4-a716-446655440000",
  "approvedAnnotationId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Verify:**
- [ ] Edited values saved to main table
- [ ] Status set to "edited"
- [ ] Review action = "edit"
- [ ] Notes stored
- [ ] Annotation removed from pending

---

### Bulk Operations

#### Test 17: Bulk Approve (Job-based)
```bash
# Get job IDs (note: bulk approve works on jobs, not individual items)
JOB_IDS=$(curl -s "$BASE_URL/api/ai/annotations/pending?limit=3" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq -r '[.annotations[].id] | unique')

curl -X POST "$BASE_URL/api/ai/annotations/batch/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"jobIds\": $JOB_IDS,
    \"notes\": \"Bulk approval of high-confidence annotations\"
  }" | jq
```

**Expected:**
```json
{
  "message": "Batch approval completed",
  "approved": 12,
  "failed": 0,
  "details": [...]
}
```

**Verify:**
- [ ] All items approved
- [ ] No failures
- [ ] Stats updated correctly
- [ ] Review records created

---

## Statistics & Analytics

### Stats Endpoint

#### Test 18: Stats Endpoint Structure
```bash
curl -X GET "$BASE_URL/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Expected Response:**
```json
{
  "data": {
    "total": 150,
    "pending": 42,
    "approved": 95,
    "rejected": 13,
    "edited": 0,
    "avgConfidence": "0.87",
    "recentActivity": [
      {
        "action": "approve",
        "affectedItems": 1,
        "createdAt": "2025-10-17T12:00:00Z",
        "reviewerEmail": "admin@example.com"
      }
    ]
  }
}
```

**Verify:**
- [ ] `data` wrapper present
- [ ] All counts are integers ≥ 0
- [ ] `total` = sum of status counts
- [ ] `avgConfidence` is decimal string
- [ ] `recentActivity` is array (max 10 items)
- [ ] Each activity has action, affectedItems, createdAt, reviewerEmail

---

#### Test 19: Stats Update After Actions
```bash
# Record before
BEFORE=$(curl -s "$BASE_URL/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data')

echo "Before: $BEFORE"

# Perform action (approve one)
ANNOT_ID=$(curl -s "$BASE_URL/api/ai/annotations/pending?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.annotations[0].id')

curl -s -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null

# Record after
sleep 1
AFTER=$(curl -s "$BASE_URL/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data')

echo "After: $AFTER"
```

**Verify:**
- [ ] `pending` decreased by 1
- [ ] `approved` increased by 1
- [ ] `total` unchanged
- [ ] New entry in `recentActivity`

---

### Analytics Endpoint

#### Test 20: Analytics Overview
```bash
curl -X GET "$BASE_URL/api/annotations/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.overview'
```

**Expected:**
```json
{
  "total": 68,
  "pending": 68,
  "approved": 0,
  "rejected": 0,
  "avgConfidence": "0.85"
}
```

**Verify:**
- [ ] Matches stats endpoint
- [ ] All counts accurate

---

#### Test 21: Analytics By Species
```bash
curl -X GET "$BASE_URL/api/annotations/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.bySpecies'
```

**Expected:**
```json
{
  "Mallard Duck": 12,
  "Northern Cardinal": 8,
  "American Robin": 6
}
```

**Verify:**
- [ ] Species names as keys
- [ ] Counts as values
- [ ] Sorted by count DESC
- [ ] Only pending annotations counted

---

#### Test 22: Analytics By Type
```bash
curl -X GET "$BASE_URL/api/annotations/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.byType'
```

**Expected:**
```json
{
  "anatomical": 45,
  "behavioral": 12,
  "color": 8,
  "pattern": 3
}
```

**Verify:**
- [ ] All annotation types present
- [ ] Counts sum to total pending
- [ ] Sorted by count DESC

---

#### Test 23: Rejections By Category
```bash
curl -X GET "$BASE_URL/api/annotations/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.rejectionsByCategory'
```

**Expected:**
```json
{
  "INCORRECT_BBOX": 5,
  "TOO_SMALL": 3,
  "LOW_QUALITY": 2,
  "NOT_REPRESENTATIVE": 1
}
```

**Verify:**
- [ ] Categories parsed from notes
- [ ] Format: `[CATEGORY] notes`
- [ ] Counts accurate

---

#### Test 24: Quality Flags
```bash
curl -X GET "$BASE_URL/api/annotations/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.qualityFlags'
```

**Expected:**
```json
{
  "tooSmall": 8,
  "lowConfidence": 3
}
```

**Verify:**
- [ ] `tooSmall` = annotations with bbox area < 0.02
- [ ] `lowConfidence` = annotations with confidence < 0.70
- [ ] Calculations accurate

---

## Error Handling

#### Test 25: Invalid Annotation ID
```bash
curl -X POST "$BASE_URL/api/ai/annotations/00000000-0000-0000-0000-000000000000/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**
- [ ] HTTP 404 Not Found
- [ ] Error message clear

---

#### Test 26: Malformed Request Body
```bash
curl -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

**Expected:**
- [ ] HTTP 400 Bad Request
- [ ] JSON parse error

---

#### Test 27: Missing Required Fields
```bash
curl -X POST "$BASE_URL/api/ai/annotations/$ANNOT_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**
- [ ] HTTP 400 Bad Request
- [ ] Validation error: "At least one of category, reason, or notes must be provided"

---

## Performance Testing

#### Test 28: Response Time Limits
```bash
# Stats endpoint
time curl -s "$BASE_URL/api/ai/annotations/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

# Expected: < 500ms

# Pending list
time curl -s "$BASE_URL/api/ai/annotations/pending?limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

# Expected: < 1000ms

# Analytics
time curl -s "$BASE_URL/api/annotations/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

# Expected: < 1500ms
```

**Verify:**
- [ ] All requests within time limits
- [ ] No timeout errors
- [ ] Consistent performance

---

## Sign-Off

After completing all tests:

**Environment:** ___________________
**Date:** ___________________
**Tested By:** ___________________

### Summary
- Total Tests: 28
- Passed: _____
- Failed: _____
- Blocked: _____

### Issues Found
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Recommendations
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

**Ready for Production:** [ ] Yes [ ] No

**Sign-Off:** ___________________
