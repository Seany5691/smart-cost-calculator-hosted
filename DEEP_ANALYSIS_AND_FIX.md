# Deep Analysis: Calculator Auth Issue

## Problem Summary

- Dashboard works ✅
- Calculator redirects to login ❌
- Token EXISTS in localStorage (confirmed)
- But calculator thinks user is not authenticated

## Root Cause Analysis

### Issue 1: Module Instance Mismatch

The auth store was being imported with TWO different paths:
- `'./auth-simple'` (relative path in lib/store files)
- `'@/lib/store/auth-simple'` (alias path in components/pages)

Webpack may treat these as different modules, creating separate Zustand store instances. Each instance has its own state, so:
- Dashboard hydrates instance A → works
- Calculator hydrates instance B → different state → fails

### Issue 2: Code Not Being Reloaded

The debug logs (`[CALCULATOR]`) weren't appearing in the console, indicating the dev server was serving cached/old code.

### Issue 3: Zustand Hook Timing

Even with the same module, the Zustand hook (`useAuthStore()`) returns the initial state on first render. The `hydrate()` call updates the store, but the component doesn't re-render immediately.

## Fixes Applied

### Fix 1: Standardized Import Paths

Changed all imports to use the alias path `@/lib/store/auth-simple`:

**config.ts:**
```typescript
// Before
import { useAuthStore } from './auth-simple';

// After
import { useAuthStore } from '@/lib/store/auth-simple';
```

**calculator.ts:**
```typescript
// Before
import { useAuthStore } from './auth-simple';

// After
import { useAuthStore } from '@/lib/store/auth-simple';
```

### Fix 2: Direct localStorage Check

Changed calculator page to read directly from localStorage instead of relying on Zustand:

```typescript
useEffect(() => {
  const checkAuth = () => {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.token && data.isAuthenticated) {
        useAuthStore.getState().hydrate();
        setIsAuthenticated(true);
      }
    }
    setIsHydrated(true);
  };
  checkAuth();
}, []);
```

### Fix 3: Added Missing Imports

Added `useAuthStore` import to:
- `NumberLookup.tsx`
- `BusinessLookup.tsx`

## Files Modified

1. `lib/store/config.ts` - Changed import path
2. `lib/store/calculator.ts` - Changed import path
3. `app/calculator/page.tsx` - Direct localStorage check
4. `components/dashboard/NumberLookup.tsx` - Added import
5. `components/dashboard/BusinessLookup.tsx` - Added import

## Required Action: Restart Dev Server

The changes won't take effect until you restart the dev server:

```bash
# Stop server (Ctrl+C)
# Delete cache
cd hosted-smart-cost-calculator
rmdir /s /q .next

# Restart
npm run dev
```

## Expected Behavior After Fix

1. Go to dashboard → works
2. Click Calculator → should NOT redirect to login
3. Console should show:
   ```
   [CALCULATOR] localStorage auth-storage: {"user":{...},"token":"eyJ...","isAuthenticated":true}
   [CALCULATOR] Parsed auth data: { hasUser: true, hasToken: true, isAuthenticated: true }
   ```
4. Calculator should load and fetch configs successfully

## Why This Should Work

1. **Single Module Instance**: All imports now use `@/lib/store/auth-simple`, ensuring webpack creates only one module instance
2. **Direct localStorage Check**: Bypasses any Zustand timing issues by reading directly from localStorage
3. **Explicit State Management**: Uses local React state (`setIsAuthenticated`) instead of relying on Zustand hook updates

## If Still Not Working

1. **Check Console**: Look for `[CALCULATOR]` messages
2. **Verify localStorage**: Run in console:
   ```javascript
   JSON.parse(localStorage.getItem('auth-storage'))
   ```
3. **Hard Refresh**: Ctrl+Shift+R
4. **Clear All Cache**: Delete `.next` folder and restart

## Technical Details

### Why Dashboard Works

The dashboard page:
1. Imports `useAuthStore` from `@/lib/store/auth-simple`
2. Calls `hydrate()` on mount
3. Uses the hook's `isAuthenticated` value
4. Works because it's the first page loaded after login

### Why Calculator Failed

The calculator page:
1. Imports `useConfigStore` which imports `useAuthStore` from `./auth-simple`
2. This might create a different module instance
3. The different instance has `isAuthenticated: false`
4. Even after `hydrate()`, the wrong instance is updated
5. Calculator sees `isAuthenticated: false` → redirects to login

### The Fix

By standardizing all imports to `@/lib/store/auth-simple` and reading directly from localStorage, we ensure:
1. Only one auth store instance exists
2. Auth state is read correctly regardless of module loading order
3. Calculator can verify authentication independently
