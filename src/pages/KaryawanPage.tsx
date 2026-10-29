import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, uuid } from '../utils/constants';
import { Karyawan } from '../types';
import { UserCog, Plus, Edit2, Trash2, X, Check, Shield } from 'lucide-react';

export const KaryawanPage: React.FC = () => {
  const { db, updateDb, showToast, showConfirm, logActivity } = usePOS();
  const list = db.karyawan || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKar, setEditingKar] = useState<Karyawan | null>(null);

  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('Kasir');
  const [telepon, setTelepon] = useState('');
  const [gajiPokok, setGajiPokok] = useState(2500000);
  const [tunjangan, setTunjangan] = useState(500000);
  const [pin, setPin] = useState('1234');
  const [role, setRole] = useState('kasir');

  const openAdd = () => {
    setEditingKar(null);
    setNama('');
    setJabatan('Kasir');
    setTelepon('');
    setGajiPokok(2500000);
    setTunjangan(500000);
    setPin('1234');
    setRole('kasir');
    setIsModalOpen(true);
  };

  const openEdit = (k: Karyawan) => {
    setEditingKar(k);
    setNama(k.nama);
    setJabatan(k.jabatan);
    setTelepon(k.telepon);
    setGajiPokok(k.gaji_pokok);
    setTunjangan(k.tunjangan);
    setPin(k.pin);
    setRole(k.role);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      showToast('Nama karyawan wajib diisi', 'error');
      return;
    }

    if (editingKar) {
      updateDb((prev) => ({
        ...prev,
        karyawan: (prev.karyawan || []).map((k) =>
          k.id === editingKar.id
            ? { ...k, nama: nama.trim(), jabatan, telepon, gaji_pokok: gajiPokok, tunjangan, pin, role }
            : k
        ),
      }));
      logActivity(`Edit data karyawan: ${nama}`, 'Karyawan');
      showToast('✅ Data karyawan diperbarui', 'success');
    } else {
      const newK: Karyawan = {
        id: uuid(),
        nama: nama.trim(),
        jabatan,
        telepon,
        gaji_pokok: gajiPokok,
        tunjangan,
        pin,
        role,
        username: 'karyawan_' + Math.floor(100 + Math.random() * 900),
        aktif: true,
      };
      updateDb((prev) => ({
        ...prev,
        karyawan: [newK, ...(prev.karyawan || [])],
      }));
      logActivity(`Tambah karyawan: ${nama}`, 'Karyawan');
      showToast('✅ Karyawan baru ditambahkan', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (k: Karyawan) => {
    showConfirm('Hapus Karyawan', `Hapus data karyawan "${k.nama}"?`, () => {
      updateDb((prev) => ({
        ...prev,
        karyawan: (prev.karyawan || []).filter((item) => item.id !== k.id),
      }));
      showToast('Karyawan dihapus', 'info');
    });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-[#00C9A7]" /> Data Karyawan & Staf Toko
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola staf kasir, gudang, manager, gaji pokok, dan PIN otorisasi
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Karyawan
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Staf</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">No. WhatsApp</th>
                <th className="py-3 px-4 text-center">Role Akses</th>
                <th className="py-3 px-4 text-right">Gaji Pokok</th>
                <th className="py-3 px-4 text-right">Tunjangan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-50 dark:bg-teal-950 text-[#00C9A7] font-bold flex items-center justify-center text-xs">
                      {k.nama.charAt(0).toUpperCase()}
                    </div>
                    <span>{k.nama}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                    {k.jabatan}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{k.telepon || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {k.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{fmtRp(k.gaji_pokok)}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-500">
                    {fmtRp(k.tunjangan)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(k)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(k)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Karyawan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">
              {editingKar ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Role Sistem</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                  >
                    <option value="kasir">Kasir</option>
                    <option value="manager">Manager</option>
                    <option value="gudang">Gudang</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">No. WhatsApp</label>
                  <input
                    type="tel"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">PIN Otorisasi (4-6 digit)</label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono dark:bg-slate-900 text-center"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Gaji Pokok (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={gajiPokok}
                    onChange={(e) => setGajiPokok(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Tunjangan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={tunjangan}
                    onChange={(e) => setTunjangan(Number(e.target.value) || 0)}
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
