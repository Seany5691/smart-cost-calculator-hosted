import type { Scales, FactorSheet } from './store/config';

export type UserRole = 'admin' | 'manager' | 'user';

/**
 * Safe calculation wrapper that handles errors gracefully
 * Requirement 16.6, 18.5: Calculation error handling with fallback values
 * 
 * @param fn - Calculation function to execute
 * @param fallbackValue - Value to return if calculation fails (default: 0)
 * @param context - Context string for error logging
 * @returns Calculation result or fallback value
 */
export function safeCalculate<T extends number>(
  fn: () => T,
  fallbackValue: T = 0 as T,
  context: string = 'calculation'
): T {
  try {
    const result = fn();
    
    // Requirement 18.5: Ensure all numeric values are valid numbers (not NaN or Infinity)
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      console.error(`[${context}] Invalid calculation result:`, result);
      console.warn(`[${context}] Using fallback value:`, fallbackValue);
      return fallbackValue;
    }
    
    return result;
  } catch (error) {
    console.error(`[${context}] Calculation error:`, error);
    console.warn(`[${context}] Using fallback value:`, fallbackValue);
    return fallbackValue;
  }
}

/**
 * Get the appropriate price based on user role
 * Requirement 10.1-10.11: Role-based pricing
 * IMPORTANT: Admin uses MANAGER pricing (not cost pricing) for hardware, connectivity, and licensing
 * 
 * @param item - Item with cost, managerCost, and userCost fields
 * @param role - User role (admin, manager, or user)
 * @returns The appropriate price for the role
 */
export function getRolePrice(
  item: { cost: number; managerCost: number; userCost: number },
  role: UserRole
): number {
  switch (role) {
    case 'admin':
      return item.managerCost; // Admin uses manager pricing
    case 'manager':
      return item.managerCost;
    case 'user':
      return item.userCost;
    default:
      return item.userCost;
  }
}

/**
 * Get the appropriate price based on user role (legacy alias)
 * @deprecated Use getRolePrice instead
 */
export function getRolePriceFromScaleBand(
  band: { cost: number; managerCost: number; userCost: number },
  role: UserRole
): number {
  return getRolePrice(band, role);
}

/**
 * Get the appropriate sliding scale band based on extension count
 * Requirement 7.4, 7.7: Sliding scale for installation and gross profit
 * 
 * @param extensionCount - Number of extension points
 * @param bands - Sliding scale bands object - can be nested structure or flat
 * @param role - User role (admin, manager, or user)
 * @returns The appropriate price for the extension count and role
 */
export function getSlidingScaleBand(
  extensionCount: number,
  bands: any,
  role: UserRole
): number {
  let bandKey: string;
  
  // Determine which band to use based on extension count
  if (extensionCount >= 0 && extensionCount <= 4) {
    bandKey = '0-4';
  } else if (extensionCount >= 5 && extensionCount <= 8) {
    bandKey = '5-8';
  } else if (extensionCount >= 9 && extensionCount <= 16) {
    bandKey = '9-16';
  } else if (extensionCount >= 17 && extensionCount <= 32) {
    bandKey = '17-32';
  } else {
    bandKey = '33+';
  }
  
  // Debug logging
  console.log('[getSlidingScaleBand] Extension count:', extensionCount);
  console.log('[getSlidingScaleBand] Band key:', bandKey);
  console.log('[getSlidingScaleBand] Bands structure:', JSON.stringify(bands, null, 2));
  
  // Check if this is the nested structure from ScalesConfig
  // Structure: { cost: {...}, managerCost: {...}, userCost: {...} }
  if (bands.cost && bands.managerCost && bands.userCost) {
    console.log('[getSlidingScaleBand] Using nested structure');
    let roleBands: any;
    
    // Select the appropriate role-based bands
    if (role === 'admin' || role === 'manager') {
      roleBands = bands.managerCost;
    } else {
      roleBands = bands.userCost;
    }
    
    console.log('[getSlidingScaleBand] Role bands:', roleBands);
    console.log('[getSlidingScaleBand] Looking for band:', bandKey);
    
    // Get the value from the role-specific bands
    const value = roleBands[bandKey];
    
    if (value === undefined || value === null) {
      console.error('[getSlidingScaleBand] ERROR: Band not found in role bands!');
      console.error('[getSlidingScaleBand] Available bands:', Object.keys(roleBands));
      throw new Error(`Sliding scale band ${bandKey} not found for extension count: ${extensionCount}`);
    }
    
    console.log('[getSlidingScaleBand] Found value:', value);
    return typeof value === 'string' ? parseFloat(value) : value;
  }
  
  // Fallback to old flat structure
  console.log('[getSlidingScaleBand] Using flat structure');
  const band = bands[bandKey] || bands['33+'] || bands['0-4'];
  
  if (!band) {
    console.error('[getSlidingScaleBand] ERROR: No band found!');
    console.error('[getSlidingScaleBand] Tried keys:', [bandKey, '33+', '0-4']);
    console.error('[getSlidingScaleBand] All bands:', bands);
    throw new Error(`Sliding scale band not found for extension count: ${extensionCount}. Available bands: ${Object.keys(bands).join(', ')}`);
  }
  
  return getRolePrice(band, role);
}

