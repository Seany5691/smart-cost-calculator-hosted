import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';
import {
  extractCoordinatesFromMapsUrl,
  validateCoordinates,
  generateRouteUrl,
  validateRouteUrl,
  calculateStopCount,
  type Coordinates
} from '@/lib/routes';

// GET /api/routes - Get all routes for the current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'completed', or null for all
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query with optional status filter
    let whereClause = 'WHERE user_id = $1::uuid';
    const params: any[] = [authResult.user.userId];
    
    if (status && (status === 'active' || status === 'completed')) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM routes ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get routes
    const result = await pool.query(
      `SELECT * FROM routes 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      routes: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

// POST /api/routes - Create a new route
export async function POST(request: NextRequest) {
  let requestBody: any = null;
  
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requestBody = await request.json();
    const { name, routeUrl, stopCount, leadIds, startingPoint } = requestBody;

    console.log('Route creation request:', {
      name,
      routeUrl: routeUrl?.substring(0, 100),
      stopCount,
      leadIdsCount: leadIds?.length,
      startingPoint,
      userId: authResult.user.userId
    });

    // Validate required fields
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one lead ID is required' },
        { status: 400 }
      );
    }

    if (!routeUrl || typeof routeUrl !== 'string') {
      return NextResponse.json(
        { error: 'Route URL is required' },
        { status: 400 }
      );
    }

    if (typeof stopCount !== 'number' || stopCount < 1) {
      return NextResponse.json(
        { error: 'Valid stop count is required' },
        { status: 400 }
      );
    }

    // Generate route name if not provided
    const routeName = name || `Route ${new Date().toLocaleDateString()} - ${stopCount} stops`;

    console.log('Inserting route into database...');

    // Insert route
    const result = await pool.query(
      `INSERT INTO routes (
        user_id, name, google_maps_url, stop_count, lead_ids, starting_point
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        authResult.user.userId,
        routeName,
        routeUrl,
        stopCount,
        leadIds,
        startingPoint || null
      ]
    );

    console.log('Route inserted successfully:', result.rows[0].id);

    // Update all leads in the route to "leads" status
    await pool.query(
      `UPDATE leads 
       SET status = 'leads', updated_at = NOW()
       WHERE id = ANY($1) AND user_id = $2::uuid`,
      [leadIds, authResult.user.userId]
    );

    console.log('Leads updated successfully');

    return NextResponse.json({
      route: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating route:', error);
    console.error('Request body was:', requestBody);
    return NextResponse.json(
      { 
        error: 'Failed to create route',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
