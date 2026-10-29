import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { PaymentMethodConfig } from '../types';
import {
  THEME_PRESETS,
  applyThemeColor,
  uuid,
  nowISO,
} from '../utils/constants';
import {
  Store,
  Receipt,
  Layers,
  Sparkles,
  ShieldAlert,
  CreditCard,
  Palette,
  Cloud,
  Plus,
  Trash2,
  Edit2,
  Save,
  Check,
  X,
  Upload,
  RefreshCw,
  Copy,
  CheckCheck,
  Droplet,
  Beaker,
  Shield,
  HelpCircle,
  Eye,
  Sun,
  Moon,
} from 'lucide-react';
import {
  uploadStateToSupabase,
  downloadStateFromSupabase,
  SUPABASE_SETUP_SQL,
} from '../services/supabase';

export const MasterPage: React.FC = () => {
  const {
    db,
    updateDb,
    showToast,
    showConfirm,
    theme,
    toggleTheme,
    themeColor,
    setThemeColor,
    logActivity,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<
    'profil' | 'katalog' | 'roles' | 'bayar' | 'tema' | 'cloud'
  >('profil');

  // -------------------------------------------------------------
  // TAB 1: PROFIL TOKO & STRUK
  // -------------------------------------------------------------
  const [storeForm, setStoreForm] = useState({
    nama: db.master?.toko?.nama || 'PARFUMKU STORE',
    alamat: db.master?.toko?.alamat || 'Jl. Malioboro No. 45, Yogyakarta',
    telepon: db.master?.toko?.telepon || '0812-3456-7890',
    email: db.settings?.email || 'info@parfumku.id',
    website: db.settings?.website || 'www.parfumku.id',
    footer: db.master?.toko?.footer || 'Terima kasih atas kunjungan Anda! 🌸',
    logo: db.master?.logo || '',
    kertas: (db.master?.struk?.kertas || '58') as '58' | '80',
    mode: (db.master?.struk?.mode || 'thermal') as 'thermal' | 'wa' | 'both',
    autoPrint: db.master?.struk?.autoPrint ?? true,
    komisiRate: db.master?.komisi?.rate ?? 2,
  });

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    updateDb((prev) => ({
      ...prev,
      master: {
        ...prev.master,
        logo: storeForm.logo,
        toko: {
          nama: storeForm.nama,
          alamat: storeForm.alamat,
          telepon: storeForm.telepon,
          footer: storeForm.footer,
        },
        struk: {
          kertas: storeForm.kertas as '58' | '80',
          mode: storeForm.mode as any,
          autoPrint: storeForm.autoPrint,
        },
        komisi: {
          rate: Number(storeForm.komisiRate),
        },
      },
      settings: {
        ...(prev.settings || {}),
        nama_toko: storeForm.nama,
        alamat: storeForm.alamat,
        telepon: storeForm.telepon,
        email: storeForm.email,
        website: storeForm.website,
        footer_struk: storeForm.footer,
        printer_mode: storeForm.kertas === '80' ? '80mm' : '58mm',
      } as any,
    }));
    logActivity('Perbarui informasi toko & struk', 'Master');
    showToast('💾 Profil toko & struk berhasil disimpan', 'success');
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setStoreForm((prev) => ({ ...prev, logo: base64 }));
        showToast('Logo berhasil dimuat', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: MASTER KATALOG (Kategori, Aroma, Ukuran)
  // -------------------------------------------------------------
  const [katalogSubTab, setKatalogSubTab] = useState<'kategori' | 'aroma' | 'ukuran'>('kategori');

  // Kategori Modal
  const [katModalOpen, setKatModalOpen] = useState(false);
  const [katEditId, setKatEditId] = useState<string | null>(null);
  const [katNama, setKatNama] = useState('');
  const [katIcon, setKatIcon] = useState('🌸');

  const openAddKat = () => {
    setKatEditId(null);
    setKatNama('');
    setKatIcon('🌸');
    setKatModalOpen(true);
  };

  const openEditKat = (kat: { id: string; nama: string; icon: string }) => {
    setKatEditId(kat.id);
    setKatNama(kat.nama);
    setKatIcon(kat.icon || '🌸');
    setKatModalOpen(true);
  };

  const handleSaveKat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!katNama.trim()) {
      showToast('Nama kategori wajib diisi', 'error');
      return;
    }
    updateDb((prev) => {
      const currentList = prev.kategori || [];
      if (katEditId) {
        return {
          ...prev,
          kategori: currentList.map((k) =>
            k.id === katEditId ? { ...k, nama: katNama.trim(), icon: katIcon.trim() } : k
          ),
        };
      } else {
        const newKat = {
          id: 'kat_' + Date.now().toString(36),
          nama: katNama.trim(),
          icon: katIcon.trim() || '🌸',
        };
        return {
          ...prev,
          kategori: [...currentList, newKat],
        };
      }
    });
    setKatModalOpen(false);
    logActivity(`${katEditId ? 'Edit' : 'Tambah'} kategori: ${katNama}`, 'Master Katalog');
    showToast(`✅ Kategori ${katNama} berhasil disimpan`, 'success');
  };

  const handleDeleteKat = (id: string, nama: string) => {
    showConfirm(
      'Hapus Kategori',
      `Yakin ingin menghapus kategori "${nama}" dari database?`,
      () => {
        updateDb((prev) => ({
          ...prev,
          kategori: (prev.kategori || []).filter((k) => k.id !== id),
        }));
        logActivity(`Hapus kategori ${nama}`, 'Master Katalog');
        showToast(`Kategori ${nama} dihapus`, 'info');
      }
    );
  };

  // Aroma Modal
  const [aromaModalOpen, setAromaModalOpen] = useState(false);
  const [aromaEditId, setAromaEditId] = useState<string | null>(null);
  const [aromaNama, setAromaNama] = useState('');
  const [aromaKode, setAromaKode] = useState('');

  const openAddAroma = () => {
    setAromaEditId(null);
    setAromaNama('');
    setAromaKode('');
    setAromaModalOpen(true);
  };

  const openEditAroma = (a: { id: string; nama: string; kode: string }) => {
    setAromaEditId(a.id);
    setAromaNama(a.nama);
    setAromaKode(a.kode);
    setAromaModalOpen(true);
  };

  const handleSaveAroma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aromaNama.trim()) {
      showToast('Nama aroma wajib diisi', 'error');
      return;
    }
    const code =
      aromaKode.trim().toUpperCase() ||
      aromaNama
        .replace(/[^A-Za-z]/g, '')
        .slice(0, 3)
        .toUpperCase();

    updateDb((prev) => {
      const currentList = prev.aroma || [];
      if (aromaEditId) {
        return {
          ...prev,
          aroma: currentList.map((a) =>
            a.id === aromaEditId ? { ...a, nama: aromaNama.trim(), kode: code } : a
          ),
        };
      } else {
        const newAroma = {
          id: 'arm_' + Date.now().toString(36),
          nama: aromaNama.trim(),
          kode: code,
        };
        return {
          ...prev,
          aroma: [...currentList, newAroma],
        };
      }
    });
    setAromaModalOpen(false);
    logActivity(`${aromaEditId ? 'Edit' : 'Tambah'} aroma: ${aromaNama}`, 'Master Katalog');
    showToast(`✅ Aroma ${aromaNama} (${code}) berhasil disimpan`, 'success');
  };

  const handleDeleteAroma = (id: string, nama: string) => {
    showConfirm(
      'Hapus Aroma',
      `Yakin ingin menghapus varian aroma "${nama}" dari database?`,
      () => {
        updateDb((prev) => ({
          ...prev,
          aroma: (prev.aroma || []).filter((a) => a.id !== id),
        }));
        logActivity(`Hapus aroma ${nama}`, 'Master Katalog');
        showToast(`Aroma ${nama} dihapus`, 'info');
      }
    );
  };

  // Ukuran Modal
  const [ukuranModalOpen, setUkuranModalOpen] = useState(false);
  const [ukuranEditId, setUkuranEditId] = useState<string | null>(null);
  const [ukuranNama, setUkuranNama] = useState('');
  const [ukuranMl, setUkuranMl] = useState(30);

  const openAddUkuran = () => {
    setUkuranEditId(null);
    setUkuranNama('30ml');
    setUkuranMl(30);
    setUkuranModalOpen(true);
  };

  const openEditUkuran = (u: { id: string; nama: string; ml: number }) => {
    setUkuranEditId(u.id);
    setUkuranNama(u.nama);
    setUkuranMl(u.ml);
    setUkuranModalOpen(true);
  };

  const handleSaveUkuran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ukuranNama.trim()) {
      showToast('Label ukuran wajib diisi', 'error');
      return;
    }
    updateDb((prev) => {
      const currentList = prev.ukuran || [];
      if (ukuranEditId) {
        return {
          ...prev,
          ukuran: currentList.map((u) =>
            u.id === ukuranEditId ? { ...u, nama: ukuranNama.trim(), ml: Number(ukuranMl) } : u
          ),
        };
      } else {
        const newUkuran = {
          id: 'ukr_' + Date.now().toString(36),
          nama: ukuranNama.trim(),
          ml: Number(ukuranMl),
        };
        return {
          ...prev,
          ukuran: [...currentList, newUkuran],
        };
      }
    });
    setUkuranModalOpen(false);
    logActivity(`${ukuranEditId ? 'Edit' : 'Tambah'} ukuran: ${ukuranNama}`, 'Master Katalog');
    showToast(`✅ Ukuran ${ukuranNama} berhasil disimpan`, 'success');
  };

  const handleDeleteUkuran = (id: string, nama: string) => {
    showConfirm(
      'Hapus Ukuran Botol',
      `Yakin ingin menghapus ukuran "${nama}" dari database?`,
      () => {
        updateDb((prev) => ({
          ...prev,
          ukuran: (prev.ukuran || []).filter((u) => u.id !== id),
        }));
        logActivity(`Hapus ukuran ${nama}`, 'Master Katalog');
        showToast(`Ukuran ${nama} dihapus`, 'info');
      }
    );
  };

  // -------------------------------------------------------------
  // TAB 3: MASTER ROLE & JABATAN (Custom Roles & Permissions)
  // -------------------------------------------------------------
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleEditId, setRoleEditId] = useState<string | null>(null);
  const [roleNamaSlug, setRoleNamaSlug] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [roleDeskripsi, setRoleDeskripsi] = useState('');
  const [roleWarna, setRoleWarna] = useState('bg-blue-100 text-blue-700');

  // Selected role for permission matrix in Master tab
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<string>('kasir');

  const ROLE_COLOR_PRESETS = [
    { label: 'Blue', val: 'bg-blue-100 text-blue-700' },
    { label: 'Emerald', val: 'bg-emerald-100 text-emerald-800' },
    { label: 'Purple', val: 'bg-purple-100 text-purple-700' },
    { label: 'Amber', val: 'bg-amber-100 text-amber-800' },
    { label: 'Teal', val: 'bg-teal-100 text-teal-800' },
    { label: 'Rose', val: 'bg-rose-100 text-rose-700' },
    { label: 'Indigo', val: 'bg-indigo-100 text-indigo-700' },
    { label: 'Slate', val: 'bg-slate-200 text-slate-800' },
  ];

  const ALL_APP_PERMISSIONS = [
    { id: 'dashboard', label: 'Dashboard & Statistik', category: 'Utama' },
    { id: 'kasir', label: 'Mesin Kasir (POS)', category: 'Utama' },
    { id: 'pending', label: 'Pending Order (Hold/Call)', category: 'Utama' },
    { id: 'redeem', label: 'Redeem Poin Loyalty', category: 'Utama' },
    { id: 'produk', label: 'Kelola Katalog Produk', category: 'Katalog' },
    { id: 'inventori', label: 'Bahan Baku & Inventori', category: 'Katalog' },
    { id: 'opname', label: 'Stock Opname', category: 'Katalog' },
    { id: 'supplier', label: 'Supplier & Purchase Order', category: 'Katalog' },
    { id: 'barcode-designer', label: 'Barcode & QR Designer', category: 'Katalog' },
    { id: 'pelanggan', label: 'Database CRM Pelanggan', category: 'Pelanggan' },
    { id: 'kasbon', label: 'Buku Catatan Kasbon', category: 'Pelanggan' },
    { id: 'voucher', label: 'Voucher & Diskon Promo', category: 'Pelanggan' },
    { id: 'rfm', label: 'Analisis RFM Pelanggan', category: 'Pelanggan' },
    { id: 'karyawan', label: 'Daftar Karyawan', category: 'SDM' },
    { id: 'shift-groups', label: 'Grup Shift Karyawan', category: 'SDM' },
    { id: 'shift-schedule', label: 'Jadwal Roster Shift', category: 'SDM' },
    { id: 'absensi', label: 'Absensi Selfie & Jam Kerja', category: 'SDM' },
    { id: 'payroll', label: 'Penggajian / Payroll', category: 'SDM' },
    { id: 'laporan-karyawan', label: 'Laporan Kinerja Karyawan', category: 'SDM' },
    { id: 'shift-history', label: 'Riwayat Tutup Shift', category: 'SDM' },
    { id: 'laporan-penjualan', label: 'Laporan Penjualan', category: 'Laporan' },
    { id: 'laporan-kasir', label: 'Laporan Per Kasir', category: 'Laporan' },
    { id: 'laporan-retur', label: 'Laporan Retur', category: 'Laporan' },
    { id: 'laporan-stok', label: 'Laporan Stok & Mutasi', category: 'Laporan' },
    { id: 'laporan-keuangan', label: 'Laporan Laba Rugi / Keuangan', category: 'Laporan' },
    { id: 'hak-akses', label: 'Hak Akses User & Akun', category: 'Sistem' },
    { id: 'master', label: 'Master Pengaturan Toko', category: 'Sistem' },
    { id: 'database', label: 'Database Backup & Reset', category: 'Sistem' },
  ];

  const currentRoleList = db.roles || [];

  const openAddRole = () => {
    setRoleEditId(null);
    setRoleNamaSlug('');
    setRoleLabel('');
    setRoleDeskripsi('');
    setRoleWarna('bg-blue-100 text-blue-700');
    setRoleModalOpen(true);
  };

  const openEditRole = (r: any) => {
    setRoleEditId(r.id);
    setRoleNamaSlug(r.nama);
    setRoleLabel(r.label);
    setRoleDeskripsi(r.deskripsi || '');
    setRoleWarna(r.warna || 'bg-blue-100 text-blue-700');
    setRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleLabel.trim()) {
      showToast('Nama label role wajib diisi', 'error');
      return;
    }
    const cleanSlug = (roleNamaSlug || roleLabel)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    updateDb((prev) => {
      const existing = prev.roles || [];
      if (roleEditId) {
        return {
          ...prev,
          roles: existing.map((r) =>
            r.id === roleEditId
              ? {
                  ...r,
                  nama: cleanSlug,
                  label: roleLabel.trim(),
                  deskripsi: roleDeskripsi.trim(),
                  warna: roleWarna,
                }
              : r
          ),
        };
      } else {
        const newR = {
          id: 'role_' + Date.now().toString(36),
          nama: cleanSlug,
          label: roleLabel.trim(),
          deskripsi: roleDeskripsi.trim() || 'Role kustom',
          warna: roleWarna,
        };
        // Also initialize default permissions for this new role
        const rolePerms = { ...(prev.role_permissions || {}) };
        if (!rolePerms[cleanSlug]) {
          rolePerms[cleanSlug] = ['dashboard', 'kasir', 'produk'];
        }
        return {
          ...prev,
          roles: [...existing, newR],
          role_permissions: rolePerms,
        };
      }
    });
    setRoleModalOpen(false);
    logActivity(`${roleEditId ? 'Edit' : 'Tambah'} role: ${roleLabel}`, 'Master Role');
    showToast(`✅ Role ${roleLabel} berhasil disimpan`, 'success');
  };

  const handleDeleteRole = (roleItem: any) => {
    if (roleItem.nama === 'owner') {
      showToast('Role "owner" adalah role sistem utama dan tidak dapat dihapus', 'error');
      return;
    }
    showConfirm(
      'Hapus Role',
      `Yakin ingin menghapus role "${roleItem.label}"? Karyawan yang memiliki role ini akan dialihkan ke Kasir.`,
      () => {
        updateDb((prev) => ({
          ...prev,
          roles: (prev.roles || []).filter((r) => r.id !== roleItem.id),
          karyawan: (prev.karyawan || []).map((k) =>
            k.role === roleItem.nama ? { ...k, role: 'kasir' } : k
          ),
        }));
        logActivity(`Hapus role ${roleItem.label}`, 'Master Role');
        showToast(`Role ${roleItem.label} telah dihapus`, 'info');
      }
    );
  };

  // Toggle permission for a role in Master
  const togglePermissionForRole = (permId: string) => {
    if (selectedRoleForPerms === 'owner') {
      showToast('Role Owner selalu memiliki hak akses penuh (*)', 'info');
      return;
    }
    updateDb((prev) => {
      const perms = { ...(prev.role_permissions || {}) };
      const current = perms[selectedRoleForPerms] || [];
      const has = current.includes(permId);
      const updated = has ? current.filter((p) => p !== permId) : [...current, permId];
      perms[selectedRoleForPerms] = updated;
      return {
        ...prev,
        role_permissions: perms,
      };
    });
    showToast('Hak akses diperbarui', 'info', 1000);
  };

  // -------------------------------------------------------------
  // TAB 4: METODE PEMBAYARAN & PAJAK
  // -------------------------------------------------------------
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payNama, setPayNama] = useState('');
  const [payIcon, setPayIcon] = useState('💳');
  const [payRekening, setPayRekening] = useState('');

  const currentPayMethods: PaymentMethodConfig[] = db.master?.pembayaran || [
    { id: 'cash', nama: 'Tunai (Cash)', icon: '💵', aktif: true, biaya: 0 },
    { id: 'qris', nama: 'QRIS Dinamis / Statis', icon: '📱', aktif: true, biaya: 0 },
    { id: 'transfer_bca', nama: 'Transfer BCA', icon: '🏦', aktif: true, biaya: 0 },
    { id: 'edc_debit', nama: 'Kartu Debit / EDC', icon: '💳', aktif: true, biaya: 0 },
    { id: 'kasbon', nama: 'Kasbon Member', icon: '📝', aktif: true, biaya: 0 },
  ];

  const handleTogglePay = (payId: string) => {
    updateDb((prev) => {
      const list = prev.master?.pembayaran || currentPayMethods;
      const updated = list.map((p) => (p.id === payId ? { ...p, aktif: !p.aktif } : p));
      return {
        ...prev,
        master: {
          ...prev.master,
          pembayaran: updated,
        },
      };
    });
    showToast('Status pembayaran diperbarui', 'info', 1000);
  };

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payNama.trim()) {
      showToast('Nama metode pembayaran wajib diisi', 'error');
      return;
    }
    const newPay: PaymentMethodConfig = {
      id: 'pay_' + Date.now().toString(36),
      nama: payNama.trim(),
      icon: payIcon.trim() || '💳',
      aktif: true,
      biaya: 0,
      bank_account: payRekening.trim(),
    };
    updateDb((prev) => ({
      ...prev,
      master: {
        ...prev.master,
        pembayaran: [...(prev.master?.pembayaran || currentPayMethods), newPay],
      },
    }));
    setPayModalOpen(false);
    setPayNama('');
    setPayRekening('');
    logActivity(`Tambah metode pembayaran: ${payNama}`, 'Master Bayar');
    showToast(`✅ Metode pembayaran ${payNama} berhasil ditambahkan`, 'success');
  };

  const handleDeletePayment = (id: string, nama: string) => {
    showConfirm(
      'Hapus Metode Pembayaran',
      `Yakin ingin menghapus metode "${nama}"?`,
      () => {
        updateDb((prev) => ({
          ...prev,
          master: {
            ...prev.master,
            pembayaran: (prev.master?.pembayaran || currentPayMethods).filter((p) => p.id !== id),
          },
        }));
        showToast(`Metode ${nama} dihapus`, 'info');
      }
    );
  };

  // Tax and points form
  const [taxPersen, setTaxPersen] = useState(db.master?.pajak?.persen ?? 11);
  const [taxAktif, setTaxAktif] = useState(db.master?.pajak?.aktif ?? true);
  const [poinRate, setPoinRate] = useState(db.master?.poin?.rate ?? 1000);

  const handleSaveTaxAndPoints = () => {
    updateDb((prev) => ({
      ...prev,
      master: {
        ...prev.master,
        pajak: {
          ...prev.master?.pajak,
          nama: 'PPN',
          persen: Number(taxPersen),
          aktif: taxAktif,
        },
        poin: {
          ...prev.master?.poin,
          aktif: true,
          rate: Number(poinRate),
        },
      },
    }));
    logActivity('Perbarui pajak dan poin', 'Master');
    showToast('💾 Pajak & pengaturan poin berhasil disimpan', 'success');
  };

  // -------------------------------------------------------------
  // TAB 5: TEMA & TAMPILAN
  // -------------------------------------------------------------
  const [selectedFont, setSelectedFont] = useState('Inter');

  // -------------------------------------------------------------
  // TAB 6: CLOUD & SUPABASE
  // -------------------------------------------------------------
  const [supabaseUrl, setSupabaseUrl] = useState(
    db.settings?.supabase_url || 'https://ekzzgbuwqhfifrmkkahj.supabase.co'
  );
  const [supabaseKey, setSupabaseKey] = useState(
    db.settings?.supabase_anon_key ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrenpnYnV3cWhmaWZybWtrYWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTE5NjQsImV4cCI6MjEwNzY2Nzk2NH0.teuIXTviBEou3eVHhsQlO3acRLeibfVko6vIT0i0Yc4'
  );
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlSetupScript = SUPABASE_SETUP_SQL;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSetupScript);
    setCopiedSql(true);
    showToast('📋 Skrip SQL berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleTestCloudSync = async () => {
    setIsTestingCloud(true);
    try {
      const res = await downloadStateFromSupabase();
      if (res.success) {
        showToast('🟢 Koneksi Supabase Realtime aktif & sukses terhubung!', 'success');
      } else {
        showToast('⚠️ Gagal terhubung ke Supabase: ' + (res.message || 'Cek koneksi internet'), 'warning');
      }
    } catch {
      showToast('Koneksi Supabase gagal', 'error');
    } finally {
      setIsTestingCloud(false);
    }
  };

  const handleManualUpload = async () => {
    setIsTestingCloud(true);
    try {
      const res = await uploadStateToSupabase(db);
      if (res.success) {
        showToast('☁️ Database berhasil dicadangkan ke Supabase Realtime!', 'success');
      } else {
        showToast('Gagal mencadangkan: ' + (res.message || 'Error sync'), 'error');
      }
    } finally {
      setIsTestingCloud(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shadow-xs">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Master & Pengaturan Sistem
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Konfigurasi toko, katalog produk, aroma, ukuran, custom role, metode pembayaran, tema, dan database
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'profil', label: 'Toko & Struk', icon: Receipt },
          { id: 'katalog', label: 'Master Katalog & Aroma', icon: Layers },
          { id: 'roles', label: 'Role & Hak Akses', icon: Shield },
          { id: 'bayar', label: 'Pembayaran & Pajak', icon: CreditCard },
          { id: 'tema', label: 'Desain & Tema', icon: Palette },
          { id: 'cloud', label: 'Supabase Cloud', icon: Cloud },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =========================================================
       * TAB 1: PROFIL TOKO & STRUK
       * ========================================================= */}
      {activeTab === 'profil' && (
        <form onSubmit={handleSaveStore} className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Section */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Logo Toko</span>
              <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-900 shadow-inner">
                {storeForm.logo ? (
                  <img src={storeForm.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-slate-400 text-xs">Belum ada logo</div>
                )}
              </div>
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Upload Logo Baru
                <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
              </label>
              {storeForm.logo && (
                <button
                  type="button"
                  onClick={() => setStoreForm((prev) => ({ ...prev, logo: '' }))}
                  className="text-xs text-red-500 hover:underline"
                >
                  Hapus Logo
                </button>
              )}
            </div>

            {/* Store Information */}
            <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-2">
                Identitas Bisnis
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama Toko / Brand</label>
                  <input
                    type="text"
                    value={storeForm.nama}
                    onChange={(e) => setStoreForm({ ...storeForm, nama: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={storeForm.telepon}
                    onChange={(e) => setStoreForm({ ...storeForm, telepon: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Email Bisnis</label>
                  <input
                    type="email"
                    value={storeForm.email}
                    onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Website Toko</label>
                  <input
                    type="text"
                    value={storeForm.website}
                    onChange={(e) => setStoreForm({ ...storeForm, website: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Alamat Lengkap Outlet</label>
                  <textarea
                    rows={2}
                    value={storeForm.alamat}
                    onChange={(e) => setStoreForm({ ...storeForm, alamat: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Struk & Printer Configuration */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-2">
              Pengaturan Struk Kasir & Printer Thermal
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Lebar Kertas Thermal</label>
                <select
                  value={storeForm.kertas}
                  onChange={(e) => setStoreForm({ ...storeForm, kertas: e.target.value as '58' | '80' })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100"
                >
                  <option value="58">58 mm (Printer Mini / Mobile)</option>
                  <option value="80">80 mm (Printer Desktop Standar)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mode Kirim Struk</label>
                <select
                  value={storeForm.mode}
                  onChange={(e) => setStoreForm({ ...storeForm, mode: e.target.value as 'wa' | 'thermal' | 'both' })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100"
                >
                  <option value="thermal">Hanya Cetak Thermal</option>
                  <option value="wa">Kirim via WhatsApp</option>
                  <option value="both">Thermal + WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Rate Komisi Kasir / Staf (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={storeForm.komisiRate}
                  onChange={(e) => setStoreForm({ ...storeForm, komisiRate: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pesan Footer Struk</label>
                <input
                  type="text"
                  value={storeForm.footer}
                  onChange={(e) => setStoreForm({ ...storeForm, footer: e.target.value })}
                  placeholder="Contoh: Terima kasih atas kunjungan Anda! 🌸"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="autoPrintCheck"
                checked={storeForm.autoPrint}
                onChange={(e) => setStoreForm({ ...storeForm, autoPrint: e.target.checked })}
                className="w-4 h-4 rounded text-[var(--primary)] focus:ring-0"
              />
              <label htmlFor="autoPrintCheck" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Otomatis cetak struk seketika transaksi kasir selesai
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            Simpan Pengaturan Toko & Struk
          </button>
        </form>
      )}

      {/* =========================================================
       * TAB 2: MASTER KATALOG (KATEGORI, AROMA, UKURAN)
       * ========================================================= */}
      {activeTab === 'katalog' && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
            <button
              onClick={() => setKatalogSubTab('kategori')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                katalogSubTab === 'kategori'
                  ? 'bg-white dark:bg-slate-800 text-[var(--primary)] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              🌸 Kategori Produk ({db.kategori?.length || 0})
            </button>
            <button
              onClick={() => setKatalogSubTab('aroma')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                katalogSubTab === 'aroma'
                  ? 'bg-white dark:bg-slate-800 text-[var(--primary)] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              🧪 Aroma Parfum ({db.aroma?.length || 0})
            </button>
            <button
              onClick={() => setKatalogSubTab('ukuran')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                katalogSubTab === 'ukuran'
                  ? 'bg-white dark:bg-slate-800 text-[var(--primary)] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              🧴 Ukuran Botol (ml) ({db.ukuran?.length || 0})
            </button>
          </div>

          {/* 1. KATEGORI SUB-TAB */}
          {katalogSubTab === 'kategori' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Daftar Kategori Produk</h3>
                  <p className="text-xs text-slate-500">Kelola kategori untuk klasifikasi produk pada kasir & inventori</p>
                </div>
                <button
                  onClick={openAddKat}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Kategori
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(db.kategori || []).map((kat) => (
                  <div
                    key={kat.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-[var(--primary)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{kat.icon || '🌸'}</span>
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{kat.nama}</div>
                        <div className="text-[10px] text-slate-400">ID: {kat.id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => openEditKat(kat)}
                        className="p-1 rounded-md text-slate-500 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Edit Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteKat(kat.id, kat.nama)}
                        className="p-1 rounded-md text-slate-500 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. AROMA SUB-TAB */}
          {katalogSubTab === 'aroma' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Daftar Aroma & Varian Parfum</h3>
                  <p className="text-xs text-slate-500">Database master bibit aroma parfum untuk refill, racikan, dan botolan</p>
                </div>
                <button
                  onClick={openAddAroma}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Aroma Baru
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(db.aroma || []).map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-[var(--primary)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                        {a.kode || 'PAR'}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{a.nama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Kode: {a.kode}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => openEditAroma(a)}
                        className="p-1 rounded-md text-slate-500 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Edit Aroma"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAroma(a.id, a.nama)}
                        className="p-1 rounded-md text-slate-500 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Hapus Aroma"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. UKURAN BOTOL SUB-TAB */}
          {katalogSubTab === 'ukuran' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Daftar Ukuran Botol (ml)</h3>
                  <p className="text-xs text-slate-500">Standar kapasitas mililiter botol untuk racikan & refill</p>
                </div>
                <button
                  onClick={openAddUkuran}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Ukuran
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {(db.ukuran || []).map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-[var(--primary)] transition-all"
                  >
                    <div>
                      <div className="font-black text-sm text-slate-800 dark:text-slate-100">{u.nama}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{u.ml} mililiter</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => openEditUkuran(u)}
                        className="p-1 rounded-md text-slate-500 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteUkuran(u.id, u.nama)}
                        className="p-1 rounded-md text-slate-500 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
       * TAB 3: MASTER ROLE & JABATAN
       * ========================================================= */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Header & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">
                Manajemen Role & Jabatan Bebas
              </h2>
              <p className="text-xs text-slate-500">
                Bukan cuma Kasir/Gudang/Marketing! Tambah role Supervisor, Blender, Barista, Finance, Kurir, dll.
              </p>
            </div>
            <button
              onClick={openAddRole}
              className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Tambah Role Baru
            </button>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {currentRoleList.map((r) => {
              const isSelected = selectedRoleForPerms === r.nama;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoleForPerms(r.nama)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)]/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        r.warna || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.label}
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditRole(r)}
                        className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Edit Role"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {r.nama !== 'owner' && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Hapus Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">ID: {r.nama}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                    {r.deskripsi || 'Tidak ada deskripsi'}
                  </div>
                  {isSelected && (
                    <div className="mt-2 text-[10px] font-bold text-[var(--primary)] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Mengatur Hak Akses
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Permission Matrix Box for the Selected Role */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Hak Akses Menu untuk Role:{' '}
                  <span className="text-[var(--primary)] uppercase font-black">{selectedRoleForPerms}</span>
                </h3>
                <p className="text-xs text-slate-500">Centang menu yang diizinkan untuk dibuka oleh staf dengan role ini</p>
              </div>
              {selectedRoleForPerms === 'owner' && (
                <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
                  Owner Memiliki Semua Akses (*)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {ALL_APP_PERMISSIONS.map((perm) => {
                const rolePerms =
                  db.role_permissions?.[selectedRoleForPerms] ||
                  (selectedRoleForPerms === 'owner' ? ['*'] : []);
                const isChecked = rolePerms.includes('*') || rolePerms.includes(perm.id);

                return (
                  <label
                    key={perm.id}
                    onClick={() => togglePermissionForRole(perm.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)]/30 text-slate-800 dark:text-slate-100 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={selectedRoleForPerms === 'owner'}
                      readOnly
                      className="mt-0.5 w-4 h-4 rounded text-[var(--primary)] focus:ring-0"
                    />
                    <div>
                      <div>{perm.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Kategori: {perm.category}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
       * TAB 4: METODE PEMBAYARAN & PAJAK
       * ========================================================= */}
      {activeTab === 'bayar' && (
        <div className="space-y-6 max-w-4xl">
          {/* Payment Methods */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Daftar Metode Pembayaran Kasir</h3>
                <p className="text-xs text-slate-500">Aktifkan atau tambah channel pembayaran baru pada mesin kasir</p>
              </div>
              <button
                onClick={() => setPayModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Metode Bayar
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {currentPayMethods.map((pay) => (
                <div key={pay.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{pay.icon || '💳'}</span>
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{pay.nama}</div>
                      {pay.bank_account && (
                        <div className="text-[11px] text-slate-400">Rek/Info: {pay.bank_account}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={pay.aktif}
                        onChange={() => handleTogglePay(pay.id)}
                        className="w-4 h-4 rounded text-[var(--primary)]"
                      />
                      <span className={pay.aktif ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {pay.aktif ? 'Aktif di Kasir' : 'Non-aktif'}
                      </span>
                    </label>

                    {pay.id !== 'cash' && (
                      <button
                        onClick={() => handleDeletePayment(pay.id, pay.nama)}
                        className="p-1 rounded text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax and Loyalty */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-2">
              Pajak PPN & Program Loyalty Poin
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tarif PPN (%)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={taxPersen}
                    onChange={(e) => setTaxPersen(Number(e.target.value))}
                    className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                  />
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={taxAktif}
                      onChange={(e) => setTaxAktif(e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--primary)]"
                    />
                    Terapkan PPN pada struk
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Rate Belanja per 1 Poin (Rp)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={poinRate}
                  onChange={(e) => setPoinRate(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                />
                <span className="text-[10px] text-slate-400">
                  Contoh: Setiap belanja Rp {Number(poinRate).toLocaleString('id-ID')} mendapat 1 poin
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveTaxAndPoints}
              className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Pajak & Poin
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
       * TAB 5: TEMA & TAMPILAN
       * ========================================================= */}
      {activeTab === 'tema' && (
        <div className="space-y-6 max-w-4xl">
          {/* Color Palettes */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Pilihan Palet Warna Aksen Utama</h3>
              <p className="text-xs text-slate-500">Pilih skema warna mewah sesuai identitas visual butik parfum Anda</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {THEME_PRESETS.map((p) => {
                const isSelected = (themeColor || 'emerald') === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setThemeColor(p.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-2 border-slate-900 dark:border-white shadow-md'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full shadow-xs flex items-center justify-center text-white"
                        style={{ backgroundColor: p.primary }}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{p.nama}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.primary}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dark / Light Mode Switch */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
              </div>
              <div>
                <div className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-100">
                  Mode Gelap (Dark Mode): <span className="uppercase">{theme}</span>
                </div>
                <div className="text-xs text-slate-400">Peralihan tampilan kontras tinggi untuk suasana toko redup</div>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
            >
              Ubah ke {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>

          {/* Live Preview Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Live Preview Komponen</h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
              <button className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-xs">
                Tombol Utama
              </button>
              <button className="px-4 py-2 rounded-xl bg-[var(--primary-dark)] text-white text-xs font-bold">
                Aksen Hover
              </button>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                Badge Aktif
              </span>
              <div
                className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-xs"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
              >
                P
              </div>
              <span className="text-xs font-semibold text-[var(--primary)]">Teks Highlight Parfum</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
       * TAB 6: CLOUD & SUPABASE REALTIME
       * ========================================================= */}
      {activeTab === 'cloud' && (
        <div className="space-y-6 max-w-4xl">
          {/* Cloud Status */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Supabase Realtime Sync</h3>
                  <p className="text-xs text-slate-500">
                    Sinkronisasi data multi-kasir & multi-perangkat secara otomatis dan real-time
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                🟢 Aktif Realtime
              </span>
            </div>

            {/* Sync Mode Toggle */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  Mode Sinkronisasi Cloud Otomatis
                </div>
                <div className="text-[11px] text-slate-400">
                  {db.settings?.auto_cloud_sync !== false
                    ? 'Otomatis (Lokal disimpan instan, awan disinkronkan tanpa me-refresh)'
                    : 'Manual (Hanya dicadangkan saat menekan tombol Cadangkan)'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = db.settings?.auto_cloud_sync !== false;
                  updateDb((prev) => ({
                    ...prev,
                    settings: {
                      ...(prev.settings || prev.master),
                      auto_cloud_sync: !current,
                    } as any,
                  }));
                  showToast(
                    !current ? '🟢 Mode Auto-Sync Cloud diaktifkan' : '⏸️ Mode Auto-Sync dinonaktifkan (Manual)',
                    'info'
                  );
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  db.settings?.auto_cloud_sync !== false
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {db.settings?.auto_cloud_sync !== false ? '🟢 Otomatis' : '⚪ Manual'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Supabase Project URL</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Supabase Anon Key</label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <button
                onClick={handleTestCloudSync}
                disabled={isTestingCloud}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingCloud ? 'animate-spin' : ''}`} />
                Uji Koneksi Realtime
              </button>
              <button
                onClick={handleManualUpload}
                disabled={isTestingCloud}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                Cadangkan ke Supabase Sekarang
              </button>
            </div>
          </div>

          {/* SQL Helper Script */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  Skrip SQL Pembuatan Tabel di Supabase SQL Editor
                </h4>
                <p className="text-[11px] text-slate-500">
                  Jalankan skrip ini sekali di dashboard Supabase jika tabel `app_state` belum dibuat
                </p>
              </div>
              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                {copiedSql ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'Tersalin!' : 'Salin SQL'}
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {sqlSetupScript}
            </pre>
          </div>
        </div>
      )}

      {/* =========================================================
       * MODALS
       * ========================================================= */}

      {/* KATEGORI MODAL */}
      {katModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <form
            onSubmit={handleSaveKat}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {katEditId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button type="button" onClick={() => setKatModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama Kategori</label>
              <input
                type="text"
                placeholder="Contoh: EDP Signature"
                value={katNama}
                onChange={(e) => setKatNama(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Icon Emoji</label>
              <input
                type="text"
                value={katIcon}
                onChange={(e) => setKatIcon(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKatModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AROMA MODAL */}
      {aromaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <form
            onSubmit={handleSaveAroma}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {aromaEditId ? 'Edit Aroma Parfum' : 'Tambah Aroma Parfum Baru'}
              </h3>
              <button type="button" onClick={() => setAromaModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama Varian Aroma</label>
              <input
                type="text"
                placeholder="Contoh: Vanilla Musk"
                value={aromaNama}
                onChange={(e) => setAromaNama(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Kode Singkat (3-4 Huruf)</label>
              <input
                type="text"
                placeholder="Contoh: VMS"
                value={aromaKode}
                onChange={(e) => setAromaKode(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono uppercase text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAromaModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* UKURAN MODAL */}
      {ukuranModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <form
            onSubmit={handleSaveUkuran}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {ukuranEditId ? 'Edit Ukuran Botol' : 'Tambah Ukuran Botol'}
              </h3>
              <button type="button" onClick={() => setUkuranModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Label Ukuran</label>
              <input
                type="text"
                placeholder="Contoh: 30ml atau 50ml Refill"
                value={ukuranNama}
                onChange={(e) => setUkuranNama(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Kapasitas (ml)</label>
              <input
                type="number"
                min="1"
                max="5000"
                value={ukuranMl}
                onChange={(e) => setUkuranMl(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUkuranModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ROLE MODAL */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <form
            onSubmit={handleSaveRole}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {roleEditId ? 'Edit Role Karyawan' : 'Tambah Role / Jabatan Baru'}
              </h3>
              <button type="button" onClick={() => setRoleModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama Tampilan Role</label>
              <input
                type="text"
                placeholder="Contoh: Supervisor, Blender Parfum, Kurir"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 font-bold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Deskripsi Jabatan</label>
              <input
                type="text"
                placeholder="Contoh: Bertanggung jawab atas racikan bibit parfum"
                value={roleDeskripsi}
                onChange={(e) => setRoleDeskripsi(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Warna Tag Badge</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {ROLE_COLOR_PRESETS.map((col) => (
                  <button
                    key={col.label}
                    type="button"
                    onClick={() => setRoleWarna(col.val)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold ${col.val} border ${
                      roleWarna === col.val ? 'ring-2 ring-slate-900 dark:ring-white' : 'opacity-80'
                    }`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold"
              >
                Simpan Role
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAYMENT METHOD MODAL */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <form
            onSubmit={handleAddPaymentMethod}
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Tambah Metode Pembayaran</h3>
              <button type="button" onClick={() => setPayModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama Metode</label>
              <input
                type="text"
                placeholder="Contoh: Mandiri Virtual Account"
                value={payNama}
                onChange={(e) => setPayNama(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Icon Emoji</label>
              <input
                type="text"
                placeholder="💳, 🏦, 📱, dll"
                value={payIcon}
                onChange={(e) => setPayIcon(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Nomor Rekening / Keterangan
              </label>
              <input
                type="text"
                placeholder="Contoh: 123-456-7890 a.n Toko Parfum"
                value={payRekening}
                onChange={(e) => setPayRekening(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold"
              >
                Tambahkan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
