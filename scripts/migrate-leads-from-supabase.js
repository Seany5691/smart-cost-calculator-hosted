#!/usr/bin/env node

/**
 * Supabase to PostgreSQL Leads Data Migration Script
 * 
 * This script migrates all leads-related data from Supabase to PostgreSQL
 * Requirements: 28.1-28.24
 * 
 * Tables migrated:
 * - leads
 * - lead_notes -> notes
 * - lead_reminders -> reminders
 * - routes
 * - lead_attachments -> attachments
 * - scraper_sessions (for import tracking)
 */

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';
const PG_CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://localhost:5432/smart_cost_calculator';

// Batch size for processing
const BATCH_SIZE = 100;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pgPool = new Pool({ connectionString: PG_CONNECTION_STRING });

// Migration statistics
const stats = {
  leads: { total: 0, migrated: 0, failed: 0, errors: [] },
  notes: { total: 0, migrated: 0, failed: 0, errors: [] },
  reminders: { total: 0, migrated: 0, failed: 0, errors: [] },
  routes: { total: 0, migrated: 0, failed: 0, errors: [] },
  attachments: { total: 0, migrated: 0, failed: 0, errors: [] },
};

/**
 * Log migration progress
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
    progress: '→'
  }[level] || 'ℹ';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Migrate leads table
 */
async function migrateLeads() {
  log('Starting leads migration...', 'progress');
  
  try {
    // Fetch all leads from Supabase
    const { data: supabaseLeads, error } = await supabase
      .from('leads')
      .select('*')
      .order('createdAt', { ascending: true });
    
    if (error) throw error;
    
    stats.leads.total = supabaseLeads.length;
    log(`Found ${stats.leads.total} leads in Supabase`);
    
    // Process in batches
    for (let i = 0; i < supabaseLeads.length; i += BATCH_SIZE) {
      const batch = supabaseLeads.slice(i, i + BATCH_SIZE);
      
      for (const lead of batch) {
        try {
          // Transform Supabase lead to PostgreSQL format
          const pgLead = {
            id: lead.id,
            number: lead.number,
            maps_address: lead.mapsAddress,
            name: lead.name,
            phone: lead.phone,
            provider: lead.provider,
            address: lead.address,
            town: lead.town,
            contact_person: lead.contactPerson,
            type_of_business: lead.typeOfBusiness,
            status: lead.status || 'new',
            notes: lead.notes,
            date_to_call_back: lead.dateToCallBack,
            date_signed: lead.dateSigned,
            coordinates: lead.coordinates,
            background_color: lead.backgroundColor,
            list_name: lead.listName,
            user_id: lead.userId,
            created_at: lead.createdAt,
            updated_at: lead.updatedAt
          };
          
          // Insert into PostgreSQL
          await pgPool.query(`
            INSERT INTO leads (
              id, number, maps_address, name, phone, provider, address, town,
              contact_person, type_of_business, status, notes, date_to_call_back,
              date_signed, coordinates, background_color, list_name, user_id,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20
            )
            ON CONFLICT (id) DO UPDATE SET
              number = EXCLUDED.number,
              maps_address = EXCLUDED.maps_address,
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              provider = EXCLUDED.provider,
              address = EXCLUDED.address,
              town = EXCLUDED.town,
              contact_person = EXCLUDED.contact_person,
              type_of_business = EXCLUDED.type_of_business,
              status = EXCLUDED.status,
              notes = EXCLUDED.notes,
              date_to_call_back = EXCLUDED.date_to_call_back,
              date_signed = EXCLUDED.date_signed,
              coordinates = EXCLUDED.coordinates,
              background_color = EXCLUDED.background_color,
              list_name = EXCLUDED.list_name,
              updated_at = EXCLUDED.updated_at
          `, [
            pgLead.id, pgLead.number, pgLead.maps_address, pgLead.name,
            pgLead.phone, pgLead.provider, pgLead.address, pgLead.town,
            pgLead.contact_person, pgLead.type_of_business, pgLead.status,
            pgLead.notes, pgLead.date_to_call_back, pgLead.date_signed,
            pgLead.coordinates, pgLead.background_color, pgLead.list_name,
            pgLead.user_id, pgLead.created_at, pgLead.updated_at
          ]);
          
          stats.leads.migrated++;
        } catch (err) {
          stats.leads.failed++;
          stats.leads.errors.push({
            id: lead.id,
            name: lead.name,
            error: err.message
          });
          log(`Failed to migrate lead ${lead.id}: ${err.message}`, 'error');
        }
      }
      
      log(`Migrated ${stats.leads.migrated}/${stats.leads.total} leads`, 'progress');
    }
    
    log(`Leads migration completed: ${stats.leads.migrated} migrated, ${stats.leads.failed} failed`, 'info');
  } catch (err) {
    log(`Leads migration failed: ${err.message}`, 'error');
    throw err;
  }
}

