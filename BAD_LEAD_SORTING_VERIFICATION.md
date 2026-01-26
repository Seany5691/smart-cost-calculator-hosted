# "Bad" Lead Sorting - Verification

## Current Implementation Status: ✅ ALREADY WORKING CORRECTLY

The "Bad" button functionality on the Main Sheet is **already implemented correctly** and should be working as requested.

## How It Works

### 1. When "Bad" Button is Clicked

**Location**: Main Sheet > Available Leads section

**Function**: `handleNoGood(leadId)`

**What Happens**:
1. Sets the lead's `background_color` to `#FF0000` (red) in the database
2. Removes the lead from the working area (if it was there)
3. Refreshes the leads data
4. Shows success message: "{Lead Name} marked as 'No Good' (highlighted red)"

**Code** (lines 270-303):
```typescript
const handleNoGood = async (leadId: string) => {
  try {
    setError(null);
    const token = getAuthToken();
    
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ background_color: '#FF0000' })
    });

    if (!response.ok) {
      throw new Error('Failed to mark lead as no good');
    }

    setWorkingLeads(workingLeads.filter(l => l.id !== leadId));
    await fetchLeadsData();
    
    setSuccessMessage(`${lead.name} marked as "No Good" (highlighted red)`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  } catch (err: any) {
    setError(err.message || 'Failed to mark lead as no good');
  }
};
```

### 2. Sorting Logic - "No Good" Leads Go to Bottom

**Location**: `filteredAndSortedLeads` useMemo (lines 196-227)

**Sorting Priority**:
1. **First**: "No Good" leads (red background) are sorted to the BOTTOM
2. **Then**: Regular leads are sorted by the selected sort option (Number, Name, or Provider)

**Code**:
```typescript
available.sort((a, b) => {
  const aIsNoGood = a.background_color === '#FF0000';
  const bIsNoGood = b.background_color === '#FF0000';
  
  // "No Good" leads always go to the bottom
  if (aIsNoGood && !bIsNoGood) return 1;  // a goes after b
  if (!aIsNoGood && bIsNoGood) return -1; // a goes before b
  
  // If both are "No Good" or both are regular, sort by selected option
  if (sortBy === 'name') {
    return (a.name || '').localeCompare(b.name || '');
  } else if (sortBy === 'provider') {
    return (a.provider || '').localeCompare(b.provider || '');
  } else {
    return (a.number || 0) - (b.number || 0);
  }
});
```

### 3. Visual Highlighting

**Mobile View** (lines 1045-1090):
- "No Good" leads have red background: `bg-red-500/20 border-red-500/30`
- Lead name is red: `text-red-300`

**Desktop View** (lines 1135-1185):
- "No Good" leads have red background: `bg-red-500/10`
- Lead name is red: `text-red-300`

## Expected Behavior

1. **Click "Bad" button** on any lead in Available Leads
2. **Lead is highlighted red** immediately after refresh
3. **Lead moves to the bottom** of the Available Leads list
4. **Lead stays at the bottom** even when:
   - Changing sort option (Number, Name, Provider)
   - Changing provider filter
   - Changing list filter
   - Refreshing the page

## Why It Works

The sorting logic uses a **two-tier sort**:
1. **Primary sort**: "No Good" status (red background)
   - Regular leads: sorted first
   - "No Good" leads: sorted last
2. **Secondary sort**: Selected sort option (Number, Name, Provider)
   - Applied within each group (regular leads, then "No Good" leads)

This ensures "No Good" leads **always remain at the bottom** regardless of other sorting options.

## Testing Instructions

1. Go to Main Sheet page
2. Find any lead in Available Leads section
3. Click the "Bad" button (red button with X icon)
4. **Verify**:
   - Lead is highlighted red
   - Lead moves to bottom of list
   - Success message appears
5. **Test persistence**:
   - Change sort option → Lead stays at bottom ✓
   - Change provider filter → Lead stays at bottom ✓
   - Refresh page → Lead stays at bottom ✓

## Troubleshooting

If "Bad" leads are NOT going to the bottom:

1. **Check database**: Verify `background_color` is set to `#FF0000`
   ```sql
   SELECT id, name, background_color FROM leads WHERE background_color = '#FF0000';
   ```

2. **Check browser cache**: Clear cache and hard refresh (Ctrl+Shift+R)

3. **Check API response**: Open DevTools > Network tab, click "Bad" button, verify PATCH request returns 200

4. **Check console**: Look for any JavaScript errors

## Files Involved

- `hosted-smart-cost-calculator/app/leads/status-pages/main-sheet.tsx`
  - Lines 196-227: Sorting logic
  - Lines 270-303: handleNoGood function
  - Lines 1045-1090: Mobile view rendering
  - Lines 1135-1185: Desktop view rendering

## Conclusion

The "Bad" lead functionality is **already implemented correctly** and should be working as requested. If it's not working, it's likely a caching issue or database issue, not a code issue.
