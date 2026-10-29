import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { fmtRp, nowISO, today, uuid, playSound } from '../../utils/constants';
import { Transaksi, PaymentMethodConfig } from '../../types';
import {
  X,
  CreditCard,
  QrCode,
  Banknote,
  Smartphone,
  Building2,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import QRCode from 'qrcode';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (trx: Transaksi) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const {
    user,
    db,
    updateDb,
    cart,
    cartCustomer,
    cartSubtotal,
    cartDiskonTotal,
    cartPajakTotal,
    cartGrandTotal,
    cartVoucherCode,
    activeShift,
    clearCart,
    showToast,
    logActivity,
  } = usePOS();

  const [selectedMethodId, setSelectedMethodId] = useState<string>('pm1');
  const [dibayar, setDibayar] = useState<number>(cartGrandTotal);
  const [buktiTransfer, setBuktiTransfer] = useState<string | null>(null);
  const [qrisQrUrl, setQrisQrUrl] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);

  // Sync dibayar when cartGrandTotal changes
  useEffect(() => {
    setDibayar(cartGrandTotal);
  }, [cartGrandTotal]);

  const paymentMethods: PaymentMethodConfig[] = db.master?.pembayaran?.filter((m) => m.aktif) || [
    { id: 'pm1', nama: 'Tunai', icon: '💵', biaya: 0, aktif: true },
    { id: 'pm2', nama: 'Debit', icon: '💳', biaya: 0, aktif: true },
    { id: 'pm3', nama: 'QRIS', icon: '📱', biaya: 0.7, aktif: true },
    { id: 'pm4', nama: 'Transfer', icon: '🏦', biaya: 0, aktif: true },
    { id: 'pm5', nama: 'E-Wallet', icon: '📲', biaya: 0, aktif: true },
  ];

  const currentMethod = paymentMethods.find((m) => m.id === selectedMethodId) || paymentMethods[0];

  // Fee calculation if any
  const feePercent = currentMethod?.biaya || 0;
  const feeAmount = feePercent > 0 ? Math.round((cartGrandTotal * feePercent) / 100) : 0;
  const finalTotal = cartGrandTotal + feeAmount;

  const kembalian = Math.max(0, dibayar - finalTotal);
  const isKurang = dibayar < finalTotal;

  // Generate QR code for QRIS
  useEffect(() => {
    if (selectedMethodId === 'pm3') {
      const qrisPayload = `00020101021226${finalTotal}5204581253033605802ID5911KING_PARFUM6007JAKARTA`;
      QRCode.toDataURL(qrisPayload, { width: 220, margin: 1 })
        .then((url) => setQrisQrUrl(url))
        .catch(() => {});
    }
  }, [selectedMethodId, finalTotal]);

  if (!isOpen) return null;

  // Handle image upload for transfer proof
  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBuktiTransfer(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessPayment = () => {
    if (cart.length === 0) {
      showToast('Keranjang belanja kosong', 'error');
      return;
    }

    if (isKurang && currentMethod.nama === 'Tunai') {
      showToast('Uang yang dibayarkan masih kurang', 'error');
      return;
    }

    setProcessing(true);

    const pointsRate = db.master?.poin?.rate || 1000;
    const pointsEarned = db.master?.poin?.aktif ? Math.floor(cartSubtotal / pointsRate) : 0;

    const trxId = uuid();
    const invNumber = 'INV-' + today().replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    const newTrx: Transaksi = {
      id: trxId,
      nomor: invNumber,
      tanggal: today(),
      kasir_id: user?.id || 'kr_1',
      kasir_nama: user?.nama || 'Kasir',
      pelanggan_id: cartCustomer?.id,
      pelanggan_nama: cartCustomer?.nama,
      items: cart.map((i) => ({
        produk_id: i.id,
        nama: i.nama,
        harga: i.harga,
        qty: i.qty,
        subtotal: i.subtotal,
      })),
      subtotal: cartSubtotal,
      diskon: cartDiskonTotal,
      voucher_kode: cartVoucherCode || undefined,
      pajak: cartPajakTotal,
      total: finalTotal,
      bayar: dibayar,
      kembalian,
      metode: [
        {
          id: currentMethod.id,
          nama: currentMethod.nama,
          icon: currentMethod.icon,
          jumlah: finalTotal,
        },
      ],
      status: 'selesai',
      poin_didapat: pointsEarned,
      bukti_transfer: buktiTransfer || undefined,
      created_at: nowISO(),
    };

    // Update DB: add transaction, deduct products stock, update customer points, update shift stats
    updateDb((prev) => {
      // 1. Deduct product stocks
      const updatedProduk = (prev.produk || []).map((p) => {
        const inCart = cart.find((c) => c.id === p.id);
        if (inCart) {
          return { ...p, stok: Math.max(0, p.stok - inCart.qty) };
        }
        return p;
      });

      // 2. Update customer points & spending
      const updatedPelanggan = (prev.pelanggan || []).map((cust) => {
        if (cartCustomer && cust.id === cartCustomer.id) {
          const newPoints = cust.poin + pointsEarned;
          const newSpent = cust.total_belanja + finalTotal;
          const newTier: 'bronze' | 'silver' | 'gold' =
            newSpent >= 5000000 ? 'gold' : newSpent >= 2000000 ? 'silver' : 'bronze';
          return {
            ...cust,
            poin: newPoints,
            total_belanja: newSpent,
            tier: newTier,
          };
        }
        return cust;
      });

      // 3. Update active shift omset
      const updatedShifts = (prev.shifts || []).map((s) => {
        if (activeShift && s.id === activeShift.id) {
          return {
            ...s,
            total_penjualan: (s.total_penjualan || 0) + finalTotal,
            total_transaksi: (s.total_transaksi || 0) + 1,
          };
        }
        return s;
      });

      // 4. Record loyalty ledger if points earned
      const newLedger = pointsEarned > 0 && cartCustomer
        ? [
            {
              id: uuid(),
              pelanggan_id: cartCustomer.id,
              pelanggan_nama: cartCustomer.nama,
              tipe: 'earn' as const,
              poin: pointsEarned,
              keterangan: `Transaksi ${invNumber}`,
              created_at: nowISO(),
            },
            ...(prev.point_ledger || []),
          ]
        : prev.point_ledger || [];

      // 5. Update voucher usage
      const updatedVouchers = (prev.vouchers || []).map((v) => {
        if (v.kode === cartVoucherCode) {
          return { ...v, terpakai: v.terpakai + 1 };
        }
        return v;
      });

      return {
        ...prev,
        produk: updatedProduk,
        pelanggan: updatedPelanggan,
        shifts: updatedShifts,
        point_ledger: newLedger,
        vouchers: updatedVouchers,
        transaksi: [newTrx, ...(prev.transaksi || [])],
      };
    });

    logActivity(`Transaksi ${invNumber} (${fmtRp(finalTotal)})`, 'Kasir');
    playSound('success', db.master?.sound?.aktif);
    showToast('✅ Pembayaran berhasil dicatat', 'success');

    clearCart();
    setProcessing(false);
    onClose();
    onPaymentSuccess(newTrx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center modal-backdrop p-0 md:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full md:rounded-3xl md:max-w-lg shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-bottom md:animate-slide-up flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#00C9A7] flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Proses Pembayaran</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {cart.length} item · {cartCustomer ? cartCustomer.nama : 'Umum (Non-Member)'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Total Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00C9A7] to-[#00A88E] text-white text-center shadow-sm">
            <div className="text-xs opacity-85 font-medium mb-1">Total Tagihan Pembayaran</div>
            <div className="text-3xl font-black tracking-tight">{fmtRp(finalTotal)}</div>
            {feeAmount > 0 && (
              <div className="text-[10px] opacity-80 mt-1">
                Termasuk Biaya Layanan {currentMethod.nama} {feePercent}% (+{fmtRp(feeAmount)})
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {paymentMethods.map((m) => {
                const isSelected = selectedMethodId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethodId(m.id);
                      if (m.nama !== 'Tunai') {
                        setDibayar(cartGrandTotal + (m.biaya > 0 ? Math.round((cartGrandTotal * m.biaya) / 100) : 0));
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-[#00C9A7] bg-teal-50 dark:bg-teal-950/40 text-[#00C9A7] font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{m.icon}</div>
                    <div className="text-xs truncate">{m.nama}</div>
                    {m.biaya > 0 && <div className="text-[9px] text-amber-600 font-semibold">+{m.biaya}%</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* QRIS View */}
          {currentMethod.nama === 'QRIS' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center space-y-2 animate-fade-in">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Scan QRIS Dinamis (GoPay, OVO, Dana, BCA, Livin)
              </div>
              {qrisQrUrl ? (
                <img src={qrisQrUrl} alt="QRIS QR" className="w-48 h-48 mx-auto rounded-xl shadow-xs bg-white p-2" />
              ) : (
                <div className="w-48 h-48 mx-auto bg-slate-200 animate-pulse rounded-xl"></div>
              )}
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Nominal Pas: <b className="text-slate-800 dark:text-white">{fmtRp(finalTotal)}</b>
              </div>
            </div>
          )}

          {/* Tunai / Cash View */}
          {currentMethod.nama === 'Tunai' && (
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Uang Diterima (Cash Tendered)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Rp</span>
                  <input
                    type="number"
                    value={dibayar || ''}
                    onChange={(e) => setDibayar(Number(e.target.value) || 0)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-extrabold text-lg focus:border-[#00C9A7] outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setDibayar(finalTotal)}
                  className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-[#00C9A7] font-bold text-xs hover:bg-teal-100 transition-colors"
                >
                  Uang Pas
                </button>
                {[50000, 100000, 200000, 500000].map((amt) => {
                  if (amt >= finalTotal) {
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDibayar(amt)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                      >
                        {fmtRp(amt)}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Kembalian Display */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Uang Kembalian:</span>
                <span className={`font-extrabold text-base ${isKurang ? 'text-red-500' : 'text-[#00C9A7]'}`}>
                  {isKurang ? `Kurang -${fmtRp(finalTotal - dibayar)}` : fmtRp(kembalian)}
                </span>
              </div>
            </div>
          )}

          {/* Transfer Proof Upload */}
          {(currentMethod.nama === 'Transfer' || currentMethod.nama === 'Debit') && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-500" /> Upload Bukti Transfer / Struk EDC
                </label>
                {buktiTransfer && (
                  <button
                    type="button"
                    onClick={() => setBuktiTransfer(null)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleProofUpload}
                className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-slate-500"
              />
              {buktiTransfer && (
                <div className="mt-2">
                  <img src={buktiTransfer} alt="Bukti" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                </div>
              )}
            </div>
          )}

          {/* Points summary */}
          {db.master?.poin?.aktif && cartCustomer && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>🎁 Poin Loyalty yang akan didapat:</span>
              <span className="font-bold">+{Math.floor(cartSubtotal / (db.master?.poin?.rate || 1000))} Poin</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 bg-slate-50 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={processing || (isKurang && currentMethod.nama === 'Tunai')}
            onClick={handleProcessPayment}
            className="flex-1 py-3 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {processing ? (
              <span className="animate-spin">⏳ Menyimpan...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Simpan & Cetak Struk
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
