# Manual Fix Required: PATCH Handler for contact_person

## Issue
The PATCH handler in `app/api/leads/[id]/route.ts` needs to be updated to support both `contact_person` (snake_case) and `contactPerson` (camelCase).

## Files Already Fixed
- PUT handler: ✅ Fixed (supports both formats)
- Email template modal: ✅ Already sends snake_case

## Manual Fix Needed
In `app/api/leads/[id]/route.ts`, find these two sections in the PATCH handler (around line 342-350):

### Change 1: contactPerson
**Find:**
```typescript
    if (body.contactPerson !== undefined) {
      updates.push(`contact_person = $${paramIndex++}`);
      values.push(body.contactPerson);
    }
```

**Replace with:**
```typescript
    if (body.contactPerson !== undefined || body.contact_person !== undefined) {
      updates.push(`contact_person = $${paramIndex++}`);
      values.push(body.contact_person || body.contactPerson);
    }
```

### Change 2: typeOfBusiness
**Find:**
```typescript
    if (body.typeOfBusiness !== undefined) {
      updates.push(`type_of_business = $${paramIndex++}`);
      values.push(body.typeOfBusiness);
    }
```

**Replace with:**
```typescript
    if (body.typeOfBusiness !== undefined || body.type_of_business !== undefined) {
      updates.push(`type_of_business = $${paramIndex++}`);
      values.push(body.type_of_business || body.typeOfBusiness);
    }
```

## Why This Fix is Needed
The email template modal sends field names in snake_case (e.g., `contact_person`) because that's how they're stored in the database. The API needs to accept both formats for backward compatibility.

## Testing After Fix
1. Open email template modal for a lead without contact person
2. Fill in the contact person field
3. Click "Generate Email"
4. Refresh the page
5. Open "View Lead Details" modal
6. Contact person should still be there ✅
