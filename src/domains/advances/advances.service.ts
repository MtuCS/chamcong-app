/**
 * Advances Service
 * 
 * Business logic for salary advance operations
 */

import * as firestore from '../../services/firestore';
import { Advance, AdvanceVM, Employee } from '../../types';
import { formatVNDCurrency } from '../payroll/payroll.utils';

/**
 * Build employee lookup map
 */
function buildEmployeeMap(employees: Employee[]): Map<string, Employee> {
  return new Map(employees.map(e => [e.id, e]));
}

/**
 * Map Advance to AdvanceVM
 */
function mapToAdvanceVM(
  advance: Advance, 
  employeeMap: Map<string, Employee>
): AdvanceVM {
  const employee = employeeMap.get(advance.employeeId);
  const [y, m, d] = advance.date.split('-');
  
  return {
    id: advance.id,
    date: advance.date,
    dateFormatted: `${d}/${m}/${y}`,
    employeeId: advance.employeeId,
    employeeName: employee?.name || advance.employeeId,
    amount: advance.amount,
    amountFormatted: formatVNDCurrency(advance.amount),
    note: advance.note || '',
  };
}

/**
 * List advances by month with employee names
 */
export async function listAdvancesByMonth(month: string): Promise<{
  advances: AdvanceVM[];
  employees: Employee[];
  totalAmount: number;
}> {
  const [advances, employees] = await Promise.all([
    firestore.getAdvancesByMonth(month),
    firestore.getActiveEmployees(),
  ]);

  const employeeMap = buildEmployeeMap(employees);
  const advanceVMs = advances.map(a => mapToAdvanceVM(a, employeeMap));
  const totalAmount = advances.reduce((sum, a) => sum + a.amount, 0);

  return {
    advances: advanceVMs,
    employees,
    totalAmount,
  };
}

/**
 * Get employee's monthly advance total
 */
export async function getEmployeeMonthlyAdvances(
  month: string, 
  employeeId: string
): Promise<number> {
  const advances = await firestore.getAdvancesByMonth(month);
  return advances
    .filter(a => a.employeeId === employeeId)
    .reduce((sum, a) => sum + a.amount, 0);
}

/**
 * Create a new advance
 */
export async function createAdvance(data: {
  date: string;
  employeeId: string;
  amount: number;
  note?: string;
}): Promise<Advance> {
  // Validate
  if (!data.employeeId) {
    throw new Error('Vui lòng chọn nhân viên');
  }
  if (!data.amount || data.amount <= 0) {
    throw new Error('Số tiền phải lớn hơn 0');
  }
  if (!data.date) {
    throw new Error('Vui lòng chọn ngày');
  }

  return firestore.createAdvance({
    date: data.date,
    employeeId: data.employeeId,
    amount: data.amount,
    note: data.note,
  });
}

/**
 * Delete an advance
 */
export async function removeAdvance(id: string): Promise<void> {
  return firestore.deleteAdvance(id);
}

/**
 * Get advance statistics for a month
 */
export async function getMonthlyAdvanceStats(month: string): Promise<{
  totalAmount: number;
  totalCount: number;
  byEmployee: Array<{
    employeeId: string;
    employeeName: string;
    totalAmount: number;
    count: number;
  }>;
}> {
  const [advances, employees] = await Promise.all([
    firestore.getAdvancesByMonth(month),
    firestore.getActiveEmployees(),
  ]);

  const employeeMap = buildEmployeeMap(employees);
  
  // Group by employee
  const byEmployeeMap = new Map<string, { amount: number; count: number }>();
  
  advances.forEach(adv => {
    const existing = byEmployeeMap.get(adv.employeeId) || { amount: 0, count: 0 };
    existing.amount += adv.amount;
    existing.count += 1;
    byEmployeeMap.set(adv.employeeId, existing);
  });

  const byEmployee = Array.from(byEmployeeMap.entries()).map(([empId, data]) => ({
    employeeId: empId,
    employeeName: employeeMap.get(empId)?.name || empId,
    totalAmount: data.amount,
    count: data.count,
  }));

  return {
    totalAmount: advances.reduce((sum, a) => sum + a.amount, 0),
    totalCount: advances.length,
    byEmployee,
  };
}
