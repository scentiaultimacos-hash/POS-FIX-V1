import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { ShieldAlert } from 'lucide-react';
import { verifyPassword } from '../../utils/constants';

export const PinModal: React.FC = () => {
  const { pinState, closePin, db, logActivity } = usePOS();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  if (!pinState.isOpen) return null;

  const handleVerify = () => {
    setError('');
    if (!pin) {
      setError('Password / PIN wajib diisi');
      return;
    }

    const approver = (db.users || []).find(
      (u) =>
        ['owner', 'manager'].includes(u.role) &&
        u.aktif !== false &&
        verifyPassword(pin, u.password_hash)
    );

    if (!approver) {
      setError('❌ Password/PIN salah atau bukan Manager/Owner');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    logActivity(`Otorisasi berhasil oleh ${approver.nama}`, 'Security');
    if (pinState.onApprove) {
      pinState.onApprove(approver);
    }
    setPin('');
    closePin();
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center modal-backdrop p-4 animate-fade-in">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6 text-center border border-slate-100 dark:border-slate-700 animate-slide-up ${isShaking ? 'animate-shake' : ''}`}>
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-amber-100 dark:bg-amber-950 text-amber-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-lg mb-1 text-slate-800 dark:text-white">🔐 Otorisasi Manajerial</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{pinState.msg || 'Masukkan password Manager / Owner'}</p>

        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleVerify();
          }}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center text-lg tracking-widest mb-3 focus:outline-none focus:border-teal-500 dark:text-white"
          placeholder="••••••••"
        />

        {error && <div className="text-xs text-red-500 mb-3 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => {
              setPin('');
              setError('');
              closePin();
            }}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            Batal
          </button>
          <button
            onClick={handleVerify}
            className="flex-1 py-3 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-sm font-bold shadow-md transition-colors"
          >
            Verifikasi
          </button>
        </div>
      </div>
    </div>
  );
};
