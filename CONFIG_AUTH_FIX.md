# Config Store Authentication Fix

## Problem
The calculator page was unable to display the settlement calculator and total costs page due to authentication errors. All config API endpoints were returning 401 (Unauthorized) errors:

- `/api/config/hardware` - 401 Unauthorized
- `/api/config/connectivity` - 401 Unauthorized  
- `/api/config/licensing` - 401 Unauthorized
- `/api/config/factors` - 401 Unauthorized
- `/api/config/scales` - 401 Unauthorized

## Root Cause
The config store (`lib/store/config.ts`) was making API requests without including the authentication token in the request headers. All five fetch methods were missing the `Authorization: Bearer <token>` header.

## Solution
Updated all five fetch methods in the config store to:
1. Import and access the auth store dynamically
2. Retrieve the current authentication token
3. Include the token in the `Authorization` header for all API requests

### Modified Methods
- `fetchHardware()`
- `fetchConnectivity()`
- `fetchLicensing()`
- `fetchFactors()`
- `fetchScales()`

Each method now follows this pattern:
```typescript
// Get auth token
const authStore = (await import('./auth')).useAuthStore.getState();
const token = authStore.token;

const headers: HeadersInit = {
  'Content-Type': 'application/json',
};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch('/api/config/[endpoint]', { headers });
```

## Impact
This fix resolves:
- ✅ Settlement calculator not displaying
- ✅ Total costs page not displaying
- ✅ All 401 authentication errors in the console
- ✅ Config initialization failures

## Testing
After this fix:
1. Log in to the application
2. Navigate to the calculator page
3. Verify all steps load correctly, including:
   - Hardware step
   - Connectivity step
   - Licensing step
   - Settlement calculator
   - Total costs page
4. Check browser console - no more 401 errors should appear

## Date
January 13, 2026
