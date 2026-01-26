# Calculator 401 Error - FINAL FIX

## Problem Identified

The calculator page was getting 401 errors and redirecting to login because:

1. **Missing Authentication Check**: Unlike the dashboard page, the calculator page didn't have proper authentication checks
2. **Hydration Timing Issue**: The page was trying to call `initializeConfigs(token)` before the auth store had hydrated from localStorage
3. **Null Token**: When `token` was null/undefined, the API calls failed with 401, triggering a redirect

## Root Cause

The calculator page was calling `initializeConfigs(token)` immediately when `token` changed, but:
- On initial page load, `token` is `null` until the Zustand store hydrates from localStorage
- The config API endpoints require authentication
- When called with no token, they return 401
- This caused the error and redirect behavior

## Solution Applied

Updated `hosted-smart-cost-calculator/app/calculator/page.tsx` to match the dashboard's authentication pattern:

### Key Changes:

1. **Added Hydration State**:
   ```typescript
   const [isHydrated, setIsHydrated] = useState(false);
   
   useEffect(() => {
     useAuthStore.getState().hydrate();
     setIsHydrated(true);
   }, []);
   ```

2. **Added Authentication Redirect**:
   ```typescript
   useEffect(() => {
     if (isHydrated && !isAuthenticated) {
       router.push('/login');
     }
   }, [isHydrated, isAuthenticated, router]);
   ```

3. **Conditional Config Initialization**:
   ```typescript
   useEffect(() => {
     if (isHydrated && isAuthenticated && token) {
       initializeConfigs(token).catch((error: Error) => {
        console.error('Failed to initialize configs:', error);
       });
     }
   }, [isHydrated, isAuthenticated, token, initializeConfigs]);
   ```

4. **Prevent Premature Rendering**:
   ```typescript
   if (!isHydrated || !isAuthenticated) {
     return null;
   }
   ```

## Why This Works

- **Hydration First**: Waits for auth store to hydrate before checking authentication
- **Authentication Check**: Redirects to login if not authenticated (same as dashboard)
- **Valid Token**: Only calls `initializeConfigs` when we have a valid token
- **No Premature Rendering**: Returns null until authentication is confirmed

## Expected Behavior After Fix

1. User clicks "Calculator" button on dashboard
2. Calculator page loads
3. Auth store hydrates from localStorage
4. If authenticated: Page renders and configs load successfully
5. If not authenticated: Redirects to login page
6. No more 401 errors
7. No more unexpected redirects

## Testing

1. Login to the application
2. Navigate to dashboard
3. Click "Calculator" button
4. Calculator page should load without errors
5. Navigate directly to `localhost:3000/calculator`
6. Should work without redirect or errors

## Files Modified

- `hosted-smart-cost-calculator/app/calculator/page.tsx` - Added authentication pattern matching dashboard

## Related Files (No Changes Needed)

- `hosted-smart-cost-calculator/lib/store/config.ts` - Already accepts token parameter
- `hosted-smart-cost-calculator/lib/store/auth-simple.ts` - Working correctly
- `hosted-smart-cost-calculator/components/calculator/CalculatorWizard.tsx` - No changes needed
- `hosted-smart-cost-calculator/app/page.tsx` - Dashboard pattern used as reference
