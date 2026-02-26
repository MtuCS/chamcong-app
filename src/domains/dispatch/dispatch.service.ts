/**
 * Dispatch Service
 * 
 * Business logic for worklog/dispatch operations
 * UI components should ONLY call these methods
 */

import * as firestore from '../../services/firestore';
import * as cache from '../../services/cache';
import { perfMeasure, perfStart } from '../../utils/perf';
import { 
  Direction, 
  Run, 
  WorklogStatus,
  DashboardSummaryVM,
  DaySummaryVM,
  RunVM,
} from '../../types';
import { 
  DailyLogVM,
  MonthCalendarVM,
  CalendarDayVM,
  RunEditVM,
} from './dispatch.types';
import { 
  toDailyLogVM, 
  mapDailyLogToDashboardRows,
  mapToCalendarDay,
  DIRECTION_LABELS,
  buildEmployeeMap,
  buildVehicleMap,
  getEmployeeName,
  mapRunToEditVM,
} from './dispatch.mapper';
import { validateDailyRuns } from './dispatch.validation';
import { calcTours, calcRunAmount, formatVND } from '../payroll/payroll.utils';

// ============ DASHBOARD ============

/**
 * Get dashboard summary for a specific date
 */
export async function getDashboardSummary(selectedDate: string): Promise<DashboardSummaryVM> {
  const currentMonth = selectedDate.slice(0, 7);
  
  const [employees, worklogs, advances, rates, todayWorklog] = await Promise.all([
    firestore.getActiveEmployees(),
    firestore.getWorklogsByMonth(currentMonth),
    firestore.getAdvancesByMonth(currentMonth),
    firestore.getPayRates(),
    firestore.getWorklogByDate(selectedDate),
  ]);

  // Calculate monthly stats
  const totalTripsMonth = worklogs.reduce((total, w) => {
    return total + (w.runs?.reduce((sum, r) => sum + r.trips, 0) || 0);
  }, 0);

  const totalAdvancesMonth = advances.reduce((sum, a) => sum + a.amount, 0);
  const todayAssignedCount = todayWorklog?.runs?.length || 0;

  // Map dashboard rows
  const rows = mapDailyLogToDashboardRows(todayWorklog, employees);

  return {
    todayAssignedCount,
    totalTripsMonth,
    totalToursMonth: calcTours(totalTripsMonth, rates.tourTrips),
    totalAdvancesMonth,
    rows,
  };
}

// ============ DAILY LOGS ============

/**
 * Load daily log for editing
 */
export async function loadDailyLog(dateKey: string): Promise<{
  dailyLog: DailyLogVM;
  vehicles: Awaited<ReturnType<typeof firestore.getAllVehicles>>;
  payRates: Awaited<ReturnType<typeof firestore.getPayRates>>;
}> {
  const stop = perfStart(`loadDailyLog(${dateKey})`);
  
  // Use cache for employees, vehicles, rates
  const [employees, vehicles, rates, worklog] = await Promise.all([
    cache.getEmployees(),
    cache.getVehicles(),
    cache.getPayRates(),
    perfMeasure('firestore.getWorklogByDate', () => firestore.getWorklogByDate(dateKey)),
  ]);

  const result = {
    dailyLog: toDailyLogVM(worklog, dateKey, employees, vehicles, rates),
    vehicles,
    payRates: rates,
  };
  
  stop();
  return result;
}

/**
 * Add a new run
 */
export async function addNewRun(
  dateKey: string,
  direction: Direction
): Promise<Run> {
  const newRun: Omit<Run, 'id'> = {
    direction,
    shift: 1,
    vehiclePlate: '',
    driverId: null,
    assistantId: null,
    trips: 1,
  };
  
  return firestore.createRun(dateKey, newRun);
}

/**
 * Update an existing run
 */
export async function updateRunData(
  dateKey: string,
  runId: string,
  updates: Partial<Run>
): Promise<void> {
  return firestore.updateRun(dateKey, runId, updates);
}

/**
 * Delete a run
 */
export async function removeRun(dateKey: string, runId: string): Promise<void> {
  return firestore.deleteRun(dateKey, runId);
}

/**
 * Lock/Finalize a worklog
 */
export async function lockDailyLog(dateKey: string): Promise<void> {
  const [worklog, employees, vehicles, rates] = await Promise.all([
    firestore.getWorklogByDate(dateKey),
    firestore.getActiveEmployees(),
    firestore.getAllVehicles(),
    firestore.getPayRates(),
  ]);

  if (!worklog) {
    const error = new Error('Cannot lock daily log: worklog not found');
    (error as { code?: string }).code = 'DISPATCH_WORKLOG_MISSING';
    throw error;
  }

  const runs = worklog.runs || [];
  const employeeMap = buildEmployeeMap(employees);
  const vehicleMap = buildVehicleMap(vehicles);
  const runVMs = runs.map(run => mapRunToEditVM(run, employeeMap, vehicleMap, rates));
  const maxShifts = rates.maxShiftsPerDay ?? 2;
  const validation = validateDailyRuns(runVMs, maxShifts);

  if (!validation.canLock) {
    const reason = validation.conflicts[0]?.message || 'run data invalid';
    const error = new Error(`Cannot lock daily log: ${reason}`);
    (error as { code?: string }).code = 'DISPATCH_VALIDATION_ERROR';
    throw error;
  }

  const inactiveAssignments = new Map<string, string>();
  runVMs.forEach(vm => {
    if (vm.driverId && !employeeMap.has(vm.driverId)) {
      inactiveAssignments.set(vm.driverId, vm.driverName || vm.driverId);
    }
    if (vm.assistantId && !employeeMap.has(vm.assistantId)) {
      inactiveAssignments.set(vm.assistantId, vm.assistantName || vm.assistantId);
    }
  });

  if (inactiveAssignments.size > 0) {
    const list = Array.from(inactiveAssignments.values()).join(', ');
    const error = new Error(`Cannot lock daily log: inactive employees detected (${list})`);
    (error as { code?: string }).code = 'DISPATCH_INACTIVE_EMPLOYEE';
    throw error;
  }

  await firestore.updateWorklogStatus(dateKey, WorklogStatus.FINAL);
}

