# API Routes Fix

## Issues
Two 404 errors were occurring on the dashboard:

1. **Routes API**: `GET http://localhost:3000/api/routes? 404 (Not Found)`
   - Error: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
   
2. **Import Sessions API**: `GET http://localhost:3000/api/leads/import/sessions?limit=5 404 (Not Found)`
   - Error: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

## Root Causes

### 1. Routes Store Using Wrong API Path
The `lib/store/routes.ts` file was calling `/api/routes` endpoints, but the actual API routes are at `/api/leads/routes`.

**Incorrect paths:**
- `/api/routes` (GET)
- `/api/routes` (POST)
- `/api/routes/${id}` (DELETE)
- `/api/routes/stats` (GET)

**Correct paths:**
- `/api/leads/routes` (GET)
- `/api/leads/routes` (POST)
- `/api/leads/routes/${id}` (DELETE)
- `/api/leads/routes/stats` (GET)

### 2. Missing Import Sessions API Endpoint
The import sessions API endpoint `/api/leads/import/sessions` didn't exist.

## Solutions Applied

### 1. Fixed Routes Store API Paths
Updated `lib/store/routes.ts` to use the correct API paths:

```typescript
// fetchRoutes
const response = await fetch(`/api/leads/routes?${params.toString()}`, { headers });

// generateRouteFromLeads
const response = await fetch('/api/leads/routes', {
  method: 'POST',
  headers,
  body: JSON.stringify(requestData)
});

// deleteRoute
const response = await fetch(`/api/leads/routes/${id}`, {
  method: 'DELETE',
  headers
});

// getRouteStats
const response = await fetch('/api/leads/routes/stats', { headers });
```

### 2. Created Import Sessions API Endpoint
Created `app/api/leads/import/sessions/route.ts` with:

**Features:**
- GET endpoint to fetch import sessions for the current user
- Pagination support (limit and offset query parameters)
- Returns sessions ordered by created_at DESC
- Includes total count for pagination
- Proper authentication via verifyAuth middleware

**Response format:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "source_type": "scraper" | "excel",
      "list_name": "string",
      "imported_records": 0,
      "status": "pending" | "completed" | "failed",
      "error_message": "string | null",
      "metadata": {},
      "created_at": "timestamp"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 100
  }
}
```

## Files Modified/Created
- `hosted-smart-cost-calculator/lib/store/routes.ts` (modified - fixed API paths)
- `hosted-smart-cost-calculator/app/api/leads/import/sessions/route.ts` (created)

## Testing
After these fixes:
1. Navigate to Leads Dashboard
2. The dashboard should load without 404 errors
3. Recent routes should display (if any exist)
4. Recent import sessions should display (if any exist)

## Status
✅ **FIXED** - Both API endpoints are now correctly configured and accessible
