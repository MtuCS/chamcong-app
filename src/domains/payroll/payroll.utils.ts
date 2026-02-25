/**
 * Payroll Utilities - SINGLE SOURCE OF TRUTH
 * 
 * All salary/tour/trip calculations MUST use these functions.
 * DO NOT duplicate these formulas anywhere else!
 */

import { Role, PayRates } from '../../types';

/**
 * Convert shift count to trips
 * Rule: 1 shift = 1 trip
 */
export function calcTripsFromShifts(shiftCount: number): number {
  return shiftCount;
}

/**
 * Calculate number of complete tours from trips
 * Rule: 2 trips = 1 tour
 */
export function calcTours(trips: number, tripsPerTour: number = 2): number {
  return Math.floor(trips / tripsPerTour);
}

/**
 * Calculate remaining trips after tours
 */
export function calcRemainingTrips(trips: number, tripsPerTour: number = 2): number {
  return trips % tripsPerTour;
}

/**
 * Format tour text
 * Example: 5 trips → "2 tour + 1 lẻ"
 */
export function formatTourText(trips: number, tripsPerTour: number = 2): string {
  const tours = calcTours(trips, tripsPerTour);
  const remaining = calcRemainingTrips(trips, tripsPerTour);
  
  if (tours === 0 && remaining === 0) return '0 chuyến';
  if (tours === 0) return `${remaining} chuyến lẻ`;
  if (remaining === 0) return `${tours} tour`;
  return `${tours} tour + ${remaining} lẻ`;
}

/**
 * Get trip rate by role
 */
export function getTripRateByRole(role: Role | string, rates: PayRates): number {
  if (role === Role.DRIVER || role === 'DRIVER') {
    return rates.driverTrip;
  }
  return rates.assistantTrip;
}

/**
 * Calculate total salary amount
 * @param role - Employee role (DRIVER or ASSISTANT)
 * @param trips - Total number of trips
 * @param rates - Pay rates configuration
 */
export function calcAmount(role: Role | string, trips: number, rates: PayRates): number {
  const tripRate = getTripRateByRole(role, rates);
  return trips * tripRate;
}

/**
 * Calculate salary breakdown
 */
export interface SalaryBreakdown {
  trips: number;
  tours: number;
  remainingTrips: number;
  tourText: string;
  tripRate: number;
  totalAmount: number;
}

export function calcSalaryBreakdown(
  role: Role | string,
  trips: number,
  rates: PayRates
): SalaryBreakdown {
  const tripRate = getTripRateByRole(role, rates);
  const tours = calcTours(trips, rates.tourTrips);
  const remainingTrips = calcRemainingTrips(trips, rates.tourTrips);
  
  return {
    trips,
    tours,
    remainingTrips,
    tourText: formatTourText(trips, rates.tourTrips),
    tripRate,
    totalAmount: trips * tripRate,
  };
}

/**
 * Calculate remainder after advances
 */
export function calcRemainder(totalSalary: number, totalAdvances: number): number {
  return totalSalary - totalAdvances;
}

/**
 * Format currency in VND
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Format currency in VND with style
 */
export function formatVNDCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND' 
  }).format(amount);
}

/**
 * Calculate daily amount for a run
 */
export function calcRunAmount(trips: number, rates: PayRates): {
  driverAmount: number;
  assistantAmount: number;
  totalAmount: number;
} {
  const driverAmount = trips * rates.driverTrip;
  const assistantAmount = trips * rates.assistantTrip;
  return {
    driverAmount,
    assistantAmount,
    totalAmount: driverAmount + assistantAmount,
  };
}
