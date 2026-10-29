import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, uuid } from '../utils/constants';
import { BahanBaku } from '../types';
import { Warehouse, Plus, Edit2, Trash2, X, Check, AlertTriangle } from 'lucide-react';

export const InventoriPage: React.FC = () => {
  const { db, updateDb, showToast, showConfirm, logActivity } = usePOS();
  const list = db.bahan_baku || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBahan, setEditingBahan] = useState<BahanBaku | null>(null);

  const [nama, setNama] = useState('');
  const [satuan, setSatuan] = useState('ml');
  const [stok, setStok] = useState(500);
  const [stokMin, setStokMin] = useState(50);
  const [hargaBeli, setHargaBeli] = useState(500);

  const openAdd = () => {
    setEditingBahan(null);
    setNama('');
    setSatuan('ml');
    setStok(100);
    setStokMin(20);
    setHargaBeli(1000);
    setIsModalOpen(true);
  };

  const openEdit = (b: BahanBaku) => {
    setEditingBahan(b);
    setNama(b.nama);
    setSatuan(b.satuan);
    setStok(b.stok);
    setStokMin(b.stok_min);
    setHargaBeli(b.harga_beli);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      showToast('Nama bahan wajib diisi', 'error');
      return;
    }

    if (editingBahan) {
      updateDb((prev) => ({
        ...prev,
        bahan_baku: (prev.bahan_baku || []).map((b) =>
          b.id === editingBahan.id
            ? { ...b, nama: nama.trim(), satuan, stok, stok_min: stokMin, harga_beli: hargaBeli }
            : b
        ),
      }));
      logActivity(`Edit bahan baku: ${nama}`, 'Inventori');
      showToast('✅ Bahan baku diperbarui', 'success');
    } else {
      const newBahan: BahanBaku = {
        id: uuid(),
        nama: nama.trim(),
        satuan,
        stok,
        stok_min: stokMin,
        harga_beli: hargaBeli,
        klasifikasi: 'bahan_cair',
      };
      updateDb((prev) => ({
        ...prev,
        bahan_baku: [newBahan, ...(prev.bahan_baku || [])],
      }));
      logActivity(`Tambah bahan baku: ${nama}`, 'Inventori');
      showToast('✅ Bahan baku ditambahkan', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (b: BahanBaku) => {
    showConfirm(
      'Hapus Bahan Baku',
      `Hapus bahan baku "${b.nama}" dari inventori?`,
      () => {
        updateDb((prev) => ({
          ...prev,
          bahan_baku: (prev.bahan_baku || []).filter((item) => item.id !== b.id),
        }));
        showToast('Bahan baku dihapus', 'info');
      },
      'danger'
    );
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-[#00C9A7]" /> Inventori Bahan Racikan & Baku
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar stok bibit parfum, alkohol racikan, botol kosong, sprayer, dan kemasan
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Bahan Baku
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Bahan</th>
                <th className="py-3 px-4 hidden md:table-cell">Satuan</th>
                <th className="py-3 px-4 text-right">Harga Modal</th>
                <th className="py-3 px-4 text-right">Sisa Stok</th>
                <th className="py-3 px-4 text-right hidden md:table-cell">Stok Min</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Belum ada data bahan baku
                  </td>
                </tr>
              ) : (
                list.map((b) => {
                  const isLow = b.stok <= b.stok_min;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                        {b.nama}
                      </td>
                      <td className="py-3 px-4 text-slate-500 hidden md:table-cell font-mono">
                        {b.satuan}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {fmtRp(b.harga_beli)} <span className="text-[10px] text-slate-400">/{b.satuan}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full ${
                            isLow ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {b.stok} {b.satuan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 hidden md:table-cell">
                        {b.stok_min} {b.satuan}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(b)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(b)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Bahan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-up">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                {editingBahan ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Bahan Baku *
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Alkohol Denat 96%"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    placeholder="ml / gram / pcs"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Harga Beli / Satuan
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={hargaBeli}
                    onChange={(e) => setHargaBeli(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Stok Tersedia
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stok}
                    onChange={(e) => setStok(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Batas Minimum
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stokMin}
                    onChange={(e) => setStokMin(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#00C9A7] text-white text-xs font-bold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
