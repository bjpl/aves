# Bounding Box Format Migration Guide

## Executive Summary

The Aves project has two incompatible bounding box coordinate formats in use. This guide documents the migration path from the legacy flat format to the new nested format, including conversion utilities, migration phases, and best practices.

**Created**: October 17, 2025
**Status**: Phase 2 Complete (Conversion + Defensive)
**Current Phase**: Planning backfill script (Phase 3)

---

## The Problem

### Two Incompatible Formats

**Format 1: Backend/Flat Format (Legacy)**
```typescript
interface BackendBoundingBox {
  x: number;        // Left position (0-1 normalized)
  y: number;        // Top position (0-1 normalized)
  width: number;    // Width (0-1 normalized)
  height: number;   // Height (0-1 normalized)
}

// Example
const bbox = {
  x: 0.25,      // 25% from left
  y: 0.30,      // 30% from top
  width: 0.20,  // 20% of image width
  height: 0.15  // 15% of image height
};
```

**Format 2: Editor/Nested Format (New)**
```typescript
interface EditorBoundingBox {
  topLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  width: number;
  height: number;
}

// Example
const bbox = {
  topLeft: { x: 0.25, y: 0.30 },
  bottomRight: { x: 0.45, y: 0.45 },  // left + width, top + height
  width: 0.20,
  height: 0.15
};
```

### Why Two Formats Exist

**Historical Context**:
- **Old Format**: Initial implementation, simpler for basic rectangles
- **New Format**: Added for editor enhancements, better for complex shapes
- **Migration**: Incomplete, both formats in production database

**Why Different Formats?**:

**Flat Format (Old)**:
- ✅ Simpler structure (4 fields vs 6 fields)
- ✅ Matches CSS positioning model (top, left, width, height)
- ✅ Easier serialization to JSON
- ❌ Harder for geometric calculations
- ❌ Doesn't extend well to polygons

**Nested Format (New)**:
- ✅ Better for geometric operations (distance, intersection)
- ✅ Easier to extend to complex shapes (polygons, circles)
- ✅ More intuitive for rendering libraries
- ✅ Clearer semantic meaning (points vs offsets)
- ❌ More verbose structure
- ❌ Slightly larger in database

### Impact of Mixed Formats

**Symptoms Observed** (October 16, 2025):
1. **Rendering Crashes**: Frontend expects nested, receives flat
2. **404 Errors**: Missing bounding box fields cause API errors
3. **Incorrect Displays**: Bounding boxes render in wrong positions
4. **Data Loss**: Failed conversions lose annotation data

**Example Error**:
```javascript
// Frontend expects: bbox.topLeft.x
// Database returns: bbox.x
// Result: TypeError: Cannot read property 'x' of undefined
```

---

## Conversion Utilities

### Frontend Converter

**File**: `frontend/src/utils/boundingBoxConverter.ts` (79 lines)

#### Convert Backend → Editor

```typescript
export function toEditorFormat(
  backend: BackendBoundingBox | EditorBoundingBox
): EditorBoundingBox {
  // If already in editor format, return as-is
  if ('topLeft' in backend) {
    return backend as EditorBoundingBox;
  }

  // Convert from backend format
  return {
    topLeft: { x: backend.x, y: backend.y },
    bottomRight: {
      x: backend.x + backend.width,
      y: backend.y + backend.height
    },
    width: backend.width,
    height: backend.height
  };
}
```

#### Convert Editor → Backend

```typescript
export function toBackendFormat(
  editor: EditorBoundingBox | BackendBoundingBox
): BackendBoundingBox {
  // If already in backend format, return as-is
  if ('x' in editor && !('topLeft' in editor)) {
    return editor as BackendBoundingBox;
  }

  // Convert from editor format
  const editorBox = editor as EditorBoundingBox;
  return {
    x: editorBox.topLeft.x,
    y: editorBox.topLeft.y,
    width: editorBox.width,
    height: editorBox.height
  };
}
```

#### Normalize for API

