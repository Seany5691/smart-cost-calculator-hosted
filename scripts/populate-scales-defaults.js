#!/usr/bin/env node

/**
 * Populate Scales with Default Values
 * 
 * This script populates the scales configuration with reasonable default values
 * for all three pricing tiers (cost, manager, user).
 * 
 * Usage:
 *   node scripts/populate-scales-defaults.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Default scales with reasonable values
// These are just examples - adjust to your business needs
const defaultScales = {
  installation: {
    cost: {
      '0-4': 1000,
      '5-8': 2000,
      '9-16': 3000,
      '17-32': 4000,
      '33+': 5000
    },
    managerCost: {
      '0-4': 1200,    // 20% markup over cost
      '5-8': 2400,
      '9-16': 3600,
      '17-32': 4800,
      '33+': 6000
    },
    userCost: {
      '0-4': 1500,    // 25% markup over manager
      '5-8': 3000,
      '9-16': 4500,
      '17-32': 6000,
      '33+': 7500
    }
  },
  finance_fee: {
    cost: {
      '0-20000': 500,
      '20001-50000': 1000,
      '50001-100000': 2000,
      '100001+': 3000
    },
    managerCost: {
      '0-20000': 600,
      '20001-50000': 1200,
      '50001-100000': 2400,
      '100001+': 3600
    },
    userCost: {
      '0-20000': 750,
      '20001-50000': 1500,
      '50001-100000': 3000,
      '100001+': 4500
    }
  },
  gross_profit: {
    cost: {
      '0-4': 2000,
      '5-8': 3000,
      '9-16': 4000,
      '17-32': 5000,
      '33+': 6000
    },
    managerCost: {
      '0-4': 2400,
      '5-8': 3600,
      '9-16': 4800,
      '17-32': 6000,
      '33+': 7200
    },
    userCost: {
      '0-4': 3000,
      '5-8': 4500,
      '9-16': 6000,
      '17-32': 7500,
      '33+': 9000
    }
  },
  additional_costs: {
    cost_per_kilometer: 10,
    cost_per_point: 50,
    manager_cost_per_kilometer: 12,
    manager_cost_per_point: 60,
    user_cost_per_kilometer: 15,
    user_cost_per_point: 75
  }
};

async function populateScalesDefaults() {
  try {
    console.log('🔍 Checking current scales...\n');
    
    // Check if scales exist
    const result = await pool.query(
      'SELECT id, scales_data FROM scales ORDER BY created_at DESC LIMIT 1'
    );
    
    if (result.rows.length > 0) {
      const currentScales = result.rows[0].scales_data;
      const id = result.rows[0].id;
      
      console.log('⚠️  WARNING: Scales already exist in database!');
      console.log(`   ID: ${id}`);
      console.log('');
      
      // Check if they're all zeros
      const installationValues = Object.values(currentScales.installation?.cost || {});
      const allZeros = installationValues.every(v => v === 0 || v === null || v === undefined);
      
      if (allZeros) {
        console.log('✅ Current scales are all zeros - safe to update');
        console.log('');
        console.log('❓ This will REPLACE the current scales with default values.');
        console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Update existing record
        await pool.query(
          'UPDATE scales SET scales_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [JSON.stringify(defaultScales), id]
        );
        
        console.log('\n✅ Scales updated successfully!');
      } else {
        console.log('❌ Current scales have non-zero values!');
        console.log('');
        console.log('Current values (installation 0-4):');
        console.log(`   Cost: ${currentScales.installation?.cost?.['0-4'] || 0}`);
        console.log(`   Manager: ${currentScales.installation?.managerCost?.['0-4'] || 0}`);
        console.log(`   User: ${currentScales.installation?.userCost?.['0-4'] || 0}`);
        console.log('');
        console.log('⚠️  To avoid overwriting your data, this script will NOT update.');
        console.log('');
        console.log('If you want to update anyway, run:');
        console.log('   node scripts/populate-scales-defaults.js --force');
        
        if (!process.argv.includes('--force')) {
          process.exit(0);
        }
        
        console.log('');
        console.log('🔥 --force flag detected. Updating anyway...');
        console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Update existing record
        await pool.query(
          'UPDATE scales SET scales_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [JSON.stringify(defaultScales), id]
        );
        
        console.log('\n✅ Scales updated successfully!');
      }
    } else {
      console.log('📝 No scales found - creating new record...');
      
      // Insert new record
      await pool.query(
        'INSERT INTO scales (scales_data) VALUES ($1)',
        [JSON.stringify(defaultScales)]
      );
      
      console.log('✅ Scales created successfully!');
    }
    
    console.log('');
    console.log('📊 Default values applied:');
    console.log('');
    console.log('Installation Costs:');
    console.log('   0-4 extensions:   Cost=R1000, Manager=R1200, User=R1500');
    console.log('   5-8 extensions:   Cost=R2000, Manager=R2400, User=R3000');
    console.log('   9-16 extensions:  Cost=R3000, Manager=R3600, User=R4500');
    console.log('   17-32 extensions: Cost=R4000, Manager=R4800, User=R6000');
    console.log('   33+ extensions:   Cost=R5000, Manager=R6000, User=R7500');
    console.log('');
    console.log('Finance Fees:');
    console.log('   R0-20k:    Cost=R500,  Manager=R600,  User=R750');
    console.log('   R20k-50k:  Cost=R1000, Manager=R1200, User=R1500');
    console.log('   R50k-100k: Cost=R2000, Manager=R2400, User=R3000');
    console.log('   R100k+:    Cost=R3000, Manager=R3600, User=R4500');
    console.log('');
    console.log('Gross Profit:');
    console.log('   0-4 extensions:   Cost=R2000, Manager=R2400, User=R3000');
    console.log('   5-8 extensions:   Cost=R3000, Manager=R3600, User=R4500');
    console.log('   9-16 extensions:  Cost=R4000, Manager=R4800, User=R6000');
    console.log('   17-32 extensions: Cost=R5000, Manager=R6000, User=R7500');
    console.log('   33+ extensions:   Cost=R6000, Manager=R7200, User=R9000');
    console.log('');
    console.log('Additional Costs:');
    console.log('   Per Kilometer: Cost=R10, Manager=R12, User=R15');
    console.log('   Per Point:     Cost=R50, Manager=R60, User=R75');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Verify values: node scripts/check-user-scales.js');
    console.log('   2. Adjust values in Admin panel if needed');
    console.log('   3. Test calculator as user');
    console.log('');
    console.log('💡 These are DEFAULT values - adjust them to match your business!');
    
  } catch (error) {
    console.error('\n❌ Error populating scales:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
populateScalesDefaults();
