import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

/**
 * GET /api/deals/:id - Get a single deal by ID with complete data
 * 
 * Authorization:
 * - Admin: Can access any deal
 * - Manager/User: Can only access their own deals
 * 
 * Returns complete deal data including all JSONB fields for reopening in calculator
 * 
 * Requirements: AC-5.3, AC-5.4, AC-5.5
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid deal ID format' }, { status: 400 });
    }

    // Build query with role-based access control
    let query = `
      SELECT 
        id,
        user_id,
        username,
        user_role,
        customer_name,
        deal_name,
        deal_details,
        sections_data,
        totals_data,
        factors_data,
        scales_data,
        pdf_url,
        created_at,
        updated_at
      FROM deal_calculations
      WHERE id = $1
    `;
    const params: any[] = [id];

    // Non-admin users can only access their own deals
    if (authResult.user.role !== 'admin') {
      query += ` AND user_id = $2`;
      params.push(authResult.user.userId);
    }

    console.log('[DEALS-GET-ID] Query:', query);
    console.log('[DEALS-GET-ID] Params:', params);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Deal not found or you don\'t have permission to view it' },
        { status: 404 }
      );
    }

    const deal = result.rows[0];

    const response = NextResponse.json(deal);

    // Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('[DEALS-GET-ID] Error fetching deal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}
