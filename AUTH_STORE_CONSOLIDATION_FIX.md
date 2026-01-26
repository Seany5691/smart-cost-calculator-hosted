# Auth Store Consolidation Fix

## Problem Identified

The application was using **TWO different auth stores** simultaneously:

1. **`@/lib/store/auth-simple`** - Used by:
   - Login page
   - Dashboard (home page)
   - Most components (LeadsManager, NotesSection, RemindersSection, etc.)
   - Most calculator steps (HardwareStep, ConnectivityStep, LicensingStep)

2. **`@/lib/store/auth`** - Used by:
   - Calculator page
   - Leads page
   - Admin page
   - TotalCostsStep component
   - Config store (for API calls)
   - Calculator store (for API calls)

## Root Cause

When a user logged in:
1. The login page saved the auth token to `auth-simple` store
2. The token was stored in localStorage under the key used by `auth-simple`
3. When navigating to Calculator/Leads/Admin pages, those pages tried to read from the `auth` store
4. The `auth` store had no token (different localStorage key or no data)
5. API calls failed with **401 Unauthorized** errors

## Solution Applied

Standardized the entire application to use **`@/lib/store/auth-simple`** exclusively.

### Files Modified

1. **`app/calculator/page.tsx`**
   - Changed: `import { useAuthStore } from '@/lib/store/auth'`
   - To: `import { useAuthStore } from '@/lib/store/auth-simple'`

2. **`app/leads/page.tsx`**
   - Changed: `import { useAuthStore } from '@/lib/store/auth'`
   - To: `import { useAuthStore } from '@/lib/store/auth-simple'`

3. **`app/admin/page.tsx`**
   - Changed: `import { useAuthStore } from '@/lib/store/auth'`
   - To: `import { useAuthStore } from '@/lib/store/auth-simple'`

4. **`components/calculator/TotalCostsStep.tsx`**
   - Changed: `import { useAuthStore } from '@/lib/store/auth'`
   - To: `import { useAuthStore } from '@/lib/store/auth-simple'`

5. **`lib/store/config.ts`** (5 occurrences)
   - Changed: `const authStore = (await import('./auth')).useAuthStore.getState()`
   - To: `const authStore = (await import('./auth-simple')).useAuthStore.getState()`
   - Updated in: `fetchHardware`, `fetchConnectivity`, `fetchLicensing`, `fetchFactors`, `fetchScales`

6. **`lib/store/calculator.ts`** (3 occurrences)
   - Changed: `const authStore = (await import('./auth')).useAuthStore.getState()`
   - To: `const authStore = (await import('./auth-simple')).useAuthStore.getState()`
   - Updated in: `saveDeal`, `loadDeal`, `generatePDF`

## Why auth-simple?

We chose `auth-simple` as the standard because:
1. It was already used by the login page (the source of truth for authentication)
2. It was used by the majority of components
3. It has a simpler, more reliable implementation without Zustand's persist middleware
4. It uses manual localStorage management which is more compatible with Next.js SSR

## What About auth.ts?

The file `lib/store/auth.ts` can now be considered **deprecated**. It should not be used anywhere in the application. Consider removing it in a future cleanup to avoid confusion.

## Testing

After this fix:
1. ✅ Login should work normally
2. ✅ Dashboard should load without 401 errors
3. ✅ Calculator page should load and fetch configs successfully
4. ✅ Leads page should load and fetch data successfully
5. ✅ Admin page should load and fetch configs successfully
6. ✅ All API calls should include the correct Authorization header

## User Action Required

**IMPORTANT:** Users may need to **logout and login again** after this fix to ensure the auth token is properly stored in the correct format for `auth-simple`.

If you're still seeing 401 errors:
1. Open browser DevTools → Application → Local Storage
2. Clear all localStorage data for localhost:3000
3. Refresh the page
4. Login again
5. The token should now be properly stored and all pages should work

## Related Files

- Previous fix attempt: `ZUSTAND_PERSIST_FIX_COMPLETE.md`
- Previous fix attempt: `AUTH_HYDRATION_FIX_COMPLETE.md`
- Working auth store: `lib/store/auth-simple.ts`
- Deprecated auth store: `lib/store/auth.ts`
