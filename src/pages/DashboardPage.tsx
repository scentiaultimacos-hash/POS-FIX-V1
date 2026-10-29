import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, today } from '../utils/constants';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Package,
  Calendar,
  AlertTriangle,
  Award,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const DashboardPage: React.FC = () => {
  const { db } = usePOS();
  const [preset, setPreset] = useState<'today' | 'yesterday' | '7d' | '30d'>('today');

  // Compute dates based on preset
  const { dari, sampai } = useMemo(() => {
    const now = new Date();
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'today') {
      const t = toDateStr(now);
      return { dari: t, sampai: t };
    }
    if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const str = toDateStr(y);
      return { dari: str, sampai: str };
    }
    if (preset === '7d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { dari: toDateStr(d), sampai: toDateStr(now) };
    }
    // 30d
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { dari: toDateStr(d), sampai: toDateStr(now) };
  }, [preset]);

  const [customDari, setCustomDari] = useState<string>('');
  const [customSampai, setCustomSampai] = useState<string>('');

  const activeDari = customDari || dari;
  const activeSampai = customSampai || sampai;

  // Filter transactions
  const filteredTrx = useMemo(() => {
    return (db.transaksi || []).filter(
      (t) => t.tanggal >= activeDari && t.tanggal <= activeSampai && t.status === 'selesai'
    );
  }, [db.transaksi, activeDari, activeSampai]);

  // KPIs
  const totalOmset = useMemo(() => {
    return filteredTrx.reduce((sum, t) => sum + t.total, 0);
  }, [filteredTrx]);

  const totalTrxCount = filteredTrx.length;

  const avgTrx = totalTrxCount > 0 ? Math.round(totalOmset / totalTrxCount) : 0;

  const totalItemsSold = useMemo(() => {
    return filteredTrx.reduce((sum, t) => {
      const itemSum = (t.items || []).reduce((is, i) => is + i.qty, 0);
      return sum + itemSum;
    }, 0);
  }, [filteredTrx]);

  // Chart data: Sales Trend by Date
  const salesChartData = useMemo(() => {
    const datesMap: Record<string, number> = {};
    const d1 = new Date(activeDari);
    const d2 = new Date(activeSampai);
    const cur = new Date(d1);
    while (cur <= d2) {
      datesMap[cur.toISOString().slice(0, 10)] = 0;
      cur.setDate(cur.getDate() + 1);
    }

    filteredTrx.forEach((t) => {
      if (datesMap[t.tanggal] !== undefined) {
        datesMap[t.tanggal] += t.total;
      }
    });

    const labels = Object.keys(datesMap).map((d) =>
      new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    );
    const data = Object.values(datesMap);

    return {
      labels,
      datasets: [
        {
          label: 'Penjualan (Rp)',
          data,
          borderColor: '#00C9A7',
          backgroundColor: 'rgba(0, 201, 167, 0.12)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#00C9A7',
          pointRadius: 4,
        },
      ],
    };
  }, [filteredTrx, activeDari, activeSampai]);

  // Chart data: Peak Hours
  const peakHoursData = useMemo(() => {
    const hoursCount: number[] = new Array(24).fill(0);
    filteredTrx.forEach((t) => {
      if (t.created_at) {
        const hour = new Date(t.created_at).getHours();
        if (hour >= 0 && hour < 24) {
          hoursCount[hour]++;
        }
      }
    });

    const labels = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
    const data = labels.map((l) => hoursCount[parseInt(l, 10)] || 0);

    return {
      labels: labels.map((l) => `${l}:00`),
      datasets: [
        {
          label: 'Jumlah Transaksi',
          data,
          backgroundColor: '#3B82F6',
          borderRadius: 6,
        },
      ],
    };
  }, [filteredTrx]);

  // Top Selling Items
  const topProducts = useMemo(() => {
    const map: Record<string, { nama: string; qty: number; omset: number }> = {};
    filteredTrx.forEach((t) => {
      (t.items || []).forEach((item) => {
        if (!map[item.produk_id]) {
          map[item.produk_id] = { nama: item.nama, qty: 0, omset: 0 };
        }
        map[item.produk_id].qty += item.qty;
        map[item.produk_id].omset += item.subtotal;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredTrx]);

  // Low Stock Items
  const lowStockProducts = useMemo(() => {
    return (db.produk || [])
      .filter((p) => p.stok <= p.stok_min && p.aktif)
      .slice(0, 5);
  }, [db.produk]);

  // Payment Methods Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTrx.forEach((t) => {
      (t.metode || []).forEach((m) => {
        map[m.nama] = (map[m.nama] || 0) + (m.jumlah || t.total);
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredTrx]);

  // Cashier Leaderboard
  const cashierLeaderboard = useMemo(() => {
    const map: Record<string, { nama: string; count: number; total: number }> = {};
    filteredTrx.forEach((t) => {
      const k = t.kasir_nama || 'Kasir';
      if (!map[k]) map[k] = { nama: k, count: 0, total: 0 };
      map[k].count++;
      map[k].total += t.total;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredTrx]);

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Date Filter Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-4 border border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['today', 'yesterday', '7d', '30d'] as const).map((pKey) => {
            const labels = {
              today: 'Hari Ini',
              yesterday: 'Kemarin',
              '7d': '7 Hari',
              '30d': '30 Hari',
            };
            const isSelected = preset === pKey && !customDari;
            return (
              <button
                key={pKey}
                onClick={() => {
                  setPreset(pKey);
                  setCustomDari('');
                  setCustomSampai('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-[#00C9A7] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {labels[pKey]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={activeDari}
            onChange={(e) => setCustomDari(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-[#00C9A7]"
          />
          <span className="text-slate-400 text-xs">s/d</span>
          <input
            type="date"
            value={activeSampai}
            onChange={(e) => setCustomSampai(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-[#00C9A7]"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Omset */}
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-[#00C9A7] to-[#00A88E] text-white shadow-md">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="text-[11px] opacity-85 font-medium mb-1">Total Penjualan</div>
          <div className="text-lg md:text-2xl font-extrabold tracking-tight truncate">{fmtRp(totalOmset)}</div>
        </div>

        {/* Transaksi Count */}
        <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center mb-2">
            <ShoppingBag className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">Total Transaksi</div>
          <div className="text-lg md:text-2xl font-extrabold text-slate-800 dark:text-white">{totalTrxCount}</div>
        </div>

        {/* Rata-rata Trx */}
        <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center mb-2">
            <Receipt className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">Rata-rata Transaksi</div>
          <div className="text-lg md:text-2xl font-extrabold text-slate-800 dark:text-white truncate">{fmtRp(avgTrx)}</div>
        </div>

        {/* Item Terjual */}
        <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center mb-2">
            <Package className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">Item Terjual</div>
          <div className="text-lg md:text-2xl font-extrabold text-slate-800 dark:text-white">{totalItemsSold} pcs</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-4 md:p-5 border border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <span>📈</span> Grafik Tren Penjualan
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Periode aktif</span>
          </div>
          <div className="h-64 md:h-72">
            <Line
              data={salesChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `Penjualan: ${fmtRp(ctx.parsed.y)}`,
                    },
                  },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (val) => `${Number(val) / 1000}k`,
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                  },
                  x: {
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Peak Hours Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-4 md:p-5 border border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <span>🔥</span> Jam Sibuk Kasir
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mb-3">Distribusi transaksi per jam kerja</p>
          <div className="h-64 md:h-72">
            <Bar
              data={peakHoursData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                  },
                  x: {
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Selling */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-4 md:p-5 border border-slate-100 dark:border-slate-700/60">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> Produk Terlaris
          </h3>
          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">Belum ada transaksi di periode ini</div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-[#00C9A7] font-bold flex items-center justify-center text-[10px] shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white truncate">{p.nama}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#00C9A7]">{p.qty} pcs</div>
                    <div className="text-[10px] text-slate-400">{fmtRp(p.omset)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-4 md:p-5 border border-slate-100 dark:border-slate-700/60">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Peringatan Stok Menipis
          </h3>
          <div className="space-y-2.5">
            {lowStockProducts.length === 0 ? (
              <div className="text-center text-xs text-emerald-600 dark:text-emerald-400 py-6 font-medium">
                ✅ Semua stok produk dalam batas aman
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-white truncate">{p.nama}</div>
                    <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold">
                      Sisa {p.stok} {p.satuan}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Min: {p.stok_min}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-4 md:p-5 border border-slate-100 dark:border-slate-700/60">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-500" /> Metode Pembayaran
          </h3>
          <div className="space-y-2">
            {paymentBreakdown.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">Belum ada transaksi</div>
            ) : (
              paymentBreakdown.map(([method, amount], idx) => {
                const pct = totalOmset > 0 ? Math.round((amount / totalOmset) * 100) : 0;
                return (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-white">{method}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {fmtRp(amount)} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-[#00C9A7] rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cashier Leaderboard */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs p-4 md:p-5 border border-slate-100 dark:border-slate-700/60">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#00C9A7]" /> Performa Kasir
          </h3>
          <div className="space-y-2">
            {cashierLeaderboard.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">Belum ada data kasir</div>
            ) : (
              cashierLeaderboard.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`}</span>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">{c.nama}</div>
                      <div className="text-[10px] text-slate-400">{c.count} transaksi</div>
                    </div>
                  </div>
                  <div className="text-right font-extrabold text-[#00C9A7]">{fmtRp(c.total)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
