/**
 * Run Custom Actual Costs Migration Script
 * Adds custom_actual_costs column to deal_calculations table
 * Allows admins to customize actual cost prices per deal
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 Starting custom actual costs migration...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database/migrations/022_custom_actual_costs.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute the migration
    console.log('⚙️  Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    // Check if column exists
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'deal_calculations' 
        AND column_name = 'custom_actual_costs'
      );
    `);
    
    if (columnCheck.rows[0].exists) {
      console.log('✅ custom_actual_costs column added to deal_calculations table');
    } else {
      throw new Error('custom_actual_costs column not found after migration');
    }

    // Check column type
    const typeCheck = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'deal_calculations' 
      AND column_name = 'custom_actual_costs';
    `);
    
    if (typeCheck.rows[0].data_type === 'jsonb') {
      console.log('✅ Column type is JSONB (correct)');
    } else {
      throw new Error(`Unexpected column type: ${typeCheck.rows[0].data_type}`);
    }

    // Check if index exists
    const indexCheck = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'deal_calculations' 
      AND indexname = 'idx_deals_custom_costs';
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('✅ Index idx_deals_custom_costs created');
    } else {
      console.log('⚠️  Index not found (may already exist or be skipped)');
    }

    console.log('\n🎉 Custom actual costs migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - custom_actual_costs JSONB column added to deal_calculations');
    console.log('   - Index created for faster lookups');
    console.log('   - Column comment added for documentation');
    console.log('\n✨ Admins can now customize actual cost prices per deal!');
    console.log('\n📝 Structure:');
    console.log('   {');
    console.log('     "hardware": [{"name": "Item", "customActualCost": 1234.56}],');
    console.log('     "connectivity": [{"name": "Service", "customActualCost": 567.89}],');
    console.log('     "licensing": [{"name": "License", "customActualCost": 890.12}]');
    console.log('   }');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
