# Supabase to PostgreSQL Migration Guide

This guide will help you migrate all your data from Supabase to PostgreSQL.

## 🚀 Quick Migration Steps

### Prerequisites
- Your Supabase project URL and API key
- PostgreSQL database set up and running
- All migration scripts created (included in this project)

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** > **API**
3. Copy your **Project URL** and **anon public** key
4. These look like:
   - URL: `https://your-project.supabase.co`
   - Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 2: Set Environment Variables

Create a `.env` file in your project root:

```bash
# Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# PostgreSQL credentials
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=smartcost_vps
POSTGRES_USER=smartcost_user
POSTGRES_PASSWORD=your_postgres_password
```

### Step 3: Export Data from Supabase

```bash
# Export all data to JSON files
npm run export-supabase
```

This will:
- Connect to your Supabase database
- Export all data from: leads, routes, scraped_businesses, scraping_sessions, activity_logs
- Save each table to a JSON file in the `./backup` directory
- Show you a summary of what was exported

### Step 4: Import Data to PostgreSQL

```bash
# Import all JSON data to PostgreSQL
npm run import-postgres
```

This will:
- Connect to your PostgreSQL database
- Import all data from the JSON files
- Handle data type conversions automatically
- Show you a summary of what was imported

### Step 5: Complete Migration (One Command)

```bash
# Export from Supabase AND import to PostgreSQL in one step
npm run migrate-data
```

## 📋 Detailed Migration Process

### What Gets Migrated?

The migration includes all your important data:

#### ✅ **Leads Table**
- All lead information (customer names, contact details, status, etc.)
- Notes and call-back dates
- Geographic coordinates
- Import session references

#### ✅ **Routes Table**
- All lead routing information
- Route URLs and stop counts
- Lead IDs and starting points

#### ✅ **Scraped Businesses Table**
- All scraped business data
- Contact information and addresses
- Session references

#### ✅ **Scraping Sessions Table**
- All scraping session data
- Progress and configuration information
- Session status and summaries

#### ✅ **Activity Logs Table**
- All user activity logs
- Deal creation and modification history
- User interaction tracking

### Data Transformations

The migration automatically handles:

#### ✅ **JSON Field Conversion**
- Supabase JSON objects → PostgreSQL JSONB
- Coordinates, lead_ids, starting_point fields
- Progress, summary, config objects

#### ✅ **Date/Time Conversion**
- Supabase timestamps → PostgreSQL timestamps
- Proper timezone handling
- Null value management

#### ✅ **UUID Handling**
- Supabase UUIDs → PostgreSQL UUIDs
- Primary key preservation
- Conflict resolution (upserts)

#### ✅ **Data Type Mapping**
- Text fields → VARCHAR/TEXT as appropriate
- Boolean fields → BOOLEAN
- Numeric fields → INTEGER/FLOAT as appropriate

## 🔧 Advanced Migration Options

### Option 1: Manual Export and Review

```bash
# Step 1: Export to JSON files
npm run export-supabase

# Step 2: Review the exported data
ls -la backup/
cat backup/leads_export.json | head -20

# Step 3: Import to PostgreSQL
npm run import-postgres
```

### Option 2: Selective Table Migration

If you only want to migrate specific tables, edit the scripts:

```javascript
// In scripts/export-supabase.js
const TABLES = [
  'leads',           // Keep this one
  // 'routes',       // Comment out ones you don't want
  // 'scraped_businesses',
  // 'scraping_sessions',
  // 'activity_logs'
];
```

### Option 3: Dry Run Mode

You can modify the import script to do a "dry run":

```javascript
// In scripts/import-to-postgresql.js
// Comment out this line to avoid actually importing:
// await client.query(`DELETE FROM ${config.tableName}`);
```

## 🛠️ Troubleshooting

### Common Issues

#### ❌ **Supabase Connection Failed**
```
❌ Supabase connection failed: PostgrestError: Invalid API key
```
**Solution:** Check your SUPABASE_URL and SUPABASE_ANON_KEY environment variables

#### ❌ **PostgreSQL Connection Failed**
```
❌ PostgreSQL connection failed: Error: connect ECONNREFUSED
```
**Solution:** Make sure PostgreSQL is running and credentials are correct

#### ❌ **Table Doesn't Exist**
```
❌ Error importing to PostgreSQL leads: relation "leads" does not exist
```
**Solution:** Run the database schema setup first:
```bash
npm run setup-db
```

#### ❌ **Permission Denied**
```
❌ Error: permission denied for table leads
```
**Solution:** Grant proper permissions to your PostgreSQL user:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smartcost_user;
```

### Data Validation

After migration, verify your data:

```bash
# Check record counts in PostgreSQL
psql -h localhost -U smartcost_user -d smartcost_vps -c "
SELECT 
  'leads' as table_name, COUNT(*) as record_count FROM leads
UNION ALL
SELECT 
  'routes', COUNT(*) FROM routes
UNION ALL
SELECT 
  'scraped_businesses', COUNT(*) FROM scraped_businesses
UNION ALL
SELECT 
  'scraping_sessions', COUNT(*) FROM scraping_sessions
UNION ALL
SELECT 
  'activity_logs', COUNT(*) FROM activity_logs;
"
```

## 🔄 Rollback Plan

If something goes wrong, you can:

### Option 1: Re-run Migration
```bash
# Clear and re-import
npm run import-postgres
```

### Option 2: Restore from Backup
```bash
# If you have PostgreSQL backups
psql -h localhost -U smartcost_user -d smartcost_vps < backup.sql
```

### Option 3: Start Fresh
```bash
# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE smartcost_vps;"
sudo -u postgres psql -c "CREATE DATABASE smartcost_vps;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE smartcost_vps TO smartcost_user;"

# Re-run setup and migration
npm run setup-db
npm run migrate-data
```

## 📊 Migration Checklist

### Before Migration
- [ ] PostgreSQL database created and running
- [ ] Database schema imported (`npm run setup-db`)
- [ ] Supabase credentials obtained
- [ ] Environment variables set
- [ ] Migration scripts reviewed

### During Migration
- [ ] Export script runs without errors
- [ ] JSON files created in backup directory
- [ ] Import script runs without errors
- [ ] All tables imported successfully
- [ ] Record counts match expectations

### After Migration
- [ ] Test application functionality
- [ ] Verify data integrity
- [ ] Check all features work correctly
- [ ] Performance is acceptable
- [ ] Backup old Supabase data (optional)

## 🎉 Success Indicators

Your migration is successful when:

✅ **All scripts run without errors**
✅ **Record counts match between Supabase and PostgreSQL**
✅ **Application works with new database**
✅ **All features function correctly**
✅ **No data loss or corruption**

## 📞 Need Help?

If you encounter issues:

1. **Check the logs** - Both scripts provide detailed error messages
2. **Verify credentials** - Ensure all environment variables are correct
3. **Test connections** - Run `npm run test-db` to verify PostgreSQL connectivity
4. **Review data** - Check the exported JSON files for data integrity
5. **Start small** - Try migrating one table at a time

## 🚀 Next Steps

After successful migration:

1. **Update your application** to use PostgreSQL exclusively
2. **Remove Supabase dependencies** from your code
3. **Set up production monitoring**
4. **Configure automated backups**
5. **Test thoroughly before going live**

Your Smart Cost Calculator is now fully migrated to PostgreSQL! 🎉
