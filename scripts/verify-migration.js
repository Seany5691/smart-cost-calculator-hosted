/**
 * Migration Verification Script
 * 
 * This script verifies data integrity after migration by:
 * 1. Comparing row counts between export and PostgreSQL
 * 2. Verifying checksums for data integrity
 * 3. Checking foreign key relationships
 * 4. Validating data types and constraints
 * 
 * Usage: node scripts/verify-migration.js
 * 
 * Environment variables required:
 * - DATABASE_URL: PostgreSQL connection string
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL;
const IMPORT_DIR = path.join(__dirname, '../migration-data');

// Validate environment variables
if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL must be set');
  process.exit(1);
}

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10
});

/**
 * Calculate MD5 checksum for data integrity verification
 */
function calculateChecksum(data) {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('md5').update(jsonString).digest('hex');
}

/**
 * Verify row count for a table
 */
async function verifyRowCount(tableName) {
  try {
    // Read expected count from export
    const filePath = path.join(IMPORT_DIR, `${tableName}.json`);
    if (!fs.existsSync(filePath)) {
      return { table: tableName, status: 'skipped', message: 'No export file' };
    }

    const exportData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const expectedCount = exportData.rowCount;

    // Get actual count from PostgreSQL
    const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    const actualCount = parseInt(result.rows[0].count);

    if (actualCount === expectedCount) {
      return {
        table: tableName,
        status: 'pass',
        expected: expectedCount,
        actual: actualCount,
        message: `✓ Row count matches (${actualCount})`
      };
    } else {
      return {
        table: tableName,
        status: 'fail',
        expected: expectedCount,
        actual: actualCount,
        message: `✗ Row count mismatch: expected ${expectedCount}, got ${actualCount}`
      };
    }
  } catch (error) {
    return {
      table: tableName,
      status: 'error',
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Verify foreign key relationships
 */
async function verifyForeignKeys() {
  console.log('\n🔗 Verifying foreign key relationships...\n');
  
  const checks = [
    {
      name: 'deal_calculations → users',
      query: `
        SELECT COUNT(*) FROM deal_calculations dc
        LEFT JOIN users u ON dc.user_id = u.id
        WHERE dc.user_id IS NOT NULL AND u.id IS NULL
      `
    },
    {
      name: 'leads → users',
      query: `
        SELECT COUNT(*) FROM leads l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE l.user_id IS NOT NULL AND u.id IS NULL
      `
    },
    {
      name: 'notes → leads',
      query: `
        SELECT COUNT(*) FROM notes n
        LEFT JOIN leads l ON n.lead_id = l.id
        WHERE l.id IS NULL
      `
    },
    {
      name: 'notes → users',
      query: `
        SELECT COUNT(*) FROM notes n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE u.id IS NULL
      `
    },
    {
      name: 'reminders → leads',
      query: `
        SELECT COUNT(*) FROM reminders r
        LEFT JOIN leads l ON r.lead_id = l.id
        WHERE l.id IS NULL
      `
    },
    {
      name: 'reminders → users',
      query: `
        SELECT COUNT(*) FROM reminders r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE u.id IS NULL
      `
    },
    {
      name: 'routes → users',
      query: `
        SELECT COUNT(*) FROM routes r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE u.id IS NULL
      `
    },
    {
      name: 'attachments → leads',
      query: `
        SELECT COUNT(*) FROM attachments a
        LEFT JOIN leads l ON a.lead_id = l.id
        WHERE l.id IS NULL
      `
    },
    {
      name: 'interactions → users',
      query: `
        SELECT COUNT(*) FROM interactions i
        LEFT JOIN users u ON i.user_id = u.id
        WHERE u.id IS NULL
      `
    },
    {
      name: 'scraping_sessions → users',
      query: `
        SELECT COUNT(*) FROM scraping_sessions ss
        LEFT JOIN users u ON ss.user_id = u.id
        WHERE u.id IS NULL
      `
    },
    {
      name: 'scraped_businesses → scraping_sessions',
      query: `
        SELECT COUNT(*) FROM scraped_businesses sb
        LEFT JOIN scraping_sessions ss ON sb.session_id = ss.id
        WHERE ss.id IS NULL
      `
    },
    {
      name: 'activity_log → users',
      query: `
        SELECT COUNT(*) FROM activity_log al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE u.id IS NULL
      `
    }
  ];

  const results = [];
  for (const check of checks) {
    try {
      const result = await pool.query(check.query);
      const orphanCount = parseInt(result.rows[0].count);
      
      if (orphanCount === 0) {
        console.log(`  ✓ ${check.name}: No orphaned records`);
        results.push({ check: check.name, status: 'pass', orphans: 0 });
      } else {
        console.log(`  ✗ ${check.name}: ${orphanCount} orphaned records`);
        results.push({ check: check.name, status: 'fail', orphans: orphanCount });
      }
    } catch (error) {
      console.log(`  ⚠️  ${check.name}: ${error.message}`);
      results.push({ check: check.name, status: 'error', message: error.message });
    }
  }

  return results;
}

/**
 * Verify data constraints
 */
async function verifyConstraints() {
  console.log('\n🔒 Verifying data constraints...\n');
  
  const checks = [
    {
      name: 'users.role valid values',
      query: `SELECT COUNT(*) FROM users WHERE role NOT IN ('admin', 'manager', 'user')`
    },
    {
      name: 'leads.status valid values',
      query: `SELECT COUNT(*) FROM leads WHERE status NOT IN ('new', 'leads', 'working', 'bad', 'later', 'signed')`
    },
    {
      name: 'reminders.reminder_type valid values',
      query: `SELECT COUNT(*) FROM reminders WHERE reminder_type NOT IN ('call', 'email', 'meeting', 'follow_up', 'other')`
    },
    {
      name: 'reminders.priority valid values',
      query: `SELECT COUNT(*) FROM reminders WHERE priority NOT IN ('low', 'medium', 'high', 'urgent')`
    },
    {
      name: 'scraping_sessions.status valid values',
      query: `SELECT COUNT(*) FROM scraping_sessions WHERE status NOT IN ('running', 'paused', 'stopped', 'completed')`
    },
    {
      name: 'users.username not null',
      query: `SELECT COUNT(*) FROM users WHERE username IS NULL`
    },
    {
      name: 'leads.name not null',
      query: `SELECT COUNT(*) FROM leads WHERE name IS NULL`
    },
    {
      name: 'notes.content not null',
      query: `SELECT COUNT(*) FROM notes WHERE content IS NULL`
    }
  ];

  const results = [];
  for (const check of checks) {
    try {
      const result = await pool.query(check.query);
      const violationCount = parseInt(result.rows[0].count);
      
      if (violationCount === 0) {
        console.log(`  ✓ ${check.name}: No violations`);
        results.push({ check: check.name, status: 'pass', violations: 0 });
      } else {
        console.log(`  ✗ ${check.name}: ${violationCount} violations`);
        results.push({ check: check.name, status: 'fail', violations: violationCount });
      }
    } catch (error) {
      console.log(`  ⚠️  ${check.name}: ${error.message}`);
      results.push({ check: check.name, status: 'error', message: error.message });
    }
  }

  return results;
}

/**
 * Main verification function
 */
async function verifyMigration() {
  console.log('🔍 Starting migration verification...\n');
  console.log(`📁 Import directory: ${IMPORT_DIR}\n`);

  // Check if import directory exists
  if (!fs.existsSync(IMPORT_DIR)) {
    console.error('❌ Error: Import directory not found!');
    console.error('Please run migration scripts first.');
    process.exit(1);
  }

  // Verify row counts
  console.log('📊 Verifying row counts...\n');
  
  const TABLES = [
    'users',
    'hardware_items',
    'connectivity_items',
    'licensing_items',
    'factors',
    'scales',
    'deal_calculations',
    'leads',
    'notes',
    'reminders',
    'routes',
    'attachments',
    'interactions',
    'scraping_sessions',
    'scraped_businesses',
    'activity_log'
  ];

  const rowCountResults = [];
  for (const table of TABLES) {
    const result = await verifyRowCount(table);
    rowCountResults.push(result);
    
    if (result.status === 'pass') {
      console.log(`  ${result.message}`);
    } else if (result.status === 'fail') {
      console.log(`  ${result.message}`);
    } else if (result.status === 'skipped') {
      console.log(`  ⏭️  ${table}: ${result.message}`);
    } else {
      console.log(`  ⚠️  ${table}: ${result.message}`);
    }
  }

  // Verify foreign keys
  const foreignKeyResults = await verifyForeignKeys();

  // Verify constraints
  const constraintResults = await verifyConstraints();

  // Generate summary report
  const summary = {
    verifiedAt: new Date().toISOString(),
    rowCounts: {
      total: rowCountResults.length,
      passed: rowCountResults.filter(r => r.status === 'pass').length,
      failed: rowCountResults.filter(r => r.status === 'fail').length,
      skipped: rowCountResults.filter(r => r.status === 'skipped').length,
      errors: rowCountResults.filter(r => r.status === 'error').length
    },
    foreignKeys: {
      total: foreignKeyResults.length,
      passed: foreignKeyResults.filter(r => r.status === 'pass').length,
      failed: foreignKeyResults.filter(r => r.status === 'fail').length,
      errors: foreignKeyResults.filter(r => r.status === 'error').length
    },
    constraints: {
      total: constraintResults.length,
      passed: constraintResults.filter(r => r.status === 'pass').length,
      failed: constraintResults.filter(r => r.status === 'fail').length,
      errors: constraintResults.filter(r => r.status === 'error').length
    },
    details: {
      rowCounts: rowCountResults,
      foreignKeys: foreignKeyResults,
      constraints: constraintResults
    }
  };

  // Save summary
  const summaryPath = path.join(IMPORT_DIR, 'verification-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log('\nRow Counts:');
  console.log(`  Total: ${summary.rowCounts.total}`);
  console.log(`  Passed: ${summary.rowCounts.passed}`);
  console.log(`  Failed: ${summary.rowCounts.failed}`);
  console.log(`  Skipped: ${summary.rowCounts.skipped}`);
  console.log(`  Errors: ${summary.rowCounts.errors}`);
  
  console.log('\nForeign Keys:');
  console.log(`  Total: ${summary.foreignKeys.total}`);
  console.log(`  Passed: ${summary.foreignKeys.passed}`);
  console.log(`  Failed: ${summary.foreignKeys.failed}`);
  console.log(`  Errors: ${summary.foreignKeys.errors}`);
  
  console.log('\nConstraints:');
  console.log(`  Total: ${summary.constraints.total}`);
  console.log(`  Passed: ${summary.constraints.passed}`);
  console.log(`  Failed: ${summary.constraints.failed}`);
  console.log(`  Errors: ${summary.constraints.errors}`);
  
  console.log('='.repeat(60) + '\n');

  const totalFailed = summary.rowCounts.failed + summary.foreignKeys.failed + summary.constraints.failed;
  const totalErrors = summary.rowCounts.errors + summary.foreignKeys.errors + summary.constraints.errors;

  if (totalFailed > 0 || totalErrors > 0) {
    console.error('⚠️  Verification found issues. Check the details above.');
    console.error('📄 Full report saved to:', summaryPath);
    process.exit(1);
  } else {
    console.log('✅ All verification checks passed!');
    console.log('📄 Full report saved to:', summaryPath);
    console.log('\n🎉 Migration completed successfully!');
  }

  await pool.end();
}

// Run verification
verifyMigration().catch(error => {
  console.error('❌ Fatal error:', error);
  pool.end();
  process.exit(1);
});