```typescript
export function normalizeForAPI(box: any): BackendBoundingBox {
  if (!box) throw new Error('Bounding box is required');

  // Handle both formats
  if ('topLeft' in box) {
    return toBackendFormat(box as EditorBoundingBox);
  } else if ('x' in box && 'y' in box) {
    return box as BackendBoundingBox;
  } else {
    throw new Error('Invalid bounding box format');
  }
}
```

### Backend Normalizer

**File**: `backend/src/routes/aiAnnotations.ts`

```typescript
function normalizeBoundingBox(bbox: any): any {
  // Handle old format → new format
  if ('x' in bbox && 'y' in bbox) {
    return {
      topLeft: { x: bbox.x, y: bbox.y },
      bottomRight: {
        x: bbox.x + bbox.width,
        y: bbox.y + bbox.height
      },
      width: bbox.width,
      height: bbox.height
    };
  }

  // Handle new format → ensure consistency
  if ('topLeft' in bbox && 'bottomRight' in bbox) {
    return {
      ...bbox,
      width: bbox.bottomRight.x - bbox.topLeft.x,
      height: bbox.bottomRight.y - bbox.topLeft.y
    };
  }

  console.warn('Unknown bounding box format:', bbox);
  return bbox;
}

// Apply to all annotations on read
router.get('/pending', async (req, res) => {
  const annotations = await db.query('SELECT * FROM ai_annotation_items');
  const normalized = annotations.map(a => ({
    ...a,
    bounding_box: normalizeBoundingBox(a.bounding_box)
  }));
  res.json({ data: normalized });
});
```

### Frontend Defensive Checks

**File**: `frontend/src/components/admin/AnnotationReviewCard.tsx`

```typescript
// Guard against missing or invalid bounding box
const bbox = annotation.bounding_box;

if (!bbox) {
  console.error('Missing bounding box for annotation:', annotation.id);
  return <div>Error: Missing bounding box data</div>;
}

if (!bbox.topLeft && !bbox.x) {
  console.error('Invalid bounding box format for annotation:', annotation.id);
  return <div>Error: Invalid bounding box format</div>;
}

// Convert to editor format if needed
const editorBbox = 'topLeft' in bbox ? bbox : toEditorFormat(bbox);
```

---

## Migration Phases

### Phase 1: Backend Normalization ✅ (Complete - Oct 16)

**Goal**: Backend always returns new format, regardless of database storage

**Implementation**:
- ✅ Added `normalizeBoundingBox()` function
- ✅ Applied to all GET endpoints (10 routes)
- ✅ Handles both formats gracefully
- ✅ Logs warnings for unknown formats

**Result**: Frontend can expect consistent format from API

### Phase 2: Frontend Defensive Checks ✅ (Complete - Oct 16)

**Goal**: Frontend handles both formats gracefully, no crashes

**Implementation**:
- ✅ Added `boundingBoxConverter.ts` utility
- ✅ Updated all components to check format
- ✅ Added error boundaries for invalid data
- ✅ Defensive null checks before access

**Result**: No crashes from format mismatches

### Phase 3: Database Backfill (Current - Planned)

**Goal**: Convert all database records to new format

**Steps**:
1. Create backfill migration script
2. Test on staging environment
3. Run on production during maintenance window
4. Verify all records converted
5. Add validation to prevent old format writes

**Script Outline**:
```sql
-- migration: 012_backfill_bounding_box_format.sql

-- Update ai_annotation_items
UPDATE ai_annotation_items
SET bounding_box = jsonb_build_object(
  'topLeft', jsonb_build_object(
    'x', (bounding_box->>'x')::float,
    'y', (bounding_box->>'y')::float
  ),
  'bottomRight', jsonb_build_object(
    'x', ((bounding_box->>'x')::float + (bounding_box->>'width')::float),
    'y', ((bounding_box->>'y')::float + (bounding_box->>'height')::float)
  ),
  'width', (bounding_box->>'width')::float,
  'height', (bounding_box->>'height')::float
)
WHERE bounding_box ? 'x'  -- Only convert old format
  AND NOT (bounding_box ? 'topLeft');  -- Skip if already new format

-- Repeat for annotations table
UPDATE annotations
SET bounding_box = jsonb_build_object(
  'topLeft', jsonb_build_object(
    'x', (bounding_box->>'x')::float,
    'y', (bounding_box->>'y')::float
  ),
  'bottomRight', jsonb_build_object(
    'x', ((bounding_box->>'x')::float + (bounding_box->>'width')::float),
    'y', ((bounding_box->>'y')::float + (bounding_box->>'height')::float)
  ),
  'width', (bounding_box->>'width')::float,
  'height', (bounding_box->>'height')::float
)
WHERE bounding_box ? 'x'
  AND NOT (bounding_box ? 'topLeft');

-- Validate conversion
SELECT
  COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) as old_format_count,
  COUNT(*) FILTER (WHERE bounding_box ? 'topLeft') as new_format_count,
  COUNT(*) as total
FROM ai_annotation_items;
```

