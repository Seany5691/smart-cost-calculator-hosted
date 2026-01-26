#!/usr/bin/env node

/**
 * Fix User Role Scales Data
 * 
 * This script ensures that the scales configuration has all the required
 * role-based pricing fields so that User role can see proper pricing
 * in the Total Costs section.
 * 
 * Usage:
 *   node scripts/fix-user-role-scales.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixUserRoleScales() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking current scales data...\n');
    
    // Get current scales
    const currentResult = await client.query(
      `SELECT id, scales_data, created_at, updated_at 
       FROM scales 
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    if (currentResult.rows.length === 0) {
      console.log('❌ No scales data found in database!');
      console.log('   Please configure scales in Admin Config first.');
      return;
    }
    
    const currentScales = currentResult.rows[0];
    const scalesData = currentScales.scales_data;
    
    console.log('Current scales ID:', currentScales.id);
    console.log('Created at:', currentScales.created_at);
    console.log('Updated at:', currentScales.updated_at);
    console.log('\nCurrent additional_costs:');
    console.log(JSON.stringify(scalesData.additional_costs, null, 2));
    
    // Check if role-based fields exist
    const hasManagerFields = scalesData.additional_costs.manager_cost_per_kilometer !== undefined &&
                            scalesData.additional_costs.manager_cost_per_point !== undefined;
    const hasUserFields = scalesData.additional_costs.user_cost_per_kilometer !== undefined &&
                         scalesData.additional_costs.user_cost_per_point !== undefined;
    
    if (hasManagerFields && hasUserFields) {
      console.log('\n✅ All role-based pricing fields already exist!');
      console.log('   No update needed.');
      return;
    }
    
    console.log('\n⚠️  Missing role-based pricing fields detected!');
    console.log('   Manager fields exist:', hasManagerFields);
    console.log('   User fields exist:', hasUserFields);
    
    // Create updated scales data
    const updatedScalesData = { ...scalesData };
    
    // Ensure manager fields exist (copy from base cost if missing)
    if (!hasManagerFields) {
      updatedScalesData.additional_costs.manager_cost_per_kilometer = 
        scalesData.additional_costs.manager_cost_per_kilometer || 
        scalesData.additional_costs.cost_per_kilometer || 0;
      updatedScalesData.additional_costs.manager_cost_per_point = 
        scalesData.additional_costs.manager_cost_per_point || 
        scalesData.additional_costs.cost_per_point || 0;
    }
    
    // Ensure user fields exist (copy from base cost if missing)
    if (!hasUserFields) {
      updatedScalesData.additional_costs.user_cost_per_kilometer = 
        scalesData.additional_costs.user_cost_per_kilometer || 
        scalesData.additional_costs.cost_per_kilometer || 0;
      updatedScalesData.additional_costs.user_cost_per_point = 
        scalesData.additional_costs.user_cost_per_point || 
        scalesData.additional_costs.cost_per_point || 0;
    }
    
    console.log('\n📝 Updating scales data...');
    console.log('New additional_costs:');
    console.log(JSON.stringify(updatedScalesData.additional_costs, null, 2));
    
    // Update the database
    const updateResult = await client.query(
      `UPDATE scales 
       SET scales_data = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, scales_data, updated_at`,
      [JSON.stringify(updatedScalesData), currentScales.id]
    );
    
    console.log('\n✅ Scales data updated successfully!');
    console.log('   Updated at:', updateResult.rows[0].updated_at);
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const verifyResult = await client.query(
      `SELECT scales_data 
       FROM scales 
       WHERE id = $1`,
      [currentScales.id]
    );
    
    const verifiedData = verifyResult.rows[0].scales_data;
    const allFieldsExist = 
      verifiedData.additional_costs.cost_per_kilometer !== undefined &&
      verifiedData.additional_costs.cost_per_point !== undefined &&
      verifiedData.additional_costs.manager_cost_per_kilometer !== undefined &&
      verifiedData.additional_costs.manager_cost_per_point !== undefined &&
      verifiedData.additional_costs.user_cost_per_kilometer !== undefined &&
      verifiedData.additional_costs.user_cost_per_point !== undefined;
    
    if (allFieldsExist) {
      console.log('✅ All 6 required fields are now present!');
      console.log('\nVerified additional_costs:');
      console.log(JSON.stringify(verifiedData.additional_costs, null, 2));
      console.log('\n🎉 Fix complete! User role should now see proper pricing.');
      console.log('\n📋 Next steps:');
      console.log('   1. Clear browser cache (Ctrl+Shift+Delete)');
      console.log('   2. Restart dev server if running');
      console.log('   3. Log in as User role and test calculator');
    } else {
      console.log('❌ Verification failed! Some fields are still missing.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing scales data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixUserRoleScales()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
