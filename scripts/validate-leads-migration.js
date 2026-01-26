#!/usr/bin/env node

/**
 * Leads Migration Validation Script
 * 
 * This script validates the integrity of the migrated leads data
 * Requirements: 28.14-28.24
 * 
 * Validations performed:
 * - Record count verification
 * - Foreign key integrity
 * - Enum value validation
 * - Data type validation
 * - Null value consistency
 * - Timestamp preservation
 */

const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';
const PG_CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://localhost:5432/smart_cost_calculator';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pgPool = new Pool({ connectionString: PG_CONNECTION_STRING });

// Validation results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Log validation result
 */
function logResult(test, passed, message, details = null) {
  const result = { test, passed, message, details, timestamp: new Date().toISOString() };
  
  if (passed) {
    results.passed.push(result);
    console.log(`✓ ${test}: ${message}`);
  } else {
    results.failed.push(result);
    console.log(`✗ ${test}: ${message}`);
    if (details) {
      console.log(`  Details: ${JSON.stringify(details, null, 2)}`);
    }
  }
}

/**
 * Log warning
 */
function logWarning(test, message, details = null) {
  const warning = { test, message, details, timestamp: new Date().toISOString() };
  results.warnings.push(warning);
  console.log(`⚠ ${test}: ${message}`);
  if (details) {
    console.log(`  Details: ${JSON.stringify(details, null, 2)}`);
  }
}

/**
 * Validate record counts match between Supabase and PostgreSQL
 */
async function validateRecordCounts() {
  console.log('\n--- Validating Record Counts ---\n');
  
  const tables = [
    { supabase: 'leads', postgres: 'leads' },
    { supabase: 'lead_notes', postgres: 'notes' },
    { supabase: 'lead_reminders', postgres: 'reminders' },
    { supabase: 'routes', postgres: 'routes' },
    { supabase: 'lead_attachments', postgres: 'attachments' }
  ];
  
  for (const table of tables) {
    try {
      // Get Supabase count
      const { count: supabaseCount, error: sbError } = await supabase
        .from(table.supabase)
        .select('*', { count: 'exact', head: true });
      
      if (sbError) throw sbError;
      
      // Get PostgreSQL count
      const pgResult = await pgPool.query(`SELECT COUNT(*) as count FROM ${table.postgres}`);
      const pgCount = parseInt(pgResult.rows[0].count);
      
      const passed = supabaseCount === pgCount;
      logResult(
        `Record Count: ${table.postgres}`,
        passed,
        passed 
          ? `Counts match: ${pgCount} records`
          : `Count mismatch: Supabase=${supabaseCount}, PostgreSQL=${pgCount}`,
        { supabase: supabaseCount, postgres: pgCount }
      );
    } catch (err) {
      logResult(
        `Record Count: ${table.postgres}`,
        false,
        `Error: ${err.message}`,
        { error: err.message }
      );
    }
  }
}

/**
 * Validate foreign key integrity
 */
async function validateForeignKeys() {
  console.log('\n--- Validating Foreign Key Integrity ---\n');
  
  const checks = [
    { table: 'leads', column: 'user_id', refTable: 'users', refColumn: 'id' },
    { table: 'notes', column: 'lead_id', refTable: 'leads', refColumn: 'id' },
    { table: 'notes', column: 'user_id', refTable: 'users', refColumn: 'id' },
    { table: 'reminders', column: 'lead_id', refTable: 'leads', refColumn: 'id' },
    { table: 'reminders', column: 'user_id', refTable: 'users', refColumn: 'id' },
    { table: 'routes', column: 'user_id', refTable: 'users', refColumn: 'id' },
    { table: 'attachments', column: 'lead_id', refTable: 'leads', refColumn: 'id' },
    { table: 'attachments', column: 'user_id', refTable: 'users', refColumn: 'id' }
  ];
  
  for (const check of checks) {
    try {
      const result = await pgPool.query(`
        SELECT COUNT(*) as count
        FROM ${check.table} t
        WHERE t.${check.column} IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM ${check.refTable} r 
            WHERE r.${check.refColumn} = t.${check.column}
          )
      `);
      
      const orphanCount = parseInt(result.rows[0].count);
      const passed = orphanCount === 0;
      
      logResult(
        `Foreign Key: ${check.table}.${check.column} → ${check.refTable}`,
        passed,
        passed 
          ? 'No orphaned records'
          : `${orphanCount} orphaned records found`,
        { orphanCount }
      );
    } catch (err) {
      logResult(
        `Foreign Key: ${check.table}.${check.column} → ${check.refTable}`,
        false,
        `Error: ${err.message}`,
        { error: err.message }
      );
    }
  }
}

