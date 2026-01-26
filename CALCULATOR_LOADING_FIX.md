# Calculator Loading Issue - FIXED

## Problem
The calculator was stuck on "Loading calculator configuration..." indefinitely because:
1. The `CalculatorWizard.tsx` component was blocking on `isLoadingFactors` and `isLoadingScales`
2. The factors and scales API endpoints (`/api/config/factors` and `/api/config/scales`) don't exist yet
3. The loading logic prevented the calculator UI from rendering until these endpoints succeeded

## Solution
Modified `CalculatorWizard.tsx` to:

### 1. Non-Blocking Configuration Loading
- Changed the initialization logic to only block on **core configs** (hardware, connectivity, licensing)
- Made factors and scales loading **non-blocking** - if they fail, the calculator still loads
- The calculator will use mock/default data for calculations until real API endpoints exist

### 2. Warning Banner Instead of Blocking
- Added a warning banner that displays when factors/scales fail to load
- The banner informs users that the calculator is using mock data
- Users can still interact with all calculator features

### 3. Improved Loading States
```typescript
// Only block on core configs needed for UI
const isLoading = isLoadingHardware || isLoadingConnectivity || isLoadingLicensing;

// Check for factors/scales warning (non-blocking)
const hasFactorsScalesWarning = !isLoadingFactors && !isLoadingScales && (!factors || !scales);
```

## Changes Made

### File: `hosted-smart-cost-calculator/components/calculator/CalculatorWizard.tsx`

1. **Updated initialization logic** (lines ~50-75):
   - Core configs (hardware, connectivity, licensing) load first and block if they fail
   - Factors and scales load separately in a try-catch that doesn't block
   - Only shows error state if core configs fail

2. **Updated loading check** (lines ~177-180):
   - Changed from blocking on factors/scales to blocking only on core configs
   - Added check for factors/scales warning state

3. **Added warning banner** (lines ~215-228):
   - Displays when factors/scales are missing
   - Explains that mock data will be used
   - Doesn't prevent calculator usage

## Result
✅ Calculator now loads successfully even without factors/scales API endpoints
✅ Users can interact with all calculator steps
✅ Clear warning shown when using mock data
✅ No more infinite loading screen

## Next Steps
To fully resolve the warning banner, implement:
1. `/api/config/factors` endpoint - returns factor sheets for calculations
2. `/api/config/scales` endpoint - returns sliding scales for installation, finance fees, and gross profit

Until then, the calculator will work with mock data and show the warning banner.
