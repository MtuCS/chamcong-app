/**
 * DailyLogs Component (Refactored)
 * 
 * UI only - no business logic
 * All data comes from dispatch.service
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  loadDailyLog, 
  addNewRun, 
  updateRunData, 
  removeRun,
  lockDailyLog,
  DIRECTION_LABELS,
  getUnavailableVehicles,
  getUnavailableEmployees,
  getNextShiftForVehicle,
  validateDailyRuns,
} from '../domains/dispatch';
import { DailyLogVM, RunEditVM, ValidationResult, ConflictType } from '../domains/dispatch/dispatch.types';
import { formatVND, calcTours } from '../domains/payroll';
import { Direction, Vehicle, PayRates, Role, Run } from '../types';
import { EmployeeInput, useToast } from '../components';
import { preloadCache } from '../services/cache';
import { perfStart } from '../utils/perf';

// ============ RUN BLOCK COMPONENT ============

interface RunBlockProps {
  run: RunEditVM;
  vehicles: Vehicle[];
  payRates: PayRates;
  allRuns: RunEditVM[];
  onUpdate: (updates: Partial<Run>) => void;
  onRemove: () => void;
}

const RunBlock = memo(function RunBlock({ 
  run, 
  vehicles, 
  payRates,
  allRuns,
  onUpdate, 
  onRemove 
}: RunBlockProps) {
  const shiftColor = run.shift === 1 ? 'blue' : 'orange';
  
  // Get unavailable options for validation
  const unavailableVehicles = getUnavailableVehicles(run.direction, allRuns);
  const unavailableEmployees = getUnavailableEmployees(run.direction, allRuns);
  
  // Validation: Driver is required when vehicle is selected
  const showDriverWarning = run.vehiclePlate && !run.driverId;

  // Handle vehicle change - auto update shift
  const handleVehicleChange = (vehiclePlate: string) => {
    const nextShift = getNextShiftForVehicle(vehiclePlate, run.direction, allRuns);
    onUpdate({ vehiclePlate, shift: nextShift });
  };

  // Calculate tours (0.5, 1, etc.)
  const tours = run.trips / payRates.tourTrips;
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4 animate-in zoom-in-95 duration-200">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-400 text-sm">directions_bus</span>
          <select 
            className="bg-transparent border-none text-sm font-bold p-0 focus:ring-0 w-40"
            value={run.vehiclePlate}
            onChange={(e) => handleVehicleChange(e.target.value)}
          >
            <option value="">-- Chọn Xe --</option>
            {vehicles.map(v => {
              const isDisabled = unavailableVehicles.has(v.plateNumber) && v.plateNumber !== run.vehiclePlate;
              return (
                <option 
                  key={v.id} 
                  value={v.plateNumber}
                  disabled={isDisabled}
                >
                  {v.code} - {v.plateNumber}{isDisabled ? ' (đã dùng)' : ''}
                </option>
              );
            })}
          </select>
          
          <span className={`bg-${shiftColor}-50 border border-${shiftColor}-200 text-${shiftColor}-600 text-xs font-bold px-2 py-1 rounded-lg`}>
            Ca {run.shift}
          </span>
          
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
            {/* {tours} Tour */}
          </span>
        </div>
        
        <button onClick={onRemove} className="text-slate-300 hover:text-red-500 transition-colors">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <div className="p-4">
        <div className={`bg-${shiftColor}-50/30 p-3 rounded-lg border border-${shiftColor}-100/50`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-black text-${shiftColor}-500 uppercase tracking-widest`}>
              {run.shiftLabel}
            </span>
            <span className={`text-[10px] text-${shiftColor}-400 font-bold`}>
              {/* {payRates.driverTrip / 1000}K + {payRates.assistantTrip / 1000}K */}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <EmployeeInput
                value={run.driverId || ''}
                onChange={(id) => {
                  if (id && unavailableEmployees.has(id)) return;
                  onUpdate({ driverId: id || null });
                }}
                role={Role.DRIVER}
                disabledIds={unavailableEmployees}
              />
              {showDriverWarning && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  Chưa chọn tài xế!
                </p>
              )}
            </div>
            <EmployeeInput
              value={run.assistantId || ''}
              onChange={(id) => {
                if (id && unavailableEmployees.has(id)) return;
                onUpdate({ assistantId: id || null });
              }}
              role={Role.ASSISTANT}
              disabledIds={unavailableEmployees}
            />
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these change
  return (
    prevProps.run.id === nextProps.run.id &&
    prevProps.run.vehiclePlate === nextProps.run.vehiclePlate &&
    prevProps.run.shift === nextProps.run.shift &&
    prevProps.run.driverId === nextProps.run.driverId &&
    prevProps.run.assistantId === nextProps.run.assistantId &&
    prevProps.run.trips === nextProps.run.trips &&
    prevProps.allRuns.length === nextProps.allRuns.length
  );
});

// ============ MAIN COMPONENT ============

export const DailyLogs: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyLog, setDailyLog] = useState<DailyLogVM | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [payRates, setPayRates] = useState<PayRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { showSuccess, showError, showWarning } = useToast();

  // Preload cache on mount
  useEffect(() => {
    preloadCache();
  }, []);

  // Load data from service
  const loadData = useCallback(async (showSpinner: boolean = true) => {
    const stop = perfStart('DailyLogs.loadData');
    if (showSpinner) setLoading(true);
    setError(null);
    
    // Add timeout to detect hanging requests
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: Không thể kết nối Firestore')), 15000)
    );
    
    try {
      const data = await Promise.race([
        loadDailyLog(selectedDate),
        timeoutPromise
      ]);
      setDailyLog(data.dailyLog);
      setVehicles(data.vehicles);
      setPayRates(data.payRates);
    } catch (err) {
      console.error('Error loading data:', err);
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(`Không thể tải dữ liệu: ${message}`);
    } finally {
      setLoading(false);
      stop();
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add new run - OPTIMISTIC UPDATE
  const handleAddRun = async (direction: Direction) => {
    if (!payRates) return;
    
    // Optimistic: Add placeholder run to UI immediately
    const tempId = `temp_${Date.now()}`;
    const tempRun: RunEditVM = {
      id: tempId,
      direction,
      shift: 1,
      shiftLabel: 'Ca 1',
      vehiclePlate: '',
      driverId: null,
      driverName: '',
      assistantId: null,
      assistantName: '',
      trips: 1,
      driverAmount: payRates.driverTrip,
      assistantAmount: payRates.assistantTrip,
    };
    
    // Update UI immediately
    setDailyLog(prev => {
      if (!prev) return prev;
      const targetGroup = direction === Direction.DL_SG ? 'outbound' : 'inbound';
      return {
        ...prev,
        [targetGroup]: {
          ...prev[targetGroup],
          runs: [...prev[targetGroup].runs, tempRun],
          totalRuns: prev[targetGroup].totalRuns + 1,
        },
      };
    });
    
    // Sync with server
    try {
      await addNewRun(selectedDate, direction);
      await loadData(false); // Silent reload to get real ID
    } catch (err) {
      console.error('Error adding run:', err);
      showError('Lỗi khi thêm chuyến mới');
      await loadData(false); // Silent rollback
    }
  };

  // Update run - OPTIMISTIC UPDATE
  const handleUpdateRun = async (runId: string, updates: Partial<Run>) => {
    // Optimistic: Update UI immediately
    setDailyLog(prev => {
      if (!prev) return prev;
      const updateRuns = (runs: RunEditVM[]) =>
        runs.map(r => r.id === runId ? { ...r, ...updates } : r);
      return {
        ...prev,
        outbound: { ...prev.outbound, runs: updateRuns(prev.outbound.runs) },
        inbound: { ...prev.inbound, runs: updateRuns(prev.inbound.runs) },
      };
    });
    
    // Sync with server (fire and forget for speed)
    updateRunData(selectedDate, runId, updates).catch(err => {
      console.error('Error updating run:', err);
      loadData(false); // Silent rollback on error
    });
  };

  // Delete run - OPTIMISTIC UPDATE
  const handleDeleteRun = async (runId: string) => {
    if (!confirm('Xóa chuyến này?')) return;
    
    // Optimistic: Remove from UI immediately
    setDailyLog(prev => {
      if (!prev) return prev;
      const filterRuns = (runs: RunEditVM[]) => runs.filter(r => r.id !== runId);
      return {
        ...prev,
        outbound: { ...prev.outbound, runs: filterRuns(prev.outbound.runs) },
        inbound: { ...prev.inbound, runs: filterRuns(prev.inbound.runs) },
      };
    });
    
    // Sync with server
    try {
      await removeRun(selectedDate, runId);
    } catch (err) {
      console.error('Error deleting run:', err);
      await loadData(false); // Silent rollback
    }
  };

  // Lock worklog
  const handleLock = async () => {
    try {
      await lockDailyLog(selectedDate);
      await loadData(false);
      showSuccess('Đã chốt sổ thành công!');
    } catch (err) {
      console.error('Error locking:', err);
      showError('Lỗi khi chốt sổ');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
        <p className="text-red-600 font-medium">{error}</p>
        <button 
          onClick={() => loadData(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Thử lại
        </button>
      </div>
    );
  }

  if (!dailyLog || !payRates) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="material-symbols-outlined text-slate-400 text-4xl">warning</span>
        <p className="text-slate-600">Không có dữ liệu</p>
        <button 
          onClick={() => loadData(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Tải lại
        </button>
      </div>
    );
  }

  const { outbound, inbound, summary, isLocked } = dailyLog;

  // Handle lock with validation check
  const handleLockWithValidation = async () => {
    // Validate at lock time
    const allRuns = [...outbound.runs, ...inbound.runs];
    const validation = validateDailyRuns(allRuns, payRates.maxShiftsPerDay);
    if (!validation.canLock) {
      showWarning('Không thể chốt sổ! Vui lòng sửa các lỗi trước.');
      return;
    }
    await handleLock();
  };

  // Compute validation for UI display
  const allRuns = [...outbound.runs, ...inbound.runs];
  const validation = validateDailyRuns(allRuns, payRates.maxShiftsPerDay);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#0e141b] tracking-tight">Điều phối chuyến</h1>
          {/* <p className="text-slate-500 text-sm">Quản lý chuyến chạy theo ngày - lưu trực tiếp vào Firestore</p> */}
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="material-symbols-outlined text-slate-400">event</span>
          <input 
            type="date" 
            className="border-none focus:ring-0 text-sm font-bold bg-transparent p-0 w-32" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>
      </div>

      {/* Validation Warnings */}
      {!validation.isValid && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <h3 className="font-bold text-red-700">Phát hiện lỗi ({validation.conflicts.length})</h3>
          </div>
          <ul className="space-y-2">
            {validation.conflicts.map((conflict, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-red-600">
                <span className="material-symbols-outlined text-xs mt-0.5">
                  {conflict.type === ConflictType.MISSING_DRIVER ? 'person_off' : 
                   conflict.type === ConflictType.DUPLICATE_SLOT ? 'content_copy' :
                   conflict.type === ConflictType.EMPLOYEE_SAME_SHIFT ? 'schedule' : 'warning'}
                </span>
                <span>{conflict.message}</span>
              </li>
            ))}
          </ul>
          {!validation.canLock && (
            <p className="mt-3 text-xs text-red-500 font-medium">
              ⚠️ Không thể chốt sổ cho đến khi sửa xong các lỗi trên
            </p>
          )}
        </div>
      )}

      {/* Two Columns: Outbound & Inbound */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Outbound: DL → SG */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="font-black text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">trending_flat</span>
              {outbound.directionLabel}
            </h2>
            <button 
              onClick={() => handleAddRun(Direction.DL_SG)}
              className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span> Thêm chuyến
            </button>
          </div>
          <div className="min-h-[100px]">
            {outbound.runs.map(run => (
              <RunBlock 
                key={run.id} 
                run={run}
                vehicles={vehicles}
                payRates={payRates}
                allRuns={[...outbound.runs, ...inbound.runs]}
                onRemove={() => handleDeleteRun(run.id)}
                onUpdate={(updates) => handleUpdateRun(run.id, updates)}
              />
            ))}
            {outbound.runs.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm italic">
                Chưa có chuyến chạy hướng này
              </div>
            )}
          </div>
        </section>

        {/* Inbound: SG → DL */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="font-black text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">keyboard_backspace</span>
              {inbound.directionLabel}
            </h2>
            <button 
              onClick={() => handleAddRun(Direction.SG_DL)}
              className="text-xs font-bold text-orange-500 flex items-center gap-1 hover:underline"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span> Thêm chuyến
            </button>
          </div>
          <div className="min-h-[100px]">
            {inbound.runs.map(run => (
              <RunBlock 
                key={run.id} 
                run={run}
                vehicles={vehicles}
                payRates={payRates}
                allRuns={[...outbound.runs, ...inbound.runs]}
                onRemove={() => handleDeleteRun(run.id)}
                onUpdate={(updates) => handleUpdateRun(run.id, updates)}
              />
            ))}
            {inbound.runs.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm italic">
                Chưa có chuyến chạy hướng này
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl z-50 animate-in slide-in-from-bottom-10">
        <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-wrap items-center justify-between gap-6 border border-white/10 text-white">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TỔNG CÔNG NGÀY</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-green-400">
                  {new Intl.NumberFormat('vi-VN').format(summary.totalAmount)}
                </span>
                <span className="text-slate-400 font-bold text-xs uppercase">VNĐ</span>
              </div>
            </div>
            <div className="hidden sm:block h-10 w-px bg-white/10"></div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">TỔNG TOUR</p>
              <p className="text-lg font-black text-primary">
                {summary.totalTours} TOUR
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {!isLocked ? (
              <>
                {!validation.canLock && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <span className="material-symbols-outlined text-red-400 text-sm">error</span>
                    <span className="text-xs font-bold text-red-400">{validation.conflicts.length} lỗi</span>
                  </div>
                )}
                <button 
                  onClick={handleLockWithValidation} 
                  disabled={!validation.canLock}
                  className={`px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${
                    validation.canLock 
                      ? 'bg-primary text-white shadow-primary/20 hover:scale-105 active:scale-95' 
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">lock</span> Chốt sổ
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <span className="material-symbols-outlined text-green-400">check_circle</span>
                <span className="text-sm font-bold text-green-400">ĐÃ CHỐT</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyLogs;
