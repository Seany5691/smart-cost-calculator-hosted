/**
 * Custom PostgreSQL Data Import Script
 * 
 * This script imports data from SupabaseData.txt into PostgreSQL,
 * handling field name transformations (camelCase → snake_case) and
 * table name mappings.
 * 
 * Usage: node scripts/import-from-text.js <path-to-SupabaseData.txt>
 * 
 * Environment variables required:
 * - DATABASE_URL: PostgreSQL connection string
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Configuration
const DATABASE_URL = process.env.DATABASE_URL;
const DATA_FILE = process.argv[2] || path.join(__dirname, '../../SupabaseData.txt');

// Validate environment variables
if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL must be set');
  console.error('Example: DATABASE_URL=postgresql://user:pass@localhost:5432/dbname node scripts/import-from-text.js');
  process.exit(1);
}

// Validate data file
if (!fs.existsSync(DATA_FILE)) {
  console.error(`❌ Error: Data file not found: ${DATA_FILE}`);
  process.exit(1);
}

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10
});

/**
 * Table name mapping: Supabase → PostgreSQL
 */
const TABLE_NAME_MAPPINGS = {
  'users': 'users',
  'hardware_items': 'hardware_items',
  'connectivity_items': 'connectivity_items',
  'licensing_items': 'licensing_items',
  'factors': 'factors',
  'scales': 'scales',
  'deal_calculations': 'deal_calculations',
  'leads': 'leads',
  'lead_notes': 'notes',
  'lead_reminders': 'reminders',
  'lead_interactions': 'interactions',
  'lead_attachments': 'attachments',
  'routes': 'routes',
  'activity_logs': 'activity_log',
  'scraper_sessions': 'scraping_sessions',
  'scraper_businesses': 'scraped_businesses',
  'scraper_logs': 'scraper_logs'
};

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
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  scales: {
    scales_data: 'scales_data',
    created_at: 'created_at',
    updated_at: 'updated_at'
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
    importSessionId: 'import_session_id',
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
    reminderDate: 'due_date',
    dueDate: 'due_date',
    note: 'description',
    description: 'description',
    title: 'title',
    priority: 'priority',
    recurrencePattern: 'recurrence_pattern',
    completedAt: 'completed_at',
    completed: 'completed',
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
    sessionid: 'id',
    userid: 'user_id',
    createdat: 'created_at',
    updatedat: 'updated_at',
    completedat: 'completed_at',
    errormessage: 'error_message'
  },
  scraped_businesses: {
    sessionid: 'session_id',
    mapsaddress: 'maps_address',
    typeofbusiness: 'type_of_business',
    createdat: 'created_at'
  },
  activity_log: {
    userId: 'user_id',
    userRole: 'user_role',
    activityType: 'activity_type',
    dealId: 'entity_id',
    dealName: 'entity_type',
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
    
    // Skip fields that don't exist in PostgreSQL schema
    if (tableName === 'hardware_items' && key === 'display_order') continue;
    if (tableName === 'connectivity_items' && key === 'display_order') continue;
    if (tableName === 'licensing_items' && key === 'display_order') continue;
    
    transformed[newKey] = value;
  }

  return transformed;
}

/**
 * Detect table name from JSON data structure
 */
function detectTableFromData(data) {
  if (!data || data.length === 0) return null;
  
  const firstRow = data[0];
  const fields = Object.keys(firstRow);
  
  // Check for unique field combinations to identify tables
  if (fields.includes('username') && fields.includes('password') && fields.includes('role')) {
    return 'users';
  }
  if (fields.includes('isExtension') && fields.includes('managerCost')) {
    return 'hardware_items';
  }
  if (fields.includes('managerCost') && !fields.includes('isExtension') && fields.includes('name') && fields.includes('cost')) {
    // Could be connectivity or licensing
    if (fields.includes('displayOrder')) {
      return 'connectivity_items'; // Assume connectivity for now
    }
  }
  if (fields.includes('factors_data')) {
    return 'factors';
  }
  if (fields.includes('scales_data')) {
    return 'scales';
  }
  if (fields.includes('dealName') && fields.includes('sectionsData')) {
    return 'deal_calculations';
  }
  if (fields.includes('mapsAddress') && fields.includes('status') && fields.includes('typeOfBusiness')) {
    return 'leads';
  }
  if (fields.includes('leadId') && fields.includes('content')) {
    return 'lead_notes';
  }
  if (fields.includes('leadId') && fields.includes('reminderDate')) {
    return 'lead_reminders';
  }
  if (fields.includes('leadId') && fields.includes('interactionType')) {
    return 'lead_interactions';
  }
  if (fields.includes('leadId') && fields.includes('fileName')) {
    return 'lead_attachments';
  }
  if (fields.includes('routeUrl') && fields.includes('stopCount')) {
    return 'routes';
  }
  if (fields.includes('activityType') && fields.includes('userId') && fields.includes('username')) {
    return 'activity_logs';
  }
  if (fields.includes('sessionid') && fields.includes('status') && fields.includes('towns')) {
    return 'scraper_sessions';
  }
  if (fields.includes('sessionid') && fields.includes('typeofbusiness')) {
    return 'scraper_businesses';
  }
  if (fields.includes('sessionid') && fields.includes('message') && fields.includes('level')) {
    return 'scraper_logs';
  }
  
  return null;
}

