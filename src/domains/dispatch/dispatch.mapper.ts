/**
 * Dispatch Mapper
 * 
 * Pure functions to transform raw data → view models
 * These are easily testable
 */

import { 
  Direction, 
  WorklogStatus, 
  Run, 
  Worklog, 
  Employee, 
  Vehicle, 
  PayRates,
  DashboardRowVM,
} from '../../types';
import { 
  DailyLogVM, 
  DailyLogRaw, 
  DirectionGroupVM, 
  RunEditVM,
  DailyLogSummaryVM,
  CalendarDayVM,
  CalendarRunVM,
} from './dispatch.types';
import { calcRunAmount, calcTours, formatVND } from '../payroll/payroll.utils';

// Direction labels
export const DIRECTION_LABELS: Record<Direction, string> = {
  [Direction.DL_SG]: 'Đắk Lắk → Sài Gòn',
  [Direction.SG_DL]: 'Sài Gòn → Đắk Lắk',
};

/**
 * Build employee lookup map
 */
export function buildEmployeeMap(employees: Employee[]): Map<string, Employee> {
  return new Map(employees.map(e => [e.id, e]));
}

/**
 * Build vehicle lookup map
 */
export function buildVehicleMap(vehicles: Vehicle[]): Map<string, Vehicle> {
  return new Map(vehicles.map(v => [v.plateNumber, v]));
}

/**
 * Get employee name by ID
 */
export function getEmployeeName(
  id: string | null, 
  employeeMap: Map<string, Employee>
): string {
  if (!id) return '---';
  return employeeMap.get(id)?.name || id;
}

/**
 * Get vehicle code by plate
 */
export function getVehicleCode(
  plate: string, 
  vehicleMap: Map<string, Vehicle>
): string | undefined {
  return vehicleMap.get(plate)?.code;
}

/**
 * Sort runs by vehicle plate (A-Z), then by shift (1 before 2)
 * This ensures consistent ordering: same vehicle's shifts are grouped together
 */
export function sortRunsByVehicleThenShift<T extends { vehiclePlate: string; shift: number }>(
  runs: T[]
): T[] {
  return [...runs].sort((a, b) => {
    // Primary: vehicle plate (Vietnamese locale for proper sorting)
    const plateCompare = a.vehiclePlate.localeCompare(b.vehiclePlate, 'vi');
    if (plateCompare !== 0) return plateCompare;
    // Secondary: shift (1 before 2)
    return a.shift - b.shift;
  });
}

/**
 * Sort runs by direction, then vehicle plate, then shift
 * For Dashboard view where all runs are displayed in one table
 */
export function sortRunsByDirectionVehicleShift<T extends { direction: string; vehiclePlate: string; shift: number }>(
  runs: T[]
): T[] {
  return [...runs].sort((a, b) => {
    // Primary: direction (DL_SG before SG_DL for Đắk Lắk → Sài Gòn first)
    const dirCompare = a.direction.localeCompare(b.direction);
    if (dirCompare !== 0) return dirCompare;
    // Secondary: vehicle plate
    const plateCompare = a.vehiclePlate.localeCompare(b.vehiclePlate, 'vi');
    if (plateCompare !== 0) return plateCompare;
    // Tertiary: shift (1 before 2)
    return a.shift - b.shift;
  });
}

/**
 * Map a single Run to RunEditVM
 */
export function mapRunToEditVM(
  run: Run,
  employeeMap: Map<string, Employee>,
  vehicleMap: Map<string, Vehicle>,
  rates: PayRates
): RunEditVM {
  const amounts = calcRunAmount(run.trips, rates);
  
  return {
    id: run.id,
    direction: run.direction,
    shift: run.shift,
    shiftLabel: `Ca ${run.shift}`,
    vehiclePlate: run.vehiclePlate,
    vehicleCode: getVehicleCode(run.vehiclePlate, vehicleMap),
    driverId: run.driverId,
    driverName: getEmployeeName(run.driverId, employeeMap),
    assistantId: run.assistantId,
    assistantName: getEmployeeName(run.assistantId, employeeMap),
    trips: run.trips,
    driverAmount: amounts.driverAmount,
    assistantAmount: amounts.assistantAmount,
  };
}

/**
 * Group runs by direction
 */
export function groupRunsByDirection(
  runs: Run[],
  direction: Direction,
  employeeMap: Map<string, Employee>,
  vehicleMap: Map<string, Vehicle>,
  rates: PayRates
): DirectionGroupVM {
  const filteredRuns = runs.filter(r => r.direction === direction);
  // Sort by vehicle plate → shift for better UX
  const sortedRuns = sortRunsByVehicleThenShift(filteredRuns);
  const runVMs = sortedRuns.map(r => mapRunToEditVM(r, employeeMap, vehicleMap, rates));
  const totalTrips = filteredRuns.reduce((sum, r) => sum + r.trips, 0);

  return {
    direction,
    directionLabel: DIRECTION_LABELS[direction],
    runs: runVMs,
    totalRuns: filteredRuns.length,
    totalTrips,
  };
}

