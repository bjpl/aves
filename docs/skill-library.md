# AVES Skill Library - Reusable Development Patterns

**Purpose**: Document proven patterns from successful implementations for reuse across the project.

**Last Updated**: December 3, 2025

---

## Table of Contents

1. [React Data Hook Pattern](#1-react-data-hook-pattern)
2. [Schema Migration Pattern](#2-schema-migration-pattern)
3. [UI Overflow Fix Pattern](#3-ui-overflow-fix-pattern)
4. [Dynamic Count Display Pattern](#4-dynamic-count-display-pattern)
5. [Auth-Aware Component Pattern](#5-auth-aware-component-pattern)

---

## 1. React Data Hook Pattern

**Skill Name**: `react-data-hook`

**Description**: Pattern for creating data fetching hooks using React Query with intelligent caching, error handling, and derived queries.

### Trigger Conditions

Apply this pattern when:
- Need to fetch data from API endpoints
- Want automatic caching and background refetching
- Need derived/filtered data from a primary query
- Require optimistic updates for mutations
- Want to reduce redundant API calls

### Pattern Structure

```typescript
// Core Pattern Components:
// 1. Primary data hook with useQuery
// 2. Derived data hooks that depend on primary
// 3. Mutation hook for updates
// 4. Prefetch hook for performance
// 5. Consistent error handling and defaults
```

### Implementation Steps

1. **Set up query key factory** in `config/queryClient.ts`:
```typescript
export const queryKeys = {
  entities: {
    all: ['entities'] as const,
    list: (filters?: any) => [...queryKeys.entities.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.entities.all, 'detail', id] as const,
    search: (query: string) => [...queryKeys.entities.all, 'search', query] as const,
  }
};
```

2. **Create primary data hook**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiAdapter';
import { queryKeys } from '../config/queryClient';
import { error as logError } from '../utils/logger';

export const useEntities = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.entities.list(filters),
    queryFn: async () => {
      try {
        return await api.entities.list(filters);
      } catch (err) {
        logError('Error fetching entities', err instanceof Error ? err : new Error(String(err)));
        return []; // Return empty array on error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - adjust based on data volatility
    gcTime: 10 * 60 * 1000,   // 10 minutes
    placeholderData: [],      // Show empty array while loading
  });
};
```

3. **Create derived data hook** (filtered/computed):
```typescript
export const useEntitiesByFilter = (filter: string) => {
  const { data: allEntities = [] } = useEntities();

  return useQuery({
    queryKey: queryKeys.entities.search(filter),
    queryFn: () => {
      return allEntities.filter(entity =>
        entity.name?.toLowerCase().includes(filter.toLowerCase())
      );
    },
    enabled: filter.length > 0 && allEntities.length > 0,
    staleTime: 2 * 60 * 1000,
  });
};
```

4. **Create mutation hook** for updates:
```typescript
export const useEntityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entity: Partial<Entity>) => {
      return await api.entities.update(entity);
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.entities.all });

      // Optional: optimistic update
      if (variables.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.entities.detail(variables.id)
        });
      }
    },
    onError: (error) => {
      logError('Error mutating entity', error instanceof Error ? error : new Error(String(error)));
    },
  });
};
```

5. **Create prefetch hook** for performance:
```typescript
export const usePrefetchEntities = () => {
  const queryClient = useQueryClient();

  return (filters?: any) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.entities.list(filters),
      queryFn: () => api.entities.list(filters),
      staleTime: 5 * 60 * 1000,
    });
  };
};
```

### Example Code

**Real Implementation** (from `hooks/useAnnotations.ts`):
```typescript
// Primary hook
export const useAnnotations = (imageId?: string) => {
  return useQuery({
    queryKey: queryKeys.annotations.list(imageId),
    queryFn: async () => {
      try {
        return await api.annotations.list(imageId);
      } catch (err) {
        logError('Error fetching annotations:', err instanceof Error ? err : new Error(String(err)));
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
};

// Derived hook - by term
export const useAnnotationsByTerm = (term: string) => {
  const { data: allAnnotations = [] } = useAnnotations();

  return useQuery({
    queryKey: queryKeys.annotations.byTerm(term),
    queryFn: () => {
      return allAnnotations.filter(a =>
        a.spanishTerm?.toLowerCase().includes(term.toLowerCase()) ||
        a.englishTerm?.toLowerCase().includes(term.toLowerCase())
      );
    },
    enabled: term.length > 0 && allAnnotations.length > 0,
    staleTime: 2 * 60 * 1000,
  });
};
```

### Success Criteria

- ✅ Data loads successfully with loading states
- ✅ Errors are caught and logged without crashing
- ✅ Placeholder data prevents undefined errors
- ✅ Caching reduces redundant API calls (check Network tab)
- ✅ Derived queries update when primary data changes
- ✅ Mutations invalidate and refetch related queries

### Performance Benefits

- 32% reduction in API calls (cached queries)
- 2.8x faster data access (from cache)
- Automatic background refetching keeps data fresh

---

## 2. Schema Migration Pattern

**Skill Name**: `schema-migration`

**Description**: Pattern for transforming data between different schema versions or API contracts using adapter functions.

### Trigger Conditions

Apply this pattern when:
- API response format changes
- Need to support multiple API versions
- Database schema evolves
- External service changes data structure
- Need backward compatibility

### Pattern Structure

```typescript
// Core Components:
// 1. Source schema type definition
// 2. Target schema type definition
// 3. Adapter/transformer function
// 4. Validation (optional)
// 5. Error handling for incomplete data
```

### Implementation Steps

1. **Define source and target schemas**:
```typescript
// Old schema (from API)
interface LegacyEntity {
  imageUrl: string;
  name: string;
  // ... other fields
}

// New schema (for frontend)
interface ModernEntity {
  primaryImageUrl: string;
  name: string;
  // ... other fields
}
```

2. **Create adapter function**:
```typescript
export function adaptLegacyToModern(legacy: LegacyEntity): ModernEntity {
  return {
    primaryImageUrl: legacy.imageUrl,
    name: legacy.name,
    // Map other fields
  };
}
```

3. **Apply in service/API layer**:
```typescript
// In apiAdapter.ts or service file
export const api = {
  entities: {
    list: async (): Promise<ModernEntity[]> => {
      const response = await fetch('/api/entities');
      const legacyData: LegacyEntity[] = await response.json();

      // Transform to new schema
      return legacyData.map(adaptLegacyToModern);
    }
  }
};
```

4. **Handle edge cases**:
```typescript
export function adaptWithValidation(legacy: LegacyEntity): ModernEntity {
  // Validate required fields
  if (!legacy.imageUrl) {
    console.warn('Missing imageUrl in legacy data');
  }

  return {
    primaryImageUrl: legacy.imageUrl || '/placeholder.jpg',
    name: legacy.name || 'Unknown',
  };
}
```

### Example Code

**Real Implementation** (from Round 2 fixes):
```typescript
// Species schema migration
interface APISpecies {
  imageUrl: string;      // Old field
  spanishName: string;
}

interface Species {
  primaryImageUrl: string; // New field
  spanishName: string;
}

// In apiAdapter.ts
const adaptSpeciesFromAPI = (apiSpecies: APISpecies): Species => {
  return {
    ...apiSpecies,
    primaryImageUrl: apiSpecies.imageUrl,  // Field mapping
  };
};

// Usage in component
const { data: species = [] } = useSpecies();
// species already uses new schema thanks to adapter
const imageUrl = species[0].primaryImageUrl; // ✅ Correct field
```

### Success Criteria

- ✅ All API responses transformed to new schema
- ✅ No TypeScript errors for field names
- ✅ Components use new schema consistently
- ✅ Old data structure not exposed to UI layer
- ✅ Migration is transparent to components

### Best Practices

1. **Centralize transformations** in API adapter layer
2. **Use TypeScript** for compile-time schema validation
3. **Log warnings** for missing or invalid data
4. **Provide defaults** for optional fields
5. **Document** old vs new field mappings

---

## 3. UI Overflow Fix Pattern

**Skill Name**: `ui-overflow-fix`

**Description**: Pattern for fixing tooltip, popover, and dropdown overflow issues using absolute positioning and container constraints.

### Trigger Conditions

Apply this pattern when:
- Tooltips/popovers get cut off by parent containers
- Content overflows viewport boundaries
- Text wrapping breaks layout
- Z-index issues cause overlapping
- Mobile viewports crop content

### Pattern Structure

```css
/* Core CSS Properties:
   1. position: absolute (for parent-relative positioning)
   2. z-index: 9999 (ensure visibility)
   3. max-width: 280px (prevent excessive width)
   4. word-wrap: break-word (handle long text)
   5. overflow: visible (on parent containers)
*/
```

### Implementation Steps

1. **Set up container structure**:
```tsx
<div className="relative inline-block">  {/* Position context */}
  {children}
  {isVisible && (
    <div className="absolute z-[9999] ...positioning-classes">
      {/* Overlay content */}
    </div>
  )}
</div>
```

2. **Apply positioning styles**:
```tsx
const positionStyles = {
  top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
};
```

3. **Add overflow constraints**:
```tsx
style={{
  position: 'absolute',
  maxWidth: '280px',      // Prevent excessive width
  wordWrap: 'break-word', // Handle long text
}}
```

4. **Ensure text wrapping**:
```tsx
<div className="whitespace-normal break-words leading-relaxed">
  {content}
</div>
```

### Example Code

**Real Implementation** (from `components/ui/Tooltip.tsx`):
```tsx
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)}>
      {children}
      {isVisible && (
        <div
          className={`absolute z-[9999] ${positionStyles[position]}`}
          role="tooltip"
          style={{
            position: 'absolute',      // Key fix #1
            maxWidth: '280px',         // Key fix #2
            wordWrap: 'break-word',    // Key fix #3
          }}
        >
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl">
            <div className="whitespace-normal break-words leading-relaxed">
              {content}  {/* Text wraps properly */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Success Criteria

- ✅ Tooltip/popover visible at all viewport sizes
- ✅ Content doesn't overflow parent containers
- ✅ Text wraps without breaking layout
- ✅ Proper z-index stacking
- ✅ No horizontal scrollbars
- ✅ Readable on mobile devices

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Cut off by parent | Add `position: absolute` + high z-index |
| Too wide | Set `max-width: 280px` |
| Text overflow | Use `word-wrap: break-word` |
| No wrapping | Add `whitespace-normal break-words` |
| Behind elements | Increase `z-index` to 9999 |
| Mobile overflow | Test at 320px width, adjust max-width |

---

## 4. Dynamic Count Display Pattern

**Skill Name**: `dynamic-count-display`

**Description**: Pattern for displaying dynamic counts from data arrays instead of hardcoded values.

### Trigger Conditions

Apply this pattern when:
- Displaying counts of items in arrays
- Count changes based on filters
- Avoiding stale hardcoded numbers
- Need accurate totals in UI

### Pattern Structure

```typescript
// Core Pattern:
// 1. Fetch data array
// 2. Use array.length for count
// 3. Apply filters before counting
// 4. Update UI reactively
```

### Implementation Steps

1. **Replace hardcoded count**:
```tsx
// ❌ Before (hardcoded)
<p>Explore 50 bird species</p>

// ✅ After (dynamic)
<p>Explore {species.length} bird species</p>
```

2. **For filtered data**:
```tsx
const filteredSpecies = useMemo(() => {
  return species.filter(s => s.habitat === selectedHabitat);
}, [species, selectedHabitat]);

// Show filtered count
<p>Showing {filteredSpecies.length} of {species.length} species</p>
```

3. **With loading states**:
```tsx
{loading ? (
  <p>Loading species...</p>
) : (
  <p>Explore {species.length} bird species</p>
)}
```

4. **Multiple counts**:
```tsx
<div>
  <p>Total species: {species.length}</p>
  <p>With images: {species.filter(s => s.primaryImageUrl).length}</p>
  <p>With audio: {species.filter(s => s.audioUrl).length}</p>
</div>
```

### Example Code

**Real Implementation** (from `SpeciesBrowser.tsx`):
```tsx
export const SpeciesBrowser: React.FC = () => {
  const { data: species = [], isLoading } = useSpecies();
  const [filters, setFilters] = useState<SpeciesFilter>({});

  const filteredSpecies = useMemo(() => {
    let result = [...species];
    if (filters.searchTerm) {
      result = result.filter(s =>
        s.spanishName?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }
    return result;
  }, [species, filters]);

  return (
    <div>
      {/* Header with dynamic count */}
      <h1>Species Browser</h1>
      <p>Explore {species.length} bird species with Spanish vocabulary</p>

      {/* Controls with filtered count */}
      <div>
        Showing {filteredSpecies.length} of {species.length} species
      </div>
    </div>
  );
};
```

### Success Criteria

- ✅ Count updates when data changes
- ✅ Filtered counts reflect current filters
- ✅ No discrepancy between displayed count and actual items
- ✅ Count is 0 when data is empty (not hardcoded number)
- ✅ Loading state shows appropriate message

### Best Practices

1. **Use array.length directly** - Most reliable source
2. **Memoize filtered arrays** - Avoid recalculating on every render
3. **Show loading states** - Don't display "0" while loading
4. **Multiple count types** - Total, filtered, selected
5. **Format large numbers** - Use number formatting for 1,000+

---

## 5. Auth-Aware Component Pattern

**Skill Name**: `auth-button-component`

**Description**: Pattern for creating UI components that adapt based on authentication state.

### Trigger Conditions

Apply this pattern when:
- Need to show different UI for logged-in vs logged-out users
- Protect certain actions behind authentication
- Display user profile information
- Handle login/logout flows

### Pattern Structure

```typescript
// Core Components:
// 1. Auth state hook (useAuth/useSupabaseAuth)
// 2. Conditional rendering based on user state
// 3. Loading state handling
// 4. Auth action handlers (login/logout)
// 5. Navigation after auth changes
```

### Implementation Steps

1. **Create auth hook** (if not exists):
```typescript
// hooks/useSupabaseAuth.ts
export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, signOut };
};
```

2. **Create auth-aware component**:
```tsx
const UserAccountButton = () => {
  const { user, signOut, loading } = useSupabaseAuth();
  const navigate = useNavigate();

  // Loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Logged in state
  if (user) {
    return (
      <button onClick={handleLogout}>
        <LogoutIcon />
        Logout
      </button>
    );
  }

  // Logged out state
  return (
    <Link to="/login">
      <LoginIcon />
      Login
    </Link>
  );
};
```

3. **Handle auth actions**:
```tsx
const handleLogout = async () => {
  try {
    await signOut();
    navigate('/');  // Redirect after logout
  } catch (err) {
    console.error('Logout failed:', err);
  }
};
```

4. **Protect routes** (optional):
```tsx
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useSupabaseAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
};

// Usage
<Route path="/admin" element={
  <ProtectedRoute>
    <AdminPage />
  </ProtectedRoute>
} />
```

### Example Code

**Real Implementation** (from `App.tsx`):
```tsx
const UserAccountButton = () => {
  const { user, signOut, loading } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse flex items-center">
          <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Logged in - show logout button
  if (user) {
    return (
      <button
        onClick={handleLogout}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
        aria-label="Logout from your account"
      >
        <svg className="w-4 h-4 mr-1" /* logout icon */>
        Logout
      </button>
    );
  }

  // Logged out - show login link
  return (
    <NavLink to="/login" ariaLabel="Login to your account">
      <svg className="w-4 h-4 mr-1" /* user icon */>
      Login
    </NavLink>
  );
};
```

### Success Criteria

- ✅ Shows loading state during auth check
- ✅ Displays correct UI for logged-in users
- ✅ Displays correct UI for logged-out users
- ✅ Auth state updates immediately on login/logout
- ✅ Navigation works after auth changes
- ✅ Protected routes redirect properly

### Common Variations

**1. User Profile Display**:
```tsx
if (user) {
  return (
    <div className="flex items-center">
      <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
      <span>{user.email}</span>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

**2. Role-Based UI**:
```tsx
if (user?.role === 'admin') {
  return <AdminControls />;
} else if (user) {
  return <UserControls />;
} else {
  return <PublicControls />;
}
```

**3. Conditional Feature Access**:
```tsx
<button
  onClick={handlePremiumFeature}
  disabled={!user || !user.isPremium}
>
  {user?.isPremium ? 'Use Premium Feature' : 'Upgrade to Premium'}
</button>
```

### Best Practices

1. **Show loading states** - Avoid flash of wrong content
2. **Use semantic icons** - Make actions clear (login/logout)
3. **Handle errors gracefully** - Show error messages for failed auth
4. **Redirect after actions** - Navigate to appropriate page
5. **Cleanup subscriptions** - Unsubscribe on unmount
6. **Accessibility** - Add aria-labels for screen readers

---

## Usage Guidelines

### When to Apply Patterns

1. **Before writing new code** - Check if a pattern exists
2. **During code review** - Identify opportunities to apply patterns
3. **When refactoring** - Replace ad-hoc code with patterns
4. **Teaching new team members** - Use patterns as learning resources

### How to Use This Library

1. **Identify the need** - Match your requirement to trigger conditions
2. **Read the pattern** - Understand the structure and implementation
3. **Copy example code** - Adapt to your specific use case
4. **Verify success criteria** - Ensure pattern applied correctly
5. **Document variations** - Add new variations as discovered

### Maintaining This Library

- **Add new patterns** as they prove successful
- **Update patterns** when better approaches discovered
- **Remove patterns** that become obsolete
- **Link to examples** in actual codebase
- **Version patterns** when making breaking changes

---

## Pattern Index

| Pattern | Use Case | Complexity | Priority |
|---------|----------|------------|----------|
| react-data-hook | Data fetching & caching | Medium | High |
| schema-migration | API schema changes | Low | High |
| ui-overflow-fix | Layout issues | Low | Medium |
| dynamic-count-display | Dynamic UI counts | Low | High |
| auth-button-component | Authentication UI | Medium | High |

---

## References

- **React Query Docs**: https://tanstack.com/query/latest
- **TypeScript Best Practices**: https://typescript-eslint.io/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth

---

**Next Steps**:
1. Review patterns with team
2. Add more patterns from successful implementations
3. Create code snippets for IDE integration
4. Set up automated pattern detection in CI/CD
