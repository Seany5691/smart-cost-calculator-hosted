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

    // Get all queue items
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
        EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update,
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as total_duration_minutes
      FROM scraping_sessions 
      WHERE status = 'running'
      ORDER BY updated_at DESC`
    );

    // Identify stale sessions (not updated in 5+ minutes)
    const staleSessions = sessionsResult.rows.filter(
      (s) => parseFloat(s.minutes_since_update) > 5
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

    const body = await request.json();
    const { action, itemId, sessionId } = body;

    const pool = getPool();

    switch (action) {
      case 'clearStale': {
        // Clear stale running sessions (not updated in 5+ minutes)
        const result = await pool.query(
          `UPDATE scraping_sessions 
           SET status = 'stopped', updated_at = NOW()
           WHERE status = 'running' 
           AND updated_at < NOW() - INTERVAL '5 minutes'
           RETURNING id, name`
        );

        console.log(`[QUEUE-MGMT] Cleared ${result.rows.length} stale sessions`);
        
        return NextResponse.json({
          success: true,
          message: `Cleared ${result.rows.length} stale session(s)`,
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
          return NextResponse.json(
            { error: 'Missing itemId parameter' },
            { status: 400 }
          );
        }

        // Clear specific queue item
        const result = await pool.query(
          `UPDATE scraper_queue 
           SET status = 'cancelled', completed_at = NOW()
           WHERE id = $1
           RETURNING id, session_id`,
          [itemId]
        );

        if (result.rows.length === 0) {
          return NextResponse.json(
            { error: 'Queue item not found' },
            { status: 404 }
          );
        }

        console.log(`[QUEUE-MGMT] Cleared queue item: ${itemId}`);
        
        return NextResponse.json({
          success: true,
          message: 'Queue item cleared',
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
