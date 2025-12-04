# Signed Date Feature Implementation

## Overview
Added a "Date Signed" feature to the Lead Management system. When moving a lead to "Signed" status, users are now prompted with a modal to enter the date when the lead was signed, similar to the "Later Stage" modal functionality.

## Changes Made

### 1. New Component: SignedModal
**File:** `src/components/leads/leads/SignedModal.tsx`

A new modal component that appears when changing a lead's status to "Signed". Features include:
- Date picker for selecting the signed date (defaults to today, max date is today)
- Optional notes field for recording deal details
- Green/emerald color scheme to match the "Signed" status theme
- Automatic note creation documenting the signing
- Form validation and error handling

### 2. Updated Lead Type Definition
**File:** `src/lib/leads/types.ts`

Added new field to the `Lead` interface:
```typescript
dateSigned: string | null; // Date when lead was signed (ISO date string) - matches DB column "dateSigned"
```

**Note:** The field uses camelCase (`dateSigned`) to match the Supabase database schema convention.

### 3. Updated StatusManager Component
**File:** `src/components/leads/leads/StatusManager.tsx`

Enhanced to handle the "Signed" status change:
- Added `showSignedModal` state
- Added `handleSignedConfirm` and `handleSignedCancel` functions
- Integrated SignedModal component
- Shows signed date info for signed leads (similar to callback date for later stage)
- Triggers modal when status is changed to "signed"

### 4. Updated LeadCard Component
**File:** `src/components/leads/leads/LeadCard.tsx`

Added display of signed date:
- Shows "Signed: [date]" in green text with calendar icon
- Only displays for leads with status "signed" and a valid `date_signed`
- Positioned after business type in the lead information section

### 5. Updated Signed Leads Page
**File:** `src/app/leads/status-pages/status/signed/page.tsx`

Enhanced to use the new signed date:
- Updated `getDaysSinceSigned()` to use `date_signed` if available, fallback to `updated_at`
- Added `getSignedDateDisplay()` helper function
- Updated export functionality to use the actual signed date

### 6. Database Migration
**File:** `add-date-signed-column.sql`

SQL migration to add the new column to the database:
```sql
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS "dateSigned" DATE;
```
- Uses camelCase with quotes (`"dateSigned"`) to match existing schema convention
- Includes column comment for documentation
- Creates index for better query performance
- Includes verification query

## User Experience Flow

1. **Moving to Signed Status:**
   - User selects "Signed" from the status dropdown on any lead
   - SignedModal appears with a congratulatory message
   - User selects the date when the lead was signed (defaults to today)
   - User can optionally add notes about the deal
   - User clicks "Mark as Signed"

2. **Viewing Signed Leads:**
   - In the lead card, signed date is displayed prominently in green
   - Format: "Signed: MM/DD/YYYY"
   - Appears in the main lead information section

3. **Signed Tab:**
   - All signed leads show their signed date on the card
   - Export includes the actual signed date
   - Metrics and sorting work with the signed date

## Database Migration Instructions

To apply the database changes, run the SQL migration:

```bash
# Connect to your Supabase database and run:
psql -h [your-host] -U [your-user] -d [your-database] -f add-date-signed-column.sql
```

Or through Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `add-date-signed-column.sql`
3. Execute the query

## Testing Checklist

- [ ] Move a lead to "Signed" status - modal should appear
- [ ] Select a signed date and submit - lead should update
- [ ] View the lead card - signed date should display in green
- [ ] Check the Signed tab - all signed leads show their dates
- [ ] Export signed leads - CSV should include signed dates
- [ ] Try canceling the modal - status should not change
- [ ] Try submitting without a date - validation error should show
- [ ] Check that existing signed leads still work (will use updated_at as fallback)

## Notes

- The `dateSigned` field is optional and nullable
- Field naming uses camelCase (`dateSigned`) to match the Supabase database schema convention (like `dateToCallBack`, `contactPerson`, etc.)
- For existing signed leads without a `dateSigned`, the system falls back to using `updated_at`
- The modal prevents selecting future dates (max date is today)
- A note is automatically created documenting when the lead was signed
- The feature follows the same pattern as the "Later Stage" modal for consistency

## Database Schema Convention

The Supabase database uses the following naming conventions:
- **Lowercase without quotes**: `town`, `name`, `phone`, `address`
- **camelCase with quotes**: `"dateSigned"`, `"dateToCallBack"`, `"contactPerson"`, `"userId"`, `"createdAt"`, `"updatedAt"`

The `dateSigned` column follows this convention and requires quotes in SQL queries.
