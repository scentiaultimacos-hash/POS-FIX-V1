import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { MasterSettings } from '../types';
import { Store, Receipt, Percent, CreditCard, Cloud, Save, Upload, RotateCcw } from 'lucide-react';

interface FormSettings {
  nama_toko: string;
  alamat: string;
  telepon: string;
  email: string;
  website: string;
  logo_url: string;
  footer_struk: string;
  printer_mode: string;
  pajak_persen: number;
  biaya_layanan_persen: number;
  poin_per_rupiah: number;
  nilai_per_poin: number;
  qris_merchant_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  supabase_url: string;
  supabase_anon_key: string;
}

export const MasterPage: React.FC = () => {
  const { db, setDb, addNotification } = usePOS();
  const [activeTab, setActiveTab] = useState<'profil' | 'struk' | 'pajak' | 'bayar' | 'cloud'>('profil');

  const [form, setForm] = useState<FormSettings>(() => {
    const s = (db.settings || {}) as any;
    const m = (db.master || {}) as any;
    return {
      nama_toko: s.nama_toko || m.toko?.nama || 'PARFUMKU STORE',
      alamat: s.alamat || m.toko?.alamat || 'Jl. Malioboro No. 45, Yogyakarta',
      telepon: s.telepon || m.toko?.telepon || '0812-3456-7890',
      email: s.email || 'info@parfumku.id',
      website: s.website || 'www.parfumku.id',
      logo_url: s.logo_url || m.logo || '',
      footer_struk: s.footer_struk || m.toko?.footer || 'Terima Kasih Atas Kunjungan Anda',
      printer_mode: s.printer_mode || (m.struk?.kertas === '80' ? '80mm' : '58mm'),
      pajak_persen: s.pajak_persen ?? m.pajak?.persen ?? 0,
      biaya_layanan_persen: s.biaya_layanan_persen ?? 0,
      poin_per_rupiah: s.poin_per_rupiah ?? m.poin?.rate ?? 10000,
      nilai_per_poin: s.nilai_per_poin ?? 100,
      qris_merchant_name: s.qris_merchant_name || 'PARFUMKU STORE',
      bank_name: s.bank_name || 'BCA',
      bank_account_number: s.bank_account_number || '123-456-7890',
      bank_account_holder: s.bank_account_holder || 'PT Parfumku Indonesia',
      supabase_url: s.supabase_url || '',
      supabase_anon_key: s.supabase_anon_key || '',
    };
  });

  const handleChange = (field: keyof FormSettings, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleChange('logo_url', reader.result as string);
        addNotification('Logo toko berhasil dimuat', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setDb(prev => ({
      ...prev,
      settings: {
        ...(prev.settings || {}),
        ...form,
        toko: {
          nama: form.nama_toko,
          telepon: form.telepon,
          alamat: form.alamat,
          footer: form.footer_struk,
        },
      } as any,
      master: {
        ...prev.master,
        logo: form.logo_url || prev.master.logo,
        toko: {
          ...prev.master.toko,
          nama: form.nama_toko,
          alamat: form.alamat,
          telepon: form.telepon,
          footer: form.footer_struk,
        },
        pajak: {
          ...prev.master.pajak,
          persen: form.pajak_persen,
          aktif: form.pajak_persen > 0,
        },
        struk: {
          ...prev.master.struk,
          kertas: form.printer_mode === '80mm' ? '80' : '58',
        },
      }
    }));
    addNotification('Pengaturan Toko berhasil disimpan', 'success');
  };

  const handleResetDefaults = () => {
    if (window.confirm('Kembalikan semua pengaturan ke nilai default?')) {
      const defaults: FormSettings = {
        nama_toko: 'PARFUMKU STORE',
        alamat: 'Jl. Malioboro No. 45, Yogyakarta',
        telepon: '0812-3456-7890',
        email: 'info@parfumku.id',
        website: 'www.parfumku.id',
        logo_url: '',
        footer_struk: 'Terima Kasih Atas Kunjungan Anda\nBarang yang sudah dibeli tidak dapat ditukar',
        pajak_persen: 0,
        biaya_layanan_persen: 0,
        poin_per_rupiah: 10000,
        nilai_per_poin: 100,
        printer_mode: '58mm',
        qris_merchant_name: 'PARFUMKU STORE',
        bank_name: 'BCA',
        bank_account_number: '123-456-7890',
        bank_account_holder: 'PT Parfumku Indonesia',
        supabase_url: '',
        supabase_anon_key: '',
      };
      setForm(defaults);
      setDb(prev => ({
        ...prev,
        settings: { ...(prev.settings || {}), ...defaults } as any
      }));
      addNotification('Pengaturan dikembalikan ke default', 'info');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            Pengaturan Master Toko
          </h1>
          <p className="text-xs md:text-sm text-slate-500">Konfigurasi profil usaha, format struk, loyalty poin, dan rekening pembayaran</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl border border-app-border text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RotateCcw className="w-4 h-4" /> Reset Default
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" /> Simpan Pengaturan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-app-border space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profil')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'profil'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Store className="w-4 h-4" /> Profil Usaha
        </button>
        <button
          onClick={() => setActiveTab('struk')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'struk'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Receipt className="w-4 h-4" /> Format Struk & Printer
        </button>
        <button
          onClick={() => setActiveTab('pajak')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'pajak'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Percent className="w-4 h-4" /> Pajak & Poin Loyalty
        </button>
        <button
          onClick={() => setActiveTab('bayar')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'bayar'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Akun Pembayaran & QRIS
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'cloud'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Cloud className="w-4 h-4" /> Supabase Cloud Sync
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-app-border p-6 shadow-card max-w-4xl">
        {/* Tab 1: Profil */}
        {activeTab === 'profil' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-app-border">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-app-border bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Store className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-200">
                  <Upload className="w-4 h-4 text-primary" /> Unggah Logo Toko
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">Format PNG / JPG transparan, maks 500KB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Nama Toko / Outlet</label>
                <input
                  type="text"
                  value={form.nama_toko}
                  onChange={e => handleChange('nama_toko', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Nomor Telepon / WhatsApp Toko</label>
                <input
                  type="text"
                  value={form.telepon}
                  onChange={e => handleChange('telepon', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-500 font-bold mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={form.alamat}
                  onChange={e => handleChange('alamat', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Email Toko</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Website Toko</label>
                <input
                  type="text"
                  value={form.website || ''}
                  onChange={e => handleChange('website', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Struk */}
        {activeTab === 'struk' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Ukuran Kertas Printer Thermal</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="printer_mode"
                    value="58mm"
                    checked={form.printer_mode === '58mm'}
                    onChange={() => handleChange('printer_mode', '58mm')}
                    className="text-primary focus:ring-primary"
                  />
                  58mm (Kecil / Mobile Bluetooth)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="printer_mode"
                    value="80mm"
                    checked={form.printer_mode === '80mm'}
                    onChange={() => handleChange('printer_mode', '80mm')}
                    className="text-primary focus:ring-primary"
                  />
                  80mm (Standar Desktop Kasir)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Pesan Footer Struk Belanja</label>
              <textarea
                rows={3}
                value={form.footer_struk}
                onChange={e => handleChange('footer_struk', e.target.value)}
                placeholder="cth: Terima kasih atas kunjungan Anda"
                className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-400 mt-1">Dapat berisi informasi ketentuan garansi racikan parfum atau sosial media.</p>
            </div>
          </div>
        )}

        {/* Tab 3: Pajak & Loyalty */}
        {activeTab === 'pajak' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-app-border space-y-3">
              <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                Pengaturan Pajak & Biaya
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">PPN (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.pajak_persen}
                  onChange={e => handleChange('pajak_persen', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-white dark:bg-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">Set ke 0 jika harga jual sudah termasuk pajak (nett)</p>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Biaya Layanan / Service Fee (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.biaya_layanan_persen}
                  onChange={e => handleChange('biaya_layanan_persen', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-app-border space-y-3">
              <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                Loyalty Poin Pelanggan
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Kelipatan Belanja untuk 1 Poin (Rp)</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={form.poin_per_rupiah}
                  onChange={e => handleChange('poin_per_rupiah', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-white dark:bg-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">Contoh: Belanja Rp 10.000 mendapat 1 poin</p>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Nilai Rupiah per 1 Poin (Rp)</label>
                <input
                  type="number"
                  min={1}
                  value={form.nilai_per_poin}
                  onChange={e => handleChange('nilai_per_poin', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-white dark:bg-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">Contoh: 1 Poin = Rp 100 saat penukaran</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Pembayaran */}
        {activeTab === 'bayar' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Nama Merchant QRIS</label>
                <input
                  type="text"
                  value={form.qris_merchant_name || ''}
                  onChange={e => handleChange('qris_merchant_name', e.target.value)}
                  placeholder="PARFUMKU ID"
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Nama Bank / E-Wallet</label>
                <input
                  type="text"
                  value={form.bank_name || ''}
                  onChange={e => handleChange('bank_name', e.target.value)}
                  placeholder="BCA / Mandiri / BRI"
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={form.bank_account_number || ''}
                  onChange={e => handleChange('bank_account_number', e.target.value)}
                  placeholder="1234567890"
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Atas Nama Rekening</label>
                <input
                  type="text"
                  value={form.bank_account_holder || ''}
                  onChange={e => handleChange('bank_account_holder', e.target.value)}
                  placeholder="PT Parfumku Sejahtera"
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Cloud */}
        {activeTab === 'cloud' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="font-bold text-primary-dark dark:text-primary-light">Sinkronisasi Cloud Supabase</div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Konfigurasi kredensial database cloud Supabase untuk sinkronisasi otomatis realtime multi-cabang.
              </p>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Supabase Project URL</label>
              <input
                type="text"
                value={form.supabase_url || ''}
                onChange={e => handleChange('supabase_url', e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Supabase Anon Public Key</label>
              <input
                type="password"
                value={form.supabase_anon_key || ''}
                onChange={e => handleChange('supabase_anon_key', e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 font-mono text-[11px]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Default project: <code className="text-primary font-bold">ekzzgbuwqhfifrmkkahj.supabase.co</code>
              </div>
              <button
                type="button"
                onClick={async () => {
                  addNotification('Sedang memeriksa koneksi Supabase...', 'info');
                  const { checkSupabaseConnection } = await import('../services/supabase');
                  const res = await checkSupabaseConnection(form.supabase_url, form.supabase_anon_key);
                  addNotification(res.message, res.connected ? 'success' : 'error');
                }}
                className="px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary/10 font-bold text-xs transition-colors"
              >
                Uji Koneksi Supabase
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
