/**
 * Seed Test Data
 * 
 * Test data for business logic validation
 * Based on test plan TC01-TC10
 */

import { Direction, Role, Employee, Vehicle, Run, Advance, PayRates, WorklogStatus } from '../types';

// ============ CONSTANTS ============

export const TEST_MONTH = '2026-02';

export const DEFAULT_PAY_RATES: PayRates = {
  driverTrip: 500000,
  assistantTrip: 300000,
  tourTrips: 2,
  maxShiftsPerDay: 2,
};

// ============ EMPLOYEES ============

export const EMPLOYEES: Employee[] = [
  { id: 'emp_A', name: 'Nguyễn Văn A', role: Role.DRIVER, active: true },
  { id: 'emp_B', name: 'Trần Văn B', role: Role.ASSISTANT, active: true },
  { id: 'emp_C', name: 'Lê Văn C', role: Role.DRIVER, active: true },
  { id: 'emp_D', name: 'Phạm Văn D', role: Role.ASSISTANT, active: true },
  { id: 'emp_E', name: 'Hoàng Văn E', role: Role.DRIVER, active: true },
  { id: 'emp_F', name: 'Vũ Văn F', role: Role.ASSISTANT, active: true },
  { id: 'emp_inactive', name: 'Nguyễn Nghỉ Việc', role: Role.DRIVER, active: false },
];

// ============ VEHICLES ============

export const VEHICLES: Vehicle[] = [
  { id: 'v_53', code: '53', plateNumber: '53B-001.53', active: true },
  { id: 'v_80', code: '80', plateNumber: '80B-002.80', active: true },
  { id: 'v_85', code: '85', plateNumber: '85B-003.85', active: true },
  { id: 'v_90', code: '90', plateNumber: '90B-004.90', active: true },
];

// ============ HELPER FUNCTIONS ============

export function createRun(
  id: string,
  direction: Direction,
  shift: 1 | 2,
  vehiclePlate: string,
  driverId: string | null,
  assistantId: string | null,
  trips: number = 1
): Run {
  return {
    id,
    direction,
    shift,
    vehiclePlate,
    driverId,
    assistantId,
    trips,
  };
}

// ============ TC01: Basic Day - 1 vehicle, 2 shifts ============

/**
 * TC01: Ngày cơ bản: 1 xe, 2 ca đủ người
 * - xe 53 có 2 run (ca 1 + ca 2)
 * - driver A, assistant B
 * - trips = 1 mỗi ca
 * 
 * Expected:
 * - Total trips = 2 → tour = 1, lẻ = 0
 * - Driver A: trips = 2 → 1,000,000đ
 * - Assistant B: trips = 2 → 600,000đ
 */
export const TC01_RUNS: Run[] = [
  createRun('run_tc01_1', Direction.DL_SG, 1, '53B-001.53', 'emp_A', 'emp_B', 1),
  createRun('run_tc01_2', Direction.DL_SG, 2, '53B-001.53', 'emp_A', 'emp_B', 1),
];

export const TC01_EXPECTED = {
  totalTrips: 2,
  totalTours: 1,
  driverA: { trips: 2, amount: 1000000 },
  assistantB: { trips: 2, amount: 600000 },
};

// ============ TC02: Multiple Vehicles ============

/**
 * TC02: Ngày có nhiều xe 1 hướng
 * - DL_SG: xe 53 (2 run), xe 80 (1 run), xe 85 (2 run)
 * - SG_DL: xe 80 (1 run)
 * 
 * Expected:
 * - Total runs = 6
 * - DL_SG có 3 xe, SG_DL có 1 xe
 */
export const TC02_RUNS: Run[] = [
  // DL_SG: xe 53 - 2 runs
  createRun('run_tc02_1', Direction.DL_SG, 1, '53B-001.53', 'emp_A', 'emp_B', 1),
  createRun('run_tc02_2', Direction.DL_SG, 2, '53B-001.53', 'emp_A', 'emp_B', 1),
  // DL_SG: xe 80 - 1 run
  createRun('run_tc02_3', Direction.DL_SG, 1, '80B-002.80', 'emp_C', 'emp_D', 1),
  // DL_SG: xe 85 - 2 runs
  createRun('run_tc02_4', Direction.DL_SG, 1, '85B-003.85', 'emp_E', 'emp_F', 1),
  createRun('run_tc02_5', Direction.DL_SG, 2, '85B-003.85', 'emp_E', 'emp_F', 1),
  // SG_DL: xe 80 - 1 run (different direction, can reuse xe 80)
  createRun('run_tc02_6', Direction.SG_DL, 1, '90B-004.90', 'emp_A', 'emp_B', 1),
];

