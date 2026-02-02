# Main Sheet Bad Lead Toggle Implementation

## Overview
Implemented toggle functionality for the "Bad" button in Main Sheet's Available Leads section, with automatic unmarking when leads move to Working Area or other tabs.

## Features Implemented

### 1. Bad Button Toggle ✅
**Location**: Available Leads section in Main Sheet tab

**Behavior**:
- **First click**: Marks lead as "Bad" (highlights red, moves to bottom of list)
- **Second click**: Unmarks lead (removes red highlight, returns to original position in list)
- **Visual feedback**: Success message shows "marked" or "unmarked" status

**Implementation**:
```typescript
const isCurrentlyBad = lead.background_color === '#FF0000';
const newBackgroundColor = isCurrentlyBad ? undefined : '#FF0000';
```

### 2. Auto-Unmark When Adding to Working Area ✅
**Triggers**:
- Clicking "Select" button on a single lead
- Using "Add to Working Area" bulk action

**Behavior**:
- If lead is marked as bad (red), automatically unmark it
- Lead is added to Working Area without red highlighting
- Database updated to remove `background_color`
- UI refreshes to show updated state

**Implementation**:
- Single select: `handleSelectLead()` checks and unmarks before adding
- Bulk select: `handleBulkSelectToWorking()` unmarks all bad leads in batch

### 3. Auto-Unmark When Moving to Other Tabs ✅
**Triggers**:
- Using "Move To" dropdown (Leads, Working On, Later Stage, Bad Leads, Signed)
- Generating a route (moves to "Leads" tab)

**Behavior**:
- All leads in Working Area are unmarked when moved
- `background_color` set to `undefined` in database
- No red highlighting appears in destination tabs

**Implementation**:
```typescript
body: JSON.stringify({ 
  status: targetStatus,
  background_color: undefined // Always unmark
})
```

### 4. No Red Highlighting in Other Tabs ✅
**Affected Tabs**:
- Leads
- Working On
- Later Stage
- Bad Leads
- Signed

**Behavior**:
- Red highlighting only appears in Main Sheet's Available Leads section
- When leads move to any other tab, they're automatically unmarked
- Ensures clean slate in all other views

## Technical Details

### Database Field
- Field: `background_color` (optional string)
- Bad value: `'#FF0000'` (red)
- Unmarked value: `undefined` (not `null`)

### Sorting Logic
Leads with `background_color === '#FF0000'` are sorted to the bottom of the Available Leads list:
```typescript
available.sort((a, b) => {
  const aIsNoGood = a.background_color === '#FF0000';
  const bIsNoGood = b.background_color === '#FF0000';
  
  if (aIsNoGood && !bIsNoGood) return 1;  // Bad leads to bottom
  if (!aIsNoGood && bIsNoGood) return -1;
  
  // Then sort by selected criteria (number, name, or provider)
});
```

### API Endpoints Used
- `PATCH /api/leads/[id]` - Toggle bad status
- `PUT /api/leads/[id]` - Move to status (with unmark)
- `POST /api/leads/routes` - Generate route (with unmark)

## User Experience

### Marking as Bad
1. User clicks "Bad" button on a lead
2. Lead highlights red immediately
3. Lead moves to bottom of list
4. Success message: "Lead Name marked as 'No Good' (highlighted red)"

### Unmarking
1. User clicks "Bad" button again on red lead
2. Red highlight removed
3. Lead returns to normal position in list
4. Success message: "Lead Name unmarked (no longer highlighted)"

### Adding to Working Area
1. User selects bad lead (red) and clicks "Select"
2. Lead added to Working Area without red highlight
3. Lead automatically unmarked in database
4. Success message: "Lead Name added to working area"

### Moving to Other Tabs
1. User adds leads to Working Area (some may have been bad)
2. User clicks "Move To" → selects destination tab
3. All leads moved and automatically unmarked
4. No red highlighting in destination tab
5. Success message: "X lead(s) moved to [Tab Name] successfully!"

## Files Modified
- `app/leads/status-pages/main-sheet.tsx` - All bad lead functionality

## Testing Checklist
- [x] Build successful
- [ ] Bad button toggles correctly (mark/unmark)
- [ ] Red highlighting appears only in Main Sheet Available Leads
- [ ] Single select auto-unmarks bad leads
- [ ] Bulk select auto-unmarks bad leads
- [ ] Move To auto-unmarks all leads
- [ ] Generate Route auto-unmarks all leads
- [ ] No red highlighting in Leads tab
- [ ] No red highlighting in Working On tab
- [ ] No red highlighting in Later Stage tab
- [ ] No red highlighting in Bad Leads tab
- [ ] No red highlighting in Signed tab
- [ ] Bad leads sort to bottom of Available Leads list
- [ ] Unmarked leads return to correct position in list

## Deployment Status
✅ Committed and pushed to GitHub (commit: 9beb457)

Ready for VPS deployment and testing.

## Future Enhancements (Optional)
- Add keyboard shortcut for marking/unmarking (e.g., 'B' key)
- Add bulk mark/unmark action
- Add filter to show only bad leads
- Add count of bad leads in Available Leads header
- Add undo functionality for accidental marks
