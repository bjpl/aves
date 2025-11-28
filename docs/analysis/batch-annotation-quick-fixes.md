# Batch Annotation - Quick Fix Reference

**CRITICAL ISSUES - Fix Immediately**

---

## 🔴 BUG-001: Parameter Name Mismatch (BREAKING)

**Severity:** HIGH - Feature completely broken for "annotate all" mode

**File:** `frontend/src/pages/admin/ImageManagementPage.tsx`
**Line:** 84

**Current Code:**
```typescript
await annotateMutation.mutateAsync({ annotateAll: true });
```

**Fixed Code:**
```typescript
await annotateMutation.mutateAsync({ all: true });
```

**Explanation:**
- Backend expects `{ all: true }` (see `backend/src/routes/adminImageManagement.ts:277`)
- Frontend sends `{ annotateAll: true }`
- Request validation fails silently

**Test:**
1. Go to Image Management → Batch Annotation tab
2. Select "Annotate all un-annotated images"
3. Click "Start Annotation"
4. Verify job starts successfully

---

## 🔴 BUG-002: Missing Job Tracking UI

**Severity:** HIGH - Users cannot monitor annotation progress

**Files:**
- `frontend/src/pages/admin/ImageManagementPage.tsx` (Lines 114-122)
- `frontend/src/components/admin/ImageGalleryTab.tsx` (Missing integration)

**Current Code:**
```typescript
const handleBulkAnnotate = async () => {
  try {
    const result = await bulkAnnotateMutation.mutateAsync(gallerySelectedImages);
    addToast('success', result.message);
    setGallerySelectedImages([]);
  } catch {
    addToast('error', 'Failed to start bulk annotation');
  }
};
```

**Fixed Code:**
```typescript
// Add state at top of component (after line 56)
const [activeAnnotationJob, setActiveAnnotationJob] = useState<{
  jobId: string;
  totalImages: number;
  startedAt: string;
} | null>(null);

const handleBulkAnnotate = async () => {
  try {
    const result = await bulkAnnotateMutation.mutateAsync(gallerySelectedImages);

    // Track the job
    setActiveAnnotationJob({
      jobId: result.jobId,
      totalImages: result.totalImages,
      startedAt: new Date().toISOString()
    });

    addToast('info', `Annotation started for ${result.totalImages} images. Tracking job...`);
    setGallerySelectedImages([]);

    // Switch to history tab to show progress
    setActiveTab('history');
  } catch {
    addToast('error', 'Failed to start bulk annotation');
  }
};
```

---

## 🔴 BUG-004: Missing Bulk Selection UI

**Severity:** HIGH - Users cannot select multiple images

**File:** `frontend/src/components/admin/ImageGalleryTab.tsx`

### Changes Needed:

**1. Add checkbox to ImageCard component (Line 165-258):**

```typescript
// Update ImageCard props interface
interface ImageCardProps {
  image: GalleryImage;
  isSelected?: boolean;  // ADD THIS
  onToggleSelect?: () => void;  // ADD THIS
  onView: () => void;
  onAnnotate: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  isAnnotating: boolean;
}

// Update ImageCard component
const ImageCard: React.FC<ImageCardProps> = ({
  image,
  isSelected = false,  // ADD THIS
  onToggleSelect,      // ADD THIS
  onView,
  onAnnotate,
  onDelete,
  isDeleting,
  isAnnotating,
}) => {
  return (
    <div className="relative group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* ADD CHECKBOX OVERLAY */}
      {onToggleSelect && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Rest of component unchanged */}
      {/* ... */}
    </div>
  );
};
```

**2. Add BulkActionToolbar to main component (Line 587):**

