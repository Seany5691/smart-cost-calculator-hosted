# Route Generation Strategy Fix

## Issue
Route generation was failing with a 500 Internal Server Error when trying to generate routes from the Main Sheet.

## Root Cause
**Strategy Mismatch between Old and New App:**

### Old App Strategy (Client-Side Generation)
1. Client extracts coordinates from lead URLs
2. Client generates Google Maps URL
3. Client sends pre-generated URL to API
4. API simply stores the route data

### New App Strategy (Server-Side Generation)
1. Client sends lead IDs to API
2. API fetches leads from database
3. API extracts coordinates from maps_address
4. API generates Google Maps URL
5. API stores the route data

**The Problem:** The main-sheet component was following the old app's client-side approach, but the API was expecting the new server-side approach. This caused a mismatch in the data being sent vs. what the API expected.

## Solution Applied

### Updated API to Accept Pre-Generated Route URL
Modified `/api/leads/routes` POST endpoint to accept:

**Request Body:**
```typescript
{
  name?: string,           // Optional route name
  routeUrl: string,        // Pre-generated Google Maps URL (required)
  stopCount: number,       // Number of stops (required)
  leadIds: string[],       // Array of lead IDs (required)
  startingPoint?: string   // Optional starting point
}
```

**Changes Made:**
1. Removed server-side coordinate extraction logic
2. Removed server-side route URL generation
3. Accept `routeUrl` directly from client
4. Accept `stopCount` directly from client
5. Generate default route name if not provided
6. Simplified validation to check for required fields

**Benefits of Client-Side Generation:**
- Matches the old app's proven approach
- Faster response time (no database queries for leads)
- Client already has the lead data loaded
- Simpler API logic
- Better error handling on client side (can show which specific leads failed)

## Files Modified
- `hosted-smart-cost-calculator/app/api/leads/routes/route.ts` - Simplified POST handler to accept pre-generated route data

## How It Works Now

### Client-Side (main-sheet.tsx)
1. User selects leads and enters starting point
2. Component extracts coordinates from each lead's maps_address
3. Component validates coordinates
4. Component generates Google Maps URL using `generateRouteUrl()`
5. Component calculates stop count
6. Component sends complete route data to API

### Server-Side (API)
1. Validates authentication
2. Validates required fields (routeUrl, stopCount, leadIds)
3. Generates route name if not provided
4. Inserts route into database
5. Updates lead statuses to "leads"
6. Returns created route

## Testing
After this fix:
1. Navigate to Leads > Main Sheet
2. Select multiple leads with valid Google Maps URLs
3. Enter a starting point
4. Click "Generate Route"
5. Route should be created successfully
6. Google Maps should open with the route
7. Leads should move to "Leads" tab

## Status
✅ **FIXED** - Route generation now follows the same client-side strategy as the old app
