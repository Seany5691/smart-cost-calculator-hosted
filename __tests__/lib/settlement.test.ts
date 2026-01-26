/**
 * Unit tests for settlement calculation
 * Requirements: 6.5, 6.6, 6.7, 6.9, 6.10, 6.11, 6.12
 */

import { calculateSettlement } from '../../lib/calculator';

describe('Settlement Calculation', () => {
  describe('Basic Settlement Calculation', () => {
    it('should calculate settlement for starting rental type', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2022-06-15'); // 2.5 years later
      const rentalAmount = 1000; // Starting rental
      const escalationRate = 10; // 10%
      const rentalTerm = 36; // 3 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.startingRental).toBe(1000);
      expect(result.calculations).toHaveLength(3); // 3 years
      
      // Year 1: Completed (2020-01-01 to 2021-01-01)
      expect(result.calculations[0].year).toBe(1);
      expect(result.calculations[0].isCompleted).toBe(true);
      expect(result.calculations[0].monthsRemaining).toBe(0);
      expect(result.calculations[0].amount).toBe(0);
      expect(result.calculations[0].rental).toBe(1000);
      
      // Year 2: Completed (2021-01-01 to 2022-01-01)
      expect(result.calculations[1].year).toBe(2);
      expect(result.calculations[1].isCompleted).toBe(true);
      expect(result.calculations[1].monthsRemaining).toBe(0);
      expect(result.calculations[1].amount).toBe(0);
      expect(result.calculations[1].rental).toBe(1100); // 1000 × 1.10
      
      // Year 3: Partial (2022-01-01 to 2023-01-01, current: 2022-06-15)
      expect(result.calculations[2].year).toBe(3);
      expect(result.calculations[2].isCompleted).toBe(false);
      expect(result.calculations[2].monthsRemaining).toBeGreaterThan(0);
      expect(result.calculations[2].rental).toBe(1210); // 1100 × 1.10
      
      // Total should only include partial year
      expect(result.totalSettlement).toBeGreaterThan(0);
    });

    it('should calculate settlement for current rental type with de-escalation', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2022-06-15'); // 2.5 years later
      const currentRental = 1210; // Current rental (after 2 years of 10% escalation)
      const escalationRate = 10; // 10%
      const rentalTerm = 36; // 3 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        currentRental,
        escalationRate,
        rentalTerm,
        'current',
        currentDate
      );
      
      // Assert
      // Should de-escalate: 1210 / 1.10 / 1.10 = 1000
      expect(result.startingRental).toBeCloseTo(1000, 2);
      
      // Year 3 rental should be 1210 (current rental)
      expect(result.calculations[2].rental).toBeCloseTo(1210, 2);
    });
  });

  describe('Year Classification - Requirement 6.9, 6.10, 6.11', () => {
    it('should mark all years as completed when contract is finished', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2024-01-01'); // 4 years later
      const rentalAmount = 1000;
      const escalationRate = 0;
      const rentalTerm = 36; // 3 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.calculations).toHaveLength(3);
      result.calculations.forEach(calc => {
        expect(calc.isCompleted).toBe(true);
        expect(calc.monthsRemaining).toBe(0);
        expect(calc.amount).toBe(0);
      });
      expect(result.totalSettlement).toBe(0);
    });

    it('should mark all years as pending when contract has not started', () => {
      // Arrange
      const startDate = new Date('2025-01-01'); // Future start
      const currentDate = new Date('2024-01-01');
      const rentalAmount = 1000;
      const escalationRate = 10;
      const rentalTerm = 36; // 3 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.calculations).toHaveLength(3);
      result.calculations.forEach(calc => {
        expect(calc.isCompleted).toBe(false);
        expect(calc.monthsRemaining).toBe(12);
        expect(calc.amount).toBeGreaterThan(0);
      });
    });

    it('should calculate partial year correctly using CEIL((endDate - currentDate) / 30.44)', () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const currentDate = new Date('2023-07-01'); // 6 months into year 1
      const rentalAmount = 1200; // Monthly rental
      const escalationRate = 0;
      const rentalTerm = 12; // 1 year
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.calculations).toHaveLength(1);
      
      // Calculate expected months remaining
      const yearEndDate = new Date('2024-01-01');
      const daysRemaining = (yearEndDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000);
      const expectedMonths = Math.ceil(daysRemaining / 30.44);
      
      expect(result.calculations[0].monthsRemaining).toBe(expectedMonths);
      expect(result.calculations[0].amount).toBe(rentalAmount * expectedMonths);
      expect(result.calculations[0].isCompleted).toBe(false);
    });
  });

  describe('Escalation Compounding - Requirement 6.12', () => {
    it('should apply escalation at start of each year: rental × (1 + escalation/100)', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2019-01-01'); // Before start (all years pending)
      const rentalAmount = 1000;
      const escalationRate = 10; // 10%
      const rentalTerm = 36; // 3 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.calculations).toHaveLength(3);
      
      // Year 1: 1000
      expect(result.calculations[0].rental).toBe(1000);
      expect(result.calculations[0].amount).toBe(1000 * 12);
      
      // Year 2: 1000 × 1.10 = 1100
      expect(result.calculations[1].rental).toBe(1100);
      expect(result.calculations[1].amount).toBe(1100 * 12);
      
      // Year 3: 1100 × 1.10 = 1210
      expect(result.calculations[2].rental).toBe(1210);
      expect(result.calculations[2].amount).toBe(1210 * 12);
      
      // Total settlement
      const expectedTotal = (1000 * 12) + (1100 * 12) + (1210 * 12);
      expect(result.totalSettlement).toBe(expectedTotal);
    });

    it('should handle 0% escalation correctly', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2019-01-01'); // Before start
      const rentalAmount = 1000;
      const escalationRate = 0; // 0%
      const rentalTerm = 36; // 3 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      result.calculations.forEach(calc => {
        expect(calc.rental).toBe(1000); // No escalation
        expect(calc.amount).toBe(1000 * 12);
      });
    });

    it('should handle 15% escalation correctly', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2019-01-01'); // Before start
      const rentalAmount = 1000;
      const escalationRate = 15; // 15%
      const rentalTerm = 24; // 2 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.calculations).toHaveLength(2);
      
      // Year 1: 1000
      expect(result.calculations[0].rental).toBe(1000);
      
      // Year 2: 1000 × 1.15 = 1150
      expect(result.calculations[1].rental).toBe(1150);
    });
  });

  describe('De-escalation for Current Rental - Requirement 6.6', () => {
    it('should de-escalate current rental to get starting rental', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2022-01-01'); // Exactly 2 years later
      const currentRental = 1210; // After 2 years of 10% escalation from 1000
      const escalationRate = 10;
      const rentalTerm = 36;
      
      // Act
      const result = calculateSettlement(
        startDate,
        currentRental,
        escalationRate,
        rentalTerm,
        'current',
        currentDate
      );
      
      // Assert
      // De-escalate: 1210 / 1.10 / 1.10 = 1000
      expect(result.startingRental).toBeCloseTo(1000, 2);
    });

    it('should handle partial year when de-escalating', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2021-06-15'); // 1.5 years later
      const currentRental = 1100; // After 1 year of 10% escalation
      const escalationRate = 10;
      const rentalTerm = 36;
      
      // Act
      const result = calculateSettlement(
        startDate,
        currentRental,
        escalationRate,
        rentalTerm,
        'current',
        currentDate
      );
      
      // Assert
      // Should de-escalate by 1 complete year: 1100 / 1.10 = 1000
      expect(result.startingRental).toBeCloseTo(1000, 2);
    });

    it('should not de-escalate when using starting rental type', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2022-01-01');
      const startingRental = 1000;
      const escalationRate = 10;
      const rentalTerm = 36;
      
      // Act
      const result = calculateSettlement(
        startDate,
        startingRental,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.startingRental).toBe(1000); // No de-escalation
    });
  });

  describe('Edge Cases', () => {
    it('should handle 1-year contract', () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const currentDate = new Date('2023-06-01');
      const rentalAmount = 1000;
      const escalationRate = 0;
      const rentalTerm = 12;
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.calculations).toHaveLength(1);
      expect(result.calculations[0].isCompleted).toBe(false);
    });

    it('should handle 5-year contract', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2019-01-01'); // Before start
      const rentalAmount = 1000;
      const escalationRate = 5;
      const rentalTerm = 60; // 5 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.calculations).toHaveLength(5);
      
      // Verify escalation compounds correctly over 5 years
      expect(result.calculations[0].rental).toBe(1000);
      expect(result.calculations[1].rental).toBeCloseTo(1050, 2);
      expect(result.calculations[2].rental).toBeCloseTo(1102.5, 2);
      expect(result.calculations[3].rental).toBeCloseTo(1157.625, 2);
      expect(result.calculations[4].rental).toBeCloseTo(1215.506, 2);
    });

    it('should handle contract on exact year boundary', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2022-01-01'); // Exactly 2 years
      const rentalAmount = 1000;
      const escalationRate = 10;
      const rentalTerm = 36;
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      // Years 1 and 2 should be completed
      expect(result.calculations[0].isCompleted).toBe(true);
      expect(result.calculations[1].isCompleted).toBe(true);
      
      // Year 3 should be pending (full year)
      expect(result.calculations[2].isCompleted).toBe(false);
      expect(result.calculations[2].monthsRemaining).toBe(12);
    });

    it('should handle very small rental amounts', () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const currentDate = new Date('2023-06-01');
      const rentalAmount = 0.01;
      const escalationRate = 10;
      const rentalTerm = 12;
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.totalSettlement).toBeGreaterThan(0);
      expect(result.startingRental).toBe(0.01);
    });

    it('should handle very large rental amounts', () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const currentDate = new Date('2023-06-01');
      const rentalAmount = 1000000;
      const escalationRate = 10;
      const rentalTerm = 12;
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.totalSettlement).toBeGreaterThan(0);
      expect(result.startingRental).toBe(1000000);
    });
  });

  describe('Months Remaining Calculation', () => {
    it('should calculate months remaining correctly for mid-year date', () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const currentDate = new Date('2023-07-01'); // Exactly 6 months
      const rentalAmount = 1000;
      const escalationRate = 0;
      const rentalTerm = 12;
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      const yearEndDate = new Date('2024-01-01');
      const daysRemaining = (yearEndDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000);
      const expectedMonths = Math.ceil(daysRemaining / 30.44);
      
      expect(result.calculations[0].monthsRemaining).toBe(expectedMonths);
    });

    it('should use CEIL for months remaining calculation', () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const currentDate = new Date('2023-12-15'); // Near end of year
      const rentalAmount = 1000;
      const escalationRate = 0;
      const rentalTerm = 12;
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      // Should round up even for partial month
      expect(result.calculations[0].monthsRemaining).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed completed, partial, and pending years', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2022-06-15'); // 2.5 years in
      const rentalAmount = 1000;
      const escalationRate = 10;
      const rentalTerm = 60; // 5 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        rentalAmount,
        escalationRate,
        rentalTerm,
        'starting',
        currentDate
      );
      
      // Assert
      expect(result.calculations).toHaveLength(5);
      
      // Years 1-2: Completed
      expect(result.calculations[0].isCompleted).toBe(true);
      expect(result.calculations[1].isCompleted).toBe(true);
      
      // Year 3: Partial
      expect(result.calculations[2].isCompleted).toBe(false);
      expect(result.calculations[2].monthsRemaining).toBeGreaterThan(0);
      expect(result.calculations[2].monthsRemaining).toBeLessThan(12);
      
      // Years 4-5: Pending
      expect(result.calculations[3].isCompleted).toBe(false);
      expect(result.calculations[3].monthsRemaining).toBe(12);
      expect(result.calculations[4].isCompleted).toBe(false);
      expect(result.calculations[4].monthsRemaining).toBe(12);
      
      // Total should only include partial and pending years
      const expectedTotal = 
        result.calculations[2].amount +
        result.calculations[3].amount +
        result.calculations[4].amount;
      expect(result.totalSettlement).toBe(expectedTotal);
    });

    it('should calculate correct settlement with current rental and escalation', () => {
      // Arrange
      const startDate = new Date('2020-01-01');
      const currentDate = new Date('2023-01-01'); // Exactly 3 years
      const currentRental = 1331; // 1000 × 1.10^3
      const escalationRate = 10;
      const rentalTerm = 60; // 5 years
      
      // Act
      const result = calculateSettlement(
        startDate,
        currentRental,
        escalationRate,
        rentalTerm,
        'current',
        currentDate
      );
      
      // Assert
      // Should de-escalate to 1000
      expect(result.startingRental).toBeCloseTo(1000, 2);
      
      // Years 1-3: Completed
      expect(result.calculations[0].isCompleted).toBe(true);
      expect(result.calculations[1].isCompleted).toBe(true);
      expect(result.calculations[2].isCompleted).toBe(true);
      
      // Years 4-5: Pending with correct escalation
      expect(result.calculations[3].rental).toBeCloseTo(1331, 2); // Year 4
      expect(result.calculations[4].rental).toBeCloseTo(1464.1, 2); // Year 5
    });
  });
});
