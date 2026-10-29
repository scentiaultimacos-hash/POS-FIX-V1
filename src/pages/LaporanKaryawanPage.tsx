import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, fmtTgl, today, nowISO } from '../utils/constants';
import { AbsensiRecord, Karyawan, Transaksi } from '../types';
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Image as ImageIcon,
  X,
  Award,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const LaporanKaryawanPage: React.FC = () => {
  const { db, showToast } = usePOS();

  // Date range defaults: first day of current month to today
  const [dari, setDari] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [sampai, setSampai] = useState(today());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'rekap' | 'riwayat'>('rekap');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  const staffList: Karyawan[] = db.karyawan || [];
  const absensiList: AbsensiRecord[] = db.absensi || [];
  const transaksiList: Transaksi[] = db.transaksi || [];

  // Filtered attendance records by date range
  const filteredAbsensi = useMemo(() => {
    return absensiList.filter((a) => {
      if (a.deleted_at) return false;
      const matchDate = a.tanggal >= dari && a.tanggal <= sampai;
      return matchDate;
    });
  }, [absensiList, dari, sampai]);

  // Unique roles
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    staffList.forEach((s) => {
      if (s.jabatan) roles.add(s.jabatan);
      if (s.role) roles.add(s.role);
    });
    return Array.from(roles);
  }, [staffList]);

  // Aggregate stats per employee
  const employeeStats = useMemo(() => {
    return staffList
      .filter((k) => {
        if (!k.aktif && k.aktif !== undefined) return false;
        const matchSearch =
          k.nama.toLowerCase().includes(search.toLowerCase()) ||
          (k.telepon || '').includes(search);
        const matchRole =
          roleFilter === 'all' ||
          k.jabatan.toLowerCase() === roleFilter.toLowerCase() ||
          k.role.toLowerCase() === roleFilter.toLowerCase();
        return matchSearch && matchRole;
      })
      .map((k) => {
        // Attendance logs for this staff
        const myLogs = filteredAbsensi.filter((a) => a.karyawan_id === k.id);

        let hadirCount = 0;
        let telatCount = 0;
        let izinCount = 0;
        let sakitCount = 0;
        let alfaCount = 0;
        let totalJamKerja = 0;
        let totalLemburJam = 0;

        myLogs.forEach((log) => {
          if (log.status === 'hadir') hadirCount++;
          else if (log.status === 'telat') {
            hadirCount++;
            telatCount++;
          } else if (log.status === 'izin') izinCount++;
          else if (log.status === 'sakit') sakitCount++;
          else if (log.status === 'alfa') alfaCount++;

          if (log.lembur_jam) totalLemburJam += log.lembur_jam;

          // Estimate hours worked
          if (log.jam_masuk && log.jam_keluar) {
            const [h1, m1] = log.jam_masuk.split(':').map(Number);
            const [h2, m2] = log.jam_keluar.split(':').map(Number);
            const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
            if (diff > 0) totalJamKerja += diff;
          } else if (log.jam_masuk) {
            totalJamKerja += 8; // default work shift
          }
        });

        // Sales generated if cashier
        const mySales = transaksiList.filter(
          (t) =>
            t.status === 'selesai' &&
            t.tanggal >= dari &&
            t.tanggal <= sampai &&
            (t.kasir_id === k.id ||
              t.kasir_nama.toLowerCase() === k.nama.toLowerCase())
        );

        const totalOmset = mySales.reduce((sum, t) => sum + t.total, 0);
        const totalTransaksi = mySales.length;

        // Estimated commission (default 2% or from db.master.komisi)
        const komisiRate = db.master?.komisi?.rate || 2;
        const estimasiKomisi = (totalOmset * komisiRate) / 100;

        return {
          ...k,
          hadirCount,
          telatCount,
          izinCount,
          sakitCount,
          alfaCount,
          totalJamKerja: Math.round(totalJamKerja * 10) / 10,
          totalLemburJam,
          totalOmset,
          totalTransaksi,
          estimasiKomisi,
          logCount: myLogs.length,
        };
      });
  }, [staffList, filteredAbsensi, transaksiList, dari, sampai, search, roleFilter, db.master]);

  // Overall KPI
  const kpi = useMemo(() => {
    const totalStaff = staffList.length;
    const totalLogs = filteredAbsensi.length;
    const totalHadir = filteredAbsensi.filter(
      (a) => a.status === 'hadir' || a.status === 'telat'
    ).length;
    const totalTelat = filteredAbsensi.filter((a) => a.status === 'telat').length;
    const totalLembur = filteredAbsensi.reduce((s, a) => s + (a.lembur_jam || 0), 0);
    const totalOmsetAll = employeeStats.reduce((s, e) => s + e.totalOmset, 0);

    const attendRate = totalLogs > 0 ? Math.round((totalHadir / totalLogs) * 100) : 100;

    return {
      totalStaff,
      totalHadir,
      totalTelat,
      totalLembur,
      attendRate,
      totalOmsetAll,
    };
  }, [staffList, filteredAbsensi, employeeStats]);

  // Export to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      const storeName = db.master?.toko?.nama || 'PARFUMKU STORE';
      doc.setFontSize(16);
      doc.text(`LAPORAN KINERJA & PRESENSI KARYAWAN`, 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${storeName} | Periode: ${fmtTgl(dari)} s/d ${fmtTgl(sampai)}`, 14, 22);

      const tableData = employeeStats.map((e, idx) => [
        idx + 1,
        e.nama,
        e.jabatan || e.role,
        `${e.hadirCount} hari`,
        `${e.telatCount}x`,
        `${e.izinCount + e.sakitCount + e.alfaCount}`,
        `${e.totalJamKerja} jam`,
        `${e.totalLemburJam} jam`,
        e.totalTransaksi > 0 ? `${e.totalTransaksi} trx` : '-',
        e.totalOmset > 0 ? fmtRp(e.totalOmset) : '-',
        e.estimasiKomisi > 0 ? fmtRp(e.estimasiKomisi) : '-',
      ]);

      autoTable(doc, {
        startY: 28,
        head: [
          [
            '#',
            'Nama Karyawan',
            'Jabatan',
            'Hadir',
            'Telat',
            'Izin/Sakit/Alfa',
            'Jam Kerja',
            'Lembur',
            'Trx Kasir',
            'Total Penjualan',
            'Est. Komisi',
          ],
        ],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 201, 167], textColor: 255 },
        styles: { fontSize: 8 },
      });

      doc.save(`Laporan_Karyawan_${dari}_sd_${sampai}.pdf`);
      showToast('📄 Berhasil mengunduh Laporan Karyawan (PDF)', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mencetak PDF', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Nama Karyawan',
      'Jabatan',
      'Telepon',
      'Hadir (Hari)',
      'Telat (Kali)',
      'Izin',
      'Sakit',
      'Alfa',
      'Total Jam Kerja',
      'Jam Lembur',
      'Total Transaksi Kasir',
      'Total Omzet (Rp)',
      'Estimasi Komisi (Rp)',
    ];

    const rows = employeeStats.map((e) => [
      `"${e.nama}"`,
      `"${e.jabatan || e.role}"`,
      `"${e.telepon || ''}"`,
      e.hadirCount,
      e.telatCount,
      e.izinCount,
      e.sakitCount,
      e.alfaCount,
      e.totalJamKerja,
      e.totalLemburJam,
      e.totalTransaksi,
      e.totalOmset,
      e.estimasiKomisi,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Karyawan_${dari}_sd_${sampai}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📊 File CSV berhasil diunduh', 'success');
  };

  // Quick date ranges
  const setQuickRange = (type: 'today' | 'week' | 'month') => {
    const todayStr = today();
    if (type === 'today') {
      setDari(todayStr);
      setSampai(todayStr);
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDari(d.toISOString().slice(0, 10));
      setSampai(todayStr);
    } else if (type === 'month') {
      const d = new Date();
      setDari(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10));
      setSampai(todayStr);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Laporan Kinerja & Presensi Karyawan
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                Rekap analitik kehadiran, jam kerja, keterlambatan, dan performa omzet kasir
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs md:text-sm flex items-center gap-2 shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            Cetak PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs md:text-sm flex items-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-[var(--primary)]" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Karyawan</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">
            {kpi.totalStaff} <span className="text-xs font-medium text-slate-400">orang</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Terdaftar di sistem</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tingkat Hadir</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {kpi.attendRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{kpi.totalHadir} presensi hadir</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Keterlambatan</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400">
            {kpi.totalTelat} <span className="text-xs font-medium text-slate-400">kali</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Presensi di atas toleransi</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Lembur</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-xl md:text-2xl font-black text-purple-600 dark:text-purple-400">
            {kpi.totalLembur} <span className="text-xs font-medium text-slate-400">jam</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Jam lembur disetujui</div>
        </div>

        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Omzet Kasir</span>
            <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <div className="mt-2 text-base md:text-lg font-black text-[var(--primary)] truncate">
            {fmtRp(kpi.totalOmsetAll)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Omzet penjualan staf</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Date range & Quick buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={dari}
                onChange={(e) => setDari(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
              />
              <span className="text-slate-400">s/d</span>
              <input
                type="date"
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setQuickRange('today')}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Hari Ini
              </button>
              <button
                onClick={() => setQuickRange('week')}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                7 Hari
              </button>
              <button
                onClick={() => setQuickRange('month')}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--primary)] text-white font-medium"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          {/* Search & Role Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama karyawan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">Semua Jabatan</option>
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab('rekap')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'rekap'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            📋 Rekap Kinerja & Kehadiran Per Karyawan
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'riwayat'
                ? 'bg-[var(--primary)] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            🕒 Log Detail Riwayat Presensi ({filteredAbsensi.length})
          </button>
        </div>
      </div>

      {/* TAB 1: REKAP PER KARYAWAN */}
      {activeTab === 'rekap' && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Karyawan</th>
                  <th className="py-3.5 px-4">Jabatan</th>
                  <th className="py-3.5 px-4 text-center">Hadir</th>
                  <th className="py-3.5 px-4 text-center">Telat</th>
                  <th className="py-3.5 px-4 text-center">Izin / Sakit</th>
                  <th className="py-3.5 px-4 text-center">Jam Kerja</th>
                  <th className="py-3.5 px-4 text-center">Lembur</th>
                  <th className="py-3.5 px-4 text-right">Penjualan POS</th>
                  <th className="py-3.5 px-4 text-right">Est. Komisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                {employeeStats.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Tidak ada data karyawan yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  employeeStats.map((k) => (
                    <tr
                      key={k.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs">
                            {k.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {k.nama}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {k.telepon || 'No Telp -'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                          {k.jabatan || k.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {k.hadirCount}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">hari</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {k.telatCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            {k.telatCount}x
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="text-slate-600 dark:text-slate-300">
                          {k.izinCount + k.sakitCount + k.alfaCount > 0 ? (
                            <span>
                              {k.izinCount > 0 && `${k.izinCount} Izin `}
                              {k.sakitCount > 0 && `${k.sakitCount} Sakit `}
                              {k.alfaCount > 0 && `${k.alfaCount} Alfa`}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium">
                        {k.totalJamKerja} jam
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium text-purple-600 dark:text-purple-400">
                        {k.totalLemburJam > 0 ? `${k.totalLemburJam} jam` : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {k.totalOmset > 0 ? (
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {fmtRp(k.totalOmset)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {k.totalTransaksi} transaksi
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-[var(--primary)]">
                        {k.estimasiKomisi > 0 ? fmtRp(k.estimasiKomisi) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT DETAIL PRESENSI */}
      {activeTab === 'riwayat' && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Karyawan</th>
                  <th className="py-3.5 px-4">Jam Masuk</th>
                  <th className="py-3.5 px-4">Jam Keluar</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Lembur</th>
                  <th className="py-3.5 px-4 text-center">Foto Presensi</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                {filteredAbsensi.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada catatan presensi pada rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  filteredAbsensi.map((a) => {
                    const emp = staffList.find((s) => s.id === a.karyawan_id);
                    const empName = emp ? emp.nama : a.karyawan_id;

                    const statusBadge = {
                      hadir: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                      telat: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                      izin: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                      sakit: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
                      alfa: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
                      off: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                      cuti: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
                    }[a.status] || 'bg-slate-100 text-slate-700';

                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {fmtTgl(a.tanggal)}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {empName}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {a.jam_masuk || '-'}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {a.jam_keluar || '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${statusBadge}`}
                          >
                            {a.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-medium">
                          {a.lembur_jam ? `${a.lembur_jam} jam` : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {a.foto_masuk && (
                              <button
                                onClick={() =>
                                  setPreviewPhoto({
                                    url: a.foto_masuk!,
                                    title: `Foto Masuk - ${empName} (${a.jam_masuk || ''})`,
                                  })
                                }
                                className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform"
                                title="Lihat Foto Masuk"
                              >
                                <img
                                  src={a.foto_masuk}
                                  alt="Masuk"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            )}
                            {a.foto_keluar && (
                              <button
                                onClick={() =>
                                  setPreviewPhoto({
                                    url: a.foto_keluar!,
                                    title: `Foto Keluar - ${empName} (${a.jam_keluar || ''})`,
                                  })
                                }
                                className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform"
                                title="Lihat Foto Keluar"
                              >
                                <img
                                  src={a.foto_keluar}
                                  alt="Keluar"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            )}
                            {!a.foto_masuk && !a.foto_keluar && (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {a.keterangan || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {previewPhoto.title}
              </h3>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <img
                src={previewPhoto.url}
                alt="Presensi Preview"
                className="max-h-80 w-auto rounded-xl object-contain shadow-md"
              />
            </div>
            <div className="p-3 text-center bg-slate-50 dark:bg-slate-800/80">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
