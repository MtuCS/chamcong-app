import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Direction, Run, Worklog, WorklogStatus } from '../types';
import { lockDailyLog } from '../domains/dispatch/dispatch.service';
import * as firestore from '../services/firestore';
import { DEFAULT_PAY_RATES, EMPLOYEES, VEHICLES, createRun } from './seed-data';

vi.mock('../services/firestore', () => ({
  getWorklogByDate: vi.fn(),
  getActiveEmployees: vi.fn(),
  getAllVehicles: vi.fn(),
  getPayRates: vi.fn(),
  updateWorklogStatus: vi.fn(),
}));

const mockedFirestore = vi.mocked(firestore);

function buildWorklog(dateKey: string, runs: Run[]): Worklog {
  return {
    id: dateKey,
    dateKey,
    date: dateKey,
    status: WorklogStatus.DRAFT,
    runs,
  };
}

function setWorklogRuns(dateKey: string, runs: Run[] = []): void {
  mockedFirestore.getWorklogByDate.mockResolvedValue(buildWorklog(dateKey, runs));
}

describe('Dispatch Service Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFirestore.getAllVehicles.mockResolvedValue(VEHICLES);
    mockedFirestore.getPayRates.mockResolvedValue(DEFAULT_PAY_RATES);
    mockedFirestore.getActiveEmployees.mockResolvedValue(EMPLOYEES.filter(e => e.active));
  });

  it('locks daily log when data is valid', async () => {
    const dateKey = '2026-02-11';
    setWorklogRuns(dateKey, [
      createRun('run_ok', Direction.DL_SG, 1, VEHICLES[0].plateNumber, EMPLOYEES[0].id, EMPLOYEES[1].id, 1),
    ]);

    await lockDailyLog(dateKey);

    expect(mockedFirestore.updateWorklogStatus).toHaveBeenCalledWith(dateKey, WorklogStatus.FINAL);
  });

  it('rejects lock when malicious payload detected (OWASP A03)', async () => {
    const dateKey = '2026-02-12';
    setWorklogRuns(dateKey, [
      createRun('run_attack', Direction.DL_SG, 1, '<script>alert(1)</script>', EMPLOYEES[0].id, EMPLOYEES[1].id, 1),
    ]);

    await expect(
      lockDailyLog(dateKey).catch(err => {
        expect((err as any).code).toBe('DISPATCH_VALIDATION_ERROR');
        throw err;
      })
    ).rejects.toThrow(/Cannot lock daily log/);

    expect(mockedFirestore.updateWorklogStatus).not.toHaveBeenCalled();
  });

  it('rejects lock when inactive employees are assigned (OWASP A01)', async () => {
    const dateKey = '2026-02-13';
    mockedFirestore.getActiveEmployees.mockResolvedValue(
      EMPLOYEES.filter(e => e.active && e.id !== EMPLOYEES[0].id)
    );
    setWorklogRuns(dateKey, [
      createRun('run_inactive', Direction.DL_SG, 1, VEHICLES[0].plateNumber, EMPLOYEES[0].id, EMPLOYEES[1].id, 1),
    ]);

    await expect(
      lockDailyLog(dateKey).catch(err => {
        expect((err as any).code).toBe('DISPATCH_INACTIVE_EMPLOYEE');
        throw err;
      })
    ).rejects.toThrow(/inactive employees/);

    expect(mockedFirestore.updateWorklogStatus).not.toHaveBeenCalled();
  });
});