/**
 * Get the appropriate finance fee band based on total payout amount
 * Requirement 7.9: Finance fee lookup
 * 
 * @param totalPayout - Total payout amount
 * @param bands - Finance fee bands object - can be nested structure or flat
 * @param role - User role (admin, manager, or user)
 * @returns The appropriate finance fee for the payout amount and role
 */
export function getFinanceFeeBand(
  totalPayout: number,
  bands: any,
  role: UserRole
): number {
  let bandKey: string;
  
  // Determine which band to use based on total payout
  if (totalPayout >= 0 && totalPayout <= 20000) {
    bandKey = '0-20000';
  } else if (totalPayout >= 20001 && totalPayout <= 50000) {
    bandKey = '20001-50000';
  } else if (totalPayout >= 50001 && totalPayout <= 100000) {
    bandKey = '50001-100000';
  } else {
    bandKey = '100001+';
  }
  
  console.log('[getFinanceFeeBand] Total payout:', totalPayout);
  console.log('[getFinanceFeeBand] Band key:', bandKey);
  console.log('[getFinanceFeeBand] Bands structure:', JSON.stringify(bands, null, 2));
  
  // Check if this is the nested structure from ScalesConfig
  // Structure: { cost: {...}, managerCost: {...}, userCost: {...} }
  if (bands.cost && bands.managerCost && bands.userCost) {
    console.log('[getFinanceFeeBand] Using nested structure');
    let roleBands: any;
    
    // Select the appropriate role-based bands
    if (role === 'admin' || role === 'manager') {
      roleBands = bands.managerCost;
    } else {
      roleBands = bands.userCost;
    }
    
    console.log('[getFinanceFeeBand] Role bands:', roleBands);
    console.log('[getFinanceFeeBand] Looking for band:', bandKey);
    
    // Get the value from the role-specific bands
    const value = roleBands[bandKey];
    
    if (value === undefined || value === null) {
      console.error('[getFinanceFeeBand] ERROR: Band not found in role bands!');
      console.error('[getFinanceFeeBand] Available bands:', Object.keys(roleBands));
      throw new Error(`Finance fee band ${bandKey} not found for payout amount: ${totalPayout}`);
    }
    
    console.log('[getFinanceFeeBand] Found value:', value);
    return typeof value === 'string' ? parseFloat(value) : value;
  }
  
  // Fallback to old flat structure
  console.log('[getFinanceFeeBand] Using flat structure');
  const band = bands[bandKey] || bands['100001+'];
  
  if (!band) {
    throw new Error(`Finance fee band not found for payout amount: ${totalPayout}`);
  }
  
  return getRolePrice(band, role);
}

