/**
 * Queue Manager - Manages scraping session queue to prevent concurrent sessions
 * 
 * This module ensures only one scraping session runs at a time by:
 * - Checking if a session is currently active
 * - Adding new requests to a queue if busy
 * - Automatically processing the next queued request when current session completes
 * - Providing queue status and position information
 * 
 * Requirements: Prevent server crashes from concurrent scraping sessions
 */

import { getPool } from '../db';
import type { ScrapeConfig } from './types';

/**
 * Queue item interface
 */
export interface QueueItem {
  id: string;
  userId: string;
  sessionId: string;
  config: ScrapeConfig;
  status: 'queued' | 'processing' | 'completed' | 'cancelled';
  queuePosition: number;
  estimatedWaitMinutes: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Queue status response
 */
export interface QueueStatus {
  isQueued: boolean;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  totalInQueue?: number;
  currentlyProcessing?: {
    sessionId: string;
    startedAt: Date;
  };
}

/**
 * Check if any scraping session is currently active
 * @returns true if a session is running, false otherwise
 */
export async function isScrapingActive(): Promise<boolean> {
  const pool = getPool();
  
  // Check for any session with status 'running' that was updated recently (within last 5 minutes)
  // This prevents false positives from stale sessions that crashed without updating status
  const result = await pool.query(
    `SELECT COUNT(*) as count 
     FROM scraping_sessions 
     WHERE status = 'running'
     AND updated_at > NOW() - INTERVAL '5 minutes'`
  );
  
  const count = parseInt(result.rows[0].count, 10);
  
  // Also check if there's a queue item currently processing
  if (count === 0) {
    const queueResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM scraper_queue 
       WHERE status = 'processing'
       AND started_at > NOW() - INTERVAL '5 minutes'`
    );
    const queueCount = parseInt(queueResult.rows[0].count, 10);
    return queueCount > 0;
  }
  
  return count > 0;
}

/**
 * Check if any queue item is currently being processed
 * @returns true if a queue item is processing, false otherwise
 */
export async function isQueueProcessing(): Promise<boolean> {
  const pool = getPool();
  
  const result = await pool.query(
    `SELECT COUNT(*) as count 
     FROM scraper_queue 
     WHERE status = 'processing'`
  );
  
  const count = parseInt(result.rows[0].count, 10);
  return count > 0;
}

/**
 * Add a scraping request to the queue
 * @param userId - User ID making the request
 * @param sessionId - Session ID for the scraping session
 * @param config - Scraping configuration
 * @returns The created queue item
 */
export async function addToQueue(
  userId: string,
  sessionId: string,
  config: ScrapeConfig
): Promise<QueueItem> {
  const pool = getPool();
  
  // Get next queue position
  const positionResult = await pool.query('SELECT get_next_queue_position() as position');
  const queuePosition = positionResult.rows[0].position;
  
  // Calculate estimated wait time based on average session duration
  const estimatedWaitMinutes = await calculateEstimatedWait(queuePosition);
  
  // Insert into queue
  const result = await pool.query(
    `INSERT INTO scraper_queue (user_id, session_id, config, status, queue_position, estimated_wait_minutes)
     VALUES ($1, $2, $3, 'queued', $4, $5)
     RETURNING id, user_id, session_id, config, status, queue_position, estimated_wait_minutes, created_at`,
    [userId, sessionId, JSON.stringify(config), queuePosition, estimatedWaitMinutes]
  );
  
  const row = result.rows[0];
  
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    config: JSON.parse(row.config),
    status: row.status,
    queuePosition: row.queue_position,
    estimatedWaitMinutes: row.estimated_wait_minutes,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Calculate estimated wait time based on queue position
 * Uses average duration of last 10 completed sessions
 * @param queuePosition - Position in queue
 * @returns Estimated wait time in minutes
 */
async function calculateEstimatedWait(queuePosition: number): Promise<number> {
  const pool = getPool();
  
  // Get average duration of last 10 completed sessions
  const result = await pool.query(
    `SELECT AVG(duration_minutes) as avg_minutes
     FROM (
       SELECT EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 as duration_minutes
       FROM scraping_sessions
       WHERE status = 'completed'
       AND updated_at > created_at
       ORDER BY updated_at DESC
       LIMIT 10
     ) recent_sessions`
  );
  
  const avgMinutes = parseFloat(result.rows[0]?.avg_minutes) || 15; // Default to 15 minutes if no history
  
  // Estimate: (position - 1) * average duration
  // Subtract 1 because position 1 is next to process
  return Math.ceil((queuePosition - 1) * avgMinutes);
}

/**
 * Get queue status for a specific session
 * @param sessionId - Session ID to check
 * @returns Queue status information
 */
export async function getQueueStatus(sessionId: string): Promise<QueueStatus | null> {
  const pool = getPool();
  
  // Check if this session is in the queue
  const result = await pool.query(
    `SELECT id, queue_position, estimated_wait_minutes, status
     FROM scraper_queue
     WHERE session_id = $1
     AND status IN ('queued', 'processing')`,
    [sessionId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  
  // Get total items in queue
  const totalResult = await pool.query(
    `SELECT COUNT(*) as count FROM scraper_queue WHERE status = 'queued'`
  );
  const totalInQueue = parseInt(totalResult.rows[0].count, 10);
  
  // Get currently processing session if any
  const processingResult = await pool.query(
    `SELECT session_id, started_at 
     FROM scraper_queue 
     WHERE status = 'processing' 
     LIMIT 1`
  );
  
  const currentlyProcessing = processingResult.rows.length > 0
    ? {
        sessionId: processingResult.rows[0].session_id,
        startedAt: new Date(processingResult.rows[0].started_at),
      }
    : undefined;
  
  return {
    isQueued: row.status === 'queued',
    queuePosition: row.queue_position,
    estimatedWaitMinutes: row.estimated_wait_minutes,
    totalInQueue,
    currentlyProcessing,
  };
}

/**
 * Get the next queued item to process
 * @returns The next queue item or null if queue is empty
 */
export async function getNextInQueue(): Promise<QueueItem | null> {
  const pool = getPool();
  
  const result = await pool.query(
    `SELECT id, user_id, session_id, config, status, queue_position, estimated_wait_minutes, created_at
     FROM scraper_queue
     WHERE status = 'queued'
     ORDER BY queue_position ASC
     LIMIT 1`
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    config: JSON.parse(row.config),
    status: row.status,
    queuePosition: row.queue_position,
    estimatedWaitMinutes: row.estimated_wait_minutes,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Mark a queue item as processing
 * @param queueId - Queue item ID
 */
export async function markAsProcessing(queueId: string): Promise<void> {
  const pool = getPool();
  
  await pool.query(
    `UPDATE scraper_queue
     SET status = 'processing', started_at = NOW()
     WHERE id = $1`,
    [queueId]
  );
}

/**
 * Mark a queue item as completed
 * @param sessionId - Session ID (not queue ID)
 */
export async function markAsCompleted(sessionId: string): Promise<void> {
  const pool = getPool();
  
  await pool.query(
    `UPDATE scraper_queue
     SET status = 'completed', completed_at = NOW()
     WHERE session_id = $1
     AND status IN ('queued', 'processing')`,
    [sessionId]
  );
}

/**
 * Cancel a queued item
 * @param sessionId - Session ID to cancel
 * @returns true if cancelled, false if not found or already processing
 */
export async function cancelQueuedItem(sessionId: string): Promise<boolean> {
  const pool = getPool();
  
  const result = await pool.query(
    `UPDATE scraper_queue
     SET status = 'cancelled', completed_at = NOW()
     WHERE session_id = $1
     AND status = 'queued'
     RETURNING id`,
    [sessionId]
  );
  
  return result.rows.length > 0;
}

/**
 * Process the next item in the queue
 * This should be called when a scraping session completes
 * @returns The session ID that was started, or null if queue is empty
 */
export async function processNextInQueue(): Promise<string | null> {
  const pool = getPool();
  
  // Check if anything is currently processing
  const isProcessing = await isQueueProcessing();
  if (isProcessing) {
    console.log('[QueueManager] Cannot process next - a session is already processing');
    return null;
  }
  
  // Get next item in queue
  const nextItem = await getNextInQueue();
  if (!nextItem) {
    console.log('[QueueManager] Queue is empty - nothing to process');
    return null;
  }
  
  console.log(`[QueueManager] Processing next in queue: ${nextItem.sessionId}`);
  
  // Mark as processing
  await markAsProcessing(nextItem.id);
  
  // Return the session ID so the caller can start the scraping
  return nextItem.sessionId;
}

/**
 * Get all queued items for a user
 * @param userId - User ID
 * @returns Array of queue items
 */
export async function getUserQueueItems(userId: string): Promise<QueueItem[]> {
  const pool = getPool();
  
  const result = await pool.query(
    `SELECT id, user_id, session_id, config, status, queue_position, estimated_wait_minutes, created_at, started_at, completed_at
     FROM scraper_queue
     WHERE user_id = $1
     AND status IN ('queued', 'processing')
     ORDER BY queue_position ASC`,
    [userId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    config: JSON.parse(row.config),
    status: row.status,
    queuePosition: row.queue_position,
    estimatedWaitMinutes: row.estimated_wait_minutes,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  }));
}

/**
 * Clean up old completed/cancelled queue items
 * Removes items older than 24 hours
 * @returns Number of items cleaned up
 */
export async function cleanupOldQueueItems(): Promise<number> {
  const pool = getPool();
  
  const result = await pool.query(
    `DELETE FROM scraper_queue
     WHERE status IN ('completed', 'cancelled')
     AND completed_at < NOW() - INTERVAL '24 hours'
     RETURNING id`
  );
  
  return result.rows.length;
}