/**
 * Migrate notes table
 */
async function migrateNotes() {
  log('Starting notes migration...', 'progress');
  
  try {
    // Fetch all notes from Supabase
    const { data: supabaseNotes, error } = await supabase
      .from('lead_notes')
      .select('*')
      .order('createdAt', { ascending: true });
    
    if (error) throw error;
    
    stats.notes.total = supabaseNotes.length;
    log(`Found ${stats.notes.total} notes in Supabase`);
    
    // Process in batches
    for (let i = 0; i < supabaseNotes.length; i += BATCH_SIZE) {
      const batch = supabaseNotes.slice(i, i + BATCH_SIZE);
      
      for (const note of batch) {
        try {
          // Transform Supabase note to PostgreSQL format
          await pgPool.query(`
            INSERT INTO notes (
              id, lead_id, user_id, content, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              content = EXCLUDED.content,
              updated_at = EXCLUDED.updated_at
          `, [
            note.id,
            note.leadId,
            note.userId,
            note.content,
            note.createdAt,
            note.updatedAt
          ]);
          
          stats.notes.migrated++;
        } catch (err) {
          stats.notes.failed++;
          stats.notes.errors.push({
            id: note.id,
            error: err.message
          });
          log(`Failed to migrate note ${note.id}: ${err.message}`, 'error');
        }
      }
      
      log(`Migrated ${stats.notes.migrated}/${stats.notes.total} notes`, 'progress');
    }
    
    log(`Notes migration completed: ${stats.notes.migrated} migrated, ${stats.notes.failed} failed`, 'info');
  } catch (err) {
    log(`Notes migration failed: ${err.message}`, 'error');
    throw err;
  }
}

/**
 * Migrate reminders table
 */
async function migrateReminders() {
  log('Starting reminders migration...', 'progress');
  
  try {
    // Fetch all reminders from Supabase
    const { data: supabaseReminders, error } = await supabase
      .from('lead_reminders')
      .select('*')
      .order('createdAt', { ascending: true });
    
    if (error) throw error;
    
    stats.reminders.total = supabaseReminders.length;
    log(`Found ${stats.reminders.total} reminders in Supabase`);
    
    // Process in batches
    for (let i = 0; i < supabaseReminders.length; i += BATCH_SIZE) {
      const batch = supabaseReminders.slice(i, i + BATCH_SIZE);
      
      for (const reminder of batch) {
        try {
          // Extract date and time from dueDate
          const dueDate = new Date(reminder.dueDate);
          const reminderDate = dueDate.toISOString().split('T')[0];
          const reminderTime = dueDate.toTimeString().split(' ')[0];
          
          // Map completed to status
          const status = reminder.completed ? 'completed' : 'pending';
          
          // Combine title and description into message
          const message = reminder.title + (reminder.description ? '\n' + reminder.description : '');
          
          // Transform Supabase reminder to PostgreSQL format
          await pgPool.query(`
            INSERT INTO reminders (
              id, lead_id, user_id, reminder_type, priority, due_date,
              title, description, recurrence_pattern, completed, completed_at,
              message, reminder_date, reminder_time, status,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              message = EXCLUDED.message,
              completed = EXCLUDED.completed,
              completed_at = EXCLUDED.completed_at,
              status = EXCLUDED.status,
              updated_at = EXCLUDED.updated_at
          `, [
            reminder.id,
            reminder.leadId,
            reminder.userId,
            reminder.reminderType || 'follow_up',
            reminder.priority || 'medium',
            reminder.dueDate,
            reminder.title,
            reminder.description,
            reminder.recurrencePattern,
            reminder.completed,
            reminder.completedAt,
            message,
            reminderDate,
            reminderTime,
            status,
            reminder.createdAt,
            reminder.updatedAt
          ]);
          
          stats.reminders.migrated++;
        } catch (err) {
          stats.reminders.failed++;
          stats.reminders.errors.push({
            id: reminder.id,
            error: err.message
          });
          log(`Failed to migrate reminder ${reminder.id}: ${err.message}`, 'error');
        }
      }
      
      log(`Migrated ${stats.reminders.migrated}/${stats.reminders.total} reminders`, 'progress');
    }
    
    log(`Reminders migration completed: ${stats.reminders.migrated} migrated, ${stats.reminders.failed} failed`, 'info');
  } catch (err) {
    log(`Reminders migration failed: ${err.message}`, 'error');
    throw err;
  }
}