/**
 * Calculate installation cost based on extension point count using sliding scale
 * Requirement 3.9: Installation cost sliding scale
 */
export function calculateInstallation(
  extensionCount: number,
  scales: Scales,
  role: UserRole
): number {
  return getSlidingScaleBand(extensionCount, scales.installation, role);
}

/**
 * Calculate extension cost
 * Requirement 3.10: Extension cost = extension points × cost_per_point
 */
export function calculateExtensionCost(
  extensionCount: number,
  scales: Scales,
  role: UserRole
): number {
  const { additional_costs } = scales;
  
  console.log('[calculateExtensionCost] Extension count:', extensionCount);
  console.log('[calculateExtensionCost] Additional costs:', additional_costs);
  console.log('[calculateExtensionCost] Role:', role);
  
  let costPerPoint;
  switch (role) {
    case 'admin':
    case 'manager':
      costPerPoint = additional_costs.manager_cost_per_point;
      break;
    case 'user':
      costPerPoint = additional_costs.user_cost_per_point;
      break;
    default:
      costPerPoint = additional_costs.user_cost_per_point;
  }
  
  console.log('[calculateExtensionCost] Cost per point:', costPerPoint);
  const result = extensionCount * costPerPoint;
  console.log('[calculateExtensionCost] Result:', result);
  
  return result;
}

/**
 * Calculate fuel cost
 * Requirement 3.11: Fuel cost = distance × cost_per_kilometer
 */
export function calculateFuelCost(
  distance: number,
  scales: Scales,
  role: UserRole
): number {
  const { additional_costs } = scales;
  
  console.log('[calculateFuelCost] Distance:', distance);
  console.log('[calculateFuelCost] Additional costs:', additional_costs);
  console.log('[calculateFuelCost] Role:', role);
  
  let costPerKm;
  switch (role) {
    case 'admin':
    case 'manager':
      costPerKm = additional_costs.manager_cost_per_kilometer;
      break;
    case 'user':
      costPerKm = additional_costs.user_cost_per_kilometer;
      break;
    default:
      costPerKm = additional_costs.user_cost_per_kilometer;
  }
  
  console.log('[calculateFuelCost] Cost per km:', costPerKm);
  const result = distance * costPerKm;
  console.log('[calculateFuelCost] Result:', result);
  
  return result;
}

/**
 * Calculate representative settlement
 * Requirement 3.12: (hardware + installation) × (1 + escalation/100)^(term/12)
 */
export function calculateRepresentativeSettlement(
  hardwareTotal: number,
  installationTotal: number,
  term: number,
  escalation: number
): number {
  const base = hardwareTotal + installationTotal;
  const escalationFactor = Math.pow(1 + escalation / 100, term / 12);
  return base * escalationFactor;
}

/**
 * Calculate actual settlement
 * Requirement 3.13: representative settlement + (MRC total × term)
 */
export function calculateActualSettlement(
  representativeSettlement: number,
  mrcTotal: number,
  term: number
): number {
  return representativeSettlement + (mrcTotal * term);
}

/**
 * Calculate finance fee with tiering
 * Requirement 3.14: Tiered fees based on total payout
 */
export function calculateFinanceFee(
  totalPayout: number,
  scales: Scales,
  role: UserRole
): number {
  return getFinanceFeeBand(totalPayout, scales.finance_fee, role);
}

/**
 * Calculate finance fee with iteration until convergence
 * Requirement 7.8: Iteratively recalculate until fee stabilizes (max 10 iterations)
 * 
 * Start with base payout = hardware + installation + gross profit + settlement
 * Iterate: calculate fee based on (base + fee)
 * Stop when fee stabilizes or after 10 iterations
 * 
 * @param basePayout - Base payout amount (hardware + installation + gross profit + settlement)
 * @param scales - Scales configuration with finance fee bands
 * @param role - User role (admin, manager, or user)
 * @param maxIterations - Maximum number of iterations (default: 10)
 * @returns Object with financeFee, totalPayout, and iterations count
 */
