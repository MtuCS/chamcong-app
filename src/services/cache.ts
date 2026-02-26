/**
 * Data Cache Service
 * 
 * Caches frequently accessed data (employees, vehicles, payRates)
 * to avoid repeated Firestore queries
 */

import * as firestore from './firestore';
import { Employee, Vehicle, PayRates } from '../types';
import { perfMeasure } from '../utils/perf';

// Cache storage
interface CacheState {
  employees: Employee[] | null;
  vehicles: Vehicle[] | null;
  payRates: PayRates | null;
  lastFetch: {
    employees: number;
    vehicles: number;
    payRates: number;
  };
}

const cache: CacheState = {
  employees: null,
  vehicles: null,
  payRates: null,
  lastFetch: {
    employees: 0,
    vehicles: 0,
    payRates: 0,
  },
};

// Cache TTL in milliseconds (5 minutes)
export const CACHE_TTL_MS = 5 * 60 * 1000;

const TAG_PATTERN = /<[^>]*>/g;
const JS_SCHEME_PATTERN = /javascript:/gi;

function sanitizeText(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(TAG_PATTERN, '')
    .replace(JS_SCHEME_PATTERN, '')
    .trim();
}

function sanitizeEmployee(employee: Employee): Employee {
  return {
    ...employee,
    name: sanitizeText(employee.name),
  };
}

function sanitizeVehicle(vehicle: Vehicle): Vehicle {
  return {
    ...vehicle,
    code: sanitizeText(vehicle.code),
    plateNumber: sanitizeText(vehicle.plateNumber),
  };
}

// Listeners for cache updates
type CacheListener = () => void;
const listeners: Set<CacheListener> = new Set();

/**
 * Subscribe to cache updates
 */
export function subscribeCacheUpdate(listener: CacheListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of cache update
 */
function notifyListeners(): void {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (err) {
      console.error('Cache listener error', err);
    }
  });
}

/**
 * Check if cache is stale
 */
function isStale(key: keyof typeof cache.lastFetch): boolean {
  return Date.now() - cache.lastFetch[key] > CACHE_TTL_MS;
}

// ============ EMPLOYEES ============

/**
 * Get employees (from cache or Firestore)
 */
export async function getEmployees(forceRefresh = false): Promise<Employee[]> {
  if (!forceRefresh && cache.employees && !isStale('employees')) {
    return cache.employees;
  }
  
  const employees = await perfMeasure('cache.getEmployees', () => 
    firestore.getActiveEmployees()
  );
  
  cache.employees = employees.map(sanitizeEmployee);
  cache.lastFetch.employees = Date.now();
  notifyListeners();
  
  return cache.employees;
}

/**
 * Get employee by ID (from cache)
 */
export function getEmployeeById(id: string): Employee | undefined {
  return cache.employees?.find(e => e.id === id);
}

/**
 * Get employee name by ID (from cache)
 */
export function getEmployeeName(id: string | null): string {
  if (!id) return '';
  return cache.employees?.find(e => e.id === id)?.name || 'Unknown';
}

/**
 * Add employee to cache (after creating)
 */
export function addEmployeeToCache(employee: Employee): void {
  if (cache.employees) {
    cache.employees.push(sanitizeEmployee(employee));
    notifyListeners();
  }
}

/**
 * Update employee in cache
 */
export function updateEmployeeInCache(id: string, updates: Partial<Employee>): void {
  if (cache.employees) {
    const idx = cache.employees.findIndex(e => e.id === id);
    if (idx >= 0) {
      cache.employees[idx] = sanitizeEmployee({
        ...cache.employees[idx],
        ...updates,
      } as Employee);
      notifyListeners();
    }
  }
}

// ============ VEHICLES ============

/**
 * Get vehicles (from cache or Firestore)
 */
export async function getVehicles(forceRefresh = false): Promise<Vehicle[]> {
  if (!forceRefresh && cache.vehicles && !isStale('vehicles')) {
    return cache.vehicles;
  }
  
  const vehicles = await perfMeasure('cache.getVehicles', () => 
    firestore.getAllVehicles()
  );
  
  cache.vehicles = vehicles.map(sanitizeVehicle);
  cache.lastFetch.vehicles = Date.now();
  notifyListeners();
  
  return cache.vehicles;
}

/**
 * Get vehicle by plate number (from cache)
 */
export function getVehicleByPlate(plateNumber: string): Vehicle | undefined {
  return cache.vehicles?.find(v => v.plateNumber === plateNumber);
}

// ============ PAY RATES ============

/**
 * Get pay rates (from cache or Firestore)
 */
export async function getPayRates(forceRefresh = false): Promise<PayRates> {
  if (!forceRefresh && cache.payRates && !isStale('payRates')) {
    return cache.payRates;
  }
  
  const rates = await perfMeasure('cache.getPayRates', () => 
    firestore.getPayRates()
  );
  
  cache.payRates = rates;
  cache.lastFetch.payRates = Date.now();
  
  return cache.payRates;
}

// ============ PRELOAD ============

/**
 * Preload all cached data
 * Call this at app startup
 */
export async function preloadCache(): Promise<void> {
  await perfMeasure('cache.preload', async () => {
    await Promise.all([
      getEmployees(true),
      getVehicles(true),
      getPayRates(true),
    ]);
  });
  console.log('✅ Cache preloaded');
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.employees = null;
  cache.vehicles = null;
  cache.payRates = null;
  cache.lastFetch = { employees: 0, vehicles: 0, payRates: 0 };
  console.log('🗑️ Cache cleared');
}

/**
 * Get cache status (for debugging)
 */
export function getCacheStatus(): {
  employees: number;
  vehicles: number;
  payRates: boolean;
  ages: { employees: number; vehicles: number; payRates: number };
} {
  const now = Date.now();
  return {
    employees: cache.employees?.length || 0,
    vehicles: cache.vehicles?.length || 0,
    payRates: cache.payRates !== null,
    ages: {
      employees: cache.lastFetch.employees ? Math.round((now - cache.lastFetch.employees) / 1000) : -1,
      vehicles: cache.lastFetch.vehicles ? Math.round((now - cache.lastFetch.vehicles) / 1000) : -1,
      payRates: cache.lastFetch.payRates ? Math.round((now - cache.lastFetch.payRates) / 1000) : -1,
    },
  };
}
