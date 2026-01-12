/**
 * POST /api/scrape/stop/:sessionId
 * 
 * Stops an active scraping session
 */

import { NextRequest, NextResponse } from 'next/server';
import { StopScrapeResponse } from '@/lib/scraper/types';
import { getSession, updateSessionStatus } from '@/lib/scraper/postgresqlSessionStore';
import { requireScraperAuth } from '@/lib/auth-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  // Check authentication and authorization
  const authError = requireScraperAuth(request);
  if (authError) return authError;

  try {
    const { sessionId } = await params;

    // Validate session exists
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get session businesses (simplified for PostgreSQL)
    // In a real implementation, you would query the scraper_results table
    const businesses = []; // Placeholder data
    const businessCount = businesses.length;

    // Update session status to stopped
    await updateSessionStatus(sessionId, 'stopped');

    // Return response
    const response: StopScrapeResponse = {
      status: 'stopped',
      businessesCollected: businessCount
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error stopping session:', error);
    return NextResponse.json(
      { error: 'Failed to stop session' },
      { status: 500 }
    );
  }
}