/**
 * Validate enum values
 */
async function validateEnumValues() {
  console.log('\n--- Validating Enum Values ---\n');
  
  // Validate lead status values
  try {
    const result = await pgPool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM leads
      GROUP BY status
      ORDER BY status
    `);
    
    const validStatuses = ['new', 'leads', 'working', 'later', 'bad', 'signed'];
    const foundStatuses = result.rows.map(r => r.status);
    const invalidStatuses = foundStatuses.filter(s => !validStatuses.includes(s));
    
    const passed = invalidStatuses.length === 0;
    logResult(
      'Enum Values: Lead Status',
      passed,
      passed 
        ? `All status values are valid: ${foundStatuses.join(', ')}`
        : `Invalid status values found: ${invalidStatuses.join(', ')}`,
      { valid: foundStatuses, invalid: invalidStatuses, counts: result.rows }
    );
  } catch (err) {
    logResult(
      'Enum Values: Lead Status',
      false,
      `Error: ${err.message}`,
      { error: err.message }
    );
  }
  
  // Validate reminder status values
  try {
    const result = await pgPool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM reminders
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY status
    `);
    
    const validStatuses = ['pending', 'completed', 'snoozed'];
    const foundStatuses = result.rows.map(r => r.status);
    const invalidStatuses = foundStatuses.filter(s => !validStatuses.includes(s));
    
    const passed = invalidStatuses.length === 0;
    logResult(
      'Enum Values: Reminder Status',
      passed,
      passed 
        ? `All status values are valid: ${foundStatuses.join(', ')}`
        : `Invalid status values found: ${invalidStatuses.join(', ')}`,
      { valid: foundStatuses, invalid: invalidStatuses, counts: result.rows }
    );
  } catch (err) {
    logResult(
      'Enum Values: Reminder Status',
      false,
      `Error: ${err.message}`,
      { error: err.message }
    );
  }
  
  // Validate route status values
  try {
    const result = await pgPool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM routes
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY status
    `);
    
    const validStatuses = ['active', 'completed'];
    const foundStatuses = result.rows.map(r => r.status);
    const invalidStatuses = foundStatuses.filter(s => !validStatuses.includes(s));
    
    const passed = invalidStatuses.length === 0;
    logResult(
      'Enum Values: Route Status',
      passed,
      passed 
        ? `All status values are valid: ${foundStatuses.join(', ')}`
        : `Invalid status values found: ${invalidStatuses.join(', ')}`,
      { valid: foundStatuses, invalid: invalidStatuses, counts: result.rows }
    );
  } catch (err) {
    logResult(
      'Enum Values: Route Status',
      false,
      `Error: ${err.message}`,
      { error: err.message }
    );
  }
}

/**
 * Validate required fields are not null
 */
async function validateRequiredFields() {
  console.log('\n--- Validating Required Fields ---\n');
  
  const checks = [
    { table: 'leads', fields: ['id', 'name', 'status', 'user_id'] },
    { table: 'notes', fields: ['id', 'lead_id', 'user_id', 'content'] },
    { table: 'reminders', fields: ['id', 'lead_id', 'user_id'] },
    { table: 'routes', fields: ['id', 'user_id', 'name', 'google_maps_url', 'stop_count', 'lead_ids'] },
    { table: 'attachments', fields: ['id', 'lead_id', 'filename', 'file_path', 'file_size', 'mime_type'] }
  ];
  
  for (const check of checks) {
    for (const field of check.fields) {
      try {
        const result = await pgPool.query(`
          SELECT COUNT(*) as count
          FROM ${check.table}
          WHERE ${field} IS NULL
        `);
        
        const nullCount = parseInt(result.rows[0].count);
        const passed = nullCount === 0;
        
        logResult(
          `Required Field: ${check.table}.${field}`,
          passed,
          passed 
            ? 'No null values'
            : `${nullCount} null values found`,
          { nullCount }
        );
      } catch (err) {
        logResult(
          `Required Field: ${check.table}.${field}`,
          false,
          `Error: ${err.message}`,
          { error: err.message }
        );
      }
    }
  }
}

/**
 * Validate data type consistency
 */
async function validateDataTypes() {
  console.log('\n--- Validating Data Types ---\n');
  
  // Check that lead numbers are integers
  try {
    const result = await pgPool.query(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE number IS NOT NULL
        AND number::text !~ '^[0-9]+$'
    `);
    
    const invalidCount = parseInt(result.rows[0].count);
    const passed = invalidCount === 0;
    
    logResult(
      'Data Type: Lead Number (integer)',
      passed,
      passed 
        ? 'All lead numbers are valid integers'
        : `${invalidCount} invalid lead numbers found`,
      { invalidCount }
    );
  } catch (err) {
    logResult(
      'Data Type: Lead Number (integer)',
      false,
      `Error: ${err.message}`,
      { error: err.message }
    );
  }
  
  // Check that dates are valid
  try {
    const result = await pgPool.query(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE (date_to_call_back IS NOT NULL AND date_to_call_back::text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}')
         OR (date_signed IS NOT NULL AND date_signed::text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}')
    `);
    
    const invalidCount = parseInt(result.rows[0].count);
    const passed = invalidCount === 0;
    
    logResult(
      'Data Type: Lead Dates (date)',
      passed,
      passed 
        ? 'All dates are valid'
        : `${invalidCount} invalid dates found`,
      { invalidCount }
    );
  } catch (err) {
    logResult(
      'Data Type: Lead Dates (date)',
      false,
      `Error: ${err.message}`,
      { error: err.message }
    );
  }
}

/**
 * Validate unique constraints
 */
async function validateUniqueConstraints() {
  console.log('\n--- Validating Unique Constraints ---\n');
  
  // Check user_id + number uniqueness for leads
  try {
    const result = await pgPool.query(`
      SELECT user_id, number, COUNT(*) as count
      FROM leads
      WHERE number IS NOT NULL
      GROUP BY user_id, number
      HAVING COUNT(*) > 1
    `);
    
    const duplicateCount = result.rows.length;
    const passed = duplicateCount === 0;
    
    logResult(
      'Unique Constraint: leads(user_id, number)',
      passed,
      passed 
        ? 'No duplicate user_id + number combinations'
        : `${duplicateCount} duplicate combinations found`,
      { duplicates: result.rows }
    );
  } catch (err) {
    logResult(
      'Unique Constraint: leads(user_id, number)',
      false,
      `Error: ${err.message}`,
      { error: err.message }
    );
  }
}

/**
 * Validate timestamp preservation
 */
async function validateTimestamps() {
  console.log('\n--- Validating Timestamp Preservation ---\n');
  
  // Sample check: Compare a few records between Supabase and PostgreSQL
  try {
    // Get sample leads from Supabase
    const { data: supabaseLeads, error: sbError } = await supabase
      .from('leads')
      .select('id, createdAt, updatedAt')
      .limit(10);
    
    if (sbError) throw sbError;
    
    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches = [];
    
    for (const sbLead of supabaseLeads) {
      const pgResult = await pgPool.query(
        'SELECT created_at, updated_at FROM leads WHERE id = $1',
        [sbLead.id]
      );
      
      if (pgResult.rows.length === 0) {
        mismatchCount++;
        mismatches.push({ id: sbLead.id, reason: 'Not found in PostgreSQL' });
        continue;
      }
      
      const pgLead = pgResult.rows[0];
      const sbCreated = new Date(sbLead.createdAt).getTime();
      const pgCreated = new Date(pgLead.created_at).getTime();
      const sbUpdated = new Date(sbLead.updatedAt).getTime();
      const pgUpdated = new Date(pgLead.updated_at).getTime();
      
      // Allow 1 second difference for timestamp precision
      if (Math.abs(sbCreated - pgCreated) < 1000 && Math.abs(sbUpdated - pgUpdated) < 1000) {
        matchCount++;
      } else {
        mismatchCount++;
        mismatches.push({
          id: sbLead.id,
          supabase: { created: sbLead.createdAt, updated: sbLead.updatedAt },
          postgres: { created: pgLead.created_at, updated: pgLead.updated_at }
        });
      }
    }
    
    const passed = mismatchCount === 0;
    logResult(
      'Timestamp Preservation: Leads',
      passed,
      passed 
        ? `All ${matchCount} sampled timestamps match`
        : `${mismatchCount}/${supabaseLeads.length} timestamps don't match`,
      { matchCount, mismatchCount, mismatches: mismatches.slice(0, 3) }
    );
  } catch (err) {
    logResult(
      'Timestamp Preservation: Leads',
      false,
      `Error: ${err.message}`,
      { error: err.message }
    );
  }
}

