# useSpacedRepetition Hook - Authentication & Error Handling Update

## Changes Made

The `useSpacedRepetition` hook has been updated to provide proper authentication and error handling. Previously, when a user was not authenticated, the hook would silently return empty data, making it appear as if there were "0 due terms" instead of indicating that login was required.

## New Return Values

The hook now returns three additional properties:

```typescript
{
  // Existing properties (unchanged)
  dueTerms: TermProgress[];
  stats: UserStats | undefined;
  dueCount: number;
  isLoading: boolean;
  recordReview: (result: ReviewResult) => Promise<TermProgress | null>;
  markDiscovered: (termId: string) => Promise<void>;
  calculateQuality: (correct: boolean, responseTimeMs?: number) => number;
  refresh: () => void;
  isRecording: boolean;
  recordError: Error | null;

  // NEW: Authentication & Error handling
  isAuthenticated: boolean;      // true if user is logged in
  requiresAuth: boolean;          // true if user needs to log in (inverse of isAuthenticated)
  error: string | null;           // user-friendly error message
}
```

## Error Messages

The hook now provides user-friendly error messages for common scenarios:

- **Not authenticated**: `"Please log in to access your practice terms"`
- **Session expired**: `"Your session has expired. Please log in again"`
- **Network error**: `"Unable to connect. Please check your internet connection"`
- **Other errors**: Returns the original error message

## Usage Example

### Before (Silent Failure)

```tsx
const { dueCount, isLoading } = useSpacedRepetition();

// Problem: Shows "0 due terms" when not logged in
// User has no idea they need to authenticate
if (isLoading) return <Spinner />;
return <div>{dueCount} terms due</div>;
```

### After (Proper Error Handling)

```tsx
const {
  dueCount,
  isLoading,
  error,
  requiresAuth
} = useSpacedRepetition();

if (isLoading) {
  return <Spinner />;
}

if (error) {
  return (
    <Alert variant="error">
      {error}
      {requiresAuth && (
        <Button onClick={() => navigate('/login')}>
          Log In
        </Button>
      )}
    </Alert>
  );
}

return <div>{dueCount} terms due</div>;
```

## Implementation Details

### Query Changes

Both `useDueTerms` and `useUserSRSStats` now:

1. **Throw authentication errors** instead of returning empty data when user is not authenticated
2. **Handle 401/403 responses** with specific error messages
3. **Don't retry authentication errors** (prevents unnecessary API calls)
4. **Parse error responses** from the API to provide detailed error messages

### Error Priority

When multiple errors exist, the hook prioritizes them as follows:
1. Due terms error (most critical - user can't practice)
2. Stats error (less critical - just affects display)
3. Record review error (operation-specific)

## Migration Guide

### Components Using `useSpacedRepetition()`

**Files to update:**
- `/src/pages/PracticePage.tsx`
- `/src/pages/EnhancedPracticePage.tsx`
- `/src/pages/EnhancedLearnPage.tsx`

**Recommended changes:**

```tsx
const {
  dueTerms,
  dueCount,
  isLoading,
  error,         // NEW
  requiresAuth,  // NEW
  // ... other properties
} = useSpacedRepetition();

// Add error handling before rendering practice content
if (error && requiresAuth) {
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h2 className="text-lg font-semibold text-yellow-900 mb-2">
        Authentication Required
      </h2>
      <p className="text-yellow-800 mb-4">{error}</p>
      <Button onClick={() => navigate('/login')}>
        Log In to Practice
      </Button>
    </div>
  );
}

if (error) {
  return (
    <Alert variant="error">
      <p>{error}</p>
      <Button onClick={() => window.location.reload()}>
        Try Again
      </Button>
    </Alert>
  );
}
```

### Components Using Individual Hooks

**Files using `useUserSRSStats()`:**
- `/src/components/navigation/ReviewDueBadge.tsx`
- `/src/components/practice/PracticeModePicker.tsx`
- `/src/pages/UserDashboardPage.tsx`

These components should handle the error state from the hook:

```tsx
const { data: stats, isLoading, error } = useUserSRSStats();

if (error) {
  // Handle gracefully - maybe hide the badge or show a login prompt
  return null;
}
```

## Backward Compatibility

✅ **All existing code will continue to work** - the new properties are additive and don't break existing functionality.

However, components that don't check for errors will now see React Query errors in the console when authentication fails. It's recommended to add error handling to provide a better user experience.

## Testing Considerations

When writing tests for components using this hook, mock the new error states:

```typescript
// Test: Unauthenticated state
vi.mocked(useSpacedRepetition).mockReturnValue({
  dueTerms: [],
  dueCount: 0,
  isLoading: false,
  isAuthenticated: false,
  requiresAuth: true,
  error: 'Please log in to access your practice terms',
  // ... other properties
});

// Test: Authenticated state with data
vi.mocked(useSpacedRepetition).mockReturnValue({
  dueTerms: mockTerms,
  dueCount: 5,
  isLoading: false,
  isAuthenticated: true,
  requiresAuth: false,
  error: null,
  // ... other properties
});

// Test: Network error
vi.mocked(useSpacedRepetition).mockReturnValue({
  dueTerms: [],
  dueCount: 0,
  isLoading: false,
  isAuthenticated: true,
  requiresAuth: false,
  error: 'Unable to connect. Please check your internet connection',
  // ... other properties
});
```

## Next Steps

1. Update Practice pages to show authentication prompts when `requiresAuth` is true
2. Update Dashboard to handle error states gracefully
3. Add tests for authentication error scenarios
4. Consider adding a global auth check at the route level for protected pages
