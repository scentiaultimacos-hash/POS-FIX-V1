import React, { useRef, useState, useEffect } from 'react';
import { Transaksi, MasterSettings, Pelanggan } from '../../types';
import { fmtRp, fmtTgl } from '../../utils/constants';
import { Printer, Send, X, CheckCircle2, MessageCircle } from 'lucide-react';
import { usePOS } from '../../context/POSContext';

interface StrukModalProps {
  isOpen: boolean;
  onClose: () => void;
  trx: Transaksi | null;
  master: MasterSettings;
}

export const StrukModal: React.FC<StrukModalProps> = ({ isOpen, onClose, trx, master }) => {
  const { db } = usePOS();
  const printRef = useRef<HTMLDivElement>(null);
  const [waPhone, setWaPhone] = useState<string>('');
  const [isWaSent, setIsWaSent] = useState<boolean>(false);

  // Auto-fill WhatsApp number from customer if available
  useEffect(() => {
    if (trx?.pelanggan_id) {
      const cust = (db.pelanggan || []).find((c: Pelanggan) => c.id === trx.pelanggan_id);
      if (cust && cust.telepon && cust.telepon !== '-') {
        setWaPhone(cust.telepon);
        return;
      }
    }
    setWaPhone('');
    setIsWaSent(false);
  }, [trx, db.pelanggan]);

  if (!isOpen || !trx) return null;

  const toko = master.toko || {
    nama: 'King Parfum',
    telepon: '0812-3456-7890',
    alamat: 'Jl. Merdeka No. 10, Jakarta',
    footer: 'Terima kasih telah berbelanja! 🌸',
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWA = () => {
    const raw = waPhone.trim() || '628';
    let cleanPhone = raw.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    if (!cleanPhone || cleanPhone.length < 9) {
      alert('Harap masukkan nomor WhatsApp yang valid (misal: 08123456789 atau 628123456789)');
      return;
    }

    const itemsText = (trx.items || [])
      .map((i) => `• ${i.nama} x${i.qty} = ${fmtRp(i.subtotal)}`)
      .join('\n');

    const metodeText = (trx.metode || []).map((m) => m.nama).join(', ');
    const msg = `*${toko.nama}*\n${toko.alamat}\nTelp: ${toko.telepon}\n\n*STRUK PEMBELIAN*\nNo: ${trx.nomor}\nTanggal: ${fmtTgl(trx.tanggal)}\nKasir: ${trx.kasir_nama}\n${trx.pelanggan_nama ? `Pelanggan: ${trx.pelanggan_nama}\n` : ''}\n--------------------------------\n${itemsText}\n--------------------------------\nSubtotal: ${fmtRp(trx.subtotal)}\n${trx.diskon ? `Diskon: -${fmtRp(trx.diskon)}\n` : ''}${trx.pajak ? `Pajak: ${fmtRp(trx.pajak)}\n` : ''}*TOTAL: ${fmtRp(trx.total)}*\nBayar: ${fmtRp(trx.bayar)}\nKembali: ${fmtRp(trx.kembalian)}\nMetode: ${metodeText}\n\n${toko.footer}`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setIsWaSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Transaksi Berhasil</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Paper Simulation */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-900/60 flex justify-center">
          <div
            id="printableStruk"
            ref={printRef}
            className="w-full max-w-[320px] bg-white p-5 rounded-xl shadow-xs text-slate-800 font-mono text-[11px] leading-relaxed border border-slate-200"
          >
            {/* Store branding */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="font-extrabold text-sm uppercase tracking-wide">{toko.nama}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{toko.alamat}</div>
              <div className="text-[10px] text-slate-500">Telp: {toko.telepon}</div>
            </div>

            {/* Trx details */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>No. Inv:</span>
                <span className="font-bold">{trx.nomor}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{new Date(trx.created_at).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{trx.kasir_nama}</span>
              </div>
              {trx.pelanggan_nama && (
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-semibold">{trx.pelanggan_nama}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5">
              {(trx.items || []).map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-medium text-slate-900">{item.nama}</div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>
                      {item.qty} x {fmtRp(item.harga)}
                    </span>
                    <span className="font-bold text-slate-800">{fmtRp(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{fmtRp(trx.subtotal)}</span>
              </div>
              {trx.diskon > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon:</span>
                  <span>-{fmtRp(trx.diskon)}</span>
                </div>
              )}
              {trx.pajak > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Pajak (PPN):</span>
                  <span>+{fmtRp(trx.pajak)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{fmtRp(trx.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Metode:</span>
                <span className="font-semibold">{(trx.metode || []).map((m) => m.nama).join(', ')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Bayar:</span>
                <span>{fmtRp(trx.bayar)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Kembalian:</span>
                <span>{fmtRp(trx.kembalian)}</span>
              </div>
              {(trx.metode || []).some((m) => m.nama.toLowerCase().includes('kasbon')) && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-center text-amber-800 font-bold text-[10px]">
                  STATUS: KASBON / TEMPO (PIUTANG)
                </div>
              )}
            </div>

            {/* Points earned */}
            {trx.poin_didapat > 0 && (
              <div className="py-2 border-b border-dashed border-slate-300 text-center text-[10px] text-amber-700 font-semibold bg-amber-50 rounded-md my-2">
                🎁 Poin Didapat: +{trx.poin_didapat} Poin
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500 leading-normal">
              {toko.footer}
              <div className="text-[8px] text-slate-400 mt-1">Parfumku POS v7.0</div>
            </div>
          </div>
        </div>

        {/* WhatsApp & Print Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-3 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MessageCircle className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="No. WA Pelanggan (08...)"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:border-emerald-500 font-medium"
              />
            </div>
            <button
              onClick={handleSendWA}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> {isWaSent ? 'Kirim Ulang' : 'Kirim WA'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak Thermal (Print)
            </button>
            <button
              onClick={onClose}
              className="py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
