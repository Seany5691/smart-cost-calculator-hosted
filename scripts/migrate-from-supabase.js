#!/usr/bin/env node

/**
 * Supabase to PostgreSQL Migration Script
 * This script exports data from Supabase and imports it into PostgreSQL
 */

import { createClient } from '@supabase/supabase-js';
import pool from '../src/lib/postgresql-connection.js';

// Configuration - Update these with your Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Migration configuration
const MIGRATION_CONFIG = {
  tables: [
    {
      name: 'leads',
      supabaseTable: 'leads',
      postgresTable: 'leads',
      transform: (row) => ({
        id: row.id,
        user_id: row.user_id,
        username: row.username || null,
        user_role: row.user_role || null,
        customer_name: row.customer_name || null,
        deal_name: row.deal_name || null,
        status: row.status || 'new',
        phone: row.phone || null,
        provider: row.provider || null,
        address: row.address || null,
        type_of_business: row.type_of_business || null,
        town: row.town || null,
        notes: row.notes || null,
        date_to_call_back: row.date_to_call_back || null,
        coordinates: row.coordinates ? JSON.stringify(row.coordinates) : null,
        background_color: row.background_color || null,
        list_name: row.list_name || null,
        import_session_id: row.import_session_id || null,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString()
      })
    },
    {
      name: 'routes',
      supabaseTable: 'routes',
      postgresTable: 'routes',
      transform: (row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        route_url: row.route_url || null,
        stop_count: row.stop_count || 0,
        lead_ids: row.lead_ids ? JSON.stringify(row.lead_ids) : null,
        starting_point: row.starting_point ? JSON.stringify(row.starting_point) : null,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString()
      })
    },
    {
      name: 'scraped_businesses',
      supabaseTable: 'scraped_businesses',
      postgresTable: 'scraped_businesses',
      transform: (row) => ({
        id: row.id,
        session_id: row.session_id,
        maps_address: row.maps_address,
        name: row.name || null,
        phone: row.phone || null,
        provider: row.provider || null,
        address: row.address || null,
        type_of_business: row.type_of_business || null,
        town: row.town || null,
        notes: row.notes || null,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString()
      })
    },
    {
      name: 'scraping_sessions',
      supabaseTable: 'scraping_sessions',
      postgresTable: 'scraping_sessions',
      transform: (row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name || null,
        status: row.status || 'pending',
        progress: row.progress ? JSON.stringify(row.progress) : '{}',
        summary: row.summary ? JSON.stringify(row.summary) : '{}',
        config: row.config ? JSON.stringify(row.config) : '{}',
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString()
      })
    },
    {
      name: 'activity_logs',
      supabaseTable: 'activity_logs',
      postgresTable: 'activity_logs',
      transform: (row) => ({
        id: row.id,
        user_id: row.user_id,
        username: row.username || null,
        user_role: row.user_role || null,
        activity_type: row.activity_type,
        deal_id: row.deal_id || null,
        deal_name: row.deal_name || null,
        timestamp: row.timestamp || new Date().toISOString(),
        metadata: row.metadata ? JSON.stringify(row.metadata) : '{}'
      })
    }
  ]
};

