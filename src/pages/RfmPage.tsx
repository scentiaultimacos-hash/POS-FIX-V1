import React, { useMemo, useState } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp } from '../utils/constants';
import { Target, Send, Users, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

interface RFMCustomer {
  id: string;
  nama: string;
  telepon: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  segment: 'champions' | 'loyal' | 'potential' | 'at_risk' | 'hibernating';
}

export const RfmPage: React.FC = () => {
  const { db } = usePOS();
  const [selectedSegment, setSelectedSegment] = useState<string>('all');

  const rfmList: RFMCustomer[] = useMemo(() => {
    const customers = db.pelanggan || [];
    const transactions = db.transaksi || [];
    const now = Date.now();

    return customers.map((c) => {
      const custTrx = transactions.filter((t) => t.pelanggan_id === c.id && t.status === 'selesai');
      const frequency = custTrx.length;
      const monetary = custTrx.reduce((s, t) => s + t.total, c.total_belanja || 0);

      let lastDate = c.total_belanja > 0 ? now - 10 * 86400000 : now - 60 * 86400000;
      if (custTrx.length > 0) {
        const sorted = [...custTrx].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        lastDate = new Date(sorted[0].created_at).getTime();
      }

      const recencyDays = Math.max(0, Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)));

      // Segment classification
      let segment: RFMCustomer['segment'] = 'potential';
      if (recencyDays <= 14 && frequency >= 3 && monetary >= 1000000) {
        segment = 'champions';
      } else if (frequency >= 2 && monetary >= 500000) {
        segment = 'loyal';
      } else if (recencyDays > 30 && frequency >= 1) {
        segment = 'at_risk';
      } else if (recencyDays > 60) {
        segment = 'hibernating';
      }

      return {
        id: c.id,
        nama: c.nama,
        telepon: c.telepon,
        recencyDays,
        frequency,
        monetary,
        segment,
      };
    });
  }, [db.pelanggan, db.transaksi]);

  const filtered = useMemo(() => {
    if (selectedSegment === 'all') return rfmList;
    return rfmList.filter((r) => r.segment === selectedSegment);
  }, [rfmList, selectedSegment]);

  const sendBroadcastWA = (cust: RFMCustomer) => {
    const toko = db.master?.toko?.nama || 'King Parfum';
    let text = '';
    if (cust.segment === 'champions') {
      text = `Halo Kak ${cust.nama}! Terima kasih telah menjadi pelanggan setia ${toko}. Ada promo spesial voucher diskon 20% khusus untuk Kakak hari ini. Gunakan kode: *VIP20* saat checkout! 🌸`;
    } else if (cust.segment === 'at_risk' || cust.segment === 'hibernating') {
      text = `Halo Kak ${cust.nama}, kami kangen Kakak di ${toko}! Dapatkan voucher diskon Rp 25.000 untuk pembelian parfum favorit Kakak minggu ini dengan kode: *COMEBACK25* 🌸`;
    } else {
      text = `Halo Kak ${cust.nama}, cek aroma parfum terbaru kami di ${toko}! Dapatkan promo menarik dan kumpulkan poin reward setiap belanja. 🌸`;
    }

    const cleanPhone = cust.telepon.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const segmentConfig = {
    champions: { label: '👑 Champions', color: 'bg-emerald-100 text-emerald-800' },
    loyal: { label: '💎 Loyal Customer', color: 'bg-teal-100 text-teal-800' },
    potential: { label: '🌟 Potensial', color: 'bg-blue-100 text-blue-800' },
    at_risk: { label: '⚠️ At Risk', color: 'bg-amber-100 text-amber-800' },
    hibernating: { label: '💤 Hibernating', color: 'bg-red-100 text-red-800' },
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-[#00C9A7]" /> Analisis RFM & Segmentasi Pelanggan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Segmentasi berbasis Recency (keterkinian), Frequency (frekuensi transaksi), dan Monetary (nilai belanja)
          </p>
        </div>
      </div>

      {/* Segment Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <button
          onClick={() => setSelectedSegment('all')}
          className={`p-3 rounded-2xl border text-center transition-all ${
            selectedSegment === 'all'
              ? 'border-[#00C9A7] bg-teal-50 dark:bg-teal-950/40 text-[#00C9A7] font-bold shadow-xs'
              : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <div className="text-lg font-black">{rfmList.length}</div>
          <div className="text-[10px] font-semibold">Semua Member</div>
        </button>

        {Object.entries(segmentConfig).map(([key, val]) => {
          const count = rfmList.filter((r) => r.segment === key).length;
          const isSelected = selectedSegment === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedSegment(key)}
              className={`p-3 rounded-2xl border text-center transition-all ${
                isSelected
                  ? 'border-[#00C9A7] bg-teal-50 dark:bg-teal-950/40 text-[#00C9A7] font-bold shadow-xs'
                  : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className="text-lg font-black">{count}</div>
              <div className="text-[10px] font-semibold">{val.label}</div>
            </button>
          );
        })}
      </div>

      {/* RFM Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Nomor WhatsApp</th>
                <th className="py-3 px-4 text-center">Recency (Hari)</th>
                <th className="py-3 px-4 text-center">Frequency (Trx)</th>
                <th className="py-3 px-4 text-right">Monetary (Total)</th>
                <th className="py-3 px-4 text-center">Segmen RFM</th>
                <th className="py-3 px-4 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((c) => {
                const seg = segmentConfig[c.segment] || segmentConfig.potential;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                      {c.nama}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{c.telepon}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold">{c.recencyDays} hari lalu</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold">{c.frequency}x</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#00C9A7]">
                      {fmtRp(c.monetary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${seg.color}`}>
                        {seg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => sendBroadcastWA(c)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Send className="w-3 h-3" /> WhatsApp Promo
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
