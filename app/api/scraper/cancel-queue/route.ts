/**
 * API Route: Cancel Queued Scraping Session
 * POST /api/scraper/cancel-queue
 * 
 * Allows users to cancel their queued scraping request
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { cancelQueuedItem } from '@/lib/scraper/queueManager';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const pool = getPool();
    const sessionResult = await pool.query(
      `SELECT user_id FROM scraping_sessions WHERE id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (sessionResult.rows[0].user_id !== user.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - session belongs to another user' },
        { status: 403 }
      );
    }

    // Cancel the queued item
    const cancelled = await cancelQueuedItem(sessionId);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Session not found in queue or already processing' },
        { status: 400 }
      );
    }

    // Update session status to cancelled
    await pool.query(
      `UPDATE scraping_sessions SET status = 'stopped', updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    return NextResponse.json({ 
      success: true,
      message: 'Queued session cancelled successfully' 
    });
  } catch (error: any) {
    console.error('Error cancelling queued session:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
