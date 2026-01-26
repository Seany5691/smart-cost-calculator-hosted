/**
 * Supabase Data Export Script
 * 
 * This script exports all data from Supabase tables to JSON files
 * for migration to PostgreSQL.
 * 
 * Usage: node scripts/supabase-export.js
 * 
 * Environment variables required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_KEY: Your Supabase service role key (not anon key!)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EXPORT_DIR = path.join(__dirname, '../migration-data');

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  console.error('Example: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node scripts/supabase-export.js');
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Tables to export in dependency order (parents before children)
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

/**
 * Calculate MD5 checksum for data integrity verification
 */
function calculateChecksum(data) {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('md5').update(jsonString).digest('hex');
}

/**
 * Export data from a single table
 */
async function exportTable(tableName) {
  console.log(`📥 Exporting ${tableName}...`);
  
  try {
    // Fetch all data from table (paginated for large tables)
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch ${tableName}: ${error.message}`);
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Calculate checksum
    const checksum = calculateChecksum(allData);

    // Save to file
    const exportData = {
      table: tableName,
      rowCount: allData.length,
      checksum: checksum,
      exportedAt: new Date().toISOString(),
      data: allData
    };

    const filePath = path.join(EXPORT_DIR, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

    console.log(`✅ Exported ${allData.length} rows from ${tableName} (checksum: ${checksum})`);
    
    return {
      table: tableName,
      rowCount: allData.length,
      checksum: checksum,
      success: true
    };
  } catch (error) {
    console.error(`❌ Error exporting ${tableName}:`, error.message);
    return {
      table: tableName,
      rowCount: 0,
      checksum: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Main export function
 */
async function exportAllTables() {
  console.log('🚀 Starting Supabase data export...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📁 Export directory: ${EXPORT_DIR}\n`);

  // Create export directory if it doesn't exist
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  // Export all tables
  const results = [];
  for (const table of TABLES) {
    const result = await exportTable(table);
    results.push(result);
  }

  // Generate summary report
  const summary = {
    exportedAt: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    totalTables: TABLES.length,
    successfulTables: results.filter(r => r.success).length,
    failedTables: results.filter(r => !r.success).length,
    totalRows: results.reduce((sum, r) => sum + r.rowCount, 0),
    tables: results
  };

  // Save summary
  const summaryPath = path.join(EXPORT_DIR, 'export-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 EXPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tables: ${summary.totalTables}`);
  console.log(`Successful: ${summary.successfulTables}`);
  console.log(`Failed: ${summary.failedTables}`);
  console.log(`Total rows: ${summary.totalRows}`);
  console.log(`Export directory: ${EXPORT_DIR}`);
  console.log('='.repeat(60) + '\n');

  if (summary.failedTables > 0) {
    console.error('⚠️  Some tables failed to export. Check the logs above.');
    process.exit(1);
  } else {
    console.log('✅ All tables exported successfully!');
    console.log('\n📝 Next step: Run "node scripts/supabase-import.js" to import into PostgreSQL');
  }
}

// Run export
exportAllTables().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
