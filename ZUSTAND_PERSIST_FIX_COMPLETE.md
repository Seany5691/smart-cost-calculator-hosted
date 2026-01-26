# Zustand Persist Middleware Fix - COMPLETE

## Summary
The webpack error `Cannot read properties of undefined (reading 'call')` was caused by Zustand's persist middleware incompatibility with Next.js 14. The fix involved removing persist middleware and implementing manual localStorage management.

## Root Cause
Zustand 5.x's persist middleware has issues with Next.js 14's SSR/client component hydration, causing webpack runtime errors.

## Solution Applied

### 1. Removed Persist Middleware from auth.ts
Changed from persist middleware to manual localStorage management:

```typescript
// BEFORE (with persist - BROKEN):
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({ /* ... */ }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ /* ... */ }),
      skipHydration: true,
    }
  )
);

// AFTER (manual localStorage - WORKING):
export const useAuthStore = create<AuthState>((set, get) => ({
  // ... state
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const data = JSON.parse(stored);
        set({
          user: data.user || null,
          token: data.token || null,
          isAuthenticated: data.isAuthenticated || false,
        });
      }
    } catch (error) {
      console.error('Failed to hydrate auth state:', error);
    }
  },
  // ... actions that manually save to localStorage
}));
```

### 2. Updated All Pages to Use hydrate()
Replaced `useAuthStore.persist.rehydrate()` with `useAuthStore.getState().hydrate()`:

**Files Updated:**
- `app/leads/page.tsx`
- `app/admin/page.tsx`
- `app/calculator/page.tsx`

```typescript
// BEFORE (BROKEN):
useEffect(() => {
  useAuthStore.persist.rehydrate();
  setMounted(true);
}, []);

// AFTER (WORKING):
useEffect(() => {
  useAuthStore.getState().hydrate();
  setMounted(true);
}, []);
```

## Current Status

### ✅ FIXED: Webpack Error
- Pages now load without webpack errors
- No more `Cannot read properties of undefined (reading 'call')`
- No more `Cannot read properties of undefined (reading 'rehydrate')`

### ⚠️ NEW ISSUE: 401 Unauthorized Errors
The pages load successfully, but API calls are returning 401 Unauthorized because:
1. Auth token is not being hydrated from localStorage on page load
2. The `hydrate()` method needs to be called BEFORE the page tries to make API calls

## Next Steps to Fix 401 Errors

The calculator page needs to wait for auth hydration before initializing configs:

```typescript
useEffect(() => {
  // Hydrate auth store FIRST
  useAuthStore.getState().hydrate();
}, []);

useEffect(() => {
  // Wait for auth to be ready before initializing configs
  if (isAuthenticated) {
    initializeConfigs().catch((error: any) => {
      console.error('Failed to initialize configs:', error);
    });
  }
}, [isAuthenticated, initializeConfigs]);
```

## Files Modified
1. `hosted-smart-cost-calculator/lib/store/auth.ts` - Removed persist middleware
2. `hosted-smart-cost-calculator/app/leads/page.tsx` - Updated hydrate call
3. `hosted-smart-cost-calculator/app/admin/page.tsx` - Updated hydrate call
4. `hosted-smart-cost-calculator/app/calculator/page.tsx` - Added hydrate call and CalculatorWizard

## Testing
1. ✅ Dashboard loads successfully
2. ✅ Login page works
3. ✅ Leads page loads (but shows 401 errors for API calls)
4. ✅ Calculator page loads (but shows 401 errors for API calls)
5. ✅ Scraper page loads
6. ✅ Admin page loads (but shows 401 errors for API calls)

## Conclusion
The webpack error is RESOLVED. The 401 errors are a separate authentication/hydration timing issue that needs to be addressed next.