/**
 * Validate indexes exist
 */
async function validateIndexes() {
  console.log('\n--- Validating Indexes ---\n');
  
  const expectedIndexes = [
    { table: 'leads', index: 'idx_leads_user_status' },
    { table: 'leads', index: 'idx_leads_user_list' },
    { table: 'leads', index: 'idx_leads_callback_date' },
    { table: 'notes', index: 'idx_notes_lead_id' },
    { table: 'notes', index: 'idx_notes_user_id' },
    { table: 'reminders', index: 'idx_reminders_lead_id' },
    { table: 'reminders', index: 'idx_reminders_user_id' },
    { table: 'reminders', index: 'idx_reminders_user_date' },
    { table: 'routes', index: 'idx_routes_user_id' },
    { table: 'attachments', index: 'idx_attachments_lead_id' }
  ];
  
  for (const expected of expectedIndexes) {
    try {
      const result = await pgPool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = $1 AND indexname = $2
      `, [expected.table, expected.index]);
      
      const exists = result.rows.length > 0;
      
      logResult(
        `Index: ${expected.index}`,
        exists,
        exists 
          ? 'Index exists'
          : 'Index not found',
        { table: expected.table, index: expected.index }
      );
    } catch (err) {
      logResult(
        `Index: ${expected.index}`,
        false,
        `Error: ${err.message}`,
        { error: err.message }
      );
    }
  }
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${results.passed.length + results.failed.length}`);
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Warnings: ${results.warnings.length}`);
  console.log('='.repeat(70));
  
  if (results.failed.length > 0) {
    console.log('\nFailed Tests:');
    results.failed.forEach(f => {
      console.log(`  ✗ ${f.test}: ${f.message}`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\nWarnings:');
    results.warnings.forEach(w => {
      console.log(`  ⚠ ${w.test}: ${w.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
  
  return {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.passed.length + results.failed.length,
      passed: results.passed.length,
      failed: results.failed.length,
      warnings: results.warnings.length
    },
    results
  };
}

/**
 * Main validation function
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('LEADS MIGRATION VALIDATION');
  console.log('='.repeat(70) + '\n');
  
  try {
    // Test connections
    console.log('Testing database connections...\n');
    await pgPool.query('SELECT 1');
    console.log('✓ PostgreSQL connection successful');
    
    const { data, error } = await supabase.from('leads').select('id').limit(1);
    if (error) throw error;
    console.log('✓ Supabase connection successful\n');
    
    // Run validations
    await validateRecordCounts();
    await validateForeignKeys();
    await validateEnumValues();
    await validateRequiredFields();
    await validateDataTypes();
    await validateUniqueConstraints();
    await validateTimestamps();
    await validateIndexes();
    
    // Generate report
    const report = generateReport();
    
    // Save report to file
    const fs = require('fs').promises;
    const path = require('path');
    const reportPath = path.join(__dirname, `validation-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`Validation report saved to: ${reportPath}\n`);
    
    // Exit with appropriate code
    process.exit(results.failed.length > 0 ? 1 : 0);
  } catch (err) {
    console.error(`\n✗ Validation failed: ${err.message}\n`);
    console.error(err);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = { main, validateRecordCounts, validateForeignKeys, validateEnumValues };
