# Calculator 401 Error - FINAL FIX

## Problem Summary
The calculator page was experiencing 401 Unauthorized errors on all config API endpoints (`/api/config/hardware`, `/api/config/connectivity`, `/api/config/licensing`, `/api/config/factors`, `/api/config/scales`), while the dashboard page worked perfectly.

## Root Cause Analysis

After reading the ENTIRE console logs file (1756 lines), the issue was identified:

### Key Findings from Console Logs:
1. **React Strict Mode Double Invocation**: The stack traces showed `invokePassiveEffectMountInDEV`, `legacyCommitDoubleInvokeEffectsInDEV`, and `commitDoubleInvokeEffectsInDEV` - React was intentionally running effects twice in development mode
2. **Token Availability Issue**: The `getAuthToken()` helper function in `config.ts` was trying to read the token from localStorage, but there was a timing issue where the token wasn't always available when needed
3. **Indirect Token Access**: The config store was trying to access the auth token indirectly through localStorage instead of directly from the auth store

### The Problem Flow:
1. Calculator page mounts
2. First useEffect calls `useAuthStore.getState().hydrate()` - reads from localStorage and updates Zustand state
3. Second useEffect (with 100ms delay) calls `initializeConfigs()`
4. `initializeConfigs()` calls all fetch functions
5. Each fetch function calls `getAuthToken()` which tries to read from localStorage
6. **ISSUE**: The `getAuthToken()` function was trying to dynamically import the auth store or read from localStorage, causing timing issues
7. React Strict Mode's double invocation made this worse by running everything twice

## Solution Implemented

### 1. Removed the `getAuthToken()` Helper Function
- Deleted the helper function that was trying to read from localStorage or dynamically import the auth store
- This was causing circular dependency issues and timing problems

### 2. Updated Config Store to Accept Token Parameter
Changed all fetch functions to accept an optional `token` parameter:
```typescript
fetchHardware: (token?: string | null) => Promise<HardwareItem[]>;
fetchConnectivity: (token?: string | null) => Promise<ConnectivityItem[]>;
fetchLicensing: (token?: string | null) => Promise<LicensingItem[]>;
fetchFactors: (token?: string | null) => Promise<FactorSheet>;
fetchScales: (token?: string | null) => Promise<Scales>;
initializeConfigs: (token?: string | null) => Promise<void>;
```

### 3. Updated Calculator Page to Pass Token Explicitly
Modified the calculator page to get the token from the auth store and pass it directly:
```typescript
useEffect(() => {
  if (isHydrated && isAuthenticated) {
    const token = useAuthStore.getState().token;
    if (token) {
      initializeConfigs(token).catch((error) => {
        console.error('Failed to initialize configs:', error);
      });
    } else {
      console.error('No token available after hydration');
    }
  }
}, [isHydrated, isAuthenticated]);
```

### 4. Ensured Auth State Sync to localStorage
Added code to ensure the auth state is synced to localStorage after hydration:
```typescript
useEffect(() => {
  useAuthStore.getState().hydrate();
  
  const state = useAuthStore.getState();
  if (state.token && state.user) {
    localStorage.setItem('auth-storage', JSON.stringify({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
    }));
  }
  
  setIsHydrated(true);
}, []);
```

### 5. Removed the 100ms Delay
- Removed the artificial 100ms delay that was trying to work around the timing issue
- Now the token is passed directly, so no delay is needed

## Files Modified

1. **hosted-smart-cost-calculator/lib/store/config.ts**
   - Removed `getAuthToken()` helper function
   - Updated all fetch functions to accept optional `token` parameter
   - Updated `initializeConfigs()` to accept and pass token to all fetch functions

2. **hosted-smart-cost-calculator/app/calculator/page.tsx**
   - Added localStorage sync after hydration
   - Removed 100ms delay
   - Updated to pass token explicitly to `initializeConfigs()`
   - Added error logging if token is not available

## Why This Fix Works

1. **Direct Token Access**: The token is now accessed directly from the auth store's state, not through localStorage or dynamic imports
2. **Explicit Token Passing**: The token is passed explicitly as a parameter, avoiding any timing or hydration issues
3. **No Circular Dependencies**: Removed the dynamic import that was causing circular dependency issues
4. **React Strict Mode Compatible**: The fix works correctly even with React Strict Mode's double invocation
5. **Consistent with Dashboard**: The approach is now consistent with how the dashboard handles auth

## Expected Behavior After Fix

1. User logs in successfully
2. User navigates to calculator page
3. Auth store hydrates from localStorage
4. Token is retrieved from auth store state
5. Token is passed to `initializeConfigs()`
6. All config API calls include the Authorization header with the token
7. All API calls return 200 OK
8. Calculator page loads successfully

## Testing Steps

1. Clear browser cache and localStorage
2. Navigate to login page
3. Log in with valid credentials
4. Navigate to calculator page
5. Verify no 401 errors in console
6. Verify all config data loads successfully
7. Verify calculator wizard displays correctly

## Notes

- The dashboard page works because it doesn't call `initializeConfigs()` - it only uses components that fetch data on demand
- The config APIs are available to ALL authenticated users, not just admins
- React Strict Mode's double invocation is intentional and helps catch side effects - the fix ensures the code works correctly even with double invocation
