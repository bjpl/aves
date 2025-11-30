# AVES User Testing Guide

## Quick Links

| Section | Local Development | Production |
|---------|-------------------|------------|
| **Home** | [localhost:5173](http://localhost:5173/) | [GitHub Pages](https://bjpl.github.io/aves/) |
| **Learn Mode** | [localhost:5173/learn](http://localhost:5173/learn) | [Learn](https://bjpl.github.io/aves/learn) |
| **Practice Mode** | [localhost:5173/practice](http://localhost:5173/practice) | [Practice](https://bjpl.github.io/aves/practice) |
| **Species Browser** | [localhost:5173/species](http://localhost:5173/species) | [Species](https://bjpl.github.io/aves/species) |
| **Admin: Review** | [localhost:5173/admin/annotations](http://localhost:5173/admin/annotations) | [Review](https://bjpl.github.io/aves/admin/annotations) |
| **Admin: Images** | [localhost:5173/admin/images](http://localhost:5173/admin/images) | [Images](https://bjpl.github.io/aves/admin/images) |
| **Admin: Analytics** | [localhost:5173/admin/analytics](http://localhost:5173/admin/analytics) | [Analytics](https://bjpl.github.io/aves/admin/analytics) |

---

## Testing Flows

### Flow 1: Home Page
**URL:** `/`

- [ ] Page loads without errors
- [ ] Hero section displays correctly
- [ ] Navigation links work (Learn, Practice, Species)
- [ ] No emoji overlap issues
- [ ] Responsive on mobile/tablet

### Flow 2: Learn Mode
**URL:** `/learn`

- [ ] Species selector works
- [ ] Image loads for selected species
- [ ] **Hotspots align correctly with bird features** (Fixed: coordinate transformation)
- [ ] Clicking hotspot reveals vocabulary term
- [ ] Spanish/English bilingual descriptions display
- [ ] Can navigate between images

### Flow 3: Practice Mode
**URL:** `/practice`

- [ ] Exercise types load (matching, identification, etc.)
- [ ] AI-generated exercises work
- [ ] Answer selection registers correctly
- [ ] Score/progress tracking works
- [ ] Can advance through exercises

### Flow 4: Species Browser
**URL:** `/species`

- [ ] Species grid loads with images
- [ ] Clicking species opens detail page
- [ ] Species detail shows correct information
- [ ] Back navigation works
- [ ] Bilingual names display correctly

### Flow 5: Admin - Annotation Review
**URL:** `/admin/annotations`

- [ ] Pending annotations load
- [ ] Can approve/reject annotations
- [ ] Rejection reasons are recorded
- [ ] Bulk actions work (if implemented)
- [ ] Pagination works

### Flow 6: Admin - Image Gallery
**URL:** `/admin/images`

**Filters & Sorting:**
- [ ] Species filter works
- [ ] Annotation status filter works (All/Annotated/Unannotated)
- [ ] Quality filter works
- [ ] Sort options work

**Image Selection & Batch Actions:**
- [ ] **Selection tip displays when no images selected** (New feature)
- [ ] Clicking checkbox selects image
- [ ] Selected images show blue border
- [ ] Bulk Action Toolbar appears when images selected
- [ ] "Annotate Selected" button works
- [ ] "Delete Selected" button works

**Single Image Actions:**
- [ ] Clicking image opens detail modal
- [ ] **Annotate button works without error** (Fixed: validation & error handling)
- [ ] **Bounding boxes display correctly** (Fixed: coordinate transformation)
- [ ] Annotation count shows on cards

### Flow 7: Admin - Annotation Analytics Dashboard
**URL:** `/admin/annotations` (Analytics tab)

- [ ] Overview cards load (Pending, Approved, Rejected, Avg Confidence)
- [ ] **Progress bar shows APPROVED count toward MVP goal** (Fixed)
- [ ] Progress tooltip explains what's being counted
- [ ] **Species Coverage shows species NAMES** (Fixed: not UUIDs)
- [ ] Annotation Types distribution displays
- [ ] Quality Flags section shows issues (if any)
- [ ] Rejection Categories breakdown displays

### Flow 8: Admin - ML Analytics Dashboard
**URL:** `/admin/analytics`

**Overview:**
- [ ] Learned Patterns count displays
- [ ] Quality Improvement percentage shows
- [ ] Vocab Coverage percentage shows
- [ ] Throughput metric displays

**Pattern Learning:**
- [ ] **Pattern cards are clickable** (New feature)
- [ ] Clicking pattern opens detail modal
- [ ] Detail modal shows confidence, observations, reliability
- [ ] **"View all X patterns" link works** (New feature)
- [ ] All Patterns modal lists all patterns

**Other Sections:**
- [ ] Vocabulary Gaps displays
- [ ] Quality Trends displays
- [ ] Pipeline Performance metrics show
- [ ] Species Recommendations display

### Flow 9: Navigation
**All pages**

- [ ] **Navigation is sticky at top** (New feature)
- [ ] **Active page is highlighted** (New feature: blue bg for user, orange for admin)
- [ ] Admin links have icons
- [ ] Logo links to home
- [ ] All nav links work correctly

### Flow 10: API Health
**URL:** `<backend>/health`

- [ ] Returns `{ status: "ok", database: "connected" }`
- [ ] Responds quickly (non-blocking startup)

---

## Known Issues / Edge Cases

### Images Without Annotations
- Images with no annotations will show "0 annotations" badge
- Annotate button will attempt to generate annotations via Claude Vision API

### Low Confidence Annotations
- Annotations below 70% confidence are flagged in Quality Flags section
- These should be reviewed carefully before approving

### Small Bounding Boxes
- Bounding boxes covering less than 2% of image area are flagged
- Consider rejecting or requesting better images

---

## Reporting Issues

When reporting issues, please include:
1. **URL** where the issue occurred
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Browser/device** information
6. **Screenshots** (if visual issue)
7. **Console errors** (if any - open DevTools with F12)

---

## Recent Fixes (v1.1.0)

| Issue | Status |
|-------|--------|
| Learn mode hotspots misaligned | Fixed |
| Annotate button throwing errors | Fixed |
| Dataset progress showing wrong count | Fixed |
| Species coverage showing UUIDs | Fixed |
| Image selection not obvious | Improved |
| Pattern details not viewable | Added |
| Navigation lacks active states | Added |

---

*Last Updated: November 29, 2025*
