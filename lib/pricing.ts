// Utility functions for role-based pricing

export type UserRole = 'admin' | 'manager' | 'user';

export interface PricedItem {
  cost: number;
  managerCost: number;
  userCost: number;
}

export interface ScaleBand {
  cost: number;
  managerCost: number;
  userCost: number;
}

/**
 * Get the appropriate price for an item based on user role
 * IMPORTANT: Admin uses MANAGER pricing (not cost pricing) for hardware, connectivity, and licensing
 * Manager sees managerCost, User sees userCost
 */
export function getRolePrice(item: PricedItem, role: UserRole): number {
  switch (role) {
    case 'admin':
      return item.managerCost; // Admin uses manager pricing
    case 'manager':
      return item.managerCost;
    case 'user':
      return item.userCost;
    default:
      return item.userCost; // Default to user pricing for safety
  }
}

/**
 * Get the appropriate price from a scale band based on user role
 * IMPORTANT: Admin uses MANAGER pricing (not cost pricing)
 */
export function getRoleScalePrice(band: ScaleBand, role: UserRole): number {
  switch (role) {
    case 'admin':
      return band.managerCost; // Admin uses manager pricing
    case 'manager':
      return band.managerCost;
    case 'user':
      return band.userCost;
    default:
      return band.userCost; // Default to user pricing for safety
  }
}

/**
 * Apply role-based pricing to an array of items
 */
export function applyRolePricing<T extends PricedItem>(
  items: T[],
  role: UserRole
): (T & { price: number })[] {
  return items.map(item => ({
    ...item,
    price: getRolePrice(item, role),
  }));
}

/**
 * Calculate total cost for items with role-based pricing
 */
export function calculateTotalWithRole(
  items: PricedItem[],
  role: UserRole
): number {
  return items.reduce((total, item) => total + getRolePrice(item, role), 0);
}

/**
 * Get role-based pricing for additional costs (per kilometer, per point)
 */
export interface AdditionalCosts {
  cost_per_kilometer: number;
  cost_per_point: number;
  manager_cost_per_kilometer: number;
  manager_cost_per_point: number;
  user_cost_per_kilometer: number;
  user_cost_per_point: number;
}

export function getRoleAdditionalCosts(
  costs: AdditionalCosts,
  role: UserRole
): { perKilometer: number; perPoint: number } {
  switch (role) {
    case 'admin':
      return {
        perKilometer: costs.manager_cost_per_kilometer, // Admin uses manager pricing
        perPoint: costs.manager_cost_per_point, // Admin uses manager pricing
      };
    case 'manager':
      return {
        perKilometer: costs.manager_cost_per_kilometer,
        perPoint: costs.manager_cost_per_point,
      };
    case 'user':
      return {
        perKilometer: costs.user_cost_per_kilometer,
        perPoint: costs.user_cost_per_point,
      };
    default:
      return {
        perKilometer: costs.user_cost_per_kilometer,
        perPoint: costs.user_cost_per_point,
      };
  }
}

/**
 * Calculate markup percentages from cost to manager/user prices
 */
export function calculateMarkup(
  cost: number,
  sellingPrice: number
): number {
  if (cost === 0) return 0;
  return ((sellingPrice - cost) / cost) * 100;
}

/**
 * Apply markup percentage to calculate selling price
 */
export function applyMarkup(
  cost: number,
  markupPercentage: number
): number {
  return cost * (1 + markupPercentage / 100);
}

/**
 * Bulk apply markup to items
 */
export function bulkApplyMarkup<T extends { cost: number }>(
  items: T[],
  managerMarkup: number,
  userMarkup: number
): (T & { managerCost: number; userCost: number })[] {
  return items.map(item => ({
    ...item,
    managerCost: applyMarkup(item.cost, managerMarkup),
    userCost: applyMarkup(item.cost, userMarkup),
  }));
}

/**
 * Validate that role-based pricing is consistent
 * (managerCost >= cost, userCost >= managerCost)
 */
export function validateRolePricing(item: PricedItem): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (item.managerCost < item.cost) {
    errors.push('Manager cost must be greater than or equal to cost');
  }

  if (item.userCost < item.managerCost) {
    errors.push('User cost must be greater than or equal to manager cost');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
