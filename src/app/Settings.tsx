/**
 * Settings Component (Refactored)
 * 
 * UI only - no business logic
 * Validation: "không cho nhập âm / 0"
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Settings as SettingsIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { getPayRates, savePayRates } from '../services/firestore';
import { PayRates } from '../types';

const DEFAULT_RATES: PayRates = {
  driverTrip: 500000,
  assistantTrip: 300000,
  tourTrips: 2,
  maxShiftsPerDay: 2,
};

export const Settings: React.FC = () => {
  const [rates, setRates] = useState<PayRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPayRates();
      if (data) {
        setRates(data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (field: keyof PayRates, value: string) => {
    const numValue = Number(value);
    setRates(prev => ({ ...prev, [field]: numValue }));
    setError(null);
    setSaved(false);
  };

  // Validation: không cho nhập âm / 0
  const validate = (): boolean => {
    const fields: (keyof PayRates)[] = ['driverTrip', 'assistantTrip', 'tourTrips', 'maxShiftsPerDay'];
    for (const field of fields) {
      if (rates[field] <= 0) {
        setError(`Giá trị "${getLabel(field)}" phải lớn hơn 0`);
        return false;
      }
    }
    return true;
  };

  const getLabel = (field: keyof PayRates): string => {
    const labels: Record<keyof PayRates, string> = {
      driverTrip: 'Tài xế - tiền/chuyến',
      assistantTrip: 'Phụ xe - tiền/chuyến',
      tourTrips: 'Số chuyến = 1 tour',
      maxShiftsPerDay: 'Tối đa số ca/ngày',
    };
    return labels[field];
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    setError(null);
    try {
      await savePayRates(rates);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Lỗi khi lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
          <SettingsIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Cài đặt</h2>
          <p className="text-slate-500 font-medium">Đơn giá công & các thiết lập hệ thống</p>
        </div>
      </div>

      {/* Pay Rates Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
          <h3 className="text-lg font-black text-slate-800">Đơn giá chuyến</h3>
          <p className="text-sm text-slate-500">Cấu hình đơn giá tính lương theo chuyến</p>
        </div>
        
        <div className="p-8 space-y-6">
          {/* Driver rates */}
          <div className="space-y-4">
            <div className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">🚗</span>
              Tài xế
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tiền mỗi chuyến</label>
              <div className="relative">
                <input 
                  type="number"
                  className="w-full h-12 px-4 pr-12 rounded-xl border-slate-200 focus:ring-primary focus:border-primary font-bold"
                  value={rates.driverTrip}
                  onChange={e => handleChange('driverTrip', e.target.value)}
                  min={1}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">VNĐ</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-200"></div>

          {/* Assistant rates */}
          <div className="space-y-4">
            <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">👷</span>
              Phụ xe
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tiền mỗi chuyến</label>
              <div className="relative">
                <input 
                  type="number"
                  className="w-full h-12 px-4 pr-12 rounded-xl border-slate-200 focus:ring-primary focus:border-primary font-bold"
                  value={rates.assistantTrip}
                  onChange={e => handleChange('assistantTrip', e.target.value)}
                  min={1}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">VNĐ</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-slate-200"></div>

          {/* Tour settings */}
          <div className="space-y-4">
            <div className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">📊</span>
              Cấu hình Tour
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Số chuyến = 1 Tour</label>
                <div className="relative">
                  <input 
                    type="number"
                    className="w-full h-12 px-4 rounded-xl border-slate-200 focus:ring-primary focus:border-primary font-bold"
                    value={rates.tourTrips}
                    onChange={e => handleChange('tourTrips', e.target.value)}
                    min={1}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tối đa ca/ngày</label>
                <div className="relative">
                  <input 
                    type="number"
                    className="w-full h-12 px-4 rounded-xl border-slate-200 focus:ring-primary focus:border-primary font-bold"
                    value={rates.maxShiftsPerDay}
                    onChange={e => handleChange('maxShiftsPerDay', e.target.value)}
                    min={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-xs text-slate-400">TX/chuyến</p>
              <p className="font-bold text-primary">{formatCurrency(rates.driverTrip)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">PX/chuyến</p>
              <p className="font-bold text-orange-500">{formatCurrency(rates.assistantTrip)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Tour</p>
              <p className="font-bold text-green-600">{rates.tourTrips} chuyến</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Max ca/ngày</p>
              <p className="font-bold text-slate-600">{rates.maxShiftsPerDay}</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm mb-4 bg-red-50 px-4 py-3 rounded-xl">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Saved message */}
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm mb-4 bg-green-50 px-4 py-3 rounded-xl">
              <CheckCircle size={18} />
              Đã lưu cài đặt thành công!
            </div>
          )}

          {/* Save button */}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto px-8 py-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span> Đang lưu...
              </>
            ) : (
              <>
                <Save size={18} /> Lưu cài đặt
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <p className="text-sm text-blue-700">
          <strong>💡 Ghi chú:</strong> Thay đổi đơn giá sẽ ảnh hưởng đến tính toán lương của các chuyến 
          được ghi nhận sau khi lưu. Các chuyến đã ghi nhận trước đó sẽ không bị thay đổi.
        </p>
      </div>
    </div>
  );
};

export default Settings;
