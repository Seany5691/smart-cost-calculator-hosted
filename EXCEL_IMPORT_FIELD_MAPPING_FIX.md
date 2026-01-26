# Excel Import Field Mapping Fix - Complete ✅

## Issue
When importing leads from Excel (exported from the scraper), the field mapping was incorrect:
- **maps_address** column was being auto-mapped to `address` field
- **address** column was not being mapped to anything
- **town** field was missing from the mapping options

## Root Cause
The auto-detection logic in `ExcelImporter.tsx` was checking for "address" OR "maps" in the header name and mapping both to `mapsAddress`:

```typescript
// OLD (INCORRECT)
if (lowerHeader.includes('address') || lowerHeader.includes('maps')) 
  detectedMapping['mapsAddress'] = header;
```

This meant that when the Excel file had both `maps_address` and `address` columns, the `address` column would overwrite the `maps_address` mapping.

## Solution

### 1. Fixed Auto-Detection Logic
Updated the field mapping detection to be more specific and prioritize correctly:

```typescript
// Map maps_address field (prioritize maps-related headers)
if (lowerHeader.includes('maps') || lowerHeader === 'maps_address' || lowerHeader === 'mapsaddress') {
  detectedMapping['mapsAddress'] = header;
}

// Map address field (only if not maps-related)
if (lowerHeader.includes('address') && !lowerHeader.includes('maps') && !detectedMapping['address']) {
  detectedMapping['address'] = header;
}
```

**Key changes:**
- `maps_address` is detected first and only for maps-related headers
- `address` is detected separately and explicitly excludes maps-related headers
- Added check to prevent overwriting existing address mapping

### 2. Added Town Field
Added `town` to the field mapping options since it's included in the scraper Excel export:

```typescript
['mapsAddress', 'name', 'phone', 'provider', 'address', 'typeOfBusiness', 'town', 'notes']
```

### 3. Improved Detection for All Fields
Made the detection logic more robust for all fields:

- **name**: Excludes "business" to avoid matching "type of business"
- **maps_address**: Prioritizes maps-related headers
- **address**: Only matches non-maps address headers
- **town**: Added detection for town field
- **typeOfBusiness**: Matches "business" or "type"

## Excel Export Column Order (from Scraper)
The scraper now exports Excel files with these columns in order:
1. **maps_address** - Google Maps URL
2. **Name** - Business name
3. **Phone** - Phone number
4. **Provider** - Telecom provider
5. **Address** - Physical address
6. **Type of Business** - Industry/category
7. **Town** - Town/city

## Field Mapping in Import
The Excel importer now correctly maps these to lead fields:
- `maps_address` → `mapsAddress` (Maps URL)
- `Name` → `name`
- `Phone` → `phone`
- `Provider` → `provider`
- `Address` → `address` (Physical address)
- `Type of Business` → `typeOfBusiness`
- `Town` → `town`
- (Optional) `notes` → `notes`

## Testing

### Test Case 1: Import Scraper Export
1. Export businesses from scraper to Excel
2. Go to Leads → Import from Excel
3. Upload the exported file
4. Verify field mapping:
   - ✅ `maps_address` → mapsAddress
   - ✅ `Address` → address
   - ✅ `Town` → town
   - ✅ All other fields map correctly

### Test Case 2: Manual Adjustment
1. Upload any Excel file
2. Manually adjust field mappings in the dropdown
3. Verify all fields are available including `town`

### Test Case 3: Import and Verify
1. Import leads from scraper export
2. Check that leads have:
   - Correct Google Maps URLs in maps_address
   - Correct physical addresses in address field
   - Correct town values
   - "Open in Maps" button works
   - Route generation works

## Files Modified

**`hosted-smart-cost-calculator/components/leads/import/ExcelImporter.tsx`**
- Fixed auto-detection logic for field mapping
- Added `town` field to mapping options
- Improved detection specificity for all fields

## Benefits

1. **Seamless Workflow**: Scraper export → Excel → Import to Leads works perfectly
2. **Correct Mapping**: Each field maps to its intended target
3. **No Manual Adjustment**: Auto-detection works correctly out of the box
4. **Complete Fields**: All exported fields are available for mapping
5. **Route Generation**: Maps URLs are correctly imported for route generation
6. **Physical Addresses**: Separate address field for physical location info

## Notes

- The fix maintains backward compatibility with existing Excel files
- Users can still manually adjust mappings if needed
- The auto-detection is smart enough to handle variations in header names
- Required fields (maps_address, name) are clearly marked with asterisks
