/**
 * Property-Based Tests for Role-Based Pricing
 * Feature: vps-hosted-calculator
 * 
 * Property 2: Role-based pricing consistency
 * Validates: Requirements 3.4, 3.7, 3.8
 */

import fc from 'fast-check';
import {
  getRolePrice,
  getRoleScalePrice,
  applyRolePricing,
  calculateTotalWithRole,
  getRoleAdditionalCosts,
  type UserRole,
  type PricedItem,
  type ScaleBand,
  type AdditionalCosts,
} from '@/lib/pricing';

// Arbitraries for generating test data
const userRoleArbitrary = fc.constantFrom<UserRole>('admin', 'manager', 'user');

const pricedItemArbitrary = fc.record({
  cost: fc.float({ min: 0, max: 100000, noNaN: true }),
  managerCost: fc.float({ min: 0, max: 100000, noNaN: true }),
  userCost: fc.float({ min: 0, max: 100000, noNaN: true }),
});

const scaleBandArbitrary = fc.record({
  cost: fc.float({ min: 0, max: 100000, noNaN: true }),
  managerCost: fc.float({ min: 0, max: 100000, noNaN: true }),
  userCost: fc.float({ min: 0, max: 100000, noNaN: true }),
});

const additionalCostsArbitrary = fc.record({
  cost_per_kilometer: fc.float({ min: 0, max: 100, noNaN: true }),
  cost_per_point: fc.float({ min: 0, max: 1000, noNaN: true }),
  manager_cost_per_kilometer: fc.float({ min: 0, max: 100, noNaN: true }),
  manager_cost_per_point: fc.float({ min: 0, max: 1000, noNaN: true }),
  user_cost_per_kilometer: fc.float({ min: 0, max: 100, noNaN: true }),
  user_cost_per_point: fc.float({ min: 0, max: 1000, noNaN: true }),
});

