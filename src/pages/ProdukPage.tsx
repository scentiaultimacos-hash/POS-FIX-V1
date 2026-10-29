import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, KLASIFIKASI, autoSku, uuid } from '../utils/constants';
import { Produk } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  RefreshCw,
  X,
  Check,
  Upload,
} from 'lucide-react';

export const ProdukPage: React.FC = () => {
  const { db, updateDb, showToast, showConfirm, canAction, logActivity } = usePOS();
  const [search, setSearch] = useState('');
  const [selectedKat, setSelectedKat] = useState('');
  const [selectedKlas, setSelectedKlas] = useState('');

  // Modal form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produk | null>(null);

  // Form fields
  const [nama, setNama] = useState('');
  const [sku, setSku] = useState('');
  const [klasifikasi, setKlasifikasi] = useState<string>('produk_jadi');
  const [kategoriId, setKategoriId] = useState<string>('k1');
  const [hargaJual, setHargaJual] = useState<number>(0);
  const [hargaBeli, setHargaBeli] = useState<number>(0);
  const [stok, setStok] = useState<number>(10);
  const [stokMin, setStokMin] = useState<number>(5);
  const [satuan, setSatuan] = useState<string>('pcs');
  const [foto, setFoto] = useState<string | null>(null);

  // Filter
  const filteredList = useMemo(() => {
    return (db.produk || []).filter((p) => {
      const matchSearch =
        !search ||
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchKat = !selectedKat || p.kategori_id === selectedKat;
      const matchKlas = !selectedKlas || p.klasifikasi === selectedKlas;
      return matchSearch && matchKat && matchKlas;
    });
  }, [db.produk, search, selectedKat, selectedKlas]);

  const openAddModal = () => {
    setEditingProduct(null);
    setNama('');
    setSku(autoSku('', 'produk_jadi'));
    setKlasifikasi('produk_jadi');
    setKategoriId(db.kategori?.[0]?.id || 'k1');
    setHargaJual(25000);
    setHargaBeli(10000);
    setStok(20);
    setStokMin(5);
    setSatuan('pcs');
    setFoto(null);
    setIsFormOpen(true);
  };

  const openEditModal = (p: Produk) => {
    setEditingProduct(p);
    setNama(p.nama);
    setSku(p.sku);
    setKlasifikasi(p.klasifikasi);
    setKategoriId(p.kategori_id);
    setHargaJual(p.harga_jual);
    setHargaBeli(p.harga_beli);
    setStok(p.stok);
    setStokMin(p.stok_min);
    setSatuan(p.satuan);
    setFoto(p.foto);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      showToast('Nama produk wajib diisi', 'error');
      return;
    }

    const cleanSku = sku.trim() || autoSku(nama, klasifikasi);

    if (editingProduct) {
      updateDb((prev) => ({
        ...prev,
        produk: (prev.produk || []).map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                nama: nama.trim(),
                sku: cleanSku,
                klasifikasi,
                kategori_id: kategoriId,
                harga_jual: hargaJual,
                harga_beli: hargaBeli,
                stok,
                stok_min: stokMin,
                satuan,
                foto,
              }
            : p
        ),
      }));
      logActivity(`Edit produk: ${nama}`, 'Produk');
      showToast('✅ Produk berhasil diperbarui', 'success');
    } else {
      const newProd: Produk = {
        id: uuid(),
        nama: nama.trim(),
        sku: cleanSku,
        klasifikasi,
        kategori_id: kategoriId,
        harga_jual: hargaJual,
        harga_beli: hargaBeli,
        stok,
        stok_min: stokMin,
        satuan,
        foto,
        aktif: true,
      };
      updateDb((prev) => ({
        ...prev,
        produk: [newProd, ...(prev.produk || [])],
      }));
      logActivity(`Tambah produk: ${nama}`, 'Produk');
      showToast('✅ Produk baru berhasil ditambahkan', 'success');
    }

    setIsFormOpen(false);
  };

  const handleDelete = (p: Produk) => {
    showConfirm(
      'Hapus Produk',
      `Yakin ingin menghapus produk "${p.nama}" (${p.sku})? Tindakan ini tidak dapat dibatalkan.`,
      () => {
        updateDb((prev) => ({
          ...prev,
          produk: (prev.produk || []).filter((item) => item.id !== p.id),
        }));
        logActivity(`Hapus produk: ${p.nama}`, 'Produk');
        showToast('🗑️ Produk berhasil dihapus', 'info');
      },
      'danger'
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-[#00C9A7]" /> Manajemen Produk & Katalog
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola inventaris parfum, botol, refill, bahan racikan, dan aksesoris
          </p>
        </div>
        <div className="flex gap-2">
          {canAction('produk.tambah') && (
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah Produk
            </button>
          )}
        </div>
      </div>

      {/* Classification chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedKlas('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            !selectedKlas
              ? 'bg-[#00C9A7] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          Semua Klasifikasi
        </button>
        {Object.entries(KLASIFIKASI).map(([key, val]) => {
          const isSelected = selectedKlas === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedKlas(isSelected ? '' : key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                isSelected
                  ? 'bg-[#00C9A7] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{val.icon}</span>
              <span>{val.nama}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama parfum atau SKU..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs outline-none focus:border-[#00C9A7]"
            />
          </div>
          <select
            value={selectedKat}
            onChange={(e) => setSelectedKat(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs outline-none focus:border-[#00C9A7]"
          >
            <option value="">Semua Kategori</option>
            {(db.kategori || []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.icon} {k.nama}
              </option>
            ))}
          </select>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Foto</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4 hidden md:table-cell">Klasifikasi</th>
                <th className="py-3 px-4 text-right">Harga Jual</th>
                <th className="py-3 px-4 text-right">Stok</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada produk ditemukan
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => {
                  const isLow = p.stok <= p.stok_min;
                  const klas = KLASIFIKASI[p.klasifikasi] || { icon: '🌸', nama: 'Produk', warna: 'bg-teal-50 text-teal-800' };

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-2.5 px-4 text-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 mx-auto overflow-hidden flex items-center justify-center text-lg">
                          {p.foto ? (
                            <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" />
                          ) : (
                            <span>{klas.icon}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-white">{p.nama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                      </td>
                      <td className="py-2.5 px-4 hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${klas.warna}`}>
                          {klas.icon} {klas.nama}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="font-bold text-[#00C9A7] text-sm">{fmtRp(p.harga_jual)}</div>
                        <div className="text-[10px] text-slate-400">Modal: {fmtRp(p.harga_beli)}</div>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full ${
                            p.stok <= 0
                              ? 'bg-red-100 text-red-600'
                              : isLow
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {p.stok} {p.satuan}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Min: {p.stok_min}</div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                            title="Edit Produk"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                            title="Hapus Produk"
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

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-up max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                {editingProduct ? '✏️ Edit Data Produk' : '➕ Tambah Produk Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Aqua Fresh 50ml Refill"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      SKU / Barcode
                    </label>
                    <button
                      type="button"
                      onClick={() => setSku(autoSku(nama, klasifikasi))}
                      className="text-[10px] text-[#00C9A7] font-bold hover:underline"
                    >
                      Generate Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 font-mono text-xs outline-none focus:border-[#00C9A7]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Kategori
                  </label>
                  <select
                    value={kategoriId}
                    onChange={(e) => setKategoriId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                  >
                    {(db.kategori || []).map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.icon} {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Klasifikasi
                  </label>
                  <select
                    value={klasifikasi}
                    onChange={(e) => setKlasifikasi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                  >
                    {Object.entries(KLASIFIKASI).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.icon} {v.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    placeholder="pcs / ml / botol"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hargaJual || ''}
                    onChange={(e) => setHargaJual(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs font-bold text-[#00C9A7] outline-none focus:border-[#00C9A7]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Harga Modal / Beli (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={hargaBeli || ''}
                    onChange={(e) => setHargaBeli(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Jumlah Stok Fisik
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
                    Peringatan Minimum Stok
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

              {/* Photo Upload */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Foto Produk
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200">
                    {foto ? <img src={foto} alt="Preview" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-slate-400" />}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-slate-500" />
                    {foto && (
                      <button type="button" onClick={() => setFoto(null)} className="text-[10px] text-red-500 hover:underline block mt-1">
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" /> Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
