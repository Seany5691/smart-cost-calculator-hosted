# Scraper Queue Migration

## What This Does

This migration adds a queueing system to the scraper to prevent multiple users from running concurrent scraping sessions, which was causing server crashes.

## Changes Made

1. **Database Migration (020_scraper_queue.sql)**
   - Creates `scraper_queue` table to track queued scraping requests
   - Adds functions for queue position management
   - Adds triggers to automatically reorder queue when items are removed

2. **Queue Manager (lib/scraper/queueManager.ts)**
   - New service to manage the scraping queue
   - Checks if scraping is active before starting new sessions
   - Automatically processes next queued item when current session completes
   - Provides queue status and position information

3. **API Endpoints**
   - `/api/scraper/queue-status` - Get queue position and wait time
   - `/api/scraper/cancel-queue` - Cancel a queued request
   - Modified `/api/scraper/start` - Checks queue before starting
   - Modified `/api/scraper/stop` - Processes next in queue when stopped

4. **UI Components**
   - `QueueStatus` component shows queue position and estimated wait time
   - Integrated into scraper page to display when queued
   - Shows cancel button to remove from queue

## How to Run the Migration

### Option 1: Using psql (Recommended)

```bash
# Connect to your database
psql -U your_username -d your_database_name

# Run the migration
\i hosted-smart-cost-calculator/database/migrations/020_scraper_queue.sql

# Verify the table was created
\dt scraper_queue
```

### Option 2: Using Node.js Script

Create a file `run-queue-migration.js`:

```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database/migrations/020_scraper_queue.sql'),
      'utf8'
    );

    await pool.query(migrationSQL);
    console.log('✅ Queue migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
```

Then run:
```bash
node run-queue-migration.js
```

### Option 3: Using Database GUI

1. Open your database management tool (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open the file `hosted-smart-cost-calculator/database/migrations/020_scraper_queue.sql`
4. Execute the SQL

## Verification

After running the migration, verify it worked:

```sql
-- Check if table exists
SELECT * FROM scraper_queue LIMIT 1;

-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname IN ('get_next_queue_position', 'reorder_queue_positions');

-- Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_reorder_queue';
```

## How It Works

1. **User starts scraping:**
   - System checks if another session is running
   - If busy: adds request to queue and returns queue position
   - If free: starts immediately

2. **While queued:**
   - User sees their position in queue
   - Estimated wait time is calculated based on average session duration
   - User can cancel their queued request
   - Queue status updates every 5 seconds

3. **When session completes:**
   - System automatically marks queue item as complete
   - Fetches next item in queue
   - Starts the next session automatically
   - Process repeats until queue is empty

## Testing

1. Start a scraping session (should start immediately)
2. While first session is running, start another session
3. Second session should be queued with position #1
4. Start a third session - should be queued with position #2
5. When first session completes, second should start automatically
6. When second completes, third should start automatically

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop the queue table and related objects
DROP TRIGGER IF EXISTS trigger_reorder_queue ON scraper_queue;
DROP FUNCTION IF EXISTS reorder_queue_positions();
DROP FUNCTION IF EXISTS get_next_queue_position();
DROP TABLE IF EXISTS scraper_queue;

-- Remove state column from scraping_sessions if it was added
ALTER TABLE scraping_sessions DROP COLUMN IF EXISTS state;
```

## Notes

- The queue persists across server restarts (stored in database)
- Queue items older than 24 hours are automatically cleaned up
- Failed sessions still process the next in queue
- Users can safely close their browser while queued
- The system handles edge cases like server crashes gracefully
