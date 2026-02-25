/**
 * Toast Notification System
 * 
 * Provides toast notifications for success, error, warning, info messages
 * Usage:
 *   const { showToast, showError, showSuccess } = useToast();
 *   showSuccess('Đã lưu thành công!');
 *   showError('Lỗi khi thêm dữ liệu');
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============ TYPES ============

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  removeToast: (id: string) => void;
}

// ============ CONTEXT ============

const ToastContext = createContext<ToastContextType | null>(null);

// ============ PROVIDER ============

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info', 
    duration: number = 4000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = { id, type, message, duration };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error', 6000), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ 
      toasts, 
      showToast, 
      showSuccess, 
      showError, 
      showWarning, 
      showInfo,
      removeToast 
    }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// ============ HOOK ============

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============ TOAST CONTAINER ============

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

// ============ TOAST ITEM ============

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const TOAST_STYLES: Record<ToastType, { bg: string; icon: string; iconColor: string }> = {
  success: { 
    bg: 'bg-green-50 border-green-200', 
    icon: 'check_circle', 
    iconColor: 'text-green-500' 
  },
  error: { 
    bg: 'bg-red-50 border-red-200', 
    icon: 'error', 
    iconColor: 'text-red-500' 
  },
  warning: { 
    bg: 'bg-amber-50 border-amber-200', 
    icon: 'warning', 
    iconColor: 'text-amber-500' 
  },
  info: { 
    bg: 'bg-blue-50 border-blue-200', 
    icon: 'info', 
    iconColor: 'text-blue-500' 
  },
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const style = TOAST_STYLES[toast.type];
  
  return (
    <div 
      className={`
        ${style.bg} border rounded-xl shadow-lg p-4 
        flex items-start gap-3 
        animate-in slide-in-from-right-5 duration-300
        min-w-[280px]
      `}
    >
      <span className={`material-symbols-outlined ${style.iconColor}`}>
        {style.icon}
      </span>
      <p className="flex-1 text-sm text-slate-700 font-medium">
        {toast.message}
      </p>
      <button 
        onClick={() => onRemove(toast.id)}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};

// ============ ASYNC ERROR WRAPPER ============

/**
 * Wrap an async function with error handling
 * Shows toast on error and rethrows for caller to handle
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMessage: string = 'Có lỗi xảy ra'
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(errorMessage, error);
      // Note: Caller should use useToast to show error
      throw error;
    }
  }) as T;
}
