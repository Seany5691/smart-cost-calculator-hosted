const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_cost_calculator',
  user: 'postgres',
  password: 'your_password_here' // Update this with your actual password
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'database', 'migrations', '025_add_lead_contact_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 025_add_lead_contact_fields.sql');
    console.log('=====================================\n');
    
    await pool.query(sql);
    console.log('✓ Migration completed successfully!\n');
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'leads' 
      AND column_name IN ('email', 'cell_number', 'pbx_link', 'business_registration_number', 'vat_number')
      ORDER BY column_name;
    `);
    
    console.log('New columns added to leads table:');
    console.log('=====================================');
    result.rows.forEach(row => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log(`  ✓ ${row.column_name.padEnd(35)} ${row.data_type}${length}`);
    });
    
    // Check indexes
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'leads'
      AND indexname IN ('idx_leads_email', 'idx_leads_cell_number');
    `);
    
    console.log('\nIndexes created:');
    console.log('=====================================');
    indexResult.rows.forEach(row => {
      console.log(`  ✓ ${row.indexname}`);
    });
    
    console.log('\n✓ All changes applied successfully!');
    console.log('\nNext steps:');
    console.log('  1. Restart your Next.js development server');
    console.log('  2. Test editing a lead with the new fields');
    console.log('  3. Verify the new compact layout in view details');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
