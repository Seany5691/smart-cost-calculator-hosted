// API route for checking import session status
import { NextRequest, NextResponse } from 'next/server';
import { databaseHelpers } from '@/lib/databaseAdapter';
import { validateUUID } from '@/lib/leads/validation';

// GET /api/import/status/[id] - Get import session status and progress
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate UUID format
    if (!validateUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid session ID format', success: false, data: null },
        { status: 400 }
      );
    }

    // Get session status (simplified for PostgreSQL)
    // In a real implementation, you would query the import_sessions table
    const sessionData = {
      id,
      status: 'completed',
      imported_records: 100,
      failed_records: 0,
      total_records: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Return session with progress information
    return NextResponse.json({
      data: {
        ...sessionData,
        progress: 100,
        isComplete: true,
      },
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error fetching import status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch import status',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