**Validation**:
```typescript
// Post-migration validation script
async function validateBoundingBoxMigration() {
  const result = await db.query(`
    SELECT
      id,
      bounding_box
    FROM ai_annotation_items
    WHERE NOT (bounding_box ? 'topLeft')
       OR NOT (bounding_box ? 'bottomRight')
       OR NOT (bounding_box ? 'width')
       OR NOT (bounding_box ? 'height')
  `);

  if (result.rows.length > 0) {
    console.error('Invalid bounding boxes found:', result.rows);
    throw new Error('Migration validation failed');
  }

  console.log('✅ All bounding boxes in new format');
}
```

### Phase 4: Frontend Migration (Future)

**Goal**: Frontend only uses new format, removes old format support

**Steps**:
1. Remove `toEditorFormat()` conversion calls
2. Update TypeScript types to only allow new format
3. Remove defensive checks for old format
4. Update tests to only use new format

**Example Change**:
```typescript
// Before (defensive)
const bbox = annotation.bounding_box;
const editorBbox = 'topLeft' in bbox ? bbox : toEditorFormat(bbox);

// After (assume new format)
const bbox = annotation.bounding_box;
// bbox is guaranteed to have topLeft/bottomRight
```

### Phase 5: Backend Cleanup (Future)

**Goal**: Remove old format support from backend

**Steps**:
1. Remove `normalizeBoundingBox()` function
2. Add validation to reject old format
3. Update API documentation
4. Clean up conversion code

**Validation**:
```typescript
// Reject old format in POST/PUT
function validateBoundingBox(bbox: any) {
  if (!bbox.topLeft || !bbox.bottomRight) {
    throw new ValidationError('Bounding box must be in new format');
  }

  if ('x' in bbox) {
    throw new ValidationError('Old format (x/y/width/height) no longer supported');
  }
}
```

---

## Migration Timeline

| Phase | Status | Date | Effort | Risk |
|-------|--------|------|--------|------|
| 1. Backend Normalization | ✅ Complete | Oct 16 | 2h | Low |
| 2. Frontend Defensive | ✅ Complete | Oct 16 | 1h | Low |
| 3. Database Backfill | 🔄 Planned | TBD | 3h | Medium |
| 4. Frontend Migration | 📋 Future | TBD | 2h | Low |
| 5. Backend Cleanup | 📋 Future | TBD | 1h | Low |

**Total Estimated Effort**: 9 hours
**Current Progress**: 33% complete (3/9 hours)
**Remaining Work**: 6 hours

---

## Testing Strategy

### Unit Tests

**Frontend Converter Tests**:
```typescript
describe('boundingBoxConverter', () => {
  describe('toEditorFormat', () => {
    it('converts flat format to nested', () => {
      const flat = { x: 0.25, y: 0.30, width: 0.20, height: 0.15 };
      const nested = toEditorFormat(flat);

      expect(nested.topLeft).toEqual({ x: 0.25, y: 0.30 });
      expect(nested.bottomRight).toEqual({ x: 0.45, y: 0.45 });
      expect(nested.width).toBe(0.20);
      expect(nested.height).toBe(0.15);
    });

    it('returns nested format as-is', () => {
      const nested = {
        topLeft: { x: 0.25, y: 0.30 },
        bottomRight: { x: 0.45, y: 0.45 },
        width: 0.20,
        height: 0.15
      };

      expect(toEditorFormat(nested)).toBe(nested);
    });
  });
});
```

