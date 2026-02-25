/**
 * Firestore Data Access Layer
 * 
 * PURE CRUD operations only - NO business logic
 * Business logic belongs in domains/*
 */

import { db } from '../../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import {
  Employee,
  Vehicle,
  Run,
  Worklog,
  Advance,
  PayRates,
  WorklogStatus,
  User,
} from '../types';

// ============ COLLECTION NAMES ============
export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  VEHICLES: 'vehicles',
  WORKLOGS: 'worklogs',
  RUNS: 'runs',
  ADVANCES: 'advances',
  SETTINGS: 'settings',
} as const;

// ============ DEFAULT VALUES ============
export const DEFAULT_PAY_RATES: PayRates = {
  driverTrip: 500000,
  assistantTrip: 300000,
  tourTrips: 2,
  maxShiftsPerDay: 2,
};

// ============ EMPLOYEES ============

export async function getAllEmployees(): Promise<Employee[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const q = query(collection(db, COLLECTIONS.EMPLOYEES), where('active', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const docSnap = await getDoc(doc(db, COLLECTIONS.EMPLOYEES, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Employee : null;
}

export async function createEmployee(data: Omit<Employee, 'id'>): Promise<Employee> {
  const docRef = await addDoc(collection(db, COLLECTIONS.EMPLOYEES), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return { id: docRef.id, ...data };
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, id), updates);
}

// ============ VEHICLES ============

export async function getAllVehicles(): Promise<Vehicle[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.VEHICLES));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
}

export async function getActiveVehicles(): Promise<Vehicle[]> {
  const q = query(collection(db, COLLECTIONS.VEHICLES), where('active', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
}

export async function createVehicle(data: Omit<Vehicle, 'id'>): Promise<Vehicle> {
  const docRef = await addDoc(collection(db, COLLECTIONS.VEHICLES), data);
  return { id: docRef.id, ...data };
}

// ============ WORKLOGS ============

export async function getWorklogByDate(dateKey: string): Promise<Worklog | null> {
  const docSnap = await getDoc(doc(db, COLLECTIONS.WORKLOGS, dateKey));
  if (!docSnap.exists()) return null;
  
  const worklog = { id: docSnap.id, ...docSnap.data() } as Worklog;
  worklog.runs = await getRunsByDate(dateKey);
  return worklog;
}

export async function getWorklogsByMonth(monthStr: string): Promise<Worklog[]> {
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-31`;
  
  const q = query(
    collection(db, COLLECTIONS.WORKLOGS),
    where('dateKey', '>=', startDate),
    where('dateKey', '<=', endDate)
  );
  const snapshot = await getDocs(q);
  
  const worklogs: Worklog[] = [];
  for (const d of snapshot.docs) {
    const worklog = { id: d.id, ...d.data() } as Worklog;
    worklog.runs = await getRunsByDate(d.id);
    worklogs.push(worklog);
  }
  return worklogs;
}

export async function upsertWorklog(dateKey: string, status: WorklogStatus): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.WORKLOGS, dateKey), {
    dateKey,
    date: dateKey,
    status,
    createdAt: Timestamp.now(),
  }, { merge: true });
}

export async function updateWorklogStatus(dateKey: string, status: WorklogStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.WORKLOGS, dateKey), { status });
}

// ============ RUNS (subcollection of worklogs) ============

export async function getRunsByDate(dateKey: string): Promise<Run[]> {
  const runsRef = collection(db, COLLECTIONS.WORKLOGS, dateKey, COLLECTIONS.RUNS);
  const snapshot = await getDocs(runsRef);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Run));
}

export async function createRun(dateKey: string, run: Omit<Run, 'id'>): Promise<Run> {
  // Ensure worklog exists
  await upsertWorklog(dateKey, WorklogStatus.DRAFT);
  
  const runsRef = collection(db, COLLECTIONS.WORKLOGS, dateKey, COLLECTIONS.RUNS);
  const docRef = await addDoc(runsRef, run);
  return { id: docRef.id, ...run };
}

export async function updateRun(dateKey: string, runId: string, updates: Partial<Run>): Promise<void> {
  const runRef = doc(db, COLLECTIONS.WORKLOGS, dateKey, COLLECTIONS.RUNS, runId);
  await updateDoc(runRef, updates);
}

export async function deleteRun(dateKey: string, runId: string): Promise<void> {
  const runRef = doc(db, COLLECTIONS.WORKLOGS, dateKey, COLLECTIONS.RUNS, runId);
  await deleteDoc(runRef);
}

// ============ ADVANCES ============

export async function getAdvancesByMonth(monthStr: string): Promise<Advance[]> {
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-31`;
  
  const q = query(
    collection(db, COLLECTIONS.ADVANCES),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Advance));
}

export async function getAllAdvances(): Promise<Advance[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.ADVANCES));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Advance));
}

export async function createAdvance(data: Omit<Advance, 'id'>): Promise<Advance> {
  const docRef = await addDoc(collection(db, COLLECTIONS.ADVANCES), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return { id: docRef.id, ...data };
}

export async function deleteAdvance(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.ADVANCES, id));
}

// ============ SETTINGS ============

export async function getPayRates(): Promise<PayRates> {
  const docSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'payRates'));
  return docSnap.exists() ? docSnap.data() as PayRates : DEFAULT_PAY_RATES;
}

export async function savePayRates(rates: PayRates): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.SETTINGS, 'payRates'), rates);
}

// ============ AUTH / USER ============

export async function getUserByUid(uid: string): Promise<User | null> {
  const docSnap = await getDoc(doc(db, COLLECTIONS.EMPLOYEES, uid));
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    uid: docSnap.id,
    email: data.email || '',
    name: data.name || '',
    role: data.role || 'STAFF',
    active: data.active !== false,
    createdAt: data.createdAt?.toDate?.() || undefined,
  };
}
