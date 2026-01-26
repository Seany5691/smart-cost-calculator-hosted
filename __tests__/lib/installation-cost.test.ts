/**
 * Unit Tests for Installation Cost Calculation
 * Feature: calculator-migration-parity
 * Task 3.3: Add extension and fuel cost calculations
 * 
 * These tests validate that installation cost correctly sums:
 * - Installation base (from sliding scale)
 * - Extension cost (count × cost_per_point)
 * - Fuel cost (distance × cost_per_kilometer)
 * 
 * Validates: Requirements 7.5, 7.6
 */

import {
  calculateInstallation,
  calculateExtensionCost,
  calculateFuelCost,
  calculateAllTotals,
  type CalculateTotalsInput,
} from '@/lib/calculator';
import type { Scales, FactorSheet } from '@/lib/store/config';

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

// Mock factors data for testing
const mockFactors: FactorSheet = {
  '36': {
    '0': {
      '0-50000': 0.03500,
      '50001-100000': 0.03400,
      '100001+': 0.03300,
    },
    '10': {
      '0-50000': 0.03800,
      '50001-100000': 0.03700,
      '100001+': 0.03600,
    },
    '15': {
      '0-50000': 0.04000,
      '50001-100000': 0.03900,
      '100001+': 0.03800,
    },
  },
  '48': {
    '0': {
      '0-50000': 0.02800,
      '50001-100000': 0.02700,
      '100001+': 0.02600,
    },
    '10': {
      '0-50000': 0.03100,
      '50001-100000': 0.03000,
      '100001+': 0.02900,
    },
    '15': {
      '0-50000': 0.03300,
      '50001-100000': 0.03200,
      '100001+': 0.03100,
    },
  },
  '60': {
    '0': {
      '0-50000': 0.02400,
      '50001-100000': 0.02300,
      '100001+': 0.02200,
    },
    '10': {
      '0-50000': 0.02700,
      '50001-100000': 0.02600,
      '100001+': 0.02500,
    },
    '15': {
      '0-50000': 0.02900,
      '50001-100000': 0.02800,
      '100001+': 0.02700,
    },
  },
};

