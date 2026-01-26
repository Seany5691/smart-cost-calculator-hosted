# Shared Leads Status Filtering - Fix Complete

## Problem
Shared leads were appearing on ALL tabs regardless of their status. For example:
- Sharer shares a lead with status "leads"
- Sharee could see that lead on ALL tabs (Main Sheet, Leads, Working On, Later Stage, Bad Leads, Signed)
- This was confusing and incorrect behavior

## Root Cause
In `/api/leads/route.ts`, the shared leads query was fetching ALL shared leads without applying the same status filters that were applied to owned leads:

```typescript
// OLD CODE - No filters applied to shared leads
const sharedLeadsQuery = `
  SELECT DISTINCT l.* FROM leads l
  INNER JOIN lead_shares ls ON l.id = ls.lead_id
  WHERE ls.shared_with_user_id = $1::uuid
`;
```

This meant:
1. Owned leads were filtered by status ✅
2. Shared leads were NOT filtered by status ❌
3. Result: Shared leads appeared everywhere

## Solution
Applied the SAME filters to shared leads that are applied to owned leads:

```typescript
// NEW CODE - All filters applied to shared leads
let sharedLeadsQuery = `
  SELECT DISTINCT l.* FROM leads l
  INNER JOIN lead_shares ls ON l.id = ls.lead_id
  WHERE ls.shared_with_user_id = $1::uuid
`;

// Apply status filter
if (status && status.length > 0) {
  sharedLeadsQuery += ` AND l.status = ANY($${sharedParamIndex})`;
  sharedParams.push(status);
}

// Apply provider filter
if (provider && provider.length > 0) {
  sharedLeadsQuery += ` AND l.provider = ANY($${sharedParamIndex})`;
  sharedParams.push(provider);
}

// Apply town filter
if (town && town.length > 0) {
  sharedLeadsQuery += ` AND l.town = ANY($${sharedParamIndex})`;
  sharedParams.push(town);
}

// Apply list name filter
if (listName) {
  sharedLeadsQuery += ` AND l.list_name = $${sharedParamIndex}`;
  sharedParams.push(listName);
}

// Apply search filter
if (search) {
  sharedLeadsQuery += ` AND (
    l.name ILIKE $${sharedParamIndex} OR
    l.phone ILIKE $${sharedParamIndex} OR
    ...
  )`;
  sharedParams.push(`%${search}%`);
}
```

## How It Works Now

### Scenario 1: Share from "Leads" Tab
1. **Sharer** has a lead with `status = 'leads'`
2. **Sharer** shares it with User B
3. **User B** navigates to "Leads" tab
4. ✅ User B sees the shared lead (status filter matches)
5. **User B** navigates to "Working On" tab
6. ✅ User B does NOT see the lead (status filter doesn't match)

### Scenario 2: Status Change
1. **Sharer** has a lead with `status = 'leads'` shared with User B
2. **User B** (or Sharer) changes status to `'working'`
3. **Both users** navigate to "Leads" tab
4. ✅ Lead is NOT visible (status changed)
5. **Both users** navigate to "Working On" tab
6. ✅ Lead IS visible (status matches)

### Scenario 3: Multiple Statuses
1. **Sharer** shares 3 leads:
   - Lead A: status = 'leads'
   - Lead B: status = 'working'
   - Lead C: status = 'signed'
2. **Sharee** views different tabs:
   - "Leads" tab: ✅ Only sees Lead A
   - "Working On" tab: ✅ Only sees Lead B
   - "Signed" tab: ✅ Only sees Lead C

## Filters Applied to Shared Leads

All the same filters that apply to owned leads now apply to shared leads:

1. ✅ **Status Filter** - Most important for tab-based navigation
2. ✅ **Provider Filter** - Filter by provider dropdown
3. ✅ **Town Filter** - Filter by town dropdown
4. ✅ **List Name Filter** - Filter by custom lists
5. ✅ **Search Filter** - Search across name, phone, provider, etc.

## Benefits

### 1. Consistent Behavior
- Owned and shared leads behave identically
- Same filtering rules apply to all leads
- No special cases or exceptions

### 2. Correct Tab Navigation
- Leads appear on the correct tab based on their status
- Status changes move leads to the correct tab for everyone
- No confusion about where leads are located

### 3. Proper Collaboration
- When sharer changes status, sharee sees it in the right place
- When sharee changes status, sharer sees it in the right place
- Everyone stays in sync

### 4. Better UX
- Users only see relevant leads on each tab
- No clutter from leads with different statuses
- Clear organization and navigation

## Testing Checklist

✅ Share a lead with status "leads" - appears only in Leads tab for sharee
✅ Share a lead with status "working" - appears only in Working On tab for sharee
✅ Share a lead with status "signed" - appears only in Signed tab for sharee
✅ Change status from "leads" to "working" - moves to correct tab for both users
✅ Change status from "working" to "signed" - moves to correct tab for both users
✅ Filter by provider - shared leads respect the filter
✅ Filter by town - shared leads respect the filter
✅ Search - shared leads appear in search results
✅ Multiple shared leads with different statuses - each appears on correct tab

## Files Modified

1. **`app/api/leads/route.ts`** - Applied all filters to shared leads query

## No Database Changes Required

This is purely a query logic fix. No database migrations or schema changes needed.

## Status

✅ **COMPLETE** - Shared leads now respect status filters and appear on the correct tabs

## How to Test

1. **As User A (Sharer)**:
   - Create a lead with status "leads"
   - Share it with User B
   - Navigate to "Leads" tab - you see it ✅
   - Navigate to "Working On" tab - you don't see it ✅

2. **As User B (Sharee)**:
   - Navigate to "Leads" tab - you see the shared lead ✅
   - Navigate to "Working On" tab - you don't see it ✅
   - Change the lead status to "working"
   - Navigate to "Leads" tab - lead is gone ✅
   - Navigate to "Working On" tab - lead appears ✅

3. **As User A (Sharer) - After Status Change**:
   - Navigate to "Leads" tab - lead is gone ✅
   - Navigate to "Working On" tab - lead appears ✅
   - Status change by sharee is reflected for sharer ✅

## Summary

The fix ensures that shared leads follow the same filtering rules as owned leads, particularly for status-based tab navigation. This provides a consistent, predictable experience where leads always appear on the correct tab based on their current status, regardless of who owns them or who they're shared with.