export const TC02_EXPECTED = {
  totalRuns: 6,
  totalTrips: 6,
  dlSgVehicles: 3,
  sgDlVehicles: 1,
};

// ============ TC03: Single Shift (Ca 2 empty) ============

/**
 * TC03: 1 xe chỉ chạy 1 ca (Ca1), Ca2 trống
 * - xe 80, hướng SG_DL, chỉ có ca 1
 */
export const TC03_RUNS: Run[] = [
  createRun('run_tc03_1', Direction.SG_DL, 1, '80B-002.80', 'emp_A', 'emp_B', 1),
];

export const TC03_EXPECTED = {
  totalRuns: 1,
  totalTrips: 1,
  hasShift2: false,
};

// ============ TC04: trips=2 in single shift ============

/**
 * TC04: trips=2 trong 1 ca
 * - 1 ca tính 2 chuyến
 */
export const TC04_RUNS: Run[] = [
  createRun('run_tc04_1', Direction.DL_SG, 1, '53B-001.53', 'emp_A', 'emp_B', 2),
];

export const TC04_EXPECTED = {
  totalTrips: 2,
  totalTours: 1,
  driverA: { trips: 2, amount: 1000000 },
  assistantB: { trips: 2, amount: 600000 },
};

// ============ TC05: CONFLICT - Same person on 2 vehicles same shift ============

/**
 * TC05: Xung đột - Cùng 1 người chạy 2 xe trong cùng 1 ca
 * - Driver A chạy xe 53 ca 1
 * - Driver A chạy xe 80 ca 1 (CONFLICT!)
 */
export const TC05_RUNS_CONFLICT: Run[] = [
  createRun('run_tc05_1', Direction.DL_SG, 1, '53B-001.53', 'emp_A', null, 1),
  createRun('run_tc05_2', Direction.DL_SG, 1, '80B-002.80', 'emp_A', null, 1), // CONFLICT!
];

export const TC05_EXPECTED = {
  hasConflict: true,
  conflictType: 'EMPLOYEE_SAME_SHIFT',
  conflictEmployee: 'emp_A',
};

// ============ TC06: CONFLICT - Exceeds max shifts per day ============

/**
 * TC06: Xung đột - Vượt quá 2 ca/ngày
 * - Driver A appears in 3 different shifts (simulated by different directions)
 * Note: Since shift is only 1 or 2, this test simulates A appearing in both shifts
 * of DL_SG AND a shift in SG_DL (which is actually OK as directions can overlap)
 * 
 * For this test, we need A to be on shift 1 and shift 2 AND another shift
 * But max shifts = 2, so we need to test if A appears more than 2 unique shifts
 * Since shift ∈ {1,2}, A cannot have more than 2 shifts.
 * 
 * This test validates the maxShiftsPerDay logic with a lower threshold.
 */
export const TC06_RUNS_MAX_SHIFTS: Run[] = [
  createRun('run_tc06_1', Direction.DL_SG, 1, '53B-001.53', 'emp_A', null, 1),
  createRun('run_tc06_2', Direction.DL_SG, 2, '53B-001.53', 'emp_A', null, 1),
];

// With maxShiftsPerDay = 1, this would be a violation
export const TC06_EXPECTED = {
  maxShiftsPerDay: 1, // Test with stricter limit
  hasConflict: true,
  conflictType: 'EMPLOYEE_MAX_SHIFTS',
};

// ============ TC07: CONFLICT - Duplicate slot ============

/**
 * TC07: Xung đột - Trùng slot (xe + hướng + ca)
 */
