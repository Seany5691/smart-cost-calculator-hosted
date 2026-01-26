/**
 * Unit tests for gross profit calculation
 * Task 4.1: Create gross profit selection logic
 * Validates Requirement 7.7
 */

import { calculateGrossProfit, getSlidingScaleBand } from '../../lib/calculator';
import type { Scales } from '../../lib/store/config';
import type { UserRole } from '../../lib/calculator';

describe('Gross Profit Calculation', () => {
  // Mock scales data for testing
  const mockScales: Scales = {
    installation: {
      '0-4': { cost: 1000, managerCost: 900, userCost: 800 },
      '5-8': { cost: 2000, managerCost: 1800, userCost: 1600 },
      '9-16': { cost: 3000, managerCost: 2700, userCost: 2400 },
      '17-32': { cost: 4000, managerCost: 3600, userCost: 3200 },
      '33+': { cost: 5000, managerCost: 4500, userCost: 4000 },
    },
    gross_profit: {
      '0-4': { cost: 5000, managerCost: 4500, userCost: 4000 },
      '5-8': { cost: 7500, managerCost: 6750, userCost: 6000 },
      '9-16': { cost: 10000, managerCost: 9000, userCost: 8000 },
      '17-32': { cost: 12500, managerCost: 11250, userCost: 10000 },
      '33+': { cost: 15000, managerCost: 13500, userCost: 12000 },
    },
    finance_fee: {
      '0-20000': { cost: 500, managerCost: 450, userCost: 400 },
      '20001-50000': { cost: 1000, managerCost: 900, userCost: 800 },
      '50001-100000': { cost: 1500, managerCost: 1350, userCost: 1200 },
      '100001+': { cost: 2000, managerCost: 1800, userCost: 1600 },
    },
    additional_costs: {
      cost_per_point: 100,
      manager_cost_per_point: 90,
      user_cost_per_point: 80,
      cost_per_kilometer: 10,
      manager_cost_per_kilometer: 9,
      user_cost_per_kilometer: 8,
    },
  };

  describe('Custom Gross Profit Priority', () => {
    it('should use custom gross profit when set (admin role)', () => {
      const customProfit = 20000;
      const extensionCount = 5; // Would normally use 5-8 band (7500 for admin)
      const role: UserRole = 'admin';

      const result = calculateGrossProfit(extensionCount, mockScales, role, customProfit);

      expect(result).toBe(customProfit);
      expect(result).not.toBe(7500); // Not the sliding scale value
    });

    it('should use custom gross profit when set (manager role)', () => {
      const customProfit = 15000;
      const extensionCount = 10; // Would normally use 9-16 band (9000 for manager)
      const role: UserRole = 'manager';

      const result = calculateGrossProfit(extensionCount, mockScales, role, customProfit);

      expect(result).toBe(customProfit);
      expect(result).not.toBe(9000); // Not the sliding scale value
    });

    it('should use custom gross profit when set (user role)', () => {
      const customProfit = 25000;
      const extensionCount = 20; // Would normally use 17-32 band (10000 for user)
      const role: UserRole = 'user';

      const result = calculateGrossProfit(extensionCount, mockScales, role, customProfit);

      expect(result).toBe(customProfit);
      expect(result).not.toBe(10000); // Not the sliding scale value
    });

    it('should use custom gross profit even when it is 0', () => {
      const customProfit = 0;
      const extensionCount = 5;
      const role: UserRole = 'admin';

      const result = calculateGrossProfit(extensionCount, mockScales, role, customProfit);

      expect(result).toBe(0);
      expect(result).not.toBe(7500); // Not the sliding scale value
    });

    it('should use custom gross profit for very large values', () => {
      const customProfit = 1000000;
      const extensionCount = 2;
      const role: UserRole = 'admin';

      const result = calculateGrossProfit(extensionCount, mockScales, role, customProfit);

      expect(result).toBe(customProfit);
    });
  });

  describe('Sliding Scale Fallback', () => {
    it('should use sliding scale when custom profit is undefined', () => {
      const extensionCount = 5; // 5-8 band
      const role: UserRole = 'admin';

      const result = calculateGrossProfit(extensionCount, mockScales, role, undefined);

      expect(result).toBe(7500); // admin cost for 5-8 band
    });

    it('should use sliding scale when custom profit is null', () => {
      const extensionCount = 10; // 9-16 band
      const role: UserRole = 'manager';

      const result = calculateGrossProfit(extensionCount, mockScales, role, null as any);

      expect(result).toBe(9000); // manager cost for 9-16 band
    });

    it('should use sliding scale when custom profit is not provided', () => {
      const extensionCount = 3; // 0-4 band
      const role: UserRole = 'user';

      const result = calculateGrossProfit(extensionCount, mockScales, role);

      expect(result).toBe(4000); // user cost for 0-4 band
    });
  });

  describe('Sliding Scale Band Selection', () => {
    it('should select 0-4 band for 0 extensions (admin)', () => {
      const result = calculateGrossProfit(0, mockScales, 'admin');
      expect(result).toBe(5000);
    });

    it('should select 0-4 band for 4 extensions (boundary, admin)', () => {
      const result = calculateGrossProfit(4, mockScales, 'admin');
      expect(result).toBe(5000);
    });

    it('should select 5-8 band for 5 extensions (boundary, admin)', () => {
      const result = calculateGrossProfit(5, mockScales, 'admin');
      expect(result).toBe(7500);
    });

    it('should select 5-8 band for 8 extensions (boundary, admin)', () => {
      const result = calculateGrossProfit(8, mockScales, 'admin');
      expect(result).toBe(7500);
    });

    it('should select 9-16 band for 9 extensions (boundary, admin)', () => {
      const result = calculateGrossProfit(9, mockScales, 'admin');
      expect(result).toBe(10000);
    });

    it('should select 9-16 band for 16 extensions (boundary, admin)', () => {
      const result = calculateGrossProfit(16, mockScales, 'admin');
      expect(result).toBe(10000);
    });

    it('should select 17-32 band for 17 extensions (boundary, admin)', () => {
      const result = calculateGrossProfit(17, mockScales, 'admin');
      expect(result).toBe(12500);
    });

    it('should select 17-32 band for 32 extensions (boundary, admin)', () => {
      const result = calculateGrossProfit(32, mockScales, 'admin');
      expect(result).toBe(12500);
    });

    it('should select 33+ band for 33 extensions (boundary, admin)', () => {
      const result = calculateGrossProfit(33, mockScales, 'admin');
      expect(result).toBe(15000);
    });

    it('should select 33+ band for 100 extensions (admin)', () => {
      const result = calculateGrossProfit(100, mockScales, 'admin');
      expect(result).toBe(15000);
    });
  });

  describe('Role-Based Pricing', () => {
    const extensionCount = 10; // 9-16 band

    it('should use admin pricing for admin role', () => {
      const result = calculateGrossProfit(extensionCount, mockScales, 'admin');
      expect(result).toBe(10000); // cost field
    });

    it('should use manager pricing for manager role', () => {
      const result = calculateGrossProfit(extensionCount, mockScales, 'manager');
      expect(result).toBe(9000); // managerCost field
    });

    it('should use user pricing for user role', () => {
      const result = calculateGrossProfit(extensionCount, mockScales, 'user');
      expect(result).toBe(8000); // userCost field
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative custom profit', () => {
      const customProfit = -5000;
      const result = calculateGrossProfit(5, mockScales, 'admin', customProfit);
      expect(result).toBe(customProfit);
    });

    it('should handle decimal custom profit', () => {
      const customProfit = 7500.50;
      const result = calculateGrossProfit(5, mockScales, 'admin', customProfit);
      expect(result).toBe(customProfit);
    });

    it('should handle very small custom profit', () => {
      const customProfit = 0.01;
      const result = calculateGrossProfit(5, mockScales, 'admin', customProfit);
      expect(result).toBe(customProfit);
    });
  });

  describe('Integration with Sliding Scale Function', () => {
    it('should use getSlidingScaleBand correctly for gross profit', () => {
      const extensionCount = 12;
      const role: UserRole = 'manager';

      const directResult = getSlidingScaleBand(extensionCount, mockScales.gross_profit, role);
      const calculatedResult = calculateGrossProfit(extensionCount, mockScales, role);

      expect(calculatedResult).toBe(directResult);
      expect(calculatedResult).toBe(9000); // manager cost for 9-16 band
    });
  });
});
