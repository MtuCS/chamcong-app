/**
 * Dashboard Component (Refactored)
 * 
 * UI only - no business logic
 * All data comes from dispatch.service
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardSummary } from '../domains/dispatch';
import { formatVND } from '../domains/payroll';
import { DashboardSummaryVM, DashboardRowVM } from '../types';

// ============ COMPONENTS ============

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: string;
  trend?: string;
  trendColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon, trend, trendColor }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full group hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>
      <div className="bg-slate-50 size-11 flex items-center justify-center rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
    </div>
    <div className="flex items-center gap-1.5 mt-auto">
      {trend && <span className={`text-[10px] font-black uppercase tracking-wider ${trendColor}`}>{trend}</span>}
      {subtext && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{subtext}</span>}
    </div>
  </div>
);

interface DashboardTableRowProps {
  row: DashboardRowVM;
}

const DashboardTableRow: React.FC<DashboardTableRowProps> = ({ row }) => (
  <tr className="group hover:bg-slate-50/80 transition-colors">
    <td className="px-8 py-5">
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-sm ${row.ca === 'Ca 1' ? 'text-blue-500' : 'text-orange-500'}`}>
          {row.ca === 'Ca 1' ? 'light_mode' : 'dark_mode'}
        </span>
        <span className="font-bold text-slate-700">{row.ca}</span>
      </div>
    </td>
    <td className="px-4 py-5">
      <div className="flex flex-col">
        <span className="font-bold text-slate-800">{row.direction}</span>
        <span className="text-[10px] text-slate-400 font-medium">{row.trips} chuyến</span>
      </div>
    </td>
    <td className="px-4 py-5">
      <div className="flex flex-col">
        <span className="font-black text-primary">{row.vehiclePlate}</span>
        <span className="text-[10px] text-slate-400 font-medium">Xe khách</span>
      </div>
    </td>
    <td className="px-4 py-5">
      <div className="flex flex-col">
        <span className="font-bold text-slate-800">{row.driverName}</span>
        <span className="text-[10px] text-slate-400 font-medium">{row.assistantName}</span>
      </div>
    </td>
    <td className="px-4 py-5">
      {row.isLocked ? (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black border border-blue-100">
          <span className="material-symbols-outlined text-[12px]">lock</span> ĐÃ CHỐT
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black border border-slate-200">
          <span className="material-symbols-outlined text-[12px]">edit_note</span> BẢN NHÁP
        </span>
      )}
    </td>
    <td className="px-8 py-5 text-right">
      <button className="text-slate-300 hover:text-slate-600 transition-colors">
        <span className="material-symbols-outlined">more_vert</span>
      </button>
    </td>
  </tr>
);

// ============ MAIN COMPONENT ============

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<DashboardSummaryVM | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data from service
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardSummary(selectedDate);
      setSummary(data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tổng quan</h1>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 hover:border-primary transition-colors cursor-pointer group">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-sm">calendar_today</span>
          <input 
            type="date" 
            className="border-none p-0 text-xs font-black focus:ring-0 bg-transparent cursor-pointer" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Chuyến hôm nay" 
          value={summary.todayAssignedCount} 
          icon="assignment"
        />
        <StatCard 
          title="Tổng chuyến (Tháng)" 
          value={summary.totalTripsMonth} 
          subtext={`= ${summary.totalToursMonth} tour`}
          icon="route"
        />
        <StatCard 
          title="Tổng tiền ứng" 
          value={formatVND(summary.totalAdvancesMonth)} 
          icon="account_balance_wallet"
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800">Lối tắt</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/logs" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-sm">add_circle</span> + Nhật ký mới
          </Link>
          <Link to="/advances" className="bg-white text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
            <span className="material-symbols-outlined text-sm">payments</span> + Phiếu ứng mới
          </Link>
          <button className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      {/* Today's Assignments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <h3 className="font-black text-slate-800">
            Chi tiết phân công ngày {selectedDate.split('-').reverse().join('/')}
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
            Bản tin nhanh
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="text-slate-400 text-[11px] font-black uppercase tracking-widest border-b border-slate-50">
                <th className="px-8 py-4">Ca</th>
                <th className="px-4 py-4">Tuyến (Hướng)</th>
                <th className="px-4 py-4">Xe vận hành</th>
                <th className="px-4 py-4">Tài xế / Phụ xe</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {summary.rows.map((row) => (
                <DashboardTableRow key={row.runId} row={row} />
              ))}
              {summary.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <span className="material-symbols-outlined text-6xl mb-2 text-slate-300">event_busy</span>
                      <p className="font-bold text-slate-400">Chưa có nhật ký hoạt động</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
