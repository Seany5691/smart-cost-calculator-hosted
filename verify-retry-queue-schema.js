/**
 * Verify scraper_retry_queue table schema
 * 
 * This script verifies that the scraper_retry_queue table exists
 * and has the correct schema for retry queue persistence.
 */

const { Pool } = require('pg');

async function verifySchema() {
  console.log('🔍 Verifying scraper_retry_queue table schema...\n');

  // Check for DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Create database pool
  let pool;
  
  try {
    // First attempt: no SSL (for local databases)
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: false
    });
    
    // Test connection
    await pool.query('SELECT NOW()');
  } catch (error) {
    // If no-SSL fails, try with SSL (for remote databases)
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test connection
    await pool.query('SELECT NOW()');
  }

  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scraper_retry_queue'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.error('❌ Table scraper_retry_queue does not exist!');
      console.error('   Run migrations: node run-scraper-migrations.js 018_scraper_retry_queue.sql');
      process.exit(1);
    }

    console.log('✅ Table scraper_retry_queue exists');

    // Check columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'scraper_retry_queue'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Table columns:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check indexes
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'scraper_retry_queue'
      ORDER BY indexname
    `);

    console.log('\n🔑 Table indexes:');
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    // Check constraints
    const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'scraper_retry_queue'::regclass
      ORDER BY conname
    `);

    console.log('\n🔒 Table constraints:');
    constraints.rows.forEach(con => {
      const type = {
        'p': 'PRIMARY KEY',
        'f': 'FOREIGN KEY',
        'c': 'CHECK',
        'u': 'UNIQUE'
      }[con.contype] || con.contype;
      console.log(`   - ${con.conname} (${type})`);
    });

    // Verify expected columns exist
    const expectedColumns = [
      'id',
      'session_id',
      'item_type',
      'item_data',
      'attempts',
      'next_retry_time',
      'created_at',
      'updated_at'
    ];

    const actualColumns = columns.rows.map(col => col.column_name);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));

    if (missingColumns.length > 0) {
      console.error('\n❌ Missing columns:', missingColumns.join(', '));
      process.exit(1);
    }

    console.log('\n✅ All expected columns present');

    // Verify expected indexes exist
    const expectedIndexes = [
      'scraper_retry_queue_pkey',
      'idx_scraper_retry_queue_session_id',
      'idx_scraper_retry_queue_next_retry_time',
      'idx_scraper_retry_queue_session_retry',
      'idx_scraper_retry_queue_item_type'
    ];

    const actualIndexes = indexes.rows.map(idx => idx.indexname);
    const missingIndexes = expectedIndexes.filter(idx => !actualIndexes.includes(idx));

    if (missingIndexes.length > 0) {
      console.warn('\n⚠️  Missing indexes:', missingIndexes.join(', '));
      console.warn('   Performance may be degraded');
    } else {
      console.log('✅ All expected indexes present');
    }

    console.log('\n✅ Schema verification complete!');
    console.log('\n📝 Summary:');
    console.log(`   - Table: scraper_retry_queue`);
    console.log(`   - Columns: ${columns.rows.length}`);
    console.log(`   - Indexes: ${indexes.rows.length}`);
    console.log(`   - Constraints: ${constraints.rows.length}`);

  } catch (error) {
    console.error('\n❌ Error verifying schema:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }

  process.exit(0);
}

verifySchema();
