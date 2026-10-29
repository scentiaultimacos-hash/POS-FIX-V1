import React from 'react';
import { usePOS } from '../../context/POSContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = usePOS();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-3 left-3 md:left-auto md:right-5 md:w-auto z-[100] space-y-2 pointer-events-none">
      {toasts.map((t) => {
        const bgClass =
          t.type === 'success'
            ? 'bg-[#00C9A7]'
            : t.type === 'error'
            ? 'bg-red-500'
            : t.type === 'warning'
            ? 'bg-amber-500'
            : 'bg-blue-500';

        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
            ? AlertCircle
            : t.type === 'warning'
            ? AlertTriangle
            : Info;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-slide-down flex items-center gap-2.5 ${bgClass}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 whitespace-pre-line">{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
};
