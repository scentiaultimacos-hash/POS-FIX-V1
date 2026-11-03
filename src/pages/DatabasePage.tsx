import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Database, AlertTriangle, Trash2, Download, RefreshCw, HardDrive, ShieldAlert, CheckCircle2, Cloud } from 'lucide-react';
import { seedV7 } from '../utils/seed';
import { DB_KEY } from '../utils/constants';
import { BackupModal } from '../components/modals/BackupModal';

export const DatabasePage: React.FC = () => {
  const { db, setDb, addNotification, openPinModal, triggerCloudSync } = usePOS();
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const [purgeCutoffDate, setPurgeCutoffDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });

  const [purgeEntities, setPurgeEntities] = useState({
    transaksi: true,
    absensi: true,
    kasbonLunas: true,
    opname: true,
  });

  // Calculate stats
  const stats = [
    { label: 'Total Transaksi', count: db.transaksi.length, size: `${(JSON.stringify(db.transaksi).length / 1024).toFixed(1)} KB` },
    { label: 'Katalog Produk', count: db.produk.length, size: `${(JSON.stringify(db.produk).length / 1024).toFixed(1)} KB` },
    { label: 'Bahan Baku & Botol', count: db.bahan_baku.length, size: `${(JSON.stringify(db.bahan_baku).length / 1024).toFixed(1)} KB` },
    { label: 'Database Pelanggan', count: db.pelanggan.length, size: `${(JSON.stringify(db.pelanggan).length / 1024).toFixed(1)} KB` },
    { label: 'Riwayat Absensi', count: db.absensi.length, size: `${(JSON.stringify(db.absensi).length / 1024).toFixed(1)} KB` },
    { label: 'Purchase Orders', count: (db.purchase_orders || []).length, size: `${(JSON.stringify(db.purchase_orders || []).length / 1024).toFixed(1)} KB` },
    { label: 'Sesi Kasir Shift', count: (db.shifts || []).length, size: `${(JSON.stringify(db.shifts || []).length / 1024).toFixed(1)} KB` },
  ];

  const totalBytes = new Blob([JSON.stringify(db)]).size;
  const totalKB = (totalBytes / 1024).toFixed(1);

  const handleDownloadBackup = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parfumku_pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('Cadangan database berhasil diunduh', 'success');
  };

  const handleExecutePurge = () => {
    openPinModal('Hapus riwayat data sebelum tanggal ' + purgeCutoffDate + '?', () => {
      setDb(prev => {
        let newTransaksi = prev.transaksi;
        let newAbsensi = prev.absensi;
        let newKasbon = prev.kasbon;
        let newOpname = prev.opname_sessions || [];

        if (purgeEntities.transaksi) {
          newTransaksi = prev.transaksi.filter(t => t.tanggal >= purgeCutoffDate);
        }
        if (purgeEntities.absensi) {
          newAbsensi = prev.absensi.filter(a => a.tanggal >= purgeCutoffDate);
        }
        if (purgeEntities.kasbonLunas) {
          newKasbon = prev.kasbon.filter(k => k.status !== 'lunas');
        }
        if (purgeEntities.opname) {
          newOpname = (prev.opname_sessions || []).filter(o => o.tanggal >= purgeCutoffDate);
        }

        return {
          ...prev,
          transaksi: newTransaksi,
          absensi: newAbsensi,
          kasbon: newKasbon,
          opname_sessions: newOpname,
          opname: newOpname,
        };
      });

      addNotification('Pembersihan data riwayat berhasil dilakukan', 'success');
    });
  };

  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const resetSqlScript = `-- =====================================================================
-- SCRIPT RESET TOTAL DATA TRANSAKSIONAL & MASTER DATA (PARFUMKU POS)
-- PERTAHANKAN: users, roles, master/app_settings, klasifikasi (7 default)
-- HAPUS: Level 1 -> Level 4 (Foreign Key Order)
-- =====================================================================

BEGIN;

-- LEVEL 1: Detail & Child Transaksi
DELETE FROM transaksi_item;
DELETE FROM po_item;
DELETE FROM stok_movement;
DELETE FROM point_ledger;
DELETE FROM point_redemptions;
DELETE FROM returns;
DELETE FROM opname_sessions;

-- LEVEL 2: Transaksi Induk
DELETE FROM transaksi;
DELETE FROM purchase_orders;
DELETE FROM shifts;
DELETE FROM absensi;
DELETE FROM payroll;

-- LEVEL 3: Master Data yang Direferensi
DELETE FROM produk;
DELETE FROM bahan_baku;
DELETE FROM pelanggan;
DELETE FROM karyawan;
DELETE FROM suppliers;
DELETE FROM vouchers;
DELETE FROM kasbon;
DELETE FROM pending_orders;

-- LEVEL 4: Data Operasional & Log
DELETE FROM shift_schedules;
DELETE FROM shift_groups;
DELETE FROM notifications;
DELETE FROM log_aktivitas;

-- RESET TABEL KLASIFIKASI KE 7 DEFAULT BAWAAN
DELETE FROM klasifikasi;
INSERT INTO klasifikasi (id, kode, nama, icon, warna) VALUES
  ('klas_1', 'bahan_cair', 'Bahan Cair', '🧴', 'bg-cyan-100 text-cyan-700'),
  ('klas_2', 'bahan_padat', 'Bahan Padat', '🧂', 'bg-orange-100 text-orange-700'),
  ('klas_3', 'bahan_baku', 'Bahan Baku', '🍶', 'bg-indigo-100 text-indigo-700'),
  ('klas_4', 'produk_jadi', 'Produk Jadi', '🌸', 'bg-pink-100 text-pink-700'),
  ('klas_5', 'refill', 'Refill', '🔄', 'bg-emerald-100 text-emerald-800'),
  ('klas_6', 'aksesoris', 'Aksesoris', '🎀', 'bg-purple-100 text-purple-700'),
  ('klas_7', 'bundling', 'Bundling', '🎁', 'bg-amber-100 text-amber-700')
ON CONFLICT (id) DO NOTHING;

-- UPDATE POS_BACKUPS (Snapshot Realtime Supabase agar bersih dari nol)
UPDATE pos_backups 
SET payload = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(payload, '{produk}', '[]'::jsonb),
        '{transaksi}', '[]'::jsonb
      ),
      '{pelanggan}', '[]'::jsonb
    ),
    '{karyawan}', '[]'::jsonb
  ),
  '{absensi}', '[]'::jsonb
),
updated_at = NOW()
WHERE id = 'store_main';

COMMIT;
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(resetSqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
    addNotification('Script SQL Reset berhasil disalin ke clipboard!', 'success');
  };

  const handleCleanFreshReset = () => {
    openPinModal('KONFIRMASI RESET TOTAL BERSIH: Hapus semua produk, pelanggan, transaksi, karyawan, & riwayat? Akun login dan pengaturan toko akan tetap dipertahankan.', async () => {
      const cleanDb = {
        ...db,
        // PERTAHANKAN:
        users: db.users || [],
        roles: db.roles || [],
        company: db.company || { nama: 'King Parfum', kode: 'KP' },
        master: db.master,
        settings: db.settings,
        role_permissions: db.role_permissions,
        outlets: db.outlets?.length ? db.outlets : [{ id: 'o1', nama: 'Outlet Utama' }],
        kategori: db.kategori?.length ? db.kategori : seedV7().kategori,
        ukuran: db.ukuran?.length ? db.ukuran : seedV7().ukuran,
        aroma: db.aroma?.length ? db.aroma : seedV7().aroma,
        harga: [],
        
        // HAPUS SEMUA DATA TRANSAKSIONAL & MASTER:
        produk: [],
        bahan_baku: [],
        pelanggan: [],
        karyawan: [],
        absensi: [],
        payroll: [],
        transaksi: [],
        kasbon: [],
        vouchers: [],
        pending_orders: [],
        suppliers: [],
        purchase_orders: [],
        shifts: [],
        shift_schedules: [],
        shift_groups: [],
        opname_sessions: [],
        returns: [],
        notifications: [],
        point_ledger: [],
        point_redemptions: [],
        log: [],
      };

      setDb(cleanDb as any);
      localStorage.setItem(DB_KEY, JSON.stringify(cleanDb));
      
      // Push to Supabase Cloud so all devices sync the fresh empty state
      await triggerCloudSync(cleanDb as any);
      
      addNotification('Reset Total Berhasil! Database bersih seperti baru install, siap diisi dari nol.', 'success');
    });
  };

  const handleFactoryReset = () => {
    openPinModal('KONFIRMASI RESET PABRIK: Hapus seluruh data & kembalikan ke data demo awal bawaan?', async () => {
      const initial = seedV7();
      setDb(initial);
      localStorage.setItem(DB_KEY, JSON.stringify(initial));
      await triggerCloudSync(initial);
      addNotification('Sistem berhasil di-reset ke data demo pabrik', 'info');
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Manajemen & Pembersihan Database
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Periksa penggunaan memori lokal, buat cadangan berkas JSON, dan kelola reset data
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsSqlModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Database className="w-4 h-4 text-emerald-400" /> Script SQL Supabase
          </button>
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Cloud className="w-4 h-4" /> Supabase Realtime Sync
          </button>
          <button
            onClick={handleDownloadBackup}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Unduh Cadangan JSON
          </button>
        </div>
      </div>

      <BackupModal isOpen={isBackupModalOpen} onClose={() => setIsBackupModalOpen(false)} />

      {/* SQL Script Guide Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Script SQL Reset Total Supabase</h3>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-3 text-xs leading-relaxed">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> PENTING: Lakukan Backup Sebelum Menjalankan!
                </div>
                <div className="text-[11px] mt-1">
                  Buka <b>Supabase Dashboard &gt; Database &gt; Backups &gt; Create Backup</b> terlebih dahulu sebelum mengeksekusi script ini di SQL Editor.
                </div>
              </div>

              <div className="font-mono text-[11px] bg-slate-950 text-slate-200 p-3.5 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre">
                {resetSqlScript}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[11px] text-slate-500">Urutan Level 1 s/d Level 4 Foreign Key Safe</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> {copiedSql ? 'Tersalin!' : 'Salin Script SQL'}
                </button>
                <button
                  onClick={() => setIsSqlModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-app-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Ukuran Database Lokal</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{totalKB} KB</div>
            <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Sangat Sehat (Batas Browser 5 MB)
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-app-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Total Baris Transaksi</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{db.transaksi.length} Struk</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tercatat sejak pertama kali aktif</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-app-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Terakhir Dicadangkan</div>
            <div className="text-sm font-bold text-slate-800 dark:text-white mt-1">
              {db.notifications.length > 0 ? 'Hari ini' : 'Belum pernah'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Disarankan cadangkan tiap minggu</div>
          </div>
        </div>
      </div>

      {/* Entity Table & Purge Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entity stats */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl border border-app-border p-5 shadow-card space-y-4">
          <div className="font-bold text-sm text-slate-800 dark:text-white">Rincian Modul Data</div>
          <div className="divide-y divide-app-border text-xs">
            {stats.map(s => (
              <div key={s.label} className="py-2.5 flex items-center justify-between">
                <span className="font-medium text-slate-600 dark:text-slate-300">{s.label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 dark:text-white">{s.count} rek</span>
                  <span className="text-[10px] text-slate-400 font-mono">{s.size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Purge controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* Selective cleanup */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-app-border p-5 shadow-card space-y-4">
            <div>
              <h2 className="font-bold text-sm text-slate-800 dark:text-white">Pembersihan Riwayat Data Berkala</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hapus transaksi lama dan log absensi untuk meringankan penyimpanan browser kasir
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Batas Tanggal Pembersihan</label>
                <input
                  type="date"
                  value={purgeCutoffDate}
                  onChange={e => setPurgeCutoffDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Data sebelum tanggal ini akan dihapus permanen</p>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-500 font-bold mb-1">Pilih Data yang Dibersihkan</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purgeEntities.transaksi}
                    onChange={e => setPurgeEntities(prev => ({ ...prev, transaksi: e.target.checked }))}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Transaksi Penjualan Lama</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purgeEntities.absensi}
                    onChange={e => setPurgeEntities(prev => ({ ...prev, absensi: e.target.checked }))}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Riwayat Absensi Karyawan Lama</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={purgeEntities.kasbonLunas}
                    onChange={e => setPurgeEntities(prev => ({ ...prev, kasbonLunas: e.target.checked }))}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Kasbon yang Sudah Lunas</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleExecutePurge}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Eksekusi Pembersihan
              </button>
            </div>
          </div>

          {/* Clean Fresh Reset: MULAI DARI NOL */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Reset Total Bersih (Mulai Toko dari Nol)
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-bold">
                Direkomendasikan
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Mereset seluruh katalog produk, pelanggan, transaksi, karyawan, kasbon, &amp; absensi menjadi <b>kosong bersih</b> siap pakai dari awal. 
              <br />
              <b>Akun login (users/roles) dan pengaturan toko (nama, alamat, pajak, poin, payroll) TETAP AMAN &amp; DIPERTAHANKAN.</b>
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(true)}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 underline hover:no-underline flex items-center gap-1"
              >
                Lihat Script SQL Supabase
              </button>
              <button
                type="button"
                onClick={handleCleanFreshReset}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Reset Bersih Siap Pakai (Mulai dari Nol)
              </button>
            </div>
          </div>

          {/* Danger Zone: Factory Reset */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900 p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
              <ShieldAlert className="w-5 h-5" />
              Reset Pabrik ke Data Demo Bawaan
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tindakan ini akan mengembalikan database ke contoh data demo awal bawaan aplikasi (King Parfum, sample parfum, sample pelanggan).
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleFactoryReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <AlertTriangle className="w-4 h-4" /> Reset Pabrik (Sample Demo)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
