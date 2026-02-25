/**
 * Payroll Utils Tests
 * 
 * Tests for salary calculation (TC01, TC04, TC08, TC10)
 */

import { describe, it, expect } from 'vitest';
import {
  calcTours,
  calcRemainingTrips,
  formatTourText,
  getTripRateByRole,
  calcAmount,
  calcSalaryBreakdown,
  calcRemainder,
  formatVND,
  calcRunAmount,
} from '../domains/payroll/payroll.utils';
import { Role } from '../types';
import {
  DEFAULT_PAY_RATES,
  TC01_EXPECTED,
  TC04_EXPECTED,
  TC10_EXPECTED,
  TC10_ADVANCES,
} from './seed-data';

// ============ TC01: Basic Salary Calculation ============

describe('TC01: Basic Salary Calculation', () => {
  it('should calculate tours from trips correctly', () => {
    // 2 trips = 1 tour
    expect(calcTours(2, 2)).toBe(1);
    expect(calcTours(4, 2)).toBe(2);
    expect(calcTours(5, 2)).toBe(2);
    expect(calcTours(1, 2)).toBe(0);
  });

  it('should calculate remaining trips correctly', () => {
    expect(calcRemainingTrips(2, 2)).toBe(0);
    expect(calcRemainingTrips(3, 2)).toBe(1);
    expect(calcRemainingTrips(5, 2)).toBe(1);
  });

  it('should calculate driver amount correctly', () => {
    // Driver A: 2 trips × 500,000 = 1,000,000
    const amount = calcAmount(Role.DRIVER, 2, DEFAULT_PAY_RATES);
    expect(amount).toBe(TC01_EXPECTED.driverA.amount);
    expect(amount).toBe(1000000);
  });

  it('should calculate assistant amount correctly', () => {
    // Assistant B: 2 trips × 300,000 = 600,000
    const amount = calcAmount(Role.ASSISTANT, 2, DEFAULT_PAY_RATES);
    expect(amount).toBe(TC01_EXPECTED.assistantB.amount);
    expect(amount).toBe(600000);
  });
});

// ============ TC04: trips=2 in single shift ============

describe('TC04: Double Trips in Single Shift', () => {
  it('should calculate 2 trips as 1 tour', () => {
    expect(calcTours(TC04_EXPECTED.totalTrips, 2)).toBe(TC04_EXPECTED.totalTours);
    expect(calcTours(2, 2)).toBe(1);
  });

  it('should calculate correct amounts for trips=2', () => {
    const driverAmount = calcAmount(Role.DRIVER, 2, DEFAULT_PAY_RATES);
    const assistantAmount = calcAmount(Role.ASSISTANT, 2, DEFAULT_PAY_RATES);
    
    expect(driverAmount).toBe(TC04_EXPECTED.driverA.amount);
    expect(assistantAmount).toBe(TC04_EXPECTED.assistantB.amount);
  });
});

// ============ TC08: Assistant Optional ============

describe('TC08: Assistant Optional', () => {
  it('should calculate run amount with only driver', () => {
    const result = calcRunAmount(1, DEFAULT_PAY_RATES);
    
    expect(result.driverAmount).toBe(500000);
    expect(result.assistantAmount).toBe(300000); // Still calculated, UI decides if to use
    expect(result.totalAmount).toBe(800000);
  });

  it('should calculate driver-only salary correctly', () => {
    // When assistant is null, only driver gets paid
    const driverAmount = calcAmount(Role.DRIVER, 1, DEFAULT_PAY_RATES);
    expect(driverAmount).toBe(500000);
  });
});

// ============ TC10: Advances Deduction ============

describe('TC10: Advances Deduction', () => {
  it('should calculate total advances correctly', () => {
    const totalAdvances = TC10_ADVANCES.reduce((sum, a) => sum + a.amount, 0);
    expect(totalAdvances).toBe(TC10_EXPECTED.totalAdvances);
    expect(totalAdvances).toBe(800000);
  });

  it('should calculate remainder after advances', () => {
    const remainder = calcRemainder(
      TC10_EXPECTED.exampleGrossSalary,
      TC10_EXPECTED.totalAdvances
    );
    expect(remainder).toBe(TC10_EXPECTED.exampleNetSalary);
    expect(remainder).toBe(4200000);
  });

  it('should handle zero advances', () => {
    const remainder = calcRemainder(5000000, 0);
    expect(remainder).toBe(5000000);
  });

  it('should handle advances exceeding salary (negative remainder)', () => {
    const remainder = calcRemainder(500000, 800000);
    expect(remainder).toBe(-300000);
  });
});

