# Routes Table Fix

## Issue
When trying to generate a route from the Main Sheet, users received a 500 Internal Server Error:
```
POST http://localhost:3000/api/leads/routes 500 (Internal Server Error)
Route generation error: Error: Failed to create route
```

## Root Cause
The `routes` table did not exist in the database. While it was defined in:
- `database/schema.sql` (base schema)
- `database/migrations/001_initial_schema.sql` (initial migration)

The table was never actually created during the migration process. Migration 005 attempted to ALTER the routes table, but since it didn't exist, those operations would have failed silently.

## Solution Applied

### Created Migration 006
Created a new migration file `database/migrations/006_ensure_routes_table.sql` that:

1. **Creates the routes table** with all required columns:
   - `id` (UUID, primary key)
   - `user_id` (UUID, foreign key to users)
   - `name` (VARCHAR, route name)
   - `route_url` (TEXT, Google Maps URL)
   - `stop_count` (INTEGER, number of stops)
   - `lead_ids` (UUID[], array of lead IDs)
   - `starting_point` (VARCHAR, optional starting location)
   - `notes` (TEXT, optional notes)
   - `status` (VARCHAR, 'active' or 'completed')
   - `created_at` (TIMESTAMP)

2. **Creates indexes** for performance:
   - `idx_routes_user_id` - for user-specific queries
   - `idx_routes_created_at` - for sorting by date
   - `idx_routes_status` - for filtering by status

3. **Adds constraints**:
   - Foreign key to users table with CASCADE delete
   - Check constraint for status values ('active', 'completed')

### Ran the Migration
```bash
node scripts/migrate.js
```

Result: ✓ Migration 006 completed successfully!

## Files Created/Modified
- `hosted-smart-cost-calculator/database/migrations/006_ensure_routes_table.sql` (new)

## Testing
After the migration:
1. Navigate to Leads > Main Sheet
2. Select multiple leads with valid Google Maps URLs
3. Enter a starting point
4. Click "Generate Route"
5. Route should be created successfully and open in Google Maps

## Related Files
- `hosted-smart-cost-calculator/app/api/leads/routes/route.ts` - API endpoint for route creation
- `hosted-smart-cost-calculator/lib/routes.ts` - Route generation logic
- `hosted-smart-cost-calculator/app/leads/status-pages/main-sheet.tsx` - UI component

## Status
✅ **FIXED** - Routes table now exists and route generation should work