export function calculateFinanceFeeIterative(
  basePayout: number,
  scales: Scales,
  role: UserRole,
  maxIterations: number = 10
): { financeFee: number; totalPayout: number; iterations: number } {
  let financeFee = 0;
  let totalPayout = basePayout;
  let previousFee = -1;
  let iterations = 0;
  
  while (iterations < maxIterations && financeFee !== previousFee) {
    previousFee = financeFee;
    totalPayout = basePayout + financeFee;
    financeFee = getFinanceFeeBand(totalPayout, scales.finance_fee, role);
    iterations++;
  }
  
  return { financeFee, totalPayout, iterations };
}

/**
 * Calculate gross profit using sliding scale
 * Requirement 3.16: Sliding scale based on extension count
 */
export function calculateGrossProfit(
  extensionCount: number,
  scales: Scales,
  role: UserRole,
  customProfit?: number
): number {
  // If custom profit is set, use it
  if (customProfit !== undefined && customProfit !== null) {
    return customProfit;
  }
  
  return getSlidingScaleBand(extensionCount, scales.gross_profit, role);
}

/**
 * Look up factor from factor sheet
 * Requirement 7.11: Factor lookup using term, escalation, and finance amount
 * 
 * Selects factor table based on role:
 * - Admin/Manager: use managerFactors (or cost for simple structure)
 * - User: use userFactors (or simple structure)
 * 
 * @param term - Contract term in months (36, 48, or 60)
 * @param escalation - Escalation rate (0, 10, or 15)
 * @param financeAmount - Finance amount to find the correct settlement band
 * @param factors - Factor sheet (simple or enhanced structure)
 * @param role - User role (admin, manager, or user)
 * @returns Factor value for the given parameters
 */
export function lookupFactor(
  term: number,
  escalation: number,
  financeAmount: number,
  factors: FactorSheet | any,
  role: UserRole
): number {
  console.log('[lookupFactor] ===== FACTOR LOOKUP START =====');
  console.log('[lookupFactor] Term:', term);
  console.log('[lookupFactor] Escalation:', escalation);
  console.log('[lookupFactor] Finance Amount:', financeAmount);
  console.log('[lookupFactor] Role:', role);
  console.log('[lookupFactor] Factors structure:', JSON.stringify(factors, null, 2));
  
  // Determine which factor table to use based on role
  let factorTable: any;
  
  // Check if this is the enhanced factor structure
  if (factors.userFactors || factors.managerFactors || factors.cost) {
    console.log('[lookupFactor] Using enhanced structure');
    // Enhanced structure - select the appropriate factor table based on user role
    // CRITICAL: Admin and Manager should BOTH use managerFactors
    if (role === 'admin' || role === 'manager') {
      factorTable = factors.managerFactors || factors.cost;
      console.log('[lookupFactor] Using managerFactors for', role);
    } else {
      // Regular users use userFactors
      factorTable = factors.userFactors || factors.cost;
      console.log('[lookupFactor] Using userFactors for', role);
    }
  } else {
    // Simple structure - use the factors directly
    console.log('[lookupFactor] Using simple/flat structure');
    factorTable = factors;
  }
  
  console.log('[lookupFactor] Factor table keys:', Object.keys(factorTable));
  
  // Convert term to string key format (e.g., "36_months")
  const termKey = `${term}_months`;
  const escalationKey = `${escalation}%`;
  
  console.log('[lookupFactor] Looking for term key:', termKey);
  console.log('[lookupFactor] Looking for escalation key:', escalationKey);
  
  // Check if term exists
  if (!factorTable[termKey]) {
    console.error('[lookupFactor] ERROR: Term not found!');
    console.error('[lookupFactor] Available terms:', Object.keys(factorTable));
    throw new Error(`Term ${term} not found in factor sheet`);
  }
  
  console.log('[lookupFactor] Term data:', factorTable[termKey]);
  
  // Check if escalation exists
  if (!factorTable[termKey][escalationKey]) {
    console.error('[lookupFactor] ERROR: Escalation not found!');
    console.error('[lookupFactor] Available escalations:', Object.keys(factorTable[termKey]));
    throw new Error(`Escalation ${escalation}% not found for term ${term}`);
  }
  
  console.log('[lookupFactor] Escalation data:', factorTable[termKey][escalationKey]);
  
  // Find the appropriate settlement band
  const bands = factorTable[termKey][escalationKey];
  const bandKeys = Object.keys(bands).sort((a, b) => {
    // Extract numeric values from band keys (e.g., "0-20000" -> 20000)
    const aMax = parseInt(a.split('-')[1] || a.replace('+', ''));
    const bMax = parseInt(b.split('-')[1] || b.replace('+', ''));
    return aMax - bMax;
  });
  
  console.log('[lookupFactor] Available bands:', bandKeys);
  console.log('[lookupFactor] Band values:', bands);
  
  // Find the band that contains the finance amount
  for (const bandKey of bandKeys) {
    if (bandKey.includes('+')) {
      // This is the highest band (e.g., "100000+")
      const minValue = parseInt(bandKey.replace('+', ''));
      if (financeAmount >= minValue) {
        const factor = bands[bandKey];
        console.log('[lookupFactor] Found factor in band', bandKey, ':', factor);
        return factor;
      }
    } else {
      // This is a range band (e.g., "0-20000")
      const [min, max] = bandKey.split('-').map(Number);
      if (financeAmount >= min && financeAmount <= max) {
        const factor = bands[bandKey];
        console.log('[lookupFactor] Found factor in band', bandKey, ':', factor);
        return factor;
      }
    }
  }
  
  // If no band found, use the highest band
  const highestBand = bandKeys[bandKeys.length - 1];
  const factor = bands[highestBand];
  console.log('[lookupFactor] Using highest band', highestBand, ':', factor);
  return factor;
}

