# Scraper Export to Leads Feature

## Overview
Added an "Export to Leads" button on the scraper page that allows users to directly export scraped businesses to the leads section of the app.

## Implementation

### 1. Export Button in Control Panel
Added a new full-width button in the ControlPanel component that appears when businesses are found:

```tsx
{onExportToLeads && (
  <button
    type="button"
    onClick={onExportToLeads}
    disabled={!hasData || isActive || isExporting}
    className="w-full btn btn-primary flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
    title="Export businesses to leads section"
  >
    {isExporting ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    )}
    <span>Export to Leads</span>
  </button>
)}
```

### 2. Export Handler
Created `handleExportToLeads` function in the scraper page that:

1. **Validates Data**: Checks if there are businesses to export
2. **Prompts for List Name**: Asks user to name the lead list (defaults to "Scraped Leads")
3. **Authenticates**: Retrieves auth token from localStorage
4. **Transforms Data**: Maps scraped businesses to lead format
5. **Sends Request**: POSTs to `/api/leads/import/scraper-direct` endpoint
6. **Shows Feedback**: Displays success/error messages

```typescript
const handleExportToLeads = async () => {
  if (businesses.length === 0) {
    alert('No businesses to export to leads');
    return;
  }

  const listName = prompt('Enter a name for this lead list:', 'Scraped Leads');
  if (!listName || listName.trim() === '') {
    return;
  }

  setIsExporting(true);
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('Please log in to export to leads');
      return;
    }

    const response = await fetch('/api/leads/import/scraper-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        businesses: businesses.map(b => ({
          name: b.name,
          phone: b.phone,
          address: b.address || '',
          town: b.town,
          typeOfBusiness: b.industry,
          mapsUrl: '',
          provider: b.provider,
        })),
        listName: listName.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export to leads');
    }

    const result = await response.json();
    alert(`Successfully exported ${result.importedCount} businesses to leads!\n\nList: ${listName}`);
  } catch (error: any) {
    console.error('Error exporting to leads:', error);
    alert(`Error: ${error.message}`);
  } finally {
    setIsExporting(false);
  }
};
```

### 3. Data Mapping
The scraped business data is mapped to the lead format:

**Scraped Business Fields:**
- `name` → Lead name
- `phone` → Lead phone
- `address` → Lead address
- `town` → Lead town
- `industry` → Lead type of business
- `provider` → Lead provider (Vodacom, MTN, etc.)

**Default Values:**
- `status`: "leads" (default status for new leads)
- `mapsUrl`: Empty string (not captured in current scraper)

### 4. API Endpoint
Created new endpoint: `POST /api/leads/import/scraper-direct`

**Request Body:**
```json
{
  "businesses": [
    {
      "name": "Business Name",
      "phone": "0123456789",
      "address": "123 Main St",
      "town": "Johannesburg",
      "typeOfBusiness": "Pharmacy",
      "mapsUrl": "",
      "provider": "Vodacom"
    }
  ],
  "listName": "Scraped Leads"
}
```

**Response:**
```json
{
  "success": true,
  "importedCount": 5,
  "skippedCount": 0,
  "totalBusinesses": 5,
  "errors": []
}
```

**Features:**
- Transaction-based import (all or nothing)
- Auto-incrementing lead numbers
- Duplicate detection (skips businesses without names)
- Error tracking and reporting
- Import session logging

## User Flow

1. **Scrape Businesses**:
   - User enters towns and industries
   - Clicks "Start Scraping"
   - Watches real-time progress
   - Excel file downloads automatically

2. **View Results**:
   - Scraping completes
   - Results table shows all businesses
   - Control panel shows "Export to Leads" button

3. **Export to Leads**:
   - User clicks "Export to Leads" button
   - System prompts for list name
   - User enters name (e.g., "Pharmacy Leads - Jan 2026")
   - System validates and authenticates
   - Businesses are imported to leads section
   - Success message shows count: "Successfully exported 5 businesses to leads!"

4. **Access in Leads**:
   - Navigate to Leads section
   - Find businesses in specified list
   - All businesses have status "leads"
   - Can move to other statuses (Working, Later, etc.)

## Features

### Validation
- Checks if businesses exist before export
- Validates authentication token
- Validates list name is not empty
- Skips businesses without names
- Shows clear error messages

### Error Handling
- Network errors
- Authentication errors
- API errors
- User-friendly error messages
- Transaction rollback on failure

### Success Feedback
- Shows count of imported businesses
- Shows count of skipped businesses
- Displays list name
- Clear success message

### User Experience
- Button only appears when businesses are available
- Button disabled during scraping
- Button disabled during export
- Loading state with spinner
- Prompt for custom list name

## Database Integration

### Import Session Tracking
Every export creates an import_session record:
- `source_type`: "scraper-direct"
- `list_name`: User-provided name
- `imported_records`: Count of successfully imported leads
- `status`: "completed" or "completed_with_errors"
- `metadata`: JSON with import statistics

### Lead Numbering
- Automatically assigns sequential numbers
- Continues from highest existing number
- Ensures no gaps in numbering

### Transaction Safety
- All imports wrapped in database transaction
- Rollback on any error
- Ensures data consistency

## Files Modified
- `hosted-smart-cost-calculator/app/scraper/page.tsx` - Added export handler
- `hosted-smart-cost-calculator/components/scraper/ControlPanel.tsx` - Added export button

## Files Created
- `hosted-smart-cost-calculator/app/api/leads/import/scraper-direct/route.ts` - Import endpoint

## Benefits

1. **Seamless Workflow**: Direct export from scraper to leads
2. **No Manual Work**: No need to download Excel and re-import
3. **Immediate Access**: Businesses available in leads instantly
4. **Organized**: All scraped businesses in dedicated list
5. **Flexible**: Can still download Excel for backup/sharing
6. **Custom Lists**: User can name lists for organization
7. **Safe**: Transaction-based import ensures data integrity

## UI Location
The "Export to Leads" button appears:
- In the Control Panel section
- Below the Start/Stop/Export row
- Full width for prominence
- Only when businesses are found
- Blue button with arrow icon

## Testing

1. **Successful Export**:
   - Scrape some businesses
   - Click "Export to Leads"
   - Enter list name
   - Verify success message
   - Check leads section for imported businesses

2. **No Businesses**:
   - Try to export with no results
   - Should show "No businesses to export to leads"

3. **Cancel List Name**:
   - Click "Export to Leads"
   - Cancel the prompt
   - Should not proceed with export

4. **Not Authenticated**:
   - Log out
   - Try to export
   - Should show "Please log in to export to leads"

5. **Network Error**:
   - Simulate network failure
   - Should show error message

6. **Partial Success**:
   - Export businesses with some invalid data
   - Should show count of imported and skipped

## Status
✅ **COMPLETE** - Export to Leads button added and functional.

## Next Steps (Optional Enhancements)
1. Add loading state during export
2. Show progress for large exports
3. Add option to select specific businesses to export
4. Add duplicate detection/handling
5. Add preview before export
6. Add option to append to existing list
