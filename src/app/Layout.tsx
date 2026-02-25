/**
 * Layout Component (Refactored)
 * 
 * Moved to src/app with adjusted import paths
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user?: User;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Tổng quan' },
    { to: '/logs', label: 'Điều phối chuyến' },    { to: '/employees', label: 'Nhân sự' },    { to: '/advances', label: 'Ứng lương' },
    { to: '/reports', label: 'Báo cáo' },
    { to: '/settings', label: 'Cấu hình' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-[#e7edf3] bg-white px-4 md:px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="text-primary">
            <span className="material-symbols-outlined text-2xl">local_shipping</span>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-tight">Quản lý Vận hành & Chấm công</h2>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm font-medium transition-all ${
                location.pathname === item.to
                  ? 'text-primary font-bold border-b-2 border-primary py-1'
                  : 'text-[#4e7397] hover:text-primary'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex gap-2">
            <button className="flex size-10 items-center justify-center rounded-lg bg-[#f0f2f4] text-[#0e141b] hover:bg-gray-200">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link to="/settings" className="flex size-10 items-center justify-center rounded-lg bg-[#f0f2f4] text-[#0e141b] hover:bg-gray-200">
              <span className="material-symbols-outlined">settings</span>
            </Link>
          </div>
          
          {/* User info and logout */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-slate-700">{user.name}</span>
                <span className="text-xs text-slate-400">
                  {user.role}
                </span>
              </div>
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-slate-200 shadow-sm bg-blue-500 flex items-center justify-center text-white font-bold">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                  title="Đăng xuất"
                >
                  <span className="material-symbols-outlined">logout</span>
                </button>
              )}
            </div>
          )}
          
          {!user && (
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-slate-200 shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCthGupMPRiPss8n4z15iPC5-NcwCg8biRXQw64cf-moO65rKp6MTeGTnnpOgUZDlbiS51TBQtOJ4IrqOQl79TqLSx8SxIKRnUmkKI7cZImLcifJloO_9aUnwAk553PP8LkgiOhM4OwMjdtoh0t--BgTG6lo-GRttWF9PgwVwfg5wjFH8iF0ht5_DEqzPRTFlXpcYL-K_hwBxCoSt3BcjSEk7QBvt0tu-d6AkJsb0IJxOk3giXBuvljVXkkYtSD18UwOAb6Mq3tXyAw")' }} />
          )}
        </div>
      </header>
      <main className="flex-1 overflow-auto bg-[#f6f7f8]">
        <div className="max-w-[1000px] mx-auto px-4 py-8">{children}</div>
      </main>
      <footer className="py-8 text-center text-slate-400 text-xs border-t border-gray-100 bg-white">
        © 2026 Hệ thống Quản lý Vận tải Trang Hòa.
      </footer>
    </div>
  );
};

export default Layout;
