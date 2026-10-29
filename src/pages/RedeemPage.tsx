import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, nowISO, uuid, today } from '../utils/constants';
import { Pelanggan, Voucher, PointRedemption } from '../types';
import {
  Gift,
  Search,
  User,
  History,
  CheckCircle2,
  AlertCircle,
  Copy,
  Ticket,
  ShieldAlert,
} from 'lucide-react';

export const RedeemPage: React.FC = () => {
  const { db, updateDb, showToast, requestPinApproval, logActivity } = usePOS();
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState<{ kode: string; nilai: number } | null>(null);

  const customers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return (db.pelanggan || []).slice(0, 10);
    return (db.pelanggan || []).filter(
      (c) => c.nama.toLowerCase().includes(q) || c.telepon.includes(q)
    );
  }, [db.pelanggan, search]);

  const selectedCustomer = (db.pelanggan || []).find((c) => c.id === selectedCustomerId) || null;

  const tiers = db.master?.poin?.tiers || [
    { poin: 1000, nilai: 100000, min_belanja: 300000 },
    { poin: 2000, nilai: 200000, min_belanja: 450000 },
    { poin: 4000, nilai: 400000, min_belanja: 700000 },
  ];

  const handleRedeem = (tier: { poin: number; nilai: number; min_belanja: number }) => {
    if (!selectedCustomer) return;
    if (selectedCustomer.poin < tier.poin) {
      showToast('Poin pelanggan tidak mencukupi untuk paket ini', 'warning');
      return;
    }

    const pinThreshold = db.master?.poin?.pin_threshold || 1000;
    const executeRedeem = () => {
      const voucherCode = 'RDM-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const newVoucher: Voucher = {
        id: uuid(),
        kode: voucherCode,
        diskon: Math.round((tier.nilai / tier.min_belanja) * 100) || 20,
        kuota: 1,
        terpakai: 0,
        expired: null,
        aktif: true,
        created_at: nowISO(),
      };

      const newRedemption: PointRedemption = {
        id: uuid(),
        pelanggan_id: selectedCustomer.id,
        pelanggan_nama: selectedCustomer.nama,
        voucher_kode: voucherCode,
        nilai_voucher: tier.nilai,
        poin_dipakai: tier.poin,
        created_at: nowISO(),
      };

      updateDb((prev) => {
        // deduct points
        const updatedPelanggan = (prev.pelanggan || []).map((c) =>
          c.id === selectedCustomer.id ? { ...c, poin: c.poin - tier.poin } : c
        );

        // ledger record
        const newLedger = [
          {
            id: uuid(),
            pelanggan_id: selectedCustomer.id,
            pelanggan_nama: selectedCustomer.nama,
            tipe: 'redeem' as const,
            poin: -tier.poin,
            keterangan: `Tukar Voucher ${voucherCode} (${fmtRp(tier.nilai)})`,
            created_at: nowISO(),
          },
          ...(prev.point_ledger || []),
        ];

        return {
          ...prev,
          pelanggan: updatedPelanggan,
          vouchers: [newVoucher, ...(prev.vouchers || [])],
          point_redemptions: [newRedemption, ...(prev.point_redemptions || [])],
          point_ledger: newLedger,
        };
      });

      setGeneratedVoucher({ kode: voucherCode, nilai: tier.nilai });
      logActivity(`Redeem ${tier.poin} poin (${selectedCustomer.nama}) -> ${voucherCode}`, 'Poin');
      showToast(`🎉 Sukses! Voucher ${voucherCode} berhasil dibuat`, 'success');
    };

    if (tier.poin >= pinThreshold) {
      requestPinApproval(
        `Penukaran ${tier.poin} poin membutuhkan PIN otorisasi Manager/Owner:`,
        () => {
          executeRedeem();
        }
      );
    } else {
      executeRedeem();
    }
  };

  const redemptionsList = db.point_redemptions || [];

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-[#00C9A7]" /> Redeem Poin Loyalitas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tukarkan akumulasi poin belanja pelanggan menjadi kupon voucher belanja
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <History className="w-3.5 h-3.5" />
          <span>{showHistory ? 'Tutup Riwayat' : 'Riwayat Penukaran'}</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Selector */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 md:p-5 border border-slate-100 dark:border-slate-700/60 shadow-xs flex flex-col">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#00C9A7]" /> Cari Pelanggan
          </h3>

          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik nama atau nomor telepon..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs outline-none focus:border-[#00C9A7]"
            />
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 flex-1">
            {customers.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomerId(c.id);
                    setGeneratedVoucher(null);
                  }}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-[#00C9A7] bg-teal-50 dark:bg-teal-950/40 text-slate-900 dark:text-white shadow-2xs'
                      : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm shrink-0">
                      {c.avatar || '👤'}
                    </div>
                    <div className="truncate">
                      <div className="font-bold truncate">{c.nama}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{c.telepon}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-[#00C9A7]">{c.poin} pt</span>
                    <div className="text-[9px] uppercase font-bold text-slate-400">{c.tier}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Redeem Action Panel */}
        <div className="lg:col-span-2">
          {!selectedCustomer ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-700 shadow-xs h-full flex flex-col items-center justify-center">
              <User className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1">
                Pilih Pelanggan Terlebih Dahulu
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Pilih pelanggan dari daftar di sebelah kiri untuk melihat saldo poin dan menukarkan paket voucher.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Customer Profile Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#00C9A7] to-[#00A88E] text-white shadow-md flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-xs">
                    {selectedCustomer.avatar || '👤'}
                  </div>
                  <div>
                    <div className="font-extrabold text-lg">{selectedCustomer.nama}</div>
                    <div className="text-xs opacity-90">{selectedCustomer.telepon}</div>
                    <div className="text-[10px] mt-1 font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block">
                      Tier {selectedCustomer.tier} · Belanja {fmtRp(selectedCustomer.total_belanja)}
                    </div>
                  </div>
                </div>

                <div className="text-right bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-xs">
                  <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Saldo Poin Aktif</div>
                  <div className="text-3xl font-black">{selectedCustomer.poin}</div>
                </div>
              </div>

              {/* Newly Generated Voucher Alert */}
              {generatedVoucher && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 animate-slide-down">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-xs">
                      <div>Voucher Berhasil Dibuat: <b className="font-mono text-sm tracking-wide bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded">{generatedVoucher.kode}</b></div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">Nilai potongan {fmtRp(generatedVoucher.nilai)}. Dapat langsung dipakai di menu Kasir POS!</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedVoucher.kode);
                      showToast('Kode voucher disalin!', 'success');
                    }}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 shadow-2xs hover:bg-emerald-50 text-xs flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" /> Salin
                  </button>
                </div>
              )}

              {/* Tier Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {tiers.map((t, idx) => {
                  const canRedeem = selectedCustomer.poin >= t.poin;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-3xl border flex flex-col justify-between transition-all ${
                        canRedeem
                          ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs hover:border-[#00C9A7]'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Ticket className="w-5 h-5 text-[#00C9A7]" />
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-[#00C9A7]">
                            {t.poin} POIN
                          </span>
                        </div>
                        <div className="font-extrabold text-base text-slate-800 dark:text-white mb-1">
                          Voucher {fmtRp(t.nilai)}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                          Minimal transaksi belanja <b>{fmtRp(t.min_belanja)}</b>
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!canRedeem}
                        onClick={() => handleRedeem(t)}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors ${
                          canRedeem
                            ? 'bg-[#00C9A7] hover:bg-[#00B894] text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {canRedeem ? 'Tukar Poin Sekarang' : 'Poin Kurang'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Redemption History Table */}
      {showHistory && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs animate-slide-down">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-[#00C9A7]" /> Riwayat Penukaran Poin Terbaru
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3">Poin Digunakan</th>
                  <th className="py-2.5 px-3">Kode Voucher</th>
                  <th className="py-2.5 px-3 text-right">Nilai Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {redemptionsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Belum ada riwayat penukaran poin
                    </td>
                  </tr>
                ) : (
                  redemptionsList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {new Date(r.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-white">
                        {r.pelanggan_nama}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-600">-{r.poin_dipakai} Poin</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#00C9A7]">{r.voucher_kode}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-white">
                        {fmtRp(r.nilai_voucher)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
