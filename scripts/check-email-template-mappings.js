/**
 * Script to check and optionally fix email template field mappings
 * 
 * Usage:
 *   node scripts/check-email-template-mappings.js          # Check only
 *   node scripts/check-email-template-mappings.js --fix    # Check and fix
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTemplateMappings() {
  console.log('🔍 Checking email template field mappings...\n');

  try {
    // Fetch all lead_field type fields
    const result = await pool.query(`
      SELECT 
        t.id as template_id,
        t.name as template_name,
        f.id as field_id,
        f.field_key,
        f.field_label,
        f.field_type,
        f.lead_field_source,
        f.is_required
      FROM email_templates t
      JOIN email_template_fields f ON t.id = f.template_id
      WHERE f.field_type = 'lead_field'
      ORDER BY t.name, f.field_order
    `);

    if (result.rows.length === 0) {
      console.log('ℹ️  No lead_field type fields found in any templates.');
      return { issues: [], total: 0 };
    }

    console.log(`Found ${result.rows.length} lead_field type fields:\n`);

    const issues = [];

    for (const row of result.rows) {
      const status = row.lead_field_source ? '✅' : '❌';
      console.log(`${status} Template: "${row.template_name}"`);
      console.log(`   Field: "${row.field_label}"`);
      console.log(`   Field Key: ${row.field_key}`);
      console.log(`   Lead Field Source: ${row.lead_field_source || 'NULL/EMPTY ⚠️'}`);
      console.log(`   Required: ${row.is_required}`);
      console.log('');

      if (!row.lead_field_source) {
        issues.push({
          template_id: row.template_id,
          template_name: row.template_name,
          field_id: row.field_id,
          field_key: row.field_key,
          field_label: row.field_label
        });
      }
    }

    return { issues, total: result.rows.length };
  } catch (error) {
    console.error('❌ Error checking mappings:', error);
    throw error;
  }
}

async function fixIssues(issues) {
  console.log('\n🔧 Attempting to fix issues...\n');

  // Common field mappings based on field labels
  const commonMappings = {
    'Contact Person': 'contact_person',
    'Company Name': 'name',
    'Phone': 'phone',
    'Phone Number': 'phone',
    'Cell Number': 'cell_number',
    'Email': 'email',
    'Email Address': 'email',
    'Address': 'address',
    'Town': 'town',
    'City': 'town',
    'Provider': 'provider',
    'Type of Business': 'type_of_business',
    'Business Type': 'type_of_business',
    'Registration Number': 'registration_number',
    'Reg Number': 'registration_number',
    'VAT Number': 'vat_number',
    'PBX Link': 'pbx_link'
  };

  let fixed = 0;
  let skipped = 0;

  for (const issue of issues) {
    const suggestedMapping = commonMappings[issue.field_label];

    if (suggestedMapping) {
      console.log(`Fixing: "${issue.field_label}" in template "${issue.template_name}"`);
      console.log(`  Setting lead_field_source to: ${suggestedMapping}`);

      try {
        await pool.query(
          'UPDATE email_template_fields SET lead_field_source = $1 WHERE id = $2',
          [suggestedMapping, issue.field_id]
        );
        console.log('  ✅ Fixed\n');
        fixed++;
      } catch (error) {
        console.error('  ❌ Failed to fix:', error.message, '\n');
      }
    } else {
      console.log(`⚠️  Cannot auto-fix: "${issue.field_label}" in template "${issue.template_name}"`);
      console.log('  No common mapping found. Please fix manually in Admin Console.\n');
      skipped++;
    }
  }

  return { fixed, skipped };
}

async function main() {
  const shouldFix = process.argv.includes('--fix');

  try {
    const { issues, total } = await checkTemplateMappings();

    if (issues.length === 0) {
      console.log('✅ All lead_field type fields have proper lead_field_source mappings!');
    } else {
      console.log(`\n⚠️  Found ${issues.length} field(s) with missing lead_field_source:\n`);
      
      for (const issue of issues) {
        console.log(`  - "${issue.field_label}" in template "${issue.template_name}"`);
      }

      if (shouldFix) {
        const { fixed, skipped } = await fixIssues(issues);
        console.log('\n📊 Summary:');
        console.log(`  Fixed: ${fixed}`);
        console.log(`  Skipped: ${skipped}`);
        console.log(`  Total Issues: ${issues.length}`);

        if (fixed > 0) {
          console.log('\n✅ Fixes applied! Please test the email template modal.');
        }
        if (skipped > 0) {
          console.log('\n⚠️  Some fields could not be auto-fixed. Please fix them manually in the Admin Console.');
        }
      } else {
        console.log('\n💡 To automatically fix these issues, run:');
        console.log('   node scripts/check-email-template-mappings.js --fix');
      }
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
