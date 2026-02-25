import { Role, Employee, Vehicle, PayRates, Direction } from './src/types';

// Pay rates theo Requirement
export const DEFAULT_PAY_RATES: PayRates = {
  driverTrip: 500000,     // 500k / chuyến
  assistantTrip: 300000,  // 300k / chuyến
  tourTrips: 2,           // 2 chuyến = 1 tour
  maxShiftsPerDay: 2,     // Tối đa 2 ca / ngày
};

// Direction labels
export const DIRECTION_LABELS: Record<Direction, string> = {
  [Direction.DL_SG]: 'Đắk Lắk → Sài Gòn',
  [Direction.SG_DL]: 'Sài Gòn → Đắk Lắk',
};

// Initial employees - CHỈ dùng khi Firestore trống (development)
// Trong production, employees được tạo qua UI
export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'emp_driver_1', name: 'Nguyễn Văn Tân', role: Role.DRIVER, active: true },
  { id: 'emp_driver_2', name: 'Trần Văn Chiến', role: Role.DRIVER, active: true },
  { id: 'emp_asst_1', name: 'Lê Thị Hồng', role: Role.ASSISTANT, active: true },
  { id: 'emp_asst_2', name: 'Phạm Văn Dũng', role: Role.ASSISTANT, active: true },
];

// Mock vehicles - sẽ được thay thế bằng data từ Firestore
export const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', code: '53', plateNumber: '50H-675.53', active: true },
  { id: '2', code: '80', plateNumber: '50H-687.80', active: true },
  { id: '3', code: '54', plateNumber: '50H-264.54', active: true },
  { id: '4', code: '85', plateNumber: '50F-055.85', active: true },
];