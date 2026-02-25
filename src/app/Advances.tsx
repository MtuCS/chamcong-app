/**
 * Advances Component (Refactored)
 * 
 * UI only - no business logic
 * Data comes from advances.service
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Receipt } from 'lucide-react';
import { 
  listAdvancesByMonth, 
  createAdvance, 
  removeAdvance,
  getEmployeeMonthlyAdvances,
} from '../domains/advances';
import { formatVNDCurrency } from '../domains/payroll/payroll.utils';
import { AdvanceVM, Employee } from '../types';
import { useToast } from '../components';

export const Advances: React.FC = () => {
  const [advances, setAdvances] = useState<AdvanceVM[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { showSuccess, showError } = useToast();
  
  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEmpId, setFormEmpId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formNote, setFormNote] = useState('');
  const [selectedEmpMonthlyTotal, setSelectedEmpMonthlyTotal] = useState(0);

  // Load data from service
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdvancesByMonth(currentMonth);
      setAdvances(data.advances);
      setEmployees(data.employees);
      setTotalAmount(data.totalAmount);
    } catch (err) {
      console.error('Error loading advances:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load selected employee's monthly total
  useEffect(() => {
    if (formEmpId) {
      getEmployeeMonthlyAdvances(currentMonth, formEmpId).then(setSelectedEmpMonthlyTotal);
    } else {
      setSelectedEmpMonthlyTotal(0);
    }
  }, [formEmpId, currentMonth]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu ứng này không?')) return;
    
    try {
      await removeAdvance(id);
      await loadData();
      showSuccess('Đã xóa phiếu ứng!');
    } catch (err) {
      console.error('Error deleting advance:', err);
      showError('Lỗi khi xóa phiếu ứng');
    }
  };

  const handleSave = async () => {
    try {
      await createAdvance({
        date: formDate,
        employeeId: formEmpId,
        amount: Number(formAmount),
        note: formNote,
      });
      await loadData();
      setIsModalOpen(false);
      resetForm();
      showSuccess('Đã thêm phiếu ứng mới!');
    } catch (err: any) {
      console.error('Error adding advance:', err);
      showError(err.message || 'Lỗi khi thêm phiếu ứng');
    }
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormEmpId('');
    setFormAmount('');
    setFormNote('');
  };

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
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ứng Lương</h2>
          <p className="text-slate-500 font-medium">
            Tổng ứng tháng {currentMonth.split('-')[1]}: 
            <span className="text-orange-600 font-black"> {formatVNDCurrency(totalAmount)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 flex items-center gap-2 hover:scale-105 transition-all"
          >
            <Plus size={18} /> + Phiếu ứng mới
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lọc theo tháng:</span>
          <input 
            type="month" 
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="border-slate-200 rounded-lg text-sm font-bold focus:ring-primary focus:border-primary cursor-pointer hover:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-4">Ngày ứng</th>
                <th className="px-6 py-4">Nhân sự</th>
                <th className="px-6 py-4 text-right">Số tiền</th>
                <th className="px-6 py-4">Lý do / Ghi chú</th>
                <th className="px-8 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {advances.map(adv => (
                <tr key={adv.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-700">{adv.dateFormatted}</td>
                  <td className="px-6 py-5 font-black text-slate-900">{adv.employeeName}</td>
                  <td className="px-6 py-5 text-right font-black text-orange-600">{adv.amountFormatted}</td>
                  <td className="px-6 py-5 text-slate-400 italic">{adv.note || '-'}</td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(adv.id)}
                      className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {advances.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Receipt size={64} className="mb-4" />
                      <p className="font-bold text-slate-500">Chưa có dữ liệu tạm ứng</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h3 className="text-xl font-black text-slate-800">Lập Phiếu Tạm Ứng</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ngày thực hiện</label>
                <input 
                  type="date" 
                  className="w-full h-12 px-4 rounded-xl border-slate-200 focus:ring-primary focus:border-primary font-bold cursor-pointer"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nhân sự nhận ứng</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border-slate-200 focus:ring-primary focus:border-primary font-bold"
                  value={formEmpId}
                  onChange={e => setFormEmpId(e.target.value)}
                >
                  <option value="">-- Chọn nhân sự --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                {selectedEmpMonthlyTotal > 0 && (
                  <p className="text-xs text-orange-500 mt-1">
                    Đã ứng trong tháng: {formatVNDCurrency(selectedEmpMonthlyTotal)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Số tiền ứng</label>
                <input 
                  type="number" 
                  className="w-full h-12 px-4 rounded-xl border-slate-200 focus:ring-primary focus:border-primary font-bold"
                  placeholder="500000"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ghi chú (tuỳ chọn)</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border-slate-200 focus:ring-primary focus:border-primary"
                  rows={2}
                  placeholder="Lý do ứng lương..."
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                />
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                className="px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                Lưu phiếu ứng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Advances;
