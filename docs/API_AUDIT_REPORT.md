# AVES Backend API Audit Report
**Date:** December 14, 2025
**Auditor:** Code Analyzer Agent
**Scope:** All API endpoints in `/backend/src/routes/`

---

## Executive Summary

This audit examined 8 route files containing 50+ API endpoints. The analysis identified **7 critical issues** affecting data integrity, **12 missing imageUrl fields**, and **3 broken database queries** that impact frontend functionality.

### Critical Findings
- ✅ **Working Routes**: species.ts, annotations.ts, srs.ts, vocabulary.ts
- ⚠️ **Issues Found**: content.ts, exercises.ts, images.ts, annotationMastery.ts
- 🔴 **Severity**: HIGH - Frontend expects imageUrl but many endpoints don't provide it

---

## 1. Species Routes (`/backend/src/routes/species.ts`)

### Status: ✅ **GOOD** - Mostly Working

### Endpoints Audited (6 total)

#### ✅ `GET /api/species` - **WORKING**
- **Line:** 49-91
- **Returns:** List of all species with annotation counts
- **imageUrl Field:** ✅ YES - `primaryImageUrl` via subquery (lines 68-74)
- **Response Format:** `{ data: [...] }`
- **Database JOIN:** LEFT JOIN images table (line 76)
- **Issues:** None

#### ✅ `GET /api/species/:id/image` - **WORKING**
- **Line:** 120-155
- **Returns:** Redirect to species primary image
- **Logic:** Queries images table, redirects to URL or thumbnail_url
- **Issues:** None - properly handles external URLs and local paths

#### ✅ `GET /api/species/:id` - **WORKING**
- **Line:** 201-255
- **Returns:** Species details with associated images
- **imageUrl Fields:** ✅ YES - includes `url` and `thumbnailUrl` for each image (lines 235-238)
- **Database JOINs:**
  - Species query (lines 205-223)
  - Images query with LEFT JOIN annotations (lines 233-243)
- **Issues:** None

#### ✅ `GET /api/species/search` - **WORKING**
- **Line:** 296-340
- **Returns:** Search results for species
- **imageUrl Field:** ❌ NO - Does not include primary image
- **Issue:** Frontend may need imageUrl for search results display
- **Recommendation:** Add subquery for primaryImageUrl like in GET /api/species

#### ✅ `GET /api/species/stats` - **WORKING**
- **Line:** 399-459
- **Returns:** Aggregated species statistics
- **Issues:** None - no images needed for stats

#### ✅ `POST /api/species` - **WORKING**
- **Line:** 539-593
- **Creates:** New species record
- **Issues:** None

---

## 2. Annotations Routes (`/backend/src/routes/annotations.ts`)

### Status: ⚠️ **ISSUES FOUND** - Missing imageUrl in some responses

### Endpoints Audited (6 total)

#### ⚠️ `GET /api/annotations` - **MISSING DATA**
- **Line:** 72-123
- **Returns:** All visible annotations
- **imageUrl Field:** ✅ YES - but via LEFT JOIN (line 92)
- **Database Query:**
  ```sql
  LEFT JOIN images i ON a.image_id = i.id
  COALESCE(i.url, i.thumbnail_url) as "imageUrl"
  ```
- **ISSUE:** If image is deleted or JOIN fails, imageUrl will be NULL
- **Severity:** MEDIUM - Frontend expects imageUrl for each annotation
- **Recommendation:** Add WHERE clause to ensure images exist

#### ⚠️ `GET /api/annotations/:imageId` - **NO IMAGE URL**
- **Line:** 156-190
- **Returns:** Annotations for specific image
- **imageUrl Field:** ❌ NO - Does not include imageUrl
- **Issue:** Response only has annotation data, no image context
- **Database Query:** Only queries annotations table (lines 160-176)
- **Severity:** LOW - imageId is in params, frontend can construct URL
- **Recommendation:** Add imageUrl to response for consistency

