import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, uuid } from '../utils/constants';
import { Pelanggan } from '../types';
import {
  Users,
  Plus,
  Search,
  QrCode,
  Edit2,
  Trash2,
  Printer,
  X,
  Check,
  Award,
} from 'lucide-react';
import QRCode from 'qrcode';

export const PelangganPage: React.FC = () => {
  const { db, updateDb, showToast, showConfirm, logActivity } = usePOS();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCust, setEditingCust] = useState<Pelanggan | null>(null);
  const [qrModalCust, setQrModalCust] = useState<Pelanggan | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Form fields
  const [nama, setNama] = useState('');
  const [telepon, setTelepon] = useState('');
  const [email, setEmail] = useState('');
  const [catatan, setCatatan] = useState('');
  const [tagInput, setTagInput] = useState('');

  const filtered = useMemo(() => {
    return (db.pelanggan || []).filter((c) => {
      const matchSearch =
        !search ||
        c.nama.toLowerCase().includes(search.toLowerCase()) ||
        c.telepon.includes(search);
      const matchTier = !tierFilter || c.tier === tierFilter;
      return matchSearch && matchTier;
    });
  }, [db.pelanggan, search, tierFilter]);

  const openAdd = () => {
    setEditingCust(null);
    setNama('');
    setTelepon('');
    setEmail('');
    setCatatan('');
    setTagInput('VIP, Member');
    setIsFormOpen(true);
  };

  const openEdit = (c: Pelanggan) => {
    setEditingCust(c);
    setNama(c.nama);
    setTelepon(c.telepon);
    setEmail(c.email || '');
    setCatatan(c.catatan || '');
    setTagInput((c.tags || []).join(', '));
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      showToast('Nama pelanggan wajib diisi', 'error');
      return;
    }

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingCust) {
      updateDb((prev) => ({
        ...prev,
        pelanggan: (prev.pelanggan || []).map((c) =>
          c.id === editingCust.id
            ? { ...c, nama: nama.trim(), telepon: telepon.trim(), email, catatan, tags }
            : c
        ),
      }));
      logActivity(`Edit data pelanggan: ${nama}`, 'CRM');
      showToast('✅ Pelanggan diperbarui', 'success');
    } else {
      const newC: Pelanggan = {
        id: uuid(),
        nama: nama.trim(),
        telepon: telepon.trim() || '-',
        email,
        tier: 'bronze',
        poin: 0,
        total_belanja: 0,
        tags,
        avatar: '👤',
        catatan,
      };
      updateDb((prev) => ({
        ...prev,
        pelanggan: [newC, ...(prev.pelanggan || [])],
      }));
      logActivity(`Tambah pelanggan: ${nama}`, 'CRM');
      showToast('✅ Pelanggan berhasil ditambahkan', 'success');
    }

    setIsFormOpen(false);
  };

  const handleDelete = (c: Pelanggan) => {
    showConfirm('Hapus Pelanggan', `Hapus data "${c.nama}"?`, () => {
      updateDb((prev) => ({
        ...prev,
        pelanggan: (prev.pelanggan || []).filter((item) => item.id !== c.id),
      }));
      showToast('Pelanggan dihapus', 'info');
    });
  };

  const openQRModal = (c: Pelanggan) => {
    setQrModalCust(c);
    QRCode.toDataURL(c.telepon || c.id, { width: 240, margin: 2 })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#00C9A7]" /> Pelanggan & Loyalitas Member
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Database member pelanggan, riwayat belanja, saldo poin reward, dan kartu QR
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Pelanggan
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-xs border border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau nomor telepon..."
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
        >
          <option value="">Semua Tier</option>
          <option value="gold">Gold Member</option>
          <option value="silver">Silver Member</option>
          <option value="bronze">Bronze Member</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4 text-center">Tier</th>
                <th className="py-3 px-4 text-right">Saldo Poin</th>
                <th className="py-3 px-4 text-right">Total Belanja</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((c) => {
                const tierColor =
                  c.tier === 'gold'
                    ? 'bg-amber-100 text-amber-800'
                    : c.tier === 'silver'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-orange-100 text-orange-800';

                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm shrink-0">
                        {c.avatar || '👤'}
                      </div>
                      <div>
                        <div>{c.nama}</div>
                        {(c.tags || []).length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {c.tags.map((t, i) => (
                              <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.2 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{c.telepon}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${tierColor}`}>
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#00C9A7]">
                      {c.poin} pt
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-white">
                      {fmtRp(c.total_belanja)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openQRModal(c)}
                          className="p-1.5 rounded-lg hover:bg-teal-50 text-[#00C9A7]"
                          title="Kartu Member QR"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* QR Member Card Modal */}
      {qrModalCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 border border-slate-100 dark:border-slate-700 text-center animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Kartu Member Digital</h3>
              <button onClick={() => setQrModalCust(null)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#00C9A7] to-[#00A88E] text-white text-center mb-4 shadow-sm">
              <div className="text-xs uppercase font-bold tracking-wider opacity-80 mb-1">
                King Parfum Member Card
              </div>
              <div className="text-lg font-extrabold">{qrModalCust.nama}</div>
              <div className="text-xs opacity-90">{qrModalCust.telepon}</div>
              <div className="text-[10px] mt-2 font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                Tier {qrModalCust.tier} · {qrModalCust.poin} Poin
              </div>
            </div>

            {qrDataUrl && (
              <div className="flex justify-center mb-4">
                <img src={qrDataUrl} alt="Member QR" className="w-48 h-48 rounded-xl border p-2 bg-white" />
              </div>
            )}

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Cetak Kartu Member
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">
              {editingCust ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Telepon / WhatsApp</label>
                <input
                  type="tel"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Tags (pisahkan koma)</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="VIP, Member, Reseller"
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
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
    </div>
  );
};
