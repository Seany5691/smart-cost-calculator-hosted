/**
 * Property-Based Tests for Calculator Formulas
 * Feature: vps-hosted-calculator
 * 
 * These tests validate the calculator formulas using property-based testing
 * to ensure they work correctly across a wide range of inputs.
 */

import fc from 'fast-check';
import {
  calculateInstallation,
  calculateExtensionCost,
  calculateFuelCost,
  calculateRepresentativeSettlement,
  calculateActualSettlement,
  calculateFinanceFee,
  calculateFinanceFeeIterative,
  calculateGrossProfit,
  calculateHardwareRental,
  calculateTotalMRC,
  calculateVAT,
  countExtensionItems,
  calculateHardwareTotal,
} from '@/lib/calculator';
import type { Scales } from '@/lib/store/config';

// Mock scales data for testing
const mockScales: Scales = {
  installation: {
    '0-4': { cost: 3500, managerCost: 4000, userCost: 4500 },
    '5-8': { cost: 3500, managerCost: 4000, userCost: 4500 },
    '9-16': { cost: 7000, managerCost: 8000, userCost: 9000 },
    '17-32': { cost: 10500, managerCost: 12000, userCost: 13500 },
    '33+': { cost: 15000, managerCost: 17000, userCost: 19000 },
  },
  finance_fee: {
    '0-20000': { cost: 1800, managerCost: 2000, userCost: 2200 },
    '20001-50000': { cost: 1800, managerCost: 2000, userCost: 2200 },
    '50001-100000': { cost: 2800, managerCost: 3100, userCost: 3400 },
    '100001+': { cost: 3800, managerCost: 4200, userCost: 4600 },
  },
  gross_profit: {
    '0-4': { cost: 10000, managerCost: 11000, userCost: 12000 },
    '5-8': { cost: 15000, managerCost: 16500, userCost: 18000 },
    '9-16': { cost: 20000, managerCost: 22000, userCost: 24000 },
    '17-32': { cost: 25000, managerCost: 27500, userCost: 30000 },
    '33+': { cost: 30000, managerCost: 33000, userCost: 36000 },
  },
  additional_costs: {
    cost_per_kilometer: 1.5,
    cost_per_point: 750,
    manager_cost_per_kilometer: 1.7,
    manager_cost_per_point: 850,
    user_cost_per_kilometer: 2.0,
    user_cost_per_point: 950,
  },
};

