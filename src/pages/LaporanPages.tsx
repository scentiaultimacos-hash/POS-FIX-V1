import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, fmtTgl, today, nowISO, uuid } from '../utils/constants';
import { Transaksi, ReturRecord } from '../types';
import {
  TrendingUp,
  UserCheck,
  RotateCcw,
  PackageSearch,
  Wallet,
  FileText,
  Search,
  Plus,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Line, Bar } from 'react-chartjs-2';

/* ------------------------------------------------------------------
 * 1. Laporan Penjualan
 * ------------------------------------------------------------------ */
export const LaporanPenjualanPage: React.FC = () => {
  const { db, showToast } = usePOS();
  const [dari, setDari] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [sampai, setSampai] = useState(today());
  const [filterMetode, setFilterMetode] = useState('');

  const filtered = useMemo(() => {
    return (db.transaksi || []).filter((t) => {
      const matchDate = t.tanggal >= dari && t.tanggal <= sampai;
      const matchMetode = !filterMetode || (t.metode || []).some((m) => m.nama === filterMetode);
      return matchDate && matchMetode && t.status === 'selesai';
    });
  }, [db.transaksi, dari, sampai, filterMetode]);

  const totalOmset = filtered.reduce((s, t) => s + t.total, 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`LAPORAN PENJUALAN (${dari} s/d ${sampai})`, 14, 15);
    const rows = filtered.map((t, i) => [
      i + 1,
      t.nomor,
      t.tanggal,
      t.kasir_nama,
      t.pelanggan_nama || 'Umum',
      (t.metode || []).map((m) => m.nama).join(', '),
      fmtRp(t.total),
    ]);
    autoTable(doc, {
      startY: 22,
      head: [['#', 'No. Inv', 'Tanggal', 'Kasir', 'Pelanggan', 'Metode', 'Total']],
      body: rows,
    });
    doc.save(`LaporanPenjualan_${dari}_${sampai}.pdf`);
    showToast('📄 PDF Penjualan diunduh', 'success');
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#00C9A7]" /> Laporan Penjualan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rincian seluruh transaksi kasir, metode pembayaran, dan rekap omset harian
          </p>
        </div>
        <button
          onClick={exportPDF}
          className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <FileText className="w-4 h-4" /> Unduh PDF
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-xs border border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs dark:bg-slate-900"
          />
          <span className="text-slate-400 text-xs">s/d</span>
          <input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs dark:bg-slate-900"
          />
        </div>
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
          Total Omset: <span className="text-[#00C9A7] text-sm">{fmtRp(totalOmset)}</span> ({filtered.length} Transaksi)
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4 text-right">Nilai Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-white">{t.nomor}</td>
                  <td className="py-3 px-4 text-slate-500">{t.tanggal}</td>
                  <td className="py-3 px-4 font-medium">{t.kasir_nama}</td>
                  <td className="py-3 px-4">{t.pelanggan_nama || 'Umum'}</td>
                  <td className="py-3 px-4">
                    {(t.metode || []).map((m) => m.nama).join(', ')}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#00C9A7]">{fmtRp(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * 2. Laporan Per Kasir
 * ------------------------------------------------------------------ */
export const LaporanKasirPage: React.FC = () => {
  const { db } = usePOS();
  const [dari, setDari] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [sampai, setSampai] = useState(today());

  const cashierStats = useMemo(() => {
    const trx = (db.transaksi || []).filter(
      (t) => t.tanggal >= dari && t.tanggal <= sampai && t.status === 'selesai'
    );
    const map: Record<string, { nama: string; trxCount: number; total: number; items: number }> = {};
    trx.forEach((t) => {
      const k = t.kasir_nama || 'Kasir';
      if (!map[k]) map[k] = { nama: k, trxCount: 0, total: 0, items: 0 };
      map[k].trxCount++;
      map[k].total += t.total;
      map[k].items += (t.items || []).reduce((s, i) => s + i.qty, 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [db.transaksi, dari, sampai]);

  const grandTotal = cashierStats.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#00C9A7]" /> Laporan Kinerja per Kasir
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Leaderboard pencapaian omset, jumlah transaksi, dan item terjual per staf kasir
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cashierStats.map((c, idx) => {
          const pct = grandTotal > 0 ? Math.round((c.total / grandTotal) * 100) : 0;
          return (
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`}</span>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">{c.nama}</h3>
                    <div className="text-[10px] text-slate-400">{c.trxCount} Transaksi Selesai</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-[#00C9A7]">{fmtRp(c.total)}</div>
                  <div className="text-[10px] text-slate-400">{pct}% dari total toko</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-[#00C9A7] rounded-full" style={{ width: `${pct}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * 3. Laporan Retur & Refund
 * ------------------------------------------------------------------ */
export const LaporanReturPage: React.FC = () => {
  const { db, updateDb, user, showToast, logActivity } = usePOS();
  const returns = db.returns || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invSearch, setInvSearch] = useState('');
  const [selectedTrx, setSelectedTrx] = useState<Transaksi | null>(null);
  const [alasan, setAlasan] = useState('Produk cacat / aroma tidak sesuai');

  const handleProcessRetur = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrx) return;

    const newRetur: ReturRecord = {
      id: uuid(),
      transaksi_id: selectedTrx.id,
      transaksi_nomor: selectedTrx.nomor,
      kasir_nama: user?.nama || 'Kasir',
      items: selectedTrx.items || [],
      total: selectedTrx.total,
      alasan,
      created_at: nowISO(),
    };

    updateDb((prev) => {
      // 1. Return stock back to inventory
      const updatedProduk = (prev.produk || []).map((p) => {
        const itemRet = (selectedTrx.items || []).find((i) => i.produk_id === p.id);
        if (itemRet) {
          return { ...p, stok: p.stok + itemRet.qty };
        }
        return p;
      });

      // 2. Mark trx as retur
      const updatedTrx = (prev.transaksi || []).map((t) =>
        t.id === selectedTrx.id ? { ...t, status: 'retur' as const } : t
      );

      return {
        ...prev,
        produk: updatedProduk,
        transaksi: updatedTrx,
        returns: [newRetur, ...(prev.returns || [])],
      };
    });

    logActivity(`Proses retur ${selectedTrx.nomor} (${fmtRp(selectedTrx.total)})`, 'Retur');
    showToast('✅ Retur berhasil diproses. Stok produk telah dikembalikan.', 'success');
    setIsModalOpen(false);
    setSelectedTrx(null);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-[#00C9A7]" /> Laporan & Pengembalian Retur
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pencatatan pengembalian barang, alasan retur, dan pengembalian stok otomatis
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Proses Retur Baru
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice Terkait</th>
                <th className="py-3 px-4">Tanggal Retur</th>
                <th className="py-3 px-4">Petugas Kasir</th>
                <th className="py-3 px-4">Alasan Retur</th>
                <th className="py-3 px-4 text-right">Nilai Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Belum ada data retur barang
                  </td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-white">
                      {r.transaksi_nomor}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(r.created_at).toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4">{r.kasir_nama}</td>
                    <td className="py-3 px-4 text-amber-700 dark:text-amber-400 font-medium">{r.alasan}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-500">
                      -{fmtRp(r.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Proses Retur */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Proses Retur Transaksi</h3>
            <form onSubmit={handleProcessRetur} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Cari Nomor Invoice</label>
                <input
                  type="text"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder="Ketik INV-..."
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>

              {/* Invoices list matching */}
              <div className="space-y-1 max-h-36 overflow-y-auto border p-2 rounded-xl text-xs dark:bg-slate-900">
                {(db.transaksi || [])
                  .filter((t) => t.status === 'selesai' && (!invSearch || t.nomor.includes(invSearch)))
                  .slice(0, 5)
                  .map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTrx(t)}
                      className={`p-2 rounded-lg cursor-pointer flex justify-between items-center ${
                        selectedTrx?.id === t.id ? 'bg-[#00C9A7] text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{t.nomor} ({t.tanggal})</span>
                      <span>{fmtRp(t.total)}</span>
                    </div>
                  ))}
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Alasan Retur</label>
                <input
                  type="text"
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
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
                  disabled={!selectedTrx}
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  Konfirmasi Retur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------
 * 4. Laporan Stok & Valuasi Aset
 * ------------------------------------------------------------------ */
export const LaporanStokPage: React.FC = () => {
  const { db, showToast } = usePOS();
  const products = db.produk || [];

  const totalProdukCount = products.length;
  const lowStockCount = products.filter((p) => p.stok <= p.stok_min).length;
  const totalValuasi = products.reduce((s, p) => s + p.stok * p.harga_beli, 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`LAPORAN STOK & VALUASI INVENTARIS`, 14, 15);
    const rows = products.map((p, i) => [
      i + 1,
      p.nama,
      p.sku,
      `${p.stok} ${p.satuan}`,
      fmtRp(p.harga_beli),
      fmtRp(p.stok * p.harga_beli),
    ]);
    autoTable(doc, {
      startY: 22,
      head: [['#', 'Nama Produk', 'SKU', 'Stok Fisik', 'Harga Beli', 'Total Nilai Aset']],
      body: rows,
    });
    doc.save(`LaporanStok_${today()}.pdf`);
    showToast('📄 PDF Stok diunduh', 'success');
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-[#00C9A7]" /> Laporan Stok & Valuasi Inventori
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total unit stok fisik dan estimasi nilai kapitalisasi modal inventaris toko
          </p>
        </div>
        <button
          onClick={exportPDF}
          className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <FileText className="w-4 h-4" /> Unduh PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 shadow-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Total Produk</div>
          <div className="text-2xl font-black text-[#00C9A7]">{totalProdukCount} SKU</div>
        </div>
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 shadow-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Stok Menipis (Kritis)</div>
          <div className="text-2xl font-black text-amber-600">{lowStockCount} Produk</div>
        </div>
        <div className="p-5 rounded-3xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 shadow-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Total Valuasi Nilai Aset</div>
          <div className="text-2xl font-black text-blue-600">{fmtRp(totalValuasi)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4 text-right">Stok</th>
                <th className="py-3 px-4 text-right">Harga Beli</th>
                <th className="py-3 px-4 text-right">Nilai Aset</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((p) => {
                const isLow = p.stok <= p.stok_min;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                      {p.nama}
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">{p.stok} {p.satuan}</td>
                    <td className="py-3 px-4 text-right">{fmtRp(p.harga_beli)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#00C9A7]">
                      {fmtRp(p.stok * p.harga_beli)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${isLow ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isLow ? '⚠️ Menipis' : 'Aman'}
                      </span>
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

/* ------------------------------------------------------------------
 * 5. Laporan Keuangan (Laba Kotor / Rugi)
 * ------------------------------------------------------------------ */
export const LaporanKeuanganPage: React.FC = () => {
  const { db } = usePOS();
  const trx = (db.transaksi || []).filter((t) => t.status === 'selesai');
  const returns = db.returns || [];

  const totalPenjualan = trx.reduce((s, t) => s + t.total, 0);
  const totalModal = trx.reduce((s, t) => {
    const itemCost = (t.items || []).reduce((is, i) => {
      const p = (db.produk || []).find((prod) => prod.id === i.produk_id);
      return is + i.qty * (p?.harga_beli || 0);
    }, 0);
    return s + itemCost;
  }, 0);

  const totalRetur = returns.reduce((s, r) => s + r.total, 0);
  const labaKotor = totalPenjualan - totalModal - totalRetur;

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[#00C9A7]" /> Laporan Keuangan & Laba Kotor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analisis laba kotor dari selisih omset penjualan dikurangi harga modal HPP dan retur
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="p-5 rounded-3xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Total Omset Penjualan</div>
          <div className="text-xl md:text-2xl font-black text-[#00C9A7]">{fmtRp(totalPenjualan)}</div>
        </div>
        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Harga Pokok (HPP)</div>
          <div className="text-xl md:text-2xl font-black text-slate-700 dark:text-slate-200">{fmtRp(totalModal)}</div>
        </div>
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 shadow-xs">
          <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Total Retur Refund</div>
          <div className="text-xl md:text-2xl font-black text-amber-600">-{fmtRp(totalRetur)}</div>
        </div>
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#00C9A7] to-[#00A88E] text-white shadow-md">
          <div className="text-[11px] opacity-85 uppercase font-bold mb-1">Laba Kotor Bersih</div>
          <div className="text-xl md:text-2xl font-black">{fmtRp(labaKotor)}</div>
        </div>
      </div>
    </div>
  );
};

export const LaporanPages: React.FC<{ activeReport?: 'penjualan' | 'kasir' | 'retur' | 'stok' | 'keuangan' | string }> = ({
  activeReport = 'penjualan',
}) => {
  switch (activeReport) {
    case 'penjualan':
      return <LaporanPenjualanPage />;
    case 'kasir':
      return <LaporanKasirPage />;
    case 'retur':
      return <LaporanReturPage />;
    case 'stok':
      return <LaporanStokPage />;
    case 'keuangan':
      return <LaporanKeuanganPage />;
    default:
      return <LaporanPenjualanPage />;
  }
};
