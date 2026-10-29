import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { User, Lock, LogIn, Sparkles } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, db } = usePOS();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const storeName = db.master?.toko?.nama || 'Parfumku POS';
  const logoText = storeName.charAt(0).toUpperCase();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Gagal masuk');
    }
  };

  const setDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#00C9A7] via-[#00B894] to-[#00A88E] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-white/20 animate-slide-up">
        {/* Logo and Brand */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00C9A7] to-[#4ADE80] flex items-center justify-center text-white font-black text-3xl mx-auto mb-3 shadow-lg ring-4 ring-white/50 dark:ring-slate-800">
            {logoText}
          </div>
          <h1 className="text-2xl font-extrabold text-[#00C9A7] tracking-tight">{storeName}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Point of Sale & Retail Management v7.0
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (e.g. admin)"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm focus:border-[#00C9A7] outline-none transition-colors font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm focus:border-[#00C9A7] outline-none transition-colors font-medium"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-2.5 rounded-xl text-center font-medium animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin">⏳ Memproses...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Masuk ke Kasir
              </>
            )}
          </button>

          {/* Quick Demo Credentials */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-[#00C9A7]" /> Akun Demo Cepat
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center text-[11px]">
              <button
                type="button"
                onClick={() => setDemo('admin', 'admin123')}
                className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold hover:bg-teal-100 border border-teal-200 dark:border-teal-900 transition-colors"
              >
                Owner: <b>admin</b>
              </button>
              <button
                type="button"
                onClick={() => setDemo('kasir', 'kasir123')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                Kasir: <b>kasir</b>
              </button>
              <button
                type="button"
                onClick={() => setDemo('manager', 'manager123')}
                className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold hover:bg-purple-100 border border-purple-200 dark:border-purple-900 transition-colors"
              >
                Manager: <b>manager</b>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
