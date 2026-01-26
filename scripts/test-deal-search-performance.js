#!/usr/bin/env node

/**
 * Test Deal Search Performance
 * Tests query performance with the new indexes
 */

const { Pool } = require('pg');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    console.error('Failed to load .env.local');
  }
}

async function main() {
  console.log('Testing deal search performance...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Test 1: Search by customer_name
    console.log('Test 1: Search by customer_name');
    console.log('Query: SELECT * FROM deal_calculations WHERE customer_name ILIKE \'%test%\' LIMIT 20');
    
    const start1 = Date.now();
    const result1 = await pool.query(`
      EXPLAIN ANALYZE
      SELECT * FROM deal_calculations 
      WHERE customer_name ILIKE '%test%' 
      LIMIT 20
    `);
    const time1 = Date.now() - start1;
    
    console.log('Execution time:', time1, 'ms');
    console.log('Query plan:');
    result1.rows.forEach(row => console.log('  ', row['QUERY PLAN']));
    
    // Test 2: Search by deal_name
    console.log('\n' + '='.repeat(80));
    console.log('\nTest 2: Search by deal_name');
    console.log('Query: SELECT * FROM deal_calculations WHERE deal_name ILIKE \'%deal%\' LIMIT 20');
    
    const start2 = Date.now();
    const result2 = await pool.query(`
      EXPLAIN ANALYZE
      SELECT * FROM deal_calculations 
      WHERE deal_name ILIKE '%deal%' 
      LIMIT 20
    `);
    const time2 = Date.now() - start2;
    
    console.log('Execution time:', time2, 'ms');
    console.log('Query plan:');
    result2.rows.forEach(row => console.log('  ', row['QUERY PLAN']));
    
    // Test 3: Filter by user_id and sort by created_at
    console.log('\n' + '='.repeat(80));
    console.log('\nTest 3: Filter by user_id and sort by created_at');
    console.log('Query: SELECT * FROM deal_calculations WHERE user_id = (SELECT id FROM users LIMIT 1) ORDER BY created_at DESC LIMIT 20');
    
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      const start3 = Date.now();
      const result3 = await pool.query(`
        EXPLAIN ANALYZE
        SELECT * FROM deal_calculations 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 20
      `, [userId]);
      const time3 = Date.now() - start3;
      
      console.log('Execution time:', time3, 'ms');
      console.log('Query plan:');
      result3.rows.forEach(row => console.log('  ', row['QUERY PLAN']));
    } else {
      console.log('No users found in database');
    }
    
    // Test 4: Combined search (customer_name OR deal_name OR username)
    console.log('\n' + '='.repeat(80));
    console.log('\nTest 4: Combined search across multiple fields');
    console.log('Query: SELECT * FROM deal_calculations WHERE customer_name ILIKE \'%search%\' OR deal_name ILIKE \'%search%\' OR username ILIKE \'%search%\' LIMIT 20');
    
    const start4 = Date.now();
    const result4 = await pool.query(`
      EXPLAIN ANALYZE
      SELECT * FROM deal_calculations 
      WHERE customer_name ILIKE '%search%' 
         OR deal_name ILIKE '%search%' 
         OR username ILIKE '%search%'
      LIMIT 20
    `);
    const time4 = Date.now() - start4;
    
    console.log('Execution time:', time4, 'ms');
    console.log('Query plan:');
    result4.rows.forEach(row => console.log('  ', row['QUERY PLAN']));
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✓ Performance tests completed!');
    console.log('\nNote: For optimal performance with ILIKE searches, consider adding');
    console.log('pg_trgm extension and GIN indexes for full-text search capabilities.');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

main();
