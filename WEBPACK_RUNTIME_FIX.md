# Webpack Runtime Error Fix

## Problem
Runtime error: "Cannot read properties of undefined (reading 'call')" when loading the leads page.

## Root Cause
The error was caused by Zustand's persist middleware trying to access localStorage during server-side rendering, which caused webpack bundling issues.

## Solution Applied

### 1. Fixed Import Path
Changed the auth store import from:
```typescript
import { useAuthStore } from '../../../lib/store/auth';
```
To:
```typescript
import { useAuthStore } from '../../lib/store/auth';
```

### 2. Updated Zustand Persist Configuration
Added `skipHydration: true` to the persist middleware in `lib/store/auth.ts`:
```typescript
{
  name: 'auth-storage',
  partialize: (state) => ({
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
  }),
  skipHydration: true, // Skip hydration to avoid SSR issues
}
```

### 3. Manual Hydration in Component
Added manual rehydration in the leads page component:
```typescript
// Hydrate persisted state
useEffect(() => {
  useAuthStore.persist.rehydrate();
}, []);
```

### 4. Converted to Dynamic Imports
Changed from static imports to lazy loading for better code splitting:
```typescript
const MainSheetPageContent = lazy(() => import('./status-pages/main-sheet'));
const LeadsPageContent = lazy(() => import('./status-pages/leads'));
// ... etc
```

### 5. Cleared Next.js Cache
Removed the `.next` directory to ensure clean rebuild.

## Files Modified
1. `hosted-smart-cost-calculator/app/leads/page.tsx` - Fixed import path, added manual hydration, converted to lazy imports
2. `hosted-smart-cost-calculator/lib/store/auth.ts` - Added skipHydration option

## Testing
After these changes:
1. Clear the Next.js cache: `Remove-Item -Recurse -Force .next`
2. Rebuild: `npm run build` or restart dev server
3. Navigate to `/leads` page
4. Verify no runtime errors and auth state loads correctly

## Why This Works
- `skipHydration: true` prevents Zustand from automatically hydrating from localStorage during SSR
- Manual rehydration in useEffect ensures it only happens on the client side
- Lazy loading reduces initial bundle size and avoids circular dependency issues
- Clean cache ensures no stale webpack modules
