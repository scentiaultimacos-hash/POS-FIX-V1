import React, { useRef, useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  X,
  Database,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Code,
  Key,
  Globe,
  Store,
  Wifi,
  WifiOff,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { today } from '../../utils/constants';
import {
  checkSupabaseConnection,
  uploadStateToSupabase,
  downloadStateFromSupabase,
  SUPABASE_SETUP_SQL,
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
} from '../../services/supabase';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const { db, updateDb, showToast, showConfirm, logActivity, triggerCloudSync, reconnectCloud, cloudSyncStatus, lastCloudSyncTime } = usePOS();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [showSql, setShowSql] = useState<boolean>(false);

  // Form credentials state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [storeId, setStoreId] = useState('store_main');
  const [autoSync, setAutoSync] = useState(true);

  const [connState, setConnState] = useState<{
    tested: boolean;
    connected: boolean;
    status: 'connected_with_table' | 'connected_no_table' | 'disconnected';
    message: string;
  }>({
    tested: false,
    connected: false,
    status: 'disconnected',
    message: 'Memeriksa konfigurasi Supabase...',
  });

  // Load stored credentials on open
  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setSupabaseUrl(cfg.url || '');
      setSupabaseAnonKey(cfg.anonKey || '');
      setStoreId(cfg.storeId || 'store_main');
      setAutoSync(cfg.autoSync ?? true);

      if (cfg.url && cfg.anonKey) {
        testConnection(cfg.url, cfg.anonKey);
      } else {
        setConnState({
          tested: true,
          connected: false,
          status: 'disconnected',
          message: 'Kredensial Supabase belum diisi. Masukkan URL dan Anon Key project Supabase baru Anda di bawah ini.',
        });
      }
    }
  }, [isOpen]);

  const testConnection = async (urlToTest?: string, keyToTest?: string) => {
    const url = (urlToTest || supabaseUrl).trim();
    const key = (keyToTest || supabaseAnonKey).trim();
    if (!url || !key) {
      setConnState({
        tested: true,
        connected: false,
        status: 'disconnected',
        message: 'Harap lengkapi URL Project dan Anon Key Supabase terlebih dahulu.',
      });
      return;
    }

    setIsTesting(true);
    const res = await checkSupabaseConnection(url, key);
    setIsTesting(false);
    setConnState({ tested: true, ...res });
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = supabaseUrl.trim();
    const key = supabaseAnonKey.trim();
    const store = storeId.trim() || 'store_main';

    if (!url || !key) {
      showToast('URL dan Anon Key Supabase wajib diisi', 'error');
      return;
    }

    saveSupabaseConfig({
      url,
      anonKey: key,
      storeId: store,
      autoSync,
    });

    setIsTesting(true);
    const res = await checkSupabaseConnection(url, key);
    setIsTesting(false);
    setConnState({ tested: true, ...res });

    if (res.connected) {
      showToast('✅ Berhasil terhubung ke Supabase!', 'success');
      logActivity('Hubungkan akun Supabase baru', 'Cloud');
      // Re-establish real-time subscription & download latest cloud state
      reconnectCloud();
      triggerCloudSync();
    } else {
      showToast(`Gagal terhubung: ${res.message}`, 'error');
    }
  };

  const handleDisconnect = () => {
    showConfirm('Putuskan Koneksi', 'Apakah Anda ingin menghapus kredensial Supabase dari perangkat ini?', () => {
      clearSupabaseConfig();
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      reconnectCloud();
      setConnState({
        tested: true,
        connected: false,
        status: 'disconnected',
        message: 'Koneksi Supabase telah diputus. POS berjalan dalam mode penyimpanan lokal.',
      });
      showToast('Koneksi Supabase diputus', 'info');
    });
  };

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
      testConnection();
    } else {
      setSyncStatus(`⚠️ ${res.message}`);
      showToast(res.message, 'warning');
      if (res.message.includes('pos_backups')) {
        setShowSql(true);
      }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg mx-auto shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-slide-up my-6">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5 text-[#00C9A7]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                Supabase Online & Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sinkronisasi database realtime multi-perangkat & backup data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'cloud'
                ? 'bg-white dark:bg-slate-800 text-[#00C9A7] shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Supabase Cloud (Realtime)</span>
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'local'
                ? 'bg-white dark:bg-slate-800 text-[#00C9A7] shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>File Backup Lokal (JSON)</span>
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {activeTab === 'cloud' ? (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border transition-all ${
                connState.status === 'connected_with_table'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                  : connState.status === 'connected_no_table'
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {connState.status === 'connected_with_table' ? (
                      <Wifi className="w-4 h-4 text-emerald-600 animate-pulse" />
                    ) : connState.status === 'connected_no_table' ? (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-bold text-xs text-slate-800 dark:text-white">
                      Status Supabase
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    connState.status === 'connected_with_table'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : connState.status === 'connected_no_table'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {connState.status === 'connected_with_table'
                      ? '● Online Realtime'
                      : connState.status === 'connected_no_table'
                      ? '▲ Perlu Tabel SQL'
                      : '○ Belum Terhubung'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {connState.message}
                </p>
                {lastCloudSyncTime && (
                  <div className="text-[10px] text-slate-400 mt-2 font-medium">
                    Sinkronisasi terakhir: {new Date(lastCloudSyncTime).toLocaleTimeString('id-ID')} ({new Date(lastCloudSyncTime).toLocaleDateString('id-ID')})
                  </div>
                )}
              </div>

              {/* Form Input Supabase Credentials */}
              <form onSubmit={handleSaveAndConnect} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#00C9A7]" /> Konfigurasi Project Supabase Baru
                  </h4>
                  {supabaseUrl && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="text-[10px] text-rose-500 font-bold hover:underline"
                    >
                      Reset Kredensial
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Supabase Project URL
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      required
                      placeholder="https://xyzabcdefghijklm.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium focus:border-[#00C9A7] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Supabase Anon Public Key (API Key)
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium focus:border-[#00C9A7] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      ID Partisi Toko (Store ID)
                    </label>
                    <div className="relative">
                      <Store className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={storeId}
                        onChange={(e) => setStoreId(e.target.value)}
                        placeholder="store_main"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono focus:border-[#00C9A7] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer py-2">
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={(e) => setAutoSync(e.target.checked)}
                        className="rounded border-slate-300 text-[#00C9A7] focus:ring-[#00C9A7] w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Auto Sync Realtime
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => testConnection()}
                    disabled={isTesting}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Tes Koneksi</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isTesting}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan & Sambungkan</span>
                  </button>
                </div>
              </form>

              {/* SQL Setup Helper */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" /> Panduan Script SQL Supabase
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSql(!showSql)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    {showSql ? 'Tutup Script' : 'Lihat Script SQL'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Jika Supabase Anda baru, buka menu <b>SQL Editor</b> di dashboard Supabase Anda, lalu jalankan script berikut untuk membuat tabel sync & realtime:
                </p>

                {showSql && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono space-y-2.5">
                    <pre className="whitespace-pre overflow-x-auto max-h-48">{SUPABASE_SETUP_SQL}</pre>
                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-sans font-bold flex items-center gap-1 text-[11px] transition-colors"
                      >
                        <Copy className="w-3 h-3" /> Salin Script SQL
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Instant Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={isSyncing}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Unggah Sekarang</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestoreFromSupabase}
                  disabled={isSyncing}
                  className="py-2.5 px-3 rounded-xl border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tarik dari Cloud</span>
                </button>
              </div>

              {syncStatus && (
                <div className="text-xs text-center font-semibold text-slate-600 dark:text-slate-400">
                  {syncStatus}
                </div>
              )}
            </div>
          ) : (
            /* LOCAL JSON BACKUP TAB */
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900">
                <div className="flex items-center gap-2 mb-1">
                  <Download className="w-4 h-4 text-[#00C9A7]" />
                  <div className="font-bold text-xs text-slate-800 dark:text-white">
                    Unduh Cadangan Lokal (JSON)
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Simpan seluruh data produk, transaksi, pelanggan, karyawan ke file komputer/HP.
                </p>
                <button
                  onClick={handleDownloadBackup}
                  className="w-full py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Backup JSON
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <div className="font-bold text-xs text-slate-800 dark:text-white">
                    Pulihkan Data Lokal (Restore JSON)
                  </div>
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
                  <Upload className="w-4 h-4" /> Upload & Pulihkan Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
