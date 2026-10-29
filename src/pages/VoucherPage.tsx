import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { nowISO, uuid } from '../utils/constants';
import { Voucher } from '../types';
import { Ticket, Plus, Trash2, Power, X } from 'lucide-react';

export const VoucherPage: React.FC = () => {
  const { db, updateDb, showToast, showConfirm, logActivity } = usePOS();
  const list = db.vouchers || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kode, setKode] = useState('');
  const [diskon, setDiskon] = useState(10);
  const [kuota, setKuota] = useState(50);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKode = kode.trim().toUpperCase();
    if (!cleanKode) {
      showToast('Kode voucher wajib diisi', 'error');
      return;
    }

    const dup = list.find((v) => v.kode === cleanKode);
    if (dup) {
      showToast('Kode voucher sudah ada', 'error');
      return;
    }

    const newVoucher: Voucher = {
      id: uuid(),
      kode: cleanKode,
      diskon,
      kuota,
      terpakai: 0,
      expired: null,
      aktif: true,
      created_at: nowISO(),
    };

    updateDb((prev) => ({
      ...prev,
      vouchers: [newVoucher, ...(prev.vouchers || [])],
    }));

    logActivity(`Tambah voucher promo: ${cleanKode}`, 'Voucher');
    showToast(`✅ Voucher ${cleanKode} berhasil dibuat`, 'success');
    setIsModalOpen(false);
  };

  const toggleAktif = (id: string, current: boolean) => {
    updateDb((prev) => ({
      ...prev,
      vouchers: (prev.vouchers || []).map((v) =>
        v.id === id ? { ...v, aktif: !current } : v
      ),
    }));
    showToast(current ? 'Voucher dinonaktifkan' : 'Voucher diaktifkan', 'info');
  };

  const handleDelete = (v: Voucher) => {
    showConfirm('Hapus Voucher', `Hapus kode voucher "${v.kode}"?`, () => {
      updateDb((prev) => ({
        ...prev,
        vouchers: (prev.vouchers || []).filter((item) => item.id !== v.id),
      }));
      showToast('Voucher dihapus', 'info');
    });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-[#00C9A7]" /> Kupon & Voucher Diskon
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola kode promo potongan belanja kasir untuk promosi dan reward pelanggan
          </p>
        </div>
        <button
          onClick={() => {
            setKode('');
            setDiskon(15);
            setKuota(50);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Buat Voucher Baru
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.map((v) => (
          <div
            key={v.id}
            className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
              v.aktif
                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono font-extrabold text-sm px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#00C9A7] tracking-wider">
                  {v.kode}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleAktif(v.id, v.aktif)}
                    className={`p-1.5 rounded-lg ${
                      v.aktif ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={v.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(v)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-2xl font-black text-slate-800 dark:text-white my-2">
                Diskon {v.diskon}%
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Terpakai:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {v.terpakai} / {v.kuota || '∞'} kuota
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-[#00C9A7] rounded-full"
                    style={{ width: `${Math.min(100, Math.round((v.terpakai / (v.kuota || 1)) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-400">
              <span>Status</span>
              <span className={`font-bold ${v.aktif ? 'text-emerald-600' : 'text-slate-400'}`}>
                {v.aktif ? '● Aktif Digunakan' : '● Nonaktif'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Buat Voucher Promo Baru</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Kode Voucher (Kapital) *</label>
                <input
                  type="text"
                  required
                  value={kode}
                  onChange={(e) => setKode(e.target.value.toUpperCase())}
                  placeholder="Misal: GAJIAN20, WANGI10"
                  className="w-full px-3 py-2 rounded-xl border text-xs uppercase font-mono font-bold dark:bg-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Diskon (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={diskon}
                    onChange={(e) => setDiskon(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900 font-bold text-[#00C9A7]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Kuota Penggunaan</label>
                  <input
                    type="number"
                    min="1"
                    value={kuota}
                    onChange={(e) => setKuota(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#00C9A7] text-white text-xs font-bold">
                  Simpan Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