/**
 * Unlock a worklog (if allowed)
 */
export async function unlockDailyLog(dateKey: string): Promise<void> {
  return firestore.updateWorklogStatus(dateKey, WorklogStatus.DRAFT);
}

// ============ REPORTS - CALENDAR VIEW ============

/**
 * Get monthly calendar with daily summaries
 */
export async function getMonthlyCalendar(month: string): Promise<MonthCalendarVM> {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  
  const [worklogs, rates, employees, vehicles] = await Promise.all([
    firestore.getWorklogsByMonth(month),
    firestore.getPayRates(),
    firestore.getActiveEmployees(),
    firestore.getAllVehicles(),
  ]);

  // Build worklog map by dateKey
  const worklogMap = new Map(worklogs.map(w => [w.dateKey, w]));

  // Generate calendar days
  const days: CalendarDayVM[] = [];
  let totalRuns = 0;
  let totalTours = 0;
  let totalAmount = 0;
  let daysWithData = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${month}-${day.toString().padStart(2, '0')}`;
    const worklog = worklogMap.get(dateKey) || null;
    
    const calendarDay = mapToCalendarDay(day, dateKey, worklog, rates, employees, vehicles);
    days.push(calendarDay);

    if (calendarDay.hasData) {
      totalRuns += calendarDay.totalRuns;
      totalTours += calendarDay.totalTours;
      totalAmount += calendarDay.totalAmount;
      daysWithData++;
    }
  }

  return {
    month,
    year,
    monthNum,
    days,
    summary: {
      totalRuns,
      totalTours,
      totalAmount,
      daysWithData,
    },
  };
}

/**
 * Get day summary with detailed runs for report view
 */
export async function getDaySummary(dateKey: string): Promise<DaySummaryVM> {
  const [employees, vehicles, rates, worklog] = await Promise.all([
    firestore.getActiveEmployees(),
    firestore.getAllVehicles(),
    firestore.getPayRates(),
    firestore.getWorklogByDate(dateKey),
  ]);

  const employeeMap = buildEmployeeMap(employees);
  const vehicleMap = buildVehicleMap(vehicles);
  const runs = worklog?.runs || [];
  const day = parseInt(dateKey.split('-')[2], 10);

  // Map runs to RunVM
  const mapRun = (run: Run): RunVM => {
    const amounts = calcRunAmount(run.trips, rates);
    return {
      id: run.id,
      direction: run.direction,
      directionLabel: DIRECTION_LABELS[run.direction],
      shift: run.shift,
      shiftLabel: `Ca ${run.shift}`,
      vehiclePlate: run.vehiclePlate,
      vehicleCode: vehicleMap.get(run.vehiclePlate)?.code,
      driverId: run.driverId,
      driverName: getEmployeeName(run.driverId, employeeMap),
      assistantId: run.assistantId,
      assistantName: getEmployeeName(run.assistantId, employeeMap),
      trips: run.trips,
      tripAmount: amounts.totalAmount,
    };
  };

  const outboundRuns = runs
    .filter(r => r.direction === Direction.DL_SG)
    .map(mapRun);
  const inboundRuns = runs
    .filter(r => r.direction === Direction.SG_DL)
    .map(mapRun);

  const totalTrips = runs.reduce((sum, r) => sum + r.trips, 0);
  const totalAmount = runs.reduce((sum, r) => {
    return sum + calcRunAmount(r.trips, rates).totalAmount;
  }, 0);

  return {
    date: dateKey,
    day,
    hasData: runs.length > 0,
    totalRuns: runs.length,
    totalTrips,
    totalTours: calcTours(totalTrips, rates.tourTrips),
    totalAmount,
    isLocked: worklog?.status === WorklogStatus.FINAL,
    outboundRuns,
    inboundRuns,
  };
}

// ============ RE-EXPORT VALIDATION FUNCTIONS ============
// Validation logic is in dispatch.validation.ts for better testability

export {
  getUnavailableVehicles,
  getUnavailableEmployees,
  getNextShiftForVehicle,
  checkEmployeeSameShiftConflict,
  checkEmployeeMaxShiftsConflict,
  checkDuplicateSlotConflict,
  checkMissingDriverConflict,
  validateDailyRuns,
} from './dispatch.validation';
