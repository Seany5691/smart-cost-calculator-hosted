/**
 * PostgreSQL Data Import Script
 * 
 * This script imports data from Supabase export files into PostgreSQL,
 * handling field name transformations (camelCase → snake_case) and
 * maintaining foreign key relationships.
 * 
 * Usage: node scripts/supabase-import.js
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
const BACKUP_DIR = path.join(__dirname, '../migration-backup');

// Validate environment variables
if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL must be set');
  console.error('Example: DATABASE_URL=postgresql://user:pass@localhost:5432/dbname node scripts/supabase-import.js');
  process.exit(1);
}

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10
});

/**
 * Field name mapping: Supabase (camelCase) → PostgreSQL (snake_case)
 */
const FIELD_MAPPINGS = {
  users: {
    isActive: 'is_active',
    requiresPasswordChange: 'requires_password_change',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  hardware_items: {
    managerCost: 'manager_cost',
    userCost: 'user_cost',
    isExtension: 'is_extension',
    isActive: 'is_active',
    displayOrder: 'display_order',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  connectivity_items: {
    managerCost: 'manager_cost',
    userCost: 'user_cost',
    isActive: 'is_active',
    displayOrder: 'display_order',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  licensing_items: {
    managerCost: 'manager_cost',
    userCost: 'user_cost',
    isActive: 'is_active',
    displayOrder: 'display_order',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  factors: {
    factors_data: 'factors_data',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  scales: {
    scales_data: 'scales_data',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  deal_calculations: {
    userId: 'user_id',
    userRole: 'user_role',
    dealName: 'deal_name',
    customerName: 'customer_name',
    dealDetails: 'deal_details',
    sectionsData: 'sections_data',
    totalsData: 'totals_data',
    factorsData: 'factors_data',
    scalesData: 'scales_data',
    pdfUrl: 'pdf_url',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  leads: {
    mapsAddress: 'maps_address',
    contactPerson: 'contact_person',
    typeOfBusiness: 'type_of_business',
    dateToCallBack: 'date_to_call_back',
    dateSigned: 'date_signed',
    backgroundColor: 'background_color',
    listName: 'list_name',
    userId: 'user_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  notes: {
    leadId: 'lead_id',
    userId: 'user_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  reminders: {
    leadId: 'lead_id',
    userId: 'user_id',
    reminderType: 'reminder_type',
    dueDate: 'due_date',
    recurrencePattern: 'recurrence_pattern',
    completedAt: 'completed_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  routes: {
    userId: 'user_id',
    routeUrl: 'route_url',
    stopCount: 'stop_count',
    leadIds: 'lead_ids',
    startingPoint: 'starting_point',
    createdAt: 'created_at'
  },
  attachments: {
    leadId: 'lead_id',
    fileName: 'file_name',
    fileType: 'file_type',
    fileSize: 'file_size',
    storagePath: 'storage_path',
    uploadedBy: 'uploaded_by',
    createdAt: 'created_at'
  },
  interactions: {
    leadId: 'lead_id',
    userId: 'user_id',
    interactionType: 'interaction_type',
    oldValue: 'old_value',
    newValue: 'new_value',
    createdAt: 'created_at'
  },
  scraping_sessions: {
    userId: 'user_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  scraped_businesses: {
    sessionId: 'session_id',
    mapsAddress: 'maps_address',
    typeOfBusiness: 'type_of_business',
    createdAt: 'created_at'
  },
  activity_log: {
    userId: 'user_id',
    activityType: 'activity_type',
    entityType: 'entity_type',
    entityId: 'entity_id',
    createdAt: 'created_at'
  }
};

/**
 * Transform field names from camelCase to snake_case
 */
function transformRow(tableName, row) {
  const mapping = FIELD_MAPPINGS[tableName] || {};
  const transformed = {};

  for (const [key, value] of Object.entries(row)) {
    const newKey = mapping[key] || key;
    transformed[newKey] = value;
  }

  return transformed;
}

/**
 * Calculate MD5 checksum for data integrity verification
 */
function calculateChecksum(data) {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('md5').update(jsonString).digest('hex');
}

/**
 * Create backup of existing data before import
 */
async function createBackup(tableName) {
  try {
    const result = await pool.query(`SELECT * FROM ${tableName}`);
    
    if (result.rows.length > 0) {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      const backupData = {
        table: tableName,
        rowCount: result.rows.length,
        backedUpAt: new Date().toISOString(),
        data: result.rows
      };

      const backupPath = path.join(BACKUP_DIR, `${tableName}_backup.json`);
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      
      console.log(`  💾 Backed up ${result.rows.length} existing rows`);
      return true;
    }
    
    return true;
  } catch (error) {
    console.error(`  ⚠️  Backup failed: ${error.message}`);
    return false;
  }
}

/**
 * Import data into a single table
 */
async function importTable(tableName) {
  console.log(`\n📤 Importing ${tableName}...`);
  
  try {
    // Read export file
    const filePath = path.join(IMPORT_DIR, `${tableName}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭️  No export file found, skipping`);
      return { table: tableName, rowCount: 0, success: true, skipped: true };
    }

    const exportData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { data, rowCount, checksum } = exportData;

    if (!data || data.length === 0) {
      console.log(`  ⏭️  No data to import`);
      return { table: tableName, rowCount: 0, success: true, skipped: true };
    }

    // Verify checksum
    const calculatedChecksum = calculateChecksum(data);
    if (calculatedChecksum !== checksum) {
      throw new Error(`Checksum mismatch! Expected ${checksum}, got ${calculatedChecksum}`);
    }
    console.log(`  ✓ Checksum verified`);

    // Create backup
    await createBackup(tableName);

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear existing data (if any)
      await client.query(`DELETE FROM ${tableName}`);

      // Transform and insert data
      let insertedCount = 0;
      for (const row of data) {
        const transformedRow = transformRow(tableName, row);
        const columns = Object.keys(transformedRow);
        const values = Object.values(transformedRow);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const query = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
        `;

        await client.query(query, values);
        insertedCount++;
      }

      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`  ✅ Imported ${insertedCount} rows`);
      
      return {
        table: tableName,
        rowCount: insertedCount,
        checksum: checksum,
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
 * Verify imported data integrity
 */
async function verifyImport(tableName, expectedChecksum) {
  try {
    const result = await pool.query(`SELECT * FROM ${tableName}`);
    const actualChecksum = calculateChecksum(result.rows);
    
    if (actualChecksum === expectedChecksum) {
      console.log(`  ✓ Verification passed`);
      return true;
    } else {
      console.error(`  ✗ Verification failed: checksum mismatch`);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ Verification error: ${error.message}`);
    return false;
  }
}

/**
 * Main import function
 */
async function importAllTables() {
  console.log('🚀 Starting PostgreSQL data import...\n');
  console.log(`📁 Import directory: ${IMPORT_DIR}`);
  console.log(`💾 Backup directory: ${BACKUP_DIR}\n`);

  // Check if export directory exists
  if (!fs.existsSync(IMPORT_DIR)) {
    console.error('❌ Error: Export directory not found!');
    console.error('Please run "node scripts/supabase-export.js" first.');
    process.exit(1);
  }

  // Read export summary
  const summaryPath = path.join(IMPORT_DIR, 'export-summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error('❌ Error: Export summary not found!');
    console.error('Please run "node scripts/supabase-export.js" first.');
    process.exit(1);
  }

  const exportSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  console.log(`📊 Export summary: ${exportSummary.totalRows} rows from ${exportSummary.totalTables} tables\n`);

  // Import tables in dependency order
  const IMPORT_ORDER = [
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

  const results = [];
  for (const table of IMPORT_ORDER) {
    const result = await importTable(table);
    results.push(result);
  }

  // Generate summary report
  const summary = {
    importedAt: new Date().toISOString(),
    totalTables: IMPORT_ORDER.length,
    successfulTables: results.filter(r => r.success && !r.skipped).length,
    skippedTables: results.filter(r => r.skipped).length,
    failedTables: results.filter(r => !r.success).length,
    totalRows: results.reduce((sum, r) => sum + r.rowCount, 0),
    tables: results
  };

  // Save summary
  const importSummaryPath = path.join(IMPORT_DIR, 'import-summary.json');
  fs.writeFileSync(importSummaryPath, JSON.stringify(summary, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total tables: ${summary.totalTables}`);
  console.log(`Successful: ${summary.successfulTables}`);
  console.log(`Skipped: ${summary.skippedTables}`);
  console.log(`Failed: ${summary.failedTables}`);
  console.log(`Total rows: ${summary.totalRows}`);
  console.log('='.repeat(60) + '\n');

  if (summary.failedTables > 0) {
    console.error('⚠️  Some tables failed to import. Check the logs above.');
    console.error('💾 Backups are available in:', BACKUP_DIR);
    console.error('🔄 Run "node scripts/supabase-rollback.js" to restore from backup.');
    process.exit(1);
  } else {
    console.log('✅ All tables imported successfully!');
    console.log('\n📝 Next step: Verify your application works with the migrated data');
  }

  await pool.end();
}

// Run import
importAllTables().catch(error => {
  console.error('❌ Fatal error:', error);
  pool.end();
  process.exit(1);
});