/**
 * Calculate hardware rental
 * Requirement 7.12: Hardware rental = finance amount × factor
 */
export function calculateHardwareRental(
  financeAmount: number,
  factor: number
): number {
  return financeAmount * factor;
}

/**
 * Calculate connectivity total cost
 * Requirement 4.10: Sum (getRolePrice × quantity) for all connectivity items
 * 
 * @param connectivityItems - Array of connectivity items with pricing and quantities
 * @param role - User role (admin, manager, or user)
 * @returns Total connectivity cost based on role-based pricing
 */
export function calculateConnectivityTotal(
  connectivityItems: Array<{
    cost: number;
    managerCost: number;
    userCost: number;
    selectedQuantity: number;
  }>,
  role: UserRole
): number {
  return connectivityItems.reduce((sum, item) => {
    const price = getRolePrice(item, role);
    return sum + (price * item.selectedQuantity);
  }, 0);
}

/**
 * Calculate licensing total cost
 * Requirement 5.10: Sum (getRolePrice × quantity) for all licensing items
 * 
 * @param licensingItems - Array of licensing items with pricing and quantities
 * @param role - User role (admin, manager, or user)
 * @returns Total licensing cost based on role-based pricing
 */
export function calculateLicensingTotal(
  licensingItems: Array<{
    cost: number;
    managerCost: number;
    userCost: number;
    quantity: number;
  }>,
  role: UserRole
): number {
  return licensingItems.reduce((sum, item) => {
    const price = getRolePrice(item, role);
    return sum + (price * item.quantity);
  }, 0);
}

/**
 * Calculate total MRC (Monthly Recurring Cost)
 * Requirement 7.13: Total MRC = hardware rental + connectivity + licensing
 */
export function calculateTotalMRC(
  hardwareRental: number,
  connectivityCost: number,
  licensingCost: number
): number {
  return hardwareRental + connectivityCost + licensingCost;
}

