import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, today, nowISO, uuid } from '../utils/constants';
import { Kasbon } from '../types';
import { CreditCard, Plus, CheckCircle2, DollarSign, X } from 'lucide-react';

export const KasbonPage: React.FC = () => {
  const { db, updateDb, showToast, logActivity } = usePOS();
  const list = db.kasbon || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedKasbon, setSelectedKasbon] = useState<Kasbon | null>(null);

  // Add form
  const [pelangganId, setPelangganId] = useState('');
  const [total, setTotal] = useState(100000);
  const [jatuhTempo, setJatuhTempo] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [keterangan, setKeterangan] = useState('');

  // Pay form
  const [nominalBayar, setNominalBayar] = useState(50000);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = (db.pelanggan || []).find((c) => c.id === pelangganId);
    if (!cust) {
      showToast('Pilih pelanggan', 'error');
      return;
    }

    const newKasbon: Kasbon = {
      id: uuid(),
      pelanggan_id: cust.id,
      pelanggan_nama: cust.nama,
      total,
      terbayar: 0,
      sisa: total,
      jatuh_tempo: jatuhTempo,
      status: 'belum_lunas',
      keterangan,
      riwayat_bayar: [],
      created_at: nowISO(),
    };

    updateDb((prev) => ({
      ...prev,
      kasbon: [newKasbon, ...(prev.kasbon || [])],
    }));

    logActivity(`Tambah kasbon ${cust.nama} (${fmtRp(total)})`, 'Kasbon');
    showToast('✅ Kasbon berhasil dicatat', 'success');
    setIsAddOpen(false);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKasbon) return;

    const bayar = Math.min(nominalBayar, selectedKasbon.sisa);
    const newTerbayar = selectedKasbon.terbayar + bayar;
    const newSisa = selectedKasbon.total - newTerbayar;
    const newStatus = newSisa <= 0 ? ('lunas' as const) : ('belum_lunas' as const);

    updateDb((prev) => ({
      ...prev,
      kasbon: (prev.kasbon || []).map((k) =>
        k.id === selectedKasbon.id
          ? {
              ...k,
              terbayar: newTerbayar,
              sisa: newSisa,
              status: newStatus,
              riwayat_bayar: [
                ...(k.riwayat_bayar || []),
                { tanggal: today(), jumlah: bayar, metode: 'Tunai' },
              ],
            }
          : k
      ),
    }));

    logActivity(`Pembayaran kasbon ${selectedKasbon.pelanggan_nama}: ${fmtRp(bayar)}`, 'Kasbon');
    showToast(`✅ Pembayaran kasbon ${fmtRp(bayar)} berhasil dicatat`, 'success');
    setIsPayOpen(false);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#00C9A7]" /> Buku Kasbon & Piutang Pelanggan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pencatatan pinjaman tagihan pelanggan, cicilan pembayaran, dan status jatuh tempo
          </p>
        </div>
        <button
          onClick={() => {
            setPelangganId(db.pelanggan?.[0]?.id || '');
            setIsAddOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Catat Kasbon Baru
        </button>
      </div>

      {/* Kasbon Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4 text-right">Total Pinjaman</th>
                <th className="py-3 px-4 text-right">Terbayar</th>
                <th className="py-3 px-4 text-right">Sisa Piutang</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Tidak ada catatan kasbon
                  </td>
                </tr>
              ) : (
                list.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                      {k.pelanggan_nama}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{k.keterangan || '-'}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{k.jatuh_tempo}</td>
                    <td className="py-3 px-4 text-right font-medium">{fmtRp(k.total)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                      {fmtRp(k.terbayar)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">
                      {fmtRp(k.sisa)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          k.status === 'lunas'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {k.status === 'lunas' ? '✅ Lunas' : 'Belum Lunas'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {k.status !== 'lunas' && (
                        <button
                          onClick={() => {
                            setSelectedKasbon(k);
                            setNominalBayar(k.sisa);
                            setIsPayOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-[#00C9A7] hover:bg-teal-100 font-bold text-[10px]"
                        >
                          Bayar Cicilan
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

      {/* Modal Add Kasbon */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Catat Kasbon Baru</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Pilih Pelanggan *</label>
                <select
                  value={pelangganId}
                  onChange={(e) => setPelangganId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                >
                  {(db.pelanggan || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama} ({c.telepon})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Nominal Kasbon (Rp) *</label>
                <input
                  type="number"
                  min="1000"
                  required
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900 font-bold text-[#00C9A7]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Jatuh Tempo</label>
                <input
                  type="date"
                  value={jatuhTempo}
                  onChange={(e) => setJatuhTempo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Keterangan Barang</label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Misal: Ambil parfum refill 2 botol"
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#00C9A7] text-white text-xs font-bold">
                  Simpan Kasbon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bayar Kasbon */}
      {isPayOpen && selectedKasbon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-2">
              Bayar Kasbon: {selectedKasbon.pelanggan_nama}
            </h3>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 text-xs space-y-1 mb-3">
              <div className="flex justify-between">
                <span>Total Pinjaman:</span>
                <span className="font-semibold">{fmtRp(selectedKasbon.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sisa Belum Dibayar:</span>
                <span className="font-bold text-red-500">{fmtRp(selectedKasbon.sisa)}</span>
              </div>
            </div>
            <form onSubmit={handlePay} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Nominal yang Dibayarkan (Rp)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedKasbon.sisa}
                  value={nominalBayar}
                  onChange={(e) => setNominalBayar(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900 font-bold text-[#00C9A7]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold">
                  Konfirmasi Bayar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
