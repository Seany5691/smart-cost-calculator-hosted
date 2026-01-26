/**
 * Unit tests for sliding scale lookup functions
 * Task 3.1: Create sliding scale lookup function
 * Requirements: 7.4 (Installation sliding scale)
 */

import { getSlidingScaleBand, getFinanceFeeBand, UserRole } from '../../lib/calculator';

describe('getSlidingScaleBand', () => {
  // Mock sliding scale bands for testing
  const mockBands = {
    '0-4': { cost: 1000, managerCost: 1200, userCost: 1500 },
    '5-8': { cost: 2000, managerCost: 2400, userCost: 3000 },
    '9-16': { cost: 3000, managerCost: 3600, userCost: 4500 },
    '17-32': { cost: 4000, managerCost: 4800, userCost: 6000 },
    '33+': { cost: 5000, managerCost: 6000, userCost: 7500 },
  };

  describe('Band Selection', () => {
    it('should select 0-4 band for 0 extensions', () => {
      const result = getSlidingScaleBand(0, mockBands, 'admin');
      expect(result).toBe(1000);
    });

    it('should select 0-4 band for 4 extensions (boundary)', () => {
      const result = getSlidingScaleBand(4, mockBands, 'admin');
      expect(result).toBe(1000);
    });

    it('should select 5-8 band for 5 extensions (boundary)', () => {
      const result = getSlidingScaleBand(5, mockBands, 'admin');
      expect(result).toBe(2000);
    });

    it('should select 5-8 band for 8 extensions (boundary)', () => {
      const result = getSlidingScaleBand(8, mockBands, 'admin');
      expect(result).toBe(2000);
    });

    it('should select 9-16 band for 9 extensions (boundary)', () => {
      const result = getSlidingScaleBand(9, mockBands, 'admin');
      expect(result).toBe(3000);
    });

    it('should select 9-16 band for 16 extensions (boundary)', () => {
      const result = getSlidingScaleBand(16, mockBands, 'admin');
      expect(result).toBe(3000);
    });

    it('should select 17-32 band for 17 extensions (boundary)', () => {
      const result = getSlidingScaleBand(17, mockBands, 'admin');
      expect(result).toBe(4000);
    });

    it('should select 17-32 band for 32 extensions (boundary)', () => {
      const result = getSlidingScaleBand(32, mockBands, 'admin');
      expect(result).toBe(4000);
    });

    it('should select 33+ band for 33 extensions (boundary)', () => {
      const result = getSlidingScaleBand(33, mockBands, 'admin');
      expect(result).toBe(5000);
    });

    it('should select 33+ band for 100 extensions', () => {
      const result = getSlidingScaleBand(100, mockBands, 'admin');
      expect(result).toBe(5000);
    });
  });

  describe('Role-Based Pricing', () => {
    it('should return cost for admin role', () => {
      const result = getSlidingScaleBand(5, mockBands, 'admin');
      expect(result).toBe(2000); // cost from 5-8 band
    });

    it('should return managerCost for manager role', () => {
      const result = getSlidingScaleBand(5, mockBands, 'manager');
      expect(result).toBe(2400); // managerCost from 5-8 band
    });

    it('should return userCost for user role', () => {
      const result = getSlidingScaleBand(5, mockBands, 'user');
      expect(result).toBe(3000); // userCost from 5-8 band
    });
  });

  describe('Edge Cases', () => {
    it('should handle 1 extension (middle of 0-4 band)', () => {
      const result = getSlidingScaleBand(1, mockBands, 'admin');
      expect(result).toBe(1000);
    });

    it('should handle 10 extensions (middle of 9-16 band)', () => {
      const result = getSlidingScaleBand(10, mockBands, 'admin');
      expect(result).toBe(3000);
    });

    it('should handle 25 extensions (middle of 17-32 band)', () => {
      const result = getSlidingScaleBand(25, mockBands, 'admin');
      expect(result).toBe(4000);
    });

    it('should handle very large extension count', () => {
      const result = getSlidingScaleBand(1000, mockBands, 'admin');
      expect(result).toBe(5000);
    });

    it('should use fallback band when specific band is missing', () => {
      // When '33+' band is missing, it should fall back to '0-4'
      const incompleteBands = {
        '0-4': { cost: 1000, managerCost: 1200, userCost: 1500 },
      };
      
      // Extension count 50 would normally use '33+' band, but it's missing
      // So it should fall back to '0-4' band
      const result = getSlidingScaleBand(50, incompleteBands, 'admin');
      expect(result).toBe(1000); // Falls back to '0-4' band cost
    });

    it('should throw error if all fallback bands are missing', () => {
      // Empty bands object - no fallbacks available
      const emptyBands = {};
      
      expect(() => {
        getSlidingScaleBand(50, emptyBands, 'admin');
      }).toThrow('Sliding scale band not found');
    });
  });

  describe('All Bands Coverage', () => {
    it('should correctly select each band at least once', () => {
      const testCases = [
        { count: 2, expectedCost: 1000, band: '0-4' },
        { count: 6, expectedCost: 2000, band: '5-8' },
        { count: 12, expectedCost: 3000, band: '9-16' },
        { count: 20, expectedCost: 4000, band: '17-32' },
        { count: 50, expectedCost: 5000, band: '33+' },
      ];

      testCases.forEach(({ count, expectedCost, band }) => {
        const result = getSlidingScaleBand(count, mockBands, 'admin');
        expect(result).toBe(expectedCost);
      });
    });
  });
});

