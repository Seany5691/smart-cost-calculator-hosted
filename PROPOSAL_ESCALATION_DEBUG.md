# Proposal Current Hardware Escalation - Debug Logging Added

## Issue
User reported that when selecting "Starting Rental" in the settlement section, the "Current Hardware" cost on the generated proposal should calculate the escalated current rental based on years elapsed and escalation rate.

## Investigation
The code logic is **already correct** and matches the old app exactly:

### How It Works

1. **Current Rental Type**: Uses the rental amount directly
   ```typescript
   if (inputs.rentalType === 'current') {
     currentHardwareRental = inputs.rentalAmount;
   }
   ```

2. **Starting Rental Type**: Calculates escalated current rental
   ```typescript
   else if (inputs.rentalType === 'starting' && inputs.startDate && inputs.escalationRate) {
     const startDate = new Date(inputs.startDate);
     const currentDate = new Date();
     const escalation = inputs.escalationRate / 100;
     
     // Calculate years elapsed
     const yearsElapsed = Math.floor(
       (currentDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
     );
     
     // Apply compound escalation
     currentHardwareRental = inputs.rentalAmount * Math.pow(1 + escalation, yearsElapsed);
   }
   ```

### Example Calculation
- Starting Rental: R 1,000
- Start Date: January 1, 2020
- Current Date: January 22, 2026
- Years Elapsed: 6 years
- Escalation Rate: 10%
- **Current Hardware Rental** = R 1,000 × (1.10)^6 = **R 1,771.56**

## Debug Logging Added

Added comprehensive console logging to help diagnose any issues:

1. **Settlement Details Check**
   - Logs if settlement > 0
   - Logs if calculatorInputs exist
   - Shows full calculatorInputs object

2. **Calculator Inputs Details**
   - rentalType (current vs starting)
   - rentalAmount
   - startDate
   - escalationRate

3. **Escalation Calculation**
   - Start date and current date
   - Years elapsed
   - Escalation rate percentage
   - Starting rental amount
   - Final calculated current rental

## Testing Steps

1. Open browser console (F12)
2. Go to Calculator
3. Enter settlement details with "Starting Rental"
4. Click "Calculate Settlement"
5. Complete all calculator steps
6. Click "Generate Proposal"
7. Check console logs for escalation calculation

## Expected Console Output

```
[ProposalGenerator] Settlement Details: {
  settlement: 50000,
  hasCalculatorInputs: true,
  calculatorInputs: { startDate, rentalType, rentalAmount, escalationRate, rentalTerm }
}

[ProposalGenerator] Calculator Inputs: {
  rentalType: "starting",
  rentalAmount: 1000,
  startDate: "2020-01-01T00:00:00.000Z",
  escalationRate: 10
}

[ProposalGenerator] Escalation calculation: {
  startDate: "2020-01-01T00:00:00.000Z",
  currentDate: "2026-01-22T...",
  yearsElapsed: 6,
  escalationRate: 10,
  startingRental: 1000
}

[ProposalGenerator] Calculated current rental with escalation: 1771.56
```

## Files Modified
- `hosted-smart-cost-calculator/components/calculator/ProposalGenerator.tsx`

## Status
✅ Debug logging added - Ready for testing to identify any data flow issues
