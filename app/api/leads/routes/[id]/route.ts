import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// GET /api/leads/routes/[id] - Get a specific route
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT * FROM routes WHERE id = $1 AND user_id = $2::uuid',
      [params.id, authResult.user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch route' },
      { status: 500 }
    );
  }
}

// PUT /api/leads/routes/[id] - Update a route
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, notes } = body;

    // Verify route exists and belongs to user
    const existingRoute = await pool.query(
      'SELECT * FROM routes WHERE id = $1 AND user_id = $2::uuid',
      [params.id, authResult.user.userId]
    );

    if (existingRoute.rows.length === 0) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    // Update route (only name and notes can be updated)
    const result = await pool.query(
      `UPDATE routes 
       SET name = COALESCE($1, name),
           notes = COALESCE($2, notes)
       WHERE id = $3 AND user_id = $4::uuid
       RETURNING *`,
      [name, notes, params.id, authResult.user.userId]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        authResult.user.userId,
        'route_updated',
        'route',
        params.id,
        JSON.stringify({ name })
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating route:', error);
    return NextResponse.json(
      { error: 'Failed to update route' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/routes/[id] - Delete a route
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify route exists and belongs to user
    const existingRoute = await pool.query(
      'SELECT * FROM routes WHERE id = $1 AND user_id = $2::uuid',
      [params.id, authResult.user.userId]
    );

    if (existingRoute.rows.length === 0) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    // Delete route
    await pool.query(
      'DELETE FROM routes WHERE id = $1 AND user_id = $2::uuid',
      [params.id, authResult.user.userId]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        authResult.user.userId,
        'route_deleted',
        'route',
        params.id,
        JSON.stringify({ name: existingRoute.rows[0].name })
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting route:', error);
    return NextResponse.json(
      { error: 'Failed to delete route' },
      { status: 500 }
    );
  }
}
