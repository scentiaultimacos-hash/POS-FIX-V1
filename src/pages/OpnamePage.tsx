import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { KLASIFIKASI, nowISO, today, uuid } from '../utils/constants';
import { ClipboardList, ScanLine, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { BarcodeScannerModal } from '../components/kasir/BarcodeScannerModal';

export const OpnamePage: React.FC = () => {
  const { db, updateDb, user, showToast, showConfirm, logActivity } = usePOS();
  const [search, setSearch] = useState('');
  const [filterKlas, setFilterKlas] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Physical stock map: { [productId]: number }
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    (db.produk || []).forEach((p) => {
      init[p.id] = p.stok;
    });
    return init;
  });

  const filteredProducts = useMemo(() => {
    return (db.produk || []).filter((p) => {
      if (!p.aktif) return false;
      const matchKlas = !filterKlas || p.klasifikasi === filterKlas;
      const matchSearch =
        !search ||
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      return matchKlas && matchSearch;
    });
  }, [db.produk, filterKlas, search]);

  const handlePhysicalChange = (productId: string, val: number) => {
    setPhysicalCounts((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  const handleBarcodeScanned = (code: string) => {
    const p = (db.produk || []).find((x) => x.sku === code || x.barcode === code);
    if (p) {
      setPhysicalCounts((prev) => ({
        ...prev,
        [p.id]: (prev[p.id] !== undefined ? prev[p.id] : p.stok) + 1,
      }));
      showToast(`+1 Stok fisik: ${p.nama}`, 'success');
    } else {
      showToast(`Produk tidak ditemukan: ${code}`, 'warning');
    }
  };

  const handleSaveOpname = () => {
    showConfirm(
      'Simpan Stock Opname',
      'Stok fisik yang Anda masukkan akan memperbarui saldo stok produk di sistem. Lanjutkan simpan?',
      () => {
        const opnameItems = (db.produk || []).map((p) => {
          const fisik = physicalCounts[p.id] !== undefined ? physicalCounts[p.id] : p.stok;
          return {
            produk_id: p.id,
            nama: p.nama,
            stok_sistem: p.stok,
            stok_fisik: fisik,
            selisih: fisik - p.stok,
          };
        });

        // 1. Update product stocks in DB
        updateDb((prev) => {
          const updatedProduk = (prev.produk || []).map((p) => {
            const fisik = physicalCounts[p.id];
            if (fisik !== undefined) {
              return { ...p, stok: fisik };
            }
            return p;
          });

          // 2. Add opname session record
          const newSession = {
            id: uuid(),
            tanggal: today(),
            petugas: user?.nama || 'Petugas',
            items: opnameItems,
            created_at: nowISO(),
          };

          return {
            ...prev,
            produk: updatedProduk,
            opname_sessions: [newSession, ...(prev.opname_sessions || [])],
          };
        });

        logActivity('Simpan hasil Stock Opname produk', 'Stok');
        showToast('✅ Stock Opname berhasil disimpan dan stok disesuaikan', 'success');
      },
      'warning'
    );
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#00C9A7]" /> Stock Opname Fisik
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cocokkan stok di rak toko dengan data sistem. Scan barcode akan menambah +1 stok fisik secara otomatis.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ScanLine className="w-4 h-4" /> Scan Barcode Opname
          </button>
          <button
            onClick={handleSaveOpname}
            className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" /> Simpan Opname
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-xs border border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk..."
          className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
        />
        <select
          value={filterKlas}
          onChange={(e) => setFilterKlas(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-xs outline-none focus:border-[#00C9A7]"
        >
          <option value="">Semua Klasifikasi</option>
          {Object.entries(KLASIFIKASI).map(([k, v]) => (
            <option key={k} value={k}>
              {v.icon} {v.nama}
            </option>
          ))}
        </select>
      </div>

      {/* Opname Comparison Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Produk & SKU</th>
                <th className="py-3 px-4 text-right">Stok Sistem</th>
                <th className="py-3 px-4 text-center w-36">Hitung Fisik</th>
                <th className="py-3 px-4 text-right">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((p) => {
                const fisik = physicalCounts[p.id] !== undefined ? physicalCounts[p.id] : p.stok;
                const selisih = fisik - p.stok;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-white">{p.nama}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {p.stok} {p.satuan}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        value={fisik}
                        onChange={(e) => handlePhysicalChange(p.id, Number(e.target.value) || 0)}
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-center font-extrabold text-sm focus:border-[#00C9A7] outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full ${
                          selisih === 0
                            ? 'bg-slate-100 text-slate-600'
                            : selisih < 0
                            ? 'bg-red-100 text-red-600'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {selisih > 0 ? `+${selisih}` : selisih} {p.satuan}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanned={handleBarcodeScanned}
      />
    </div>
  );
};