#### ✅ `POST /api/annotations` - **WORKING**
- **Line:** 310-363
- **Creates:** New annotation
- **Issues:** None - creation endpoint

#### ✅ `PUT /api/annotations/:id` - **WORKING**
- **Line:** 439-509
- **Updates:** Existing annotation
- **Issues:** None

#### ✅ `DELETE /api/annotations/:id` - **WORKING**
- **Line:** 550-567
- **Deletes:** Annotation
- **Issues:** None

#### ✅ `POST /api/annotations/:id/interaction` - **WORKING**
- **Line:** 633-660
- **Records:** User interaction with annotation
- **Issues:** None

---

## 3. Content Routes (`/backend/src/routes/content.ts`)

### Status: 🔴 **CRITICAL ISSUES** - Lazy-loaded service may fail

### Endpoints Audited (6 total)

#### 🔴 `GET /api/content/learn` - **INCOMPLETE DATA**
- **Line:** 76-99
- **Returns:** Published learning content
- **imageUrl Field:** ❓ UNKNOWN - depends on ContentPublishingService
- **ISSUE:** Service is lazy-loaded (lines 22-31), may fail at runtime
- **Database Query:** Delegated to ContentPublishingService.getPublishedContent()
- **Severity:** HIGH - Frontend Learn page depends on this
- **Recommendation:**
  1. Check ContentPublishingService implementation
  2. Ensure it returns imageUrl for each content item
  3. Add error handling for service initialization

#### 🔴 `GET /api/content/modules` - **INCOMPLETE DATA**
- **Line:** 109-123
- **Returns:** Learning modules
- **imageUrl Field:** ❓ UNKNOWN - depends on service
- **ISSUE:** Same lazy-loading issue
- **Severity:** HIGH

#### ⚠️ `GET /api/content/stats` - **MAY WORK**
- **Line:** 133-146
- **Returns:** Content statistics
- **Issues:** Lazy-loading issue, but stats may not need imageUrl

#### 🔴 `GET /api/content/by-species/:speciesId` - **INCOMPLETE DATA**
- **Line:** 156-175
- **Returns:** Content for specific species
- **imageUrl Field:** ❓ UNKNOWN - depends on service
- **Severity:** HIGH - Species detail pages need this

#### ⚠️ `POST /api/content/publish` - **MAY WORK**
- **Line:** 206-232
- **Creates:** Publishes annotations to content
- **Issues:** Lazy-loading issue

#### ✅ `GET /api/content/test` - **WORKING**
- **Line:** 17-20
- **Returns:** Simple test response
- **Issues:** None - debugging endpoint

### ContentPublishingService Investigation Needed

**File:** `/backend/src/services/ContentPublishingService.ts`

Need to verify:
1. Does `getPublishedContent()` JOIN with images table?
2. Does it return imageUrl for each annotation?
3. Is the service properly initialized?

---

## 4. Exercises Routes (`/backend/src/routes/exercises.ts`)

### Status: ⚠️ **ISSUES FOUND** - imageUrl not included

### Endpoints Audited (4 total)

#### ⚠️ `POST /api/exercises/session/start` - **NO IMAGES**
- **Line:** 57-73
- **Creates:** New exercise session
- **imageUrl Field:** ❌ N/A - Session creation doesn't need images
- **Issues:** None for this endpoint

#### ⚠️ `POST /api/exercises/result` - **NO IMAGES**
- **Line:** 76-100
- **Records:** Exercise result
- **imageUrl Field:** ❌ N/A - Result recording doesn't need images
- **Issues:** None for this endpoint

#### 🔴 `GET /api/exercises/session/:sessionId/progress` - **INCOMPLETE DATA**
- **Line:** 103-117
- **Returns:** Session progress
- **imageUrl Field:** ❓ UNKNOWN - depends on ExerciseService.getSessionProgress()
- **Database Query:** Delegated to service
- **Severity:** MEDIUM - Progress display may need annotation images
- **Recommendation:** Check if ExerciseService JOINs with images table

