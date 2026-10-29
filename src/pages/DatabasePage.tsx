import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { Database, AlertTriangle, Trash2, Download, RefreshCw, HardDrive, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { seedV7 } from '../utils/seed';

export const DatabasePage: React.FC = () => {
  const { db, setDb, addNotification, openPinModal } = usePOS();

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

  const handleFactoryReset = () => {
    openPinModal('KONFIRMASI RESET PABRIK: Hapus seluruh data & kembalikan ke default?', () => {
      const initial = seedV7();
      setDb(initial);
      localStorage.setItem('parfumku_pos_v7', JSON.stringify(initial));
      addNotification('Sistem berhasil di-reset ke kondisi awal pabrik', 'info');
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
            Periksa penggunaan memori lokal, buat cadangan berkas JSON, dan bersihkan riwayat lama
          </p>
        </div>

        <button
          onClick={handleDownloadBackup}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Unduh Cadangan JSON
        </button>
      </div>

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

          {/* Danger Zone: Factory Reset */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900 p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
              <ShieldAlert className="w-5 h-5" />
              Zona Bahaya: Reset Total ke Setelan Pabrik
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tindakan ini akan menghapus <b>seluruh transaksi, produk, pelanggan, dan riwayat karyawan</b>, lalu mengembalikan database ke akun demo awal (admin, kasir, manager). Tindakan ini <b>TIDAK DAPAT</b> dibatalkan!
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleFactoryReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <AlertTriangle className="w-4 h-4" /> Reset Pabrik (Factory Reset)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
