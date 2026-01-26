/**
 * Import Users from SupabaseData.txt
 * 
 * This script imports only the users table from the Supabase export.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
const DATA_FILE = path.join(__dirname, '../../SupabaseData.txt');
const SALT_ROUNDS = 10;

const pool = new Pool({ connectionString: DATABASE_URL, max: 10 });

function parseDataFile(filePath) {
  console.log(`📖 Reading data file: ${filePath}\n`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for USERS DATA or HARDWARE_ITEMS DATA section (which contains users)
    const headerMatch = line.match(/===\s+([A-Z_]+)\s+DATA\s+===/);
    if (headerMatch) {
      const section = headerMatch[1].toLowerCase();
      console.log(`  Found section: ${section}`);
    }
    
    // Look for JSON data lines
    if (line.startsWith('| [')) {
      try {
        const jsonMatch = line.match(/^\|\s*(\[.*\])\s*\|?$/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[1]);
          
          // Check if this is users data
          if (jsonData.length > 0 && jsonData[0].username && jsonData[0].password && jsonData[0].role) {
            console.log(`  ✓ Found users data with ${jsonData.length} rows\n`);
            return jsonData;
          }
        }
      } catch (error) {
        // Continue searching
      }
    }
  }
  
  return null;
}

async function importUsers() {
  console.log('🚀 Starting users import...\n');

  const usersData = parseDataFile(DATA_FILE);
  
  if (!usersData) {
    console.error('❌ Could not find users data in file');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing users except super admin
    await client.query("DELETE FROM users WHERE username != 'Camryn'");
    console.log('  🗑️  Cleared existing users (except Camryn)\n');

    let insertedCount = 0;
    let skippedCount = 0;

    for (const user of usersData) {
      try {
        // Skip if username is Camryn (already exists)
        if (user.username === 'Camryn') {
          console.log(`  ⏭️  Skipping ${user.username} (already exists)`);
          skippedCount++;
          continue;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

        // Transform field names
        const query = `
          INSERT INTO users (id, username, password, role, name, email, is_active, requires_password_change, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `;

        const values = [
          user.id,
          user.username,
          hashedPassword,
          user.role,
          user.name,
          user.email,
          user.isActive !== undefined ? user.isActive : true,
          user.requiresPasswordChange !== undefined ? user.requiresPasswordChange : false,
          user.createdAt || new Date().toISOString(),
          user.updatedAt || new Date().toISOString()
        ];

        const result = await client.query(query, values);
        if (result.rowCount > 0) {
          console.log(`  ✅ Imported ${user.username} (${user.role})`);
          insertedCount++;
        } else {
          console.log(`  ⏭️  Skipped ${user.username} (duplicate)`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error importing ${user.username}: ${error.message}`);
      }
    }

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users in file: ${usersData.length}`);
    console.log(`Imported: ${insertedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Users imported successfully!');
    console.log('\n📝 All passwords have been hashed with bcrypt.');
    console.log('   Users can log in with their original passwords.\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

importUsers();
