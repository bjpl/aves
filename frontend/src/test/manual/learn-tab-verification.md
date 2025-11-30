# Learn Tab Verification Test Script

## Prerequisites
- Backend server running with annotation pipeline
- At least one approved annotation in database
- Test images available in Supabase storage

## Test Cases

### 1. Image Loading from Pipeline
**Steps**:
1. Navigate to `/learn`
2. Wait for annotations to load
3. Verify image displays from Supabase (not hardcoded Unsplash URL)

**Expected**:
- Image loads from approved annotation's imageUrl
- No console errors about missing images
- Progress indicators show correct counts

**Verification**:
```javascript
// In browser console
const img = document.querySelector('.rounded-lg');
console.log('Image source:', img?.src);
// Should NOT be: https://images.unsplash.com/photo-1551031895-7f8e06d714f8
```

### 2. Hotspot Alignment
**Steps**:
1. On Learn page, observe annotation hotspots
2. Click/tap on each hotspot
3. Verify hotspot positions match bird features

**Expected**:
- Hotspots appear at correct positions
- Clicking reveals vocabulary term
- Bounding boxes align with actual bird anatomy

**Verification**:
- Visual inspection: hotspots on beak, wings, feet, etc.
- Coordinates use normalized format (0-1)
- No misalignment between hotspot and feature

### 3. Empty State Handling
**Steps**:
1. Set all annotations to 'pending' status in database
2. Refresh Learn page

**Expected**:
- "No Learning Materials Yet" message displays
- Helpful explanation about approval process
- "Go Home" button works

**SQL to test**:
```sql
-- Temporarily set all to pending
UPDATE ai_annotation_items SET status = 'pending';
-- Then restore after test
UPDATE ai_annotation_items SET status = 'approved' WHERE [conditions];
```

### 4. Image Error Handling
**Steps**:
1. In database, set an annotation's image URL to invalid URL
2. Navigate to Learn page

**Expected**:
- Placeholder image displays
- Console shows error: "Image failed to load: [url]"
- No JavaScript errors
- App continues to function

### 5. Multi-Image Navigation
**Steps**:
1. Ensure multiple images have approved annotations
2. Navigate to Learn page
3. Click "Next Image" button
4. Click "Previous Image" button

**Expected**:
- Counter shows "Image X of Y"
- Previous button disabled on first image
- Next button disabled on last image
- Annotations update for each image
- Progress tracking continues across images

### 6. Annotation Discovery
**Steps**:
1. Click on hotspot to discover term
2. Check "Discovered Terms" counter
3. Verify term appears in discovered list

**Expected**:
- Counter increments: "Discovered: X"
- Term added to discovered terms panel
- Audio player appears for pronunciation
- Progress bar updates

### 7. Mobile Responsiveness
**Steps**:
1. Open Learn page on mobile device or resize browser to mobile width
2. Test tap interactions
3. Verify layout adapts

**Expected**:
- Single column layout
- Larger touch targets (20px tolerance)
- Bottom navigation appears
- Annotations visible and tappable
- Vocabulary panel below image

### 8. Practice Prompt Integration
**Steps**:
1. Discover 5 terms on Learn page
2. Wait for prompt to appear

**Expected**:
- Prompt appears after 5th term: "Great progress! 🎉"
- "Practice Now" button links to /practice
- Prompt auto-dismisses after 5 seconds

## Automated Tests to Add

### Unit Tests
```typescript
// frontend/src/__tests__/pages/LearnPage.test.tsx
describe('LearnPage', () => {
  it('should fetch approved annotations from pipeline', async () => {
    // Test usePendingAnnotations integration
  });

  it('should group annotations by image', () => {
    // Test annotationsByImage memoization
  });

  it('should handle empty annotation state', () => {
    // Test empty state UI
  });

  it('should navigate between images', () => {
    // Test image navigation controls
  });
});
```

### Integration Tests
```typescript
// frontend/e2e/tests/learn-tab.spec.ts
test('Learn tab displays approved annotations', async ({ page }) => {
  await page.goto('/learn');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.text-gray-900')).toContainText('Interactive Learning');
});

test('Hotspots are clickable and reveal terms', async ({ page }) => {
  await page.goto('/learn');
  await page.locator('canvas').click({ position: { x: 100, y: 100 } });
  await expect(page.locator('.font-bold')).toBeVisible();
});
```

## Database Verification

### Check Approved Annotations
```sql
SELECT
  id,
  spanish_term,
  english_term,
  status,
  image_id,
  created_at
FROM ai_annotation_items
WHERE status = 'approved'
ORDER BY created_at DESC;
```

### Check Image URLs
```sql
SELECT
  i.id,
  i.url,
  COUNT(a.id) as annotation_count
FROM images i
LEFT JOIN ai_annotation_items a ON i.id = a.image_id
WHERE a.status = 'approved'
GROUP BY i.id, i.url;
```

### Check Coordinate Ranges
```sql
SELECT
  id,
  spanish_term,
  bounding_box->>'x' as x,
  bounding_box->>'y' as y,
  bounding_box->>'width' as width,
  bounding_box->>'height' as height
FROM ai_annotation_items
WHERE status = 'approved';

-- All values should be between 0 and 1 (normalized)
```

## Performance Checks

### React Query Cache
Open React Query Devtools:
- Verify query key: `['annotations', 'pending']`
- Check stale time: 5 minutes
- Confirm data structure matches expected format

### Network Requests
1. Open browser DevTools → Network tab
2. Navigate to Learn page
3. Check:
   - Only one request to fetch annotations
   - Images load with proper CORS headers
   - No 404 errors for missing images

### Render Performance
1. Open React DevTools → Profiler
2. Navigate to Learn page and interact
3. Verify:
   - No unnecessary re-renders
   - Memoization working (annotationsByImage)
   - Smooth interaction with hotspots

## Regression Tests

Ensure these still work after changes:
- [ ] Audio player pronunciation
- [ ] Progress tracking
- [ ] Difficulty level display
- [ ] Category labels
- [ ] Mobile navigation bar
- [ ] Link to practice page

## Known Issues to Monitor

1. **Image CORS**: Some Supabase URLs may not have CORS enabled
2. **Coordinate precision**: Ensure bounding boxes are accurate to 3 decimal places
3. **Mobile safari**: Test touch events specifically on iOS
4. **Large images**: Monitor loading time for high-resolution images

## Success Criteria

✅ All test cases pass
✅ No console errors
✅ Hotspots align with bird features
✅ Images load from pipeline (not hardcoded URLs)
✅ Empty state handled gracefully
✅ Multi-image navigation works
✅ Mobile responsive
✅ Performance acceptable (<2s initial load)