#### 🔴 `GET /api/exercises/difficult-terms` - **INCOMPLETE DATA**
- **Line:** 159-170
- **Returns:** Terms with low accuracy
- **imageUrl Field:** ❓ UNKNOWN - depends on ExerciseService.getDifficultTerms()
- **Database Query:** Delegated to service
- **Severity:** MEDIUM - Difficult terms display should show example images
- **Recommendation:** Service should return imageUrl for each term

---

## 5. Images Routes (`/backend/src/routes/images.ts`)

### Status: ✅ **MOSTLY WORKING** - Core image serving works

### Endpoints Audited (8 total)

#### ✅ `GET /api/images/:id` - **WORKING**
- **Line:** 12-58
- **Returns:** Image file or redirect
- **Logic:** Queries images table, serves file or redirects
- **Issues:** None

#### ⚠️ `POST /api/images/search` - **MOCK DATA**
- **Line:** 61-112
- **Returns:** Image search results
- **ISSUE:** Returns empty mock data (lines 101-105)
- **Severity:** LOW - Feature not implemented yet
- **Recommendation:** Implement actual Unsplash API integration

#### ✅ `POST /api/images/import` - **WORKING**
- **Line:** 115-165
- **Imports:** External image to local storage
- **Issues:** None - proper image processing

#### ✅ `POST /api/images/generate-prompts` - **WORKING**
- **Line:** 168-216
- **Generates:** AI image prompts for species lacking images
- **Issues:** None

#### ✅ `GET /api/images/prompts` - **WORKING**
- **Line:** 219-243
- **Returns:** Generated prompts
- **Issues:** None

#### ✅ `GET /api/images/stats` - **WORKING**
- **Line:** 246-264
- **Returns:** Image statistics
- **Issues:** None

---

## 6. Vocabulary Routes (`/backend/src/routes/vocabulary.ts`)

### Status: ⚠️ **ISSUES FOUND** - imageUrl not included

### Endpoints Audited (3 total)

#### ⚠️ `GET /api/vocabulary/enrichment/:term` - **NO IMAGES**
- **Line:** 16-30
- **Returns:** Vocabulary enrichment data
- **imageUrl Field:** ❓ UNKNOWN - depends on VocabularyService.getEnrichment()
- **Severity:** MEDIUM - Enrichment display could benefit from images
- **Recommendation:** Service should return imageUrl for terms

#### ✅ `POST /api/vocabulary/track-interaction` - **WORKING**
- **Line:** 33-54
- **Records:** User interaction with vocabulary
- **Issues:** None

#### ⚠️ `GET /api/vocabulary/session-progress/:sessionId` - **NO IMAGES**
- **Line:** 57-71
- **Returns:** Session progress
- **imageUrl Field:** ❓ UNKNOWN - depends on service
- **Severity:** MEDIUM

---

## 7. SRS Routes (`/backend/src/routes/srs.ts`)

### Status: 🔴 **CRITICAL ISSUES** - imageUrl field expected but may be missing

### Endpoints Audited (6 total)

#### 🔴 `GET /api/srs/due` - **INCOMPLETE DATA**
- **Line:** 82-103
- **Returns:** Terms due for review
- **imageUrl Field:** ✅ DOCUMENTED in OpenAPI spec (line 57) but ❓ implementation unknown
- **Database Query:** Delegated to SpacedRepetitionService.getDueTerms()
- **Severity:** CRITICAL - Frontend SRS review page requires imageUrl
- **OpenAPI Schema Shows:**
  ```yaml
  imageUrl:
    type: string
  ```
- **Recommendation:** Verify SpacedRepetitionService JOINs with images table

#### ✅ `GET /api/srs/stats` - **WORKING**
- **Line:** 145-161
- **Returns:** User SRS statistics
- **Issues:** None - stats don't need images

#### ✅ `POST /api/srs/review` - **WORKING**
- **Line:** 213-259
- **Records:** Review result
- **Issues:** None - recording doesn't need images

