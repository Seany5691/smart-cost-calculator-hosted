#!/usr/bin/env node

/**
 * Database Rollback Script
 * Rolls back the last executed migration
 */

const { MigrationRunner } = require('../lib/migrations');
const path = require('path');

async function main() {
  console.log('Starting migration rollback...\n');
  
  const runner = new MigrationRunner(
    path.join(process.cwd(), 'database', 'migrations')
  );
  
  try {
    await runner.rollbackLastMigration();
    console.log('\n✓ Rollback completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Rollback failed:', error.message);
    process.exit(1);
  }
}

main();
