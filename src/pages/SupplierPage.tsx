import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, today, nowISO, uuid } from '../utils/constants';
import { Supplier, PurchaseOrder, PurchaseOrderItem } from '../types';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  FileCheck,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';

export const SupplierPage: React.FC = () => {
  const { db, updateDb, showToast, showConfirm, logActivity } = usePOS();
  const [activeTab, setActiveTab] = useState<'supplier' | 'po'>('po');

  // Supplier modal
  const [isSupModalOpen, setIsSupModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [supNama, setSupNama] = useState('');
  const [supTelp, setSupTelp] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAlamat, setSupAlamat] = useState('');

  // PO modal
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poSupplier, setPoSupplier] = useState('');
  const [poSelectedProdId, setPoSelectedProdId] = useState('');
  const [poQty, setPoQty] = useState(10);
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);

  const suppliers = db.suppliers || [];
  const poList = db.purchase_orders || [];

  // Save Supplier
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supNama.trim()) {
      showToast('Nama supplier wajib diisi', 'error');
      return;
    }

    if (editingSup) {
      updateDb((prev) => ({
        ...prev,
        suppliers: (prev.suppliers || []).map((s) =>
          s.id === editingSup.id
            ? { ...s, nama: supNama.trim(), telepon: supTelp, email: supEmail, alamat: supAlamat }
            : s
        ),
      }));
      showToast('✅ Supplier berhasil diperbarui', 'success');
    } else {
      const newS: Supplier = {
        id: uuid(),
        nama: supNama.trim(),
        telepon: supTelp,
        email: supEmail,
        alamat: supAlamat,
      };
      updateDb((prev) => ({
        ...prev,
        suppliers: [newS, ...(prev.suppliers || [])],
      }));
      showToast('✅ Supplier baru ditambahkan', 'success');
    }
    setIsSupModalOpen(false);
  };

  // Add Item to PO
  const handleAddPoItem = () => {
    const prod = (db.produk || []).find((p) => p.id === poSelectedProdId);
    if (!prod) return;
    setPoItems((prev) => [
      ...prev,
      {
        produk_id: prod.id,
        nama: prod.nama,
        qty: poQty,
        harga: prod.harga_beli,
        subtotal: poQty * prod.harga_beli,
      },
    ]);
  };

  // Save PO
  const handleSavePo = (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      showToast('Pilih minimal 1 item produk', 'error');
      return;
    }

    const total = poItems.reduce((s, i) => s + i.subtotal, 0);
    const newPO: PurchaseOrder = {
      id: uuid(),
      nomor: 'PO-' + Math.floor(1000 + Math.random() * 9000),
      supplier: poSupplier || suppliers[0]?.nama || 'Supplier Umum',
      tgl: today(),
      items: poItems,
      total,
      status: 'draft',
      created_at: nowISO(),
    };

    updateDb((prev) => ({
      ...prev,
      purchase_orders: [newPO, ...(prev.purchase_orders || [])],
    }));

    logActivity(`Buat Purchase Order ${newPO.nomor}`, 'PO');
    showToast(`✅ Purchase Order ${newPO.nomor} dibuat`, 'success');
    setIsPoModalOpen(false);
    setPoItems([]);
  };

  // Receive PO (auto increment stock)
  const handleReceivePO = (po: PurchaseOrder) => {
    showConfirm(
      'Terima Barang PO',
      `Konfirmasi penerimaan barang untuk ${po.nomor}? Stok produk akan otomatis bertambah sesuai item pada PO ini.`,
      () => {
        updateDb((prev) => {
          // Increment product stocks
          const updatedProduk = (prev.produk || []).map((p) => {
            const matchItem = po.items.find((i) => i.produk_id === p.id);
            if (matchItem) {
              return { ...p, stok: p.stok + matchItem.qty };
            }
            return p;
          });

          // Mark PO as diterima
          const updatedPOs = (prev.purchase_orders || []).map((item) =>
            item.id === po.id ? { ...item, status: 'diterima' as const } : item
          );

          return {
            ...prev,
            produk: updatedProduk,
            purchase_orders: updatedPOs,
          };
        });

        logActivity(`Terima PO ${po.nomor}. Stok bertambah.`, 'PO');
        showToast(`✅ Barang PO ${po.nomor} diterima. Stok telah ditambahkan ke sistem.`, 'success');
      },
      'info'
    );
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#00C9A7]" /> Supplier & Purchase Order (PO)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pemesanan barang ke distributor dan otomatisasi penambahan stok saat barang masuk
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'supplier' ? (
            <button
              onClick={() => {
                setEditingSup(null);
                setSupNama('');
                setSupTelp('');
                setSupEmail('');
                setSupAlamat('');
                setIsSupModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Supplier
            </button>
          ) : (
            <button
              onClick={() => {
                setPoSupplier(suppliers[0]?.nama || '');
                setPoItems([]);
                setIsPoModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Buat Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('po')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors relative ${
            activeTab === 'po'
              ? 'text-[#00C9A7] border-b-2 border-[#00C9A7]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📋 Daftar Purchase Orders (PO)
        </button>
        <button
          onClick={() => setActiveTab('supplier')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors relative ${
            activeTab === 'supplier'
              ? 'text-[#00C9A7] border-b-2 border-[#00C9A7]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          🚚 Direktori Supplier ({suppliers.length})
        </button>
      </div>

      {/* Tab 1: PO List */}
      {activeTab === 'po' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Nomor PO</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Item Produk</th>
                  <th className="py-3 px-4 text-right">Total Nilai</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {poList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Belum ada Purchase Order
                    </td>
                  </tr>
                ) : (
                  poList.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-white">
                        {po.nomor}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{po.tgl}</td>
                      <td className="py-3 px-4 font-semibold">{po.supplier}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {(po.items || []).map((i) => `${i.qty}x ${i.nama}`).join(', ')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#00C9A7]">
                        {fmtRp(po.total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            po.status === 'diterima'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {po.status === 'diterima' ? '✅ Diterima' : '⏳ Menunggu'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {po.status === 'draft' && (
                          <button
                            onClick={() => handleReceivePO(po)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] shadow-2xs"
                          >
                            Terima Barang
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Tab 2: Supplier List
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">{s.nama}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingSup(s);
                        setSupNama(s.nama);
                        setSupTelp(s.telepon);
                        setSupEmail(s.email);
                        setSupAlamat(s.alamat);
                        setIsSupModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <div>📞 {s.telepon || '-'}</div>
                  <div>✉️ {s.email || '-'}</div>
                  <div>📍 {s.alamat || '-'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Supplier */}
      {isSupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">
              {editingSup ? 'Edit Supplier' : 'Tambah Supplier Baru'}
            </h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Nama Perusahaan / Supplier *</label>
                <input
                  type="text"
                  required
                  value={supNama}
                  onChange={(e) => setSupNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Telepon</label>
                <input
                  type="tel"
                  value={supTelp}
                  onChange={(e) => setSupTelp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Email</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Alamat</label>
                <textarea
                  value={supAlamat}
                  onChange={(e) => setSupAlamat(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#00C9A7] text-white text-xs font-bold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Create PO */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up max-h-[85vh] flex flex-col">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">
              Buat Purchase Order (PO)
            </h3>
            <form onSubmit={handleSavePo} className="space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-semibold block mb-1">Pilih Supplier</label>
                <select
                  value={poSupplier}
                  onChange={(e) => setPoSupplier(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.nama}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add item picker */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tambah Produk yang Dipesan
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={poSelectedProdId}
                    onChange={(e) => setPoSelectedProdId(e.target.value)}
                    className="col-span-2 px-2 py-1.5 rounded-lg border text-xs dark:bg-slate-800"
                  >
                    <option value="">-- Pilih Produk --</option>
                    {(db.produk || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({fmtRp(p.harga_beli)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={poQty}
                    onChange={(e) => setPoQty(Number(e.target.value) || 1)}
                    className="px-2 py-1.5 rounded-lg border text-xs dark:bg-slate-800 text-center"
                    placeholder="Qty"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPoItem}
                  className="w-full py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-[#00C9A7] font-bold text-xs"
                >
                  + Tambahkan ke PO
                </button>
              </div>

              {/* Items in PO */}
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {poItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span>{item.qty}x {item.nama}</span>
                    <span className="font-bold">{fmtRp(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#00C9A7] text-white text-xs font-bold"
                >
                  Simpan PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
