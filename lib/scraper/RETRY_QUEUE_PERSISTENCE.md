# RetryQueue Persistence Documentation

## Overview

The `RetryQueue` class implements **automatic database persistence** for all retry operations. This means that retry items are automatically saved to and loaded from the `scraper_retry_queue` database table without requiring explicit persist/restore calls.

## Task 5.2 Completion Summary

✅ **Save retry items to scraper_retry_queue table**
- Implemented via `enqueue()` method
- Every enqueue operation executes an INSERT query
- Items are immediately persisted to database

✅ **Load retry items on session resume**
- Implemented via `dequeue()` and `getAllItems()` methods
- Items are automatically loaded from database when needed
- Session resume works seamlessly without manual restore

✅ **Clean up completed retry items**
- Implemented via `dequeue()` method
- Dequeue operation executes DELETE query
- Completed items are automatically removed from database

## Automatic Persistence Architecture

### Design Decision

The RetryQueue uses **automatic persistence** rather than manual persist/restore operations:

```typescript
// ❌ Manual persistence (NOT used)
await retryQueue.enqueue(item);
await retryQueue.persist(); // Not needed!

// ✅ Automatic persistence (actual implementation)
await retryQueue.enqueue(item); // Automatically saves to database
```

### Why Automatic Persistence?

1. **Simplicity**: No need to remember to call persist/restore
2. **Reliability**: Every operation is immediately durable
3. **Consistency**: Database is always in sync with queue state
4. **Crash Safety**: No data loss even if process crashes immediately after enqueue

## Database Schema

The retry queue uses the `scraper_retry_queue` table:

```sql
CREATE TABLE scraper_retry_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES scraping_sessions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('navigation', 'lookup', 'extraction')),
  item_data JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Indexes for Performance

```sql
-- Fast session lookup
CREATE INDEX idx_scraper_retry_queue_session_id ON scraper_retry_queue(session_id);

-- Find items ready to retry
CREATE INDEX idx_scraper_retry_queue_next_retry_time ON scraper_retry_queue(next_retry_time);

-- Efficient session + retry time queries
CREATE INDEX idx_scraper_retry_queue_session_retry ON scraper_retry_queue(session_id, next_retry_time);

-- Filter by item type
CREATE INDEX idx_scraper_retry_queue_item_type ON scraper_retry_queue(item_type);
```

## API Methods and Persistence

### enqueue() - Automatic Save

```typescript
async enqueue(item: Omit<RetryItem, 'id' | 'nextRetryTime'>): Promise<RetryItem>
```

**Persistence Behavior:**
- Executes `INSERT INTO scraper_retry_queue` immediately
- Calculates `next_retry_time` using exponential backoff
- Returns the saved item with database-generated ID

**Example:**
```typescript
const retryQueue = new RetryQueue(sessionId);

// This automatically saves to database
const savedItem = await retryQueue.enqueue({
  type: 'navigation',
  data: { url: 'https://maps.google.com/search?q=plumbers' },
  attempts: 0,
});

// Item is now persisted - no additional persist() call needed
console.log('Saved item ID:', savedItem.id);
```

### dequeue() - Automatic Load and Cleanup

```typescript
async dequeue(): Promise<RetryItem | null>
```

**Persistence Behavior:**
- Executes `DELETE FROM scraper_retry_queue` with `RETURNING` clause
- Loads item from database and removes it atomically
- Only returns items where `next_retry_time <= NOW()`
- Orders by `next_retry_time ASC` (earliest first)

**Example:**
```typescript
// This automatically loads from database and removes item
const item = await retryQueue.dequeue();

if (item) {
  console.log('Processing retry:', item.type, item.data);
  // Item is already removed from database
}
```

### getAllItems() - Load All Items

```typescript
async getAllItems(): Promise<RetryItem[]>
```

**Persistence Behavior:**
- Executes `SELECT` query to load all items for session
- Returns items ordered by `next_retry_time ASC`
- Does NOT remove items from database (read-only)

**Example:**
```typescript
// Load all retry items for monitoring/debugging
const allItems = await retryQueue.getAllItems();
console.log(`Queue has ${allItems.length} items`);

allItems.forEach(item => {
  console.log(`- ${item.type}: ${item.attempts} attempts, retry at ${item.nextRetryTime}`);
});
```

### getQueueSize() - Count Items

```typescript
async getQueueSize(): Promise<number>
```

**Persistence Behavior:**
- Executes `SELECT COUNT(*)` query
- Returns total number of items in queue for this session

**Example:**
```typescript
const size = await retryQueue.getQueueSize();
if (size > 50) {
  console.warn('Retry queue is getting large:', size);
}
```

### getReadyCount() - Count Ready Items

```typescript
async getReadyCount(): Promise<number>
```

**Persistence Behavior:**
- Executes `SELECT COUNT(*)` with `next_retry_time <= NOW()` filter
- Returns number of items ready for immediate retry

**Example:**
```typescript
const readyCount = await retryQueue.getReadyCount();
console.log(`${readyCount} items ready for retry`);
```

### clear() - Cleanup All Items

```typescript
async clear(): Promise<void>
```

**Persistence Behavior:**
- Executes `DELETE FROM scraper_retry_queue` for all session items
- Used for cleanup after session completion

**Example:**
```typescript
// Clean up after scraping session completes
await retryQueue.clear();
console.log('Retry queue cleared');
```

### persist() and restore() - No-Op Methods

```typescript
async persist(): Promise<void>
async restore(): Promise<void>
```

**Persistence Behavior:**
- Both methods are **no-ops** (do nothing)
- Included for interface compatibility only
- Persistence is automatic via database operations

**Why No-Ops?**
- `persist()`: Not needed because enqueue() already saves to database
- `restore()`: Not needed because dequeue()/getAllItems() already load from database

**Example:**
```typescript
// These methods exist but do nothing
await retryQueue.persist();  // No-op
await retryQueue.restore();  // No-op

