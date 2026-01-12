/**
 * GET /api/scrape/status-poll/:sessionId
 * 
 * Returns current scraping status from PostgreSQL (polling-based, works on Vercel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireScraperAuth } from '@/lib/auth-middleware';
import { getSession } from '@/lib/scraper/postgresqlSessionStore';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  // Check authentication
  const authError = requireScraperAuth(request);
  if (authError) return authError;

  try {
    const { sessionId } = await params;

    // Get session from PostgreSQL
    const session = await getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get session businesses and logs (simplified for PostgreSQL)
    // In a real implementation, you would query the scraper_results and scraper_logs tables
    const businesses: any[] = []; // Placeholder data
    const logs: any[] = []; // Placeholder data

    // Return current state
    return NextResponse.json({
      status: session.status,
      progress: session.progress,
      businesses,
      logs,
      completedAt: session.completed_at,
      errorMessage: session.error
    });

  } catch (error) {
    console.error('Error fetching session status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session status' },
      { status: 500 }
    );
  }
}