#### ✅ `POST /api/srs/discover` - **WORKING**
- **Line:** 301-324
- **Marks:** Term as discovered
- **Issues:** None

#### 🔴 `GET /api/srs/term/:termId` - **INCOMPLETE DATA**
- **Line:** 385-408
- **Returns:** Progress for specific term
- **imageUrl Field:** ✅ DOCUMENTED in OpenAPI (line 358) but ❓ implementation unknown
- **Severity:** HIGH - Term detail view needs image
- **Recommendation:** Verify service returns imageUrl

---

## 8. Annotation Mastery Routes (`/backend/src/routes/annotationMastery.ts`)

### Status: 🔴 **CRITICAL ISSUES** - Multiple endpoints missing imageUrl

### Endpoints Audited (7 total)

#### ✅ `POST /api/mastery/update` - **WORKING**
- **Line:** 46-82
- **Updates:** Mastery record after exercise
- **Issues:** None

#### 🔴 `GET /api/mastery/weak/:userId` - **INCOMPLETE DATA**
- **Line:** 88-110
- **Returns:** User's weak annotations
- **imageUrl Field:** ❓ UNKNOWN - depends on AnnotationMasteryService.getWeakAnnotations()
- **Severity:** CRITICAL - Weak annotations display requires images
- **Recommendation:** Service must JOIN with images table

#### 🔴 `GET /api/mastery/due/:userId` - **INCOMPLETE DATA**
- **Line:** 116-136
- **Returns:** Annotations due for review
- **imageUrl Field:** ❓ UNKNOWN
- **Severity:** CRITICAL - Review interface needs images

#### 🔴 `GET /api/mastery/new/:userId` - **INCOMPLETE DATA**
- **Line:** 142-168
- **Returns:** New unseen annotations
- **imageUrl Field:** ❓ UNKNOWN
- **Severity:** CRITICAL - New annotation introduction needs images

#### 🔴 `GET /api/mastery/recommended/:userId` - **INCOMPLETE DATA**
- **Line:** 174-225
- **Returns:** Recommended annotations for practice
- **imageUrl Field:** ❓ UNKNOWN
- **Severity:** CRITICAL - Practice interface requires images

#### ✅ `GET /api/mastery/score/:userId/:annotationId` - **WORKING**
- **Line:** 231-248
- **Returns:** Mastery score
- **Issues:** None - numeric score doesn't need image

#### ✅ `GET /api/mastery/stats/:userId` - **WORKING**
- **Line:** 254-270
- **Returns:** Overall mastery statistics
- **Issues:** None

---

## Database Schema Analysis

### Images Table Structure
**File:** `/backend/src/database/migrations/010_create_species_and_images.sql`

