import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

/**
 * GET /api/deals/:id/costings - Generate detailed cost breakdown for admin analysis
 * 
 * Authorization:
 * - Admin only
 * 
 * Calculates:
 * - Hardware, Connectivity, Licensing breakdowns (actual vs rep costs)
 * - Totals comparison (actual vs rep for all categories)
 * - True GP calculation
 * - Term analysis (recurring costs over contract term)
 * 
 * Requirements: AC-6.1 through AC-9.6
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
        { error: 'Only administrators can generate cost breakdowns' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid deal ID format' }, { status: 400 });
    }

    // Fetch the complete deal
    const result = await pool.query(
      `SELECT * FROM deal_calculations WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal = result.rows[0];
    const sectionsData = deal.sections_data;
    const totalsData = deal.totals_data;
    const dealDetails = deal.deal_details;
    const userRole = deal.user_role;

    // =====================================================
    // Hardware Breakdown
    // =====================================================
    const hardwareItems = (sectionsData?.hardware || []).map((item: any) => {
      const actualCost = item.cost || 0; // Admin cost price
      const repCost = userRole === 'admin' || userRole === 'manager' 
        ? (item.managerCost || item.cost || 0)
        : (item.userCost || item.cost || 0);
      
      return {
        name: item.name || 'Unknown',
        quantity: item.selectedQuantity || item.quantity || 0,
        actualCost,
        repCost,
        profit: repCost - actualCost
      };
    });

    const hardwareTotalActual = hardwareItems.reduce((sum: number, item: any) => sum + (item.actualCost * item.quantity), 0);
    const hardwareTotalRep = hardwareItems.reduce((sum: number, item: any) => sum + (item.repCost * item.quantity), 0);

    // =====================================================
    // Connectivity Breakdown
    // =====================================================
    const connectivityItems = (sectionsData?.connectivity || []).map((item: any) => {
      const actualCost = item.cost || 0; // Admin cost price
      const repCost = userRole === 'admin' || userRole === 'manager' 
        ? (item.managerCost || item.cost || 0)
        : (item.userCost || item.cost || 0);
      
      return {
        name: item.name || 'Unknown',
        quantity: item.selectedQuantity || item.quantity || 0,
        actualCost,
        repCost,
        profit: repCost - actualCost
      };
    });

    const connectivityTotalActual = connectivityItems.reduce((sum: number, item: any) => sum + (item.actualCost * item.quantity), 0);
    const connectivityTotalRep = connectivityItems.reduce((sum: number, item: any) => sum + (item.repCost * item.quantity), 0);

    // =====================================================
    // Licensing Breakdown
    // =====================================================
    const licensingItems = (sectionsData?.licensing || []).map((item: any) => {
      const actualCost = item.cost || 0; // Admin cost price
      const repCost = userRole === 'admin' || userRole === 'manager' 
        ? (item.managerCost || item.cost || 0)
        : (item.userCost || item.cost || 0);
      
      return {
        name: item.name || 'Unknown',
        quantity: item.selectedQuantity || item.quantity || 0,
        actualCost,
        repCost,
        profit: repCost - actualCost
      };
    });

    const licensingTotalActual = licensingItems.reduce((sum: number, item: any) => sum + (item.actualCost * item.quantity), 0);
    const licensingTotalRep = licensingItems.reduce((sum: number, item: any) => sum + (item.repCost * item.quantity), 0);

    // =====================================================
    // Totals Comparison
    // =====================================================
    
    // Installation costs - Rep uses their tier, Actual uses cost tier from scales config
    const installationRep = (totalsData?.installationBase || 0) + 
                            (totalsData?.extensionCost || totalsData?.extensionTotal || 0) + 
                            (totalsData?.fuelCost || totalsData?.fuelTotal || 0);
    
    // Fetch actual installation cost from scales config (cost tier)
    let installationActual = installationRep; // Default fallback
    
    console.log('[COSTINGS] ===== INSTALLATION ACTUAL COST DEBUG =====');
    console.log('[COSTINGS] totalsData:', JSON.stringify(totalsData, null, 2));
    console.log('[COSTINGS] dealDetails:', JSON.stringify(dealDetails, null, 2));
    
    try {
      const scalesResult = await pool.query('SELECT scales_data FROM scales ORDER BY created_at DESC LIMIT 1');
      
      if (scalesResult.rows.length > 0) {
        const scalesData = scalesResult.rows[0].scales_data;
        
        console.log('[COSTINGS] Scales data structure:', JSON.stringify({
          installation: scalesData.installation,
          additional_costs: scalesData.additional_costs
        }, null, 2));
        
        // Get the total number of extensions from hardware items to determine the installation band
        // Count all hardware items that are extensions (phones, handsets, etc.)
        const hardwareItems = sectionsData?.hardware || [];
        const totalExtensions = hardwareItems.reduce((sum: number, item: any) => {
          // Count quantity of each hardware item as extensions
          return sum + (item.selectedQuantity || item.quantity || 0);
        }, 0);
        
        let installationBand = '0-4';
        if (totalExtensions >= 5 && totalExtensions <= 8) {
          installationBand = '5-8';
        } else if (totalExtensions >= 9 && totalExtensions <= 16) {
          installationBand = '9-16';
        } else if (totalExtensions >= 17 && totalExtensions <= 32) {
          installationBand = '17-32';
        } else if (totalExtensions >= 33) {
          installationBand = '33+';
        }
        
        console.log('[COSTINGS] Total extensions from hardware:', totalExtensions);
        console.log('[COSTINGS] Installation band:', installationBand);
        
        // Get cost tier installation cost
        if (scalesData.installation && scalesData.installation.cost && scalesData.installation.cost[installationBand] !== undefined) {
          const baseInstallationCost = scalesData.installation.cost[installationBand];
          console.log('[COSTINGS] Base installation cost:', baseInstallationCost);
          
          // Get cost price cost per point and cost per kilometer from scales config
          // Note: Fields are directly under additional_costs, not nested under cost
          const costPriceCostPerPoint = scalesData.additional_costs?.cost_per_point || 0;
          const costPriceCostPerKm = scalesData.additional_costs?.cost_per_kilometer || 0;
          
          console.log('[COSTINGS] Cost price cost per point:', costPriceCostPerPoint);
          console.log('[COSTINGS] Cost price cost per km:', costPriceCostPerKm);
          
          // Get extension count from totalsData (Total Costs step) and distance from dealDetails (Deal Details step)
          const extensionCount = totalsData?.extensionCount || 0;
          const distance = dealDetails?.distance || 0;
          
          console.log('[COSTINGS] Extension count from totalsData:', extensionCount);
          console.log('[COSTINGS] Distance from dealDetails:', distance);
          
          // Calculate actual extension and fuel costs using cost price values
          const extensionCostActual = extensionCount * costPriceCostPerPoint; // Extension count × cost per point
          const fuelCostActual = distance * costPriceCostPerKm; // Distance × Cost per kilometer
          
          console.log('[COSTINGS] Extension cost actual:', extensionCostActual);
          console.log('[COSTINGS] Fuel cost actual:', fuelCostActual);
          
          installationActual = baseInstallationCost + extensionCostActual + fuelCostActual;
          console.log('[COSTINGS] Final installation actual:', installationActual);
        } else {
          console.log('[COSTINGS] Installation cost not found in scales data');
        }
      } else {
        console.log('[COSTINGS] No scales data found');
      }
    } catch (error) {
      console.error('[COSTINGS] Error fetching installation cost from scales:', error);
    }
    
    console.log('[COSTINGS] ===== END DEBUG =====');

    // Settlement - ALWAYS the same for both actual and rep (never changes)
    // Use actualSettlement from the Total Costs section (what the user entered/calculated)
    const settlement = totalsData?.actualSettlement || totalsData?.settlement || 0;
    const settlementActual = settlement;
    const settlementRep = settlement;

    // Get term and factors
    const term = dealDetails?.term || 60;
    const escalation = dealDetails?.escalation || 0;
    
    // Rep Factor (what the rep used) - this comes from the Total Costs section
    const repFactor = totalsData?.factor || 1;
    
    // Hardware Rental (monthly) - ALWAYS the same for both (from Total Costs section)
    // This comes directly from the calculator's Total Costs page
    const hardwareRentalRep = totalsData?.hardwareRental || 0;
    const hardwareRentalActual = hardwareRentalRep; // Hardware rental never changes
    
    // Total Payout - Rep calculation (needed for determining the band range)
    // Total Payout = Hardware Rental ÷ Factor
    const totalPayoutRep = repFactor !== 0 ? hardwareRentalRep / repFactor : 0;

    // Finance Fee - Rep uses their tier, Actual uses cost tier from scales config
    const financeFeeRep = totalsData?.financeFee || 0;
    let financeFeeActual = financeFeeRep; // Default fallback
    
    try {
      const scalesResult = await pool.query('SELECT scales_data FROM scales ORDER BY created_at DESC LIMIT 1');
      
      if (scalesResult.rows.length > 0) {
        const scalesData = scalesResult.rows[0].scales_data;
        
        // Determine finance fee range based on total payout
        let financeRange = '0-20000';
        if (totalPayoutRep > 20000 && totalPayoutRep <= 50000) {
          financeRange = '20001-50000';
        } else if (totalPayoutRep > 50000 && totalPayoutRep <= 100000) {
          financeRange = '50001-100000';
        } else if (totalPayoutRep > 100000) {
          financeRange = '100001+';
        }
        
        // Get cost tier finance fee
        if (scalesData.finance_fee && scalesData.finance_fee.cost && scalesData.finance_fee.cost[financeRange] !== undefined) {
          financeFeeActual = scalesData.finance_fee.cost[financeRange];
        }
      }
    } catch (error) {
      console.error('[COSTINGS] Error fetching finance fee from scales:', error);
    }
    
    // Fetch Cost Factor from factors config
    // The cost factor should come from the same band range as the rep factor,
    // but from the "cost" section of the factors config
    let costFactor = repFactor; // Default fallback
    
    try {
      // Fetch factors from database
      const factorsResult = await pool.query('SELECT factors_data FROM factors ORDER BY created_at DESC LIMIT 1');
      
      if (factorsResult.rows.length > 0) {
        const factorsData = factorsResult.rows[0].factors_data;
        
        // Factors are structured as:
        // {
        //   cost: { "36_months": { "0%": { "0-20000": 0.0377, ... }, ... }, ... },
        //   managerFactors: { ... },
        //   userFactors: { ... }
        // }
        
        // Determine the range based on totalPayoutRep (to match the rep factor's band)
        let rangeKey = '0-20000'; // Default
        if (totalPayoutRep > 20000 && totalPayoutRep <= 50000) {
          rangeKey = '20001-50000';
        } else if (totalPayoutRep > 50000 && totalPayoutRep <= 100000) {
          rangeKey = '50001-100000';
        } else if (totalPayoutRep > 100000) {
          rangeKey = '100000+';
        }
        
        // Format term and escalation to match the data structure
        const termKey = `${term}_months`;
        const escalationKey = `${escalation}%`;
        
        // Get the cost factor from the same band range as the rep factor
        if (factorsData.cost && 
            factorsData.cost[termKey] && 
            factorsData.cost[termKey][escalationKey] && 
            factorsData.cost[termKey][escalationKey][rangeKey] !== undefined) {
          
          costFactor = factorsData.cost[termKey][escalationKey][rangeKey];
        } else {
          console.warn(`[COSTINGS] Cost factor not found for term=${termKey}, escalation=${escalationKey}, range=${rangeKey}`);
        }
      }
    } catch (error) {
      console.error('[COSTINGS] Error fetching cost factor:', error);
      // Continue with default costFactor = repFactor
    }
    
    // Actual Total Payout = Hardware Rental ÷ Cost Factor
    const totalPayoutActual = costFactor !== 0 ? hardwareRentalActual / costFactor : 0;

    // Total MRC - Recalculate for both
    const totalMRCActual = hardwareRentalActual + connectivityTotalActual + licensingTotalActual;
    const totalMRCRep = hardwareRentalRep + connectivityTotalRep + licensingTotalRep;

    // =====================================================
    // Gross Profit Analysis
    // =====================================================
    
    // Actual GP: Total Payout - Finance Fee - Settlement - Installation - Hardware Total
    const actualGP = totalPayoutActual - financeFeeActual - settlementActual - installationActual - hardwareTotalActual;
    
    // Rep GP from totals data (what the rep sees)
    const repGP = totalsData?.grossProfit || totalsData?.customGrossProfit || 0;
    
    // GP Difference (Actual GP - Rep GP)
    const gpDifference = actualGP - repGP;

    // =====================================================
    // Term Analysis
    // =====================================================
    
    const connectivityOverTermActual = connectivityTotalActual * term;
    const connectivityOverTermRep = connectivityTotalRep * term;
    
    const licensingOverTermActual = licensingTotalActual * term;
    const licensingOverTermRep = licensingTotalRep * term;
    
    const totalRecurringOverTermActual = connectivityOverTermActual + licensingOverTermActual;
    const totalRecurringOverTermRep = connectivityOverTermRep + licensingOverTermRep;
    
    const gpOverTerm = totalRecurringOverTermRep - totalRecurringOverTermActual;

    // =====================================================
    // Build Response
    // =====================================================
    
    const costings = {
      dealId: deal.id,
      customerName: deal.customer_name,
      dealName: deal.deal_name,
      createdBy: deal.username,
      userRole: deal.user_role,
      term,
      escalation: dealDetails?.escalation || 0,
      
      hardware: {
        items: hardwareItems,
        totalActual: hardwareTotalActual,
        totalRep: hardwareTotalRep,
        totalProfit: hardwareTotalRep - hardwareTotalActual
      },
      
      connectivity: {
        items: connectivityItems,
        totalActual: connectivityTotalActual,
        totalRep: connectivityTotalRep,
        totalProfit: connectivityTotalRep - connectivityTotalActual
      },
      
      licensing: {
        items: licensingItems,
        totalActual: licensingTotalActual,
        totalRep: licensingTotalRep,
        totalProfit: licensingTotalRep - licensingTotalActual
      },
      
      totals: {
        hardwareTotal: { actual: hardwareTotalActual, rep: hardwareTotalRep },
        installationTotal: { actual: installationActual, rep: installationRep },
        connectivityTotal: { actual: connectivityTotalActual, rep: connectivityTotalRep },
        licensingTotal: { actual: licensingTotalActual, rep: licensingTotalRep },
        settlement: { actual: settlementActual, rep: settlementRep },
        financeFee: { actual: financeFeeActual, rep: financeFeeRep },
        factor: { 
          actual: parseFloat(costFactor.toFixed(5)), 
          rep: parseFloat(repFactor.toFixed(5)) 
        },
        totalPayout: { 
          actual: totalPayoutActual, 
          rep: totalPayoutRep,
          difference: totalPayoutActual - totalPayoutRep
        },
        hardwareRental: { actual: hardwareRentalActual, rep: hardwareRentalRep },
        totalMRC: { actual: totalMRCActual, rep: totalMRCRep }
      },
      
      grossProfit: {
        actualGP,
        repGP,
        difference: gpDifference
      },
      
      termAnalysis: {
        term,
        connectivityOverTerm: { actual: connectivityOverTermActual, rep: connectivityOverTermRep },
        licensingOverTerm: { actual: licensingOverTermActual, rep: licensingOverTermRep },
        totalRecurringOverTerm: { actual: totalRecurringOverTermActual, rep: totalRecurringOverTermRep },
        gpOverTerm
      }
    };

    const response = NextResponse.json(costings);

    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('[DEALS-COSTINGS] Error generating costings:', error);
    return NextResponse.json(
      { error: 'Failed to generate cost breakdown' },
      { status: 500 }
    );
  }
}
