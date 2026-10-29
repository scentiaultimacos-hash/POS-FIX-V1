import React from 'react';
import { usePOS } from '../../context/POSContext';
import { Bell, X, CheckCheck, AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { db, markNotificationsRead } = usePOS();
  const list = db.notifications || [];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-3 md:pr-6 modal-backdrop animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-down flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#00C9A7]" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Pemberitahuan & Notifikasi</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {list.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Tidak ada notifikasi</div>
          ) : (
            list.map((n) => {
              const Icon =
                n.type === 'warning'
                  ? AlertTriangle
                  : n.type === 'success'
                  ? CheckCircle2
                  : n.type === 'error'
                  ? AlertCircle
                  : Info;
              const colorClass =
                n.type === 'warning'
                  ? 'text-amber-500'
                  : n.type === 'success'
                  ? 'text-emerald-500'
                  : n.type === 'error'
                  ? 'text-red-500'
                  : 'text-blue-500';

              return (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                    n.read
                      ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-75'
                      : 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${colorClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-slate-800 dark:text-white">{n.title}</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{n.msg}</div>
                    <div className="text-[9px] text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {list.length > 0 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-700 text-center bg-slate-50 dark:bg-slate-800/80">
            <button
              onClick={markNotificationsRead}
              className="text-xs text-[#00C9A7] font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Tandai semua sudah dibaca
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
