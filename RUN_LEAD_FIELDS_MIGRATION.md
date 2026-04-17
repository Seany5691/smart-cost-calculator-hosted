# Lead Fields Migration - Add Contact and Business Fields

## Overview
This migration adds new contact and business fields to the leads table:
- Email Address
- Cell Number
- PBX Link
- Business Registration Number
- VAT Number

## Migration File
`database/migrations/025_add_lead_contact_fields.sql`

## How to Run

### Option 1: Using psql (Recommended)
```bash
psql -h localhost -U postgres -d smart_cost_calculator -f database/migrations/025_add_lead_contact_fields.sql
```

### Option 2: Using Node.js script
Create a file `run-lead-fields-migration.js`:

```javascript
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_cost_calculator',
  user: 'postgres',
  password: 'your_password_here'
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'database', 'migrations', '025_add_lead_contact_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 025_add_lead_contact_fields.sql');
    await pool.query(sql);
    console.log('✓ Migration completed successfully!');
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads' 
      AND column_name IN ('email', 'cell_number', 'pbx_link', 'business_registration_number', 'vat_number')
      ORDER BY column_name;
    `);
    
    console.log('\nNew columns added:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
```

Then run:
```bash
node run-lead-fields-migration.js
```

## Changes Made

### 1. Database Schema (`025_add_lead_contact_fields.sql`)
- Added `email` column (VARCHAR 255)
- Added `cell_number` column (VARCHAR 50)
- Added `pbx_link` column (TEXT)
- Added `business_registration_number` column (VARCHAR 100)
- Added `vat_number` column (VARCHAR 100)
- Added indexes for email and cell_number

### 2. TypeScript Types (`lib/leads/types.ts`)
Updated Lead interface to include:
- `cell_number?: string`
- `email?: string`
- `business_registration_number?: string`
- `vat_number?: string`
- `pbx_link?: string`

### 3. Edit Lead Modal (`components/leads/EditLeadModal.tsx`)
Reorganized form with sections:
- **Basic Information**: Status, Name, Business Reg. No, VAT Number, Type of Business
- **Contact Person**: Contact Person, PBX Link
- **Contact Information**: Phone, Cell Number, Email, Provider
- **Location**: Physical Address, Town/City, Google Maps (read-only)
- **Notes**

### 4. View Lead Modal (`components/leads/LeadDetailsModal.tsx`)
- Changed layout from label-above-field to inline label-value pairs
- More compact display (each field on one line)
- Added new fields in appropriate sections
- PBX Link displays as clickable "Open PBX" button (like Google Maps)

### 5. API Routes (`app/api/leads/[id]/route.ts`)
Updated both PUT and PATCH methods to handle:
- `cellNumber` / `cell_number`
- `email`
- `businessRegistrationNumber` / `business_registration_number`
- `vatNumber` / `vat_number`
- `pbxLink` / `pbx_link`

## Field Order in View Details Modal

### Basic Information
- Status
- Name
- Business Registration Number (if present)
- VAT Number (if present)
- Type of Business (if present)

### Contact Person
- Contact Person (if present)
- PBX Link (if present) - with "Open PBX" button

### Contact Information
- Phone Number (if present)
- Cell Number (if present)
- Email Address (if present)
- Provider (if present)

### Location
- Physical Address (if present)
- Town/City (if present)
- Google Maps (if present) - with "View on Google Maps" link

## Testing

1. Run the migration
2. Restart your Next.js development server
3. Open a lead and click "Edit"
4. Verify all new fields are present in the correct order
5. Fill in the new fields and save
6. View the lead details to verify:
   - Compact layout (label and value on same line)
   - All new fields display correctly
   - PBX Link shows "Open PBX" button that opens in new tab
7. Test that existing leads without these fields still display correctly

## Rollback (if needed)

```sql
ALTER TABLE leads 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS cell_number,
DROP COLUMN IF EXISTS pbx_link,
DROP COLUMN IF EXISTS business_registration_number,
DROP COLUMN IF EXISTS vat_number;

DROP INDEX IF EXISTS idx_leads_email;
DROP INDEX IF EXISTS idx_leads_cell_number;
```
