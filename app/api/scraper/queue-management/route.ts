/**
 * API Route: Queue Management
 * GET /api/scraper/queue-management - Get all queue items and stale sessions
 * POST /api/scraper/queue-management - Perform management actions
 * 
 * Actions:
 * - clearStale: Clear stale running sessions
 * - clearQueue: Clear all queue items
 * - clearItem: Clear specific queue item
 * - forceProcess: Force process next queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { getPool } from '@/lib/db';
import { processNextInQueue } from '@/lib/scraper/queueManager';
import { startQueuedSession } from '../start/route';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication (admin only)
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();

    // Get active queue items (not cancelled or completed)
    const queueResult = await pool.query(
      `SELECT 
        q.id,
        q.user_id,
        q.session_id,
        q.status,
        q.queue_position,
        q.estimated_wait_minutes,
        q.created_at,
        q.started_at,
        q.completed_at,
        s.name as session_name,
        u.username
      FROM scraper_queue q
      LEFT JOIN scraping_sessions s ON q.session_id = s.id
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.status IN ('queued', 'processing')
      ORDER BY q.queue_position ASC`
    );

    // Get all running sessions (including stale ones)
    const sessionsResult = await pool.query(
      `SELECT 
        id,
        user_id,
        name,
        status,
        progress,
        created_at,
        updated_at,
        EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 as hours_since_update,
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as total_duration_hours
      FROM scraping_sessions 
      WHERE status = 'running'
      ORDER BY updated_at DESC`
    );

    // Identify stale sessions (not updated in 12+ hours)
    const staleSessions = sessionsResult.rows.filter(
      (s) => parseFloat(s.hours_since_update) > 12
    );

    return NextResponse.json({
      queue: queueResult.rows,
      runningSessions: sessionsResult.rows,
      staleSessions: staleSessions,
      stats: {
        totalInQueue: queueResult.rows.length,
        queuedCount: queueResult.rows.filter((q) => q.status === 'queued').length,
        processingCount: queueResult.rows.filter((q) => q.status === 'processing').length,
        runningSessionsCount: sessionsResult.rows.length,
        staleSessionsCount: staleSessions.length,
      },
    });
  } catch (error: any) {
    console.error('[QUEUE-MGMT] Error getting queue data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication (admin only)
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[QUEUE-MGMT] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { action, itemId, sessionId } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    const pool = getPool();

    switch (action) {
      case 'clearStale': {
        // Clear stale running sessions (not updated in 12+ hours)
        const result = await pool.query(
          `UPDATE scraping_sessions 
           SET status = 'stopped', updated_at = NOW()
           WHERE status = 'running' 
           AND updated_at < NOW() - INTERVAL '12 hours'
           RETURNING id, name`
        );

        console.log(`[QUEUE-MGMT] Cleared ${result.rows.length} stale sessions (12+ hours old)`);
        
        return NextResponse.json({
          success: true,
          message: `Cleared ${result.rows.length} stale session(s) (12+ hours old)`,
          clearedSessions: result.rows,
        });
      }

      case 'clearQueue': {
        // Clear all queue items with status 'queued'
        const result = await pool.query(
          `UPDATE scraper_queue 
           SET status = 'cancelled', completed_at = NOW()
           WHERE status IN ('queued', 'processing')
           RETURNING id, session_id`
        );

        console.log(`[QUEUE-MGMT] Cleared ${result.rows.length} queue items`);
        
        return NextResponse.json({
          success: true,
          message: `Cleared ${result.rows.length} queue item(s)`,
          clearedItems: result.rows,
        });
      }

      case 'clearItem': {
        if (!itemId) {
          console.log(`[QUEUE-MGMT] clearItem called without itemId`);
          return NextResponse.json(
            { error: 'Missing itemId parameter' },
            { status: 400 }
          );
        }

        console.log(`[QUEUE-MGMT] Attempting to clear queue item: ${itemId}`);

        // Clear specific queue item
        const result = await pool.query(
          `UPDATE scraper_queue 
           SET status = 'cancelled', completed_at = NOW()
           WHERE id = $1 AND status IN ('queued', 'processing')
           RETURNING id, session_id, status`,
          [itemId]
        );

        if (result.rows.length === 0) {
          console.log(`[QUEUE-MGMT] Queue item not found or already processed: ${itemId}`);
          return NextResponse.json(
            { error: 'Queue item not found or already processed' },
            { status: 404 }
          );
        }

        console.log(`[QUEUE-MGMT] Successfully cleared queue item: ${itemId}`, result.rows[0]);
        
        return NextResponse.json({
          success: true,
          message: 'Queue item removed',
          clearedItem: result.rows[0],
        });
      }

      case 'clearSession': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing sessionId parameter' },
            { status: 400 }
          );
        }

        // Stop the session
        const result = await pool.query(
          `UPDATE scraping_sessions 
           SET status = 'stopped', updated_at = NOW()
           WHERE id = $1
           RETURNING id, name`,
          [sessionId]
        );

        if (result.rows.length === 0) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          );
        }

        console.log(`[QUEUE-MGMT] Stopped session: ${sessionId}`);
        
        return NextResponse.json({
          success: true,
          message: 'Session stopped',
          stoppedSession: result.rows[0],
        });
      }

      case 'forceProcess': {
        // Force process next queue item
        console.log('[QUEUE-MGMT] Force processing next queue item');
        
        const nextSessionId = await processNextInQueue();
        
        if (!nextSessionId) {
          return NextResponse.json({
            success: false,
            message: 'Queue is empty',
          });
        }

        // Start the queued session
        console.log(`[QUEUE-MGMT] Starting queued session: ${nextSessionId}`);
        await startQueuedSession(nextSessionId);
        
        return NextResponse.json({
          success: true,
          message: 'Queue processing started',
          sessionId: nextSessionId,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[QUEUE-MGMT] Error performing action:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
