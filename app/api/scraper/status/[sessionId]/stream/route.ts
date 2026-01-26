/**
 * API Route: Stream Scraping Session Events (SSE)
 * GET /api/scraper/status/:sessionId/stream
 * 
 * Server-Sent Events endpoint that streams real-time updates from the scraping orchestrator
 */

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/scraper/sessionStore';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  // Get active session
  const activeSession = getSession(sessionId);
  
  if (!activeSession) {
    return new Response('Session not found', { status: 404 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Listen to progress events
      const onProgress = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', data })}\n\n`));
      };

      // Listen to complete events
      const onComplete = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', data })}\n\n`));
      };

      // Listen to log events
      const onLog = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', data })}\n\n`));
      };

      // Listen to error events
      const onError = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data })}\n\n`));
      };

      // Attach event listeners
      activeSession.eventEmitter.on('progress', onProgress);
      activeSession.eventEmitter.on('complete', onComplete);
      activeSession.eventEmitter.on('log', onLog);
      activeSession.eventEmitter.on('error', onError);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        activeSession.eventEmitter.off('progress', onProgress);
        activeSession.eventEmitter.off('complete', onComplete);
        activeSession.eventEmitter.off('log', onLog);
        activeSession.eventEmitter.off('error', onError);
        controller.close();
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
}
