/**
 * Dispatch Service Tests
 * 
 * Tests for validation logic (TC05-TC08)
 */

import { describe, it, expect } from 'vitest';
import {
  checkEmployeeSameShiftConflict,
  checkEmployeeMaxShiftsConflict,
  checkDuplicateSlotConflict,
  checkMissingDriverConflict,
  validateDailyRuns,
  getUnavailableVehicles,
  getUnavailableEmployees,
  getNextShiftForVehicle,
} from '../domains/dispatch/dispatch.service';
import { sortRunsByVehicleThenShift } from '../domains/dispatch/dispatch.mapper';
import { ConflictType, RunEditVM } from '../domains/dispatch/dispatch.types';
import { Direction } from '../types';
import {
  TC05_RUNS_CONFLICT,
  TC06_RUNS_MAX_SHIFTS,
  TC07_RUNS_DUPLICATE,
  TC08_RUNS,
  EMPLOYEES,
  DEFAULT_PAY_RATES,
} from './seed-data';

// ============ HELPER ============

function toRunEditVM(runs: typeof TC05_RUNS_CONFLICT): RunEditVM[] {
  const empMap = new Map(EMPLOYEES.map(e => [e.id, e.name]));
  
  return runs.map(run => ({
    id: run.id,
    direction: run.direction,
    shift: run.shift,
    shiftLabel: `Ca ${run.shift}`,
    vehiclePlate: run.vehiclePlate,
    driverId: run.driverId,
    driverName: run.driverId ? empMap.get(run.driverId) || 'Unknown' : '',
    assistantId: run.assistantId,
    assistantName: run.assistantId ? empMap.get(run.assistantId) || 'Unknown' : '',
    trips: run.trips,
    driverAmount: run.trips * DEFAULT_PAY_RATES.driverTrip,
    assistantAmount: run.trips * DEFAULT_PAY_RATES.assistantTrip,
  }));
}

// ============ TC05: Same Employee on 2 Vehicles Same Shift ============

describe('TC05: Employee Same Shift Conflict', () => {
  it('should detect when same driver is on 2 vehicles in same shift', () => {
    const runs = toRunEditVM(TC05_RUNS_CONFLICT);
    const conflicts = checkEmployeeSameShiftConflict(runs);
    
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe(ConflictType.EMPLOYEE_SAME_SHIFT);
    expect(conflicts[0].employeeId).toBe('emp_A');
    expect(conflicts[0].message).toContain('Nguyễn Văn A');
    expect(conflicts[0].message).toContain('2 xe');
  });

  it('should NOT flag employees on same vehicle different shifts', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
      { id: 'r2', direction: Direction.DL_SG, shift: 2, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
    ]);
    const conflicts = checkEmployeeSameShiftConflict(runs);
    
    expect(conflicts.length).toBe(0);
  });

  it('should detect conflict for assistant too', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_C', assistantId: 'emp_B', trips: 1 },
      { id: 'r2', direction: Direction.DL_SG, shift: 1, vehiclePlate: '80B-002.80', driverId: 'emp_E', assistantId: 'emp_B', trips: 1 },
    ]);
    const conflicts = checkEmployeeSameShiftConflict(runs);
    
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].employeeId).toBe('emp_B');
  });

  it('should detect conflict across different directions same shift', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
      { id: 'r2', direction: Direction.SG_DL, shift: 1, vehiclePlate: '80B-002.80', driverId: 'emp_A', assistantId: null, trips: 1 },
    ]);
    const conflicts = checkEmployeeSameShiftConflict(runs);
    
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe(ConflictType.EMPLOYEE_SAME_SHIFT);
  });
});

// ============ TC06: Max Shifts Per Day ============

describe('TC06: Employee Max Shifts Per Day', () => {
  it('should NOT flag when employee has 2 shifts (default max)', () => {
    const runs = toRunEditVM(TC06_RUNS_MAX_SHIFTS);
    const conflicts = checkEmployeeMaxShiftsConflict(runs, 2);
    
    expect(conflicts.length).toBe(0);
  });

  it('should flag when employee exceeds custom max (1 shift/day)', () => {
    const runs = toRunEditVM(TC06_RUNS_MAX_SHIFTS);
    const conflicts = checkEmployeeMaxShiftsConflict(runs, 1); // stricter limit
    
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe(ConflictType.EMPLOYEE_MAX_SHIFTS);
    expect(conflicts[0].employeeId).toBe('emp_A');
    expect(conflicts[0].message).toContain('vượt quá 1 ca/ngày');
  });

  it('should count unique shifts only (same shift on multiple vehicles counts once)', () => {
    // A on shift 1 with 2 vehicles = still only 1 unique shift
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
      { id: 'r2', direction: Direction.SG_DL, shift: 1, vehiclePlate: '80B-002.80', driverId: 'emp_A', assistantId: null, trips: 1 },
    ]);
    const conflicts = checkEmployeeMaxShiftsConflict(runs, 1);
    
    // Should have 1 unique shift, so with max=1, no conflict
    expect(conflicts.length).toBe(0);
  });
});