/**
 * Migrate routes table
 */
async function migrateRoutes() {
  log('Starting routes migration...', 'progress');
  
  try {
    // Fetch all routes from Supabase
    const { data: supabaseRoutes, error } = await supabase
      .from('routes')
      .select('*')
      .order('createdAt', { ascending: true });
    
    if (error) throw error;
    
    stats.routes.total = supabaseRoutes.length;
    log(`Found ${stats.routes.total} routes in Supabase`);
    
    // Process in batches
    for (let i = 0; i < supabaseRoutes.length; i += BATCH_SIZE) {
      const batch = supabaseRoutes.slice(i, i + BATCH_SIZE);
      
      for (const route of batch) {
        try {
          // Transform Supabase route to PostgreSQL format
          await pgPool.query(`
            INSERT INTO routes (
              id, user_id, name, google_maps_url, stop_count, lead_ids,
              starting_point, notes, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              google_maps_url = EXCLUDED.google_maps_url,
              stop_count = EXCLUDED.stop_count,
              notes = EXCLUDED.notes,
              status = EXCLUDED.status
          `, [
            route.id,
            route.userId,
            route.name,
            route.routeUrl,
            route.stopCount,
            route.leadIds,
            route.startingPoint,
            route.notes,
            'active', // Default status
            route.createdAt
          ]);
          
          stats.routes.migrated++;
        } catch (err) {
          stats.routes.failed++;
          stats.routes.errors.push({
            id: route.id,
            error: err.message
          });
          log(`Failed to migrate route ${route.id}: ${err.message}`, 'error');
        }
      }
      
      log(`Migrated ${stats.routes.migrated}/${stats.routes.total} routes`, 'progress');
    }
    
    log(`Routes migration completed: ${stats.routes.migrated} migrated, ${stats.routes.failed} failed`, 'info');
  } catch (err) {
    log(`Routes migration failed: ${err.message}`, 'error');
    throw err;
  }
}

/**
 * Migrate attachments table
 */
async function migrateAttachments() {
  log('Starting attachments migration...', 'progress');
  
  try {
    // Fetch all attachments from Supabase
    const { data: supabaseAttachments, error } = await supabase
      .from('lead_attachments')
      .select('*')
      .order('createdAt', { ascending: true });
    
    if (error) throw error;
    
    stats.attachments.total = supabaseAttachments.length;
    log(`Found ${stats.attachments.total} attachments in Supabase`);
    
    // Process in batches
    for (let i = 0; i < supabaseAttachments.length; i += BATCH_SIZE) {
      const batch = supabaseAttachments.slice(i, i + BATCH_SIZE);
      
      for (const attachment of batch) {
        try {
          // Transform Supabase attachment to PostgreSQL format
          await pgPool.query(`
            INSERT INTO attachments (
              id, lead_id, filename, mime_type, file_size, file_path,
              description, user_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              filename = EXCLUDED.filename,
              file_path = EXCLUDED.file_path
          `, [
            attachment.id,
            attachment.leadId,
            attachment.fileName,
            attachment.fileType,
            attachment.fileSize,
            attachment.storagePath,
            attachment.description,
            attachment.userId,
            attachment.createdAt
          ]);
          
          stats.attachments.migrated++;
        } catch (err) {
          stats.attachments.failed++;
          stats.attachments.errors.push({
            id: attachment.id,
            error: err.message
          });
          log(`Failed to migrate attachment ${attachment.id}: ${err.message}`, 'error');
        }
      }
      
      log(`Migrated ${stats.attachments.migrated}/${stats.attachments.total} attachments`, 'progress');
    }
    
    log(`Attachments migration completed: ${stats.attachments.migrated} migrated, ${stats.attachments.failed} failed`, 'info');
  } catch (err) {
    log(`Attachments migration failed: ${err.message}`, 'error');
    throw err;
  }
}

/**
 * Validate migration integrity
 */
