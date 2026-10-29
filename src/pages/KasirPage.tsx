import React, { useState, useRef, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, KLASIFIKASI } from '../utils/constants';
import { Produk, Pelanggan, Transaksi } from '../types';
import {
  Search,
  ScanLine,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Check,
  PauseCircle,
  Monitor,
  User,
  AlertTriangle,
  UserPlus,
  X,
  CreditCard,
} from 'lucide-react';
import { PaymentModal } from '../components/kasir/PaymentModal';
import { StrukModal } from '../components/kasir/StrukModal';
import { QuickAddCustomerModal } from '../components/kasir/QuickAddCustomerModal';
import { CustomerDisplayModal } from '../components/kasir/CustomerDisplayModal';
import { BarcodeScannerModal } from '../components/kasir/BarcodeScannerModal';
import { ShiftModal } from '../components/modals/ShiftModal';

export const KasirPage: React.FC = () => {
  const {
    db,
    user,
    activeShift,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartCustomer,
    setCartCustomer,
    cartVoucherCode,
    cartVoucherDiskon,
    applyVoucher,
    removeVoucher,
    cartManualDiskon,
    setCartManualDiskon,
    cartSubtotal,
    cartDiskonTotal,
    cartPajakTotal,
    cartGrandTotal,
    cartTotalItems,
    holdCurrentOrder,
    showToast,
    requestPinApproval,
  } = usePOS();

  // Mode: manual or scan
  const [kasirMode, setKasirMode] = useState<'manual' | 'scan'>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKat, setSelectedKat] = useState<string>('all');

  // Scanner mode
  const [btScanInput, setBtScanInput] = useState('');
  const [scanHistory, setScanHistory] = useState<{ code: string; nama: string; time: string }[]>([]);

  // Customer dropdown
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Voucher input
  const [voucherInput, setVoucherInput] = useState('');

  // Modals state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isStrukModalOpen, setIsStrukModalOpen] = useState(false);
  const [completedTrx, setCompletedTrx] = useState<Transaksi | null>(null);
  const [isQuickAddCustOpen, setIsQuickAddCustOpen] = useState(false);
  const [isCustDisplayOpen, setIsCustDisplayOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    return (db.produk || []).filter((p) => {
      if (!p.aktif) return false;
      const matchKat = selectedKat === 'all' || p.kategori_id === selectedKat;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      return matchKat && matchQuery;
    });
  }, [db.produk, selectedKat, searchQuery]);

  // Customer autocomplete
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return (db.pelanggan || []).slice(0, 8);
    return (db.pelanggan || []).filter(
      (c) => c.nama.toLowerCase().includes(q) || c.telepon.includes(q)
    );
  }, [db.pelanggan, customerSearch]);

  // Handle hardware barcode scanner enter
  const handleBtScanKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = btScanInput.trim();
      if (!code) return;
      handleBarcodeScanned(code);
      setBtScanInput('');
    }
  };

  const handleBarcodeScanned = (code: string) => {
    const found = (db.produk || []).find(
      (p) => p.sku.toLowerCase() === code.toLowerCase() || p.barcode === code
    );
    if (found) {
      const added = addToCart(found.id);
      if (added) {
        setScanHistory((prev) => [
          { code, nama: found.nama, time: new Date().toLocaleTimeString('id-ID') },
          ...prev.slice(0, 19),
        ]);
        showToast(`+ ${found.nama} ditambahkan ke keranjang`, 'success');
      }
    } else {
      showToast(`Produk tidak ditemukan: ${code}`, 'warning');
    }
  };

  // Handle manual discount with manager authorization check
  const handleDiscountChange = (val: number) => {
    const maxKasirPct = db.master?.diskon?.kasir ?? 10;
    const maxKasirNominal = (cartSubtotal * maxKasirPct) / 100;

    if (val > maxKasirNominal && user?.role === 'kasir') {
      requestPinApproval(
        `Diskon ${fmtRp(val)} melebihi batas kasir (${maxKasirPct}% = ${fmtRp(maxKasirNominal)}). Masukkan PIN Manager/Owner:`,
        () => {
          setCartManualDiskon(val);
          showToast('Diskon disetujui oleh Manager/Owner', 'success');
        }
      );
    } else {
      setCartManualDiskon(val);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* Shift warning banner if shift not opened */}
      {!activeShift && (
        <div className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs md:text-sm">
              <b>Shift Kasir Belum Dibuka.</b> Silakan buka shift terlebih dahulu untuk merekap transaksi dan modal awal kasir.
            </div>
          </div>
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
          >
            Buka Shift
          </button>
        </div>
      )}

      {/* Main POS Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[calc(100vh-140px)]">
        {/* Left Column: Product catalog & Mode */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 p-4 md:p-5 flex flex-col overflow-hidden">
          {/* Mode Switcher */}
          <div className="flex gap-1.5 mb-3.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl shrink-0">
            <button
              onClick={() => setKasirMode('manual')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                kasirMode === 'manual'
                  ? 'bg-white dark:bg-slate-800 text-[#00C9A7] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🖱️ Katalog Manual
            </button>
            <button
              onClick={() => setKasirMode('scan')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                kasirMode === 'scan'
                  ? 'bg-white dark:bg-slate-800 text-[#00C9A7] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📷 Barcode Scanner
            </button>
          </div>

          {/* Manual Mode View */}
          {kasirMode === 'manual' ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Search & Camera Barcode */}
              <div className="flex gap-2 mb-3 shrink-0">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari produk berdasarkan nama atau SKU..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs outline-none focus:border-[#00C9A7] transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setIsBarcodeScannerOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#00C9A7] hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-100 dark:border-teal-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Buka Kamera Barcode"
                >
                  <ScanLine className="w-4 h-4" />
                  <span className="hidden sm:inline">Scan HP</span>
                </button>
              </div>

              {/* Categories Horizontal Tabs */}
              <div className="flex gap-1.5 mb-3.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
                <button
                  onClick={() => setSelectedKat('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedKat === 'all'
                      ? 'bg-[#00C9A7] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Semua ({db.produk?.filter((p) => p.aktif).length || 0})
                </button>
                {(db.kategori || []).map((kat) => {
                  const count = (db.produk || []).filter((p) => p.kategori_id === kat.id && p.aktif).length;
                  const isSelected = selectedKat === kat.id;
                  return (
                    <button
                      key={kat.id}
                      onClick={() => setSelectedKat(kat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
                        isSelected
                          ? 'bg-[#00C9A7] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>{kat.icon}</span>
                      <span>{kat.nama}</span>
                      <span className="opacity-70 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Product Grid */}
              <div className="flex-1 overflow-y-auto pr-1">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    Tidak ada produk yang cocok dengan pencarian
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredProducts.map((p) => {
                      const inCartItem = cart.find((c) => c.id === p.id);
                      const isLowStock = p.stok <= p.stok_min;
                      const isOutOfStock = p.stok <= 0;
                      const klas = KLASIFIKASI[p.klasifikasi] || { icon: '🌸', warna: 'bg-teal-50 text-teal-800' };

                      return (
                        <div
                          key={p.id}
                          onClick={() => !isOutOfStock && addToCart(p.id)}
                          className={`product-card group relative p-3 rounded-2xl border text-left flex flex-col justify-between transition-all select-none cursor-pointer ${
                            isOutOfStock
                              ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-200'
                              : inCartItem
                              ? 'border-[#00C9A7] bg-teal-50/30 dark:bg-teal-950/20 shadow-xs'
                              : 'border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:border-[#00C9A7]/60 hover:shadow-sm'
                          }`}
                        >
                          {/* Image or Icon Thumbnail */}
                          <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-700/50 mb-2 overflow-hidden relative flex items-center justify-center">
                            {p.foto ? (
                              <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-3xl opacity-80">{klas.icon}</div>
                            )}

                            {/* Cart Qty Badge if in cart */}
                            {inCartItem && (
                              <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#00C9A7] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                                {inCartItem.qty}
                              </div>
                            )}

                            {/* Out of Stock overlay */}
                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[11px] font-bold">
                                HABIS
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight">
                              {p.nama}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku}</div>
                          </div>

                          {/* Price & Stock bar */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                            <div className="font-extrabold text-xs text-[#00C9A7]">
                              {fmtRp(p.harga_jual)}
                            </div>
                            <div
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                isOutOfStock
                                  ? 'bg-slate-100 text-slate-500'
                                  : isLowStock
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              Stok {p.stok}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Scan Mode View
            <div className="flex-1 flex flex-col overflow-hidden space-y-3">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 text-center">
                <div className="text-sm font-bold text-[#00C9A7] mb-1">
                  🔍 Barcode Hardware Scanner Siap
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                  Gunakan Barcode Gun (USB/Bluetooth) atau ketik kode SKU lalu tekan Enter
                </div>
                <input
                  type="text"
                  value={btScanInput}
                  onChange={(e) => setBtScanInput(e.target.value)}
                  onKeyDown={handleBtScanKey}
                  placeholder="Scan SKU atau barcode di sini..."
                  autoFocus
                  className="w-full max-w-md mx-auto px-4 py-3 rounded-xl border-2 border-[#00C9A7] text-center font-mono text-sm bg-white dark:bg-slate-900 dark:text-white outline-none shadow-xs"
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setIsBarcodeScannerOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <ScanLine className="w-4 h-4" /> Buka Kamera HP Barcode Scanner
                </button>
              </div>

              {/* Scan History Log */}
              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Riwayat Scan Barcode
                </div>
                {scanHistory.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-10">Belum ada aktivitas scan</div>
                ) : (
                  <div className="space-y-1.5">
                    {scanHistory.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 text-xs shadow-2xs border border-slate-100 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-semibold text-slate-800 dark:text-white">{h.nama}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({h.code})</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{h.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Checkout Cart Panel (Desktop) */}
        <div className="hidden lg:flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#00C9A7]" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Keranjang Belanja</h3>
              <span className="text-xs text-slate-400 font-semibold">({cartTotalItems})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsCustDisplayOpen(true)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                title="Customer Display"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={holdCurrentOrder}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-100"
                title="Park / Hold Pesanan"
              >
                Hold
              </button>
              <button
                onClick={clearCart}
                className="text-xs px-2 py-1 text-red-500 hover:text-red-600 font-medium"
                title="Kosongkan Keranjang"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Customer Selection Row */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 relative">
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  placeholder="Cari pelanggan (nama / telp)..."
                  className="w-full pl-8 pr-6 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs outline-none focus:border-[#00C9A7]"
                />
                {customerSearch && (
                  <button
                    onClick={() => {
                      setCustomerSearch('');
                      setIsCustomerDropdownOpen(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsQuickAddCustOpen(true)}
                className="px-2.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#00C9A7] text-xs font-bold hover:bg-teal-100"
                title="Tambah Pelanggan Baru"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Dropdown Results */}
            {isCustomerDropdownOpen && (
              <div className="absolute left-3 right-3 top-12 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 max-h-48 overflow-y-auto py-1">
                <div
                  onClick={() => {
                    setCartCustomer(null);
                    setCustomerSearch('');
                    setIsCustomerDropdownOpen(false);
                  }}
                  className="px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-slate-500 font-medium"
                >
                  Umum (Non-Member)
                </div>
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setCartCustomer(c);
                      setCustomerSearch('');
                      setIsCustomerDropdownOpen(false);
                    }}
                    className="px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white">{c.nama}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">{c.telepon}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-[#00C9A7] font-bold uppercase">
                      {c.tier} · {c.poin} pt
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Customer Card */}
            {cartCustomer && (
              <div className="mt-2 p-2 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#00C9A7]" /> {cartCustomer.nama}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {cartCustomer.telepon} · Saldo Poin: <b className="text-[#00C9A7]">{cartCustomer.poin}</b>
                  </div>
                </div>
                <button
                  onClick={() => setCartCustomer(null)}
                  className="text-xs text-red-500 hover:text-red-700 p-1"
                  title="Batalkan pelanggan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Keranjang masih kosong. Klik produk di sebelah kiri untuk menambahkan.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-slate-800 dark:text-white leading-tight">
                      {item.nama}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="font-bold text-[#00C9A7]">{fmtRp(item.subtotal)}</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(item.id, item.qty - 1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 text-slate-700 dark:text-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateCartQty(item.id, Number(e.target.value) || 1)}
                        className="w-9 py-0.5 text-center font-bold text-xs border border-slate-200 dark:border-slate-700 rounded-md dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        onClick={() => updateCartQty(item.id, item.qty + 1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 text-slate-700 dark:text-slate-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing Calculation Summary */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800 dark:text-white">{fmtRp(cartSubtotal)}</span>
            </div>

            {/* Voucher input */}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Voucher</span>
              {cartVoucherCode ? (
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-md bg-teal-100 text-[#00C9A7] font-bold text-[10px]">
                    {cartVoucherCode} (-{cartVoucherDiskon}%)
                  </span>
                  <button onClick={removeVoucher} className="text-red-500 font-bold hover:underline">
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="Kode..."
                    className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 uppercase font-mono text-[10px]"
                  />
                  <button
                    onClick={() => {
                      const res = applyVoucher(voucherInput);
                      showToast(res.msg, res.success ? 'success' : 'warning');
                      if (res.success) setVoucherInput('');
                    }}
                    className="px-2 py-1 rounded-lg bg-[#00C9A7] text-white text-[10px] font-bold"
                  >
                    ✓
                  </button>
                </div>
              )}
            </div>

            {/* Manual Discount */}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Diskon Manual (Rp)</span>
              <input
                type="number"
                min="0"
                value={cartManualDiskon || ''}
                onChange={(e) => handleDiscountChange(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-right text-xs"
              />
            </div>

            {/* Tax */}
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>
                Pajak {db.master?.pajak?.nama || 'PPN'} ({db.master?.pajak?.persen || 0}%)
              </span>
              <span className="font-semibold text-slate-800 dark:text-white">{fmtRp(cartPajakTotal)}</span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-center text-sm font-extrabold border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-900 dark:text-white">
              <span>Total Akhir</span>
              <span className="text-lg text-[#00C9A7]">{fmtRp(cartGrandTotal)}</span>
            </div>

            {/* Pay Button */}
            <button
              onClick={() => setIsPayModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full py-3.5 rounded-2xl bg-[#00C9A7] hover:bg-[#00B894] text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              <CreditCard className="w-4 h-4" /> BAYAR SEKARANG ({fmtRp(cartGrandTotal)})
            </button>
          </div>
        </div>
      </div>

      {/* Floating Mobile Cart Trigger Button */}
      <button
        onClick={() => setIsMobileCartOpen(true)}
        className="fixed bottom-5 right-5 z-30 lg:hidden bg-[#00C9A7] text-white rounded-full px-5 py-3.5 shadow-2xl flex items-center gap-2.5 font-bold animate-slide-up"
      >
        <ShoppingCart className="w-5 h-5" />
        <span>{cartTotalItems}</span>
        <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">{fmtRp(cartGrandTotal)}</span>
      </button>

      {/* Mobile Cart Bottom Sheet */}
      {isMobileCartOpen && (
        <div
          className="fixed inset-0 z-[55] flex items-end justify-center modal-backdrop lg:hidden animate-fade-in"
          onClick={() => setIsMobileCartOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 w-full rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle"></div>
            <div className="px-5 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#00C9A7]" />
                <h3 className="font-bold text-base text-slate-800 dark:text-white">Keranjang Belanja</h3>
                <span className="text-xs text-slate-400">({cartTotalItems} item)</span>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Cart Items */}
            <div className="p-4 space-y-2 overflow-y-auto flex-1">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">Keranjang masih kosong</div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">{item.nama}</div>
                      <div className="text-slate-400 mt-0.5">{fmtRp(item.harga)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-white dark:bg-slate-800">
                        <button
                          onClick={() => updateCartQty(item.id, item.qty - 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold">{item.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.id, item.qty + 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300"
                        >
                          +
                        </button>
                      </div>
                      <div className="font-bold text-[#00C9A7] min-w-[70px] text-right">
                        {fmtRp(item.subtotal)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile Cart Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-2 bg-slate-50 dark:bg-slate-900/60 text-xs">
              <div className="flex justify-between font-bold text-base text-slate-900 dark:text-white">
                <span>Total:</span>
                <span className="text-[#00C9A7]">{fmtRp(cartGrandTotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    holdCurrentOrder();
                    setIsMobileCartOpen(false);
                  }}
                  className="py-3 rounded-xl bg-amber-500 text-white font-bold text-xs"
                >
                  Hold Pesanan
                </button>
                <button
                  onClick={() => {
                    setIsMobileCartOpen(false);
                    setIsPayModalOpen(true);
                  }}
                  disabled={cart.length === 0}
                  className="py-3 rounded-xl bg-[#00C9A7] text-white font-bold text-xs disabled:opacity-50"
                >
                  BAYAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onPaymentSuccess={(trx) => {
          setCompletedTrx(trx);
          setIsStrukModalOpen(true);
        }}
      />

      {/* Struk / Receipt Modal */}
      <StrukModal
        isOpen={isStrukModalOpen}
        onClose={() => setIsStrukModalOpen(false)}
        trx={completedTrx}
        master={db.master}
      />

      {/* Quick Add Customer Modal */}
      <QuickAddCustomerModal
        isOpen={isQuickAddCustOpen}
        onClose={() => setIsQuickAddCustOpen(false)}
        onCustomerAdded={(c) => setCartCustomer(c)}
      />

      {/* Customer Display Screen Modal */}
      <CustomerDisplayModal
        isOpen={isCustDisplayOpen}
        onClose={() => setIsCustDisplayOpen(false)}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanned={handleBarcodeScanned}
      />

      {/* Shift Modal */}
      <ShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} />
    </div>
  );
};
