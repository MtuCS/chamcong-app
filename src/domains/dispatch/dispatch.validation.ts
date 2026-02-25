/**
 * Dispatch Validation
 * 
 * Pure validation functions for worklog/dispatch operations
 * These functions are easily testable and have no side effects
 * 
 * Test cases: TC05-TC08
 */

import { Direction } from '../../types';
import { 
  RunEditVM,
  ValidationResult,
  ValidationConflict,
  ConflictType,
} from './dispatch.types';
import { DIRECTION_LABELS } from './dispatch.mapper';

// ============ AVAILABILITY HELPERS ============

/**
 * Get vehicles already used in the opposite direction (cannot reuse)
 */
export function getUnavailableVehicles(
  currentDirection: Direction,
  allRuns: RunEditVM[]
): Set<string> {
  const oppositeDirection = currentDirection === Direction.DL_SG ? Direction.SG_DL : Direction.DL_SG;
  const usedPlates = allRuns
    .filter(r => r.direction === oppositeDirection && r.vehiclePlate)
    .map(r => r.vehiclePlate);
  return new Set(usedPlates);
}

/**
 * Get employees already used in the opposite direction (cannot reuse)
 */
export function getUnavailableEmployees(
  currentDirection: Direction,
  allRuns: RunEditVM[]
): Set<string> {
  const oppositeDirection = currentDirection === Direction.DL_SG ? Direction.SG_DL : Direction.DL_SG;
  const usedIds = new Set<string>();
  allRuns
    .filter(r => r.direction === oppositeDirection)
    .forEach(r => {
      if (r.driverId) usedIds.add(r.driverId);
      if (r.assistantId) usedIds.add(r.assistantId);
    });
  return usedIds;
}

/**
 * Get next available shift for a vehicle in a direction
 */
export function getNextShiftForVehicle(
  vehiclePlate: string,
  direction: Direction,
  allRuns: RunEditVM[]
): 1 | 2 {
  const existingShifts = allRuns
    .filter(r => r.direction === direction && r.vehiclePlate === vehiclePlate)
    .map(r => r.shift);
  
  if (!existingShifts.includes(1)) return 1;
  if (!existingShifts.includes(2)) return 2;
  return 2; // Default to 2 if both taken
}

// ============ CONFLICT DETECTION ============

/**
 * TC05: Check if employee is on multiple vehicles in the same shift
 * A person cannot drive 2 different vehicles at the same time (same shift)
 */
export function checkEmployeeSameShiftConflict(
  allRuns: RunEditVM[],
  maxShiftsPerDay: number = 2
): ValidationConflict[] {
  const conflicts: ValidationConflict[] = [];
  
  // Group runs by shift (across all directions)
  const shiftGroups = new Map<number, RunEditVM[]>();
  
  allRuns.forEach(run => {
    if (!shiftGroups.has(run.shift)) {
      shiftGroups.set(run.shift, []);
    }
    shiftGroups.get(run.shift)!.push(run);
  });
  
  // For each shift, check if any employee appears on multiple vehicles
  shiftGroups.forEach((runs, shift) => {
    // Track employee -> vehicles mapping
    const employeeVehicles = new Map<string, { runIds: string[], vehicles: string[], name: string }>();
    
    runs.forEach(run => {
      // Check driver
      if (run.driverId && run.vehiclePlate) {
        const key = run.driverId;
        if (!employeeVehicles.has(key)) {
          employeeVehicles.set(key, { runIds: [], vehicles: [], name: run.driverName });
        }
        const entry = employeeVehicles.get(key)!;
        if (!entry.vehicles.includes(run.vehiclePlate)) {
          entry.runIds.push(run.id);
          entry.vehicles.push(run.vehiclePlate);
        }
      }
      
      // Check assistant
      if (run.assistantId && run.vehiclePlate) {
        const key = run.assistantId;
        if (!employeeVehicles.has(key)) {
          employeeVehicles.set(key, { runIds: [], vehicles: [], name: run.assistantName });
        }
        const entry = employeeVehicles.get(key)!;
        if (!entry.vehicles.includes(run.vehiclePlate)) {
          entry.runIds.push(run.id);
          entry.vehicles.push(run.vehiclePlate);
        }
      }
    });
    
    // Create conflict for employees on multiple vehicles
    employeeVehicles.forEach((data, employeeId) => {
      if (data.vehicles.length > 1) {
        conflicts.push({
          type: ConflictType.EMPLOYEE_SAME_SHIFT,
          runId: data.runIds[data.runIds.length - 1], // Latest run
          message: `${data.name} đang chạy ${data.vehicles.length} xe trong Ca ${shift}: ${data.vehicles.join(', ')}`,
          employeeId,
          employeeName: data.name,
          shift: shift as 1 | 2,
        });
      }
    });
  });
  
  return conflicts;
}

