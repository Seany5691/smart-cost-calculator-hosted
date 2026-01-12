// API route for fetching scraper data from Smart Cost Calculator
import { NextRequest, NextResponse } from 'next/server';
import { databaseHelpers } from '@/lib/databaseAdapter';

// GET /api/import/scraper-data - Get available scraper sessions
export async function GET(request: NextRequest) {
  try {
    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // Fetch specific scraper session data (simplified for PostgreSQL)
      // In a real implementation, you would query the scraper_sessions table
      const sessionData = { 
        id: sessionId, 
        status: 'completed',
        results: [] 
      }; // Placeholder data

      return NextResponse.json({
        data: sessionData,
        success: true,
        error: null,
      });
    } else {
      // Fetch all scraper sessions for the user (simplified for PostgreSQL)
      // In a real implementation, you would query the scraper_sessions table
      const sessions: any[] = []; // Placeholder data
      return NextResponse.json({
        data: sessions,
        success: true,
        error: null,
      });
    }
  } catch (error) {
    console.error('Error fetching scraper data:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch scraper data',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