describe('Role-Based Pricing Property Tests', () => {
  describe('Property 2: Role-based pricing consistency', () => {
    test('For any item and admin role, should return cost', () => {
      fc.assert(
        fc.property(pricedItemArbitrary, (item) => {
          const price = getRolePrice(item, 'admin');
          expect(price).toBe(item.cost);
        }),
        { numRuns: 100 }
      );
    });

    test('For any item and manager role, should return managerCost', () => {
      fc.assert(
        fc.property(pricedItemArbitrary, (item) => {
          const price = getRolePrice(item, 'manager');
          expect(price).toBe(item.managerCost);
        }),
        { numRuns: 100 }
      );
    });

    test('For any item and user role, should return userCost', () => {
      fc.assert(
        fc.property(pricedItemArbitrary, (item) => {
          const price = getRolePrice(item, 'user');
          expect(price).toBe(item.userCost);
        }),
        { numRuns: 100 }
      );
    });

    test('For any item and any role, should return the correct price tier', () => {
      fc.assert(
        fc.property(pricedItemArbitrary, userRoleArbitrary, (item, role) => {
          const price = getRolePrice(item, role);
          
          switch (role) {
            case 'admin':
              expect(price).toBe(item.cost);
              break;
            case 'manager':
              expect(price).toBe(item.managerCost);
              break;
            case 'user':
              expect(price).toBe(item.userCost);
              break;
          }
        }),
        { numRuns: 100 }
      );
    });

    test('For any scale band and any role, should return the correct price tier', () => {
      fc.assert(
        fc.property(scaleBandArbitrary, userRoleArbitrary, (band, role) => {
          const price = getRoleScalePrice(band, role);
          
          switch (role) {
            case 'admin':
              expect(price).toBe(band.cost);
              break;
            case 'manager':
              expect(price).toBe(band.managerCost);
              break;
            case 'user':
              expect(price).toBe(band.userCost);
              break;
          }
        }),
        { numRuns: 100 }
      );
    });

    test('For any array of items and any role, applyRolePricing should add correct price field', () => {
      fc.assert(
        fc.property(
          fc.array(pricedItemArbitrary, { minLength: 1, maxLength: 10 }),
          userRoleArbitrary,
          (items, role) => {
            const priced = applyRolePricing(items, role);
            
            expect(priced.length).toBe(items.length);
            
            priced.forEach((pricedItem, index) => {
              const originalItem = items[index];
              
              // Verify all original fields are preserved
              expect(pricedItem.cost).toBe(originalItem.cost);
              expect(pricedItem.managerCost).toBe(originalItem.managerCost);
              expect(pricedItem.userCost).toBe(originalItem.userCost);
              
              // Verify price field is correct for role
              const expectedPrice = getRolePrice(originalItem, role);
              expect(pricedItem.price).toBe(expectedPrice);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any array of items and any role, calculateTotalWithRole should sum correct prices', () => {
      fc.assert(
        fc.property(
          fc.array(pricedItemArbitrary, { minLength: 1, maxLength: 10 }),
          userRoleArbitrary,
          (items, role) => {
            const total = calculateTotalWithRole(items, role);
            
            // Calculate expected total manually
            const expectedTotal = items.reduce((sum, item) => {
              return sum + getRolePrice(item, role);
            }, 0);
            
            expect(total).toBeCloseTo(expectedTotal, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any additional costs and admin role, should return cost values', () => {
      fc.assert(
        fc.property(additionalCostsArbitrary, (costs) => {
          const roleCosts = getRoleAdditionalCosts(costs, 'admin');
          
          expect(roleCosts.perKilometer).toBe(costs.cost_per_kilometer);
          expect(roleCosts.perPoint).toBe(costs.cost_per_point);
        }),
        { numRuns: 100 }
      );
    });

    test('For any additional costs and manager role, should return manager cost values', () => {
      fc.assert(
        fc.property(additionalCostsArbitrary, (costs) => {
          const roleCosts = getRoleAdditionalCosts(costs, 'manager');
          
          expect(roleCosts.perKilometer).toBe(costs.manager_cost_per_kilometer);
          expect(roleCosts.perPoint).toBe(costs.manager_cost_per_point);
        }),
        { numRuns: 100 }
      );
    });

    test('For any additional costs and user role, should return user cost values', () => {
      fc.assert(
        fc.property(additionalCostsArbitrary, (costs) => {
          const roleCosts = getRoleAdditionalCosts(costs, 'user');
          
          expect(roleCosts.perKilometer).toBe(costs.user_cost_per_kilometer);
          expect(roleCosts.perPoint).toBe(costs.user_cost_per_point);
        }),
        { numRuns: 100 }
      );
    });

    test('For any additional costs and any role, should return the correct cost tier', () => {
      fc.assert(
        fc.property(additionalCostsArbitrary, userRoleArbitrary, (costs, role) => {
          const roleCosts = getRoleAdditionalCosts(costs, role);
          
          switch (role) {
            case 'admin':
              expect(roleCosts.perKilometer).toBe(costs.cost_per_kilometer);
              expect(roleCosts.perPoint).toBe(costs.cost_per_point);
              break;
            case 'manager':
              expect(roleCosts.perKilometer).toBe(costs.manager_cost_per_kilometer);
              expect(roleCosts.perPoint).toBe(costs.manager_cost_per_point);
              break;
            case 'user':
              expect(roleCosts.perKilometer).toBe(costs.user_cost_per_kilometer);
              expect(roleCosts.perPoint).toBe(costs.user_cost_per_point);
              break;
          }
        }),
        { numRuns: 100 }
      );
    });

    test('For any item, admin price should be less than or equal to manager price', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          (cost, managerCost, userCost) => {
            // Ensure managerCost >= cost
            const adjustedManagerCost = Math.max(cost, managerCost);
            const item = { cost, managerCost: adjustedManagerCost, userCost };
            
            const adminPrice = getRolePrice(item, 'admin');
            const managerPrice = getRolePrice(item, 'manager');
            
            expect(adminPrice).toBeLessThanOrEqual(managerPrice);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any item, manager price should be less than or equal to user price', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          (cost, managerCost, userCost) => {
            // Ensure userCost >= managerCost
            const adjustedUserCost = Math.max(managerCost, userCost);
            const item = { cost, managerCost, userCost: adjustedUserCost };
            
            const managerPrice = getRolePrice(item, 'manager');
            const userPrice = getRolePrice(item, 'user');
            
            expect(managerPrice).toBeLessThanOrEqual(userPrice);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('For any item, role-based pricing should be deterministic', () => {
      fc.assert(
        fc.property(pricedItemArbitrary, userRoleArbitrary, (item, role) => {
          const price1 = getRolePrice(item, role);
          const price2 = getRolePrice(item, role);
          
          expect(price1).toBe(price2);
        }),
        { numRuns: 100 }
      );
    });

    test('For any item, changing role should change price appropriately', () => {
      fc.assert(
        fc.property(pricedItemArbitrary, (item) => {
          const adminPrice = getRolePrice(item, 'admin');
          const managerPrice = getRolePrice(item, 'manager');
          const userPrice = getRolePrice(item, 'user');
          
          // Prices should be from the correct fields
          expect(adminPrice).toBe(item.cost);
          expect(managerPrice).toBe(item.managerCost);
          expect(userPrice).toBe(item.userCost);
          
          // All three prices should be defined
          expect(adminPrice).toBeDefined();
          expect(managerPrice).toBeDefined();
          expect(userPrice).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });
  });
});
