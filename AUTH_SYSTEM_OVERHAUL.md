# Authentication System Complete Overhaul

## Current Problems
1. Auth errors everywhere - calculator, admin console, config APIs
2. Column name mismatch (is_super_admin vs super_admin)
3. Complex auth flow that's hard to debug
4. No proper password change flow
5. Admin can't manage users easily

## New Requirements
1. ✅ Simple, robust authentication that just works
2. ✅ Admin can add/remove/edit users and their roles
3. ✅ Users can set their own password (admin can't see it)
4. ✅ Camryn (super admin) can never be removed or deleted
5. ✅ First-time users must change their password
6. ✅ No auth errors on any page

## Implementation Plan

### Phase 1: Fix Database Schema (IMMEDIATE)
1. Run fix script to consolidate super_admin columns
2. Ensure all users have proper roles
3. Create password change tracking

### Phase 2: Simplify Auth Flow
1. Remove complex token handling
2. Use simple JWT with proper expiration
3. Store token in httpOnly cookie AND localStorage (fallback)
4. Auto-refresh tokens before expiration

### Phase 3: User Management
1. Admin can create users with temporary passwords
2. Users must change password on first login
3. Admin can reset user passwords (generates temp password)
4. Admin can change user roles
5. Admin can deactivate users (not delete)
6. Camryn is protected from all modifications

### Phase 4: Password Management
1. Users can change their own password anytime
2. Passwords are hashed with bcrypt (admin never sees them)
3. Temporary passwords expire after first use
4. Password requirements: min 8 characters

## Files to Modify/Create

### Database
- [x] Fix super_admin column inconsistency
- [ ] Add password_change_required flag
- [ ] Add last_password_change timestamp
- [ ] Add temporary_password flag

### Backend
- [ ] Simplify lib/auth.ts
- [ ] Fix lib/middleware.ts
- [ ] Update app/api/auth/login/route.ts
- [ ] Create app/api/auth/change-password/route.ts
- [ ] Update app/api/users/route.ts (user management)
- [ ] Create app/api/users/reset-password/[id]/route.ts

### Frontend
- [ ] Simplify lib/store/auth-simple.ts
- [ ] Create components/auth/ChangePasswordModal.tsx
- [ ] Update components/admin/UserManagement.tsx
- [ ] Add password change prompt on first login

### Scripts
- [x] scripts/fix-super-admin-column.js
- [ ] scripts/create-user.js (for admin to create users)
- [ ] scripts/reset-password.js (generates temp password)

## Next Steps
1. Run the database fix script NOW
2. Implement simplified auth system
3. Test thoroughly
4. Document the new flow
