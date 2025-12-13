# Navigation Components

Cross-feature navigation CTAs for the Aves application. These components help users discover and navigate between related features (Learn, Practice, Species).

## Components

### 1. LearnPracticeCTA

**Purpose**: Encourage users to practice after completing a lesson.

**Location**: After completing a lesson or learning module.

**Features**:
- Links to `/practice` with optional filters
- Supports species and module filtering
- Customizable button text, variant, and size
- Accessible with proper ARIA labels

**Usage**:

```tsx
import { LearnPracticeCTA } from '@/components/navigation';

// Basic usage
<LearnPracticeCTA />

// With species filter (after completing species-specific lesson)
<LearnPracticeCTA
  speciesId="species-123"
  text="Practice cardinal anatomy"
/>

// With module filter
<LearnPracticeCTA
  moduleId="module-456"
  variant="primary"
  size="lg"
  fullWidth
/>

// Custom styling
<LearnPracticeCTA
  speciesId="species-789"
  moduleId="module-012"
  variant="success"
  className="mt-6"
/>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `speciesId` | `string` | - | Filter practice by species |
| `moduleId` | `string` | - | Filter practice by module |
| `text` | `string` | "Practice what you learned" | Button text |
| `variant` | `'primary' \| 'secondary' \| 'success'` | `'success'` | Button style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `fullWidth` | `boolean` | `false` | Full width button |
| `className` | `string` | `''` | Additional CSS classes |

---

### 2. ReviewDueBadge

**Purpose**: Show count of terms due for review via SRS. Encourage daily practice.

**Location**: Navbar, dashboard, or anywhere users need to see their review queue.

**Features**:
- Fetches live SRS stats via `useUserSRSStats` hook
- Links to `/practice?mode=review`
- Auto-hides when no terms are due
- Color-coded by urgency (yellow: 1-9, red: 10+)
- Two variants: badge and button

**Usage**:

```tsx
import { ReviewDueBadge } from '@/components/navigation';

// Simple badge (in content area)
<ReviewDueBadge />

// Button style (for navbar)
<ReviewDueBadge showAsButton />

// Custom minimum count
<ReviewDueBadge
  showAsButton
  minimumCount={5}
  className="ml-4"
/>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showAsButton` | `boolean` | `false` | Display as button instead of badge |
| `className` | `string` | `''` | Additional CSS classes |
| `minimumCount` | `number` | `1` | Minimum count to show badge |

---

### 3. SpeciesLearnLink

**Purpose**: Link from species pages to Learn page, filtered for that species.

**Location**: Species detail pages, species cards, species browser.

**Features**:
- Links to `/learn?speciesId=X`
- Three display variants: link, button, card
- Customizable text and styling
- Accessible with proper ARIA labels

**Usage**:

```tsx
import { SpeciesLearnLink } from '@/components/navigation';

// Button variant (default)
<SpeciesLearnLink
  speciesId="species-123"
  speciesName="Northern Cardinal"
/>

// Link variant (inline in text)
<SpeciesLearnLink
  speciesId="species-456"
  speciesName="Blue Jay"
  variant="link"
/>

// Card variant (featured CTA)
<SpeciesLearnLink
  speciesId="species-789"
  speciesName="American Robin"
  variant="card"
  className="mb-6"
/>

// Small button without icon
<SpeciesLearnLink
  speciesId="species-012"
  speciesName="Mallard"
  size="sm"
  showIcon={false}
/>

// Custom text
<SpeciesLearnLink
  speciesId="species-345"
  speciesName="Great Horned Owl"
  text="Start Learning Owl Anatomy"
  variant="button"
  size="lg"
/>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `speciesId` | `string` | - | **Required**. Species ID to link to |
| `speciesName` | `string` | - | **Required**. Species name for display |
| `variant` | `'link' \| 'button' \| 'card'` | `'button'` | Display style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size (for button variant) |
| `showIcon` | `boolean` | `true` | Show icon |
| `className` | `string` | `''` | Additional CSS classes |
| `text` | `string` | - | Custom text (auto-generated if not provided) |

---

## Integration Examples

### Example 1: Lesson Completion Page

```tsx
import { LearnPracticeCTA } from '@/components/navigation';

function LessonCompletePage({ lessonId, speciesId }) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Lesson Complete!</h1>
      <p className="text-gray-600 mb-6">
        Great job! You've learned 12 new vocabulary terms.
      </p>

      {/* CTA to practice */}
      <LearnPracticeCTA
        speciesId={speciesId}
        variant="success"
        size="lg"
        fullWidth
      />
    </div>
  );
}
```

### Example 2: Navbar with Review Badge

```tsx
import { ReviewDueBadge } from '@/components/navigation';

function Navbar() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-bold text-xl">Aves</Link>
          <Link to="/learn">Learn</Link>
          <Link to="/practice">Practice</Link>
          <Link to="/species">Species</Link>
        </div>

        {/* Review badge in navbar */}
        <ReviewDueBadge showAsButton />
      </div>
    </nav>
  );
}
```

### Example 3: Species Detail Page

```tsx
import { SpeciesLearnLink } from '@/components/navigation';

function SpeciesDetailPage({ species }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6">{species.name}</h1>

      <img
        src={species.imageUrl}
        alt={species.name}
        className="w-full rounded-lg mb-6"
      />

      {/* Featured card CTA to learn vocabulary */}
      <SpeciesLearnLink
        speciesId={species.id}
        speciesName={species.name}
        variant="card"
        className="mb-8"
      />

      <div className="prose max-w-none">
        <h2>About {species.name}</h2>
        <p>{species.description}</p>
      </div>
    </div>
  );
}
```

---

## Accessibility

All components include:
- Proper `aria-label` attributes
- Semantic HTML (using `<Link>` from react-router-dom)
- Keyboard navigation support
- Focus states with visible outlines
- Screen reader friendly text

---

## Styling

All components use:
- **Tailwind CSS** for styling
- Consistent color palette (blue/green gradients, yellow/red for urgency)
- Hover and focus states for interactivity
- Responsive design patterns

---

## TypeScript Support

All components are fully typed with exported TypeScript interfaces:

```typescript
import type {
  LearnPracticeCTAProps,
  ReviewDueBadgeProps,
  SpeciesLearnLinkProps
} from '@/components/navigation';
```

---

## Testing Checklist

- [ ] Components render without errors
- [ ] Links navigate to correct URLs with query params
- [ ] Hover states work correctly
- [ ] Focus states are visible
- [ ] ARIA labels are present
- [ ] Icons display correctly
- [ ] Responsive on mobile/tablet/desktop
- [ ] TypeScript types are correct
- [ ] useUserSRSStats hook data loads correctly for ReviewDueBadge
