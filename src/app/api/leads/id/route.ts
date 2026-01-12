// API routes for individual lead operations
import { NextRequest, NextResponse } from 'next/server';
import { postgresqlLeads } from '@/lib/leads/postgresqlLeads';
import { validateUUID } from '@/lib/leads/validation';

// GET /api/leads/[id] - Get a single lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;

    // If for some reason params aren't provided, allow /api/leads/id?id=...
    const { searchParams } = new URL(request.url);
    const idFromQuery = searchParams.get('id');
    const finalId = id || idFromQuery;

    if (!finalId) {
      return NextResponse.json(
        { error: 'Lead ID is required', success: false, data: null },
        { status: 400 }
      );
    }

    // Validate lead ID
    if (!validateUUID(finalId)) {
      return NextResponse.json(
        { error: 'Invalid lead ID format', success: false, data: null },
        { status: 400 }
      );
    }

    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    // Fetch the lead
    const lead = await postgresqlLeads.getLeadById(user.id, finalId);

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found', success: false, data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: lead,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch lead',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
