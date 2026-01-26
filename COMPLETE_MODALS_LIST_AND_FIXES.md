# Complete Modals List and Required Fixes

## Modal Z-Index Issue
**Problem:** Modals appear above navigation tabs
**Solution:** Change all modal z-index from `z-50` to `z-40` (navigation is `z-50`)

## Background Opacity Issue
**Problem:** Background too transparent, can see text behind
**Solution:** Change from `bg-black/70` to `bg-black/90` for darker, less transparent background

## All Modals in Leads Section

### Status Change Modals
1. ✅ **LaterStageModal.tsx** - Already updated
   - Needs: z-index fix (z-50 → z-40), darker background (bg-black/70 → bg-black/90)
   
2. ✅ **SignedModal.tsx** - Already updated
   - Needs: z-index fix (z-50 → z-40), darker background (bg-black/70 → bg-black/90)

### Lead Management Modals
3. ✅ **EditLeadModal.tsx** - Just updated
   - Needs: z-index fix (z-50 → z-40), darker background (bg-black/70 → bg-black/90)
   
4. 🔄 **LeadDetailsModal.tsx** - Needs complete update
   - Current: Light theme, z-50
   - Needs: Dark glassmorphism, z-40, bg-black/90, better organization, tabs for sections
   
5. 🔄 **AddNoteModal.tsx** - Needs update
   - Current: Light theme, z-50
   - Needs: Dark glassmorphism, z-40, bg-black/90, blue accent
   
6. 🔄 **AddReminderModal.tsx** - Needs complete update
   - Current: Basic light theme, z-50
   - Needs: Dark glassmorphism, z-40, bg-black/90, purple accent, full functionality like LaterStageModal

### Import Modals
7. 🔄 **ExcelImporter.tsx** (in components/leads/import/)
   - Needs: z-index fix, darker background
   
8. 🔄 **ScrapedListSelector.tsx** (in components/leads/import/)
   - Needs: z-index fix, darker background

### Bulk Action Modals
9. 🔄 **BulkActions.tsx** - Has inline modals
   - Needs: z-index fix, darker background for confirmation modals

### Other Modals
10. 🔄 **ConfirmModal.tsx** - Generic confirmation modal
    - Needs: z-index fix, darker background
    
11. 🔄 **ListManager.tsx** - Has inline modals
    - Needs: z-index fix, darker background

## Notes and Reminders Display Issue

### Problem
Notes and reminders sections in LeadDetailsModal don't display properly

### Files to Check
- `components/leads/NotesSection.tsx` - Check if it fetches and displays notes
- `components/leads/RemindersSection.tsx` - Check if it fetches and displays reminders
- `app/api/leads/[id]/notes/route.ts` - Check API endpoint
- `app/api/leads/[id]/reminders/route.ts` - Check API endpoint

## Standard Modal Styling

All modals should use:

```tsx
// Backdrop
<div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-40 p-4">
  
  // Modal Container
  <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
    
    // Header
    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[color]-500/20 rounded-lg">
          <Icon className="w-5 h-5 text-[color]-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Title</h2>
          <p className="text-sm text-gray-300">Subtitle</p>
        </div>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-white">
        <X className="w-6 h-6" />
      </button>
    </div>
    
    // Content
    <div className="p-6 space-y-4">
      {/* Form fields with bg-white/10 border border-white/20 */}
    </div>
    
    // Footer
    <div className="flex gap-3 justify-end pt-4 border-t border-white/10 px-6 pb-6">
      <button className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20">
        Cancel
      </button>
      <button className="px-6 py-2 bg-[color]-600 text-white rounded-lg hover:bg-[color]-700">
        Confirm
      </button>
    </div>
  </div>
</div>
```

## Color Scheme by Modal Type

- **Edit**: Orange (`bg-orange-500/20`, `text-orange-400`, `bg-orange-600`)
- **View/Details**: Blue (`bg-blue-500/20`, `text-blue-400`, `bg-blue-600`)
- **Add Note**: Blue (`bg-blue-500/20`, `text-blue-400`, `bg-blue-600`)
- **Add Reminder**: Purple (`bg-purple-500/20`, `text-purple-400`, `bg-purple-600`)
- **Later Stage**: Orange (`bg-orange-500/20`, `text-orange-400`, `bg-orange-600`)
- **Signed**: Green (`bg-green-500/20`, `text-green-400`, `bg-green-600`)
- **Delete/Confirm**: Red (`bg-red-500/20`, `text-red-400`, `bg-red-600`)

## Priority Order

1. Fix z-index and background opacity on all existing modals (quick fix)
2. Update AddNoteModal and AddReminderModal (critical for functionality)
3. Update LeadDetailsModal (important for viewing)
4. Update remaining modals (nice to have)
