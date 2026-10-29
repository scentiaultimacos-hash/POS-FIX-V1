import React from 'react';
import { usePOS } from '../../context/POSContext';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export const ConfirmModal: React.FC = () => {
  const { confirmState, closeConfirm } = usePOS();

  if (!confirmState.isOpen) return null;

  const typeConfig = {
    danger: {
      bg: 'bg-red-100 text-red-600',
      btn: 'bg-red-500 hover:bg-red-600',
      icon: AlertTriangle,
    },
    warning: {
      bg: 'bg-amber-100 text-amber-600',
      btn: 'bg-amber-500 hover:bg-amber-600',
      icon: AlertCircle,
    },
    info: {
      bg: 'bg-blue-100 text-blue-600',
      btn: 'bg-blue-500 hover:bg-blue-600',
      icon: Info,
    },
    success: {
      bg: 'bg-emerald-100 text-emerald-600',
      btn: 'bg-emerald-500 hover:bg-emerald-600',
      icon: CheckCircle2,
    },
  };

  const currentType = typeConfig[confirmState.type || 'danger'];
  const Icon = currentType.icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center modal-backdrop p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm mx-4 animate-slide-up shadow-2xl p-6 text-center border border-slate-100 dark:border-slate-700">
        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${currentType.bg}`}>
          <Icon className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">{confirmState.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 whitespace-pre-line">{confirmState.msg}</p>
        <div className="flex gap-3">
          <button
            onClick={closeConfirm}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => {
              if (confirmState.onConfirm) {
                confirmState.onConfirm();
              }
              closeConfirm();
            }}
            className={`flex-1 py-3 rounded-xl text-white text-sm font-bold shadow-md transition-colors ${currentType.btn}`}
          >
            Ya, Lanjut
          </button>
        </div>
      </div>
    </div>
  );
};
