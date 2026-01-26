import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuth } from '@/lib/middleware';
import { invalidateCache } from '@/lib/cache';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
});

// GET /api/config/factors - Get the current factor sheet
// All authenticated users can view (needed for calculator)
// Only admins can modify (POST/PUT/DELETE)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication - all authenticated users can read config
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT id, factors_data as "factorsData", created_at as "createdAt", updated_at as "updatedAt"
       FROM factors 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No factor sheet found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0].factorsData);
  } catch (error) {
    console.error('Error fetching factors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch factors' },
      { status: 500 }
    );
  }
}

// POST /api/config/factors - Create or update the factor sheet
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can update factors
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validation - ensure it's a valid factor sheet structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid factor sheet data' },
        { status: 400 }
      );
    }

    // Insert new factor sheet (we keep history by not deleting old ones)
    const result = await pool.query(
      `INSERT INTO factors (factors_data)
       VALUES ($1)
       RETURNING id, factors_data as "factorsData", created_at as "createdAt", updated_at as "updatedAt"`,
      [JSON.stringify(body)]
    );

    // Invalidate cache after successful creation
    await invalidateCache('factors');

    return NextResponse.json(result.rows[0].factorsData, { status: 201 });
  } catch (error) {
    console.error('Error creating factor sheet:', error);
    return NextResponse.json(
      { error: 'Failed to create factor sheet' },
      { status: 500 }
    );
  }
}

// PUT /api/config/factors - Update the current factor sheet
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can update factors
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validation - ensure it's a valid factor sheet structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid factor sheet data' },
        { status: 400 }
      );
    }

    // Get the most recent factor sheet ID
    const currentResult = await pool.query(
      `SELECT id FROM factors ORDER BY created_at DESC LIMIT 1`
    );

    if (currentResult.rows.length === 0) {
      // No existing factor sheet, create one
      return POST(request);
    }

    const currentId = currentResult.rows[0].id;

    // Update the current factor sheet
    const result = await pool.query(
      `UPDATE factors 
       SET factors_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, factors_data as "factorsData", created_at as "createdAt", updated_at as "updatedAt"`,
      [JSON.stringify(body), currentId]
    );

    // Invalidate cache after successful update
    await invalidateCache('factors');

    return NextResponse.json(result.rows[0].factorsData);
  } catch (error) {
    console.error('Error updating factor sheet:', error);
    return NextResponse.json(
      { error: 'Failed to update factor sheet' },
      { status: 500 }
    );
  }
}
