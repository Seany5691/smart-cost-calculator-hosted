#!/usr/bin/env node

/**
 * Check Scales Data
 * 
 * This script checks the current scales configuration to diagnose
 * why User role might be seeing zeros in Total Costs.
 * 
 * Usage:
 *   node scripts/check-scales-data.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkScalesData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking scales configuration...\n');
    
    // Get current scales
    const result = await client.query(
      `SELECT id, scales_data, created_at, updated_at 
       FROM scales 
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No scales data found in database!');
      console.log('   Please configure scales in Admin Config first.');
      return;
    }
    
    const scales = result.rows[0];
    const scalesData = scales.scales_data;
    
    console.log('📊 Scales Information:');
    console.log('   ID:', scales.id);
    console.log('   Created:', scales.created_at);
    console.log('   Updated:', scales.updated_at);
    console.log('');
    
    // Check additional_costs structure
    console.log('💰 Additional Costs Configuration:');
    console.log('');
    
    const additionalCosts = scalesData.additional_costs || {};
    
    const fields = [
      { name: 'cost_per_kilometer', label: 'Base Cost Per Kilometer' },
      { name: 'cost_per_point', label: 'Base Cost Per Point' },
      { name: 'manager_cost_per_kilometer', label: 'Manager Cost Per Kilometer' },
      { name: 'manager_cost_per_point', label: 'Manager Cost Per Point' },
      { name: 'user_cost_per_kilometer', label: 'User Cost Per Kilometer' },
      { name: 'user_cost_per_point', label: 'User Cost Per Point' },
    ];
    
    let hasIssues = false;
    
    fields.forEach(field => {
      const value = additionalCosts[field.name];
      const exists = value !== undefined && value !== null;
      const isZero = value === 0 || value === '0';
      
      let status = '✅';
      let message = '';
      
      if (!exists) {
        status = '❌';
        message = ' (MISSING - THIS IS THE PROBLEM!)';
        hasIssues = true;
      } else if (isZero) {
        status = '⚠️ ';
        message = ' (Zero value - might cause issues)';
        hasIssues = true;
      }
      
      console.log(`   ${status} ${field.label}: ${value}${message}`);
    });
    
    console.log('');
    
    // Check installation scales
    console.log('🏗️  Installation Scales:');
    if (scalesData.installation) {
      const hasNestedStructure = scalesData.installation.cost && 
                                 scalesData.installation.managerCost && 
                                 scalesData.installation.userCost;
      
      if (hasNestedStructure) {
        console.log('   ✅ Has role-based pricing structure');
        console.log('   Cost bands:', Object.keys(scalesData.installation.cost).join(', '));
        console.log('   Manager bands:', Object.keys(scalesData.installation.managerCost).join(', '));
        console.log('   User bands:', Object.keys(scalesData.installation.userCost).join(', '));
      } else {
        console.log('   ⚠️  Using simple structure (no role-based pricing)');
        console.log('   Bands:', Object.keys(scalesData.installation).join(', '));
      }
    } else {
      console.log('   ❌ Installation scales missing!');
      hasIssues = true;
    }
    
    console.log('');
    
    // Check gross profit scales
    console.log('💵 Gross Profit Scales:');
    if (scalesData.gross_profit) {
      const hasNestedStructure = scalesData.gross_profit.cost && 
                                 scalesData.gross_profit.managerCost && 
                                 scalesData.gross_profit.userCost;
      
      if (hasNestedStructure) {
        console.log('   ✅ Has role-based pricing structure');
        console.log('   Cost bands:', Object.keys(scalesData.gross_profit.cost).join(', '));
        console.log('   Manager bands:', Object.keys(scalesData.gross_profit.managerCost).join(', '));
        console.log('   User bands:', Object.keys(scalesData.gross_profit.userCost).join(', '));
      } else {
        console.log('   ⚠️  Using simple structure (no role-based pricing)');
        console.log('   Bands:', Object.keys(scalesData.gross_profit).join(', '));
      }
    } else {
      console.log('   ❌ Gross profit scales missing!');
      hasIssues = true;
    }
    
    console.log('');
    
    // Check finance fee scales
    console.log('💳 Finance Fee Scales:');
    if (scalesData.finance_fee) {
      const hasNestedStructure = scalesData.finance_fee.cost && 
                                 scalesData.finance_fee.managerCost && 
                                 scalesData.finance_fee.userCost;
      
      if (hasNestedStructure) {
        console.log('   ✅ Has role-based pricing structure');
        console.log('   Cost ranges:', Object.keys(scalesData.finance_fee.cost).join(', '));
        console.log('   Manager ranges:', Object.keys(scalesData.finance_fee.managerCost).join(', '));
        console.log('   User ranges:', Object.keys(scalesData.finance_fee.userCost).join(', '));
      } else {
        console.log('   ⚠️  Using simple structure (no role-based pricing)');
        console.log('   Ranges:', Object.keys(scalesData.finance_fee).join(', '));
      }
    } else {
      console.log('   ❌ Finance fee scales missing!');
      hasIssues = true;
    }
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    
    if (hasIssues) {
      console.log('❌ ISSUES DETECTED!');
      console.log('');
      console.log('The scales configuration has missing or zero values that will');
      console.log('cause User role to see zeros in the Total Costs section.');
      console.log('');
      console.log('🔧 TO FIX THIS, RUN:');
      console.log('   node scripts/fix-user-role-scales.js');
      console.log('');
    } else {
      console.log('✅ Scales configuration looks good!');
      console.log('');
      console.log('If User role is still seeing zeros, check:');
      console.log('   1. Browser cache (clear it)');
      console.log('   2. Dev server (restart it)');
      console.log('   3. Browser console for errors (F12)');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking scales data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkScalesData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
