# Image Collection Species ID Resolution Fix

**Date**: 2025-11-28
**Issue**: Species ID mismatch between frontend and backend during image collection

## Problem Summary

When collecting images through the Image Management interface, there was a data type mismatch:

1. **Frontend** (`SpeciesMultiSelect.tsx`): Uses species UUIDs from database
2. **Backend** (`adminImageManagement.ts`): Expected species names (strings) and tried to match against hardcoded DEFAULT_BIRD_SPECIES

This caused collection requests to fail because:
- Frontend sent: `{ speciesIds: ["uuid-1", "uuid-2"] }`
- Backend expected: `{ species: ["Northern Cardinal", "Blue Jay"] }`
- Backend tried name matching on UUIDs, which always failed

## Root Cause

**File**: `backend/src/routes/adminImageManagement.ts`

Lines 270-273 (before fix):
```typescript
const CollectImagesSchema = z.object({
  species: z.array(z.string()).optional(),  // ❌ Accepted any string
  count: z.number().int().min(1).max(10).optional().default(2)
});
```

Lines 524-541 (before fix):
```typescript
// Filter species if specified
let speciesToCollect = DEFAULT_BIRD_SPECIES;
if (species && species.length > 0) {
  speciesToCollect = DEFAULT_BIRD_SPECIES.filter(s =>
    species.some((name: string) =>  // ❌ Tried to match UUIDs as names
      s.englishName.toLowerCase().includes(name.toLowerCase()) ||
      s.spanishName.toLowerCase().includes(name.toLowerCase()) ||
      s.scientificName.toLowerCase().includes(name.toLowerCase())
    )
  );
  // ...
}
```

## Solution

### 1. Updated Schema (Line 270-273)

```typescript
const CollectImagesSchema = z.object({
  speciesIds: z.array(z.string().uuid()).optional(), // ✅ Accept UUIDs from frontend
  count: z.number().int().min(1).max(10).optional().default(2)
});
```

### 2. Updated Collection Logic (Lines 511-589)

```typescript
const { speciesIds, count } = req.body;  // ✅ Destructure speciesIds

// Get species data from database using the provided IDs
if (speciesIds && speciesIds.length > 0) {
  // ✅ Fetch species from database by their UUIDs
  const speciesResult = await pool.query(
    `SELECT
      id,
      scientific_name as "scientificName",
      english_name as "englishName",
      spanish_name as "spanishName"
    FROM species
    WHERE id = ANY($1)`,
    [speciesIds]
  );

  // Map to collection format with proper search terms
  speciesToCollect = speciesResult.rows.map((row: any) => ({
    id: row.id,
    scientificName: row.scientificName,
    englishName: row.englishName,
    spanishName: row.spanishName,
    searchTerms: `${row.englishName} bird`  // ✅ Generate search terms
  }));
}
```

### 3. Updated Image Collection Logic (Lines 633-639)

```typescript
try {
  // ✅ Use the species ID directly (already exists in database)
  const speciesId = speciesData.id;

  // ✅ Search for images using searchTerms or fallback
  const searchQuery = speciesData.searchTerms || `${speciesData.englishName} bird`;
  const photos = await searchUnsplash(searchQuery, count);
  // ...
}
```

### 4. Updated API Documentation (Lines 482-503)

```typescript
/**
 * Request body:
 * {
 *   "speciesIds": ["uuid1", "uuid2"],  // ✅ Array of species UUIDs
 *   "count": 2
 * }
 */
```

## Data Flow Verification

### Frontend → Backend

1. **User selects species** in `SpeciesMultiSelect.tsx`
   - Component stores UUIDs in state: `selected: string[]` (line 11)
   - UUIDs are from `species.id` (line 32)

2. **Frontend sends request** via `handleCollectImages` in `ImageManagementPage.tsx`
   - Sends: `{ speciesIds: selectedSpecies, imagesPerSpecies }` (lines 69-72)

3. **Backend receives and validates** in `adminImageManagement.ts`
   - Schema validates UUIDs: `z.array(z.string().uuid())` (line 271)
   - Extracts: `const { speciesIds, count } = req.body` (line 512)

4. **Backend queries database**
   - Looks up species by UUID: `WHERE id = ANY($1)` (line 541)
   - Gets species data with English names for Unsplash search

5. **Backend searches Unsplash**
   - Uses `englishName + "bird"` as search query (line 559)
   - Collects images and associates with correct species UUID

## Files Changed

- `backend/src/routes/adminImageManagement.ts`
  - Line 271: Schema field renamed from `species` to `speciesIds` with UUID validation
  - Line 512: Destructure `speciesIds` instead of `species`
  - Lines 523-589: Complete rewrite of species resolution logic
  - Lines 633-639: Use species ID directly, generate search terms dynamically
  - Lines 489-491: Updated API documentation

## Testing Verification

### Manual Test Steps

1. Navigate to `/admin/images` (Image Management page)
2. Select "Image Collection" tab
3. Click species multi-select dropdown
4. Select 1-2 species (e.g., "Northern Cardinal", "Blue Jay")
5. Set images per species to 2
6. Click "Collect Images"
7. Verify:
   - ✅ Request succeeds (202 status)
   - ✅ Job starts with correct species count
   - ✅ Images are collected from Unsplash
   - ✅ Images are associated with correct species in database

### Expected API Request

```json
POST /api/admin/images/collect
{
  "speciesIds": [
    "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "f6e5d4c3-b2a1-4e5f-a6b7-c8d9e0f1a2b3"
  ],
  "count": 2
}
```

### Expected Response

```json
{
  "jobId": "collect_1700000000000_abc123def",
  "status": "processing",
  "message": "Image collection started. Check job status for progress.",
  "totalSpecies": 2,
  "imagesPerSpecies": 2,
  "estimatedImages": 4
}
```

## Backward Compatibility

The fix maintains backward compatibility:

- If `speciesIds` is not provided, the endpoint uses `DEFAULT_BIRD_SPECIES` (lines 562-589)
- Default species are inserted into database if they don't exist
- This ensures the endpoint works even without frontend selection

## Additional Improvements

1. **Type Safety**: UUID validation ensures only valid species IDs are accepted
2. **Database Lookup**: Species data is fetched from database (source of truth)
3. **Dynamic Search Terms**: Search queries generated from actual species names
4. **Error Handling**: Clear error message if species IDs don't exist in database

## Related Files (No Changes Needed)

- ✅ `frontend/src/components/admin/image-management/SpeciesMultiSelect.tsx` - Already sending UUIDs
- ✅ `frontend/src/pages/admin/ImageManagementPage.tsx` - Already sending as `speciesIds`
- ✅ `backend/src/routes/species.ts` - Returns species with UUIDs

## Status

✅ **FIXED** - Image collection now properly resolves species IDs to database records and generates correct Unsplash search queries.
