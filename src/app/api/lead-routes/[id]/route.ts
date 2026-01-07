// API routes for individual route operations
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseHelpers } from '@/lib/supabase';
import { validateUUID } from '@/lib/validation';

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

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false, data: null },
        { status: 401 }
      );
    }

    // Fetch the route
    const { data: route, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !route) {
      return NextResponse.json(
        { error: 'Route not found', success: false, data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: route,
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

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false, data: null },
        { status: 401 }
      );
    }

    // Verify route exists and belongs to user
    const { data: existingRoute, error: fetchError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingRoute) {
      return NextResponse.json(
        { error: 'Route not found', success: false, data: null },
        { status: 404 }
      );
    }

    // Delete route from database
    await supabaseHelpers.deleteRoute(id);

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
