import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { pool } from '@/lib/db';

// POST /api/calculator/deals - Save a new deal
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const body = await request.json();
    const { dealDetails, sectionsData, totalsData, settlementDetails, factorsData, scalesData } = body;

    // Validate required fields
    if (!dealDetails || !dealDetails.customerName || !dealDetails.dealName) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Customer name and deal name are required' } },
        { status: 400 }
      );
    }

    // Insert deal into database
    const result = await pool.query(
      `INSERT INTO deal_calculations (
        user_id, username, user_role, customer_name, deal_name,
        deal_details, sections_data, totals_data, factors_data, scales_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, created_at`,
      [
        user.userId,
        user.username,
        user.role,
        dealDetails.customerName,
        dealDetails.dealName,
        JSON.stringify({ ...dealDetails, settlementDetails }),
        JSON.stringify(sectionsData),
        JSON.stringify(totalsData),
        JSON.stringify(factorsData),
        JSON.stringify(scalesData),
      ]
    );

    const deal = result.rows[0];

    return NextResponse.json({
      id: deal.id,
      createdAt: deal.created_at,
      message: 'Deal saved successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error saving deal:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to save deal' } },
      { status: 500 }
    );
  }
}

// GET /api/calculator/deals - Get all deals for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get deals for the user (admin sees all, others see only their own)
    let query;
    let countQuery;
    let params;

    if (user.role === 'admin') {
      countQuery = 'SELECT COUNT(*) FROM deal_calculations';
      query = `
        SELECT id, user_id, username, user_role, customer_name, deal_name,
               pdf_url, created_at, updated_at
        FROM deal_calculations
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      params = [limit, offset];
    } else {
      countQuery = 'SELECT COUNT(*) FROM deal_calculations WHERE user_id = $1';
      query = `
        SELECT id, user_id, username, user_role, customer_name, deal_name,
               pdf_url, created_at, updated_at
        FROM deal_calculations
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      params = [user.userId, limit, offset];
    }

    // Get total count
    const countResult = await pool.query(
      countQuery,
      user.role === 'admin' ? [] : [user.userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(query, params);

    return NextResponse.json({
      deals: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch deals' } },
      { status: 500 }
    );
  }
}
