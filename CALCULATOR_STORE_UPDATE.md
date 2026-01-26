# Calculator Store Structure Update

## Summary

Updated the calculator store structure to match the old app's data structure and support 100% feature parity for the calculator migration.

## Changes Made

### 1. DealDetails Interface
- ✅ Added `customGrossProfit?: number` field to support custom gross profit override

### 2. Settlement Calculation Types (NEW)
- ✅ Added `SettlementCalculation` interface with fields:
  - `year: number`
  - `amount: number`
  - `monthsRemaining: number`
  - `isCompleted: boolean`
  - `startDate: Date`
  - `endDate: Date`

- ✅ Added `SettlementDetails` interface with fields:
  - `useCalculator: boolean` - Toggle between manual and calculator mode
  - `manualAmount: number` - Manual settlement amount
  - `calculatorInputs?` - Optional calculator inputs:
    - `startDate: Date`
    - `rentalType: 'starting' | 'current'`
    - `rentalAmount: number`
    - `escalationRate: 0 | 5 | 10 | 15`
    - `rentalTerm: 12 | 24 | 36 | 48 | 60`
  - `calculatedBreakdown?: SettlementCalculation[]` - Year-by-year breakdown
  - `calculatedTotal?: number` - Total calculated settlement

### 3. Selected Item Interfaces
- ✅ Added `isTemporary?: boolean` to `SelectedHardwareItem`
- ✅ Added `showOnProposal?: boolean` to `SelectedHardwareItem`
- ✅ Added `isTemporary?: boolean` to `SelectedConnectivityItem`
- ✅ Added `showOnProposal?: boolean` to `SelectedConnectivityItem`
- ✅ Changed `SelectedLicensingItem` to use `selectedQuantity` instead of `quantity`
- ✅ Added `isTemporary?: boolean` to `SelectedLicensingItem`
- ✅ Added `showOnProposal?: boolean` to `SelectedLicensingItem`

### 4. SectionsData Interface
- ✅ Updated `licensing` field type from `LicensingItem[]` to `SelectedLicensingItem[]`

### 5. TotalsData Interface
- ✅ Added `extensionCount: number` field
- ✅ Added `financeAmount: number` field
- ✅ Added `factor: number` field
- ✅ Added `totalExVAT: number` field

### 6. CalculatorState Interface
- ✅ Added `settlementDetails: SettlementDetails` field
- ✅ Added `setSettlementDetails: (details: Partial<SettlementDetails>) => void` action

### 7. Store Implementation
- ✅ Created `initialSettlementDetails` constant
- ✅ Updated `initialTotalsData` to include new fields
- ✅ Added `settlementDetails` to initial state
- ✅ Implemented `setSettlementDetails` action
- ✅ Updated `addLicensingItem` to use `selectedQuantity`
- ✅ Updated `updateLicensingQuantity` to use `selectedQuantity`
- ✅ Updated `saveDeal` to include `settlementDetails`
- ✅ Updated `loadDeal` to restore `settlementDetails`
- ✅ Updated `resetCalculator` to reset `settlementDetails`
- ✅ Updated `generatePDF` to include `settlementDetails`
- ✅ Updated persist `partialize` to include `settlementDetails`

## TypeScript Validation

All changes have been validated with TypeScript diagnostics - no errors found.

## Requirements Satisfied

This update satisfies the following requirements from the spec:
- **Requirement 2.1**: Deal details structure with custom gross profit
- **Requirement 6.1-6.14**: Settlement calculation with both manual and calculator modes
- **Requirement 8.4**: Original user context preservation (already existed)
- **Requirement 8.5**: Deal persistence with all state (now includes settlement details)
- **Requirement 9.1-9.8**: Temporary items management with `isTemporary` and `showOnProposal` flags

## Next Steps

The store structure is now ready for:
1. Implementation of core calculation functions (Task 2)
2. Settlement calculation logic (Task 9)
3. Component updates to use the new fields (Tasks 10-15)
4. Deal persistence API updates to handle new fields (Task 17)
