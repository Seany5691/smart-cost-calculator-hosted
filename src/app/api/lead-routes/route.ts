// API routes for route management
import { NextRequest, NextResponse } from 'next/server';
import { postgresqlLeads } from '@/lib/leads/postgresqlLeads';
import { validateRoute } from '@/lib/leads/validation';
import { generateRoute, validateRouteLeads } from '@/lib/leads/routeUtils';
import { RouteFormData, Lead } from '@/lib/leads/types';

// GET /api/routes - Retrieve route history
export async function GET(request: NextRequest) {
  try {
    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

    // Fetch all routes for the user
    const routes = await postgresqlLeads.getRoutes(user.id);

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
    // Get user from auth store (simplified for PostgreSQL)
    const user = { id: '550e8400-e29b-41d4-a716-446655440000' }; // Default admin for now

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
    const leads = await postgresqlLeads.getLeadsByIds(user.id, body.lead_ids);

    if (!leads || leads.length === 0) {
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

    // Insert route into database
    const newRoute = await postgresqlLeads.createRoute(user.id, routeData);

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
