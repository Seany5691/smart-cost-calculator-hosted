# Proposal Current Hardware Rental Fix - COMPLETE

## Issue
The "Generate Proposal" function was not updating the "Current Hardware" cost on the generated proposal. The settlement rental amount from the calculator was not being mapped correctly.

## Root Cause
The new app's `SettlementStep` component was only updating `settlementDetails` but never updating `dealDetails.settlement`. This caused the ProposalGenerator's condition check to fail:

```typescript
if (dealDetails.settlement > 0 && settlementDetails.calculatorInputs) {
  // This condition was always false because dealDetails.settlement was 0
}
```

## Solution
Updated `SettlementStep.tsx` to sync settlement amounts to both `settlementDetails` AND `dealDetails.settlement`:

### 1. Calculator Mode (lines 67-103)
When the settlement calculator is used, after calculating the settlement:
```typescript
// Update settlementDetails (existing)
setSettlementDetails({
  calculatorInputs: { ... },
  calculatedBreakdown: [ ... ],
  calculatedTotal: result.totalSettlement,
});

// NEW: Also update dealDetails.settlement for proposal generation
const { setDealDetails } = useCalculatorStore.getState();
setDealDetails({ settlement: result.totalSettlement });
```

### 2. Manual Mode (lines 48-61)
When manual settlement is entered:
```typescript
setSettlementDetails({ manualAmount: numValue });

// NEW: Also update dealDetails.settlement for proposal generation
const { setDealDetails } = useCalculatorStore.getState();
setDealDetails({ settlement: numValue });
```

## How It Works Now
1. User enters settlement details in Settlement step
2. Settlement amount is saved to BOTH:
   - `settlementDetails.calculatedTotal` (or `manualAmount`)
   - `dealDetails.settlement`
3. When generating proposal, ProposalGenerator checks:
   - `dealDetails.settlement > 0` ✅ (now has value)
   - `settlementDetails.calculatorInputs` ✅ (has rental details)
4. Current hardware rental is calculated correctly:
   - If `rentalType === 'current'`: uses `rentalAmount` directly
   - If `rentalType === 'starting'`: calculates current rental with escalation

## Behavior Matches Old App
The new app now works EXACTLY like the old app:
- Old app: Updates `dealDetails.settlement` in SettlementSection (line 106-120)
- New app: Updates `dealDetails.settlement` in SettlementStep (lines 67-103, 48-61)

## Files Modified
- `hosted-smart-cost-calculator/components/calculator/SettlementStep.tsx`

## Testing
To verify the fix:
1. Go to Calculator
2. Enter settlement details (either calculator or manual)
3. Complete all steps
4. Generate Proposal
5. Check the "Current Hardware" field in the PDF - it should now show the correct rental amount

## Status
✅ COMPLETE - Settlement data now syncs correctly for proposal generation
