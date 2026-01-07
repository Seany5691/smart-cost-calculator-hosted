// API routes for route management
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseHelpers } from '@/lib/supabase';
import { validateRoute } from '@/lib/leads/validation';
import { generateRoute, validateRouteLeads } from '@/lib/leads/routeUtils';
import { RouteFormData, Lead } from '@/lib/leads/types';

// GET /api/routes - Retrieve route history
export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false, data: null },
        { status: 401 }
      );
    }

    // Fetch all routes for the user
    const routes = await supabaseHelpers.getRoutes(user.id);

    return NextResponse.json({
      data: routes,
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch routes',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}

// POST /api/routes - Create a new route
export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false, data: null },
        { status: 401 }
      );
    }

    // Parse request body
    const body: RouteFormData = await request.json();

    // Validate route data
    const validation = validateRoute(body);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          success: false,
          data: null,
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Fetch the leads for the route
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', body.lead_ids)
      .eq('user_id', user.id);

    if (leadsError || !leads || leads.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid leads found for route generation',
          success: false,
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate leads for route generation
    const routeValidation = validateRouteLeads(leads as Lead[]);
    if (!routeValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Route validation failed',
          success: false,
          data: null,
          validationErrors: routeValidation.errors,
          warnings: routeValidation.warnings,
        },
        { status: 400 }
      );
    }

    // Generate route URL and metadata
    const routeData = generateRoute(leads as Lead[], body.name);

    // Create route object
    const newRouteData = {
      ...routeData,
      user_id: user.id,
    };

    // Insert route into database
    const newRoute = await supabaseHelpers.createRoute(newRouteData);

    // Return route with warnings if any
    return NextResponse.json(
      {
        data: newRoute,
        success: true,
        error: null,
        warnings: routeValidation.warnings,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating route:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create route',
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
}
