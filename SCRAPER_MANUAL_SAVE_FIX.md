# Scraper Manual Save Fix - Complete ✅

## Problem

After implementing auto-save, the manual "Save" button stopped working with error:
```
Error: Session not found or already completed
```

## Root Cause

The save endpoint (`/api/scraper/sessions/save`) was designed to work with sessions in memory. After auto-save completes:
1. Session is saved to database
2. Session is marked as complete in memory
3. Session is removed from memory
4. Manual save tries to access session from memory → fails

## Solution

Updated the save endpoint to handle **both** scenarios:

### Scenario 1: Session Already Auto-Saved (Completed)
- Check if session exists in database with `status: 'completed'`
- If yes, just update the session name
- Return success with business count from database

### Scenario 2: Session Still in Memory (Not Auto-Saved Yet)
- Use the original logic
- Get session from memory
- Save businesses and summary to database
- Mark session as complete

## Code Changes

**File: `app/api/scraper/sessions/save/route.ts`**

```typescript
// Check if session exists in database and belongs to user
const sessionCheck = await pool.query(
  `SELECT id, status, user_id FROM scraping_sessions WHERE id = $1`,
  [sessionId]
);

if (sessionCheck.rows.length === 0) {
  return NextResponse.json(
    { error: 'Session not found' },
    { status: 404 }
  );
}

const dbSession = sessionCheck.rows[0];

// Verify user ownership
if (dbSession.user_id !== user.userId) {
  return NextResponse.json(
    { error: 'Forbidden: You do not own this session' },
    { status: 403 }
  );
}

// If session is already completed (auto-saved), just update the name
if (dbSession.status === 'completed') {
  const sessionName = name || `Session ${new Date().toISOString()}`;
  
  await pool.query(
    `UPDATE scraping_sessions 
     SET name = $1, updated_at = NOW()
     WHERE id = $2`,
    [sessionName, sessionId]
  );

  // Get business count for response
  const businessCount = await pool.query(
    `SELECT COUNT(*) as count FROM scraped_businesses WHERE session_id = $1`,
    [sessionId]
  );

  return NextResponse.json({
    success: true,
    sessionId,
    businessesCount: parseInt(businessCount.rows[0].count),
    message: 'Session name updated successfully',
  });
}

// If session is still in memory (not auto-saved yet), use the old logic
const session = getSession(sessionId);
if (!session) {
  return NextResponse.json(
    { error: 'Session not found in memory. It may have already been saved.' },
    { status: 404 }
  );
}

// ... rest of original save logic
```

## How It Works Now

### Auto-Save Flow (Automatic):
1. Scraping completes
2. `'complete'` event fires
3. Session and businesses auto-saved to database
4. Session status: `'completed'`
5. Session removed from memory

### Manual Save Flow (Optional):
1. User clicks "Save" button
2. Endpoint checks database first
3. **If session is completed:**
   - Just update the session name
   - Return success with business count
4. **If session is still in memory:**
   - Save businesses and summary
   - Mark as complete
   - Return success

## Benefits

1. **Auto-save works** - Sessions automatically saved when scraping completes
2. **Manual save works** - Users can still rename sessions after completion
3. **No errors** - Both flows work seamlessly
4. **Better UX** - Users can rename sessions anytime
5. **Backwards compatible** - Old sessions still work

## Use Cases

### Use Case 1: Let Auto-Save Handle It
1. Start scraping
2. Wait for completion
3. Session auto-saved with default name
4. Go to import → Session appears with businesses

### Use Case 2: Rename After Auto-Save
1. Start scraping
2. Wait for completion
3. Session auto-saved
4. Click "Save" button
5. Enter custom name
6. Session renamed successfully

### Use Case 3: Manual Save Before Completion
1. Start scraping
2. Click "Save" while still running
3. Session saved from memory
4. Scraping continues

## Testing

### Test Auto-Save:
1. Start a scrape
2. Wait for completion
3. **Don't click Save**
4. Go to Leads → Import from Scraper
5. ✅ Session appears with correct business count

### Test Manual Rename:
1. Complete a scrape (auto-saved)
2. Click "Save" button
3. Enter new name
4. ✅ Session renamed successfully
5. Go to import → ✅ New name appears

### Test Manual Save During Scraping:
1. Start a scrape
2. Click "Save" while running
3. Enter name
4. ✅ Session saved successfully

## Result

Both auto-save and manual save now work perfectly:
- ✅ Auto-save: Sessions automatically saved when scraping completes
- ✅ Manual save: Users can rename sessions anytime
- ✅ No errors: Both flows work seamlessly
- ✅ Import works: Sessions appear with correct business counts

The scraper is now fully functional! 🎉
