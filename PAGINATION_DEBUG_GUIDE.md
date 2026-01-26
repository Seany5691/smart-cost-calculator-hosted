# Pagination Debug Guide

## Issue
Pagination controls are not displaying on Main Sheet despite having 862 leads imported.

## What I've Added
I've added console logging to help us debug the issue. The logs will show:

1. **Filter Debug Logs**:
   - Total leads count
   - Leads with "new" status
   - Working leads count
   - Available leads after filtering
   - Current filter settings (provider, list name)
   - Final available count after all filters

2. **Pagination Debug Logs**:
   - Filtered and sorted leads length
   - Leads per page (should be 50)
   - Total pages calculated
   - Current page number

## How to Check

1. **Open the Main Sheet page** in your browser
2. **Open Developer Console** (F12 or Right-click → Inspect → Console tab)
3. **Look for logs** starting with `[FILTER DEBUG]` and `[PAGINATION DEBUG]`

## What to Look For

The pagination controls should display when `totalPages > 1`.

With 862 leads:
- Expected `totalPages` = Math.ceil(862 / 50) = **18 pages**
- Pagination should definitely show

## Possible Issues

1. **Leads not loading**: Check if `totalLeads` in console shows 862
2. **Wrong status**: Check if `newStatusLeads` shows 862 (all should be "new" status)
3. **Filter issue**: Check if `availableAfterFilter` shows 862
4. **List filter**: Check if `filterListName` is set correctly

## Next Steps

Please:
1. Open Main Sheet page
2. Open browser console (F12)
3. Copy all the `[FILTER DEBUG]` and `[PAGINATION DEBUG]` logs
4. Share them with me so I can identify the exact issue

## Expected Console Output

You should see something like:
```
[FILTER DEBUG] {
  totalLeads: 862,
  newStatusLeads: 862,
  workingLeadsCount: 0,
  availableAfterFilter: 862,
  filterProvider: 'all',
  filterListName: 'your-list-name'
}
[FILTER DEBUG] Final available count: 862
[PAGINATION DEBUG] {
  filteredAndSortedLeadsLength: 862,
  leadsPerPage: 50,
  totalPages: 18,
  currentPage: 1
}
```

If the numbers don't match this, we'll know where the problem is!
