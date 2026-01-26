import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

/**
 * GET /api/deals - Get all deals with filtering, searching, sorting, and pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sortBy: Field to sort by (created_at, customer_name, total_payout, total_mrc)
 * - sortOrder: Sort direction (asc, desc) - default: desc
 * - search: Search term to filter across customer_name, deal_name, username
 * - userId: Filter by specific user (admin only)
 * 
 * Authorization:
 * - Admin: Can see all deals, can filter by userId
 * - Manager/User: Only see their own deals
 * 
 * Requirements: AC-3.1 to AC-3.5
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination - default to 20 per page as per requirements
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Sorting - default to created_at desc (newest first)
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Search
    const search = searchParams.get('search');
    
    // Admin user filter
    const userId = searchParams.get('userId');

    // Build query based on role
    let query = `
      SELECT 
        id,
        customer_name,
        deal_name,
        username,
        user_role,
        created_at,
        totals_data
      FROM deal_calculations
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    // Admin can see all deals or filter by specific user
    // Manager/User can only see their own deals
    if (authResult.user.role === 'admin') {
      if (userId) {
        query += ` AND user_id = $${paramIndex}::uuid`;
        params.push(userId);
        paramIndex++;
      }
      // If no userId specified, admin sees all deals (no filter)
    } else {
      // Non-admin users only see their own deals
      query += ` AND user_id = $${paramIndex}::uuid`;
      params.push(authResult.user.userId);
      paramIndex++;
    }

    // Search across customer_name, deal_name, username
    if (search) {
      query += ` AND (
        customer_name ILIKE $${paramIndex} OR
        deal_name ILIKE $${paramIndex} OR
        username ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count before pagination
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) FROM'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add sorting
    const sortColumnMap: Record<string, string> = {
      'created_at': 'created_at',
      'customer_name': 'customer_name',
      'total_payout': "(totals_data->>'totalPayout')::numeric",
      'total_mrc': "(totals_data->>'totalMRC')::numeric"
    };
    
    const sortColumn = sortColumnMap[sortBy] || 'created_at';
    const direction = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${direction} NULLS LAST`;
    
    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    console.log('[DEALS-GET] Query:', query);
    console.log('[DEALS-GET] Params:', params);

    const result = await pool.query(query, params);

    // Extract totalPayout and totalMRC from totals_data JSONB
    const deals = result.rows.map((row: any) => ({
      id: row.id,
      customer_name: row.customer_name,
      deal_name: row.deal_name,
      username: row.username,
      user_role: row.user_role,
      created_at: row.created_at,
      totals_data: {
        totalPayout: row.totals_data?.totalPayout || 0,
        totalMRC: row.totals_data?.totalMRC || 0
      }
    }));

    const response = NextResponse.json({
      deals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

    // Prevent caching to ensure fresh data on every request
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('[DEALS-GET] Error fetching deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}
