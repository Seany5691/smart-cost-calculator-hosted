/**
 * API Route: Cleanup Stale Sessions
 * POST /api/scraper/cleanup-stale
 * 
 * Manually cleanup stale running sessions and queue items
 * This is useful for recovering from stuck states
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('[CLEANUP-STALE] Received request to cleanup stale sessions');
    
    // Verify authentication (admin only)
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    
    // Find stale running sessions (older than 5 minutes)
    const staleSessions = await pool.query(
      `SELECT id, name, updated_at,
       EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
       FROM scraping_sessions
       WHERE status = 'running'
       AND updated_at < NOW() - INTERVAL '5 minutes'`
    );
    
    console.log(`[CLEANUP-STALE] Found ${staleSessions.rows.length} stale sessions`);
    
    // Update stale sessions to error
    const sessionsResult = await pool.query(
      `UPDATE scraping_sessions
       SET status = 'error', updated_at = NOW()
       WHERE status = 'running'
       AND updated_at < NOW() - INTERVAL '5 minutes'
       RETURNING id, name`
    );
    
    // Find stale processing queue items
    const staleQueue = await pool.query(
      `SELECT id, session_id, started_at,
       EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_since_start
       FROM scraper_queue
       WHERE status = 'processing'
       AND started_at < NOW() - INTERVAL '5 minutes'`
    );
    
    console.log(`[CLEANUP-STALE] Found ${staleQueue.rows.length} stale queue items`);
    
    // Cancel stale processing queue items
    const queueResult = await pool.query(
      `UPDATE scraper_queue
       SET status = 'cancelled', completed_at = NOW()
       WHERE status = 'processing'
       AND started_at < NOW() - INTERVAL '5 minutes'
       RETURNING id, session_id`
    );
    
    // Also cancel abandoned queued items (older than 2 hours)
    const abandonedResult = await pool.query(
      `UPDATE scraper_queue
       SET status = 'cancelled', completed_at = NOW()
       WHERE status = 'queued'
       AND created_at < NOW() - INTERVAL '2 hours'
       RETURNING id, session_id`
    );
    
    const result = {
      staleSessions: staleSessions.rows,
      staleQueue: staleQueue.rows,
      cleaned: {
        sessions: sessionsResult.rows.length,
        queueProcessing: queueResult.rows.length,
        queueAbandoned: abandonedResult.rows.length,
      },
      details: {
        sessions: sessionsResult.rows,
        queueProcessing: queueResult.rows,
        queueAbandoned: abandonedResult.rows,
      }
    };
    
    console.log('[CLEANUP-STALE] Cleanup complete:', result.cleaned);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[CLEANUP-STALE] Error cleaning up stale sessions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
