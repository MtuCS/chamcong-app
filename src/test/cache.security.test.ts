import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CACHE_TTL_MS,
  addEmployeeToCache,
  clearCache,
  getEmployees,
  getPayRates,
  getVehicles,
  subscribeCacheUpdate,
  updateEmployeeInCache,
} from '../services/cache';
import * as firestore from '../services/firestore';
import { DEFAULT_PAY_RATES, EMPLOYEES, VEHICLES } from './seed-data';

vi.mock('../services/firestore', () => ({
  getActiveEmployees: vi.fn(),
  getAllVehicles: vi.fn(),
  getPayRates: vi.fn(),
}));

vi.mock('../utils/perf', () => ({
  perfMeasure: (_label: string, fn: () => Promise<unknown>) => fn(),
}));

const firestoreMock = vi.mocked(firestore);

describe('Cache Security & Consistency', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  describe('TTL & force refresh', () => {
    it('reuses employees until TTL expires and respects force refresh', async () => {
      firestoreMock.getActiveEmployees.mockResolvedValue(EMPLOYEES);
      const clock = createClock();

      await getEmployees();
      expect(firestoreMock.getActiveEmployees).toHaveBeenCalledTimes(1);

      clock.advance(CACHE_TTL_MS - 1000);
      await getEmployees();
      expect(firestoreMock.getActiveEmployees).toHaveBeenCalledTimes(1);

      await getEmployees(true);
      expect(firestoreMock.getActiveEmployees).toHaveBeenCalledTimes(2);

      clock.advance(CACHE_TTL_MS + 1000);
      await getEmployees();
      expect(firestoreMock.getActiveEmployees).toHaveBeenCalledTimes(3);

      clock.restore();
    });
  });

  describe('Inactive employees & stale data (OWASP A01)', () => {
    it('keeps stale employees until TTL then refreshes', async () => {
      const clock = createClock();
      firestoreMock.getActiveEmployees
        .mockResolvedValueOnce(EMPLOYEES)
        .mockResolvedValue(EMPLOYEES.filter(e => e.id !== 'emp_A'));

      const initial = await getEmployees();
      expect(initial.some(e => e.id === 'emp_A')).toBe(true);

      clock.advance(CACHE_TTL_MS - 500);
      const stale = await getEmployees();
      expect(stale.some(e => e.id === 'emp_A')).toBe(true);

      clock.advance(1000);
      const refreshed = await getEmployees();
      expect(refreshed.some(e => e.id === 'emp_A')).toBe(false);

      clock.restore();
    });
  });

  describe('Input sanitization (OWASP A03)', () => {
    it('strips dangerous markup from employees and vehicles', async () => {
      firestoreMock.getActiveEmployees.mockResolvedValue([
        { ...EMPLOYEES[0], name: '<script>alert(1)</script>' },
      ]);
      firestoreMock.getAllVehicles.mockResolvedValue([
        { ...VEHICLES[0], plateNumber: 'javascript:alert(9)', code: '<b>90</b>' },
      ]);

      const employees = await getEmployees();
      expect(employees[0].name).toBe('alert(1)');

      const vehicles = await getVehicles();
      expect(vehicles[0].plateNumber).toBe('alert(9)');
      expect(vehicles[0].code).toBe('90');
    });

    it('sanitizes add/update cache helpers', async () => {
      firestoreMock.getActiveEmployees.mockResolvedValue(EMPLOYEES);
      await getEmployees();

      addEmployeeToCache({
        ...EMPLOYEES[0],
        id: 'emp_xss',
        name: '<img src=x onerror=alert(1)>',
      });

      const afterAdd = await getEmployees();
      expect(afterAdd.find(e => e.id === 'emp_xss')?.name).toBe('');

      updateEmployeeInCache(EMPLOYEES[0].id, { name: 'javascript:alert(2)' });
      const afterUpdate = await getEmployees();
      expect(afterUpdate.find(e => e.id === EMPLOYEES[0].id)?.name).toBe('alert(2)');
    });
  });

  describe('Listeners (OWASP A04)', () => {
    it('notifies subscribers and isolates listener errors', async () => {
      firestoreMock.getActiveEmployees.mockResolvedValue(EMPLOYEES);
      const events: number[] = [];
      const unsubscribe = subscribeCacheUpdate(() => events.push(1));
      subscribeCacheUpdate(() => {
        throw new Error('listener failed');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await getEmployees();
      expect(events.length).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalled();

      events.length = 0;
      unsubscribe();
      await getEmployees(true);
      expect(events.length).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Pay rates cache', () => {
    it('caches pay rates with TTL refresh', async () => {
      firestoreMock.getPayRates.mockResolvedValue(DEFAULT_PAY_RATES);
      const clock = createClock();

      await getPayRates();
      expect(firestoreMock.getPayRates).toHaveBeenCalledTimes(1);

      clock.advance(CACHE_TTL_MS - 200);
      await getPayRates();
      expect(firestoreMock.getPayRates).toHaveBeenCalledTimes(1);

      clock.advance(500);
      await getPayRates();
      expect(firestoreMock.getPayRates).toHaveBeenCalledTimes(2);

      clock.restore();
    });
  });
});

function createClock() {
  let now = 0;
  const spy = vi.spyOn(Date, 'now').mockImplementation(() => now);
  return {
    advance(delta: number) {
      now += delta;
    },
    restore() {
      spy.mockRestore();
    },
  };
}
