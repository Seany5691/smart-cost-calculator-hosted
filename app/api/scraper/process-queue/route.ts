/**
 * API Route: Process Queue
 * POST /api/scraper/process-queue
 * 
 * Manually trigger processing of the next queued item if no session is active
 * This is useful for recovering from stuck queue states
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { isScrapingActive, processNextInQueue } from '@/lib/scraper/queueManager';
import { startQueuedSession } from '../start/route';

export async function POST(request: NextRequest) {
  try {
    console.log('[PROCESS-QUEUE] Received request to process queue');
    
    // Verify authentication (admin only for manual trigger)
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if any session is currently active
    const isActive = await isScrapingActive();
    
    if (isActive) {
      console.log('[PROCESS-QUEUE] A session is currently active, cannot process queue');
      return NextResponse.json({ 
        message: 'A scraping session is currently active',
        canProcess: false 
      }, { status: 200 });
    }

    // Try to process next in queue
    console.log('[PROCESS-QUEUE] No active session, attempting to process next in queue');
    const nextSessionId = await processNextInQueue();
    
    if (!nextSessionId) {
      console.log('[PROCESS-QUEUE] Queue is empty');
      return NextResponse.json({ 
        message: 'Queue is empty',
        processed: false 
      }, { status: 200 });
    }

    // Start the queued session
    console.log(`[PROCESS-QUEUE] Starting queued session: ${nextSessionId}`);
    await startQueuedSession(nextSessionId);
    
    return NextResponse.json({ 
      message: 'Queue processing started',
      sessionId: nextSessionId,
      processed: true 
    }, { status: 200 });
  } catch (error: any) {
    console.error('[PROCESS-QUEUE] Error processing queue:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
