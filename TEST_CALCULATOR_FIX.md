# Testing the Calculator 401 Fix

## Quick Test Steps

1. **Clear Browser State**
   - Open DevTools (F12)
   - Go to Application tab
   - Clear all localStorage
   - Clear all cookies
   - Close DevTools

2. **Restart Dev Server** (if running)
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

3. **Test Login Flow**
   - Navigate to `http://localhost:3000/login`
   - Log in with valid credentials
   - Should redirect to dashboard
   - Dashboard should load without errors

4. **Test Calculator Page**
   - Click on "Calculator" button or navigate to `http://localhost:3000/calculator`
   - Open DevTools Console (F12)
   - **Expected**: No 401 errors
   - **Expected**: All config API calls return 200 OK
   - **Expected**: Calculator wizard loads successfully

5. **Verify Console Logs**
   Look for these in the console:
   - ✅ No "401 (Unauthorized)" errors
   - ✅ No "Failed to fetch hardware items" errors
   - ✅ No "Failed to fetch connectivity items" errors
   - ✅ No "Failed to fetch licensing items" errors
   - ✅ No "Failed to fetch factors" errors
   - ✅ No "Failed to fetch scales" errors

6. **Test Direct Navigation**
   - While logged in, directly navigate to `http://localhost:3000/calculator` in address bar
   - Should load without errors
   - Should NOT redirect to login

7. **Test Without Login**
   - Log out
   - Try to navigate to `http://localhost:3000/calculator`
   - Should redirect to login page

## What Was Fixed

The issue was that the config store was trying to read the auth token from localStorage using a helper function, but there were timing issues with when the token was available. The fix:

1. Removed the `getAuthToken()` helper function
2. Updated all config fetch functions to accept an optional `token` parameter
3. Updated the calculator page to pass the token explicitly from the auth store
4. Ensured auth state is synced to localStorage after hydration

## If Issues Persist

If you still see 401 errors:

1. **Check the token is in localStorage**
   - Open DevTools → Application → Local Storage
   - Look for `auth-storage` key
   - Verify it contains a `token` field

2. **Check the token is in auth store**
   - In console, run: `localStorage.getItem('auth-storage')`
   - Should show JSON with token

3. **Check the API is receiving the token**
   - In Network tab, click on a failed request
   - Check Headers → Request Headers
   - Look for `Authorization: Bearer <token>`

4. **Check for console errors**
   - Look for "No token available after hydration" message
   - This would indicate the auth store didn't hydrate correctly

## Success Criteria

✅ User can log in successfully
✅ User can navigate to calculator page
✅ All config API calls return 200 OK
✅ Calculator wizard displays correctly
✅ No 401 errors in console
✅ No "Failed to fetch" errors in console
