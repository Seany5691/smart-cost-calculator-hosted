# Admin Config Excel Import/Export Implementation

## Overview
This document outlines the implementation of Excel import/export functionality for:
- Hardware Config
- Licensing Config  
- Connectivity Config
- Factors Config

The implementation follows the same field mapping pattern used in the Leads Excel import system.

## Analysis Summary

### Current Data Structures

#### Hardware Config
```typescript
interface HardwareItem {
  id: string;
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  quantity: number;
  locked: boolean;
  isExtension: boolean;
  isActive: boolean;
  displayOrder: number;
}
```

#### Licensing Config
```typescript
interface LicensingItem {
  id: string;
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  quantity: number;
  locked: boolean;
  isActive: boolean;
  displayOrder: number;
}
```

#### Connectivity Config
```typescript
interface ConnectivityItem {
  id: string;
  name: string;
  cost: number;
  managerCost: number;
  userCost: number;
  quantity: number;
  locked: boolean;
  isActive: boolean;
  displayOrder: number;
}
```

#### Factors Config
```typescript
interface EnhancedFactorData {
  cost: { [term: string]: { [escalation: string]: { [range: string]: number } } };
  managerFactors: { [term: string]: { [escalation: string]: { [range: string]: number } } };
  userFactors: { [term: string]: { [escalation: string]: { [range: string]: number } } };
}
```

## Implementation Plan

### Phase 1: Create Reusable Excel Importer Component

**File:** `hosted-smart-cost-calculator/components/admin/ConfigExcelImporter.tsx`

This component will:
- Handle file upload (drag & drop + file picker)
- Parse Excel/CSV files
- Auto-detect field mapping
- Allow manual field mapping adjustment
- Preview data before import
- Support different config types (hardware, licensing, connectivity, factors)

### Phase 2: Create Export Functionality

**File:** `hosted-smart-cost-calculator/lib/admin/excel-export.ts`

This utility will:
- Export current config data to Excel format
- Include proper headers
- Format data for easy re-import
- Support all config types

### Phase 3: Create API Endpoints

#### Hardware Import/Export
- `POST /api/config/hardware/import` - Import hardware items from Excel
- `GET /api/config/hardware/export` - Export hardware items to Excel

#### Licensing Import/Export
- `POST /api/config/licensing/import` - Import licensing items from Excel
- `GET /api/config/licensing/export` - Export licensing items to Excel

#### Connectivity Import/Export
- `POST /api/config/connectivity/import` - Import connectivity items from Excel
- `GET /api/config/connectivity/export` - Export connectivity items to Excel

#### Factors Import/Export
- `POST /api/config/factors/import` - Import factors from Excel
- `GET /api/config/factors/export` - Export factors to Excel

### Phase 4: Update Config Components

Add Import/Export buttons to each config component:
- HardwareConfig.tsx
- LicensingConfig.tsx
- ConnectivityConfig.tsx
- FactorsConfig.tsx

## Field Mapping Specifications

### Hardware Config Mapping
```typescript
const hardwareFieldMap = {
  'name': ['Name', 'Item Name', 'Hardware Name', 'Product'],
  'cost': ['Cost', 'Price', 'Base Cost', 'Base Price'],
  'managerCost': ['Manager Cost', 'Manager Price', 'ManagerCost'],
  'userCost': ['User Cost', 'User Price', 'UserCost'],
  'isExtension': ['Is Extension', 'Extension', 'IsExtension', 'Type'],
  'locked': ['Locked', 'Is Locked', 'IsLocked']
};
```

### Licensing Config Mapping
```typescript
const licensingFieldMap = {
  'name': ['Name', 'License Name', 'Product Name', 'Item'],
  'cost': ['Cost', 'Price', 'Base Cost', 'Base Price'],
  'managerCost': ['Manager Cost', 'Manager Price', 'ManagerCost'],
  'userCost': ['User Cost', 'User Price', 'UserCost'],
  'locked': ['Locked', 'Is Locked', 'IsLocked']
};
```

### Connectivity Config Mapping
```typescript
const connectivityFieldMap = {
  'name': ['Name', 'Service Name', 'Connectivity Name', 'Item'],
  'cost': ['Cost', 'Price', 'Base Cost', 'Base Price'],
  'managerCost': ['Manager Cost', 'Manager Price', 'ManagerCost'],
  'userCost': ['User Cost', 'User Price', 'UserCost'],
  'locked': ['Locked', 'Is Locked', 'IsLocked']
};
```

### Factors Config Mapping
For factors, the Excel format will be:
```
Term | Escalation | Range | Cost Factor | Manager Factor | User Factor
36_months | 0% | 0-20000 | 0.03814 | 0.04195 | 0.04576
36_months | 0% | 20001-50000 | 0.03814 | 0.04195 | 0.04576
...
```

## Excel Template Format

