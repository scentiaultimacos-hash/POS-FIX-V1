import React from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, fmtTgl } from '../utils/constants';
import { PauseCircle, ArrowRight, Trash2, ShoppingCart, Clock } from 'lucide-react';

export const PendingPage: React.FC = () => {
  const { db, restorePendingOrder, deletePendingOrder, setCurrentPage } = usePOS();
  const list = db.pending_orders || [];

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <PauseCircle className="w-6 h-6 text-amber-500" /> Pending Order (Hold)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar transaksi tertunda yang diparkir sementara oleh kasir
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs">
          {list.length} Order Tertunda
        </span>
      </div>

      {list.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-700/60 shadow-xs">
          <PauseCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1">
            Tidak Ada Order Tertunda
          </h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            Gunakan tombol <b>Hold</b> di halaman Kasir untuk menahan transaksi pelanggan sementara.
          </p>
          <button
            onClick={() => setCurrentPage('kasir')}
            className="px-4 py-2 rounded-xl bg-[#00C9A7] text-white text-xs font-bold hover:bg-[#00B894] transition-colors"
          >
            Buka Kasir (POS)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    {order.nomor}
                  </span>
                  <button
                    onClick={() => deletePendingOrder(order.id)}
                    className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="Hapus order tertunda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(order.created_at).toLocaleTimeString('id-ID')}</span>
                  <span>·</span>
                  <span>{fmtTgl(order.tanggal)}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1 mb-4 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Pelanggan:</span>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {order.pelanggan ? order.pelanggan.nama : 'Umum'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Total Item:</span>
                    <span className="font-semibold">{order.items.reduce((s, i) => s + i.qty, 0)} pcs</span>
                  </div>
                  <div className="flex justify-between text-slate-800 dark:text-white font-extrabold pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Total Bayar:</span>
                    <span className="text-[#00C9A7]">{fmtRp(order.total)}</span>
                  </div>
                </div>

                {/* Items preview snippet */}
                <div className="text-[11px] text-slate-500 mb-4 space-y-0.5">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between truncate">
                      <span className="truncate">
                        {item.qty}x {item.nama}
                      </span>
                      <span className="font-semibold">{fmtRp(item.subtotal)}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="text-[10px] text-slate-400 italic">
                      +{order.items.length - 3} item lainnya...
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => {
                  restorePendingOrder(order);
                  setCurrentPage('kasir');
                }}
                className="w-full py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <ShoppingCart className="w-4 h-4" /> Lanjutkan ke Kasir <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