/**
 * Calculate daily log summary
 */
export function calcDailyLogSummary(
  runs: Run[],
  rates: PayRates
): DailyLogSummaryVM {
  let totalDriverAmount = 0;
  let totalAssistantAmount = 0;
  let totalTrips = 0;

  runs.forEach(run => {
    const amounts = calcRunAmount(run.trips, rates);
    totalDriverAmount += amounts.driverAmount;
    totalAssistantAmount += amounts.assistantAmount;
    totalTrips += run.trips;
  });

  return {
    totalRuns: runs.length,
    totalTrips,
    totalTours: calcTours(totalTrips, rates.tourTrips),
    totalDriverAmount,
    totalAssistantAmount,
    totalAmount: totalDriverAmount + totalAssistantAmount,
  };
}

/**
 * Transform Worklog to DailyLogVM
 * Main mapper function for DailyLogs screen
 */
export function toDailyLogVM(
  worklog: Worklog | null,
  dateKey: string,
  employees: Employee[],
  vehicles: Vehicle[],
  rates: PayRates
): DailyLogVM {
  const employeeMap = buildEmployeeMap(employees);
  const vehicleMap = buildVehicleMap(vehicles);
  const runs = worklog?.runs || [];
  
  return {
    dateKey,
    date: worklog?.date || dateKey,
    status: worklog?.status || WorklogStatus.DRAFT,
    isLocked: worklog?.status === WorklogStatus.FINAL,
    outbound: groupRunsByDirection(runs, Direction.DL_SG, employeeMap, vehicleMap, rates),
    inbound: groupRunsByDirection(runs, Direction.SG_DL, employeeMap, vehicleMap, rates),
    summary: calcDailyLogSummary(runs, rates),
  };
}

/**
 * Map daily log to Dashboard rows
 */
export function mapDailyLogToDashboardRows(
  worklog: Worklog | null,
  employees: Employee[],
): DashboardRowVM[] {
  if (!worklog?.runs) return [];
  
  const employeeMap = buildEmployeeMap(employees);
  // Sort by direction → vehicle plate → shift for Dashboard table
  const sortedRuns = sortRunsByDirectionVehicleShift(worklog.runs);
  
  return sortedRuns.map(run => ({
    runId: run.id,
    ca: `Ca ${run.shift}`,
    direction: DIRECTION_LABELS[run.direction as Direction] || run.direction,
    directionType: run.direction === Direction.DL_SG ? 'outbound' : 'inbound',
    vehiclePlate: run.vehiclePlate || 'Chưa chọn',
    driverName: getEmployeeName(run.driverId, employeeMap),
    assistantName: getEmployeeName(run.assistantId, employeeMap),
    trips: run.trips,
    isLocked: worklog.status === WorklogStatus.FINAL,
  }));
}

/**
 * Map worklog to CalendarDayVM
 */
export function mapToCalendarDay(
  day: number,
  dateKey: string,
  worklog: Worklog | null,
  rates: PayRates,
  employees: Employee[],
  vehicles: Vehicle[]
): CalendarDayVM {
  const employeeMap = buildEmployeeMap(employees);
  const vehicleMap = buildVehicleMap(vehicles);
  const runs = worklog?.runs || [];
  
  const mapRunToCalendar = (run: Run): CalendarRunVM => ({
    vehiclePlate: run.vehiclePlate,
    vehicleCode: vehicleMap.get(run.vehiclePlate)?.code,
    shift: run.shift,
    driverName: getEmployeeName(run.driverId, employeeMap),
    assistantName: getEmployeeName(run.assistantId, employeeMap),
    tours: run.trips / rates.tourTrips,
  });

  // const outboundRuns = runs.filter(r => r.direction === Direction.DL_SG).map(mapRunToCalendar);
  // const inboundRuns = runs.filter(r => r.direction === Direction.SG_DL).map(mapRunToCalendar);
    // Sort by vehicle → shift for consistent display
  const outboundRuns = sortRunsByVehicleThenShift(runs.filter(r => r.direction === Direction.DL_SG)).map(mapRunToCalendar);
  const inboundRuns = sortRunsByVehicleThenShift(runs.filter(r => r.direction === Direction.SG_DL)).map(mapRunToCalendar);

  const totalTrips = runs.reduce((sum, r) => sum + r.trips, 0);
  const totalTours = totalTrips / rates.tourTrips;
  const amounts = runs.reduce((sum, r) => {
    const a = calcRunAmount(r.trips, rates);
    return sum + a.totalAmount;
  }, 0);

  return {
    day,
    dateKey,
    hasData: runs.length > 0,
    isLocked: worklog?.status === WorklogStatus.FINAL,
    outboundRuns,
    inboundRuns,
    totalRuns: runs.length,
    totalTours,
    totalAmount: amounts,
  };
}
