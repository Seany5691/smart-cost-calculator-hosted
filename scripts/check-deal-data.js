/**
 * Check Deal Data - Diagnostic Script
 * 
 * This script checks what data is actually stored in a deal
 * to help diagnose why Installation Total Actual Cost shows R0.00
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDealData(dealId) {
  try {
    console.log('Checking deal data for ID:', dealId);
    console.log('=====================================\n');

    const result = await pool.query(
      'SELECT * FROM deal_calculations WHERE id = $1',
      [dealId]
    );

    if (result.rows.length === 0) {
      console.log('❌ Deal not found');
      return;
    }

    const deal = result.rows[0];
    
    console.log('✅ Deal found');
    console.log('Customer:', deal.customer_name);
    console.log('Deal Name:', deal.deal_name);
    console.log('User Role:', deal.user_role);
    console.log('\n=====================================');
    console.log('DEAL DETAILS:');
    console.log('=====================================');
    console.log(JSON.stringify(deal.deal_details, null, 2));
    
    console.log('\n=====================================');
    console.log('TOTALS DATA:');
    console.log('=====================================');
    console.log(JSON.stringify(deal.totals_data, null, 2));
    
    console.log('\n=====================================');
    console.log('KEY VALUES FOR INSTALLATION COST:');
    console.log('=====================================');
    console.log('dealDetails.distance:', deal.deal_details?.distance);
    console.log('dealDetails.extensions:', deal.deal_details?.extensions);
    console.log('totalsData.extensionCount:', deal.totals_data?.extensionCount);
    console.log('totalsData.installationTotal:', deal.totals_data?.installationTotal);
    console.log('totalsData.extensionTotal:', deal.totals_data?.extensionTotal);
    console.log('totalsData.fuelTotal:', deal.totals_data?.fuelTotal);
    
    // Check scales config
    console.log('\n=====================================');
    console.log('SCALES CONFIG:');
    console.log('=====================================');
    
    const scalesResult = await pool.query(
      'SELECT scales_data FROM scales ORDER BY created_at DESC LIMIT 1'
    );
    
    if (scalesResult.rows.length > 0) {
      const scalesData = scalesResult.rows[0].scales_data;
      console.log('Cost per point:', scalesData.additional_costs?.cost?.cost_per_point);
      console.log('Cost per km:', scalesData.additional_costs?.cost?.cost_per_km);
      console.log('\nInstallation bands (cost tier):');
      console.log(JSON.stringify(scalesData.installation?.cost, null, 2));
    } else {
      console.log('❌ No scales config found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

// Get deal ID from command line argument
const dealId = process.argv[2];

if (!dealId) {
  console.log('Usage: node scripts/check-deal-data.js <deal-id>');
  console.log('\nExample: node scripts/check-deal-data.js 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

checkDealData(dealId);
