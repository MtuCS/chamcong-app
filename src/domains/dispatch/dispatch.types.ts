/**
 * Dispatch Types
 * 
 * Types specific to dispatch/worklog domain
 */

import { Direction, WorklogStatus, Run } from '../../types';

/**
 * Raw daily log data from database
 */
export interface DailyLogRaw {
  dateKey: string;
  date: string;
  status: WorklogStatus;
  runs: Run[];
}

/**
 * View model for DailyLogs screen - grouped by direction
 */
export interface DailyLogVM {
  dateKey: string;
  date: string;
  status: WorklogStatus;
  isLocked: boolean;
  outbound: DirectionGroupVM; // DL → SG
  inbound: DirectionGroupVM;  // SG → DL
  summary: DailyLogSummaryVM;
}

/**
 * Group of runs by direction
 */
export interface DirectionGroupVM {
  direction: Direction;
  directionLabel: string;
  runs: RunEditVM[];
  totalRuns: number;
  totalTrips: number;
}

/**
 * Run view model for editing
 */
export interface RunEditVM {
  id: string;
  direction: Direction;
  shift: 1 | 2;
  shiftLabel: string;
  vehiclePlate: string;
  vehicleCode?: string;
  driverId: string | null;
  driverName: string;
  assistantId: string | null;
  assistantName: string;
  trips: number;
  driverAmount: number;
  assistantAmount: number;
}

/**
 * Daily log summary
 */
export interface DailyLogSummaryVM {
  totalRuns: number;
  totalTrips: number;
  totalTours: number;
  totalDriverAmount: number;
  totalAssistantAmount: number;
  totalAmount: number;
}

/**
 * Simple run info for calendar display
 */
export interface CalendarRunVM {
  vehiclePlate: string;
  vehicleCode?: string;
  shift: 1 | 2;
  driverName: string;
  assistantName: string;
  tours: number; // 0.5, 1, 1.5, etc.
}

/**
 * Day summary for monthly calendar view
 */
export interface CalendarDayVM {
  day: number;
  dateKey: string;
  hasData: boolean;
  isLocked: boolean;
  outboundRuns: CalendarRunVM[];
  inboundRuns: CalendarRunVM[];
  totalRuns: number;
  totalTours: number;
  totalAmount: number;
}

// ============ VALIDATION TYPES ============

/**
 * Conflict type enum
 */
export enum ConflictType {
  DUPLICATE_SLOT = 'DUPLICATE_SLOT',           // Same vehicle + direction + shift
  EMPLOYEE_SAME_SHIFT = 'EMPLOYEE_SAME_SHIFT', // Same person on 2 vehicles same shift (TC05)
  EMPLOYEE_MAX_SHIFTS = 'EMPLOYEE_MAX_SHIFTS', // Person exceeds max shifts/day (TC06)
  MISSING_DRIVER = 'MISSING_DRIVER',           // Vehicle assigned but no driver
}

/**
 * Validation conflict result
 */
export interface ValidationConflict {
  type: ConflictType;
  runId: string;
  message: string;
  employeeId?: string;
  employeeName?: string;
  vehiclePlate?: string;
  shift?: 1 | 2;
}

/**
 * Overall validation result
 */
export interface ValidationResult {
  isValid: boolean;
  conflicts: ValidationConflict[];
  canSave: boolean;      // Can save as draft (warnings only)
  canLock: boolean;      // Can finalize (no blocking errors)
}

/**
 * Month calendar view model
 */
export interface MonthCalendarVM {
  month: string;
  year: number;
  monthNum: number;
  days: CalendarDayVM[];
  summary: {
    totalRuns: number;
    totalTours: number;
    totalAmount: number;
    daysWithData: number;
  };
}