/**
 * Parse the SupabaseData.txt file and extract table data
 */
function parseDataFile(filePath) {
  console.log(`📖 Reading data file: ${filePath}\n`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const tables = {};
  
  // Split content into lines
  const lines = content.split('\n');
  
  let currentSection = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for section headers like "=== USERS DATA ==="
    const headerMatch = line.match(/===\s+([A-Z_]+)\s+DATA\s+===/);
    if (headerMatch) {
      currentSection = headerMatch[1].toLowerCase();
      console.log(`  Found section: ${currentSection}`);
      continue;
    }
    
    // Look for JSON data lines (start with | [ and contain JSON array)
    if (line.startsWith('| [')) {
      try {
        // Extract JSON from the table cell format: | [...] |
        const jsonMatch = line.match(/^\|\s*(\[.*\])\s*\|?$/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[1]);
          
          // Auto-detect table name from data structure
          const detectedTable = detectTableFromData(jsonData);
          
          if (detectedTable) {
            tables[detectedTable] = jsonData;
            console.log(`  ✓ Parsed ${jsonData.length} rows for ${detectedTable} (detected from data structure)`);
          } else {
            console.log(`  ⚠️  Could not detect table type for data with ${jsonData.length} rows`);
          }
        }
      } catch (error) {
        console.error(`  ✗ Error parsing JSON: ${error.message}`);
      }
    }
  }
  
  return tables;
}

/**
 * Import data into a single table
 */
async function importTable(supabaseTableName, data) {
  const pgTableName = TABLE_NAME_MAPPINGS[supabaseTableName] || supabaseTableName;
  
  console.log(`\n📤 Importing ${supabaseTableName} → ${pgTableName}...`);
  
  if (!data || data.length === 0) {
    console.log(`  ⏭️  No data to import`);
    return { table: pgTableName, rowCount: 0, success: true, skipped: true };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await client.query(`DELETE FROM ${pgTableName}`);

    // Transform and insert data
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const row of data) {
      try {
        const transformedRow = transformRow(pgTableName, row);
        const columns = Object.keys(transformedRow);
        const values = Object.values(transformedRow);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const query = `
          INSERT INTO ${pgTableName} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `;

        const result = await client.query(query, values);
        if (result.rowCount > 0) {
          insertedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`  ⚠️  Error inserting row: ${error.message}`);
        // Continue with next row
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`  ✅ Imported ${insertedCount} rows (${skippedCount} skipped due to conflicts)`);
    
    return {
      table: pgTableName,
      rowCount: insertedCount,
      skippedCount: skippedCount,
      success: true
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`  ❌ Error: ${error.message}`);
    return {
      table: pgTableName,
      rowCount: 0,
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

/**
 * Main import function
 */
async function importAllTables() {
  console.log('🚀 Starting PostgreSQL data import from SupabaseData.txt...\n');

  // Parse data file
  const tables = parseDataFile(DATA_FILE);
  
  console.log(`\n📊 Found ${Object.keys(tables).length} tables with data\n`);

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
    'lead_notes',
    'lead_reminders',
    'routes',
    'lead_attachments',
    'lead_interactions',
    'activity_logs',
    'scraper_sessions',
    'scraper_businesses',
    'scraper_logs'
  ];

  const results = [];
  for (const supabaseTableName of IMPORT_ORDER) {
    const data = tables[supabaseTableName];
    if (data) {
      const result = await importTable(supabaseTableName, data);
      results.push(result);
    } else {
      console.log(`\n⏭️  Skipping ${supabaseTableName} (no data found)`);
      results.push({
        table: supabaseTableName,
        rowCount: 0,
        success: true,
        skipped: true
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => !r.success);
  const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0);
  
  console.log(`Total tables processed: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total rows imported: ${totalRows}`);
  console.log('='.repeat(60) + '\n');

  if (failed.length > 0) {
    console.error('⚠️  Some tables failed to import:');
    failed.forEach(r => {
      console.error(`  - ${r.table}: ${r.error}`);
    });
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
