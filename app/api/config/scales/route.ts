import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAuth } from '@/lib/middleware';
import { invalidateCache } from '@/lib/cache';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
});

// GET /api/config/scales - Get the current scales
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
      `SELECT id, scales_data as "scalesData", created_at as "createdAt", updated_at as "updatedAt"
       FROM scales 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      // Return default empty scales structure if none exists
      const defaultScales = {
        installation: {
          cost: { '0-4': 0, '5-8': 0, '9-16': 0, '17-32': 0, '33+': 0 },
          managerCost: { '0-4': 0, '5-8': 0, '9-16': 0, '17-32': 0, '33+': 0 },
          userCost: { '0-4': 0, '5-8': 0, '9-16': 0, '17-32': 0, '33+': 0 }
        },
        finance_fee: {
          cost: { '0-20000': 0, '20001-50000': 0, '50001-100000': 0, '100001+': 0 },
          managerCost: { '0-20000': 0, '20001-50000': 0, '50001-100000': 0, '100001+': 0 },
          userCost: { '0-20000': 0, '20001-50000': 0, '50001-100000': 0, '100001+': 0 }
        },
        gross_profit: {
          cost: { '0-4': 0, '5-8': 0, '9-16': 0, '17-32': 0, '33+': 0 },
          managerCost: { '0-4': 0, '5-8': 0, '9-16': 0, '17-32': 0, '33+': 0 },
          userCost: { '0-4': 0, '5-8': 0, '9-16': 0, '17-32': 0, '33+': 0 }
        },
        additional_costs: {
          cost_per_kilometer: 0,
          cost_per_point: 0,
          manager_cost_per_kilometer: 0,
          manager_cost_per_point: 0,
          user_cost_per_kilometer: 0,
          user_cost_per_point: 0
        }
      };
      return NextResponse.json(defaultScales);
    }

    const scalesData = result.rows[0].scalesData;
    
    // Check if data is already in enhanced format (has cost/managerCost/userCost structure)
    const isEnhancedFormat = scalesData.installation && 
                             typeof scalesData.installation === 'object' &&
                             'cost' in scalesData.installation &&
                             'managerCost' in scalesData.installation &&
                             'userCost' in scalesData.installation;
    
    if (isEnhancedFormat) {
      // Already in enhanced format, return as-is
      return NextResponse.json(scalesData);
    }
    
    // Convert simple format to enhanced format
    const installationBands = ['0-4', '5-8', '9-16', '17-32', '33+'];
    const financeFeeRanges = ['0-20000', '20001-50000', '50001-100000', '100001+'];
    const grossProfitBands = ['0-4', '5-8', '9-16', '17-32', '33+'];
    
    const enhancedScales: any = {
      installation: { cost: {}, managerCost: {}, userCost: {} },
      finance_fee: { cost: {}, managerCost: {}, userCost: {} },
      gross_profit: { cost: {}, managerCost: {}, userCost: {} },
      additional_costs: {
        cost_per_kilometer: 0,
        cost_per_point: 0,
        manager_cost_per_kilometer: 0,
        manager_cost_per_point: 0,
        user_cost_per_kilometer: 0,
        user_cost_per_point: 0
      }
    };
    
    // Convert installation costs
    if (scalesData.installation) {
      installationBands.forEach(band => {
        const value = scalesData.installation[band] || 0;
        enhancedScales.installation.cost[band] = value;
        enhancedScales.installation.managerCost[band] = value;
        enhancedScales.installation.userCost[band] = value;
      });
    }
    
    // Convert finance fees
    if (scalesData.finance_fee) {
      financeFeeRanges.forEach(range => {
        const value = scalesData.finance_fee[range] || 0;
        enhancedScales.finance_fee.cost[range] = value;
        enhancedScales.finance_fee.managerCost[range] = value;
        enhancedScales.finance_fee.userCost[range] = value;
      });
    }
    
    // Convert gross profit
    if (scalesData.gross_profit) {
      grossProfitBands.forEach(band => {
        const value = scalesData.gross_profit[band] || 0;
        enhancedScales.gross_profit.cost[band] = value;
        enhancedScales.gross_profit.managerCost[band] = value;
        enhancedScales.gross_profit.userCost[band] = value;
      });
    }
    
    // Convert additional costs
    if (scalesData.additional_costs) {
      enhancedScales.additional_costs.cost_per_kilometer = scalesData.additional_costs.cost_per_kilometer || 0;
      enhancedScales.additional_costs.cost_per_point = scalesData.additional_costs.cost_per_point || 0;
      enhancedScales.additional_costs.manager_cost_per_kilometer = scalesData.additional_costs.cost_per_kilometer || 0;
      enhancedScales.additional_costs.manager_cost_per_point = scalesData.additional_costs.cost_per_point || 0;
      enhancedScales.additional_costs.user_cost_per_kilometer = scalesData.additional_costs.cost_per_kilometer || 0;
      enhancedScales.additional_costs.user_cost_per_point = scalesData.additional_costs.cost_per_point || 0;
    }

    return NextResponse.json(enhancedScales);
  } catch (error) {
    console.error('Error fetching scales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scales' },
      { status: 500 }
    );
  }
}

// POST /api/config/scales - Create or update scales
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can update scales
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validation - ensure it's a valid scales structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid scales data' },
        { status: 400 }
      );
    }

    // Validate required structure - accept both simple and enhanced formats
    const requiredKeys = ['installation', 'finance_fee', 'gross_profit', 'additional_costs'];
    const missingKeys = requiredKeys.filter(key => !(key in body));
    
    if (missingKeys.length > 0) {
      return NextResponse.json(
        { error: `Missing required keys: ${missingKeys.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if it's enhanced format (has cost/managerCost/userCost structure)
    const isEnhancedFormat = body.installation && 
                             typeof body.installation === 'object' &&
                             'cost' in body.installation &&
                             'managerCost' in body.installation &&
                             'userCost' in body.installation;

    // Validate enhanced format structure if applicable
    if (isEnhancedFormat) {
      // Validate that each section has the required pricing tiers
      const sections = ['installation', 'finance_fee', 'gross_profit'];
      for (const section of sections) {
        if (!body[section].cost || !body[section].managerCost || !body[section].userCost) {
          return NextResponse.json(
            { error: `Invalid enhanced format: ${section} must have cost, managerCost, and userCost` },
            { status: 400 }
          );
        }
      }
      
      // Validate additional_costs has all 6 fields
      const additionalCostsKeys = [
        'cost_per_kilometer', 'cost_per_point',
        'manager_cost_per_kilometer', 'manager_cost_per_point',
        'user_cost_per_kilometer', 'user_cost_per_point'
      ];
      const missingAdditionalKeys = additionalCostsKeys.filter(key => !(key in body.additional_costs));
      if (missingAdditionalKeys.length > 0) {
        return NextResponse.json(
          { error: `Missing additional_costs keys: ${missingAdditionalKeys.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Insert new scales (we keep history by not deleting old ones)
    const result = await pool.query(
      `INSERT INTO scales (scales_data)
       VALUES ($1)
       RETURNING id, scales_data as "scalesData", created_at as "createdAt", updated_at as "updatedAt"`,
      [JSON.stringify(body)]
    );

    // Invalidate cache after successful creation
    try {
      await invalidateCache('scales');
    } catch (cacheError) {
      console.warn('Cache invalidation failed (non-critical):', cacheError);
    }

    return NextResponse.json(result.rows[0].scalesData, { status: 201 });
  } catch (error) {
    console.error('Error creating scales:', error);
    return NextResponse.json(
      { error: 'Failed to create scales' },
      { status: 500 }
    );
  }
}

// PUT /api/config/scales - Update the current scales
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can update scales
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validation - ensure it's a valid scales structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid scales data' },
        { status: 400 }
      );
    }

    // Validate required structure - accept both simple and enhanced formats
    const requiredKeys = ['installation', 'finance_fee', 'gross_profit', 'additional_costs'];
    const missingKeys = requiredKeys.filter(key => !(key in body));
    
    if (missingKeys.length > 0) {
      return NextResponse.json(
        { error: `Missing required keys: ${missingKeys.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if it's enhanced format (has cost/managerCost/userCost structure)
    const isEnhancedFormat = body.installation && 
                             typeof body.installation === 'object' &&
                             'cost' in body.installation &&
                             'managerCost' in body.installation &&
                             'userCost' in body.installation;

    // Validate enhanced format structure if applicable
    if (isEnhancedFormat) {
      // Validate that each section has the required pricing tiers
      const sections = ['installation', 'finance_fee', 'gross_profit'];
      for (const section of sections) {
        if (!body[section].cost || !body[section].managerCost || !body[section].userCost) {
          return NextResponse.json(
            { error: `Invalid enhanced format: ${section} must have cost, managerCost, and userCost` },
            { status: 400 }
          );
        }
      }
      
      // Validate additional_costs has all 6 fields
      const additionalCostsKeys = [
        'cost_per_kilometer', 'cost_per_point',
        'manager_cost_per_kilometer', 'manager_cost_per_point',
        'user_cost_per_kilometer', 'user_cost_per_point'
      ];
      const missingAdditionalKeys = additionalCostsKeys.filter(key => !(key in body.additional_costs));
      if (missingAdditionalKeys.length > 0) {
        return NextResponse.json(
          { error: `Missing additional_costs keys: ${missingAdditionalKeys.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Get the most recent scales ID
    const currentResult = await pool.query(
      `SELECT id FROM scales ORDER BY created_at DESC LIMIT 1`
    );

    if (currentResult.rows.length === 0) {
      // No existing scales, create one
      const result = await pool.query(
        `INSERT INTO scales (scales_data)
         VALUES ($1)
         RETURNING id, scales_data as "scalesData", created_at as "createdAt", updated_at as "updatedAt"`,
        [JSON.stringify(body)]
      );

      // Invalidate cache after successful creation
      try {
        await invalidateCache('scales');
      } catch (cacheError) {
        console.warn('Cache invalidation failed (non-critical):', cacheError);
      }

      return NextResponse.json(result.rows[0].scalesData, { status: 201 });
    }

    const currentId = currentResult.rows[0].id;

    // Update the current scales
    const result = await pool.query(
      `UPDATE scales 
       SET scales_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, scales_data as "scalesData", created_at as "createdAt", updated_at as "updatedAt"`,
      [JSON.stringify(body), currentId]
    );

    // Invalidate cache after successful update
    try {
      await invalidateCache('scales');
    } catch (cacheError) {
      console.warn('Cache invalidation failed (non-critical):', cacheError);
    }

    return NextResponse.json(result.rows[0].scalesData);
  } catch (error) {
    console.error('Error updating scales:', error);
    return NextResponse.json(
      { error: 'Failed to update scales' },
      { status: 500 }
    );
  }
}
