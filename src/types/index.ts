/**
 * Centralized Types - Re-export all types from one place
 * Import types from '@/types' or '../types' 
 */

// ============ ENUMS ============

export enum Role {
  DRIVER = 'DRIVER',
  ASSISTANT = 'ASSISTANT',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export enum Direction {
  DL_SG = 'DL_SG', // Đắk Lắk → Sài Gòn
  SG_DL = 'SG_DL', // Sài Gòn → Đắk Lắk
}

export enum WorklogStatus {
  DRAFT = 'DRAFT',
  FINAL = 'FINAL',
}

// ============ CORE ENTITIES ============

export interface User {
  uid: string;
  email: string;
  name: string;
  role: Role | string;
  active: boolean;
  createdAt?: Date;
}

export interface Employee {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt?: Date;
}

export interface Vehicle {
  id: string;
  code: string;
  plateNumber: string;
  active?: boolean;
}

export interface Run {
  id: string;
  direction: Direction;
  shift: 1 | 2;
  vehiclePlate: string;
  driverId: string | null;
  assistantId: string | null;
  driverName?: string;
  assistantName?: string;
  trips: number;
}

export interface Worklog {
  id: string;
  dateKey: string;
  date: string;
  status: WorklogStatus;
  createdAt?: Date;
  runs?: Run[];
}

export interface Advance {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  note?: string;
  createdAt?: Date;
}

export interface PayRates {
  driverTrip: number;
  assistantTrip: number;
  tourTrips: number;
  maxShiftsPerDay: number;
}

// ============ VIEW MODELS (for UI rendering) ============

/** Dashboard row for today's assignments */
export interface DashboardRowVM {
  runId: string;
  ca: string;
  direction: string;
  directionType: 'outbound' | 'inbound';
  vehiclePlate: string;
  driverName: string;
  assistantName: string;
  trips: number;
  isLocked: boolean;
}

/** Dashboard summary stats */
export interface DashboardSummaryVM {
  todayAssignedCount: number;
  totalTripsMonth: number;
  totalToursMonth: number;
  totalAdvancesMonth: number;
  rows: DashboardRowVM[];
}

/** Day summary for monthly calendar */
export interface DaySummaryVM {
  date: string;
  day: number;
  hasData: boolean;
  totalRuns: number;
  totalTrips: number;
  totalTours: number;
  totalAmount: number;
  isLocked: boolean;
  outboundRuns: RunVM[];
  inboundRuns: RunVM[];
}

/** Run view model for display */
export interface RunVM {
  id: string;
  direction: Direction;
  directionLabel: string;
  shift: 1 | 2;
  shiftLabel: string;
  vehiclePlate: string;
  vehicleCode?: string;
  driverId: string | null;
  driverName: string;
  assistantId: string | null;
  assistantName: string;
  trips: number;
  tripAmount: number;
}

/** Employee payslip view model */
export interface PayslipVM {
  employeeId: string;
  employeeName: string;
  role: Role;
  month: string;
  dailyLogs: PayslipDayVM[];
  summary: {
    totalTrips: number;
    totalTours: number;
    totalToursText: string;
    tripRate: number;
    totalSalary: number;
    totalAdvances: number;
    remainder: number;
  };
}

export interface PayslipDayVM {
  day: number;
  date: string;
  trips: number;
  tours: number;
  vehiclePlates: string;
  advances: number;
  advanceNotes: string;
}

/** Advance view model */
export interface AdvanceVM {
  id: string;
  date: string;
  dateFormatted: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  amountFormatted: string;
  note: string;
}

// ============ REPORT MODELS ============

export interface MonthlyReportItem {
  employeeId: string;
  employeeName: string;
  role: Role;
  totalTrips: number;
  totalTours: number;
  totalSalary: number;
  totalAdvances: number;
  remainder: number;
}
