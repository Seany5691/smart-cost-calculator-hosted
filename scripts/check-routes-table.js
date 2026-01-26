require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkRoutesTable() {
  try {
    console.log('Checking routes table structure...\n');
    
    // Get table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'routes'
      ORDER BY ordinal_position;
    `);
    
    console.log('Routes table columns:');
    console.table(result.rows);
    
    // Check if table exists and has data
    const countResult = await pool.query('SELECT COUNT(*) FROM routes');
    console.log(`\nTotal routes in database: ${countResult.rows[0].count}`);
    
    // Try a test insert (will rollback)
    await pool.query('BEGIN');
    try {
      const testResult = await pool.query(`
        INSERT INTO routes (user_id, name, google_maps_url, stop_count, lead_ids, starting_point)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        '00000000-0000-0000-0000-000000000000', // test UUID
        'Test Route',
        'https://www.google.com/maps/dir/test',
        1,
        ['00000000-0000-0000-0000-000000000000'],
        'Test Starting Point'
      ]);
      
      console.log('\n✓ Test insert successful (will be rolled back)');
      console.log('Inserted row:', testResult.rows[0]);
      
      await pool.query('ROLLBACK');
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('\n✗ Test insert failed:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkRoutesTable();
