/**
 * Employees Component
 * 
 * CRUD operations for employees (drivers and assistants)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Employee, Role } from '../types';
import * as firestore from '../services/firestore';
import * as cache from '../services/cache';
import { useToast } from '../components';

interface EmployeeFormData {
  name: string;
  role: Role;
  active: boolean;
}

const EMPTY_FORM: EmployeeFormData = {
  name: '',
  role: Role.DRIVER,
  active: true,
};

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [confirmingEmployee, setConfirmingEmployee] = useState<Employee | null>(null);
  const [confirming, setConfirming] = useState(false);
  
  const { showSuccess, showError } = useToast();

  // Load employees
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await firestore.getAllEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error loading employees:', err);
      showError('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Filter employees
  const filteredEmployees = employees.filter(e => {
    if (filterActive === 'active') return e.active;
    if (filterActive === 'inactive') return !e.active;
    return true;
  });

  // Open modal for adding
  const handleAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      role: emp.role,
      active: emp.active,
    });
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  // Save employee
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Vui lòng nhập tên nhân viên');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        await firestore.updateEmployee(editingId, formData);
        cache.updateEmployeeInCache(editingId, formData);
        showSuccess('Đã cập nhật nhân viên');
      } else {
        // Create new
        const newEmployee = await firestore.createEmployee({
          name: formData.name.trim(),
          role: formData.role,
          active: formData.active,
        });
        cache.addEmployeeToCache(newEmployee);
        showSuccess('Đã thêm nhân viên mới');
      }
      handleCloseModal();
      await loadEmployees();
    } catch (err) {
      console.error('Error saving employee:', err);
      showError('Không thể lưu nhân viên');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (emp: Employee) => {
    try {
      await firestore.updateEmployee(emp.id, { active: !emp.active });
      cache.updateEmployeeInCache(emp.id, { active: !emp.active });
      await loadEmployees();
      showSuccess(emp.active ? 'Đã vô hiệu hóa nhân viên' : 'Đã kích hoạt nhân viên');
    } catch (err) {
      console.error('Error toggling employee:', err);
      showError('Không thể cập nhật trạng thái');
    }
  };

  // Prepare confirmation modal for disabling employees
  const handleRequestDisable = (emp: Employee) => {
    if (!emp.active) {
      handleToggleActive(emp);
      return;
    }
    setConfirmingEmployee(emp);
  };

  const handleConfirmDisable = async () => {
    if (!confirmingEmployee) return;
    setConfirming(true);
    try {
      await handleToggleActive(confirmingEmployee);
    } finally {
      setConfirming(false);
      setConfirmingEmployee(null);
    }
  };

  const handleCancelDisable = () => {
    if (confirming) return;
    setConfirmingEmployee(null);
  };

  // Role config for badges and avatars
  const roleConfig: Record<string, { bg: string; text: string; avatar: string; icon: string; label: string }> = {
    [Role.DRIVER]: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', avatar: 'bg-blue-500', icon: 'directions_car', label: 'Tài xế' },
    [Role.ASSISTANT]: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600', avatar: 'bg-orange-500', icon: 'person', label: 'Phụ xe' },
    [Role.ADMIN]: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600', avatar: 'bg-purple-500', icon: 'admin_panel_settings', label: 'Admin' },
    [Role.MANAGER]: { bg: 'bg-green-50 border-green-200', text: 'text-green-600', avatar: 'bg-green-500', icon: 'manage_accounts', label: 'Quản lý' },
    [Role.STAFF]: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', avatar: 'bg-slate-500', icon: 'badge', label: 'Nhân viên' },
  };

  const getRoleConfig = (role: Role | string) => {
    return roleConfig[role] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', avatar: 'bg-slate-500', icon: 'help', label: String(role) };
  };

  // Role badge - handles all roles
  const RoleBadge: React.FC<{ role: Role | string }> = ({ role }) => {
    const config = getRoleConfig(role);
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${config.bg} ${config.text}`}>
        <span className="material-symbols-outlined text-sm">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Status badge
  const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
      active 
        ? 'bg-green-50 text-green-600 border border-green-200' 
        : 'bg-slate-100 text-slate-400 border border-slate-200'
    }`}>
      <span className="material-symbols-outlined text-sm">
        {active ? 'check_circle' : 'cancel'}
      </span>
      {active ? 'Đang làm' : 'Đã nghỉ'}
    </span>
  );

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
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Nhân sự</h2>
          <p className="text-slate-500 font-medium">Thêm, sửa, xóa nhân viên và phân công vai trò.</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Thêm nhân viên
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase">Lọc:</span>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(['active', 'inactive', 'all'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setFilterActive(filter)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  filterActive === filter 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {filter === 'active' ? 'Đang làm' : filter === 'inactive' ? 'Đã nghỉ' : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="ml-auto text-sm text-slate-500">
          <span className="font-bold text-slate-700">{filteredEmployees.length}</span> nhân viên
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tổng nhân viên</p>
          <p className="text-3xl font-black text-slate-800">{employees.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Đang làm</p>
          <p className="text-3xl font-black text-green-600">{employees.filter(e => e.active).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tài xế</p>
          <p className="text-3xl font-black text-blue-600">{employees.filter(e => e.role === Role.DRIVER && e.active).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Phụ xe</p>
          <p className="text-3xl font-black text-orange-600">{employees.filter(e => e.role === Role.ASSISTANT && e.active).length}</p>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên nhân viên</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2 block">person_off</span>
                  Không có nhân viên nào
                </td>
              </tr>
            ) : (
              filteredEmployees.map(emp => (
                <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${!emp.active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold ${getRoleConfig(emp.role).avatar}`}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-800">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={emp.role} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge active={emp.active} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(emp)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => (emp.active ? handleRequestDisable(emp) : handleToggleActive(emp))}
                        className={`p-2 rounded-lg transition-colors ${
                          emp.active 
                            ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' 
                            : 'hover:bg-green-50 text-slate-400 hover:text-green-500'
                        }`}
                        title={emp.active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {emp.active ? 'person_off' : 'person_add'}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800">
                {editingId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {editingId ? 'Cập nhật thông tin nhân viên' : 'Điền thông tin để thêm nhân viên mới'}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                  Tên nhân viên *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên nhân viên..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  autoFocus
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
                  Vai trò *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: Role.DRIVER }))}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.role === Role.DRIVER
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">directions_car</span>
                    <span className="font-bold text-sm">Tài xế</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: Role.ASSISTANT }))}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.role === Role.ASSISTANT
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">person</span>
                    <span className="font-bold text-sm">Phụ xe</span>
                  </button>
                </div>
              </div>

              {/* Active */}
              {editingId && (
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                      className="size-5 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-bold text-slate-700">Đang làm việc</span>
                      <p className="text-xs text-slate-400">Bỏ chọn nếu nhân viên đã nghỉ việc</p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    {editingId ? 'Cập nhật' : 'Thêm mới'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Disable Modal */}
      {confirmingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800">Vô hiệu hóa nhân viên</h3>
              <p className="text-sm text-slate-500 mt-1">
                Bạn muốn vô hiệu hóa nhân viên <span className="font-semibold text-slate-800">{confirmingEmployee.name}</span>?
              </p>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-500">
                Nhân viên sẽ không còn xuất hiện trong danh sách "Đang làm" nhưng vẫn có thể kích hoạt lại sau này.
              </p>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={handleCancelDisable}
                disabled={confirming}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDisable}
                disabled={confirming}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    Đang vô hiệu...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">person_off</span>
                    Đồng ý
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
