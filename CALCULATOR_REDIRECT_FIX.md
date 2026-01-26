# Calculator Redirect to Login - FIXED

## Problem

When trying to access the calculator page, it immediately redirects to the login page, even though you're logged in on the dashboard.

## Root Cause

The calculator page was using the Zustand hook to get `isAuthenticated`:

```typescript
const { isAuthenticated } = useAuthStore();  // Returns initial state (false)
```

The problem:
1. Component renders with `isAuthenticated = false` (initial state)
2. `hydrate()` is called and updates the Zustand store
3. BUT the component doesn't re-render because the hook subscription hasn't updated yet
4. The redirect logic sees `isAuthenticated = false` and redirects to login

## The Fix

Changed to read the authenticated state directly from the store after hydration:

```typescript
// Use local state instead of hook
const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  useAuthStore.getState().hydrate();
  setTimeout(() => {
    const state = useAuthStore.getState();
    // Read directly from store and set in local state
    setIsAuthenticated(state.isAuthenticated);
    setIsHydrated(true);
  }, 50);
}, []);
```

Now the flow is:
1. Component renders with `isAuthenticated = false` (local state)
2. `hydrate()` loads token from localStorage
3. We read `isAuthenticated` directly from store
4. We update local state with `setIsAuthenticated(true)`
5. Component re-renders with correct auth status
6. No redirect!

## Files Modified

- `app/calculator/page.tsx` - Changed to use local state for isAuthenticated

## Testing

1. Refresh the calculator page
2. You should see the "Loading..." screen briefly
3. Then the calculator should load (no redirect to login)
4. Console should show: `[CALCULATOR] After hydrate: { isAuthenticated: true, hasToken: true, ... }`

## Why This Happened

Zustand hooks don't immediately reflect state changes made by `set()` calls in the same render cycle. The hook subscription updates on the next render, but by then the redirect logic has already executed.

By using local state and explicitly setting it after reading from the store, we ensure the component has the correct auth status before the redirect logic runs.

## Status

✅ **FIXED** - Calculator page now properly reads auth state after hydration
