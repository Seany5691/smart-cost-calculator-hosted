# Middleware Dynamic Route Parameters Fix

## Issue Fixed

The middleware functions (`withAuth`, `withRole`, `withAdmin`) were not passing the second parameter (context with params) to route handlers, causing errors in dynamic routes like `/api/users/[id]`.

### Error Message
```
TypeError: Cannot destructure property 'params' of 'undefined' as it is undefined.
```

## Root Cause

Next.js route handlers with dynamic segments receive two parameters:
1. `request` - The NextRequest object
2. `context` - An object containing `params` (the dynamic route parameters)

The middleware was only passing the `request` parameter, causing `context` to be `undefined`.

## Solution

Updated all middleware functions to support optional context parameter:

### Before
```typescript
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // ... auth logic
    return handler(authenticatedRequest);
  };
}
```

### After
```typescript
export function withAuth<T = any>(
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    // ... auth logic
    return handler(authenticatedRequest, context);
  };
}
```

## Files Modified

1. **lib/middleware.ts**
   - Updated `withAuth` to accept and pass context parameter
   - Updated `withRole` to accept and pass context parameter
   - Updated `withAdmin` to accept and pass context parameter
   - Updated `withAdminOrManager` to accept and pass context parameter
   - Added generic type parameter `<T>` for type safety

2. **app/api/users/[id]/route.ts**
   - Updated GET handler to extract params from context
   - Updated PATCH handler to extract params from context
   - Updated DELETE handler to extract params from context

## Handler Pattern

### For Dynamic Routes (with params)
```typescript
export const GET = withAdmin(
  async (
    request: AuthenticatedRequest,
    context: { params: { id: string } }
  ) => {
    const { params } = context;
    // Use params.id
  }
);
```

### For Regular Routes (no params)
```typescript
export const GET = withAdmin(
  async (request: AuthenticatedRequest) => {
    // No context needed
  }
);
```

## Testing

### Test User Update (PATCH)
1. Go to Admin Console → User Management
2. Click "Edit" on a regular user
3. Change any field (name, email, role, active status)
4. Click "Save"
5. ✅ Should save successfully without 500 error

### Test Password Reset
1. Click "Reset Password" on any user
2. Enter new password
3. ✅ Should reset successfully without 500 error

### Test User Creation (POST)
1. Click "Add User" button
2. Fill in all fields:
   - Username (min 3 characters)
   - Name
   - Email (valid format)
   - Password (min 8 characters)
   - Role
3. Click "Create"
4. ✅ Should create successfully

### Test User Deletion (DELETE)
1. Click "Delete" on a regular user (not super admin)
2. Confirm deletion
3. ✅ Should delete successfully without 500 error

## Expected Behavior

- All user management operations should work without errors
- No more "Cannot destructure property 'params'" errors
- No more 500 Internal Server Error responses
- Super admin protection still enforced
- All other dynamic routes continue to work

## Notes

- The middleware now supports both regular routes and dynamic routes
- The generic type parameter `<T>` provides type safety for the context
- The context parameter is optional, so regular routes don't need to change
- This fix applies to all routes using `withAuth`, `withRole`, `withAdmin`, or `withAdminOrManager`

## Other Dynamic Routes That Benefit

This fix also resolves potential issues in other dynamic routes:
- `/api/leads/[id]/*`
- `/api/calculator/deals/[id]`
- `/api/config/*/[id]`
- `/api/scraper/sessions/[id]`
- And any other routes with dynamic segments
