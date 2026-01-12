// API routes for individual route operations
import { NextRequest, NextResponse } from 'next/server';
import { getLeadsAdapter } from '@/lib/leads/leadsAdapter';
import { validateUUID } from '@/lib/leads/validation';

// GET /api/routes/[id] - Get a single route
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate UUID format
    if (!validateUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid route ID format', success: false, data: null },
        { status: 400 }
      );
    }

    // Get leads adapter
    const leadsAdapter = getLeadsAdapter();
    if (!leadsAdapter) {
      return NextResponse.json(
        { error: 'Database adapter not available', success: false, data: null },
        { status: 500 }
      );
    }

    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    // Fetch the route (simplified for PostgreSQL)
    // In a real implementation, you would query the routes table
    const routeData = {
      id,
      name: 'Sample Route',
      status: 'active',
      created_at: new Date().toISOString()
    };

    // Return route data
    return NextResponse.json({
      data: routeData,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch route',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/routes/[id] - Delete a route
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate UUID format
    if (!validateUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid route ID format', success: false, data: null },
        { status: 400 }
      );
    }

    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    // Delete the route (simplified for PostgreSQL)
    // In a real implementation, you would delete from the routes table
    
    return NextResponse.json({
      data: { id, deleted: true },
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error deleting route:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete route',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
