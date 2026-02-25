/**
 * Payroll Service
 * 
 * Handles employee payslip generation and salary calculations
 */

import { 
  Employee, 
  Worklog, 
  Advance, 
  PayRates, 
  Role,
  PayslipVM,
  PayslipDayVM,
} from '../../types';
import * as firestore from '../../services/firestore';
import { 
  calcAmount, 
  calcTours, 
  formatTourText, 
  getTripRateByRole,
  calcRemainder,
} from './payroll.utils';

/**
 * Get employee payslip for a specific month
 */
export async function getEmployeePayslip(
  month: string, 
  employeeId: string
): Promise<PayslipVM | null> {
  // Load data
  const [employees, worklogs, advances, rates] = await Promise.all([
    firestore.getActiveEmployees(),
    firestore.getWorklogsByMonth(month),
    firestore.getAdvancesByMonth(month),
    firestore.getPayRates(),
  ]);

  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return null;

  // Build daily logs
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const dailyLogs: PayslipDayVM[] = [];

  let totalTrips = 0;
  let totalAdvances = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${month}-${day.toString().padStart(2, '0')}`;
    const worklog = worklogs.find(w => w.dateKey === dateStr);
    const dayAdvances = advances.filter(
      a => a.date === dateStr && a.employeeId === employeeId
    );

    let trips = 0;
    const vehiclePlates: string[] = [];

    if (worklog?.runs) {
      worklog.runs.forEach(run => {
        if (run.driverId === employeeId || run.assistantId === employeeId) {
          trips += run.trips;
          if (run.vehiclePlate && !vehiclePlates.includes(run.vehiclePlate)) {
            vehiclePlates.push(run.vehiclePlate);
          }
        }
      });
    }

    const advanceAmount = dayAdvances.reduce((sum, a) => sum + a.amount, 0);
    const advanceNotes = dayAdvances.map(a => a.note || '').filter(n => n).join('; ');
    totalTrips += trips;
    totalAdvances += advanceAmount;

    dailyLogs.push({
      day,
      date: dateStr,
      trips,
      tours: calcTours(trips, rates.tourTrips),
      vehiclePlates: vehiclePlates.join(', '),
      advances: advanceAmount,
      advanceNotes,
    });
  }

  const tripRate = getTripRateByRole(employee.role, rates);
  const totalSalary = calcAmount(employee.role, totalTrips, rates);
  const totalTours = calcTours(totalTrips, rates.tourTrips);

  return {
    employeeId,
    employeeName: employee.name,
    role: employee.role,
    month,
    dailyLogs,
    summary: {
      totalTrips,
      totalTours,
      totalToursText: formatTourText(totalTrips, rates.tourTrips),
      tripRate,
      totalSalary,
      totalAdvances,
      remainder: calcRemainder(totalSalary, totalAdvances),
    },
  };
}

/**
 * Get all employees payroll summary for a month
 */
export async function getMonthlyPayrollSummary(month: string): Promise<{
  employees: Array<{
    employeeId: string;
    employeeName: string;
    role: Role;
    totalTrips: number;
    totalTours: number;
    totalSalary: number;
    totalAdvances: number;
    remainder: number;
  }>;
  grandTotal: {
    totalSalary: number;
    totalAdvances: number;
    remainder: number;
  };
}> {
  const [employees, worklogs, advances, rates] = await Promise.all([
    firestore.getActiveEmployees(),
    firestore.getWorklogsByMonth(month),
    firestore.getAdvancesByMonth(month),
    firestore.getPayRates(),
  ]);

  // Build employee map
  const employeeMap = new Map<string, {
    trips: number;
    advances: number;
  }>();

  employees.forEach(emp => {
    employeeMap.set(emp.id, { trips: 0, advances: 0 });
  });

  // Aggregate trips from worklogs
  worklogs.forEach(worklog => {
    worklog.runs?.forEach(run => {
      if (run.driverId && employeeMap.has(run.driverId)) {
        employeeMap.get(run.driverId)!.trips += run.trips;
      }
      if (run.assistantId && employeeMap.has(run.assistantId)) {
        employeeMap.get(run.assistantId)!.trips += run.trips;
      }
    });
  });

  // Aggregate advances
  advances.forEach(adv => {
    if (employeeMap.has(adv.employeeId)) {
      employeeMap.get(adv.employeeId)!.advances += adv.amount;
    }
  });

  // Build result
  let grandTotalSalary = 0;
  let grandTotalAdvances = 0;

  const result = employees.map(emp => {
    const data = employeeMap.get(emp.id)!;
    const totalSalary = calcAmount(emp.role, data.trips, rates);
    const totalTours = calcTours(data.trips, rates.tourTrips);

    grandTotalSalary += totalSalary;
    grandTotalAdvances += data.advances;

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      totalTrips: data.trips,
      totalTours,
      totalSalary,
      totalAdvances: data.advances,
      remainder: calcRemainder(totalSalary, data.advances),
    };
  });

  return {
    employees: result.filter(e => e.totalTrips > 0 || e.totalAdvances > 0),
    grandTotal: {
      totalSalary: grandTotalSalary,
      totalAdvances: grandTotalAdvances,
      remainder: grandTotalSalary - grandTotalAdvances,
    },
  };
}
