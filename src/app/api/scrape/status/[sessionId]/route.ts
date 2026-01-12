/**
 * GET /api/scrape/status/:sessionId
 * 
 * Returns real-time scraping status via Server-Sent Events (SSE)
 */

import { NextRequest } from 'next/server';
import { ScrapingStatusEvent, LogEntry } from '@/lib/scraper/types';
import { getSession } from '@/lib/scraper/postgresqlSessionStore';
import { requireScraperAuth } from '@/lib/auth-middleware';

// Configure route to allow long-running connections
export const maxDuration = 300; // 5 minutes (maximum for Vercel Hobby plan)
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  // For SSE, EventSource doesn't support custom headers, so we check auth from query params
  const url = new URL(request.url);
  const userDataParam = url.searchParams.get('userData');
  
  if (!userDataParam) {
    // Fallback to header-based auth
    const authError = requireScraperAuth(request);
    if (authError) return authError;
  } else {
    // Validate user data from query parameter
    try {
      const userData = JSON.parse(decodeURIComponent(userDataParam));
      
      // Validate required fields
      if (!userData.id || !userData.username || !userData.role || !userData.name || !userData.email) {
        return new Response(
          JSON.stringify({ error: 'Invalid user data' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Validate role
      if (userData.role !== 'admin' && userData.role !== 'manager') {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Insufficient permissions' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication data' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  const { sessionId } = await params;

  console.log(`[SSE] Client connecting to session: ${sessionId}`);
  console.log(`[SSE] NOTE: SSE is deprecated. Please use /api/scrape/status-poll for serverless compatibility`);

  // Check PostgreSQL first (new approach)
  const pgSession = await getSession(sessionId);
  
  if (pgSession) {
    console.log(`[SSE] Session found in PostgreSQL, redirecting to polling approach`);
    return new Response(
      JSON.stringify({ 
        error: 'Please use /api/scrape/status-poll for serverless compatibility',
        sessionId,
        status: pgSession.status
      }),
      {
        status: 410, // Gone - resource no longer available
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Fallback to old in-memory approach (for backward compatibility)
  const session = getSession(sessionId);
  if (!session) {
    console.log(`[SSE] Session not found in memory or PostgreSQL: ${sessionId}`);
    return new Response(
      JSON.stringify({ error: 'Session not found. Use /api/scrape/status-poll for new sessions.' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  console.log(`[SSE] Session found in memory, establishing SSE connection for: ${sessionId}`);

  const { orchestrator, eventEmitter } = session;

  // Create SSE stream
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Helper function to send SSE message
      const sendEvent = (event: ScrapingStatusEvent) => {
        // SSE format: event: <type>\ndata: <json>\n\n
        const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
        console.log(`[SSE ${sessionId}] Sending event type: ${event.type}`);
        controller.enqueue(encoder.encode(message));
      };

      // Send initial progress
      const initialProgress = orchestrator.getProgress();
      const percentage = initialProgress.totalTowns > 0
        ? (initialProgress.completedTowns / initialProgress.totalTowns) * 100
        : 0;

      sendEvent({
        type: 'progress',
        data: {
          percentage: Math.round(percentage),
          townsRemaining: initialProgress.totalTowns - initialProgress.completedTowns,
          businessesScraped: initialProgress.totalBusinesses,
          estimatedTime: null
        }
      });

      // Listen for progress events
      const progressHandler = (data: any) => {
        sendEvent({
          type: 'progress',
          data: {
            percentage: data.percentage,
            townsRemaining: data.townsRemaining,
            businessesScraped: data.businessesScraped,
            estimatedTime: data.estimatedTime
          }
        });
      };

      // Listen for log events
      const logHandler = (log: LogEntry) => {
        sendEvent({
          type: 'log',
          data: {
            log
          }
        });
      };

      // Listen for completion event
      const completeHandler = (data: any) => {
        console.log(`[SSE ${sessionId}] Sending complete event with ${data.businesses?.length || 0} businesses`);
        
        try {
          sendEvent({
            type: 'complete',
            data: {
              businesses: data.businesses
            }
          });

          console.log(`[SSE ${sessionId}] Complete event sent, scheduling close...`);
          
          // Schedule close after a delay to ensure event is transmitted
          setTimeout(() => {
            console.log(`[SSE ${sessionId}] Closing SSE stream after delay`);
            cleanup();
            try {
              controller.close();
            } catch (error) {
              console.log(`[SSE ${sessionId}] Stream already closed`);
            }
          }, 2000); // Increased to 2 seconds
          
        } catch (error) {
          console.error(`[SSE ${sessionId}] Error in complete handler:`, error);
        }
      };

      // Listen for error events
      const errorHandler = (data: any) => {
        sendEvent({
          type: 'error',
          data: {
            error: data.error
          }
        });

        // Don't close stream on error, allow recovery
      };

      // Register event listeners
      eventEmitter.on('progress', progressHandler);
      eventEmitter.on('log', logHandler);
      eventEmitter.on('complete', completeHandler);
      eventEmitter.on('error', errorHandler);

      // Cleanup function
      const cleanup = () => {
        eventEmitter.off('progress', progressHandler);
        eventEmitter.off('log', logHandler);
        eventEmitter.off('complete', completeHandler);
        eventEmitter.off('error', errorHandler);
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        cleanup();
        controller.close();
      });

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          // Stream closed, clear interval
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up heartbeat on stream close
      const originalClose = controller.close.bind(controller);
      controller.close = () => {
        clearInterval(heartbeatInterval);
        cleanup();
        originalClose();
      };
    }
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
