import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware';
import { pool } from '@/lib/db';

// GET /api/calculator/deals/[id] - Load a specific deal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;

    // Get the deal
    const result = await pool.query(
      `SELECT * FROM deal_calculations WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Deal not found' } },
        { status: 404 }
      );
    }

    const deal = result.rows[0];

    // Check authorization (admin can see all, others only their own)
    if (user.role !== 'admin' && deal.user_id !== user.userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (user_id, activity_type, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.userId,
        'calculator_loaded',
        'deal',
        id,
        JSON.stringify({
          deal_name: deal.deal_name,
          customer_name: deal.customer_name,
        })
      ]
    );

    // Return deal data
    return NextResponse.json({
      id: deal.id,
      userId: deal.user_id,
      username: deal.username,
      userRole: deal.user_role,
      customerName: deal.customer_name,
      dealName: deal.deal_name,
      dealDetails: deal.deal_details.settlementDetails ? 
        { ...deal.deal_details, settlementDetails: undefined } : 
        deal.deal_details,
      sectionsData: deal.sections_data,
      totalsData: deal.totals_data,
      settlementDetails: deal.deal_details.settlementDetails || null,
      factorsData: deal.factors_data,
      scalesData: deal.scales_data,
      pdfUrl: deal.pdf_url,
      createdAt: deal.created_at,
      updatedAt: deal.updated_at,
    });
  } catch (error) {
    console.error('Error loading deal:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to load deal' } },
      { status: 500 }
    );
  }
}

// PUT /api/calculator/deals/[id] - Update a deal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;
    const body = await request.json();
    const { dealDetails, sectionsData, totalsData, settlementDetails, factorsData, scalesData, pdfUrl } = body;

    // Check if deal exists and user has permission
    const checkResult = await pool.query(
      `SELECT user_id FROM deal_calculations WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Deal not found' } },
        { status: 404 }
      );
    }

    const deal = checkResult.rows[0];

    // Check authorization (admin can update all, others only their own)
    if (user.role !== 'admin' && deal.user_id !== user.userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Update deal
    const result = await pool.query(
      `UPDATE deal_calculations SET
        customer_name = $1,
        deal_name = $2,
        deal_details = $3,
        sections_data = $4,
        totals_data = $5,
        factors_data = $6,
        scales_data = $7,
        pdf_url = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING id, updated_at`,
      [
        dealDetails.customerName,
        dealDetails.dealName,
        JSON.stringify({ ...dealDetails, settlementDetails }),
        JSON.stringify(sectionsData),
        JSON.stringify(totalsData),
        JSON.stringify(factorsData),
        JSON.stringify(scalesData),
        pdfUrl || null,
        id,
      ]
    );

    return NextResponse.json({
      id: result.rows[0].id,
      updatedAt: result.rows[0].updated_at,
      message: 'Deal updated successfully',
    });
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to update deal' } },
      { status: 500 }
    );
  }
}

// DELETE /api/calculator/deals/[id] - Delete a deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;

    // Check if deal exists and user has permission
    const checkResult = await pool.query(
      `SELECT user_id FROM deal_calculations WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Deal not found' } },
        { status: 404 }
      );
    }

    const deal = checkResult.rows[0];

    // Check authorization (admin can delete all, others only their own)
    if (user.role !== 'admin' && deal.user_id !== user.userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Delete deal
    await pool.query(`DELETE FROM deal_calculations WHERE id = $1`, [id]);

    return NextResponse.json({
      message: 'Deal deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to delete deal' } },
      { status: 500 }
    );
  }
}
