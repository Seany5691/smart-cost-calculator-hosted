#!/usr/bin/env node

/**
 * Fix User Scales Pricing
 * 
 * This script populates the userCost fields in the scales configuration
 * by copying from managerCost with an optional markup multiplier.
 * 
 * Usage:
 *   node scripts/fix-user-scales-pricing.js [markup_multiplier]
 * 
 * Examples:
 *   node scripts/fix-user-scales-pricing.js          # Uses 1.0 (same as manager)
 *   node scripts/fix-user-scales-pricing.js 1.25     # 25% markup over manager
 *   node scripts/fix-user-scales-pricing.js 1.5      # 50% markup over manager
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixUserScalesPricing() {
  try {
    console.log('🔍 Fetching current scales configuration...');
    
    // Get current scales
    const result = await pool.query(
      'SELECT id, scales_data FROM scales ORDER BY created_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No scales found in database');
      return;
    }
    
    const scales = result.rows[0].scales_data;
    const id = result.rows[0].id;
    
    console.log('📊 Current scales structure:');
    console.log('  - Installation bands:', Object.keys(scales.installation?.cost || {}));
    console.log('  - Finance fee ranges:', Object.keys(scales.finance_fee?.cost || {}));
    console.log('  - Gross profit bands:', Object.keys(scales.gross_profit?.cost || {}));
    
    // Get markup multiplier from command line argument (default 1.0 = same as manager)
    const markupMultiplier = parseFloat(process.argv[2]) || 1.0;
    console.log(`\n💰 Using markup multiplier: ${markupMultiplier}x (${((markupMultiplier - 1) * 100).toFixed(0)}% markup)`);
    
    // Check if userCost fields exist and have values
    const installationUserValues = Object.values(scales.installation?.userCost || {});
    const hasUserData = installationUserValues.some(v => v && v > 0);
    
    if (hasUserData) {
      console.log('\n⚠️  WARNING: User pricing already has values!');
      console.log('Current user pricing (installation 0-4):', scales.installation.userCost['0-4']);
      console.log('Manager pricing (installation 0-4):', scales.installation.managerCost['0-4']);
      
      // Ask for confirmation (in a real script, you'd use readline)
      console.log('\n❓ This will OVERWRITE existing user pricing.');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('\n🔧 Updating user pricing...');
    
    // Update installation costs
    console.log('  ✓ Updating installation costs...');
    Object.keys(scales.installation.managerCost).forEach(band => {
      const managerValue = scales.installation.managerCost[band];
      const userValue = Math.round(managerValue * markupMultiplier * 100) / 100;
      scales.installation.userCost[band] = userValue;
      console.log(`    ${band}: ${managerValue} → ${userValue}`);
    });
    
    // Update finance fees
    console.log('  ✓ Updating finance fees...');
    Object.keys(scales.finance_fee.managerCost).forEach(range => {
      const managerValue = scales.finance_fee.managerCost[range];
      const userValue = Math.round(managerValue * markupMultiplier * 100) / 100;
      scales.finance_fee.userCost[range] = userValue;
      console.log(`    ${range}: ${managerValue} → ${userValue}`);
    });
    
    // Update gross profit
    console.log('  ✓ Updating gross profit...');
    Object.keys(scales.gross_profit.managerCost).forEach(band => {
      const managerValue = scales.gross_profit.managerCost[band];
      const userValue = Math.round(managerValue * markupMultiplier * 100) / 100;
      scales.gross_profit.userCost[band] = userValue;
      console.log(`    ${band}: ${managerValue} → ${userValue}`);
    });
    
    // Update additional costs
    console.log('  ✓ Updating additional costs...');
    const managerKm = scales.additional_costs.manager_cost_per_kilometer;
    const managerPoint = scales.additional_costs.manager_cost_per_point;
    const userKm = Math.round(managerKm * markupMultiplier * 100) / 100;
    const userPoint = Math.round(managerPoint * markupMultiplier * 100) / 100;
    
    scales.additional_costs.user_cost_per_kilometer = userKm;
    scales.additional_costs.user_cost_per_point = userPoint;
    
    console.log(`    Cost per kilometer: ${managerKm} → ${userKm}`);
    console.log(`    Cost per point: ${managerPoint} → ${userPoint}`);
    
    // Save back to database
    console.log('\n💾 Saving updated scales to database...');
    await pool.query(
      'UPDATE scales SET scales_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(scales), id]
    );
    
    console.log('\n✅ SUCCESS! User scales pricing has been updated!');
    console.log('\n📋 Summary:');
    console.log(`   - Markup multiplier: ${markupMultiplier}x`);
    console.log(`   - Installation costs: ${Object.keys(scales.installation.userCost).length} bands updated`);
    console.log(`   - Finance fees: ${Object.keys(scales.finance_fee.userCost).length} ranges updated`);
    console.log(`   - Gross profit: ${Object.keys(scales.gross_profit.userCost).length} bands updated`);
    console.log(`   - Additional costs: 2 fields updated`);
    
    console.log('\n🧪 Next steps:');
    console.log('   1. Clear browser cache');
    console.log('   2. Log in as a user');
    console.log('   3. Test the calculator Total Costs step');
    console.log('   4. Verify all values display correctly');
    
  } catch (error) {
    console.error('\n❌ Error fixing user scales:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixUserScalesPricing();
