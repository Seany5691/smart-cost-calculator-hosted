# PostgreSQL Migration Guide for Smart Cost Calculator

This guide will help you migrate your Smart Cost Calculator from Supabase to PostgreSQL for VPS hosting.

## Overview

Your app now supports **dual hosting**:
- **Vercel Version**: Uses Supabase (unchanged)
- **VPS Version**: Uses PostgreSQL (new implementation)

## Prerequisites

### 1. PostgreSQL Server Setup
```bash
# Install PostgreSQL on Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE smartcost_vps;

# Create user
CREATE USER smartcost_user WITH PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE smartcost_vps TO smartcost_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smartcost_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smartcost_user;

# Exit
\q
```

## Migration Steps

### Step 1: Update Environment Variables

Create `.env.local` in your project root:
```bash
# PostgreSQL Configuration for VPS
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=smartcost_vps
POSTGRES_USER=smartcost_user
POSTGRES_PASSWORD=your_secure_password_here

# Keep Supabase for Vercel compatibility
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 2: Install Dependencies
```bash
npm install pg @types/pg
```

### Step 3: Run Database Migration
```bash
# Apply the database schema
psql -h localhost -U smartcost_user -d smartcost_vps -f database/migrations/001_create_schema.sql
```

### Step 4: Test the Application
```bash
# Start the development server
npm run dev

# Or build for production
npm run build
npm start
```

## How It Works

### Database Adapter System
The app automatically detects which database to use:

```typescript
// In VPS mode (PostgreSQL)
if (process.env.POSTGRES_HOST && process.env.POSTGRES_DATABASE) {
  // Uses PostgreSQL
} else {
  // Uses Supabase (Vercel)
}
```

### Key Components Created

1. **`src/lib/postgresql.ts`** - PostgreSQL connection and helpers
2. **`src/lib/leads/postgresqlLeads.ts`** - Lead management for PostgreSQL
3. **`src/lib/databaseAdapter.ts`** - Unified database interface
4. **`database/migrations/001_create_schema.sql`** - Database schema
5. **Updated stores** - Automatically use the correct database

## Features Implemented

### ✅ Lead Management
- Full CRUD operations
- Status changes with renumbering
- Bulk operations
- List management
- Notes and interactions

### ✅ User Authentication
- UUID validation
- Login/logout
- User management
- Role-based access

### ✅ Deal Calculations
- Create, update, delete deals
- Activity logging
- Dashboard statistics

### 🔄 In Progress
- Scraper system
- Advanced dashboard features

## Deployment

### VPS Deployment
1. Set up PostgreSQL on your VPS
2. Configure environment variables
3. Run database migration
4. Deploy your app

### Automatic Detection
The app automatically detects the environment:
- **VPS**: Uses PostgreSQL
- **Vercel**: Uses Supabase

## Troubleshooting

### Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U smartcost_user -d smartcost_vps

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Common Errors

1. **"Database adapter not available"**
   - Ensure PostgreSQL environment variables are set
   - Check database connection

2. **"Invalid UUID format"**
   - This should be fixed with the new validation
   - Clear localStorage if issues persist

3. **Migration fails**
   - Check PostgreSQL user permissions
   - Ensure database exists

## Performance Benefits

- **Direct database connection** - No middleware overhead
- **Optimized queries** - PostgreSQL-specific optimizations
- **Better caching** - Local control over caching strategies
- **Cost savings** - $5-20/month vs $25-100/month

## Monitoring

### Database Health
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public';
```

### Application Logs
The app logs database operations and automatically detects which adapter is in use:
```
🟢 Using PostgreSQL database adapter (VPS mode)
🟠 Using Supabase database adapter (Vercel mode)
```

## Next Steps

1. **Test thoroughly** - Verify all features work
2. **Monitor performance** - Compare with Supabase version
3. **Set up backups** - Configure PostgreSQL backups
4. **Scale as needed** - Adjust connection pool size

## Support

If you encounter issues:
1. Check PostgreSQL logs
2. Verify environment variables
3. Test database connection manually
4. Review application console logs

The migration maintains full backward compatibility with your Supabase version while providing a robust PostgreSQL alternative for VPS hosting.