// Migration functions
async function exportFromSupabase(tableName) {
  console.log(`📤 Exporting data from Supabase table: ${tableName}`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Error exporting from Supabase ${tableName}:`, error);
      return [];
    }
    
    console.log(`✅ Exported ${data.length} records from ${tableName}`);
    return data;
  } catch (error) {
    console.error(`❌ Error exporting from Supabase ${tableName}:`, error);
    return [];
  }
}

async function importToPostgreSQL(tableName, records, transformFunction) {
  console.log(`📥 Importing ${records.length} records to PostgreSQL table: ${tableName}`);
  
  if (records.length === 0) {
    console.log(`⚠️  No records to import for ${tableName}`);
    return;
  }
  
  const client = await pool.connect();
  
  try {
    // Clear existing data (optional - comment out if you want to preserve existing data)
    console.log(`🗑️  Clearing existing data from ${tableName}`);
    await client.query(`DELETE FROM ${tableName}`);
    
    // Prepare insert query
    const firstRecord = transformFunction(records[0]);
    const columns = Object.keys(firstRecord);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET
        ${columns.filter(col => col !== 'id' && col !== 'created_at').map(col => `${col} = EXCLUDED.${col}`).join(', ')}
    `;
    
    // Insert records in batches
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        const transformed = transformFunction(record);
        const values = Object.values(transformed);
        
        try {
          await client.query(query, values);
          importedCount++;
        } catch (error) {
          console.error(`❌ Error importing record to ${tableName}:`, error);
          console.error('Record:', transformed);
        }
      }
      
      console.log(`📊 Processed ${Math.min(i + batchSize, records.length)} / ${records.length} records`);
    }
    
    console.log(`✅ Successfully imported ${importedCount} records to ${tableName}`);
  } catch (error) {
    console.error(`❌ Error importing to PostgreSQL ${tableName}:`, error);
  } finally {
    client.release();
  }
}

async function migrateTable(tableConfig) {
  console.log(`\n🔄 Starting migration for ${tableConfig.name}`);
  
  // Export from Supabase
  const supabaseData = await exportFromSupabase(tableConfig.supabaseTable);
  
  if (supabaseData.length === 0) {
    console.log(`⚠️  No data found in Supabase table ${tableConfig.supabaseTable}`);
    return;
  }
  
  // Import to PostgreSQL
  await importToPostgreSQL(tableConfig.postgresTable, supabaseData, tableConfig.transform);
  
  console.log(`✅ Migration completed for ${tableConfig.name}`);
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting Supabase to PostgreSQL migration');
  console.log('=====================================');
  
  try {
    // Test PostgreSQL connection
    console.log('🔍 Testing PostgreSQL connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connection successful');
    
    // Test Supabase connection
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.from('leads').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      console.log('Please check your SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
      return;
    }
    console.log('✅ Supabase connection successful');
    
    // Migrate each table
    for (const tableConfig of MIGRATION_CONFIG.tables) {
      await migrateTable(tableConfig);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('=====================================');
    
    // Show summary
    for (const tableConfig of MIGRATION_CONFIG.tables) {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableConfig.postgresTable}`);
      const count = result.rows[0].count;
      console.log(`📊 ${tableConfig.postgresTable}: ${count} records`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close PostgreSQL connection
    await pool.end();
  }
}

// Export data to JSON file (backup option)
async function exportToJSON() {
  console.log('📤 Exporting all Supabase data to JSON files...');
  
  for (const tableConfig of MIGRATION_CONFIG.tables) {
    const data = await exportFromSupabase(tableConfig.supabaseTable);
    
    if (data.length > 0) {
      const fs = await import('fs/promises');
      await fs.writeFile(`./backup/${tableConfig.name}_export.json`, JSON.stringify(data, null, 2));
      console.log(`💾 Exported ${data.length} records to ${tableConfig.name}_export.json`);
    }
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'export') {
  exportToJSON();
} else if (command === 'migrate') {
  runMigration();
} else {
  console.log('Usage:');
  console.log('  node migrate-from-supabase.js export  - Export data to JSON files');
  console.log('  node migrate-from-supabase.js migrate - Migrate data to PostgreSQL');
  console.log('');
  console.log('Environment variables needed:');
  console.log('  SUPABASE_URL=your-supabase-url');
  console.log('  SUPABASE_ANON_KEY=your-supabase-anon-key');
  console.log('  POSTGRES_HOST=localhost');
  console.log('  POSTGRES_PORT=5432');
  console.log('  POSTGRES_DATABASE=smartcost_vps');
  console.log('  POSTGRES_USER=smartcost_user');
  console.log('  POSTGRES_PASSWORD=your_password');
}
