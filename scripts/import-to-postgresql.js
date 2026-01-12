#!/usr/bin/env node

/**
 * PostgreSQL Data Import Script
 * This script imports JSON data into PostgreSQL
 */

import pool from '../src/lib/postgresql-connection.js';
import fs from 'fs/promises';
import path from 'path';

// Table configurations
const TABLE_CONFIGS = {
  'leads_export.json': {
    tableName: 'leads',
    columns: [
      'id', 'user_id', 'username', 'user_role', 'customer_name', 'deal_name',
      'status', 'phone', 'provider', 'address', 'type_of_business', 'town',
      'notes', 'date_to_call_back', 'coordinates', 'background_color',
      'list_name', 'import_session_id', 'created_at', 'updated_at'
    ]
  },
  'routes_export.json': {
    tableName: 'routes',
    columns: [
      'id', 'user_id', 'name', 'route_url', 'stop_count', 'lead_ids',
      'starting_point', 'created_at', 'updated_at'
    ]
  },
  'scraped_businesses_export.json': {
    tableName: 'scraped_businesses',
    columns: [
      'id', 'session_id', 'maps_address', 'name', 'phone', 'provider',
      'address', 'type_of_business', 'town', 'notes', 'created_at', 'updated_at'
    ]
  },
  'scraping_sessions_export.json': {
    tableName: 'scraping_sessions',
    columns: [
      'id', 'user_id', 'name', 'status', 'progress', 'summary',
      'config', 'created_at', 'updated_at'
    ]
  },
  'activity_logs_export.json': {
    tableName: 'activity_logs',
    columns: [
      'id', 'user_id', 'username', 'user_role', 'activity_type',
      'deal_id', 'deal_name', 'timestamp', 'metadata'
    ]
  }
};

async function importTable(filename, config) {
  console.log(`📥 Importing ${filename}...`);
  
  try {
    // Read JSON file
    const filePath = path.join('./backup', filename);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`⚠️  No data to import from ${filename}`);
      return;
    }
    
    console.log(`📊 Found ${data.length} records to import`);
    
    const client = await pool.connect();
    
    try {
      // Clear existing data (optional - comment out if you want to preserve)
      console.log(`🗑️  Clearing existing data from ${config.tableName}`);
      await client.query(`DELETE FROM ${config.tableName}`);
      
      // Prepare insert query
      const placeholders = config.columns.map((_, index) => `$${index + 1}`).join(', ');
      const columns = config.columns.join(', ');
      
      const query = `
        INSERT INTO ${config.tableName} (${columns})
        VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET
        ${config.columns.filter(col => col !== 'id' && col !== 'created_at').map(col => `${col} = EXCLUDED.${col}`).join(', ')}
      `;
      
      // Insert records in batches
      const batchSize = 100;
      let importedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        for (const record of batch) {
          try {
            // Prepare values
            const values = config.columns.map(col => {
              const value = record[col];
              
              // Handle JSON fields
              if (col === 'coordinates' || col === 'lead_ids' || col === 'starting_point' || 
                  col === 'progress' || col === 'summary' || col === 'config' || col === 'metadata') {
                return value ? JSON.stringify(value) : null;
              }
              
              // Handle dates
              if (col === 'date_to_call_back' || col === 'timestamp') {
                return value ? new Date(value).toISOString() : null;
              }
              
              return value || null;
            });
            
            await client.query(query, values);
            importedCount++;
            
          } catch (error) {
            console.error(`❌ Error importing record to ${config.tableName}:`, error.message);
            errorCount++;
          }
        }
        
        console.log(`📈 Progress: ${Math.min(i + batchSize, data.length)} / ${data.length} records processed`);
      }
      
      console.log(`✅ Import completed for ${config.tableName}`);
      console.log(`   Successfully imported: ${importedCount} records`);
      console.log(`   Errors: ${errorCount} records`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error(`❌ Error importing ${filename}:`, error);
  }
}

async function importAllData() {
  console.log('🚀 Starting PostgreSQL data import');
  console.log('==============================');
  
  try {
    // Test PostgreSQL connection
    console.log('🔍 Testing PostgreSQL connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connection successful');
    console.log('');
    
    // Check backup directory
    const backupDir = './backup';
    try {
      await fs.access(backupDir);
    } catch {
      console.log('❌ Backup directory not found. Please run the export script first.');
      console.log('   Run: node scripts/export-supabase-data.js');
      return;
    }
    
    // Get list of export files
    const files = await fs.readdir(backupDir);
    const exportFiles = files.filter(file => file.endsWith('_export.json'));
    
    if (exportFiles.length === 0) {
      console.log('❌ No export files found. Please run the export script first.');
      return;
    }
    
    console.log(`📁 Found ${exportFiles.length} export files`);
    console.log('');
    
    // Import each file
    for (const filename of exportFiles) {
      const config = TABLE_CONFIGS[filename];
      if (config) {
        await importTable(filename, config);
        console.log('');
      } else {
        console.log(`⚠️  No configuration found for ${filename}`);
      }
    }
    
    // Show final summary
    console.log('📊 Final Summary:');
    console.log('==================');
    
    for (const filename of exportFiles) {
      const config = TABLE_CONFIGS[filename];
      if (config) {
        try {
          const result = await pool.query(`SELECT COUNT(*) as count FROM ${config.tableName}`);
          const count = result.rows[0].count;
          console.log(`${config.tableName}: ${count} records`);
        } catch (error) {
          console.log(`${config.tableName}: Error counting records`);
        }
      }
    }
    
    console.log('');
    console.log('🎉 Import completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test your application with the new PostgreSQL database');
    console.log('2. Verify all data is correct');
    console.log('3. Update your application configuration');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the import
importAllData();
