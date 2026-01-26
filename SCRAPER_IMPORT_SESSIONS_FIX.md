# Scraper Import Sessions Display Fix - Complete

## Issues Fixed

### 1. "Invalid Date" Display ✅
**Problem:** Dates were showing as "Invalid Date" because the component was looking for `created_at` but the API returns `createdAt` (camelCase).

**Fix:** Updated the interface and all references to use camelCase field names matching the API response.

### 2. Cannot Select Sessions ✅
**Problem:** Sessions were not clickable because the component expected `status: 'completed'` but the API returns different status values.

**Fix:** Updated the status type to match the actual API values: `'completed' | 'running' | 'paused' | 'stopped' | 'error'`

### 3. Generic Session Names ✅
**Problem:** Sessions were showing as "Session 2026-01-18T..." instead of meaningful names with town information.

**Fix:** Updated the `/api/scraper/start` endpoint to create meaningful session names based on towns and industries:
- Single town: "Potchefstroom - 5 Industries"
- Multiple towns (≤3): "Potchefstroom, Klerksdorp, Rustenburg - 3 Industries"
- Many towns (>3): "Potchefstroom, Klerksdorp +2 more - 5 Industries"

### 4. Missing Latest Scrape ✅
**Problem:** New scrapes weren't appearing in the import list because sessions were being saved to localStorage instead of the database.

**Fix:** Updated the scraper page's `handleSaveSession` function to call the `/api/scraper/sessions/save` API endpoint instead of saving to localStorage.

### 5. Missing Business Data ✅
**Problem:** The component was looking for `data.results` but the API returns `data.businesses`.

**Fix:** Updated the component to correctly map the `businesses` array from the API response.

## Changes Made

### File 1: `components/leads/import/ScrapedListSelector.tsx`

**1. Updated Interface:**
```typescript
// BEFORE
interface ScraperSession {
  id: string;
  name: string;
  created_at: string;
  total_results: number;
  location?: string;
  business_type?: string;
  status: 'completed' | 'processing' | 'failed';
}

// AFTER
interface ScraperSession {
  id: string;
  name: string;
  createdAt: string;
  businessCount: number;
  townsCompleted: number;
  status: 'completed' | 'running' | 'paused' | 'stopped' | 'error';
}
```

**2. Fixed Date References:**
- Changed `session.created_at` → `session.createdAt`
- Changed `session.total_results` → `session.businessCount`
- Removed `session.location` and `session.business_type` (not in API)
- Added `session.townsCompleted` for town count display

**3. Fixed Business Data Mapping:**
```typescript
// Map businesses to the format expected by the preview
const mappedResults = data.businesses.map((business: any) => ({
  name: business.name,
  phone: business.phone,
  provider: business.provider,
  address: business.address,
  typeOfBusiness: business.type_of_business,
  mapsUrl: business.maps_address
}));
```

**4. Updated Status Icons:**
```typescript
{session.status === 'completed' && (
  <CheckCircle className="w-5 h-5 text-green-400" />
)}
{(session.status === 'running' || session.status === 'paused') && (
  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
)}
{(session.status === 'error' || session.status === 'stopped') && (
  <AlertCircle className="w-5 h-5 text-red-400" />
)}
```

### File 2: `app/scraper/page.tsx`

