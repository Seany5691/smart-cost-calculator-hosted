# Task 3.1 Implementation: Sliding Scale Lookup Function

## Overview

Task 3.1 from the calculator-migration-parity spec has been completed. The sliding scale lookup function was already implemented in `lib/calculator.ts` as `getSlidingScaleBand()`, but has been enhanced with better error handling and comprehensive test coverage.

## Implementation Details

### Function: `getSlidingScaleBand()`

**Location**: `hosted-smart-cost-calculator/lib/calculator.ts`

**Purpose**: Selects the appropriate sliding scale band based on extension count and applies role-based pricing.

**Signature**:
```typescript
export function getSlidingScaleBand(
  extensionCount: number,
  bands: {
    [key: string]: { cost: number; managerCost: number; userCost: number };
  },
  role: UserRole
): number
```

**Band Selection Logic**:
- `0-4`: For extension counts 0 through 4
- `5-8`: For extension counts 5 through 8
- `9-16`: For extension counts 9 through 16
- `17-32`: For extension counts 17 through 32
- `33+`: For extension counts 33 and above

**Role-Based Pricing**:
- `admin`: Returns `cost` field
- `manager`: Returns `managerCost` field
- `user`: Returns `userCost` field

### Enhancements Made

1. **Flexible Type Signature**: Changed from strict literal types to index signature to work with the `Scales` type from config store
2. **Error Handling**: Added fallback to `33+` band and throws descriptive error if band is missing
3. **Comprehensive Testing**: Created 35 unit tests covering all scenarios

### Related Function: `getFinanceFeeBand()`

Also enhanced the finance fee band selection function with the same improvements:

**Band Selection Logic**:
- `0-20000`: For amounts 0 through 20,000
- `20001-50000`: For amounts 20,001 through 50,000
- `50001-100000`: For amounts 50,001 through 100,000
- `100001+`: For amounts 100,001 and above

## Test Coverage

**Test File**: `hosted-smart-cost-calculator/__tests__/lib/sliding-scale.test.ts`

### Test Categories

1. **Band Selection Tests** (10 tests)
   - Tests all boundary values (0, 4, 5, 8, 9, 16, 17, 32, 33, 100)
   - Ensures correct band is selected for each extension count

2. **Role-Based Pricing Tests** (3 tests)
   - Verifies admin gets `cost`
   - Verifies manager gets `managerCost`
   - Verifies user gets `userCost`

3. **Edge Cases** (5 tests)
   - Middle values within each band
   - Very large extension counts
   - Missing band error handling

4. **All Bands Coverage** (1 test)
   - Comprehensive test ensuring all bands are correctly selected

### Finance Fee Band Tests

Similar test structure for `getFinanceFeeBand()` with 16 additional tests covering:
- All payout amount boundaries
- Role-based pricing for finance fees
- Edge cases and error handling

## Test Results

```
✓ 35 tests passed in sliding-scale.test.ts
✓ 30 tests passed in calculator-formulas.test.ts (existing tests still pass)
✓ 15 tests passed in role-based-pricing.test.ts (existing tests still pass)
```

**Total**: 80 tests passing, 0 failures

## Requirements Satisfied

✅ **Requirement 7.4**: Installation cost sliding scale
- Implements band selection: [0-4], [5-8], [9-16], [17-32], [33+]
- Applies role-based pricing to selected band
- Used by `calculateInstallation()` function

✅ **Requirement 7.7**: Gross profit sliding scale
- Same function used for gross profit calculation
- Used by `calculateGrossProfit()` function

✅ **Requirement 7.9**: Finance fee band selection
- Implements band selection: [0-20k], [20k-50k], [50k-100k], [100k+]
- Applies role-based pricing to selected band
- Used by `calculateFinanceFee()` function

✅ **Requirement 10.1-10.11**: Role-based pricing
- Correctly applies admin, manager, and user pricing
- Consistent across all calculation functions

## Integration

The sliding scale lookup function is integrated into the calculator system:

1. **Installation Cost**: `calculateInstallation()` uses `getSlidingScaleBand()` with `scales.installation`
2. **Gross Profit**: `calculateGrossProfit()` uses `getSlidingScaleBand()` with `scales.gross_profit`
3. **Finance Fee**: `calculateFinanceFee()` uses `getFinanceFeeBand()` with `scales.finance_fee`

All functions work together in `calculateAllTotals()` to produce complete deal calculations.

## Files Modified

1. `hosted-smart-cost-calculator/lib/calculator.ts`
   - Enhanced `getSlidingScaleBand()` with flexible types and error handling
   - Enhanced `getFinanceFeeBand()` with flexible types and error handling

## Files Created

1. `hosted-smart-cost-calculator/__tests__/lib/sliding-scale.test.ts`
   - Comprehensive unit tests for sliding scale functions
   - 35 tests covering all scenarios

## Next Steps

Task 3.1 is complete. The next task in the implementation plan is:

**Task 3.2**: Write property test for sliding scale selection
- Property 7: Installation Sliding Scale Selection
- Validates: Requirements 7.4

This is an optional property-based test task that can be implemented using fast-check to verify the sliding scale selection works correctly across randomized inputs.