```typescript
// Add selection state (after line 536)
const [selectedImages, setSelectedImages] = useState<string[]>([]);

const handleToggleImageSelection = (imageId: string) => {
  setSelectedImages(prev =>
    prev.includes(imageId)
      ? prev.filter(id => id !== imageId)
      : [...prev, imageId]
  );
};

const handleSelectAll = () => {
  setSelectedImages(images.map(img => img.id));
};

const handleBulkAnnotate = async () => {
  try {
    const result = await annotateMutation.mutateAsync(selectedImages);
    onToast('success', `Started annotation for ${result.annotationCount} images`);
    setSelectedImages([]);
    refetch();
  } catch {
    onToast('error', 'Failed to start bulk annotation');
  }
};

// In CardBody (after line 594, before FilterBar):
<BulkActionToolbar
  selectedCount={selectedImages.length}
  onSelectAll={handleSelectAll}
  onDeselectAll={() => setSelectedImages([])}
  onDelete={() => {
    // Handle bulk delete
  }}
  onAnnotate={handleBulkAnnotate}
  isDeleting={false}
  isAnnotating={annotateMutation.isPending}
  totalCount={pagination.total}
  allSelected={selectedImages.length === images.length && images.length > 0}
/>

// Update ImageCard calls (around line 647):
{images.map((image) => (
  <ImageCard
    key={image.id}
    image={image}
    isSelected={selectedImages.includes(image.id)}  // ADD THIS
    onToggleSelect={() => handleToggleImageSelection(image.id)}  // ADD THIS
    onView={() => handleViewImage(image.id)}
    onAnnotate={() => handleAnnotateImage(image.id)}
    onDelete={() => setDeleteConfirmId(image.id)}
    isDeleting={deleteMutation.isPending && deleteConfirmId === image.id}
    isAnnotating={annotateMutation.isPending}
  />
))}
```

---

## 🟡 BUG-003: Inconsistent Job Polling

**Severity:** MEDIUM - New jobs may not show progress immediately

**File:** `frontend/src/components/admin/image-management/useImageManagement.ts`
**Line:** 327

**Current Code:**
```typescript
const hasActiveJobs = dashboardData?.hasActiveJobs || false;
```

**Fixed Code:**
```typescript
const hasActiveJobs = dashboardData?.hasActiveJobs ||
                     collectMutation.isPending ||
                     annotateMutation.isPending ||
                     bulkAnnotateMutation.isPending;
```

**Explanation:**
- Current: Only polls when dashboard reports active jobs (updates every 30s)
- Fixed: Also polls when any mutation is pending
- Result: Immediate progress updates for new jobs

---

## Verification Checklist

After applying fixes:

- [ ] **BUG-001**: "Annotate all" starts job successfully
- [ ] **BUG-002**: Job ID appears in History tab with progress
- [ ] **BUG-004**: Gallery shows checkboxes on image cards
- [ ] **BUG-004**: BulkActionToolbar appears when images selected
- [ ] **BUG-004**: "Annotate Selected" button triggers annotation
- [ ] **BUG-003**: Progress updates appear within 3 seconds
- [ ] All existing tests still pass
- [ ] No console errors in browser

---

## Testing Commands

```bash
# Backend tests
cd backend
npm test -- src/__tests__/routes/adminImageManagement.test.ts

# Frontend (manual testing)
# 1. Start dev server
cd frontend
npm run dev

# 2. Navigate to /admin/images
# 3. Test scenarios:
#    - Select multiple images → Annotate Selected
#    - Batch Annotation tab → Annotate All
#    - History tab → Monitor progress
```

---

## API Endpoints Summary

| Endpoint | Purpose | Request | Response |
|----------|---------|---------|----------|
| `POST /api/admin/images/annotate` | Batch annotate all or specific | `{ all?: bool, imageIds?: string[] }` | `{ jobId, status, message }` |
| `POST /api/admin/images/bulk/annotate` | Annotate selected images | `{ imageIds: string[] }` | `{ jobId, status, totalImages }` |
| `GET /api/admin/images/jobs/:jobId` | Check job progress | - | `{ jobId, status, progress: { total, processed, ... } }` |

---

**Priority:** Fix BUG-001, BUG-002, BUG-004 before next deployment
**Estimated Time:** 2-3 hours
**Risk:** Low (isolated changes, well-tested endpoints)
