/**
 * API Route: SSE Stream for Real-Time Scraping Updates
 * GET /api/scraper/status/[sessionId]/stream
 * 
 * Provides Server-Sent Events for real-time scraping progress
 * Phase 2: Real-time business display
 */

import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { getSession } from '@/lib/scraper/sessionStore';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { sessionId } = params;

    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 });
    }

    // Get active session
    const activeSession = getSession(sessionId);
    
    if (!activeSession) {
      return new Response('Session not found or not active', { status: 404 });
    }

    const { eventEmitter, orchestrator } = activeSession;

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const connectMessage = `data: ${JSON.stringify({
          type: 'connected',
          sessionId,
          timestamp: new Date().toISOString(),
        })}\n\n`;
        controller.enqueue(encoder.encode(connectMessage));

        // Progress event handler
        const onProgress = (data: any) => {
          const message = `data: ${JSON.stringify({
            type: 'progress',
            data,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Business scraped event handler (NEW - Phase 2)
        const onBusiness = (business: any) => {
          const message = `data: ${JSON.stringify({
            type: 'business',
            data: business,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Town completed event handler (NEW - Phase 2)
        const onTownComplete = (data: any) => {
          const message = `data: ${JSON.stringify({
            type: 'town-complete',
            data,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Provider lookup progress event handler (NEW - Phase 2)
        const onLookupProgress = (data: any) => {
          const message = `data: ${JSON.stringify({
            type: 'lookup-progress',
            data,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Providers updated event handler (NEW - Fix for provider display)
        const onProvidersUpdated = (data: any) => {
          const message = `data: ${JSON.stringify({
            type: 'providers-updated',
            data,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Log event handler
        const onLog = (data: any) => {
          const message = `data: ${JSON.stringify({
            type: 'log',
            data,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Complete event handler
        const onComplete = (data: any) => {
          const message = `data: ${JSON.stringify({
            type: 'complete',
            data,
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(message));
          
          // Close stream after completion
          setTimeout(() => {
            controller.close();
          }, 1000);
        };

        // Error event handler
        const onError = (error: any) => {
          const message = `data: ${JSON.stringify({
            type: 'error',
            data: {
              message: error.message || 'An error occurred',
            },
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Register event listeners
        eventEmitter.on('progress', onProgress);
        eventEmitter.on('business', onBusiness); // NEW - Phase 2
        eventEmitter.on('town-complete', onTownComplete); // NEW - Phase 2
        eventEmitter.on('lookup-progress', onLookupProgress); // NEW - Phase 2
        eventEmitter.on('providers-updated', onProvidersUpdated); // NEW - Provider fix
        eventEmitter.on('log', onLog);
        eventEmitter.on('complete', onComplete);
        eventEmitter.on('error', onError);

        // Cleanup on stream close
        request.signal.addEventListener('abort', () => {
          eventEmitter.off('progress', onProgress);
          eventEmitter.off('business', onBusiness);
          eventEmitter.off('town-complete', onTownComplete);
          eventEmitter.off('lookup-progress', onLookupProgress);
          eventEmitter.off('providers-updated', onProvidersUpdated);
          eventEmitter.off('log', onLog);
          eventEmitter.off('complete', onComplete);
          eventEmitter.off('error', onError);
          controller.close();
        });

        // Send periodic heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `: heartbeat\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch (error) {
            clearInterval(heartbeatInterval);
          }
        }, 15000); // Every 15 seconds

        // Cleanup heartbeat on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in SSE stream:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
