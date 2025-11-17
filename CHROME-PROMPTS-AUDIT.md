# Chrome Prompts Audit - Leads Management Section

## Summary

Found **8 instances** of Chrome prompts (`confirm()` and `alert()`) that need to be replaced with proper modals.

## Instances Found

### 1. Leads Tab - Bulk Status Change
**File:** `src/app/leads/status-pages/status/leads/page.tsx`
**Line:** 320
**Code:** `confirm(\`Change status of ${selectedLeads.length} leads?\`)`
**Action:** Bulk status change confirmation
**Replacement:** ConfirmModal with variant='warning'

### 2. Leads Tab - Bulk Delete
**File:** `src/app/leads/status-pages/status/leads/page.tsx`
**Line:** 340
**Code:** `confirm(\`Delete ${selectedLeads.length} lead${selectedLeads.length > 1 ? 's' : ''}? This cannot be undone.\`)`
**Action:** Bulk delete confirmation
**Replacement:** ConfirmModal with variant='danger'

### 3. Leads Tab - Single Delete (Table View)
**File:** `src/app/leads/status-pages/status/leads/page.tsx`
**Line:** 497
**Code:** `confirm(\`Delete ${lead.name}? This cannot be undone.\`)`
**Action:** Single lead delete confirmation
**Replacement:** ConfirmModal with variant='danger'

### 4. Leads Tab - Delete Error Alert
**File:** `src/app/leads/status-pages/status/leads/page.tsx`
**Line:** 347
**Code:** `alert('Some leads could not be deleted. Please try again.')`
**Action:** Error notification
**Replacement:** Toast notification or error modal

### 5. Main Sheet - Bulk Delete
**File:** `src/app/leads/status-pages/page.tsx`
**Line:** 329
**Code:** `confirm(\`Are you sure you want to delete ${count} lead(s)? This action cannot be undone.\`)`
**Action:** Bulk delete confirmation
**Replacement:** ConfirmModal with variant='danger'

### 6. Main Sheet - Delete Filter List
**File:** `src/app/leads/status-pages/page.tsx`
**Line:** 656
**Code:** `confirm(\`Are you sure you want to delete the entire "${filterListName}" list? This will permanently delete all leads in this list and cannot be undone.\`)`
**Action:** Delete entire filter list confirmation
**Replacement:** ConfirmModal with variant='danger'

### 7. LeadCard Component - Delete
**File:** `src/components/leads/leads/LeadCard.tsx`
**Line:** 202
**Code:** `confirm(\`Delete ${lead.name}?\`)`
**Action:** Single lead delete confirmation
**Replacement:** ConfirmModal with variant='danger'

### 8. LeadTable Component - Delete
**File:** `src/components/leads/leads/LeadTable.tsx`
**Line:** 381
**Code:** `confirm('Are you sure you want to delete this lead?')`
**Action:** Single lead delete confirmation
**Replacement:** ConfirmModal with variant='danger'

### 9. Import Page - Back Confirmation
**File:** `src/app/leads/import-pages/page.tsx`
**Line:** 42
**Code:** `window.confirm('Import is in progress. Are you sure you want to go back?')`
**Action:** Navigation confirmation during import
**Replacement:** ConfirmModal with variant='warning'

## Implementation Plan

### Phase 1: Create Reusable Hook
Create a `useConfirmModal` hook to simplify usage across components.

### Phase 2: Replace Confirms in Order of Priority
1. **High Priority** - Delete operations (dangerous actions)
2. **Medium Priority** - Bulk operations
3. **Low Priority** - Navigation confirmations

### Phase 3: Replace Alerts
Replace `alert()` calls with toast notifications using existing toast system.

## Benefits of Replacement

1. **Better UX** - Modern, branded modals instead of browser defaults
2. **Consistent Design** - Matches app's design system
3. **Mobile Friendly** - Better touch targets and responsive design
4. **Accessibility** - Proper ARIA labels and keyboard navigation
5. **Customizable** - Can add icons, colors, and animations
6. **Non-Blocking** - Doesn't block the entire browser

## Next Steps

1. Create `useConfirmModal` hook
2. Update each file systematically
3. Test all confirmation flows
4. Commit changes

