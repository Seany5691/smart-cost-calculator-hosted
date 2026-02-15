/**
 * API Route: Get Scraper Queue Status
 * GET /api/scraper/queue-status?sessionId=xxx
 * 
 * Returns queue position and estimated wait time for a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { getQueueStatus } from '@/lib/scraper/queueManager';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sessionId' },
        { status: 400 }
      );
    }

    const queueStatus = await getQueueStatus(sessionId);

    if (!queueStatus) {
      return NextResponse.json(
        { error: 'Session not found in queue' },
        { status: 404 }
      );
    }

    return NextResponse.json(queueStatus);
  } catch (error: any) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
