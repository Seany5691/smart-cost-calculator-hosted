import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

/**
 * PUT /api/deals/:id/custom-costs - Save custom actual costs for a deal
 * 
 * Authorization:
 * - Admin only
 * 
 * Body:
 * {
 *   hardware: [{ name: string, customActualCost: number }],
 *   connectivity: [{ name: string, customActualCost: number }],
 *   licensing: [{ name: string, customActualCost: number }]
 * }
 * 
 * Stores admin-customized actual cost prices for individual items.
 * These override the default costs from admin console config for this deal only.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Restrict to admin only
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can customize actual costs' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid deal ID format' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { hardware, connectivity, licensing } = body;

    // Validate structure
    if (!Array.isArray(hardware) && !Array.isArray(connectivity) && !Array.isArray(licensing)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected arrays for hardware, connectivity, and/or licensing' },
        { status: 400 }
      );
    }

    // Validate each item has required fields
    const validateItems = (items: any[], category: string) => {
      if (!Array.isArray(items)) return true;
      
      for (const item of items) {
        if (!item.name || typeof item.name !== 'string') {
          throw new Error(`Invalid ${category} item: missing or invalid name`);
        }
        if (item.customActualCost !== undefined && typeof item.customActualCost !== 'number') {
          throw new Error(`Invalid ${category} item: customActualCost must be a number`);
        }
        if (item.customActualCost !== undefined && item.customActualCost < 0) {
          throw new Error(`Invalid ${category} item: customActualCost cannot be negative`);
        }
      }
      return true;
    };

    try {
      validateItems(hardware, 'hardware');
      validateItems(connectivity, 'connectivity');
      validateItems(licensing, 'licensing');
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Validation failed' },
        { status: 400 }
      );
    }

    // Check if deal exists
    const dealCheck = await pool.query(
      'SELECT id FROM deal_calculations WHERE id = $1',
      [id]
    );

    if (dealCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Build custom costs object (only include non-empty arrays)
    const customCosts: any = {};
    if (hardware && hardware.length > 0) customCosts.hardware = hardware;
    if (connectivity && connectivity.length > 0) customCosts.connectivity = connectivity;
    if (licensing && licensing.length > 0) customCosts.licensing = licensing;

    // Update the deal with custom costs
    const result = await pool.query(
      `UPDATE deal_calculations 
       SET custom_actual_costs = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, custom_actual_costs`,
      [Object.keys(customCosts).length > 0 ? JSON.stringify(customCosts) : null, id]
    );

    console.log('[CUSTOM-COSTS] Updated custom actual costs for deal:', id);

    return NextResponse.json({
      success: true,
      dealId: result.rows[0].id,
      customActualCosts: result.rows[0].custom_actual_costs
    });
  } catch (error) {
    console.error('[CUSTOM-COSTS] Error saving custom costs:', error);
    return NextResponse.json(
      { error: 'Failed to save custom actual costs' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deals/:id/custom-costs - Get custom actual costs for a deal
 * 
 * Authorization:
 * - Admin only
 * 
 * Returns the custom actual costs stored for this deal, or null if none exist.
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

    // Restrict to admin only
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can view custom actual costs' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid deal ID format' }, { status: 400 });
    }

    // Fetch custom costs
    const result = await pool.query(
      'SELECT custom_actual_costs FROM deal_calculations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({
      dealId: id,
      customActualCosts: result.rows[0].custom_actual_costs || null
    });
  } catch (error) {
    console.error('[CUSTOM-COSTS] Error fetching custom costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom actual costs' },
      { status: 500 }
    );
  }
}