**Backend Normalizer Tests**:
```typescript
describe('normalizeBoundingBox', () => {
  it('converts old format to new format', () => {
    const old = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    const normalized = normalizeBoundingBox(old);

    expect(normalized.topLeft).toEqual({ x: 0.1, y: 0.2 });
    expect(normalized.bottomRight).toEqual({ x: 0.4, y: 0.6 });
  });

  it('ensures width/height consistency for new format', () => {
    const newFormat = {
      topLeft: { x: 0.1, y: 0.2 },
      bottomRight: { x: 0.4, y: 0.6 }
    };
    const normalized = normalizeBoundingBox(newFormat);

    expect(normalized.width).toBe(0.3);
    expect(normalized.height).toBe(0.4);
  });
});
```

### Integration Tests

**API Tests**:
```typescript
describe('AI Annotations API', () => {
  it('returns bounding boxes in new format', async () => {
    // Insert old format into database
    await db.query(`
      INSERT INTO ai_annotation_items (bounding_box)
      VALUES ('{"x": 0.25, "y": 0.30, "width": 0.20, "height": 0.15}')
    `);

    // Fetch via API
    const response = await request(app).get('/api/ai-annotations/pending');

    // Verify new format returned
    expect(response.body.data[0].bounding_box).toHaveProperty('topLeft');
    expect(response.body.data[0].bounding_box).toHaveProperty('bottomRight');
  });
});
```

### Manual Testing Checklist

**Before Backfill**:
- [ ] Create test annotation with old format
- [ ] Verify API returns new format
- [ ] Verify frontend renders correctly
- [ ] Test editing annotation
- [ ] Test approving annotation

**During Backfill**:
- [ ] Run backfill on staging
- [ ] Verify all records converted
- [ ] Check for validation errors
- [ ] Measure conversion time
- [ ] Test API still works

**After Backfill**:
- [ ] Verify no old format in database
- [ ] Test annotation creation
- [ ] Test annotation editing
- [ ] Test batch operations
- [ ] Monitor error logs

---

## Rollback Plan

### If Backfill Fails

**Immediate Actions**:
1. Stop migration script
2. Restore from backup
3. Investigate failure cause
4. Fix migration script
5. Re-test on staging

**Database Backup**:
```bash
# Before running backfill
pg_dump -h localhost -U postgres -d aves_production \
  -t ai_annotation_items -t annotations \
  -f backup_pre_bbox_migration.sql

# Restore if needed
psql -h localhost -U postgres -d aves_production \
  -f backup_pre_bbox_migration.sql
```

### If Frontend Issues After Migration

**Rollback Steps**:
1. Keep backend normalization (Phase 1) - no harm
2. Keep frontend defensive checks (Phase 2) - no harm
3. Revert database changes using backup
4. Investigate frontend issue
5. Fix and re-test

---

## Best Practices

### 1. Always Normalize on Read

```typescript
// Good - normalize in backend
router.get('/annotations', async (req, res) => {
  const data = await db.query('SELECT * FROM annotations');
  const normalized = data.map(a => ({
    ...a,
    bounding_box: normalizeBoundingBox(a.bounding_box)
  }));
  res.json(normalized);
});

// Bad - return raw database format
router.get('/annotations', async (req, res) => {
  const data = await db.query('SELECT * FROM annotations');
  res.json(data);  // May be in old format!
});
```

### 2. Add Defensive Checks in Components

```typescript
// Good - check format before using
function AnnotationRenderer({ annotation }) {
  const bbox = annotation.bounding_box;

  if (!bbox?.topLeft) {
    console.error('Invalid bbox:', bbox);
    return <ErrorState />;
  }

  return <BoundingBox topLeft={bbox.topLeft} />;
}

// Bad - assume format
function AnnotationRenderer({ annotation }) {
  return <BoundingBox topLeft={annotation.bounding_box.topLeft} />;
  // TypeError if old format!
}
```

### 3. Use Converter Utilities

