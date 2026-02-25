/**
 * Reports Component (Refactored)
 * 
 * UI only - no business logic
 * Data comes from dispatch.service and payroll.service
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getMonthlyCalendar,
  getDaySummary,
  DIRECTION_LABELS,
} from '../domains/dispatch';
import { getEmployeePayslip } from '../domains/payroll';
import { formatVND, formatTourText } from '../domains/payroll/payroll.utils';
import { MonthCalendarVM, CalendarDayVM, CalendarRunVM } from '../domains/dispatch/dispatch.types';
import { PayslipVM, Role, Direction, DaySummaryVM, RunVM } from '../types';
import * as firestore from '../services/firestore';

type ReportTab = 'daily' | 'employee';

// ============ SUB COMPONENTS ============

interface DayCardProps {
  dayData: CalendarDayVM;
  monthStr: string;
  onClick: () => void;
}

const DayCard: React.FC<DayCardProps> = ({ dayData, monthStr, onClick }) => {
  if (!dayData.hasData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 opacity-60 p-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 px-3 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Ngày</p>
            <p className="text-lg font-black text-slate-800 leading-tight">{dayData.day}</p>
          </div>
          <p className="text-xs text-slate-300 italic">Không có dữ liệu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-1 px-3 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Ngày</p>
            <p className="text-lg font-black text-slate-800 leading-tight">{dayData.day}</p>
          </div>
          <div>
            <h4 className="font-black text-slate-800">Ngày {dayData.day} Tháng {monthStr.split('-')[1]}</h4>
            <div className="flex gap-3 mt-0.5">
              <span className="text-[10px] font-bold text-blue-600">{dayData.totalRuns} Chuyến</span>
              <span className="text-[10px] font-bold text-green-600">{dayData.totalTours} Tour</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-orange-600">{formatVND(dayData.totalAmount)}</span>
          {dayData.isLocked && (
            <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-md border border-green-100 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">lock</span> ĐÃ CHỐT
            </span>
          )}
        </div>
      </div>
      
      {/* Runs Detail - Option B: Show all runs inline */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outbound Runs */}
        {dayData.outboundRuns.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-primary uppercase mb-2">Đắk Lắk → Sài Gòn</p>
            {dayData.outboundRuns.map((run, idx) => (
              <div key={idx} className="bg-blue-50/50 rounded-lg p-2 mb-2 text-xs">
                <p className="font-bold text-slate-800">
                  Xe {run.vehicleCode || run.vehiclePlate} - Ca {run.shift}
                </p>
                <p className="text-slate-600">TX: {run.driverName} | PX: {run.assistantName}</p>
                <p className="text-green-600 font-bold">{run.tours} Tour</p>
              </div>
            ))}
          </div>
        )}
        
        {/* Inbound Runs */}
        {dayData.inboundRuns.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase mb-2">Sài Gòn → Đắk Lắk</p>
            {dayData.inboundRuns.map((run, idx) => (
              <div key={idx} className="bg-orange-50/50 rounded-lg p-2 mb-2 text-xs">
                <p className="font-bold text-slate-800">
                  Xe {run.vehicleCode || run.vehiclePlate} - Ca {run.shift}
                </p>
                <p className="text-slate-600">TX: {run.driverName} | PX: {run.assistantName}</p>
                <p className="text-green-600 font-bold">{run.tours} Tour</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface RunCardProps {
  run: RunVM;
  color: 'primary' | 'orange';
}

const RunCard: React.FC<RunCardProps> = ({ run, color }) => (
  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
    <p className="text-xs font-black text-slate-900 mb-2 flex items-center gap-2">
      <span className={`material-symbols-outlined text-${color === 'primary' ? 'primary' : 'orange-500'} text-sm`}>
        directions_bus
      </span>
      Xe {run.vehiclePlate} - {run.shiftLabel}
    </p>
    <div className="grid grid-cols-1 gap-1 pl-6">
      <p className="text-[11px] text-slate-600">
        <span className="font-bold text-blue-500">Tài xế:</span> {run.driverName}
      </p>
      <p className="text-[11px] text-slate-600">
        <span className="font-bold text-green-500">Phụ xe:</span> {run.assistantName}
      </p>
      <p className="text-[11px] text-slate-400">Trips: {run.trips}</p>
    </div>
  </div>
);

// ============ MAIN COMPONENT ============

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  // Calendar data
  const [calendar, setCalendar] = useState<MonthCalendarVM | null>(null);
  const [selectedDaySummary, setSelectedDaySummary] = useState<DaySummaryVM | null>(null);
  
  // Employee payslip
  const [payslip, setPayslip] = useState<PayslipVM | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string; role: Role }[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Print ref
  const payslipRef = useRef<HTMLDivElement>(null);

  // Print handler
  const handlePrint = () => {
    if (!payslipRef.current || !payslip) return;
    
    const printContent = payslipRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu Lương - ${payslip.employeeName} - Tháng ${currentMonth}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            font-size: 12px;
            color: #333;
          }
          .payslip-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .payslip-title {
            font-size: 22px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
          }
          .payslip-subtitle {
            font-size: 13px;
            color: #666;
          }
          .payslip-period {
            text-align: right;
            font-size: 13px;
            font-weight: bold;
          }
          .payslip-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .payslip-table th {
            background: #1e293b;
            color: white;
            padding: 8px 6px;
            font-size: 10px;
            text-transform: uppercase;
            text-align: center;
            border: 1px solid #334155;
          }
          .payslip-table td {
            padding: 5px 6px;
            border: 1px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
          }
          .payslip-table tr:nth-child(even) { background: #f8fafc; }
          .payslip-table .day-col { width: 35px; font-weight: bold; color: #64748b; }
          .payslip-table .vehicle-col { text-align: left; }
          .payslip-table .tour-col { font-weight: bold; width: 50px; }
          .payslip-table .advance-col { color: #ea580c; font-weight: bold; width: 80px; }
          .payslip-table .note-col { text-align: left; font-size: 10px; color: #666; }
          .payslip-table .empty-row { opacity: 0.3; }
          .payslip-footer {
            background: #1e293b;
            color: white;
            padding: 15px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .summary-box {
            text-align: center;
            padding: 8px 15px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            background: rgba(255,255,255,0.05);
          }
          .summary-label {
            font-size: 9px;
            text-transform: uppercase;
            color: #94a3b8;
            margin-bottom: 3px;
          }
          .summary-value { font-size: 18px; font-weight: bold; }
          .summary-value.green { color: #4ade80; }
          .summary-value.orange { color: #fb923c; }
          .total-section { text-align: right; }
          .total-row { display: flex; justify-content: flex-end; gap: 25px; margin-bottom: 8px; }
          .total-item { }
          .total-label { font-size: 9px; text-transform: uppercase; color: #94a3b8; }
          .total-value { font-size: 16px; font-weight: bold; }
          .final-section {
            border-top: 1px solid rgba(255,255,255,0.2);
            padding-top: 10px;
            margin-top: 5px;
          }
          .final-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; }
          .final-value { font-size: 24px; font-weight: bold; color: #4ade80; }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            padding: 0 50px;
          }
          .signature-box {
            text-align: center;
            width: 180px;
          }
          .signature-title { font-weight: bold; margin-bottom: 5px; }
          .signature-line {
            border-top: 1px solid #333;
            margin-top: 70px;
            padding-top: 5px;
            font-style: italic;
            font-size: 11px;
            color: #666;
          }
          @media print {
            body { padding: 10px; }
            .payslip-footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .payslip-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printContent}
        <div class="signature-section">
          <div class="signature-box">
            <p class="signature-title">Người lập phiếu</p>
            <div class="signature-line">(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-box">
            <p class="signature-title">Người nhận</p>
            <div class="signature-line">(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Load calendar data
  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const [calendarData, empData] = await Promise.all([
        getMonthlyCalendar(currentMonth),
        firestore.getActiveEmployees(),
      ]);
      setCalendar(calendarData);
      setEmployees(empData.map(e => ({ id: e.id, name: e.name, role: e.role })));
    } catch (err) {
      console.error('Error loading calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // Load payslip when employee selected
  const loadPayslip = useCallback(async () => {
    if (!selectedEmployeeId) {
      setPayslip(null);
      return;
    }
    try {
      const data = await getEmployeePayslip(currentMonth, selectedEmployeeId);
      setPayslip(data);
    } catch (err) {
      console.error('Error loading payslip:', err);
    }
  }, [currentMonth, selectedEmployeeId]);

  // Load day detail
  const loadDayDetail = async (dateKey: string) => {
    try {
      const data = await getDaySummary(dateKey);
      setSelectedDaySummary(data);
    } catch (err) {
      console.error('Error loading day detail:', err);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (activeTab === 'employee') {
      loadPayslip();
    }
  }, [activeTab, loadPayslip]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Báo cáo & Đối soát</h2>
          <p className="text-slate-500 font-medium">Quản lý lịch trình và công nợ nhân sự hàng tháng.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'daily' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Lịch chạy theo ngày
          </button>
          <button 
            onClick={() => setActiveTab('employee')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'employee' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Theo nhân viên
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase">Chọn Tháng:</span>
          <input 
            type="month" 
            className="rounded-lg border-slate-200 text-sm font-bold py-1.5" 
            value={currentMonth} 
            onChange={(e) => setCurrentMonth(e.target.value)} 
          />
        </div>
        
        {activeTab === 'employee' && (
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Nhân viên:</span>
            <select 
              className="w-full rounded-lg border-slate-200 text-sm font-bold py-1.5" 
              value={selectedEmployeeId} 
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">-- Chọn nhân viên --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.role === Role.DRIVER ? 'Tài' : 'Phụ'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex gap-4">
          {activeTab === 'employee' && payslip && (
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 text-green-600 font-bold text-xs hover:underline"
            >
              <span className="material-symbols-outlined text-sm">print</span> In phiếu lương
            </button>
          )}
          <button className="flex items-center gap-2 text-primary font-bold text-xs hover:underline">
            <span className="material-symbols-outlined text-sm">download</span> Xuất Excel
          </button>
        </div>
      </div>

      {/* TAB 1: CALENDAR VIEW */}
      {activeTab === 'daily' && calendar && (
        <div className="grid grid-cols-1 gap-6">
          {/* Summary Bar */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-wrap gap-8 items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng chuyến</p>
              <p className="text-3xl font-black text-blue-400">{calendar.summary.totalRuns}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng Tour</p>
              <p className="text-3xl font-black text-white">{calendar.summary.totalTours}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng tiền</p>
              <p className="text-3xl font-black text-green-400">{formatVND(calendar.summary.totalAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Ngày có dữ liệu</p>
              <p className="text-3xl font-black text-orange-400">{calendar.summary.daysWithData}</p>
            </div>
          </div>

          {/* Day Cards */}
          {calendar.days.map(dayData => (
            <DayCard 
              key={dayData.dateKey} 
              dayData={dayData} 
              monthStr={currentMonth}
              onClick={() => loadDayDetail(dayData.dateKey)}
            />
          ))}
        </div>
      )}

      {/* TAB 2: EMPLOYEE PAYSLIP */}
      {activeTab === 'employee' && (
        !selectedEmployeeId ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-24 text-center">
            <div className="bg-slate-50 size-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-300">person_search</span>
            </div>
            <p className="font-bold text-slate-400">Vui lòng chọn nhân viên để xem phiếu lương</p>
          </div>
        ) : payslip ? (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in duration-300">
            {/* Printable content */}
            <div ref={payslipRef}>
              {/* Header */}
              <div className="payslip-header p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-end">
                <div>
                  <h3 className="payslip-title text-3xl font-black text-primary tracking-tighter">PHIẾU LƯƠNG CHI TIẾT</h3>
                  <p className="payslip-subtitle text-slate-500 font-bold text-base mt-1 uppercase">
                    Nhân viên: {payslip.employeeName} - {payslip.role === Role.DRIVER ? 'Tài xế' : 'Phụ xe'}
                  </p>
                </div>
                <div className="payslip-period text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời gian đối soát</p>
                  <p className="font-black text-slate-800 text-lg">
                    Tháng {currentMonth.split('-')[1]} Năm {currentMonth.split('-')[0]}
                  </p>
                </div>
              </div>
              
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="payslip-table w-full text-center text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-3 py-3 font-black text-[10px] uppercase tracking-widest w-12">Ngày</th>
                      <th className="px-3 py-3 font-black text-[10px] uppercase tracking-widest">Xe chạy</th>
                      <th className="px-3 py-3 font-black text-[10px] uppercase tracking-widest w-16">Số tour</th>
                      <th className="px-3 py-3 font-black text-[10px] uppercase tracking-widest text-orange-400 w-24">Ứng lương</th>
                      <th className="px-3 py-3 font-black text-[10px] uppercase tracking-widest">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payslip.dailyLogs.map((row) => (
                      <tr key={row.day} className={row.trips > 0 ? 'bg-white font-medium' : 'bg-slate-50/30 opacity-40 empty-row'}>
                        <td className="day-col px-3 py-2 border-r font-black text-slate-400">{row.day}</td>
                        <td className="vehicle-col px-3 py-2 border-r text-slate-800 text-left">{row.vehiclePlates || '-'}</td>
                        <td className="tour-col px-3 py-2 border-r font-black text-slate-700">{row.tours > 0 ? row.tours.toFixed(1) : ''}</td>
                        <td className="advance-col px-3 py-2 border-r text-orange-600 font-black">
                          {row.advances > 0 ? new Intl.NumberFormat('vi-VN').format(row.advances) : ''}
                        </td>
                        <td className="note-col px-3 py-2 text-left text-slate-600 text-xs">{row.advanceNotes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              <div className="payslip-footer p-6 bg-slate-900 text-white flex flex-col lg:flex-row justify-between items-center gap-8">
                <div className="summary-box flex gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center min-w-[100px]">
                    <p className="summary-label text-[10px] text-slate-400 font-black uppercase mb-1">Tổng Tour</p>
                    <p className="summary-value text-2xl font-black text-white">{payslip.summary.totalTours.toFixed(1)}</p>
                  </div>
                </div>

                <div className="total-section flex-1 text-center lg:text-right">
                  <div className="total-row flex flex-wrap justify-center lg:justify-end gap-8 mb-4">
                    <div className="total-item">
                      <p className="total-label text-[10px] font-black text-slate-500 uppercase mb-1">Lương gộp</p>
                      <p className="total-value text-xl font-black">{formatVND(payslip.summary.totalSalary)}</p>
                    </div>
                    <div className="total-item">
                      <p className="total-label text-[10px] font-black text-orange-500 uppercase mb-1">Đã ứng</p>
                      <p className="total-value summary-value orange text-xl font-black text-orange-400">-{formatVND(payslip.summary.totalAdvances)}</p>
                    </div>
                  </div>
                  <div className="final-section pt-4 border-t border-white/10 inline-block lg:block">
                    <p className="final-label text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Thực nhận cuối tháng</p>
                    <p className="final-value text-4xl font-black text-green-400 tracking-tighter">
                      {formatVND(payslip.summary.remainder)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )
      )}
    </div>
  );
};

export default Reports;