describe('Installation Cost Calculation - Task 3.3', () => {
  describe('Individual component calculations', () => {
    test('should calculate installation base from sliding scale', () => {
      // 5 extensions should use the '5-8' band
      const extensionCount = 5;
      const installationBase = calculateInstallation(extensionCount, mockScales, 'admin');
      expect(installationBase).toBe(3500);
    });

    test('should calculate extension cost: count × cost_per_point', () => {
      const extensionCount = 5;
      const extensionCost = calculateExtensionCost(extensionCount, mockScales, 'admin');
      // 5 × 750 = 3750
      expect(extensionCost).toBe(3750);
    });

    test('should calculate fuel cost: distance × cost_per_kilometer', () => {
      const distance = 100;
      const fuelCost = calculateFuelCost(distance, mockScales, 'admin');
      // 100 × 1.5 = 150
      expect(fuelCost).toBe(150);
    });
  });

  describe('Installation total summation', () => {
    test('should sum installation base + extension + fuel (admin pricing)', () => {
      const extensionCount = 5;
      const distance = 100;

      const installationBase = calculateInstallation(extensionCount, mockScales, 'admin');
      const extensionCost = calculateExtensionCost(extensionCount, mockScales, 'admin');
      const fuelCost = calculateFuelCost(distance, mockScales, 'admin');

      const expectedTotal = installationBase + extensionCost + fuelCost;
      // 3500 + 3750 + 150 = 7400
      expect(expectedTotal).toBe(7400);
    });

    test('should sum installation base + extension + fuel (manager pricing)', () => {
      const extensionCount = 5;
      const distance = 100;

      const installationBase = calculateInstallation(extensionCount, mockScales, 'manager');
      const extensionCost = calculateExtensionCost(extensionCount, mockScales, 'manager');
      const fuelCost = calculateFuelCost(distance, mockScales, 'manager');

      const expectedTotal = installationBase + extensionCost + fuelCost;
      // 4000 + 4250 + 170 = 8420
      expect(expectedTotal).toBe(8420);
    });

    test('should sum installation base + extension + fuel (user pricing)', () => {
      const extensionCount = 5;
      const distance = 100;

      const installationBase = calculateInstallation(extensionCount, mockScales, 'user');
      const extensionCost = calculateExtensionCost(extensionCount, mockScales, 'user');
      const fuelCost = calculateFuelCost(distance, mockScales, 'user');

      const expectedTotal = installationBase + extensionCost + fuelCost;
      // 4500 + 4750 + 200 = 9450
      expect(expectedTotal).toBe(9450);
    });
  });

  describe('Integration with calculateAllTotals', () => {
    test('should correctly calculate installationTotal in full calculation', () => {
      const input: CalculateTotalsInput = {
        hardwareItems: [
          {
            cost: 1000,
            managerCost: 1100,
            userCost: 1200,
            selectedQuantity: 5,
            isExtension: true,
          },
        ],
        connectivityItems: [],
        licensingItems: [],
        term: 36,
        escalation: 0,
        distance: 100,
        scales: mockScales,
        factors: mockFactors,
        role: 'admin',
      };

      const result = calculateAllTotals(input);

      // Extension count should be 5
      expect(result.extensionCount).toBe(5);

      // Installation base for 5 extensions (5-8 band) = 3500
      const expectedInstallationBase = 3500;
      
      // Extension cost: 5 × 750 = 3750
      expect(result.extensionTotal).toBe(3750);
      
      // Fuel cost: 100 × 1.5 = 150
      expect(result.fuelTotal).toBe(150);
      
      // Installation total should be: 3500 + 3750 + 150 = 7400
      expect(result.installationTotal).toBe(7400);
    });

    test('should handle zero extensions and zero distance', () => {
      const input: CalculateTotalsInput = {
        hardwareItems: [
          {
            cost: 1000,
            managerCost: 1100,
            userCost: 1200,
            selectedQuantity: 2,
            isExtension: false, // Not an extension
          },
        ],
        connectivityItems: [],
        licensingItems: [],
        term: 36,
        escalation: 0,
        distance: 0, // No distance
        scales: mockScales,
        factors: mockFactors,
        role: 'admin',
      };

      const result = calculateAllTotals(input);

      // Extension count should be 0
      expect(result.extensionCount).toBe(0);

      // Installation base for 0 extensions (0-4 band) = 3500
      const expectedInstallationBase = 3500;
      
      // Extension cost: 0 × 750 = 0
      expect(result.extensionTotal).toBe(0);
      
      // Fuel cost: 0 × 1.5 = 0
      expect(result.fuelTotal).toBe(0);
      
      // Installation total should be: 3500 + 0 + 0 = 3500
      expect(result.installationTotal).toBe(3500);
    });

    test('should handle large extension count and distance', () => {
      const input: CalculateTotalsInput = {
        hardwareItems: [
          {
            cost: 1000,
            managerCost: 1100,
            userCost: 1200,
            selectedQuantity: 50,
            isExtension: true,
          },
        ],
        connectivityItems: [],
        licensingItems: [],
        term: 36,
        escalation: 0,
        distance: 500,
        scales: mockScales,
        factors: mockFactors,
        role: 'admin',
      };

      const result = calculateAllTotals(input);

      // Extension count should be 50
      expect(result.extensionCount).toBe(50);

      // Installation base for 50 extensions (33+ band) = 15000
      const expectedInstallationBase = 15000;
      
      // Extension cost: 50 × 750 = 37500
      expect(result.extensionTotal).toBe(37500);
      
      // Fuel cost: 500 × 1.5 = 750
      expect(result.fuelTotal).toBe(750);
      
      // Installation total should be: 15000 + 37500 + 750 = 53250
      expect(result.installationTotal).toBe(53250);
    });

    test('should apply correct role-based pricing for all components', () => {
      const input: CalculateTotalsInput = {
        hardwareItems: [
          {
            cost: 1000,
            managerCost: 1100,
            userCost: 1200,
            selectedQuantity: 10,
            isExtension: true,
          },
        ],
        connectivityItems: [],
        licensingItems: [],
        term: 36,
        escalation: 0,
        distance: 200,
        scales: mockScales,
        factors: mockFactors,
        role: 'manager',
      };

      const result = calculateAllTotals(input);

      // Extension count should be 10
      expect(result.extensionCount).toBe(10);

      // Installation base for 10 extensions (9-16 band) with manager pricing = 8000
      const expectedInstallationBase = 8000;
      
      // Extension cost: 10 × 850 (manager cost_per_point) = 8500
      expect(result.extensionTotal).toBe(8500);
      
      // Fuel cost: 200 × 1.7 (manager cost_per_kilometer) = 340
      expect(result.fuelTotal).toBe(340);
      
      // Installation total should be: 8000 + 8500 + 340 = 16840
      expect(result.installationTotal).toBe(16840);
    });
  });

  describe('Edge cases', () => {
    test('should handle decimal distance values', () => {
      const distance = 123.45;
      const fuelCost = calculateFuelCost(distance, mockScales, 'admin');
      // 123.45 × 1.5 = 185.175
      expect(fuelCost).toBeCloseTo(185.175, 2);
    });

    test('should handle boundary between sliding scale bands', () => {
      // Test at boundary: 4 extensions (top of 0-4 band)
      const extensionCount4 = 4;
      const installationBase4 = calculateInstallation(extensionCount4, mockScales, 'admin');
      expect(installationBase4).toBe(3500);

      // Test at boundary: 5 extensions (bottom of 5-8 band)
      const extensionCount5 = 5;
      const installationBase5 = calculateInstallation(extensionCount5, mockScales, 'admin');
      expect(installationBase5).toBe(3500);

      // Test at boundary: 8 extensions (top of 5-8 band)
      const extensionCount8 = 8;
      const installationBase8 = calculateInstallation(extensionCount8, mockScales, 'admin');
      expect(installationBase8).toBe(3500);

      // Test at boundary: 9 extensions (bottom of 9-16 band)
      const extensionCount9 = 9;
      const installationBase9 = calculateInstallation(extensionCount9, mockScales, 'admin');
      expect(installationBase9).toBe(7000);
    });

    test('should handle mixed hardware items (some extensions, some not)', () => {
      const input: CalculateTotalsInput = {
        hardwareItems: [
          {
            cost: 1000,
            managerCost: 1100,
            userCost: 1200,
            selectedQuantity: 3,
            isExtension: true,
          },
          {
            cost: 500,
            managerCost: 550,
            userCost: 600,
            selectedQuantity: 5,
            isExtension: false, // Not an extension
          },
          {
            cost: 2000,
            managerCost: 2200,
            userCost: 2400,
            selectedQuantity: 2,
            isExtension: true,
          },
        ],
        connectivityItems: [],
        licensingItems: [],
        term: 36,
        escalation: 0,
        distance: 50,
        scales: mockScales,
        factors: mockFactors,
        role: 'admin',
      };

      const result = calculateAllTotals(input);

      // Extension count should be 3 + 2 = 5 (not counting the non-extension item)
      expect(result.extensionCount).toBe(5);

      // Installation base for 5 extensions (5-8 band) = 3500
      // Extension cost: 5 × 750 = 3750
      // Fuel cost: 50 × 1.5 = 75
      // Installation total: 3500 + 3750 + 75 = 7325
      expect(result.installationTotal).toBe(7325);
    });
  });
});
