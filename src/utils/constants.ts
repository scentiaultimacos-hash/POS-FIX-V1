import { sha256 } from 'js-sha256';
import { DatabaseState, User } from '../types';

export const SUPABASE_URL = 'https://ekzzgbuwqhfifrmkkahj.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrenpnYnV3cWhmaWZybWtrYWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTE5NjQsImV4cCI6MjEwNzY2Nzk2NH0.teuIXTviBEou3eVHhsQlO3acRLeibfVko6vIT0i0Yc4';

export const DB_KEY = 'pos_parfum_db_v7_0';
export const SESSION_KEY = 'pos_parfum_session_v7';
export const PROFILE_CACHE_KEY = 'pos_parfum_profiles_cache_v7';
export const THEME_KEY = 'pos_parfum_theme_v7';
export const THEME_COLOR_KEY = 'pos_parfum_themecolor_v7';
export const PWD_SALT = '::parfumku_v7_0_2026::';

export const KLASIFIKASI: Record<string, { nama: string; icon: string; warna: string }> = {
  bahan_cair: { nama: 'Bahan Cair', icon: '🧴', warna: 'bg-cyan-100 text-cyan-700' },
  bahan_padat: { nama: 'Bahan Padat', icon: '🧂', warna: 'bg-orange-100 text-orange-700' },
  bahan_baku: { nama: 'Bahan Baku', icon: '🍶', warna: 'bg-indigo-100 text-indigo-700' },
  produk_jadi: { nama: 'Produk Jadi', icon: '🌸', warna: 'bg-pink-100 text-pink-700' },
  refill: { nama: 'Refill', icon: '🔄', warna: 'bg-emerald-100 text-emerald-800' },
  aksesoris: { nama: 'Aksesoris', icon: '🎀', warna: 'bg-purple-100 text-purple-700' },
  bundling: { nama: 'Bundling', icon: '🎁', warna: 'bg-amber-100 text-amber-700' },
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ['*'],
  manager: [
    'dashboard', 'kasir', 'pending', 'redeem', 'produk', 'inventori', 'opname',
    'supplier', 'pelanggan', 'kasbon', 'voucher', 'rfm', 'karyawan', 'shift-groups',
    'shift-schedule', 'absensi', 'payroll', 'laporan-karyawan', 'shift-history',
    'laporan-penjualan', 'laporan-stok', 'laporan-keuangan', 'laporan-retur',
    'laporan-kasir', 'barcode-designer', 'master', 'database', 'hak-akses'
  ],
  kasir: ['dashboard', 'kasir', 'pending', 'redeem', 'produk', 'pelanggan', 'shift-history', 'laporan-penjualan'],
  gudang: ['dashboard', 'produk', 'inventori', 'opname', 'supplier', 'laporan-stok', 'barcode-designer'],
};

export const ACTION_PERMS: Record<string, string[]> = {
  'produk.hapus': ['owner', 'manager'],
  'produk.edit': ['owner', 'manager'],
  'produk.tambah': ['owner', 'manager'],
  'pelanggan.edit': ['owner', 'manager'],
  'pelanggan.hapus': ['owner', 'manager'],
  'pelanggan.tambah': ['owner', 'manager', 'kasir'],
  'user.kelola': ['owner'],
  'master.edit': ['owner', 'manager'],
  'opname.simpan': ['owner', 'manager'],
  'po.buat': ['owner', 'manager'],
  'po.terima': ['owner', 'manager'],
  'retur.proses': ['owner', 'manager', 'kasir'],
};