export const TC07_RUNS_DUPLICATE: Run[] = [
  createRun('run_tc07_1', Direction.DL_SG, 1, '53B-001.53', 'emp_A', 'emp_B', 1),
  createRun('run_tc07_2', Direction.DL_SG, 1, '53B-001.53', 'emp_C', 'emp_D', 1), // DUPLICATE!
];

export const TC07_EXPECTED = {
  hasConflict: true,
  conflictType: 'DUPLICATE_SLOT',
};

// ============ TC08: Assistant optional ============

/**
 * TC08: Phụ xe có thể trống
 */
export const TC08_RUNS: Run[] = [
  createRun('run_tc08_1', Direction.DL_SG, 1, '53B-001.53', 'emp_A', null, 1),
];

export const TC08_EXPECTED = {
  isValid: true, // No conflict - assistant is optional
  driverA: { trips: 1, amount: 500000 },
  assistantAmount: 0, // No assistant
};

// ============ TC09: Inactive employee historical data ============

/**
 * TC09: Nhân sự nghỉ việc - dữ liệu cũ vẫn tồn tại
 */
export const TC09_RUNS: Run[] = [
  createRun('run_tc09_1', Direction.DL_SG, 1, '53B-001.53', 'emp_inactive', 'emp_B', 1),
];

export const TC09_EXPECTED = {
  // Historical data should still calculate correctly
  trips: 1,
  driverAmount: 500000,
};

// ============ TC10: Advances deduction ============

/**
 * TC10: Ứng lương trừ đúng trên phiếu lương
 */
export const TC10_ADVANCES: Advance[] = [
  { id: 'adv_1', employeeId: 'emp_A', amount: 500000, date: '2026-02-10', note: 'Ứng lần 1' },
  { id: 'adv_2', employeeId: 'emp_A', amount: 300000, date: '2026-02-15', note: 'Ứng lần 2' },
];

export const TC10_EXPECTED = {
  totalAdvances: 800000,
  // If Driver A has 10 trips (5,000,000đ), net = 5,000,000 - 800,000 = 4,200,000đ
  exampleGrossSalary: 5000000,
  exampleNetSalary: 4200000,
};

// ============ FULL MONTH TEST DATA ============

/**
 * Complete test dataset for February 2026
 * 5 days with data, various scenarios
 */
export const FULL_MONTH_WORKLOGS = [
  // Day 1: TC01 - Basic
  {
    dateKey: '2026-02-06',
    status: WorklogStatus.FINAL,
    runs: TC01_RUNS,
  },
  // Day 2: TC02 - Multiple vehicles
  {
    dateKey: '2026-02-07',
    status: WorklogStatus.FINAL,
    runs: TC02_RUNS,
  },
  // Day 3: TC04 - trips=2
  {
    dateKey: '2026-02-08',
    status: WorklogStatus.FINAL,
    runs: TC04_RUNS,
  },
  // Day 4: TC05 - Conflict (for testing only, not saved in real DB)
  {
    dateKey: '2026-02-09',
    status: WorklogStatus.DRAFT, // Cannot lock due to conflict
    runs: TC05_RUNS_CONFLICT,
  },
  // Day 5: Normal with advances
  {
    dateKey: '2026-02-10',
    status: WorklogStatus.FINAL,
    runs: [
      createRun('run_day5_1', Direction.DL_SG, 1, '53B-001.53', 'emp_A', 'emp_B', 2),
      createRun('run_day5_2', Direction.DL_SG, 2, '53B-001.53', 'emp_A', 'emp_B', 2),
    ],
  },
];

// ============ SUMMARY CALCULATIONS ============

/**
 * Calculate expected totals for the full month
 */
export function calculateMonthTotals() {
  let totalTrips = 0;
  let totalRuns = 0;
  
  FULL_MONTH_WORKLOGS.forEach(day => {
    totalRuns += day.runs.length;
    totalTrips += day.runs.reduce((sum, r) => sum + r.trips, 0);
  });
  
  return {
    totalRuns,
    totalTrips,
    totalTours: Math.floor(totalTrips / DEFAULT_PAY_RATES.tourTrips),
    daysWithData: FULL_MONTH_WORKLOGS.length,
  };
}
