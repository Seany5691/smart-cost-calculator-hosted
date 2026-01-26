#!/usr/bin/env node

/**
 * Check User Scales Pricing
 * 
 * This script checks the current state of user pricing in scales configuration
 * and reports any missing or zero values.
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkUserScales() {
  try {
    console.log('🔍 Checking user scales pricing...\n');
    
    // Get current scales
    const result = await pool.query(
      'SELECT id, scales_data, created_at, updated_at FROM scales ORDER BY created_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No scales found in database');
      return;
    }
    
    const scales = result.rows[0].scales_data;
    const id = result.rows[0].id;
    const createdAt = result.rows[0].created_at;
    const updatedAt = result.rows[0].updated_at;
    
    console.log('📊 Scales Information:');
    console.log(`   ID: ${id}`);
    console.log(`   Created: ${createdAt}`);
    console.log(`   Updated: ${updatedAt}`);
    console.log('');
    
    let hasIssues = false;
    const issues = [];
    
    // Check installation costs
    console.log('🏗️  Installation Costs:');
    const installationBands = ['0-4', '5-8', '9-16', '17-32', '33+'];
    installationBands.forEach(band => {
      const cost = scales.installation?.cost?.[band] || 0;
      const managerCost = scales.installation?.managerCost?.[band] || 0;
      const userCost = scales.installation?.userCost?.[band] || 0;
      
      console.log(`   ${band.padEnd(8)} - Cost: ${cost.toString().padStart(8)}, Manager: ${managerCost.toString().padStart(8)}, User: ${userCost.toString().padStart(8)}`);
      
      if (userCost === 0 || userCost === null || userCost === undefined) {
        hasIssues = true;
        issues.push(`Installation ${band}: User cost is ${userCost}`);
      }
    });
    console.log('');
    
    // Check finance fees
    console.log('💰 Finance Fees:');
    const feeRanges = ['0-20000', '20001-50000', '50001-100000', '100001+'];
    feeRanges.forEach(range => {
      const cost = scales.finance_fee?.cost?.[range] || 0;
      const managerCost = scales.finance_fee?.managerCost?.[range] || 0;
      const userCost = scales.finance_fee?.userCost?.[range] || 0;
      
      console.log(`   ${range.padEnd(15)} - Cost: ${cost.toString().padStart(8)}, Manager: ${managerCost.toString().padStart(8)}, User: ${userCost.toString().padStart(8)}`);
      
      if (userCost === 0 || userCost === null || userCost === undefined) {
        hasIssues = true;
        issues.push(`Finance fee ${range}: User cost is ${userCost}`);
      }
    });
    console.log('');
    
    // Check gross profit
    console.log('📈 Gross Profit:');
    installationBands.forEach(band => {
      const cost = scales.gross_profit?.cost?.[band] || 0;
      const managerCost = scales.gross_profit?.managerCost?.[band] || 0;
      const userCost = scales.gross_profit?.userCost?.[band] || 0;
      
      console.log(`   ${band.padEnd(8)} - Cost: ${cost.toString().padStart(8)}, Manager: ${managerCost.toString().padStart(8)}, User: ${userCost.toString().padStart(8)}`);
      
      if (userCost === 0 || userCost === null || userCost === undefined) {
        hasIssues = true;
        issues.push(`Gross profit ${band}: User cost is ${userCost}`);
      }
    });
    console.log('');
    
    // Check additional costs
    console.log('➕ Additional Costs:');
    const costKm = scales.additional_costs?.cost_per_kilometer || 0;
    const managerKm = scales.additional_costs?.manager_cost_per_kilometer || 0;
    const userKm = scales.additional_costs?.user_cost_per_kilometer || 0;
    
    const costPoint = scales.additional_costs?.cost_per_point || 0;
    const managerPoint = scales.additional_costs?.manager_cost_per_point || 0;
    const userPoint = scales.additional_costs?.user_cost_per_point || 0;
    
    console.log(`   Per Kilometer - Cost: ${costKm.toString().padStart(8)}, Manager: ${managerKm.toString().padStart(8)}, User: ${userKm.toString().padStart(8)}`);
    console.log(`   Per Point     - Cost: ${costPoint.toString().padStart(8)}, Manager: ${managerPoint.toString().padStart(8)}, User: ${userPoint.toString().padStart(8)}`);
    console.log('');
    
    if (userKm === 0 || userKm === null || userKm === undefined) {
      hasIssues = true;
      issues.push(`User cost per kilometer is ${userKm}`);
    }
    if (userPoint === 0 || userPoint === null || userPoint === undefined) {
      hasIssues = true;
      issues.push(`User cost per point is ${userPoint}`);
    }
    
    // Summary
    if (hasIssues) {
      console.log('❌ ISSUES FOUND:');
      console.log('');
      issues.forEach(issue => {
        console.log(`   ⚠️  ${issue}`);
      });
      console.log('');
      console.log('🔧 To fix these issues, run:');
      console.log('   node scripts/fix-user-scales-pricing.js');
      console.log('');
      console.log('   Or with a markup (e.g., 25% higher than manager):');
      console.log('   node scripts/fix-user-scales-pricing.js 1.25');
      console.log('');
      console.log('💡 This is why users see zeros in Total Costs!');
    } else {
      console.log('✅ All user pricing fields are populated!');
      console.log('');
      console.log('📊 Pricing comparison:');
      console.log(`   Installation (0-4): Manager=${scales.installation.managerCost['0-4']}, User=${scales.installation.userCost['0-4']}`);
      console.log(`   Finance fee (0-20000): Manager=${scales.finance_fee.managerCost['0-20000']}, User=${scales.finance_fee.userCost['0-20000']}`);
      console.log(`   Gross profit (0-4): Manager=${scales.gross_profit.managerCost['0-4']}, User=${scales.gross_profit.userCost['0-4']}`);
      console.log(`   Per kilometer: Manager=${managerKm}, User=${userKm}`);
      console.log(`   Per point: Manager=${managerPoint}, User=${userPoint}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking user scales:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkUserScales();