export const PAGE_GROUPS = [
  {
    name: 'Utama',
    icon: 'layout-grid',
    pages: [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      { id: 'kasir', label: 'Kasir (POS)', icon: 'shopping-cart' },
      { id: 'pending', label: 'Pending Order', icon: 'pause-circle' },
      { id: 'redeem', label: 'Redeem Poin', icon: 'gift', badge: 'NEW' },
    ],
  },
  {
    name: 'Laporan',
    icon: 'bar-chart-3',
    pages: [
      { id: 'laporan-penjualan', label: 'Penjualan', icon: 'trending-up' },
      { id: 'laporan-kasir', label: 'Per Kasir', icon: 'user-check' },
      { id: 'laporan-retur', label: 'Retur', icon: 'rotate-ccw' },
      { id: 'laporan-stok', label: 'Stok', icon: 'package-search' },
      { id: 'laporan-keuangan', label: 'Keuangan', icon: 'wallet' },
      { id: 'rfm', label: 'RFM Analysis', icon: 'target' },
    ],
  },
  {
    name: 'Produk & Stok',
    icon: 'package',
    pages: [
      { id: 'produk', label: 'Produk', icon: 'package' },
      { id: 'inventori', label: 'Inventori', icon: 'warehouse' },
      { id: 'opname', label: 'Stock Opname', icon: 'clipboard-list' },
      { id: 'supplier', label: 'Supplier & PO', icon: 'truck' },
      { id: 'barcode-designer', label: 'Barcode Designer', icon: 'qr-code', badge: 'NEW' },
    ],
  },
  {
    name: 'Pelanggan',
    icon: 'users',
    pages: [
      { id: 'pelanggan', label: 'Pelanggan', icon: 'users' },
      { id: 'kasbon', label: 'Kasbon', icon: 'credit-card' },
      { id: 'voucher', label: 'Voucher', icon: 'ticket' },
    ],
  },
  {
    name: 'Karyawan',
    icon: 'user-cog',
    pages: [
      { id: 'karyawan', label: 'Karyawan', icon: 'user-cog' },
      { id: 'shift-groups', label: 'Grup Shift', icon: 'users-2', badge: 'NEW' },
      { id: 'shift-schedule', label: 'Jadwal Shift', icon: 'calendar-clock' },
      { id: 'absensi', label: 'Absensi', icon: 'camera' },
      { id: 'payroll', label: 'Payroll', icon: 'banknote' },
      { id: 'laporan-karyawan', label: 'Lap. Karyawan', icon: 'bar-chart-2' },
      { id: 'hak-akses', label: 'Hak Akses', icon: 'shield-check' },
      { id: 'shift-history', label: 'Riwayat Shift', icon: 'clock' },
    ],
  },
  {
    name: 'Sistem',
    icon: 'settings-2',
    pages: [
      { id: 'master', label: 'Master', icon: 'settings' },
      { id: 'database', label: 'Database Cleanup', icon: 'database', badge: 'NEW' },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  kasir: 'Kasir (POS)',
  pending: 'Pending Order',
  redeem: 'Redeem Poin',
  produk: 'Produk',
  inventori: 'Inventori',
  opname: 'Stock Opname',
  supplier: 'Supplier & PO',
  pelanggan: 'Pelanggan',
  kasbon: 'Kasbon',
  voucher: 'Voucher',
  rfm: 'RFM Analysis',
  karyawan: 'Karyawan',
  'shift-groups': 'Grup Shift',
  'shift-schedule': 'Jadwal Shift',
  absensi: 'Absensi',
  payroll: 'Payroll',
  'laporan-karyawan': 'Laporan Karyawan',
  'hak-akses': 'Hak Akses',
  'shift-history': 'Riwayat Shift',
  'laporan-penjualan': 'Laporan Penjualan',
  'laporan-stok': 'Laporan Stok',
  'laporan-keuangan': 'Laporan Keuangan',
  'laporan-retur': 'Laporan Retur',
  'laporan-kasir': 'Laporan Per Kasir',
  master: 'Master',
  'barcode-designer': 'Barcode Designer',
  database: 'Database Cleanup',
};

export const fmtRp = (n: number | string | undefined | null) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
export const uuid = () => 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
export const today = () => new Date().toISOString().slice(0, 10);
export const nowISO = () => new Date().toISOString();
export const fmtTgl = (s: string) => (s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
export const fmtTglLong = (s: string) => (s ? new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');
export const fmtJam = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export function hashPassword(pwd: string): string {
  if (!pwd) return '';
  if (String(pwd).startsWith('$sha256$')) return pwd;
  return '$sha256$' + sha256(pwd + PWD_SALT);
}

export function verifyPassword(pwd: string, hashed?: string): boolean {
  if (!hashed) return false;
  if (String(hashed).startsWith('seed:')) return pwd === String(hashed).slice(5);
  if (String(hashed).startsWith('$sha256$')) return hashPassword(pwd) === hashed;
  return pwd === hashed;
}

let audioCtx: AudioContext | null = null;
export function playSound(type: 'add' | 'success' | 'error' | 'click', enabled: boolean = true) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'add') {
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'error') {
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'click') {
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch (e) {
    // Web audio fail
  }
}

export function autoSku(nama: string, klasifikasi: string): string {
  const prefix = klasifikasi === 'refill' ? 'RFL' :
    klasifikasi === 'bahan_baku' ? 'BB' :
    klasifikasi === 'bahan_cair' ? 'BC' :
    klasifikasi === 'aksesoris' ? 'ACC' :
    klasifikasi === 'bundling' ? 'BND' : 'PRD';
  const cleanName = (nama || 'item').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${cleanName}-${rand}`;
}