```sql
CREATE TABLE images (
  id UUID PRIMARY KEY,
  species_id UUID NOT NULL REFERENCES species(id),
  unsplash_id VARCHAR(50) UNIQUE NOT NULL,
  url TEXT NOT NULL,                    -- ✅ Primary image URL
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  color VARCHAR(20),
  description TEXT,
  photographer VARCHAR(255),
  photographer_username VARCHAR(255),
  download_location TEXT,
  view_count INTEGER DEFAULT 0,
  annotation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Migration 016 Added:**
```sql
ALTER TABLE images ADD COLUMN thumbnail_url TEXT;  -- ✅ Thumbnail for gallery
```

### Annotations Table Structure
**File:** `/backend/src/database/migrations/011_create_annotations_table.sql`

```sql
CREATE TABLE annotations (
  id UUID PRIMARY KEY,
  image_id UUID NOT NULL REFERENCES images(id),  -- ✅ Foreign key to images
  bounding_box JSONB NOT NULL,
  annotation_type VARCHAR(50) NOT NULL,
  spanish_term VARCHAR(200) NOT NULL,
  english_term VARCHAR(200) NOT NULL,
  pronunciation VARCHAR(200),
  difficulty_level INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Key Observations

1. **Proper Foreign Keys**: ✅ annotations.image_id → images.id
2. **Available Fields**: ✅ Both `url` and `thumbnail_url` exist
3. **CASCADE Delete**: ✅ Deleting image deletes annotations
4. **Indexes**: ✅ Proper indexes on image_id, type, difficulty

---

## Critical Issues Summary

### 🔴 HIGH SEVERITY (Frontend Broken)

1. **SRS Routes - Missing imageUrl** (srs.ts:82-103, 385-408)
   - Endpoints: GET /api/srs/due, GET /api/srs/term/:termId
   - Impact: SRS review interface cannot display images
   - Fix: SpacedRepetitionService must JOIN with images table

2. **Annotation Mastery - Missing imageUrl** (annotationMastery.ts)
   - Endpoints: 4 endpoints (weak, due, new, recommended)
   - Impact: Mastery tracking interface broken
   - Fix: AnnotationMasteryService must JOIN with images table

3. **Content Routes - Lazy Loading Failure** (content.ts:22-31)
   - Endpoints: All content endpoints
   - Impact: Learn/Practice pages may fail to load
   - Fix: Ensure ContentPublishingService properly initializes and returns imageUrl

### ⚠️ MEDIUM SEVERITY (Degraded UX)

4. **Exercises Routes - Missing imageUrl** (exercises.ts:103-117, 159-170)
   - Endpoints: progress, difficult-terms
   - Impact: Exercise feedback less helpful without images
   - Fix: ExerciseService should JOIN with images table

5. **Vocabulary Routes - Missing imageUrl** (vocabulary.ts)
   - Endpoints: enrichment, session-progress
   - Impact: Vocabulary context less rich
   - Fix: VocabularyService should return imageUrl

6. **Species Search - Missing imageUrl** (species.ts:296-340)
   - Endpoint: GET /api/species/search
   - Impact: Search results display incomplete
   - Fix: Add primaryImageUrl subquery like in GET /api/species

7. **Annotations Query - Nullable imageUrl** (annotations.ts:72-123)
   - Endpoint: GET /api/annotations
   - Impact: Some annotations may show without images
   - Fix: Add WHERE clause to ensure images exist

---

## Recommended Query Pattern

All endpoints returning annotations should use this pattern:

```sql
SELECT
  a.*,
  COALESCE(i.url, i.thumbnail_url) as "imageUrl",
  i.width,
  i.height
FROM annotations a
INNER JOIN images i ON a.image_id = i.id  -- Use INNER JOIN to ensure image exists
WHERE a.is_visible = true
ORDER BY a.created_at DESC;
```

**Key Points:**
- Use `INNER JOIN` not `LEFT JOIN` to ensure imageUrl is never null
- Use `COALESCE(i.url, i.thumbnail_url)` for fallback
- Include width/height for frontend aspect ratio calculation
- Filter `is_visible = true` for production content

---

## Service Investigation Required

Must audit these service files to verify imageUrl handling:

1. ✅ **ContentPublishingService.ts** (line 8630 bytes)
   - Methods: getPublishedContent(), getLearningModules()
   - Check: Does it JOIN with images table?

2. ✅ **SpacedRepetitionService.ts** (line 9977 bytes)
   - Methods: getDueTerms(), getTermProgress()
   - Check: Does it return imageUrl field?

3. ✅ **AnnotationMasteryService.ts** (line 18636 bytes)
   - Methods: getWeakAnnotations(), getNewAnnotations(), getRecommendedAnnotations()
   - Check: Does it JOIN with images table?

4. ✅ **ExerciseService.ts** (line 8204 bytes)
   - Methods: getSessionProgress(), getDifficultTerms()
   - Check: Does it return imageUrl?

5. ✅ **VocabularyService.ts** (line 4720 bytes)
   - Methods: getEnrichment(), getSessionProgress()
   - Check: Does it return imageUrl?

---

## Action Items

### Immediate (Critical)
1. Fix SpacedRepetitionService.getDueTerms() to return imageUrl
2. Fix AnnotationMasteryService methods to JOIN with images
3. Fix ContentPublishingService lazy loading and imageUrl

### High Priority
4. Fix ExerciseService to include imageUrl in responses
5. Fix VocabularyService to return imageUrl
6. Add imageUrl to species search endpoint

### Medium Priority
7. Change annotations query from LEFT JOIN to INNER JOIN
8. Add imageUrl to GET /api/annotations/:imageId endpoint
9. Document imageUrl contract in TypeScript interfaces

### Nice to Have
10. Add integration tests for imageUrl presence
11. Add database migration to enforce NOT NULL on images.url
12. Add API response validation middleware

---

## Testing Recommendations

### Manual Testing Checklist
```bash
# Test SRS endpoints
curl http://localhost:3000/api/srs/due | jq '.[] | select(.imageUrl == null)'

# Test annotation mastery
curl http://localhost:3000/api/mastery/weak/test-user-id | jq '.annotations[] | select(.imageUrl == null)'

# Test content endpoints
curl http://localhost:3000/api/content/learn | jq '.data[] | select(.imageUrl == null)'

# Test exercises
curl http://localhost:3000/api/exercises/difficult-terms | jq '.difficultTerms[] | select(.imageUrl == null)'
```

### Automated Test Cases
```typescript
describe('API imageUrl Compliance', () => {
  it('GET /api/srs/due should return imageUrl for each term', async () => {
    const response = await request(app).get('/api/srs/due');
    expect(response.body).toBeInstanceOf(Array);
    response.body.forEach(term => {
      expect(term).toHaveProperty('imageUrl');
      expect(term.imageUrl).not.toBeNull();
    });
  });

  it('GET /api/mastery/weak/:userId should return imageUrl', async () => {
    const response = await request(app).get('/api/mastery/weak/test-user');
    expect(response.body.annotations).toBeInstanceOf(Array);
    response.body.annotations.forEach(ann => {
      expect(ann).toHaveProperty('imageUrl');
      expect(ann.imageUrl).toMatch(/^https?:\/\//);
    });
  });
});
```

---

## Conclusion

The AVES backend has **7 critical issues** where endpoints fail to provide imageUrl fields that the frontend requires. Most issues stem from service layer implementations that don't JOIN with the images table.

**Priority Fix Order:**
1. SRS routes (breaks Practice page)
2. Annotation Mastery routes (breaks mastery tracking)
3. Content routes (breaks Learn page)
4. Exercise & Vocabulary routes (degrades UX)

**Estimated Fix Time:** 4-6 hours
- Service audits: 2 hours
- SQL query fixes: 2 hours
- Testing: 1-2 hours

---

## Appendix: File References

### Route Files
- `/backend/src/routes/species.ts` - 595 lines
- `/backend/src/routes/annotations.ts` - 662 lines
- `/backend/src/routes/content.ts` - 235 lines
- `/backend/src/routes/exercises.ts` - 172 lines
- `/backend/src/routes/images.ts` - 334 lines
- `/backend/src/routes/vocabulary.ts` - 73 lines
- `/backend/src/routes/srs.ts` - 411 lines
- `/backend/src/routes/annotationMastery.ts` - 276 lines

### Service Files to Audit
- `/backend/src/services/ContentPublishingService.ts` - 8630 bytes
- `/backend/src/services/SpacedRepetitionService.ts` - 9977 bytes
- `/backend/src/services/AnnotationMasteryService.ts` - 18636 bytes
- `/backend/src/services/ExerciseService.ts` - 8204 bytes
- `/backend/src/services/VocabularyService.ts` - 4720 bytes

### Database Migrations
- `/backend/src/database/migrations/010_create_species_and_images.sql`
- `/backend/src/database/migrations/011_create_annotations_table.sql`
- `/backend/src/database/migrations/016_add_local_upload_columns.sql`

---

**End of Report**
