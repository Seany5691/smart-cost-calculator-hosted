#!/usr/bin/env node

/**
 * Simple Supabase Data Export Script
 * This script exports all your data from Supabase to JSON files
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Configuration - Update these with your Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tables to export
const TABLES = [
  'leads',
  'routes', 
  'scraped_businesses',
  'scraping_sessions',
  'activity_logs'
];

async function exportTable(tableName) {
  console.log(`📤 Exporting ${tableName}...`);
  
  try {
    // Get all data from the table
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Error exporting ${tableName}:`, error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️  No data found in ${tableName}`);
      return null;
    }
    
    // Create backup directory if it doesn't exist
    const backupDir = './backup';
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir);
    }
    
    // Save to JSON file
    const filename = `${backupDir}/${tableName}_export.json`;
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    
    console.log(`✅ Exported ${data.length} records from ${tableName} to ${filename}`);
    return { tableName, count: data.length, filename };
    
  } catch (error) {
    console.error(`❌ Error exporting ${tableName}:`, error);
    return null;
  }
}

async function exportAllData() {
  console.log('🚀 Starting Supabase data export');
  console.log('==============================');
  
  try {
    // Test Supabase connection
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.from('leads').select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      console.log('');
      console.log('Please check your Supabase credentials:');
      console.log('1. Make sure SUPABASE_URL is set correctly');
      console.log('2. Make sure SUPABASE_ANON_KEY is set correctly');
      console.log('3. Make sure you have access to the database');
      return;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('');
    
    // Export each table
    const results = [];
    
    for (const tableName of TABLES) {
      const result = await exportTable(tableName);
      if (result) {
        results.push(result);
      }
    }
    
    // Show summary
    console.log('');
    console.log('📊 Export Summary:');
    console.log('==================');
    
    for (const result of results) {
      console.log(`${result.tableName}: ${result.count} records → ${result.filename}`);
    }
    
    console.log('');
    console.log('🎉 Export completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the exported JSON files in the ./backup directory');
    console.log('2. Run the migration script to import to PostgreSQL');
    console.log('3. Test your application with the new PostgreSQL database');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

// Check if required environment variables are set
if (!SUPABASE_URL || SUPABASE_URL === 'your-supabase-url') {
  console.log('❌ Please set your Supabase URL:');
  console.log('export SUPABASE_URL=https://your-project.supabase.co');
  console.log('');
  console.log('Or create a .env file with:');
  console.log('SUPABASE_URL=https://your-project.supabase.co');
  console.log('SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'your-supabase-anon-key') {
  console.log('❌ Please set your Supabase Anon Key:');
  console.log('export SUPABASE_ANON_KEY=your-anon-key');
  console.log('');
  console.log('Find your keys in Supabase Project Settings > API');
  process.exit(1);
}

// Run the export
exportAllData();