// ============ UTILITY FUNCTIONS ============

describe('formatTourText', () => {
  it('should format 0 trips', () => {
    expect(formatTourText(0, 2)).toBe('0 chuyến');
  });

  it('should format complete tours only', () => {
    expect(formatTourText(2, 2)).toBe('1 tour');
    expect(formatTourText(4, 2)).toBe('2 tour');
  });

  it('should format remaining trips only', () => {
    expect(formatTourText(1, 2)).toBe('1 chuyến lẻ');
  });

  it('should format tours with remainder', () => {
    expect(formatTourText(3, 2)).toBe('1 tour + 1 lẻ');
    expect(formatTourText(5, 2)).toBe('2 tour + 1 lẻ');
  });
});

describe('formatVND', () => {
  it('should format currency in VND', () => {
    expect(formatVND(1000000)).toContain('1.000.000');
    expect(formatVND(500000)).toContain('500.000');
    expect(formatVND(0)).toContain('0');
  });
});

describe('getTripRateByRole', () => {
  it('should return driver rate for DRIVER role', () => {
    expect(getTripRateByRole(Role.DRIVER, DEFAULT_PAY_RATES)).toBe(500000);
    expect(getTripRateByRole('DRIVER', DEFAULT_PAY_RATES)).toBe(500000);
  });

  it('should return assistant rate for ASSISTANT role', () => {
    expect(getTripRateByRole(Role.ASSISTANT, DEFAULT_PAY_RATES)).toBe(300000);
    expect(getTripRateByRole('ASSISTANT', DEFAULT_PAY_RATES)).toBe(300000);
  });

  it('should default to assistant rate for unknown role', () => {
    expect(getTripRateByRole('UNKNOWN' as Role, DEFAULT_PAY_RATES)).toBe(300000);
  });
});

describe('calcSalaryBreakdown', () => {
  it('should return complete breakdown for driver', () => {
    const breakdown = calcSalaryBreakdown(Role.DRIVER, 5, DEFAULT_PAY_RATES);
    
    expect(breakdown.trips).toBe(5);
    expect(breakdown.tours).toBe(2);
    expect(breakdown.remainingTrips).toBe(1);
    expect(breakdown.tourText).toBe('2 tour + 1 lẻ');
    expect(breakdown.tripRate).toBe(500000);
    expect(breakdown.totalAmount).toBe(2500000);
  });

  it('should return complete breakdown for assistant', () => {
    const breakdown = calcSalaryBreakdown(Role.ASSISTANT, 4, DEFAULT_PAY_RATES);
    
    expect(breakdown.trips).toBe(4);
    expect(breakdown.tours).toBe(2);
    expect(breakdown.remainingTrips).toBe(0);
    expect(breakdown.tourText).toBe('2 tour');
    expect(breakdown.tripRate).toBe(300000);
    expect(breakdown.totalAmount).toBe(1200000);
  });
});

describe('calcRunAmount', () => {
  it('should calculate run amounts correctly', () => {
    const result = calcRunAmount(2, DEFAULT_PAY_RATES);
    
    expect(result.driverAmount).toBe(1000000);
    expect(result.assistantAmount).toBe(600000);
    expect(result.totalAmount).toBe(1600000);
  });

  it('should handle single trip', () => {
    const result = calcRunAmount(1, DEFAULT_PAY_RATES);
    
    expect(result.driverAmount).toBe(500000);
    expect(result.assistantAmount).toBe(300000);
    expect(result.totalAmount).toBe(800000);
  });
});

// ============ EDGE CASES ============

describe('Edge Cases', () => {
  it('should handle large trip counts', () => {
    const amount = calcAmount(Role.DRIVER, 100, DEFAULT_PAY_RATES);
    expect(amount).toBe(50000000);
  });

  it('should handle custom tour trips rate', () => {
    // If 3 trips = 1 tour
    expect(calcTours(6, 3)).toBe(2);
    expect(calcTours(7, 3)).toBe(2);
    expect(calcRemainingTrips(7, 3)).toBe(1);
  });

  it('should handle zero trips', () => {
    const breakdown = calcSalaryBreakdown(Role.DRIVER, 0, DEFAULT_PAY_RATES);
    expect(breakdown.totalAmount).toBe(0);
    expect(breakdown.tours).toBe(0);
  });
});