/**
 * Calculate VAT
 * Requirement 7.15: Total with VAT = total ex-VAT × 1.15
 */
export function calculateVAT(totalExVAT: number): number {
  return totalExVAT * 1.15;
}

/**
 * Count extension items from hardware selection
 * Requirement 3.6: Extension items count toward installation points
 */
export function countExtensionItems(
  hardwareItems: Array<{ isExtension: boolean; selectedQuantity: number }>
): number {
  return hardwareItems.reduce((count, item) => {
    if (item.isExtension) {
      return count + item.selectedQuantity;
    }
    return count;
  }, 0);
}

/**
 * Calculate hardware total cost
 * Requirement 3.13, 7.3: Sum (getRolePrice × quantity) for all hardware items
 * 
 * @param hardwareItems - Array of hardware items with pricing and quantities
 * @param role - User role (admin, manager, or user)
 * @returns Total hardware cost based on role-based pricing
 */
export function calculateHardwareTotal(
  hardwareItems: Array<{
    cost: number;
    managerCost: number;
    userCost: number;
    selectedQuantity: number;
  }>,
  role: UserRole
): number {
  return hardwareItems.reduce((sum, item) => {
    const price = getRolePrice(item, role);
    return sum + (price * item.selectedQuantity);
  }, 0);
}

/**
 * Settlement calculation result for a single year
 * Requirement 6.8: Year-by-year breakdown
 */
export interface SettlementYearCalculation {
  year: number;
  amount: number;
  monthsRemaining: number;
  isCompleted: boolean;
  startDate: Date;
  endDate: Date;
  rental: number; // The rental amount for this year (after escalation)
}

/**
 * Settlement calculation result
 * Requirements 6.5, 6.6, 6.7: Settlement calculation
 */
export interface SettlementCalculationResult {
  calculations: SettlementYearCalculation[];
  totalSettlement: number;
  startingRental: number; // The de-escalated starting rental
}

/**
 * Calculate settlement for existing rental contracts
 * Requirements 6.5, 6.6, 6.7, 6.9, 6.10, 6.11, 6.12
 * 
 * This function calculates the buyout amount for an existing rental contract.
 * It handles both "starting" and "current" rental types, classifies years as
 * completed/pending/partial, and applies escalation compounding.
 * 
 * @param startDate - Contract start date
 * @param rentalAmount - Rental amount (starting or current depending on rentalType)
 * @param escalationRate - Annual escalation rate (0, 5, 10, or 15)
 * @param rentalTerm - Total rental term in months (12, 24, 36, 48, or 60)
 * @param rentalType - Whether rentalAmount is "starting" (Year 1) or "current" (today's rate)
 * @param currentDate - Current date (defaults to now, can be overridden for testing)
 * @returns Settlement calculation with year-by-year breakdown and total
 */