### Hardware/Licensing/Connectivity Template
```
Name | Cost | Manager Cost | User Cost | Locked | Is Extension (Hardware only)
Item 1 | 100.00 | 110.00 | 120.00 | FALSE | FALSE
Item 2 | 200.00 | 220.00 | 240.00 | FALSE | TRUE
```

### Factors Template
```
Term | Escalation | Range | Cost Factor | Manager Factor | User Factor
36_months | 0% | 0-20000 | 0.03814 | 0.04195 | 0.04576
36_months | 0% | 20001-50000 | 0.03814 | 0.04195 | 0.04576
36_months | 0% | 50001-100000 | 0.03814 | 0.04195 | 0.04576
36_months | 0% | 100000+ | 0.03814 | 0.04195 | 0.04576
36_months | 10% | 0-20000 | 0.03814 | 0.04195 | 0.04576
...
```

## Import Behavior

### For Hardware/Licensing/Connectivity:
1. **Update existing items** if name matches (case-insensitive)
2. **Create new items** if name doesn't exist
3. **Preserve displayOrder** for existing items
4. **Auto-assign displayOrder** for new items
5. **Validate** all numeric fields
6. **Skip** rows with missing required fields (name, cost)

### For Factors:
1. **Replace all factors** with imported data
2. **Validate** term, escalation, and range values
3. **Ensure** all required combinations are present
4. **Validate** factor values are positive numbers

## Export Behavior

### For Hardware/Licensing/Connectivity:
1. Export only **active items** (isActive = true)
2. Sort by **displayOrder**
3. Include all fields except **id** and **isActive**
4. Format numbers to **2 decimal places**
5. Convert booleans to **TRUE/FALSE**

### For Factors:
1. Export all three factor types in **separate sheets**
2. Include **term, escalation, range** as identifiers
3. Format factor values to **6 decimal places**
4. Sort by **term, then escalation, then range**

## User Experience Flow

### Import Flow:
1. User clicks "Import from Excel" button
2. Modal opens with file upload area
3. User drags/drops or selects Excel file
4. System parses file and shows preview
5. System auto-detects field mapping
6. User can adjust field mapping if needed
7. User clicks "Import" button
8. System validates and imports data
9. Success message shown with count of items imported/updated
10. Config table refreshes with new data

### Export Flow:
1. User clicks "Export to Excel" button
2. System generates Excel file with current data
3. File downloads automatically
4. Filename includes config type and timestamp
   - `hardware-config-2026-01-20.xlsx`
   - `licensing-config-2026-01-20.xlsx`
   - `connectivity-config-2026-01-20.xlsx`
   - `factors-config-2026-01-20.xlsx`

## Error Handling

### Import Errors:
- **Invalid file format**: Show error, allow re-upload
- **Missing required fields**: Show which rows/fields are missing
- **Invalid data types**: Show which rows have invalid data
- **Duplicate names**: Show warning, allow user to choose update/skip
- **Database errors**: Show error message, rollback transaction

### Export Errors:
- **No data to export**: Show info message
- **Generation failed**: Show error message, allow retry

## Mobile Responsiveness

All import/export functionality will be fully responsive:
- **Mobile**: Full-screen modal, vertical layout, touch-friendly buttons
- **Tablet**: Adaptive layout, optimized for touch
- **Desktop**: Standard modal, horizontal layout

## Security Considerations

1. **Authentication**: All import/export endpoints require valid JWT token
2. **Authorization**: Only admin and super_admin roles can import/export
3. **File validation**: Strict file type and size validation
4. **Data validation**: Comprehensive validation before database operations
5. **Rate limiting**: Prevent abuse of import/export endpoints
6. **Audit logging**: Log all import/export operations with user info

## Testing Requirements

### Unit Tests:
- Field mapping detection
- Data validation
- Excel parsing
- Excel generation

### Integration Tests:
- Full import flow
- Full export flow
- Error scenarios
- Data integrity

### Manual Testing:
- Upload various Excel formats
- Test field mapping adjustments
- Verify data accuracy after import
- Test export and re-import cycle
- Test mobile responsiveness

## Implementation Priority

1. **Phase 1**: Hardware Config (most complex with isExtension field)
2. **Phase 2**: Licensing Config (similar to hardware)
3. **Phase 3**: Connectivity Config (similar to hardware/licensing)
4. **Phase 4**: Factors Config (unique structure, most complex)

## Next Steps

1. Create ConfigExcelImporter component
2. Create excel-export utility
3. Create API endpoints for each config type
4. Update config components with import/export buttons
5. Test thoroughly on mobile and desktop
6. Document usage for end users

## Notes

- **DO NOT** modify any existing functionality
- **DO NOT** change any existing component behavior
- **ONLY ADD** new import/export features
- **PRESERVE** all current mobile and desktop functionality
- **MAINTAIN** existing styling and UI patterns
- **FOLLOW** the exact same pattern as leads Excel import
