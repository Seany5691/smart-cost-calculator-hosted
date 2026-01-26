/**
 * Hash Plain Text Passwords Script
 * 
 * This script hashes all plain text passwords in the users table
 * after migrating from Supabase where passwords were stored in plain text.
 * 
 * Usage: node scripts/hash-passwords.js
 * 
 * Environment variables required:
 * - DATABASE_URL: PostgreSQL connection string
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
const SALT_ROUNDS = 10;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10
});

async function hashPasswords() {
  console.log('🔐 Starting password hashing...\n');

  try {
    // Get all users
    const result = await pool.query('SELECT id, username, password FROM users');
    const users = result.rows;

    console.log(`Found ${users.length} users\n`);

    let hashedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
        console.log(`  ⏭️  ${user.username}: Already hashed, skipping`);
        skippedCount++;
        continue;
      }

      // Hash the plain text password
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

      // Update the database
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );

      console.log(`  ✅ ${user.username}: Password hashed`);
      hashedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users: ${users.length}`);
    console.log(`Hashed: ${hashedCount}`);
    console.log(`Skipped (already hashed): ${skippedCount}`);
    console.log('='.repeat(60) + '\n');

    if (hashedCount > 0) {
      console.log('✅ Password hashing complete!');
      console.log('\n📝 Users can now log in with their original passwords.');
      console.log('   The passwords are now securely hashed with bcrypt.\n');
    } else {
      console.log('ℹ️  All passwords were already hashed. No changes made.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
hashPasswords();
