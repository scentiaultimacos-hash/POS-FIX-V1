import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { uuid } from '../../utils/constants';
import { Pelanggan } from '../../types';
import { UserPlus, X, Check } from 'lucide-react';

interface QuickAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded: (customer: Pelanggan) => void;
}

export const QuickAddCustomerModal: React.FC<QuickAddCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerAdded,
}) => {
  const { updateDb, showToast } = usePOS();
  const [nama, setNama] = useState('');
  const [telepon, setTelepon] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      showToast('Nama pelanggan wajib diisi', 'error');
      return;
    }

    const newCustomer: Pelanggan = {
      id: uuid(),
      nama: nama.trim(),
      telepon: telepon.trim() || '-',
      tier: 'bronze',
      poin: 0,
      total_belanja: 0,
      tags: ['Member Baru'],
      avatar: '👤',
    };

    updateDb((prev) => ({
      ...prev,
      pelanggan: [newCustomer, ...(prev.pelanggan || [])],
    }));

    showToast(`✅ Pelanggan ${newCustomer.nama} berhasil didaftarkan`, 'success');
    onCustomerAdded(newCustomer);
    setNama('');
    setTelepon('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-up">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#00C9A7]" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Tambah Pelanggan Baru</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Siti Rahmawati"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs outline-none focus:border-[#00C9A7]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              No. Telepon / WhatsApp
            </label>
            <input
              type="tel"
              value={telepon}
              onChange={(e) => setTelepon(e.target.value)}
              placeholder="081234567890"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs outline-none focus:border-[#00C9A7]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" /> Simpan & Pilih
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
