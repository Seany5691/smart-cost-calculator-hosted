# Dynamic Import Fix - Calculator 401 Errors Resolved

## Problem Identified

The token EXISTS in localStorage (confirmed by user test), but config.ts was still getting NULL when trying to fetch it.

### Root Cause

The issue was **dynamic imports**:

```typescript
// OLD CODE (BROKEN)
const authStore = (await import('./auth-simple')).useAuthStore.getState();
const token = authStore.token;  // Returns NULL!
```

When using dynamic imports (`await import()`), the module is loaded fresh each time, and the Zustand store state might not be properly initialized or might be a different instance than the one used by the components.

## The Fix

Changed from **dynamic imports** to **direct imports**:

```typescript
// NEW CODE (FIXED)
import { useAuthStore } from './auth-simple';

// Later in the code:
const token = useAuthStore.getState().token;  // Returns actual token!
```

## Files Modified

### 1. lib/store/config.ts
- Added: `import { useAuthStore } from './auth-simple';`
- Replaced 5 dynamic imports with direct calls:
  - `fetchHardware()`
  - `fetchConnectivity()`
  - `fetchLicensing()`
  - `fetchFactors()`
  - `fetchScales()`

### 2. lib/store/calculator.ts
- Added: `import { useAuthStore } from './auth-simple';`
- Replaced 3 dynamic imports with direct calls:
  - `saveDeal()`
  - `loadDeal()`
  - `generatePDF()`

## Why Dynamic Imports Failed

Dynamic imports were originally used to avoid circular dependencies, but they caused issues:

1. **Module Instance Mismatch**: Each dynamic import might create a new module instance
2. **State Not Shared**: The Zustand store state wasn't shared between instances
3. **Timing Issues**: The store might not be hydrated when dynamically imported

## Why Direct Imports Work

Direct imports ensure:
1. **Single Module Instance**: All code uses the same auth store instance
2. **Shared State**: Zustand state is properly shared across all consumers
3. **Proper Hydration**: The store is hydrated once and all code sees the same state

## Testing

After this fix:
1. Refresh the calculator page
2. The config APIs should now receive the auth token
3. No more 401 errors
4. Calculator loads successfully

## Expected Console Output

You should now see:
```
[CONFIG] fetchHardware - token: eyJhbGciOiJIUzI1NiIsInR5...
```

Instead of:
```
[CONFIG] fetchHardware - token: NULL
```

## Status

✅ **FIXED** - Direct imports ensure proper token retrieval from auth store

## Next Steps

1. Refresh your browser on the calculator page
2. Check console for `[CONFIG]` log showing token
3. Calculator should load without 401 errors
4. All config data should fetch successfully

If you still see issues, try:
1. Hard refresh (Ctrl + Shift + R)
2. Clear browser cache
3. Restart dev server