// Persistence is automatic:
await retryQueue.enqueue(item);     // Already persisted
const items = await retryQueue.getAllItems(); // Already loaded
```

## Session Resume Workflow

### Scenario: Scraper Crashes and Restarts

```typescript
// ============================================================================
// Session 1: Scraping with failures
// ============================================================================

const sessionId = 'scraping-session-123';
const retryQueue = new RetryQueue(sessionId);

// Scraper encounters navigation failure
await retryQueue.enqueue({
  type: 'navigation',
  data: { url: 'https://maps.google.com/search?q=plumbers+boston' },
  attempts: 0,
});
// ✓ Item saved to database immediately

// Scraper encounters lookup failure
await retryQueue.enqueue({
  type: 'lookup',
  data: { businessId: 'abc-123', businessName: 'Joe\'s Plumbing' },
  attempts: 0,
});
// ✓ Item saved to database immediately

// ❌ CRASH! Process terminates unexpectedly
// ✓ Items are safe in database

// ============================================================================
// Session 2: Resume after crash
// ============================================================================

// Create new RetryQueue instance with same sessionId
const resumedQueue = new RetryQueue(sessionId);

// Load all existing retry items from database
const existingItems = await resumedQueue.getAllItems();
console.log(`Found ${existingItems.length} items from previous session`);
// Output: Found 2 items from previous session

// Process items that are ready for retry
while (true) {
  const item = await resumedQueue.dequeue();
  if (!item) break;
  
  console.log(`Retrying ${item.type}:`, item.data);
  
  // Attempt retry
  const success = await retryOperation(item);
  
  if (!success && resumedQueue.shouldRetry(item.attempts)) {
    // Re-enqueue with incremented attempts
    await resumedQueue.enqueue({
      type: item.type,
      data: item.data,
      attempts: item.attempts + 1,
    });
  }
}

// Clean up after session completes
await resumedQueue.clear();
```

## Exponential Backoff

The retry queue uses exponential backoff to calculate `next_retry_time`:

```typescript
delay = baseDelay * 2^attempts
```

### Default Configuration

- `baseDelay`: 1000ms (1 second)
- `maxRetries`: 3 attempts

### Retry Schedule

| Attempt | Delay Formula | Delay (ms) | Delay (human) |
|---------|---------------|------------|---------------|
| 0       | 1000 * 2^0    | 1,000      | 1 second      |
| 1       | 1000 * 2^1    | 2,000      | 2 seconds     |
| 2       | 1000 * 2^2    | 4,000      | 4 seconds     |
| 3       | 1000 * 2^3    | 8,000      | 8 seconds     |

### Custom Configuration

```typescript
const retryQueue = new RetryQueue(sessionId, {
  baseDelay: 2000,  // 2 seconds
  maxRetries: 5,    // 5 attempts
});

// Retry schedule: 2s, 4s, 8s, 16s, 32s
```

## Monitoring and Statistics

### Get Queue Statistics

```typescript
const stats = await retryQueue.getStats();

console.log('Queue Statistics:');
console.log('- Total items:', stats.totalItems);
console.log('- Ready items:', stats.readyItems);
console.log('- By type:', stats.itemsByType);
console.log('- By attempts:', stats.itemsByAttempts);
```

**Example Output:**
```
Queue Statistics:
- Total items: 10
- Ready items: 5
- By type: { navigation: 3, lookup: 5, extraction: 2 }
- By attempts: { 0: 4, 1: 3, 2: 3 }
```

### Monitor Queue Health

```typescript
// Check if queue is getting too large
const size = await retryQueue.getQueueSize();
if (size > 50) {
  console.warn('⚠️ Retry queue is large:', size);
  console.warn('Consider investigating why so many operations are failing');
}

// Check if items are stuck (not being processed)
const readyCount = await retryQueue.getReadyCount();
if (readyCount > 10) {
  console.warn('⚠️ Many items ready for retry:', readyCount);
  console.warn('Retry processing may be stalled');
}
```

## Integration with Scraper Components

### NavigationManager Integration

```typescript
class NavigationManager {
  private retryQueue: RetryQueue;
  
