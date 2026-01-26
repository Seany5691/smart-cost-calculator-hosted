# Scraper Page Errors Fixed

## Issues Resolved

### 1. 404 Not Found - `/api/lookup`
**Problem**: NumberLookup component was calling `/api/lookup` endpoint which didn't exist.

**Solution**: Created `hosted-smart-cost-calculator/app/api/lookup/route.ts`
- Accepts POST requests with `{ phoneNumber: string }`
- Uses ProviderLookupService to lookup provider for single phone number
- Returns `{ provider: string }`
- No authentication required (public endpoint)

### 2. 404 Not Found - `/api/business-lookup`
**Problem**: BusinessLookup component was calling `/api/business-lookup` endpoint which didn't exist.

**Solution**: Created `hosted-smart-cost-calculator/app/api/business-lookup/route.ts`
- Accepts POST requests with `{ businessQuery: string }`
- Uses BusinessLookupScraper to find top 3 businesses on Google Maps
- Uses ProviderLookupService to lookup providers for found phone numbers
- Returns `{ results: Array<{ name, phone, provider }> }`
- No authentication required (public endpoint)

### 3. 401 Unauthorized - `/api/scraper/start` and `/api/scraper/stop`
**Problem**: Scraper API endpoints were using `withAuth` middleware which requires authentication, but the scraper store was not consistently sending auth tokens.

**Solution**: Changed authentication pattern to match leads API
- Modified `/api/scraper/start` to use `verifyAuth` instead of `withAuth` wrapper
- Modified `/api/scraper/stop` to use `verifyAuth` instead of `withAuth` wrapper
- Updated `hosted-smart-cost-calculator/lib/store/scraper.ts` to include auth token from localStorage
- Both `startScraping()` and `stopScraping()` now read token and add Authorization header
- Improved error handling to show actual error messages from API

**Why this approach**: The `verifyAuth` function is more flexible than `withAuth` wrapper - it allows the endpoint to handle authentication inline and provide better error messages. This matches the pattern used successfully in the leads API.

### 4. Deprecated onKeyPress Warning
**Problem**: NumberLookup component was using deprecated `onKeyPress` event.

**Solution**: Updated `hosted-smart-cost-calculator/components/scraper/NumberLookup.tsx`
- Changed `onKeyPress` to `onKeyDown`
- Renamed handler from `handleKeyPress` to `handleKeyDown`

## Files Created
1. `hosted-smart-cost-calculator/app/api/lookup/route.ts` - Provider lookup endpoint
2. `hosted-smart-cost-calculator/app/api/business-lookup/route.ts` - Business lookup endpoint

## Files Modified
1. `hosted-smart-cost-calculator/app/api/scraper/start/route.ts` - Changed from `withAuth` to `verifyAuth`
2. `hosted-smart-cost-calculator/app/api/scraper/stop/route.ts` - Changed from `withAuth` to `verifyAuth`
3. `hosted-smart-cost-calculator/lib/store/scraper.ts` - Added auth token to API requests
4. `hosted-smart-cost-calculator/components/scraper/NumberLookup.tsx` - Fixed deprecated event handler

## Authentication Pattern

The scraper now follows the same authentication pattern as the leads system:

```typescript
// In API route
const authResult = await verifyAuth(request);
if (!authResult.authenticated || !authResult.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const user = authResult.user;
```

```typescript
// In store
// Get auth token from localStorage
let token = null;
if (typeof window !== 'undefined') {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const authData = JSON.parse(authStorage);
    token = authData.token;
  }
}

// Add to headers
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

## Testing
After these changes:
- ✅ NumberLookup should successfully lookup providers without 404 errors
- ✅ BusinessLookup should successfully find businesses without 404 errors
- ✅ Scraper start/stop should work without 401 errors (when user is logged in)
- ✅ No deprecation warnings in console
- ✅ Scraper page should load without 500 errors

## Next Steps
1. Restart the dev server to pick up the new API routes
2. Log in to the application
3. Navigate to /scraper page
4. Test the NumberLookup feature with a South African phone number
5. Test the BusinessLookup feature with a business query (e.g., "Shoprite, Stilfontein")
6. Test starting a scraping session (requires login)
