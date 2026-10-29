import React from 'react';
import { usePOS } from '../../context/POSContext';
import { fmtRp } from '../../utils/constants';
import { Monitor, X, ShoppingBag } from 'lucide-react';

interface CustomerDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerDisplayModal: React.FC<CustomerDisplayModalProps> = ({ isOpen, onClose }) => {
  const { cart, cartGrandTotal, db } = usePOS();
  const storeName = db.master?.toko?.nama || 'King Parfum';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4 animate-fade-in">
      <div className="bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-700 animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-5 h-5 text-[#00C9A7]" />
            <h3 className="font-bold text-white text-base">Customer Display Screen</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-white space-y-6 overflow-y-auto flex-1">
          {/* Big Total Box */}
          <div className="text-center p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Total Tagihan Belanja</div>
            <div className="text-4xl md:text-5xl font-black text-[#00C9A7] tracking-tight">{fmtRp(cartGrandTotal)}</div>
          </div>

          {/* Items List */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Daftar Item Keranjang</div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Belum ada item dalam transaksi
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-850 border border-slate-800 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-slate-100">{item.nama}</div>
                      <div className="text-xs text-slate-400">
                        {item.qty} x {fmtRp(item.harga)}
                      </div>
                    </div>
                    <div className="font-bold text-[#00C9A7]">{fmtRp(item.subtotal)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-xs text-slate-500 pt-3 border-t border-slate-800">
            Terima kasih telah berbelanja di <b className="text-slate-300">{storeName}</b> 🙏
          </div>
        </div>
      </div>
    </div>
  );
};
