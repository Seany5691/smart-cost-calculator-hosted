# User Management Field Mapping Fixed

## Issue
When trying to create or edit users, the API was returning 400 and 500 errors because of field name mismatches between the database (snake_case) and the frontend (camelCase).

### Errors:
1. **POST /api/users 400 (Bad Request)** - Creating users failed
2. **PATCH /api/users/[id] 500 (Internal Server Error)** - Updating users failed with JSON parsing error

## Root Cause
The PostgreSQL database uses snake_case column names:
- `is_active`
- `requires_password_change`
- `is_super_admin`
- `created_at`
- `updated_at`

But the frontend component expects camelCase:
- `isActive`
- `requiresPasswordChange`
- `isSuperAdmin`
- `createdAt`
- `updatedAt`

The API wasn't mapping between these formats, causing the mismatch.

## Solution
Added SQL column aliases in all user API routes to convert snake_case to camelCase:

### Files Fixed:

#### 1. `app/api/users/route.ts`
- **GET handler**: Added aliases to SELECT query
  ```sql
  SELECT id, username, role, name, email, 
         is_active as "isActive", 
         requires_password_change as "requiresPasswordChange", 
         is_super_admin as "isSuperAdmin", 
         created_at as "createdAt", 
         updated_at as "updatedAt"
  ```

- **POST handler**: Added aliases to RETURNING clause
  ```sql
  RETURNING id, username, role, name, email, 
            is_active as "isActive", 
            requires_password_change as "requiresPasswordChange", 
            is_super_admin as "isSuperAdmin", 
            created_at as "createdAt", 
            updated_at as "updatedAt"
  ```

#### 2. `app/api/users/[id]/route.ts`
- **GET handler**: Added aliases to SELECT query
- **PATCH handler**: Added aliases to RETURNING clause

## Testing
After these fixes, you should be able to:

1. ✅ **View all users** - List displays correctly with proper field names
2. ✅ **Add new users** - Create users with all fields properly mapped
3. ✅ **Edit users** - Update user details without errors
4. ✅ **Delete users** - Remove users (except super admin)
5. ✅ **Reset passwords** - Change passwords successfully

## Technical Details
PostgreSQL's `AS "camelCase"` syntax ensures the returned column names match JavaScript naming conventions, making the API response compatible with the frontend without requiring additional transformation logic.

## Status
✅ **COMPLETE** - All field mapping issues resolved
