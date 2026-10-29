import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { X, Clock, Wallet, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { fmtRp, nowISO, today } from '../../utils/constants';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose }) => {
  const { user, activeShift, bukaShift, tutupShift, db } = usePOS();
  const [modalAwal, setModalAwal] = useState<number>(100000);
  const [uangFisik, setUangFisik] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>('');

  if (!isOpen) return null;

  // Calculate stats for active shift
  const shiftTrx = activeShift
    ? (db.transaksi || []).filter(
        (t) =>
          t.kasir_id === user?.id &&
          t.created_at >= activeShift.buka_at &&
          t.status === 'selesai'
      )
    : [];

  const shiftOmset = shiftTrx.reduce((s, t) => s + t.total, 0);
  const cashTrx = shiftTrx.filter((t) => (t.metode || []).some((m) => m.nama === 'Tunai'));
  const cashTotal = cashTrx.reduce((s, t) => {
    const tunai = (t.metode || []).find((m) => m.nama === 'Tunai');
    return s + (tunai?.jumlah || 0);
  }, 0);

  const totalSistem = (activeShift?.modal_awal || 0) + cashTotal;
  const selisih = uangFisik - totalSistem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#00C9A7] flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Manajemen Shift Kasir</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Kasir: {user?.nama || 'Unknown'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!activeShift ? (
            // Open Shift Form
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40 text-center">
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">Status Shift Saat Ini</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-5 h-5" /> Belum Dibuka
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Buka shift kasir terlebih dahulu untuk mulai melayani transaksi pelanggan.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Modal Awal di Laci Kas (Cash Drawer)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Rp</span>
                  <input
                    type="number"
                    value={modalAwal}
                    onChange={(e) => setModalAwal(Number(e.target.value) || 0)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold text-base focus:border-[#00C9A7] outline-none"
                    placeholder="100000"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[50000, 100000, 200000, 500000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => setModalAwal(nominal)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                    >
                      {fmtRp(nominal)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  bukaShift(modalAwal);
                  onClose();
                }}
                className="w-full py-3.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" /> Buka Shift Sekarang
              </button>
            </div>
          ) : (
            // Close Shift & Summary View
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs font-semibold text-teal-800 dark:text-teal-300">Shift Sedang Aktif</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold animate-pulse">
                    LIVE
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Waktu Buka</span>
                    <span className="font-semibold">{new Date(activeShift.buka_at).toLocaleTimeString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Modal Awal</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{fmtRp(activeShift.modal_awal)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Omset Shift</span>
                    <span className="font-bold text-[#00C9A7]">{fmtRp(shiftOmset)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Transaksi</span>
                    <span className="font-semibold">{shiftTrx.length} trx</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Modal Awal Kas</span>
                  <span className="font-medium text-slate-800 dark:text-white">{fmtRp(activeShift.modal_awal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Penerimaan Kas Tunai</span>
                  <span className="font-medium text-slate-800 dark:text-white">+{fmtRp(cashTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-800 dark:text-white font-bold pt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <span>Ekspektasi Uang di Laci</span>
                  <span className="text-[#00C9A7]">{fmtRp(totalSistem)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Uang Fisik Kas Saat Tutup (Hasil Hitung Kasir)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Rp</span>
                  <input
                    type="number"
                    value={uangFisik || ''}
                    onChange={(e) => setUangFisik(Number(e.target.value) || 0)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold text-sm focus:border-[#00C9A7] outline-none"
                    placeholder="Hitung uang di laci..."
                  />
                </div>
                {uangFisik > 0 && (
                  <div
                    className={`mt-1.5 text-xs font-semibold p-2 rounded-lg flex justify-between ${
                      selisih === 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : selisih < 0
                        ? 'bg-red-50 text-red-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    <span>Selisih (Fisik - Sistem):</span>
                    <span>
                      {selisih === 0 ? 'Pas / Cocok (Rp 0)' : selisih < 0 ? `Kurang -${fmtRp(Math.abs(selisih))}` : `Lebih +${fmtRp(selisih)}`}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan Serah Terima / Shift
                </label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs outline-none focus:border-[#00C9A7]"
                  placeholder="Catatan kendala, selisih uang, atau pesan ke kasir shift berikutnya..."
                />
              </div>

              <button
                onClick={() => {
                  tutupShift(uangFisik, catatan);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
              >
                <Wallet className="w-4 h-4" /> Tutup Shift & Rekap Kas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