// ============ TC07: Duplicate Slot ============

describe('TC07: Duplicate Slot Conflict', () => {
  it('should detect duplicate slot (same vehicle + direction + shift)', () => {
    const runs = toRunEditVM(TC07_RUNS_DUPLICATE);
    const conflicts = checkDuplicateSlotConflict(runs);
    
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe(ConflictType.DUPLICATE_SLOT);
    expect(conflicts[0].vehiclePlate).toBe('53B-001.53');
    expect(conflicts[0].shift).toBe(1);
  });

  it('should NOT flag same vehicle different shifts', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
      { id: 'r2', direction: Direction.DL_SG, shift: 2, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
    ]);
    const conflicts = checkDuplicateSlotConflict(runs);
    
    expect(conflicts.length).toBe(0);
  });

  it('should NOT flag same vehicle different directions', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
      { id: 'r2', direction: Direction.SG_DL, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
    ]);
    const conflicts = checkDuplicateSlotConflict(runs);
    
    expect(conflicts.length).toBe(0);
  });
});

// ============ TC08: Missing Driver ============

describe('TC08: Missing Driver Warning', () => {
  it('should NOT flag when assistant is missing (optional)', () => {
    const runs = toRunEditVM(TC08_RUNS);
    const conflicts = checkMissingDriverConflict(runs);
    
    expect(conflicts.length).toBe(0);
  });

  it('should flag when vehicle assigned but no driver', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: null, assistantId: 'emp_B', trips: 1 },
    ]);
    const conflicts = checkMissingDriverConflict(runs);
    
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe(ConflictType.MISSING_DRIVER);
    expect(conflicts[0].message).toContain('chưa có tài xế');
  });

  it('should NOT flag runs without vehicle (empty slot)', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '', driverId: null, assistantId: null, trips: 1 },
    ]);
    const conflicts = checkMissingDriverConflict(runs);
    
    expect(conflicts.length).toBe(0);
  });
});

// ============ COMPREHENSIVE VALIDATION ============

describe('validateDailyRuns - Comprehensive', () => {
  it('should pass validation for valid runs', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: 'emp_B', trips: 1 },
      { id: 'r2', direction: Direction.DL_SG, shift: 2, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: 'emp_B', trips: 1 },
    ]);
    const result = validateDailyRuns(runs);
    
    expect(result.isValid).toBe(true);
    expect(result.canSave).toBe(true);
    expect(result.canLock).toBe(true);
    expect(result.conflicts.length).toBe(0);
  });

  it('should block lock for duplicate slot', () => {
    const runs = toRunEditVM(TC07_RUNS_DUPLICATE);
    const result = validateDailyRuns(runs);
    
    expect(result.isValid).toBe(false);
    expect(result.canSave).toBe(true); // Can save draft
    expect(result.canLock).toBe(false); // Cannot lock
  });

  it('should block lock for same shift conflict', () => {
    const runs = toRunEditVM(TC05_RUNS_CONFLICT);
    const result = validateDailyRuns(runs);
    
    expect(result.canLock).toBe(false);
    expect(result.conflicts.some(c => c.type === ConflictType.EMPLOYEE_SAME_SHIFT)).toBe(true);
  });

  it('should block lock for missing driver', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: null, assistantId: null, trips: 1 },
    ]);
    const result = validateDailyRuns(runs);
    
    expect(result.canLock).toBe(false);
    expect(result.conflicts.some(c => c.type === ConflictType.MISSING_DRIVER)).toBe(true);
  });

  it('should block lock for dangerous characters (OWASP A03)', () => {
    const runs = toRunEditVM([
      { id: 'r_attack', direction: Direction.DL_SG, shift: 1, vehiclePlate: '<script>alert(1)</script>', driverId: 'emp_A', assistantId: 'emp_B', trips: 1 },
    ]);
    const result = validateDailyRuns(runs);

    expect(result.canLock).toBe(false);
    expect(result.conflicts.some(c => c.type === ConflictType.INVALID_INPUT)).toBe(true);
  });
});

