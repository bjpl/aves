# Bulk Selection UI Implementation - Image Gallery

## Overview
Added bulk selection capability to the Image Gallery tab, allowing users to select multiple images and perform batch operations (delete and annotate).

## Changes Made

### 1. ImageGalleryTab Component (`frontend/src/components/admin/ImageGalleryTab.tsx`)

#### Added Props (Lines 32-37)
```typescript
interface ImageGalleryTabProps {
  species: Species[];
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
  selectedImages?: string[];           // NEW: External selection state
  onSelectionChange?: (imageIds: string[]) => void;  // NEW: Selection change callback
}
```

#### Added Imports (Line 9, 27)
- Added `useEffect` hook import
- Added `BulkActionToolbar` component import from `./image-management/BulkActionToolbar`

#### ImageCard Component Updates (Lines 158-195)

**Added Props:**
- `isSelected: boolean` - Whether the image is currently selected
- `onToggleSelect: () => void` - Callback to toggle selection

**Visual Changes:**
- Added checkbox in top-left corner (Lines 184-195)
- Changed border styling to highlight selected images (Lines 180-182)
  - Selected: Blue border with blue ring (`border-blue-500 ring-2 ring-blue-200`)
  - Not selected: Gray border (`border-gray-200`)
- Moved quality and annotation badges from top corners to bottom corners (Lines 213, 225)
  - Quality badge: moved from top-left to bottom-left
  - Annotation count badge: moved from top-right to bottom-right

#### Main Component Updates (Lines 547-681)

**State Management:**
- Added `internalSelectedImages` state for standalone usage (Line 565)
- Supports both controlled (external) and uncontrolled (internal) selection state (Lines 568-569)
- Selection automatically clears when filters change (Lines 577-579)

**Selection Handlers:**
- `handleToggleSelect(imageId)` - Toggle individual image selection (Lines 623-630)
- `handleSelectAll()` - Select all images on current page (Lines 632-635)
- `handleDeselectAll()` - Clear all selections (Lines 637-639)

**Bulk Action Handlers:**
- `handleBulkDelete()` - Delete all selected images (Lines 642-656)
  - Deletes images sequentially
  - Shows success/error toast
  - Clears selection and refetches data
- `handleBulkAnnotate()` - Generate annotations for selected images (Lines 658-674)
  - Processes images sequentially
  - Counts successful annotations
  - Shows success/error toast
  - Clears selection and refetches data

**Computed Values:**
- `currentPageImageIds` - Array of image IDs on current page (Line 678)
- `allCurrentPageSelected` - Boolean indicating if all current page images are selected (Lines 679-681)

#### UI Integration (Lines 712-723)
Added `BulkActionToolbar` between filters and image grid:
- Shows when at least one image is selected
- Displays selection count
- Provides "Select All" / "Deselect All" buttons
- Provides "Annotate Selected" and "Delete Selected" buttons
- Disables during bulk operations

#### ImageCard Rendering (Lines 757-767)
Updated ImageCard instances to include:
- `isSelected={selectedImages.includes(image.id)}`
- `onToggleSelect={() => handleToggleSelect(image.id)}`

### 2. ImageManagementPage Component (`frontend/src/pages/admin/ImageManagementPage.tsx`)

#### Updated Gallery Tab Rendering (Lines 333-340)
Connected parent state to gallery component:
```typescript
<ImageGalleryTab
  species={species}
  onToast={addToast}
  selectedImages={gallerySelectedImages}        // Pass selection state
  onSelectionChange={setGallerySelectedImages}  // Pass selection updater
/>
```

## How Bulk Selection Works

### Selection State
1. **Parent-Controlled Mode**: When parent provides `selectedImages` and `onSelectionChange` props, the gallery uses external state (useful for coordinating with other components)
2. **Standalone Mode**: When props are not provided, uses internal state (self-contained functionality)

### Selection Flow
1. User clicks checkbox on image card → `handleToggleSelect` is called
2. Image ID is added to or removed from `selectedImages` array
3. Card border and checkbox state update to reflect selection
4. `BulkActionToolbar` appears/updates with current selection count

