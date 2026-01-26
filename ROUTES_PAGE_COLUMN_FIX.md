# Routes Page Column Name Fix

## Issue
The "Open in Maps" button on the Routes page was opening a blank page because the component was using the old column name `route_url` instead of the current database column name `google_maps_url`.

## Root Cause
Migration 005 renamed the column from `route_url` to `google_maps_url` in the database, but some TypeScript interfaces and component code still referenced the old name.

## Files Fixed

### 1. `app/leads/routes-page.tsx`
- **Line 10**: Updated Route interface from `route_url: string` to `google_maps_url: string`
- **Line 195**: Updated button onClick from `route.route_url` to `route.google_maps_url`

### 2. `components/leads/RoutesSection.tsx`
- **Line 9**: Updated Route interface from `route_url: string` to `google_maps_url: string`
- **Line 365**: Updated button onClick from `route.route_url` to `route.google_maps_url`

### 3. `scripts/check-routes-table.js`
- **Line 31**: Updated test INSERT statement from `route_url` to `google_maps_url`

## Verification

### Already Correct
- ✅ `lib/leads/types.ts` - Route interface already uses `google_maps_url`
- ✅ `lib/store/routes.ts` - Imports Route type from types.ts (correct)
- ✅ `app/api/leads/routes/route.ts` - API already uses `google_maps_url` in INSERT statement
- ✅ Database schema - Column is `google_maps_url` (from migration 005)

## Testing
1. Clear browser cache (Ctrl+Shift+Delete)
2. Navigate to Leads > Routes tab
3. Click "Open in Maps" button on any route
4. Verify that Google Maps opens with the correct route URL

## Status
✅ **COMPLETE** - All references to `route_url` in the hosted app have been updated to `google_maps_url`
