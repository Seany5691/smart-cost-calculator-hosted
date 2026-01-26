/**
 * PostgreSQL Rollback Script
 * 
 * This script restores data from backup files created during import.
 * Use this if the import fails or if you need to revert changes.
 * 
 * Usage: node scripts/supabase-rollback.js
 * 
 * Environment variables required:
 * - DATABASE_URL: PostgreSQL connection string
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = path.join(__dirname, '../migration-backup');

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
 * Restore data from backup for a single table
 */
async function restoreTable(tableName) {
  console.log(`\n🔄 Restoring ${tableName}...`);
  
  try {
    // Read backup file
    const backupPath = path.join(BACKUP_DIR, `${tableName}_backup.json`);
    if (!fs.existsSync(backupPath)) {
      console.log(`  ⏭️  No backup found, skipping`);
      return { table: tableName, rowCount: 0, success: true, skipped: true };
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const { data, rowCount } = backupData;

    if (!data || data.length === 0) {
      console.log(`  ⏭️  No data to restore`);
      return { table: tableName, rowCount: 0, success: true, skipped: true };
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear current data
      await client.query(`DELETE FROM ${tableName}`);

      // Restore backup data
      let restoredCount = 0;
      for (const row of data) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const query = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
        `;

        await client.query(query, values);
        restoredCount++;
      }

      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`  ✅ Restored ${restoredCount} rows`);
      
      return {
        table: tableName,
        rowCount: restoredCount,
        success: true
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return {
      table: tableName,
      rowCount: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Main rollback function
 */
async function rollbackAllTables() {
  console.log('🔄 Starting PostgreSQL rollback...\n');
  console.log(`💾 Backup directory: ${BACKUP_DIR}\n`);

  // Check if backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error('❌ Error: Backup directory not found!');
    console.error('No backups available to restore.');
    process.exit(1);
  }

  // Get list of backup files
  const backupFiles = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('_backup.json'))
    .map(f => f.replace('_backup.json', ''));

  if (backupFiles.length === 0) {
    console.error('❌ Error: No backup files found!');
    process.exit(1);
  }

  console.log(`📋 Found ${backupFiles.length} backup files\n`);

  // Restore tables in reverse dependency order
  const RESTORE_ORDER = [
    'activity_log',
    'scraped_businesses',
    'scraping_sessions',
    'interactions',
    'attachments',
    'routes',
    'reminders',
    'notes',
    'leads',
    'deal_calculations',
    'scales',
    'factors',
    'licensing_items',
    'connectivity_items',
    'hardware_items',
    'users'
  ];

  const results = [];
  for (const table of RESTORE_ORDER) {
    if (backupFiles.includes(table)) {
      const result = await restoreTable(table);
      results.push(result);
    }
  }

  // Generate summary report
  const summary = {
    restoredAt: new Date().toISOString(),
    totalTables: results.length,
    successfulTables: results.filter(r => r.success && !r.skipped).length,
    skippedTables: results.filter(r => r.skipped).length,
    failedTables: results.filter(r => !r.success).length,
    totalRows: results.reduce((sum, r) => sum + r.rowCount, 0),
    tables: results
  };

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ROLLBACK SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tables: ${summary.totalTables}`);
  console.log(`Successful: ${summary.successfulTables}`);
  console.log(`Skipped: ${summary.skippedTables}`);
  console.log(`Failed: ${summary.failedTables}`);
  console.log(`Total rows: ${summary.totalRows}`);
  console.log('='.repeat(60) + '\n');

  if (summary.failedTables > 0) {
    console.error('⚠️  Some tables failed to restore. Check the logs above.');
    process.exit(1);
  } else {
    console.log('✅ All tables restored successfully!');
  }

  await pool.end();
}

// Run rollback
rollbackAllTables().catch(error => {
  console.error('❌ Fatal error:', error);
  pool.end();
  process.exit(1);
});
