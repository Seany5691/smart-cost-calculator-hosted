# Telesales Role - Quick Start Guide

## What is the Telesales Role?

The telesales role is a restricted user role that only has access to:
- ✅ **Leads** - Full access to lead management
- ✅ **Scraper** - Full access to business scraping

Telesales users **cannot** access:
- ❌ Dashboard
- ❌ Calculator
- ❌ Admin Panel

## Setup Instructions

### Step 1: Run the Migration

Run the migration script to add the telesales role to your database:

```bash
node scripts/add-telesales-role.js
```

You should see:
```
✨ Migration completed successfully!
```

### Step 2: Restart Your Server

Stop and restart your development server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Create a Telesales User

1. Log in as an **admin** user
2. Navigate to **Admin** → **User Management**
3. Click **"Add User"** button
4. Fill in the form:
   - **Username**: e.g., `sales_john`
   - **Full Name**: e.g., `John Smith`
   - **Email**: e.g., `john@company.com`
   - **Password**: (minimum 8 characters)
   - **Role**: Select **"Telesales"** from dropdown
5. Click **"Create User"**

### Step 4: Test the Telesales User

1. Log out from admin account
2. Log in with the telesales credentials
3. Verify you only see:
   - **Leads** navigation item
   - **Scraper** navigation item
4. Try accessing `/calculator` or `/admin` - you should not see these in navigation

## Visual Identification

Telesales users are identified by:
- **Badge Color**: Orange-to-amber gradient
- **Role Label**: "Telesales" (capitalized)

## Common Use Cases

### Use Case 1: Lead Generation Team
Create telesales accounts for team members who:
- Scrape new business leads
- Manage and qualify leads
- Don't need access to pricing/calculator

### Use Case 2: Call Center Staff
Perfect for call center employees who:
- Follow up on leads
- Update lead status
- Add notes and reminders
- Don't need admin or calculator access

### Use Case 3: Junior Sales Staff
Ideal for junior sales team members who:
- Work with assigned leads
- Use scraper to find prospects
- Don't have pricing authority

## Permissions Summary

| Feature | Telesales Access |
|---------|------------------|
| View Leads | ✅ Yes |
| Create Leads | ✅ Yes |
| Edit Leads | ✅ Yes |
| Delete Leads | ✅ Yes |
| Add Notes | ✅ Yes |
| Add Reminders | ✅ Yes |
| Use Scraper | ✅ Yes |
| Export Scraped Data | ✅ Yes |
| View Calculator | ❌ No |
| Create Proposals | ❌ No |
| View Dashboard | ❌ No |
| Access Admin Panel | ❌ No |
| Manage Users | ❌ No |
| Configure Pricing | ❌ No |

## Troubleshooting

### Issue: "Telesales" option not showing in dropdown

**Solution**: 
1. Verify migration ran successfully: `node scripts/add-telesales-role.js`
2. Restart your development server
3. Clear browser cache
4. Refresh the page

### Issue: Telesales user can see Dashboard/Calculator

**Solution**:
1. Verify the user's role is set to 'telesales' in database
2. Log out and log back in
3. Clear browser cache and cookies
4. Check browser console for errors

### Issue: Migration script fails

**Solution**:
1. Check your `.env.local` file has correct `DATABASE_URL`
2. Verify database is running
3. Check database user has ALTER TABLE permissions
4. Try running the SQL manually from `database/migrations/009_add_telesales_role.sql`

## Security Notes

- Telesales users are authenticated like all other users
- They cannot escalate their privileges
- They cannot access admin functions
- All API routes respect role-based permissions
- Session management is the same as other roles

## Managing Telesales Users

### Changing a User to Telesales

1. Go to Admin → User Management
2. Find the user
3. Click **"Edit"**
4. Change **Role** to **"Telesales"**
5. Click **"Save"**
6. User must log out and log back in

### Changing a Telesales User to Another Role

1. Go to Admin → User Management
2. Find the telesales user
3. Click **"Edit"**
4. Change **Role** to desired role (User, Manager, or Admin)
5. Click **"Save"**
6. User must log out and log back in

### Deactivating a Telesales User

1. Go to Admin → User Management
2. Find the telesales user
3. Click **"Edit"**
4. Uncheck **"Active"** checkbox
5. Click **"Save"**
6. User will no longer be able to log in

## Best Practices

1. **Use descriptive usernames**: e.g., `sales_john`, `telesales_mary`
2. **Set strong passwords**: Minimum 8 characters, use password manager
3. **Regular audits**: Review telesales user activity periodically
4. **Deactivate unused accounts**: Disable accounts for users who leave
5. **Monitor lead access**: Track which telesales users access which leads

## Support

For issues or questions:
1. Check this guide first
2. Review `TELESALES_ROLE_IMPLEMENTATION.md` for technical details
3. Check browser console for errors
4. Verify database migration status
5. Contact system administrator

## Quick Reference

```bash
# Run migration
node scripts/add-telesales-role.js

# Restart server
npm run dev

# Check database constraint
psql -U your_user -d your_database -c "
  SELECT constraint_name, check_clause 
  FROM information_schema.check_constraints 
  WHERE table_name = 'users' AND constraint_name = 'users_role_check';
"
```

## What's Next?

After setting up telesales users:
1. Train team members on Leads and Scraper features
2. Set up lead assignment workflow
3. Configure reminder notifications
4. Monitor telesales performance
5. Gather feedback for improvements
