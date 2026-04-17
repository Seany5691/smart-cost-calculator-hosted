# Check Email Template Field Mappings

## Issue
The email template modal is showing fields as missing even when they exist on the lead. This is likely due to incorrect field mappings in the database.

## Diagnostic Query

Run this query to check the current field mappings for your email templates:

```sql
SELECT 
  t.name as template_name,
  f.field_label,
  f.field_type,
  f.lead_field_source,
  f.is_required
FROM email_templates t
JOIN email_template_fields f ON t.id = f.template_id
WHERE f.field_type = 'lead_field'
ORDER BY t.name, f.field_order;
```

## Expected Output

For the "Document Request Email" template, you should see:

| template_name | field_label | field_type | lead_field_source | is_required |
|--------------|-------------|------------|-------------------|-------------|
| Document Request Email | Contact Person | lead_field | contact_person | true |
| Document Request Email | Company Name | lead_field | name | true |

## Problem Indicators

If you see any of these issues, the template needs to be fixed:

1. **NULL or empty `lead_field_source`**: The field won't know which lead column to check
2. **Wrong `lead_field_source`**: The field is checking the wrong column
3. **Typo in `lead_field_source`**: Must match exactly: `contact_person`, `name`, `phone`, etc.

## How to Fix

### Option 1: Fix via Admin Console (Recommended)
1. Go to Admin Console → Email Templates tab
2. Click "Edit" on the template
3. Find the field that's causing issues
4. Make sure "Field Type" is set to "Lead Field (Auto-fill)"
5. Make sure "Lead Field Source" dropdown has a value selected (not "-- Select --")
6. Click "Save Template"

### Option 2: Fix via SQL (Advanced)

If the admin console isn't working, you can fix it directly in the database:

```sql
-- Example: Fix Contact Person field mapping
UPDATE email_template_fields
SET lead_field_source = 'contact_person'
WHERE field_label = 'Contact Person' 
  AND field_type = 'lead_field'
  AND (lead_field_source IS NULL OR lead_field_source = '');

-- Example: Fix Company Name field mapping
UPDATE email_template_fields
SET lead_field_source = 'name'
WHERE field_label = 'Company Name' 
  AND field_type = 'lead_field'
  AND (lead_field_source IS NULL OR lead_field_source = '');
```

## Test After Fixing

1. Close and reopen the email template modal
2. Select the template
3. Check the browser console for debug logs showing field mappings
4. Verify that fields are no longer showing as missing when they exist on the lead

## Prevention

The admin console now validates that all "Lead Field" type fields have a "Lead Field Source" selected before saving. This prevents this issue from happening again.