**Updated `handleSaveSession` to use API instead of localStorage:**
```typescript
const handleSaveSession = async (name: string) => {
  if (!sessionId) {
    alert('No active session to save');
    return;
  }

  setIsSaving(true);
  try {
    // Get token from auth-storage
    const authStorage = localStorage.getItem('auth-storage');
    if (!authStorage) {
      alert('Please log in to save sessions');
      return;
    }

    const authData = JSON.parse(authStorage);
    const token = authData.token;
    
    if (!token) {
      alert('Please log in to save sessions');
      return;
    }

    // Save session to database via API
    const response = await fetch('/api/scraper/sessions/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        name: name.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save session');
    }

    const result = await response.json();
    alert(`Session saved successfully!\n\n${result.businessesCount} businesses saved.`);
    setSessionManagerOpen(false);
  } catch (error: any) {
    console.error('Error saving session:', error);
    alert(`Failed to save session: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
};
```

### File 3: `app/api/scraper/start/route.ts`

**Added meaningful session name generation:**
```typescript
// Create a meaningful session name
let sessionName = '';
if (towns.length === 1) {
  sessionName = `${towns[0]} - ${industries.length} ${industries.length === 1 ? 'Industry' : 'Industries'}`;
} else if (towns.length <= 3) {
  sessionName = `${towns.join(', ')} - ${industries.length} ${industries.length === 1 ? 'Industry' : 'Industries'}`;
} else {
  sessionName = `${towns.slice(0, 2).join(', ')} +${towns.length - 2} more - ${industries.length} ${industries.length === 1 ? 'Industry' : 'Industries'}`;
}
```

## API Response Structure

### GET /api/scraper/sessions
```json
{
  "sessions": [
    {
      "id": "uuid",
      "name": "Potchefstroom - 5 Industries",
      "status": "completed",
      "progress": 100,
      "businessCount": 25,
      "townsCompleted": 3,
      "createdAt": "2026-01-18T11:49:00.467Z",
      "updatedAt": "2026-01-18T11:50:00.467Z"
    }
  ]
}
```

### GET /api/scraper/sessions/:id
```json
{
  "session": {
    "id": "uuid",
    "name": "Potchefstroom - 5 Industries",
    "config": {},
    "status": "completed",
    "progress": 100,
    "state": {},
    "summary": {},
    "createdAt": "2026-01-18T11:49:00.467Z",
    "updatedAt": "2026-01-18T11:50:00.467Z"
  },
  "businesses": [
    {
      "id": "uuid",
      "name": "Business Name",
      "phone": "123-456-7890",
      "provider": "Provider Name",
      "address": "123 Main St",
      "town": "Town Name",
      "type_of_business": "Industry",
      "maps_address": "https://maps.google.com/...",
      "created_at": "2026-01-18T11:49:00.467Z"
    }
  ]
}
```

## Session Naming Examples

Based on the scraping configuration:
- **Single town, single industry:** "Potchefstroom - 1 Industry"
- **Single town, multiple industries:** "Potchefstroom - 5 Industries"
- **2-3 towns:** "Potchefstroom, Klerksdorp - 3 Industries"
- **Many towns:** "Potchefstroom, Klerksdorp +3 more - 5 Industries"

## Testing Checklist

1. ✅ Sessions now display with correct dates
2. ✅ Sessions are clickable when status is 'completed'
3. ✅ Session names show meaningful information (towns + industries)
4. ✅ Business count displays correctly
5. ✅ Towns completed count shows when > 0
6. ✅ Preview data loads and displays correctly
7. ✅ Import functionality works with correct API format
8. ✅ New scrapes appear immediately in the import list
9. ✅ Sessions are saved to database instead of localStorage

## User Instructions

### To see the fixes:
1. **Clear browser cache:** Press `Ctrl + Shift + R` (or `Ctrl + F5`) to hard refresh
2. **Start a new scrape:** The session will now have a meaningful name
3. **Check the leads import:** Go to Leads → Import from Scraper
4. **Verify:** You should see your new scrape with proper name and date

### Session Workflow:
1. **Start scraping:** Session is created in database with meaningful name
2. **Scraping runs:** Session status updates in real-time
3. **Scraping completes:** Session status changes to 'completed'
4. **Optional: Save with custom name:** Click "Save" to rename the session
5. **Import to leads:** Go to Leads → Import from Scraper → Select session

## Result

The "Import from Scraper" functionality in the Leads section now:
- ✅ Displays sessions with properly formatted dates
- ✅ Shows clickable sessions with correct status indicators
- ✅ Displays meaningful session names based on towns and industries
- ✅ Shows business and town counts
- ✅ Loads and previews business data correctly
- ✅ Imports leads successfully with `status: 'new'`
- ✅ Shows latest scrapes immediately (no localStorage issues)
- ✅ Persists sessions to database for long-term access

## Browser Cache Issue

**IMPORTANT:** If you're still seeing "Invalid Date" or old sessions after these changes, you MUST clear your browser cache:

### Method 1: Hard Refresh
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### Method 2: Clear Cache Completely
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Method 3: Incognito/Private Window
- Open the app in an incognito/private window to bypass cache entirely