```typescript
// Good - use utility
import { toEditorFormat } from '@/utils/boundingBoxConverter';
const editorBbox = toEditorFormat(annotation.bounding_box);

// Bad - manual conversion
const editorBbox = {
  topLeft: { x: bbox.x, y: bbox.y },
  bottomRight: { x: bbox.x + bbox.width, y: bbox.y + bbox.height }
};
```

### 4. Validate After Migration

```typescript
// Good - validate all records
async function validateMigration() {
  const invalid = await db.query(`
    SELECT * FROM annotations
    WHERE NOT (bounding_box ? 'topLeft')
  `);

  if (invalid.rows.length > 0) {
    throw new Error('Migration incomplete');
  }
}

// Bad - assume migration worked
// No validation
```

---

## Canvas Rendering

### Converting for Rendering

```typescript
function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  bbox: BoundingBox,
  imgWidth: number,
  imgHeight: number
) {
  // Normalize to new format first (handles both)
  const normalized = normalizeBoundingBox(bbox);

  // Convert relative (0-1) to absolute pixels
  const pixelCoords = {
    x: normalized.topLeft.x * imgWidth,
    y: normalized.topLeft.y * imgHeight,
    width: normalized.width * imgWidth,
    height: normalized.height * imgHeight
  };

  // Draw rectangle
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    pixelCoords.x,
    pixelCoords.y,
    pixelCoords.width,
    pixelCoords.height
  );
}
```

### Handling Mouse Events

```typescript
function isPointInBoundingBox(
  point: { x: number; y: number },
  bbox: BoundingBox
): boolean {
  // Normalize first
  const normalized = normalizeBoundingBox(bbox);

  // Check if point is within bounds
  return (
    point.x >= normalized.topLeft.x &&
    point.x <= normalized.bottomRight.x &&
    point.y >= normalized.topLeft.y &&
    point.y <= normalized.bottomRight.y
  );
}
```

---

## Monitoring

### Metrics to Track

**Before Migration**:
```sql
SELECT
  COUNT(*) FILTER (WHERE bounding_box ? 'x') as old_format,
  COUNT(*) FILTER (WHERE bounding_box ? 'topLeft') as new_format,
  COUNT(*) as total
FROM ai_annotation_items;
```

**After Migration**:
```sql
-- Should show 0 old_format
SELECT
  COUNT(*) FILTER (WHERE bounding_box ? 'x' AND NOT (bounding_box ? 'topLeft')) as old_format,
  COUNT(*) FILTER (WHERE bounding_box ? 'topLeft') as new_format,
  COUNT(*) as total
FROM ai_annotation_items;
```

### Error Tracking

**Log Format Mismatches**:
```typescript
// Backend logging
if (!bbox.topLeft && bbox.x) {
  console.warn('[BBOX] Old format detected', {
    annotationId: annotation.id,
    bbox: bbox
  });
}

// Frontend logging
if (!bbox?.topLeft) {
  console.error('[BBOX] Invalid format', {
    annotationId: annotation.id,
    bbox: bbox
  });
}
```

---

## Resources

### Code References

- Frontend Converter: `frontend/src/utils/boundingBoxConverter.ts`
- Backend Normalizer: `backend/src/routes/aiAnnotations.ts`
- Type Definitions: `backend/src/types/annotation.types.ts`
- Frontend Types: `shared/types/annotation.types.ts`

### Related Documentation

- [Test Setup Instructions](./TEST-SETUP-INSTRUCTIONS.md)
- [Test Utilities Overview](./test-utilities-overview.md)
- [Daily Report Oct 16](../daily_reports/2025-10-16.md)

---

## Conclusion

The bounding box format migration is a carefully planned multi-phase process to transition from the legacy flat format to the new nested format without disrupting production.

**Current Status**: Phase 2 complete - both frontend and backend handle both formats gracefully.

**Next Step**: Create and execute database backfill script (Phase 3) to convert all records to new format.

**Timeline**: Estimated 6 more hours to complete migration, low risk with proper testing and backups.

---

**Document Created**: 2025-10-17
**Author**: Documentation Specialist Agent
**Last Updated**: 2025-10-17
**Status**: Living Document (update as migration progresses)
