# Modal Standardization Fixes

## Issues Found

### 1. Chrome Notification Modals (window.confirm/alert/prompt)
These need to be replaced with custom modals matching the app style:

**Admin Section:**
- `components/admin/UserManagement.tsx` - Line 565: `prompt()` for password reset

**Leads Section:**
- `components/leads/AttachmentsSection.tsx` - Line 125: `window.confirm()` for delete
- `components/leads/LeadsCards.tsx` - Lines 191, 222: `window.confirm()` for delete note/reminder
- `components/leads/LeadsTable.tsx` - Lines 165, 196: `window.confirm()` for delete note/reminder
- `components/leads/NotesSection.tsx` - Line 120: `window.confirm()` for delete note
- `components/leads/RemindersSection.tsx` - Line 197: `window.confirm()` for delete reminder
- `components/leads/RoutesSection.tsx` - Line 140: `window.confirm()` for delete route
- `app/leads/reminders-page.tsx` - Line 81: `window.confirm()` for delete reminder

### 2. Inconsistent Modal Styling
- `components/leads/BulkActions.tsx` - Delete modal has different styling (bg-white/10 instead of gradient)
- Admin modals use purple gradient (from-slate-900 to-purple-900)
- Leads modals use emerald gradient (from-slate-900 to-emerald-900)
- Need to ensure all modals in each section match their respective color schemes

### 3. Z-Index Issues
- All modals should use z-[9999] to ensure they appear above everything
- BulkActions delete modal uses z-50 (should be z-[9999])

## Solution

1. Create a reusable PasswordResetModal for admin section
2. Replace all window.confirm() calls with ConfirmModal component
3. Standardize all modal styling within each section
4. Ensure all modals use z-[9999] and createPortal to document.body

## Implementation Plan

1. Fix admin password reset modal
2. Replace all Chrome prompts in leads section
3. Standardize BulkActions modal styling
4. Verify all modals are properly positioned and styled