### Bulk Actions
1. **Delete Selected**:
   - User clicks "Delete Selected" button in toolbar
   - Sequential deletion of all selected images
   - Success toast shows count of deleted images
   - Selection cleared, data refetched

2. **Annotate Selected**:
   - User clicks "Annotate Selected" button in toolbar
   - Sequential annotation generation for all selected images
   - Success toast shows count of annotated images
   - Selection cleared, data refetched

### Selection Management
- **Select All**: Selects all images on the current page
- **Deselect All**: Clears all selections across all pages
- **Auto-Clear**: Selection automatically clears when:
  - Filters change (species, annotation status, quality)
  - Bulk operation completes successfully

### Selection Persistence
- Selection state is **NOT** maintained across pagination by default (each page starts fresh)
- Selection **IS** cleared when filters change (prevents selecting images that no longer match filters)
- Future enhancement: Could add option to maintain selection across pagination

## Visual Feedback

### Selected Images
- Blue border (2px, `border-blue-500`)
- Blue ring glow (`ring-2 ring-blue-200`)
- Checked checkbox with blue background

### Not Selected Images
- Gray border (`border-gray-200`)
- Unchecked checkbox

### Toolbar
- Appears only when images are selected
- Sticky positioning for easy access while scrolling
- Blue background (`bg-blue-50`) with blue border
- Shows selection count prominently
- Disables buttons during operations

## Styling Details

### Checkbox Styling
```css
w-5 h-5                    /* Size: 20x20px */
rounded                     /* Rounded corners */
border-gray-300            /* Border color */
text-blue-600              /* Check mark color */
focus:ring-2               /* Focus ring */
focus:ring-blue-500        /* Focus ring color */
cursor-pointer             /* Pointer cursor */
bg-white                   /* Background color */
shadow-sm                  /* Subtle shadow */
```

### Card Border Changes
```css
/* Selected */
border-2 border-blue-500 ring-2 ring-blue-200

/* Not Selected */
border-2 border-gray-200
```

## Testing Recommendations

1. **Selection Functionality**:
   - Click individual checkboxes to select/deselect
   - Use "Select All" to select current page
   - Use "Deselect All" to clear selection
   - Verify visual feedback (border, checkbox state)

2. **Bulk Delete**:
   - Select multiple images
   - Click "Delete Selected"
   - Verify all selected images are deleted
   - Verify selection is cleared
   - Verify data refreshes

3. **Bulk Annotate**:
   - Select multiple unannotated images
   - Click "Annotate Selected"
   - Verify annotations are generated
   - Verify selection is cleared
   - Verify data refreshes

4. **Filter Interaction**:
   - Select images
   - Change species filter
   - Verify selection is cleared
   - Repeat for other filters

5. **Pagination**:
   - Select images on page 1
   - Navigate to page 2
   - Verify selection state behavior

6. **Edge Cases**:
   - Select all images on page with only 1 image
   - Try bulk actions with no images selected (should be disabled)
   - Try bulk actions during operations (should be disabled)

## Future Enhancements

1. **Cross-Page Selection**: Maintain selection state across pagination
2. **Partial Page Selection**: Visual indicator when some but not all page images are selected
3. **Selection Count Badge**: Show persistent count in tab header
4. **Keyboard Shortcuts**: Add Ctrl+A for select all, Delete key for bulk delete
5. **Drag Selection**: Allow drag-to-select multiple images
6. **Selection Filters**: "Select all unannotated", "Select all low quality", etc.
7. **Undo/Redo**: Ability to undo bulk delete operations
8. **Confirmation Modal**: Add confirmation dialog for bulk delete (currently uses inline toast)

## Files Modified

1. `frontend/src/components/admin/ImageGalleryTab.tsx`
   - Added selection state management
   - Added bulk action handlers
   - Updated ImageCard component
   - Integrated BulkActionToolbar
   - Modified badge positioning

2. `frontend/src/pages/admin/ImageManagementPage.tsx`
   - Connected selection state to gallery component

## Dependencies

- Existing `BulkActionToolbar` component (`frontend/src/components/admin/image-management/BulkActionToolbar.tsx`)
- No new external dependencies added

## Build Status

✅ Frontend build successful (7.48s)
✅ No TypeScript errors
✅ All components properly integrated
