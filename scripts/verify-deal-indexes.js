#!/usr/bin/env node

/**
 * Verify Deal Indexes Script
 * Checks that all required indexes exist on deal_calculations table
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
  console.log('Verifying indexes on deal_calculations table...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query(`
      SELECT 
        indexname, 
        indexdef 
      FROM pg_indexes 
      WHERE tablename = 'deal_calculations' 
      ORDER BY indexname
    `);
    
    console.log('Found indexes:');
    console.log('='.repeat(80));
    
    result.rows.forEach(row => {
      console.log(`\n${row.indexname}:`);
      console.log(`  ${row.indexdef}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal indexes: ${result.rows.length}`);
    
    // Check for required indexes
    const indexNames = result.rows.map(row => row.indexname);
    const requiredIndexes = [
      'idx_deals_user_id',
      'idx_deals_created_at',
      'idx_deals_customer_name',
      'idx_deals_deal_name',
      'idx_deals_username',
      'idx_deals_user_created'
    ];
    
    console.log('\nRequired indexes check:');
    let allPresent = true;
    requiredIndexes.forEach(idx => {
      const present = indexNames.includes(idx);
      console.log(`  ${present ? '✓' : '✗'} ${idx}`);
      if (!present) allPresent = false;
    });
    
    if (allPresent) {
      console.log('\n✓ All required indexes are present!');
    } else {
      console.log('\n✗ Some required indexes are missing!');
    }
    
    await pool.end();
    process.exit(allPresent ? 0 : 1);
  } catch (error) {
    console.error('\n✗ Verification failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

main();
