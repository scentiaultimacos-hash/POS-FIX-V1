import React, { useRef, useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { X, Database, Download, Upload, Cloud, RefreshCw, CheckCircle2, AlertCircle, Copy, Code } from 'lucide-react';
import { today } from '../../utils/constants';
import {
  checkSupabaseConnection,
  uploadStateToSupabase,
  downloadStateFromSupabase,
  SUPABASE_SETUP_SQL,
} from '../../services/supabase';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const { db, updateDb, showToast, showConfirm, logActivity } = usePOS();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [connState, setConnState] = useState<{
    tested: boolean;
    connected: boolean;
    status: 'connected_with_table' | 'connected_no_table' | 'disconnected';
    message: string;
  }>({
    tested: false,
    connected: false,
    status: 'disconnected',
    message: 'Memeriksa status Supabase...',
  });
  const [showSql, setShowSql] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      checkSupabaseConnection().then((res) => {
        setConnState({ tested: true, ...res });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    try {
      const json = JSON.stringify(db, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parfumku_pos_backup_${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      logActivity('Unduh file backup database lokal JSON', 'System');
      showToast('✅ Berhasil mengunduh backup JSON', 'success');
    } catch {
      showToast('Gagal mengunduh backup', 'error');
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          showToast('Format file JSON tidak valid', 'error');
          return;
        }

        showConfirm(
          'Restore Database',
          'Data lokal saat ini akan DITIMPA dengan isi file backup ini. Lanjutkan restore?',
          () => {
            updateDb(() => parsed);
            showToast('✅ Database berhasil dipulihkan', 'success');
            onClose();
          },
          'danger'
        );
      } catch {
        showToast('Gagal membaca file JSON backup', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus('Mengunggah database ke Supabase cloud...');
    const res = await uploadStateToSupabase(db);
    setIsSyncing(false);
    if (res.success) {
      setSyncStatus('✅ Sinkronisasi berhasil');
      showToast(res.message, 'success');
      logActivity('Sinkronisasi database ke Supabase cloud', 'Cloud');
    } else {
      setSyncStatus(`⚠️ ${res.message}`);
      showToast(res.message, 'warning');
    }
  };

  const handleRestoreFromSupabase = async () => {
    showConfirm(
      'Restore dari Supabase Cloud',
      'Data lokal saat ini akan DITIMPA dengan data cadangan terbaru dari cloud Supabase. Lanjutkan?',
      async () => {
        setIsSyncing(true);
        const res = await downloadStateFromSupabase();
        setIsSyncing(false);
        if (res.success && res.data) {
          updateDb(() => res.data!);
          showToast('✅ Berhasil memulihkan data dari Supabase', 'success');
          onClose();
        } else {
          showToast(res.message, 'error');
        }
      },
      'warning'
    );
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    showToast('Script SQL berhasil disalin ke clipboard!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-up my-8">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Backup & Sinkronisasi Cloud</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Kelola cadangan lokal dan Supabase</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Supabase status block */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                <div className="font-semibold text-xs text-blue-900 dark:text-blue-300">Status Koneksi Supabase</div>
              </div>
              {connState.tested && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    connState.status === 'connected_with_table'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : connState.status === 'connected_no_table'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {connState.status === 'connected_with_table' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Siap Sync
                    </>
                  ) : connState.status === 'connected_no_table' ? (
                    <>
                      <AlertCircle className="w-3 h-3 text-amber-600" /> Server Konek (Perlu Tabel)
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-rose-600" /> Terputus
                    </>
                  )}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {connState.message}
            </p>

            {connState.status === 'connected_no_table' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowSql(!showSql)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Code className="w-3.5 h-3.5" /> {showSql ? 'Tutup Script SQL' : 'Lihat Script SQL Supabase'}
                </button>
                {showSql && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto space-y-2">
                    <pre className="whitespace-pre">{SUPABASE_SETUP_SQL}</pre>
                    <button
                      onClick={handleCopySql}
                      className="px-2.5 py-1 rounded bg-blue-600 text-white font-sans font-bold flex items-center gap-1 text-[10px] ml-auto"
                    >
                      <Copy className="w-3 h-3" /> Salin SQL
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSyncToSupabase}
                disabled={isSyncing}
                className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> Sinkronkan Sekarang
              </button>
              <button
                onClick={handleRestoreFromSupabase}
                disabled={isSyncing}
                className="py-2 px-3 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 text-xs font-semibold transition-colors"
                title="Tarik data dari cloud"
              >
                Tarik Cloud
              </button>
            </div>
            {syncStatus && (
              <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1.5 text-center font-medium">
                {syncStatus}
              </div>
            )}
          </div>

          {/* Backup Download */}
          <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900">
            <div className="flex items-center gap-2 mb-1">
              <Download className="w-4 h-4 text-[#00C9A7]" />
              <div className="font-semibold text-xs text-slate-800 dark:text-white">Unduh Cadangan Lokal (JSON)</div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Simpan seluruh database produk, transaksi, pelanggan, karyawan ke file komputer/HP.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Backup JSON
            </button>
          </div>

          {/* Restore Upload */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
            <div className="flex items-center gap-2 mb-1">
              <Upload className="w-4 h-4 text-amber-600" />
              <div className="font-semibold text-xs text-slate-800 dark:text-white">Pulihkan Data Lokal (Restore)</div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Pilih file JSON backup yang pernah Anda unduh sebelumnya untuk dikembalikan.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload & Restore Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
