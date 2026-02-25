/**
 * API Service Stub
 * 
 * Prepared for future Cloud Functions integration
 * These will be implemented when backend is ready
 */

// ============ TYPES ============

export interface LockDayResponse {
  success: boolean;
  message?: string;
}

export interface ExportExcelResponse {
  success: boolean;
  downloadUrl?: string;
  message?: string;
}

export interface ComputePayrollResponse {
  success: boolean;
  data?: any;
  message?: string;
}

// ============ STUB IMPLEMENTATIONS ============

/**
 * Lock a day's worklog (finalize)
 * @todo Implement with Cloud Function for audit trail
 */
export async function lockDay(date: string): Promise<LockDayResponse> {
  console.warn('API.lockDay is a stub - implement Cloud Function');
  // Placeholder: Will call Cloud Function
  // return callCloudFunction('lockDay', { date });
  return { success: false, message: 'Not implemented' };
}

/**
 * Unlock a day's worklog
 * @todo Implement with Cloud Function with admin permission check
 */
export async function unlockDay(date: string): Promise<LockDayResponse> {
  console.warn('API.unlockDay is a stub - implement Cloud Function');
  return { success: false, message: 'Not implemented' };
}

/**
 * Export monthly report to Excel
 * @todo Implement with Cloud Function for server-side generation
 */
export async function exportMonthlyExcel(month: string): Promise<ExportExcelResponse> {
  console.warn('API.exportMonthlyExcel is a stub - implement Cloud Function');
  // Placeholder: Will call Cloud Function that generates Excel and returns download URL
  return { success: false, message: 'Not implemented' };
}

/**
 * Compute monthly payroll
 * @todo Implement with Cloud Function for official payroll computation
 */
export async function computeMonthlyPayroll(month: string): Promise<ComputePayrollResponse> {
  console.warn('API.computeMonthlyPayroll is a stub - implement Cloud Function');
  // Placeholder: Will call Cloud Function for server-authoritative payroll
  return { success: false, message: 'Not implemented' };
}

/**
 * Validate worklog for conflicts
 * @todo Implement validation rules:
 * - Same employee in multiple shifts at same time
 * - Same vehicle assigned twice at same time
 */
export async function validateWorklog(dateKey: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  console.warn('API.validateWorklog is a stub - implement validation');
  return { valid: true, errors: [] };
}

// ============ HELPER (for future use) ============

// async function callCloudFunction<T>(name: string, data: any): Promise<T> {
//   const functions = getFunctions();
//   const fn = httpsCallable<typeof data, T>(functions, name);
//   const result = await fn(data);
//   return result.data;
// }