/**
 * TC06: Check if employee exceeds max shifts per day
 * Default: max 2 shifts per day
 */
export function checkEmployeeMaxShiftsConflict(
  allRuns: RunEditVM[],
  maxShiftsPerDay: number = 2
): ValidationConflict[] {
  const conflicts: ValidationConflict[] = [];
  
  // Track employee -> unique shifts
  const employeeShifts = new Map<string, { shifts: Set<number>, name: string, runIds: string[] }>();
  
  allRuns.forEach(run => {
    // Check driver
    if (run.driverId && run.vehiclePlate) {
      if (!employeeShifts.has(run.driverId)) {
        employeeShifts.set(run.driverId, { shifts: new Set(), name: run.driverName, runIds: [] });
      }
      const entry = employeeShifts.get(run.driverId)!;
      entry.shifts.add(run.shift);
      entry.runIds.push(run.id);
    }
    
    // Check assistant
    if (run.assistantId && run.vehiclePlate) {
      if (!employeeShifts.has(run.assistantId)) {
        employeeShifts.set(run.assistantId, { shifts: new Set(), name: run.assistantName, runIds: [] });
      }
      const entry = employeeShifts.get(run.assistantId)!;
      entry.shifts.add(run.shift);
      entry.runIds.push(run.id);
    }
  });
  
  // Check for exceeding max shifts
  employeeShifts.forEach((data, employeeId) => {
    if (data.shifts.size > maxShiftsPerDay) {
      conflicts.push({
        type: ConflictType.EMPLOYEE_MAX_SHIFTS,
        runId: data.runIds[data.runIds.length - 1],
        message: `${data.name} vượt quá ${maxShiftsPerDay} ca/ngày (đang có ${data.shifts.size} ca)`,
        employeeId,
        employeeName: data.name,
      });
    }
  });
  
  return conflicts;
}

/**
 * TC07: Check for duplicate slot (same vehicle + direction + shift)
 */
export function checkDuplicateSlotConflict(
  allRuns: RunEditVM[]
): ValidationConflict[] {
  const conflicts: ValidationConflict[] = [];
  const seen = new Map<string, RunEditVM>();
  
  allRuns.forEach(run => {
    if (!run.vehiclePlate) return;
    
    const key = `${run.direction}_${run.vehiclePlate}_${run.shift}`;
    
    if (seen.has(key)) {
      conflicts.push({
        type: ConflictType.DUPLICATE_SLOT,
        runId: run.id,
        message: `Xe ${run.vehiclePlate} đã có Ca ${run.shift} hướng ${DIRECTION_LABELS[run.direction]}`,
        vehiclePlate: run.vehiclePlate,
        shift: run.shift,
      });
    } else {
      seen.set(key, run);
    }
  });
  
  return conflicts;
}

/**
 * Check for missing driver when vehicle is assigned
 */
export function checkMissingDriverConflict(
  allRuns: RunEditVM[]
): ValidationConflict[] {
  const conflicts: ValidationConflict[] = [];
  
  allRuns.forEach(run => {
    if (run.vehiclePlate && !run.driverId) {
      conflicts.push({
        type: ConflictType.MISSING_DRIVER,
        runId: run.id,
        message: `Xe ${run.vehiclePlate} Ca ${run.shift} chưa có tài xế`,
        vehiclePlate: run.vehiclePlate,
        shift: run.shift,
      });
    }
  });
  
  return conflicts;
}

// ============ AGGREGATE VALIDATION ============

/**
 * Validate all runs for a day
 * Returns comprehensive validation result
 */
export function validateDailyRuns(
  allRuns: RunEditVM[],
  maxShiftsPerDay: number = 2
): ValidationResult {
  const conflicts: ValidationConflict[] = [];
  
  // Run all validations
  conflicts.push(...checkDuplicateSlotConflict(allRuns));
  conflicts.push(...checkEmployeeSameShiftConflict(allRuns, maxShiftsPerDay));
  conflicts.push(...checkEmployeeMaxShiftsConflict(allRuns, maxShiftsPerDay));
  conflicts.push(...checkMissingDriverConflict(allRuns));
  
  // Blocking errors = duplicate slot, same shift conflict, max shifts
  const blockingTypes = [
    ConflictType.DUPLICATE_SLOT,
    ConflictType.EMPLOYEE_SAME_SHIFT,
    ConflictType.EMPLOYEE_MAX_SHIFTS,
  ];
  
  const hasBlockingError = conflicts.some(c => blockingTypes.includes(c.type));
  const hasMissingDriver = conflicts.some(c => c.type === ConflictType.MISSING_DRIVER);
  
  return {
    isValid: conflicts.length === 0,
    conflicts,
    canSave: true, // Always allow saving draft
    canLock: !hasBlockingError && !hasMissingDriver, // Block lock if any error
  };
}