  async navigateWithRetry(url: string): Promise<void> {
    try {
      await this.page.goto(url, { timeout: 60000 });
    } catch (error) {
      // Enqueue failed navigation for retry
      await this.retryQueue.enqueue({
        type: 'navigation',
        data: { url, error: error.message },
        attempts: 0,
      });
      throw error;
    }
  }
}
```

### BatchManager Integration

```typescript
class BatchManager {
  private retryQueue: RetryQueue;
  
  async processBatch(lookups: ProviderLookup[]): Promise<void> {
    for (const lookup of lookups) {
      try {
        await this.performLookup(lookup);
      } catch (error) {
        // Enqueue failed lookup for retry
        await this.retryQueue.enqueue({
          type: 'lookup',
          data: { businessId: lookup.businessId, phone: lookup.phone },
          attempts: 0,
        });
      }
    }
  }
}
```

## Testing

### Unit Tests

See `RetryQueue.test.ts` for comprehensive unit tests covering:
- Enqueue with retry item metadata
- Dequeue with time-based ordering
- Exponential backoff calculation
- Database persistence
- Max retries enforcement
- Queue size tracking

### Persistence Tests

See `RetryQueue.persistence.test.ts` for persistence verification tests covering:
- Automatic save on enqueue
- Automatic load on dequeue
- Automatic cleanup on dequeue
- Session resume with existing items
- Full session lifecycle

### Running Tests

```bash
# Run all RetryQueue tests
npm test -- RetryQueue

# Run only persistence tests
npm test -- RetryQueue.persistence.test.ts

# Run with coverage
npm test -- --coverage RetryQueue
```

## Performance Considerations

### Database Indexes

The retry queue table has optimized indexes for common queries:

1. **Session lookup**: Fast retrieval of all items for a session
2. **Retry time ordering**: Efficient dequeue of next ready item
3. **Composite index**: Optimized for session + retry time queries
4. **Type filtering**: Fast filtering by item type

### Query Patterns

All queries are optimized for performance:

```sql
-- Dequeue (atomic load + delete)
DELETE FROM scraper_retry_queue
WHERE id = (
  SELECT id FROM scraper_retry_queue
  WHERE session_id = $1 AND next_retry_time <= NOW()
  ORDER BY next_retry_time ASC
  LIMIT 1
)
RETURNING *;

-- Get ready count (uses index)
SELECT COUNT(*) FROM scraper_retry_queue
WHERE session_id = $1 AND next_retry_time <= NOW();
```

### Scalability

The retry queue is designed to handle:
- **Thousands of retry items** per session
- **Concurrent access** from multiple scraper instances
- **Long-running sessions** with persistent state

## Troubleshooting

### Queue Growing Too Large

**Symptom:** Queue size keeps increasing

**Possible Causes:**
1. Too many operations failing
2. Retry processing not running
3. Max retries too high

**Solutions:**
```typescript
// Check queue size
const size = await retryQueue.getQueueSize();
console.log('Queue size:', size);

// Check ready items
const readyCount = await retryQueue.getReadyCount();
console.log('Ready items:', readyCount);

// Get detailed statistics
const stats = await retryQueue.getStats();
console.log('Items by attempts:', stats.itemsByAttempts);

// If too many items at max attempts, clear them
if (stats.itemsByAttempts[3] > 50) {
  console.log('Clearing items that exceeded max retries');
  // Implement custom cleanup logic
}
```

### Items Not Being Retried

**Symptom:** Items stuck in queue

**Possible Causes:**
1. `next_retry_time` is in the future
2. Retry processing loop not running
3. Database connection issues

**Solutions:**
```typescript
// Check if items are ready
const readyCount = await retryQueue.getReadyCount();
const totalCount = await retryQueue.getQueueSize();
console.log(`${readyCount} of ${totalCount} items ready`);

// Peek at next item without removing it
const nextItem = await retryQueue.peek();
if (nextItem) {
  console.log('Next retry at:', nextItem.nextRetryTime);
  console.log('Time until retry:', nextItem.nextRetryTime.getTime() - Date.now(), 'ms');
}
```

### Database Connection Issues

**Symptom:** Enqueue/dequeue operations failing

**Possible Causes:**
1. Database connection lost
2. Transaction conflicts
3. Table doesn't exist

**Solutions:**
```typescript
try {
  await retryQueue.enqueue(item);
} catch (error) {
  console.error('Failed to enqueue item:', error);
  
  // Check if table exists
  const result = await query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scraper_retry_queue')"
  );
  console.log('Table exists:', result.rows[0].exists);
  
  // Check database connection
  await query('SELECT 1');
  console.log('Database connection OK');
}
```

## Summary

The RetryQueue implements **automatic database persistence** that:

✅ Saves items immediately on enqueue  
✅ Loads items automatically on dequeue  
✅ Cleans up completed items automatically  
✅ Supports session resume without manual restore  
✅ Provides monitoring and statistics  
✅ Uses exponential backoff for retry timing  
✅ Handles concurrent access safely  

**No manual persist/restore needed** - persistence is automatic and transparent!
