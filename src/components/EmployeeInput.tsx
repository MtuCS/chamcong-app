/**
 * EmployeeInput Component
 * 
 * Autocomplete input for selecting/creating employees
 * Features:
 * - Search existing employees by name
 * - Quick add new employee inline
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Disabled state for already-used employees
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Role, Employee } from '../types';
import * as cache from '../services/cache';
import * as firestore from '../services/firestore';

interface EmployeeInputProps {
  value: string; // employeeId
  onChange: (employeeId: string) => void;
  role: Role;
  placeholder?: string;
  disabled?: boolean;
  disabledIds?: Set<string>; // IDs to disable (already used in opposite direction)
}

export const EmployeeInput: React.FC<EmployeeInputProps> = ({
  value,
  onChange,
  role,
  placeholder,
  disabled = false,
  disabledIds = new Set(),
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default placeholder based on role
  const defaultPlaceholder = role === Role.DRIVER ? 'Tài xế...' : 'Phụ xe...';
  const displayPlaceholder = placeholder || defaultPlaceholder;
  const roleLabel = role === Role.DRIVER ? 'Tài xế' : 'Phụ xe';
  const roleColor = role === Role.DRIVER ? 'blue' : 'green';

  // Load employees on mount
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const allEmployees = await cache.getEmployees();
        setEmployees(allEmployees);
      } catch (error) {
        console.error('Failed to load employees:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEmployees();
    
    // Subscribe to cache updates
    return cache.subscribeCacheUpdate(() => {
      cache.getEmployees().then(setEmployees);
    });
  }, []);

  // Filter employees by role and search term
  const filteredEmployees = employees.filter(e => 
    e.role === role && 
    e.active && 
    e.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Get current employee from cache
  const currentEmployee = employees.find(e => e.id === value);

  // Check for exact match (for quick-add logic)
  const exactMatch = employees.find(e => 
    e.role === role && 
    e.active && 
    e.name.toLowerCase() === inputValue.toLowerCase()
  );

  const showQuickAdd = inputValue.trim() && !exactMatch;

  // Sync input with selected employee
  useEffect(() => {
    if (currentEmployee) {
      setInputValue(currentEmployee.name);
    } else if (!value) {
      setInputValue('');
    }
  }, [value, currentEmployee]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        inputRef.current && !inputRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    setHighlightIndex(-1);

    if (!val.trim()) {
      onChange('');
    }
  }, [onChange]);

  const handleSelectEmployee = useCallback((employee: Employee) => {
    onChange(employee.id);
    setInputValue(employee.name);
    setIsOpen(false);
  }, [onChange]);

  const handleQuickAdd = useCallback(async () => {
    const trimmedName = inputValue.trim();
    if (!trimmedName) return;
    
    try {
      // Create in Firestore
      const newEmployee = await firestore.createEmployee({
        name: trimmedName,
        role: role,
        active: true,
      });

      // Update local cache
      cache.addEmployeeToCache(newEmployee);

      // Select the new employee
      onChange(newEmployee.id);
      setInputValue(newEmployee.name);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to add employee:', error);
    }
  }, [inputValue, role, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    const totalItems = filteredEmployees.length + (showQuickAdd ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filteredEmployees.length) {
          handleSelectEmployee(filteredEmployees[highlightIndex]);
        } else if (showQuickAdd && highlightIndex === filteredEmployees.length) {
          handleQuickAdd();
        } else if (showQuickAdd && filteredEmployees.length === 0) {
          handleQuickAdd();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, filteredEmployees, showQuickAdd, highlightIndex, handleSelectEmployee, handleQuickAdd]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay to allow click events to fire
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        // Revert to current employee name if input doesn't match
        if (currentEmployee && inputValue !== currentEmployee.name) {
          setInputValue(currentEmployee.name);
        }
      }
    }, 150);
  }, [currentEmployee, inputValue]);

  if (isLoading) {
    return (
      <input
        type="text"
        disabled
        placeholder="Đang tải..."
        className="h-9 w-full px-3 rounded-md border-slate-200 text-xs font-medium bg-slate-50"
      />
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        placeholder={displayPlaceholder}
        className="h-9 w-full px-3 rounded-md border-slate-200 text-xs font-medium focus:ring-primary focus:border-primary"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      
      {isOpen && !disabled && (filteredEmployees.length > 0 || showQuickAdd) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
        >
          {/* Existing employees */}
          {filteredEmployees.map((emp, idx) => {
            const isDisabledEmployee = disabledIds.has(emp.id);
            return (
              <button
                key={emp.id}
                type="button"
                disabled={isDisabledEmployee}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                  isDisabledEmployee 
                    ? 'opacity-40 cursor-not-allowed bg-slate-50' 
                    : 'hover:bg-slate-50'
                } ${highlightIndex === idx ? 'bg-slate-100' : ''}`}
                onMouseDown={(e) => {
                  if (isDisabledEmployee) return;
                  e.preventDefault();
                  handleSelectEmployee(emp);
                }}
              >
                <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                <span className="font-medium text-slate-700">{emp.name}</span>
                {isDisabledEmployee && (
                  <span className="text-red-400 text-[9px]">(đã dùng)</span>
                )}
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded bg-${roleColor}-50 text-${roleColor}-600`}>
                  {roleLabel}
                </span>
              </button>
            );
          })}

          {/* Quick Add button */}
          {showQuickAdd && (
            <button
              type="button"
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 border-t border-slate-100 hover:bg-green-50 transition-colors ${
                highlightIndex === filteredEmployees.length ? 'bg-green-50' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleQuickAdd();
              }}
            >
              <span className="material-symbols-outlined text-green-500 text-sm">add_circle</span>
              <span className="font-bold text-green-600">
                + Thêm nhanh "{inputValue.trim()}"
              </span>
              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded bg-${roleColor}-100 text-${roleColor}-700 font-bold`}>
                {roleLabel}
              </span>
            </button>
          )}

          {/* Empty state */}
          {filteredEmployees.length === 0 && !showQuickAdd && (
            <div className="px-3 py-2 text-xs text-slate-400 italic">
              Không tìm thấy
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeInput;
