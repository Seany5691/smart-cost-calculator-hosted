# TODO: Add Town Filtering and Sorting to Status Pages

## Objective
Add town filtering and sorting to these tabs:
- Leads
- Working On  
- Later Stage
- Bad Leads
- Signed

## Requirements

### 1. Town Filter Dropdown
- Show dropdown with all unique towns from leads in that status
- "All Towns" option to show everything
- Filter leads by selected town
- Similar to the List filter on Main Sheet page

### 2. Sorting Options
- Sort by: Name, Provider, Town, Date Added
- Ascending/Descending toggle
- Persist sort preference in localStorage

### 3. Implementation Location
Files to update:
- `src/app/leads/status-pages/status/leads/page.tsx`
- `src/app/leads/status-pages/status/working/page.tsx`
- `src/app/leads/status-pages/status/later/page.tsx`
- `src/app/leads/status-pages/status/bad/page.tsx`
- `src/app/leads/status-pages/status/signed/page.tsx`

### 4. UI Design
Match the existing filter bar style from Main Sheet:
```tsx
<div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-200">
  <div className="flex items-center gap-2">
    <Filter className="w-4 h-4 text-gray-500" />
    <label className="text-sm font-medium text-gray-700">Town:</label>
    <select className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="all">All Towns</option>
      {uniqueTowns.map(town => (
        <option key={town} value={town}>{town}</option>
      ))}
    </select>
  </div>
  
  <div className="flex items-center gap-2">
    <ArrowUpDown className="w-4 h-4 text-gray-500" />
    <label className="text-sm font-medium text-gray-700">Sort by:</label>
    <select className="pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="name">Name</option>
      <option value="provider">Provider</option>
      <option value="town">Town</option>
      <option value="date">Date Added</option>
    </select>
  </div>
</div>
```

### 5. State Management
```tsx
const [filterTown, setFilterTown] = useState<string>('all');
const [sortBy, setSortBy] = useState<'name' | 'provider' | 'town' | 'date'>('name');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

// Get unique towns
const uniqueTowns = useMemo(() => {
  const towns = leads
    .filter(l => l.status === currentStatus && l.town)
    .map(l => l.town!)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();
  return towns;
}, [leads, currentStatus]);

// Apply filters and sorting
const filteredAndSortedLeads = useMemo(() => {
  let result = leads.filter(l => l.status === currentStatus);
  
  // Apply town filter
  if (filterTown !== 'all') {
    result = result.filter(l => l.town === filterTown);
  }
  
  // Apply sorting
  result.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'provider':
        comparison = (a.provider || '').localeCompare(b.provider || '');
        break;
      case 'town':
        comparison = (a.town || '').localeCompare(b.town || '');
        break;
      case 'date':
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  return result;
}, [leads, currentStatus, filterTown, sortBy, sortDirection]);
```

## Status
- ✅ Database schema updated (town and contactPerson columns added)
- ✅ TypeScript types updated
- ✅ Supabase transform functions updated
- ✅ UI components updated (LeadCard, EditLeadModal, AddLeadButton)
- ✅ **COMPLETE**: Add filtering and sorting UI to status pages

## Implementation Complete
All 5 status pages now have:
1. ✅ Town filter dropdown with "All Towns" option
2. ✅ Sort by: Name, Provider, Town, Date Added
3. ✅ Ascending/Descending toggle button
4. ✅ Unique towns extracted from leads in each status
5. ✅ Filter and sort logic applied to lead lists
6. ✅ Mobile-responsive UI matching Main Sheet style
7. ✅ No TypeScript errors

## Files Updated
- ✅ `src/app/leads/status-pages/status/leads/page.tsx`
- ✅ `src/app/leads/status-pages/status/working/page.tsx`
- ✅ `src/app/leads/status-pages/status/later/page.tsx`
- ✅ `src/app/leads/status-pages/status/bad/page.tsx`
- ✅ `src/app/leads/status-pages/status/signed/page.tsx`