// ============ HELPER FUNCTIONS ============

describe('getUnavailableVehicles', () => {
  it('should return vehicles used in opposite direction', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
      { id: 'r2', direction: Direction.SG_DL, shift: 1, vehiclePlate: '80B-002.80', driverId: 'emp_C', assistantId: null, trips: 1 },
    ]);
    
    const unavailableForDLSG = getUnavailableVehicles(Direction.DL_SG, runs);
    const unavailableForSGDL = getUnavailableVehicles(Direction.SG_DL, runs);
    
    expect(unavailableForDLSG.has('80B-002.80')).toBe(true);
    expect(unavailableForDLSG.has('53B-001.53')).toBe(false);
    expect(unavailableForSGDL.has('53B-001.53')).toBe(true);
  });
});

describe('getUnavailableEmployees', () => {
  it('should return employees used in opposite direction', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: 'emp_B', trips: 1 },
      { id: 'r2', direction: Direction.SG_DL, shift: 1, vehiclePlate: '80B-002.80', driverId: 'emp_C', assistantId: 'emp_D', trips: 1 },
    ]);
    
    const unavailableForDLSG = getUnavailableEmployees(Direction.DL_SG, runs);
    
    expect(unavailableForDLSG.has('emp_C')).toBe(true);
    expect(unavailableForDLSG.has('emp_D')).toBe(true);
    expect(unavailableForDLSG.has('emp_A')).toBe(false);
    expect(unavailableForDLSG.has('emp_B')).toBe(false);
  });
});

describe('getNextShiftForVehicle', () => {
  it('should return shift 1 if no runs exist', () => {
    const runs: RunEditVM[] = [];
    const nextShift = getNextShiftForVehicle('53B-001.53', Direction.DL_SG, runs);
    
    expect(nextShift).toBe(1);
  });

  it('should return shift 2 if shift 1 is taken', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 1, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
    ]);
    const nextShift = getNextShiftForVehicle('53B-001.53', Direction.DL_SG, runs);
    
    expect(nextShift).toBe(2);
  });

  it('should return shift 1 if only shift 2 is taken', () => {
    const runs = toRunEditVM([
      { id: 'r1', direction: Direction.DL_SG, shift: 2, vehiclePlate: '53B-001.53', driverId: 'emp_A', assistantId: null, trips: 1 },
    ]);
    const nextShift = getNextShiftForVehicle('53B-001.53', Direction.DL_SG, runs);
    
    expect(nextShift).toBe(1);
  });
});

// ============ SORTING ============

describe('sortRunsByVehicleThenShift', () => {
  it('should sort runs by vehicle plate then shift', () => {
    const unsorted = [
      { vehiclePlate: '50H-687.80', shift: 2 },
      { vehiclePlate: '50F-055.85', shift: 1 },
      { vehiclePlate: '50H-687.80', shift: 1 },
      { vehiclePlate: '50H-264.54', shift: 2 },
      { vehiclePlate: '50F-055.85', shift: 2 },
      { vehiclePlate: '50H-264.54', shift: 1 },
    ];

    const sorted = sortRunsByVehicleThenShift(unsorted);

    // Expected order: 50F-055.85 (Ca1, Ca2), 50H-264.54 (Ca1, Ca2), 50H-687.80 (Ca1, Ca2)
    expect(sorted.map(r => `${r.vehiclePlate}-Ca${r.shift}`)).toEqual([
      '50F-055.85-Ca1',
      '50F-055.85-Ca2',
      '50H-264.54-Ca1',
      '50H-264.54-Ca2',
      '50H-687.80-Ca1',
      '50H-687.80-Ca2',
    ]);
  });

  it('should not mutate input array', () => {
    const original = [
      { vehiclePlate: '50H-687.80', shift: 2 },
      { vehiclePlate: '50F-055.85', shift: 1 },
    ];
    const originalCopy = [...original];

    sortRunsByVehicleThenShift(original);

    expect(original).toEqual(originalCopy);
  });

  it('should handle empty array', () => {
    const result = sortRunsByVehicleThenShift([]);
    expect(result).toEqual([]);
  });

  it('should handle single item', () => {
    const runs = [{ vehiclePlate: '50H-687.80', shift: 1 }];
    const result = sortRunsByVehicleThenShift(runs);
    expect(result).toEqual(runs);
  });
});
