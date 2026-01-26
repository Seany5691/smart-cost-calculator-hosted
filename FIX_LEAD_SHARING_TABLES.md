# Fix Lead Sharing Tables

## Problem
The lead sharing tables were created with `lead_id INTEGER` but your system uses UUIDs (VARCHAR) for lead IDs. This causes a 500 error when trying to share leads.

## Solution
Run the fix migration to recreate the tables with the correct data types.

## Steps to Fix

### Option 1: Run the fix migration directly
```bash
cd hosted-smart-cost-calculator
node scripts/migrate.js
```

The migration system will automatically run `009_lead_sharing_fix.sql`.

### Option 2: Run SQL manually
If the migration doesn't work, connect to your PostgreSQL database and run:

```sql
-- Drop existing tables
DROP TABLE IF EXISTS lead_share_notifications;
DROP TABLE IF EXISTS reminder_shares;
DROP TABLE IF EXISTS lead_shares;

-- Recreate with correct data types
CREATE TABLE lead_shares (
  id SERIAL PRIMARY KEY,
  lead_id VARCHAR(255) NOT NULL,
  shared_by_user_id INTEGER NOT NULL,
  shared_with_user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lead_id, shared_with_user_id)
);

CREATE TABLE reminder_shares (
  id SERIAL PRIMARY KEY,
  reminder_id VARCHAR(255) NOT NULL,
  shared_with_user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reminder_id, shared_with_user_id)
);

CREATE TABLE lead_share_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  lead_id VARCHAR(255) NOT NULL,
  shared_by_user_id INTEGER NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_lead_shares_lead ON lead_shares(lead_id);
CREATE INDEX idx_lead_shares_shared_with ON lead_shares(shared_with_user_id);
CREATE INDEX idx_lead_shares_shared_by ON lead_shares(shared_by_user_id);
CREATE INDEX idx_reminder_shares_reminder ON reminder_shares(reminder_id);
CREATE INDEX idx_reminder_shares_user ON reminder_shares(shared_with_user_id);
CREATE INDEX idx_lead_share_notifications_user ON lead_share_notifications(user_id);
CREATE INDEX idx_lead_share_notifications_lead ON lead_share_notifications(lead_id);
CREATE INDEX idx_lead_share_notifications_read ON lead_share_notifications(is_read);
```

## After Running the Fix

1. Restart your dev server (if it's running)
2. Clear browser cache (Ctrl+Shift+R)
3. Try sharing a lead again

The Share functionality should now work correctly!

## What Changed

- `lead_id` changed from `INTEGER` to `VARCHAR(255)` in all three tables
- `reminder_id` changed from `INTEGER` to `VARCHAR(255)` in `reminder_shares` table
- This allows the tables to store UUID strings instead of just integers

## Testing

After running the fix:
1. Click the Share button on any lead
2. Select one or more users
3. Click "Share Lead"
4. You should see a success toast message
5. The selected users should now have access to the lead
