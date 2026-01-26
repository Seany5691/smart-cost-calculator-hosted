# Leads Section Authentication Fix - COMPLETE

## Issue
The leads section was returning 401 Unauthorized errors when trying to:
- Fetch leads
- Add new leads
- Import leads
- Access any leads-related functionality

## Root Cause
**Two separate issues:**

1. **Zustand Stores**: The leads-related Zustand stores were making API calls without including the Authorization header with the Bearer token.

2. **Direct Component Fetch Calls**: The `main-sheet.tsx` component was making direct fetch calls using `localStorage.getItem('token')` instead of reading from the correct `auth-storage` key where Zustand persist stores the token.

## Files Fixed

### Zustand Stores (Issue #1)

#### 1. `/lib/store/leads.ts`
Added `getAuthToken()` helper function and updated all fetch calls:
- `fetchLeads()` - GET /api/leads
- `fetchAllLeadsForStats()` - GET /api/leads?all=true
- `updateLead()` - PUT /api/leads/:id
- `deleteLead()` - DELETE /api/leads/:id
- `changeLeadStatus()` - PUT /api/leads/:id
- `getUniqueListNames()` - GET /api/leads/lists
- `deleteList()` - DELETE /api/leads/lists/:listName

#### 2. `/lib/store/import.ts`
Added `getAuthToken()` helper function and updated:
- `fetchImportSessions()` - GET /api/leads/import/sessions

#### 3. `/lib/store/reminders.ts`
Added `getAuthToken()` helper function and updated:
- `fetchAllReminders()` - GET /api/reminders
- `createReminder()` - POST /api/leads/:id/reminders
- `updateReminder()` - PUT /api/leads/:id/reminders/:reminderId
- `deleteReminder()` - DELETE /api/leads/:id/reminders/:reminderId

#### 4. `/lib/store/routes.ts`
Added `getAuthToken()` helper function and updated:
- `fetchRoutes()` - GET /api/routes
- `generateRouteFromLeads()` - POST /api/routes
- `deleteRoute()` - DELETE /api/routes/:id
- `getRouteStats()` - GET /api/routes/stats

### Direct Component Calls (Issue #2)

#### 5. `/app/leads/status-pages/main-sheet.tsx`
Added `getAuthToken()` helper function and updated all direct fetch calls:
- `fetchListNames()` - GET /api/leads/lists
- `fetchLeadsData()` - GET /api/leads?status=new
- `handleNoGood()` - PATCH /api/leads/:id
- `confirmBulkDelete()` - DELETE /api/leads/:id (bulk)
- `handleGenerateRoute()` - POST /api/leads/routes + PATCH /api/leads/:id (bulk)
- `handleDeleteList()` - DELETE /api/leads/lists/:listName + GET /api/leads/lists
- Import callbacks (2 instances) - GET /api/leads/lists

#### 6. `/components/leads/import/ExcelImporter.tsx`
Added `getAuthToken()` helper function and updated:
- `handleImport()` - POST /api/leads/import/excel

#### 7. `/components/leads/import/ScrapedListSelector.tsx`
Added `getAuthToken()` helper function and updated:
- `fetchScraperSessions()` - GET /api/scraper/sessions
- `handleSessionSelect()` - GET /api/scraper/sessions/:id
- `handleImport()` - POST /api/leads/import/scraper

## Solution Pattern
Each store and component now follows the same pattern as the working calculator and config stores:

```typescript
// Helper function to get auth token directly from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.token || data.token || null;
    }
  } catch (error) {
    console.error('[COMPONENT_NAME] Error reading auth token from localStorage:', error);
  }
  return null;
}

// In fetch calls:
const token = getAuthToken();
const headers: HeadersInit = { 'Content-Type': 'application/json' };
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch('/api/endpoint', { headers });
```

## What Was NOT Changed
- No changes to API routes (they were already correctly using `verifyAuth`)
- No changes to auth system or middleware
- No changes to calculator or admin sections (they were already working)

## Testing
After clearing browser cache and restarting the dev server:
1. Login should work (already working)
2. Calculator should work (already working)
3. Admin should work (already working)
4. **Leads section should now work** - can fetch, add, import, and manage leads
5. Reminders should work
6. Routes should work
7. Main Sheet page should work

## Next Steps
1. Clear browser cache completely (Ctrl+Shift+Delete)
2. Restart the dev server
3. Login again
4. Test leads functionality:
   - View leads list
   - Add a new lead
   - Import leads from Excel/Scraper
   - Edit/delete leads
   - Add reminders
   - Generate routes
   - Use Main Sheet page

The leads section should now work exactly like the calculator and admin sections!