describe('getFinanceFeeBand', () => {
  // Mock finance fee bands for testing
  const mockFeeBands = {
    '0-20000': { cost: 500, managerCost: 600, userCost: 750 },
    '20001-50000': { cost: 1000, managerCost: 1200, userCost: 1500 },
    '50001-100000': { cost: 2000, managerCost: 2400, userCost: 3000 },
    '100001+': { cost: 3000, managerCost: 3600, userCost: 4500 },
  };

  describe('Band Selection', () => {
    it('should select 0-20000 band for 0 payout', () => {
      const result = getFinanceFeeBand(0, mockFeeBands, 'admin');
      expect(result).toBe(500);
    });

    it('should select 0-20000 band for 20000 payout (boundary)', () => {
      const result = getFinanceFeeBand(20000, mockFeeBands, 'admin');
      expect(result).toBe(500);
    });

    it('should select 20001-50000 band for 20001 payout (boundary)', () => {
      const result = getFinanceFeeBand(20001, mockFeeBands, 'admin');
      expect(result).toBe(1000);
    });

    it('should select 20001-50000 band for 50000 payout (boundary)', () => {
      const result = getFinanceFeeBand(50000, mockFeeBands, 'admin');
      expect(result).toBe(1000);
    });

    it('should select 50001-100000 band for 50001 payout (boundary)', () => {
      const result = getFinanceFeeBand(50001, mockFeeBands, 'admin');
      expect(result).toBe(2000);
    });

    it('should select 50001-100000 band for 100000 payout (boundary)', () => {
      const result = getFinanceFeeBand(100000, mockFeeBands, 'admin');
      expect(result).toBe(2000);
    });

    it('should select 100001+ band for 100001 payout (boundary)', () => {
      const result = getFinanceFeeBand(100001, mockFeeBands, 'admin');
      expect(result).toBe(3000);
    });

    it('should select 100001+ band for very large payout', () => {
      const result = getFinanceFeeBand(1000000, mockFeeBands, 'admin');
      expect(result).toBe(3000);
    });
  });

  describe('Role-Based Pricing', () => {
    it('should return cost for admin role', () => {
      const result = getFinanceFeeBand(30000, mockFeeBands, 'admin');
      expect(result).toBe(1000); // cost from 20001-50000 band
    });

    it('should return managerCost for manager role', () => {
      const result = getFinanceFeeBand(30000, mockFeeBands, 'manager');
      expect(result).toBe(1200); // managerCost from 20001-50000 band
    });

    it('should return userCost for user role', () => {
      const result = getFinanceFeeBand(30000, mockFeeBands, 'user');
      expect(result).toBe(1500); // userCost from 20001-50000 band
    });
  });

  describe('Edge Cases', () => {
    it('should handle 10000 payout (middle of 0-20000 band)', () => {
      const result = getFinanceFeeBand(10000, mockFeeBands, 'admin');
      expect(result).toBe(500);
    });

    it('should handle 35000 payout (middle of 20001-50000 band)', () => {
      const result = getFinanceFeeBand(35000, mockFeeBands, 'admin');
      expect(result).toBe(1000);
    });

    it('should handle 75000 payout (middle of 50001-100000 band)', () => {
      const result = getFinanceFeeBand(75000, mockFeeBands, 'admin');
      expect(result).toBe(2000);
    });

    it('should throw error if bands object is missing required band', () => {
      const incompleteBands = {
        '0-20000': { cost: 500, managerCost: 600, userCost: 750 },
      };
      
      expect(() => {
        getFinanceFeeBand(150000, incompleteBands, 'admin');
      }).toThrow('Finance fee band not found');
    });
  });

  describe('All Bands Coverage', () => {
    it('should correctly select each band at least once', () => {
      const testCases = [
        { amount: 10000, expectedCost: 500, band: '0-20000' },
        { amount: 35000, expectedCost: 1000, band: '20001-50000' },
        { amount: 75000, expectedCost: 2000, band: '50001-100000' },
        { amount: 200000, expectedCost: 3000, band: '100001+' },
      ];

      testCases.forEach(({ amount, expectedCost, band }) => {
        const result = getFinanceFeeBand(amount, mockFeeBands, 'admin');
        expect(result).toBe(expectedCost);
      });
    });
  });
});
