import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, uuid, nowISO } from '../utils/constants';
import { Karyawan, PayrollRecord } from '../types';
import { Banknote, Eye, FileText, Send, Settings, CheckCircle2, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PayrollPage: React.FC = () => {
  const { db, updateDb, showToast, showConfirm, logActivity } = usePOS();
  const [periode, setPeriode] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [previewEmployeeId, setPreviewEmployeeId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const staff = db.karyawan || [];
  const payrolls = db.payroll || [];
  const absensi = db.absensi || [];
  const ps = db.master?.payroll_settings || {
    hari_kerja_per_bulan: 22,
    jam_kerja_normal: 8,
    rate_lembur_per_jam: 25000,
    uang_makan_per_hari: 20000,
    uang_transport_per_hari: 15000,
  };

  // Helper: compute attendance summary in selected period
  const getAttendanceSummary = (karyawanId: string) => {
    const records = absensi.filter(
      (a) => a.karyawan_id === karyawanId && a.tanggal.startsWith(periode) && !a.deleted_at
    );
    const hadir = records.filter((r) => r.status === 'hadir').length;
    const telat = records.filter((r) => r.status === 'telat').length;
    const izin = records.filter((r) => r.status === 'izin' || r.status === 'sakit').length;
    const alfa = records.filter((r) => r.status === 'alfa').length;
    return { hadir, telat, izin, alfa, totalDays: records.length };
  };

  // Helper: compute auto deduction
  const computeAutoDeduction = (karyawanId: string, gajiPokok: number) => {
    const sum = getAttendanceSummary(karyawanId);
    const gajiPerHari = gajiPokok / (ps.hari_kerja_per_bulan || 22);
    // 100% deduction per alfa day
    return Math.round(sum.alfa * gajiPerHari);
  };

  const updatePayrollField = (
    karyawanId: string,
    field: keyof PayrollRecord,
    val: number
  ) => {
    const k = staff.find((s) => s.id === karyawanId);
    if (!k) return;

    updateDb((prev) => {
      const list = prev.payroll || [];
      const existing = list.find((p) => p.karyawan_id === karyawanId && p.periode === periode);
      if (existing) {
        return {
          ...prev,
          payroll: list.map((p) =>
            p.id === existing.id ? { ...p, [field]: val } : p
          ),
        };
      } else {
        const newP: PayrollRecord = {
          id: uuid(),
          karyawan_id: karyawanId,
          karyawan_nama: k.nama,
          periode,
          gaji_pokok: k.gaji_pokok || 0,
          tunjangan: k.tunjangan || 0,
          bonus: 0,
          potongan_manual: 0,
          status: 'draft',
          created_at: nowISO(),
          [field]: val,
        };
        return {
          ...prev,
          payroll: [newP, ...list],
        };
      }
    });
  };

  // Send WhatsApp slip
  const sendSlipWA = (k: Karyawan) => {
    if (!k.telepon) {
      showToast('Karyawan belum memiliki nomor telepon WhatsApp', 'error');
      return;
    }
    const p = payrolls.find((x) => x.karyawan_id === k.id && x.periode === periode);
    const gp = p ? p.gaji_pokok : k.gaji_pokok;
    const tj = p ? p.tunjangan : k.tunjangan;
    const bn = p?.bonus || 0;
    const autoDeduct = computeAutoDeduction(k.id, gp);
    const manualDeduct = p?.potongan_manual || 0;
    const totalBersih = gp + tj + bn - autoDeduct - manualDeduct;
    const sum = getAttendanceSummary(k.id);

    const toko = db.master?.toko?.nama || 'King Parfum';
    const msg = `Halo *${k.nama}*,\n\nBerikut rincian *SLIP GAJI (${periode})* dari ${toko}:\n\n• Gaji Pokok: ${fmtRp(gp)}\n• Tunjangan: ${fmtRp(tj)}\n${bn > 0 ? `• Bonus: +${fmtRp(bn)}\n` : ''}• Rekap Kehadiran: ${sum.hadir} Hadir, ${sum.telat} Telat, ${sum.alfa} Alfa\n${autoDeduct > 0 ? `• Potongan Kehadiran: -${fmtRp(autoDeduct)}\n` : ''}${manualDeduct > 0 ? `• Potongan Lain: -${fmtRp(manualDeduct)}\n` : ''}\n*TOTAL GAJI BERSIH: ${fmtRp(totalBersih)}*\n\nTerima kasih atas dedikasinya!\n${toko}`;

    const clean = k.telepon.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Export PDF Slip
  const exportSlipPDF = (k: Karyawan) => {
    const doc = new jsPDF();
    const p = payrolls.find((x) => x.karyawan_id === k.id && x.periode === periode);
    const gp = p ? p.gaji_pokok : k.gaji_pokok;
    const tj = p ? p.tunjangan : k.tunjangan;
    const bn = p?.bonus || 0;
    const autoDeduct = computeAutoDeduction(k.id, gp);
    const manualDeduct = p?.potongan_manual || 0;
    const totalBersih = gp + tj + bn - autoDeduct - manualDeduct;
    const sum = getAttendanceSummary(k.id);

    doc.setFontSize(16);
    doc.text(db.master?.toko?.nama || 'King Parfum', 14, 15);
    doc.setFontSize(10);
    doc.text(`SLIP GAJI KARYAWAN - Periode: ${periode}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      body: [
        ['Nama Karyawan', k.nama],
        ['Jabatan', k.jabatan],
        ['Kehadiran', `${sum.hadir} Hadir, ${sum.telat} Telat, ${sum.alfa} Alfa`],
        ['Gaji Pokok', fmtRp(gp)],
        ['Tunjangan', fmtRp(tj)],
        ['Bonus Tambahan', fmtRp(bn)],
        ['Potongan Absensi', `-${fmtRp(autoDeduct)}`],
        ['Potongan Lainnya', `-${fmtRp(manualDeduct)}`],
        ['GAJI BERSIH (TAKE HOME PAY)', fmtRp(totalBersih)],
      ],
    });

    doc.save(`SlipGaji_${k.nama}_${periode}.pdf`);
    showToast(`📄 Slip gaji ${k.nama} diunduh`, 'success');
  };

  const previewEmp = staff.find((s) => s.id === previewEmployeeId);

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Banknote className="w-6 h-6 text-[#00C9A7]" /> Penggajian & Payroll Karyawan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Otomatisasi kalkulasi gaji bersih berdasarkan absensi, tunjangan, dan slip WhatsApp
          </p>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Settings className="w-4 h-4" /> Pengaturan Payroll
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-xs border border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-2.5 items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Periode Gaji:</label>
          <input
            type="month"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs font-bold text-[#00C9A7]"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              staff.forEach((k) => exportSlipPDF(k));
              showToast('Mengekspor slip gaji semua karyawan...', 'success');
            }}
            className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5" /> PDF Semua
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-2 text-center">Hadir</th>
                <th className="py-3 px-2 text-center">Telat</th>
                <th className="py-3 px-2 text-center">Alfa</th>
                <th className="py-3 px-3 text-right">Gaji Pokok</th>
                <th className="py-3 px-3 text-right">Tunjangan</th>
                <th className="py-3 px-3 text-right">Potongan</th>
                <th className="py-3 px-4 text-right">Gaji Bersih</th>
                <th className="py-3 px-4 text-center">Aksi Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staff.map((k) => {
                const p = payrolls.find((x) => x.karyawan_id === k.id && x.periode === periode);
                const gp = p ? p.gaji_pokok : k.gaji_pokok;
                const tj = p ? p.tunjangan : k.tunjangan;
                const bn = p?.bonus || 0;
                const autoDeduct = computeAutoDeduction(k.id, gp);
                const manualDeduct = p?.potongan_manual || 0;
                const totalPot = autoDeduct + manualDeduct;
                const totalBersih = gp + tj + bn - totalPot;
                const sum = getAttendanceSummary(k.id);

                return (
                  <tr key={k.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                      {k.nama}
                      <div className="text-[10px] text-slate-400 font-normal">{k.jabatan}</div>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-emerald-600">{sum.hadir}</td>
                    <td className="py-3 px-2 text-center font-bold text-amber-600">{sum.telat}</td>
                    <td className="py-3 px-2 text-center font-bold text-red-600">{sum.alfa}</td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        value={gp}
                        onChange={(e) =>
                          updatePayrollField(k.id, 'gaji_pokok', Number(e.target.value) || 0)
                        }
                        className="w-24 px-2 py-1 text-right text-xs border rounded-lg dark:bg-slate-900"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        value={tj}
                        onChange={(e) =>
                          updatePayrollField(k.id, 'tunjangan', Number(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1 text-right text-xs border rounded-lg dark:bg-slate-900"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-red-500">-{fmtRp(totalPot)}</div>
                      <div className="text-[9px] text-slate-400">auto: {fmtRp(autoDeduct)}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#00C9A7] text-sm">
                      {fmtRp(totalBersih)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPreviewEmployeeId(k.id)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                          title="Lihat Preview Slip"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => exportSlipPDF(k)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          title="Unduh PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => sendSlipWA(k)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                          title="Kirim ke WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Preview Modal */}
      {previewEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">👁️ Preview Slip Gaji</h3>
              <button onClick={() => setPreviewEmployeeId(null)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-center mb-4">
              <div className="text-[10px] text-slate-500 uppercase font-bold">{db.master?.toko?.nama}</div>
              <div className="text-base font-extrabold text-[#00C9A7]">SLIP GAJI KARYAWAN</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{previewEmp.nama} ({previewEmp.jabatan})</div>
            </div>

            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Gaji Pokok:</span>
                <span className="font-semibold">{fmtRp(previewEmp.gaji_pokok)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tunjangan:</span>
                <span className="font-semibold">{fmtRp(previewEmp.tunjangan)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Potongan Absensi:</span>
                <span>-{fmtRp(computeAutoDeduction(previewEmp.id, previewEmp.gaji_pokok))}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm pt-2 border-t border-slate-100 dark:border-slate-700">
                <span>Gaji Bersih:</span>
                <span className="text-[#00C9A7]">
                  {fmtRp(
                    previewEmp.gaji_pokok +
                      previewEmp.tunjangan -
                      computeAutoDeduction(previewEmp.id, previewEmp.gaji_pokok)
                  )}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => exportSlipPDF(previewEmp)}
                className="flex-1 py-2 rounded-xl border text-xs font-bold"
              >
                Cetak PDF
              </button>
              <button
                onClick={() => sendSlipWA(previewEmp)}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Send className="w-3.5 h-3.5" /> Kirim WA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">⚙️ Pengaturan Payroll</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Hari Kerja Normal per Bulan</label>
                <input
                  type="number"
                  value={ps.hari_kerja_per_bulan}
                  onChange={(e) =>
                    updateDb((prev) => ({
                      ...prev,
                      master: {
                        ...prev.master,
                        payroll_settings: {
                          ...prev.master.payroll_settings,
                          hari_kerja_per_bulan: Number(e.target.value) || 22,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Rate Lembur per Jam (Rp)</label>
                <input
                  type="number"
                  value={ps.rate_lembur_per_jam}
                  onChange={(e) =>
                    updateDb((prev) => ({
                      ...prev,
                      master: {
                        ...prev.master,
                        payroll_settings: {
                          ...prev.master.payroll_settings,
                          rate_lembur_per_jam: Number(e.target.value) || 0,
                        },
                      },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border dark:bg-slate-900"
                />
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#00C9A7] text-white font-bold mt-2"
              >
                Tutup Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