describe('Calculator Formula Property Tests', () => {
  /**
   * Unit Tests for Extension Count Calculation
   * Validates: Requirements 3.6, 7.2
   */
  describe('countExtensionItems', () => {
    test('should return 0 when no hardware items', () => {
      const result = countExtensionItems([]);
      expect(result).toBe(0);
    });

    test('should return 0 when no extension items', () => {
      const items = [
        { isExtension: false, selectedQuantity: 5 },
        { isExtension: false, selectedQuantity: 3 },
      ];
      const result = countExtensionItems(items);
      expect(result).toBe(0);
    });

    test('should count single extension item', () => {
      const items = [
        { isExtension: true, selectedQuantity: 3 },
      ];
      const result = countExtensionItems(items);
      expect(result).toBe(3);
    });

    test('should sum quantities for multiple extension items', () => {
      const items = [
        { isExtension: true, selectedQuantity: 5 },
        { isExtension: false, selectedQuantity: 2 },
        { isExtension: true, selectedQuantity: 3 },
        { isExtension: true, selectedQuantity: 1 },
      ];
      const result = countExtensionItems(items);
      expect(result).toBe(9); // 5 + 3 + 1 = 9
    });

    test('should handle zero quantities', () => {
      const items = [
        { isExtension: true, selectedQuantity: 0 },
        { isExtension: true, selectedQuantity: 5 },
      ];
      const result = countExtensionItems(items);
      expect(result).toBe(5);
    });

    test('should handle mixed extension and non-extension items', () => {
      const items = [
        { isExtension: true, selectedQuantity: 10 },
        { isExtension: false, selectedQuantity: 20 },
        { isExtension: true, selectedQuantity: 5 },
        { isExtension: false, selectedQuantity: 15 },
      ];
      const result = countExtensionItems(items);
      expect(result).toBe(15); // 10 + 5 = 15
    });

    test('should handle large quantities', () => {
      const items = [
        { isExtension: true, selectedQuantity: 100 },
        { isExtension: true, selectedQuantity: 50 },
      ];
      const result = countExtensionItems(items);
      expect(result).toBe(150);
    });
  });

  /**
   * Unit Tests for Hardware Total Calculation
   * Validates: Requirements 3.13, 7.3
   */
  describe('calculateHardwareTotal', () => {
    test('should return 0 when no hardware items', () => {
      const result = calculateHardwareTotal([], 'admin');
      expect(result).toBe(0);
    });

    test('should calculate total for single item with admin pricing', () => {
      const items = [
        { cost: 1000, managerCost: 1100, userCost: 1200, selectedQuantity: 2 },
      ];
      const result = calculateHardwareTotal(items, 'admin');
      expect(result).toBe(2000); // 1000 × 2
    });

    test('should calculate total for single item with manager pricing', () => {
      const items = [
        { cost: 1000, managerCost: 1100, userCost: 1200, selectedQuantity: 2 },
      ];
      const result = calculateHardwareTotal(items, 'manager');
      expect(result).toBe(2200); // 1100 × 2
    });

    test('should calculate total for single item with user pricing', () => {
      const items = [
        { cost: 1000, managerCost: 1100, userCost: 1200, selectedQuantity: 2 },
      ];
      const result = calculateHardwareTotal(items, 'user');
      expect(result).toBe(2400); // 1200 × 2
    });

    test('should sum multiple items with admin pricing', () => {
      const items = [
        { cost: 1000, managerCost: 1100, userCost: 1200, selectedQuantity: 2 },
        { cost: 500, managerCost: 550, userCost: 600, selectedQuantity: 3 },
        { cost: 2000, managerCost: 2200, userCost: 2400, selectedQuantity: 1 },
      ];
      const result = calculateHardwareTotal(items, 'admin');
      expect(result).toBe(5500); // (1000×2) + (500×3) + (2000×1) = 2000 + 1500 + 2000
    });

    test('should sum multiple items with manager pricing', () => {
      const items = [
        { cost: 1000, managerCost: 1100, userCost: 1200, selectedQuantity: 2 },
        { cost: 500, managerCost: 550, userCost: 600, selectedQuantity: 3 },
        { cost: 2000, managerCost: 2200, userCost: 2400, selectedQuantity: 1 },
      ];
      const result = calculateHardwareTotal(items, 'manager');
      expect(result).toBe(6050); // (1100×2) + (550×3) + (2200×1) = 2200 + 1650 + 2200
    });

    test('should sum multiple items with user pricing', () => {
      const items = [
        { cost: 1000, managerCost: 1100, userCost: 1200, selectedQuantity: 2 },
        { cost: 500, managerCost: 550, userCost: 600, selectedQuantity: 3 },
        { cost: 2000, managerCost: 2200, userCost: 2400, selectedQuantity: 1 },
      ];
      const result = calculateHardwareTotal(items, 'user');
      expect(result).toBe(6600); // (1200×2) + (600×3) + (2400×1) = 2400 + 1800 + 2400
    });

    test('should handle items with zero quantity', () => {
      const items = [
        { cost: 1000, managerCost: 1100, userCost: 1200, selectedQuantity: 0 },
        { cost: 500, managerCost: 550, userCost: 600, selectedQuantity: 3 },
      ];
      const result = calculateHardwareTotal(items, 'admin');
      expect(result).toBe(1500); // (1000×0) + (500×3) = 0 + 1500
    });

    test('should handle all items with zero quantity', () => {
      const items = [
        { cost: 1000, managerCost: 1100, userCost: 1200, selectedQuantity: 0 },
        { cost: 500, managerCost: 550, userCost: 600, selectedQuantity: 0 },
      ];
      const result = calculateHardwareTotal(items, 'admin');
      expect(result).toBe(0);
    });

    test('should handle large quantities', () => {
      const items = [
        { cost: 100, managerCost: 110, userCost: 120, selectedQuantity: 100 },
      ];
      const result = calculateHardwareTotal(items, 'admin');
      expect(result).toBe(10000); // 100 × 100
    });

    test('should handle decimal prices', () => {
      const items = [
        { cost: 99.99, managerCost: 109.99, userCost: 119.99, selectedQuantity: 3 },
      ];
      const result = calculateHardwareTotal(items, 'admin');
      expect(result).toBeCloseTo(299.97, 2); // 99.99 × 3
    });

    test('should handle mixed quantities and prices', () => {
      const items = [
        { cost: 1500.50, managerCost: 1650.55, userCost: 1800.60, selectedQuantity: 5 },
        { cost: 250.25, managerCost: 275.28, userCost: 300.30, selectedQuantity: 10 },
        { cost: 3000, managerCost: 3300, userCost: 3600, selectedQuantity: 2 },
      ];
      const result = calculateHardwareTotal(items, 'manager');
      // (1650.55×5) + (275.28×10) + (3300×2) = 8252.75 + 2752.80 + 6600 = 17605.55
      expect(result).toBeCloseTo(17605.55, 2);
    });
  });

  /**
   * Property 4: Installation cost sliding scale
   * Validates: Requirements 3.9
   */
  test('Property 4: Installation cost sliding scale', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.constantFrom('admin', 'manager', 'user'),
        (extensionCount, role) => {
          const cost = calculateInstallation(extensionCount, mockScales, role as any);
          
          // Verify cost matches the correct band
          if (extensionCount >= 0 && extensionCount <= 4) {
            const expected = role === 'admin' ? 3500 : role === 'manager' ? 4000 : 4500;
            expect(cost).toBe(expected);
          } else if (extensionCount >= 5 && extensionCount <= 8) {
            const expected = role === 'admin' ? 3500 : role === 'manager' ? 4000 : 4500;
            expect(cost).toBe(expected);
          } else if (extensionCount >= 9 && extensionCount <= 16) {
            const expected = role === 'admin' ? 7000 : role === 'manager' ? 8000 : 9000;
            expect(cost).toBe(expected);
          } else if (extensionCount >= 17 && extensionCount <= 32) {
            const expected = role === 'admin' ? 10500 : role === 'manager' ? 12000 : 13500;
            expect(cost).toBe(expected);
          } else {
            const expected = role === 'admin' ? 15000 : role === 'manager' ? 17000 : 19000;
            expect(cost).toBe(expected);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Extension cost calculation
   * Validates: Requirements 3.10
   */
  test('Property 5: Extension cost calculation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.constantFrom('admin', 'manager', 'user'),
        (extensionCount, role) => {
          const cost = calculateExtensionCost(extensionCount, mockScales, role as any);
          
          // Verify cost = extensionCount × cost_per_point
          const costPerPoint = role === 'admin' ? 750 : role === 'manager' ? 850 : 950;
          expect(cost).toBe(extensionCount * costPerPoint);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Fuel cost calculation
   * Validates: Requirements 3.11
   */
  test('Property 6: Fuel cost calculation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000, noNaN: true }),
        fc.constantFrom('admin', 'manager', 'user'),
        (distance, role) => {
          const cost = calculateFuelCost(distance, mockScales, role as any);
          
          // Verify cost = distance × cost_per_kilometer
          const costPerKm = role === 'admin' ? 1.5 : role === 'manager' ? 1.7 : 2.0;
          expect(cost).toBeCloseTo(distance * costPerKm, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Representative settlement formula
   * Validates: Requirements 3.12
   */
  test('Property 7: Representative settlement formula', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 50000, noNaN: true }),
        fc.constantFrom(36, 48, 60),
        fc.constantFrom(0, 10, 15),
        (hardwareTotal, installationTotal, term, escalation) => {
          const settlement = calculateRepresentativeSettlement(
            hardwareTotal,
            installationTotal,
            term,
            escalation
          );
          
          // Verify formula: (hardware + installation) × (1 + escalation/100)^(term/12)
          const base = hardwareTotal + installationTotal;
          const escalationFactor = Math.pow(1 + escalation / 100, term / 12);
          const expected = base * escalationFactor;
          
          expect(settlement).toBeCloseTo(expected, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Actual settlement formula
   * Validates: Requirements 3.13
   */
  test('Property 8: Actual settlement formula', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.constantFrom(36, 48, 60),
        (repSettlement, mrcTotal, term) => {
          const actualSettlement = calculateActualSettlement(repSettlement, mrcTotal, term);
          
          // Verify formula: representative settlement + (MRC total × term)
          const expected = repSettlement + (mrcTotal * term);
          expect(actualSettlement).toBeCloseTo(expected, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Finance fee tiering
   * Validates: Requirements 3.14
   */
  test('Property 9: Finance fee tiering', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 200000, noNaN: true }),
        fc.constantFrom('admin', 'manager', 'user'),
        (totalPayout, role) => {
          const fee = calculateFinanceFee(totalPayout, mockScales, role as any);
          
          // Verify fee matches the correct tier
          if (totalPayout >= 0 && totalPayout < 20000) {
            const expected = role === 'admin' ? 1800 : role === 'manager' ? 2000 : 2200;
            expect(fee).toBe(expected);
          } else if (totalPayout >= 20000 && totalPayout < 50000) {
            const expected = role === 'admin' ? 1800 : role === 'manager' ? 2000 : 2200;
            expect(fee).toBe(expected);
          } else if (totalPayout >= 50000 && totalPayout < 100000) {
            const expected = role === 'admin' ? 2800 : role === 'manager' ? 3100 : 3400;
            expect(fee).toBe(expected);
          } else {
            const expected = role === 'admin' ? 3800 : role === 'manager' ? 4200 : 4600;
            expect(fee).toBe(expected);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Finance fee convergence
   * Validates: Requirements 3.15
   */
  test('Property 10: Finance fee convergence', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 10000, max: 200000, noNaN: true }),
        fc.constantFrom('admin', 'manager', 'user'),
        (actualSettlement, role) => {
          const result = calculateFinanceFeeIterative(actualSettlement, mockScales, role as any);
          
          // Verify convergence within 10 iterations
          expect(result.iterations).toBeLessThanOrEqual(10);
          
          // Verify totalPayout = actualSettlement + financeFee
          expect(result.totalPayout).toBeCloseTo(actualSettlement + result.financeFee, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Gross profit sliding scale
   * Validates: Requirements 3.16
   */
  test('Property 11: Gross profit sliding scale', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.constantFrom('admin', 'manager', 'user'),
        (extensionCount, role) => {
          const profit = calculateGrossProfit(extensionCount, mockScales, role as any);
          
          // Verify profit matches the correct band
          if (extensionCount >= 0 && extensionCount <= 4) {
            const expected = role === 'admin' ? 10000 : role === 'manager' ? 11000 : 12000;
            expect(profit).toBe(expected);
          } else if (extensionCount >= 5 && extensionCount <= 8) {
            const expected = role === 'admin' ? 15000 : role === 'manager' ? 16500 : 18000;
            expect(profit).toBe(expected);
          } else if (extensionCount >= 9 && extensionCount <= 16) {
            const expected = role === 'admin' ? 20000 : role === 'manager' ? 22000 : 24000;
            expect(profit).toBe(expected);
          } else if (extensionCount >= 17 && extensionCount <= 32) {
            const expected = role === 'admin' ? 25000 : role === 'manager' ? 27500 : 30000;
            expect(profit).toBe(expected);
          } else {
            const expected = role === 'admin' ? 30000 : role === 'manager' ? 33000 : 36000;
            expect(profit).toBe(expected);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: Hardware rental calculation
   * Validates: Requirements 3.19
   */
  test('Property 14: Hardware rental calculation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 200000, noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }),
        (financeAmount, factor) => {
          const rental = calculateHardwareRental(financeAmount, factor);
          
          // Verify rental = financeAmount × factor
          expect(rental).toBeCloseTo(financeAmount * factor, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15: Total MRC calculation
   * Validates: Requirements 3.20
   */
  test('Property 15: Total MRC calculation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.float({ min: 0, max: 5000, noNaN: true }),
        fc.float({ min: 0, max: 5000, noNaN: true }),
        (hardwareRental, connectivity, licensing) => {
          const totalMRC = calculateTotalMRC(hardwareRental, connectivity, licensing);
          
          // Verify totalMRC = hardwareRental + connectivity + licensing
          expect(totalMRC).toBeCloseTo(hardwareRental + connectivity + licensing, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: VAT calculation
   * Validates: Requirements 3.21
   */
  test('Property 16: VAT calculation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (totalExVAT) => {
          const totalWithVAT = calculateVAT(totalExVAT);
          
          // Verify totalWithVAT = totalExVAT × 1.15
          expect(totalWithVAT).toBeCloseTo(totalExVAT * 1.15, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