async function validateMigration() {
  log('Validating migration integrity...', 'progress');
  
  const validations = [];
  
  try {
    // Check record counts
    for (const table of ['leads', 'notes', 'reminders', 'routes', 'attachments']) {
      const result = await pgPool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const pgCount = parseInt(result.rows[0].count);
      const expectedCount = stats[table].migrated;
      
      const isValid = pgCount === expectedCount;
      validations.push({
        table,
        expected: expectedCount,
        actual: pgCount,
        valid: isValid
      });
      
      if (isValid) {
        log(`✓ ${table}: ${pgCount} records`, 'info');
      } else {
        log(`✗ ${table}: Expected ${expectedCount}, found ${pgCount}`, 'error');
      }
    }
    
    // Check foreign key integrity
    const fkChecks = [
      { table: 'notes', fk: 'lead_id', ref: 'leads' },
      { table: 'reminders', fk: 'lead_id', ref: 'leads' },
      { table: 'attachments', fk: 'lead_id', ref: 'leads' },
      { table: 'routes', fk: 'user_id', ref: 'users' }
    ];
    
    for (const check of fkChecks) {
      const result = await pgPool.query(`
        SELECT COUNT(*) as count
        FROM ${check.table} t
        WHERE NOT EXISTS (
          SELECT 1 FROM ${check.ref} r WHERE r.id = t.${check.fk}
        )
      `);
      
      const orphanCount = parseInt(result.rows[0].count);
      if (orphanCount === 0) {
        log(`✓ ${check.table}.${check.fk} → ${check.ref}: No orphaned records`, 'info');
      } else {
        log(`✗ ${check.table}.${check.fk} → ${check.ref}: ${orphanCount} orphaned records`, 'error');
      }
    }
    
    // Check status enum values
    const statusResult = await pgPool.query(`
      SELECT DISTINCT status FROM leads
    `);
    const statuses = statusResult.rows.map(r => r.status);
    const validStatuses = ['new', 'leads', 'working', 'later', 'bad', 'signed'];
    const invalidStatuses = statuses.filter(s => !validStatuses.includes(s));
    
    if (invalidStatuses.length === 0) {
      log(`✓ Lead status values: All valid`, 'info');
    } else {
      log(`✗ Lead status values: Invalid statuses found: ${invalidStatuses.join(', ')}`, 'error');
    }
    
    return validations;
  } catch (err) {
    log(`Validation failed: ${err.message}`, 'error');
    throw err;
  }
}

/**
 * Generate migration report
 */
async function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRecords: Object.values(stats).reduce((sum, s) => sum + s.total, 0),
      migratedRecords: Object.values(stats).reduce((sum, s) => sum + s.migrated, 0),
      failedRecords: Object.values(stats).reduce((sum, s) => sum + s.failed, 0)
    },
    tables: stats,
    errors: Object.entries(stats)
      .filter(([_, s]) => s.errors.length > 0)
      .map(([table, s]) => ({ table, errors: s.errors }))
  };
  
  // Save report to file
  const reportPath = path.join(__dirname, `migration-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  log(`Migration report saved to: ${reportPath}`, 'info');
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total records: ${report.summary.totalRecords}`);
  console.log(`Migrated: ${report.summary.migratedRecords}`);
  console.log(`Failed: ${report.summary.failedRecords}`);
  console.log('='.repeat(60));
  
  for (const [table, tableStats] of Object.entries(stats)) {
    console.log(`${table}: ${tableStats.migrated}/${tableStats.total} (${tableStats.failed} failed)`);
  }
  
  console.log('='.repeat(60) + '\n');
  
  return report;
}

/**
 * Main migration function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('SUPABASE TO POSTGRESQL MIGRATION');
  console.log('Leads Management System Complete Parity');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Test connections
    log('Testing database connections...', 'progress');
    await pgPool.query('SELECT 1');
    log('PostgreSQL connection successful', 'info');
    
    const { data, error } = await supabase.from('leads').select('id').limit(1);
    if (error) throw error;
    log('Supabase connection successful', 'info');
    
    // Run migrations in order
    await migrateLeads();
    await migrateNotes();
    await migrateReminders();
    await migrateRoutes();
    await migrateAttachments();
    
    // Validate migration
    await validateMigration();
    
    // Generate report
    await generateReport();
    
    log('Migration completed successfully!', 'info');
    process.exit(0);
  } catch (err) {
    log(`Migration failed: ${err.message}`, 'error');
    console.error(err);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  main();
}

module.exports = { main, migrateLeads, migrateNotes, migrateReminders, migrateRoutes, migrateAttachments };
