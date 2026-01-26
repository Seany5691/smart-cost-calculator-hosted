# Shared Leads Visibility - COMPLETE ✅

## Issue
After sharing a lead successfully, the shared user could not see the lead in their leads list.

## Root Cause
The leads API endpoints were only querying for leads where `user_id = current_user_id`, excluding leads that had been shared with the user via the `lead_shares` table.

## Fix Applied

### 1. Updated GET /api/leads (List All Leads)
Modified the query to include leads that are:
- Owned by the user (`l.user_id = $1`), OR
- Shared with the user (`ls.shared_with_user_id = $1`)

```sql
SELECT DISTINCT l.* FROM leads l
LEFT JOIN lead_shares ls ON l.id = ls.lead_id
WHERE (l.user_id = $1 OR ls.shared_with_user_id = $1)
```

Updated all filter conditions to use table alias `l.` for proper JOIN syntax.

### 2. Updated GET /api/leads/[id] (Single Lead)
Modified to check if user has access (owner or shared):
```sql
SELECT l.* FROM leads l
LEFT JOIN lead_shares ls ON l.id = ls.lead_id
WHERE l.id = $1 AND (l.user_id = $2 OR ls.shared_with_user_id = $2)
```

### 3. Updated PUT /api/leads/[id] (Update Lead)
- Checks if user has access (owner or shared)
- Only allows the OWNER to update the lead
- Returns 403 Forbidden if non-owner tries to update

### 4. Updated DELETE /api/leads/[id] (Delete Lead)
- Only allows the OWNER to delete the lead
- Returns 403 Forbidden if non-owner tries to delete

### 5. Updated GET /api/leads/[id]/notes
- Checks if user has access to the lead before showing notes
- All users with access can see all notes (as per requirements)

### 6. Updated POST /api/leads/[id]/notes
- Checks if user has access to the lead before allowing note creation
- All users with access can add notes

### 7. Updated GET /api/leads/[id]/reminders
- Checks if user has access to the lead before showing reminders
- All users with access can see all reminders

### 8. Updated POST /api/leads/[id]/reminders
- Checks if user has access to the lead before allowing reminder creation
- All users with access can add reminders

## Access Control Summary

### Shared Users CAN:
- ✅ View the lead in their leads list
- ✅ View lead details
- ✅ View all notes on the lead
- ✅ Add notes to the lead
- ✅ View all reminders on the lead
- ✅ Add reminders to the lead
- ✅ Re-share the lead with other users

### Shared Users CANNOT:
- ❌ Update lead details (only owner can)
- ❌ Delete the lead (only owner can)

## Files Modified
- `app/api/leads/route.ts` (GET method)
- `app/api/leads/[id]/route.ts` (GET, PUT, DELETE methods)
- `app/api/leads/[id]/notes/route.ts` (GET, POST methods)
- `app/api/leads/[id]/reminders/route.ts` (GET, POST methods)

## Testing
1. User A shares a lead with User B
2. User B logs in and should now see the lead in their leads list
3. User B can view the lead details
4. User B can see all notes and add new notes
5. User B can see all reminders and add new reminders
6. User B can re-share the lead with User C
7. User B cannot edit or delete the lead (only User A can)

## Next Steps
- Test the visibility of shared leads
- Verify notes and reminders are visible to all shared users
- Test re-sharing functionality
- Implement reminder selective sharing UI (future enhancement)