export function calculateSettlement(
  startDate: Date,
  rentalAmount: number,
  escalationRate: number,
  rentalTerm: number,
  rentalType: 'starting' | 'current',
  currentDate: Date = new Date()
): SettlementCalculationResult {
  const escalation = escalationRate / 100;
  
  // Requirement 6.6: De-escalate if using current rental
  let startingRental = rentalAmount;
  
  if (rentalType === 'current') {
    // Calculate how many complete years have passed since start date
    const yearsSinceStart = (currentDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const completedYears = Math.floor(yearsSinceStart);
    
    // De-escalate: work backwards from current rental to starting rental
    // currentRental = startingRental × (1 + escalation)^completedYears
    // Therefore: startingRental = currentRental / (1 + escalation)^completedYears
    for (let i = 0; i < completedYears; i++) {
      startingRental = startingRental / (1 + escalation);
    }
  }
  
  // Calculate year-by-year breakdown
  const calculations: SettlementYearCalculation[] = [];
  let currentRental = startingRental;
  let totalSettlement = 0;
  
  // Calculate number of years in the contract
  const totalYears = Math.ceil(rentalTerm / 12);
  
  for (let year = 1; year <= totalYears; year++) {
    // Calculate year boundaries
    const yearStartDate = new Date(startDate);
    yearStartDate.setFullYear(startDate.getFullYear() + (year - 1));
    
    const yearEndDate = new Date(startDate);
    yearEndDate.setFullYear(startDate.getFullYear() + year);
    
    // Requirement 6.9, 6.10, 6.11: Classify years as completed, pending, or partial
    let monthsRemaining: number;
    let yearAmount: number;
    let isCompleted: boolean;
    
    if (currentDate >= yearEndDate) {
      // Requirement 6.9: Year completed - no settlement needed
      monthsRemaining = 0;
      yearAmount = 0;
      isCompleted = true;
    } else if (currentDate < yearStartDate) {
      // Requirement 6.10: Year in future - full year settlement
      monthsRemaining = 12;
      yearAmount = currentRental * monthsRemaining;
      isCompleted = false;
    } else {
      // Requirement 6.11: Year partially complete - calculate remaining months
      // Use CEIL((endDate - currentDate) / 30.44 days)
      const daysRemaining = (yearEndDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000);
      monthsRemaining = Math.ceil(daysRemaining / 30.44);
      yearAmount = currentRental * monthsRemaining;
      isCompleted = false;
    }
    
    totalSettlement += yearAmount;
    
    calculations.push({
      year,
      amount: yearAmount,
      monthsRemaining,
      isCompleted,
      startDate: yearStartDate,
      endDate: yearEndDate,
      rental: currentRental,
    });
    
    // Requirement 6.12: Apply escalation at start of each year
    // rental × (1 + escalation/100)
    currentRental = currentRental * (1 + escalation);
  }
  
  return {
    calculations,
    totalSettlement,
    startingRental,
  };
}

/**
 * Calculate all totals for a deal
 * This is a comprehensive function that calculates all values
 */
export interface CalculateTotalsInput {
  hardwareItems: Array<{
    cost: number;
    managerCost: number;
    userCost: number;
    selectedQuantity: number;
    isExtension: boolean;
  }>;
  connectivityItems: Array<{
    cost: number;
    managerCost: number;
    userCost: number;
    selectedQuantity: number;
  }>;
  licensingItems: Array<{
    cost: number;
    managerCost: number;
    userCost: number;
    quantity: number;
  }>;
  term: number;
  escalation: number;
  distance: number;
  customGrossProfit?: number;
  scales: Scales;
  factors: FactorSheet;
  role: UserRole;
}

export interface CalculateTotalsOutput {
  hardwareTotal: number;
  installationTotal: number;
  extensionTotal: number;
  fuelTotal: number;
  extensionCount: number;
  representativeSettlement: number;
  actualSettlement: number;
  financeFee: number;
  totalPayout: number;
  grossProfit: number;
  financeAmount: number;
  factor: number;
  hardwareRental: number;
  connectivityTotal: number;
  licensingTotal: number;
  totalMRC: number;
  totalExVAT: number;
  totalWithVAT: number;
}

export function calculateAllTotals(input: CalculateTotalsInput): CalculateTotalsOutput {
  const { hardwareItems, connectivityItems, licensingItems, term, escalation, distance, customGrossProfit, scales, factors, role } = input;
  
  // Calculate hardware total using dedicated function with error handling
  const hardwareTotal = safeCalculate(
    () => calculateHardwareTotal(hardwareItems, role),
    0,
    'calculateHardwareTotal'
  );
  
  // Count extension items with error handling
  const extensionCount = safeCalculate(
    () => countExtensionItems(hardwareItems),
    0,
    'countExtensionItems'
  );
  
  // Calculate installation costs components with error handling
  // Requirement 7.4: Installation base from sliding scale
  const installationBase = safeCalculate(
    () => calculateInstallation(extensionCount, scales, role),
    0,
    'calculateInstallation'
  );
  
  // Requirement 7.5: Extension cost = count × cost_per_point
  const extensionTotal = safeCalculate(
    () => calculateExtensionCost(extensionCount, scales, role),
    0,
    'calculateExtensionCost'
  );
  
  // Requirement 7.6: Fuel cost = distance × cost_per_kilometer
  const fuelTotal = safeCalculate(
    () => calculateFuelCost(distance, scales, role),
    0,
    'calculateFuelCost'
  );
  
  // Sum: installation base + extension + fuel
  const installationTotal = safeCalculate(
    () => installationBase + extensionTotal + fuelTotal,
    0,
    'installationTotal'
  );
  
  // Calculate settlements with error handling
  const representativeSettlement = safeCalculate(
    () => calculateRepresentativeSettlement(hardwareTotal, installationTotal, term, escalation),
    0,
    'calculateRepresentativeSettlement'
  );
  
  // Calculate connectivity and licensing totals using dedicated functions with error handling
  // Requirement 4.10: Connectivity total
  const connectivityTotal = safeCalculate(
    () => calculateConnectivityTotal(connectivityItems, role),
    0,
    'calculateConnectivityTotal'
  );
  
  // Requirement 5.10: Licensing total
  const licensingTotal = safeCalculate(
    () => calculateLicensingTotal(licensingItems, role),
    0,
    'calculateLicensingTotal'
  );
  
  const totalMRCBeforeHardware = safeCalculate(
    () => connectivityTotal + licensingTotal,
    0,
    'totalMRCBeforeHardware'
  );
  
  // Calculate actual settlement (without hardware rental yet) with error handling
  const actualSettlement = safeCalculate(
    () => calculateActualSettlement(representativeSettlement, totalMRCBeforeHardware, term),
    0,
    'calculateActualSettlement'
  );
  
  // Calculate finance fee iteratively with error handling
  let financeFee = 0;
  let totalPayout = 0;
  try {
    const result = calculateFinanceFeeIterative(actualSettlement, scales, role);
    financeFee = result.financeFee;
    totalPayout = result.totalPayout;
  } catch (error) {
    console.error('[calculateFinanceFeeIterative] Error:', error);
    financeFee = 0;
    totalPayout = 0;
  }
  
  // Calculate gross profit with error handling
  const grossProfit = safeCalculate(
    () => calculateGrossProfit(extensionCount, scales, role, customGrossProfit),
    0,
    'calculateGrossProfit'
  );
  
  // Calculate finance amount (total payout + gross profit) with error handling
  const financeAmount = safeCalculate(
    () => totalPayout + grossProfit,
    0,
    'financeAmount'
  );
  
  // Look up factor (Requirement 7.11: role-based factor selection) with error handling
  const factor = safeCalculate(
    () => lookupFactor(term, escalation, financeAmount, factors, role),
    0,
    'lookupFactor'
  );
  
  // Calculate hardware rental with error handling
  const hardwareRental = safeCalculate(
    () => calculateHardwareRental(financeAmount, factor),
    0,
    'calculateHardwareRental'
  );
  
  // Calculate total MRC with error handling
  const totalMRC = safeCalculate(
    () => calculateTotalMRC(hardwareRental, connectivityTotal, licensingTotal),
    0,
    'calculateTotalMRC'
  );
  
  // Calculate totals with VAT with error handling
  const totalExVAT = totalMRC;
  const totalWithVAT = safeCalculate(
    () => calculateVAT(totalExVAT),
    0,
    'calculateVAT'
  );
  
  return {
    hardwareTotal,
    installationTotal,
    extensionTotal,
    fuelTotal,
    extensionCount,
    representativeSettlement,
    actualSettlement,
    financeFee,
    totalPayout,
    grossProfit,
    financeAmount,
    factor,
    hardwareRental,
    connectivityTotal,
    licensingTotal,
    totalMRC,
    totalExVAT,
    totalWithVAT,
  };
}
