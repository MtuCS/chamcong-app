/**
 * Login Component (Refactored)
 * 
 * Moved to src/app with adjusted import paths
 */

import React, { useState } from 'react';
import { User } from '../types';
import { Truck, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { getUserByUid } from '../services/firestore';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Chuẩn hóa email (nếu nhập "admin" thì auto thêm domain)
      const emailToAuth = email.includes('@') ? email : `${email}@tranghoa.com`;

      // Login Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, emailToAuth, password);
      const uid = cred.user.uid;

      // Lấy user info từ Firestore: employees/{uid}
      const user = await getUserByUid(uid);

      if (!user) {
        setError('Tài khoản đã đăng nhập nhưng chưa được cấp quyền trong hệ thống.');
        return;
      }

      if (!user.active) {
        setError('Tài khoản đã bị vô hiệu hóa.');
        return;
      }

      // Đăng nhập thành công
      onLogin(user);
    } catch (err: any) {
      // Firebase error codes
      const errorCode = err?.code || '';
      if (errorCode === 'auth/user-not-found') {
        setError('Tài khoản không tồn tại.');
      } else if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setError('Sai mật khẩu.');
      } else if (errorCode === 'auth/invalid-email') {
        setError('Email không hợp lệ.');
      } else if (errorCode === 'auth/too-many-requests') {
        setError('Quá nhiều lần thử. Vui lòng thử lại sau.');
      } else {
        setError(`Lỗi đăng nhập: ${err?.message || 'Không xác định'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans" style={{
      backgroundImage: 'url(/img/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 transition-all">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 mb-4">
            <Truck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">TRANG HÒA LIMOUSINE</h1>
          <p className="text-slate-500 text-sm mt-1">Hệ thống quản lý - điều phối chuyến</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2 animate-shake">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email hoặc ID</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all"
                placeholder="admin@tranghoa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="password" 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all mt-4 shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
