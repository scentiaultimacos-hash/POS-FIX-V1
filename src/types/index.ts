export interface User {
  id: string;
  username: string;
  nama: string;
  nama_lengkap?: string;
  email?: string;
  role: 'owner' | 'manager' | 'kasir' | 'gudang' | string;
  aktif?: boolean;
  is_active?: boolean;
  pin?: string;
  password_hash?: string;
  permissions: string[];
  created_at?: string;
}

export interface Role {
  id: string;
  nama: string;
  label: string;
  deskripsi: string;
  warna: string;
  permissions?: string[];
}

export interface Produk {
  id: string;
  sku: string;
  barcode?: string;
  nama: string;
  kategori_id: string;
  klasifikasi: 'bahan_cair' | 'bahan_padat' | 'bahan_baku' | 'produk_jadi' | 'refill' | 'aksesoris' | 'bundling' | string;
  harga_jual: number;
  harga_beli: number;
  stok: number;
  stok_min: number;
  satuan: string;
  foto: string | null;
  aktif: boolean;
}

export interface BahanBaku {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
  stok_min: number;
  harga_beli: number;
  klasifikasi: string;
}

export interface Pelanggan {
  id: string;
  nama: string;
  telepon: string;
  email?: string;
  tier: 'bronze' | 'silver' | 'gold';
  poin: number;
  total_belanja: number;
  tags: string[];
  avatar: string;
  catatan?: string;
}

export interface Karyawan {
  id: string;
  nama: string;
  jabatan: string;
  telepon: string;
  gaji_pokok: number;
  tunjangan: number;
  pin: string;
  role: string;
  username: string;
  aktif: boolean;
}

export interface Kasbon {
  id: string;
  pelanggan_id: string;
  pelanggan_nama: string;
  total: number;
  terbayar: number;
  sisa: number;
  jatuh_tempo: string;
  status: 'lunas' | 'belum_lunas';
  keterangan?: string;
  riwayat_bayar?: { tanggal: string; jumlah: number; metode: string }[];
  created_at: string;
}

export interface Voucher {
  id: string;
  kode: string;
  diskon: number; // percentage
  kuota: number;
  terpakai: number;
  expired: string | null;
  aktif: boolean;
  created_at: string;
}

export interface CartItem {
  id: string;
  sku: string;
  nama: string;
  harga: number;
  qty: number;
  subtotal: number;
  foto?: string | null;
  stok: number;
}

export interface PendingOrder {
  id: string;
  nomor: string;
  tanggal: string;
  pelanggan: Pelanggan | null;
  items: CartItem[];
  subtotal: number;
  diskon: number;
  voucher_kode?: string;
  pajak: number;
  total: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  nama: string;
  telepon: string;
  email: string;
  alamat: string;
}

export interface PurchaseOrderItem {
  produk_id: string;
  nama: string;
  qty: number;
  harga: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  nomor: string;
  supplier: string;
  tgl: string;
  items: PurchaseOrderItem[];
  total: number;
  status: 'draft' | 'diterima';
  created_at: string;
}

export interface ShiftGroup {
  id: string;
  nama: string;
  jam_mulai: string;
  jam_selesai: string;
  karyawan_ids: string[];
  created_at: string;
}

export interface ShiftSchedule {
  id: string;
  karyawan_id: string;
  tanggal: string;
  shift: string;
  jam_mulai: string;
  jam_selesai: string;
}

export interface ShiftSession {
  id: string;
  kasir_id: string;
  kasir_nama: string;
  buka_at: string;
  tutup_at?: string;
  modal_awal: number;
  uang_fisik?: number;
  total_penjualan?: number;
  total_transaksi?: number;
  status: 'aktif' | 'tutup';
  catatan?: string;
}

export interface AbsensiRecord {
  id: string;
  karyawan_id: string;
  karyawan_nama: string;
  tanggal: string;
  jam_masuk?: string;
  jam_keluar?: string;
  status: 'hadir' | 'telat' | 'izin' | 'sakit' | 'alfa' | 'off' | 'cuti';
  foto_masuk?: string;
  foto_keluar?: string;
  lembur_jam?: number;
  keterangan?: string;
  deleted_at?: string;
}

export interface PayrollRecord {
  id: string;
  karyawan_id: string;
  karyawan_nama: string;
  periode: string; // YYYY-MM
  gaji_pokok: number;
  tunjangan: number;
  bonus: number;
  potongan_manual: number;
  status: 'draft' | 'validated' | 'sent';
  created_at: string;
  validated_at?: string;
  validated_by?: string;
  sent_at?: string;
}

export interface PaymentItem {
  id: string;
  nama: string;
  icon: string;
  jumlah: number;
}

export interface Transaksi {
  id: string;
  nomor: string;
  tanggal: string;
  kasir_id: string;
  kasir_nama: string;
  pelanggan_id?: string;
  pelanggan_nama?: string;
  items: { produk_id: string; nama: string; harga: number; qty: number; subtotal: number }[];
  subtotal: number;
  diskon: number;
  voucher_kode?: string;
  pajak: number;
  total: number;
  bayar: number;
  kembalian: number;
  metode: PaymentItem[];
  status: 'selesai' | 'batal' | 'retur';
  poin_didapat: number;
  bukti_transfer?: string;
  created_at: string;
}

export interface ReturRecord {
  id: string;
  transaksi_id: string;
  transaksi_nomor: string;
  kasir_nama: string;
  items: { produk_id: string; nama: string; qty: number; harga: number; subtotal: number }[];
  total: number;
  alasan: string;
  created_at: string;
}

export interface OpnameItem {
  produk_id: string;
  nama: string;
  stok_sistem: number;
  stok_fisik: number;
  selisih: number;
}

export interface OpnameSession {
  id: string;
  tanggal: string;
  petugas: string;
  items: OpnameItem[];
  catatan?: string;
  created_at: string;
}

export interface PointLedger {
  id: string;
  pelanggan_id: string;
  pelanggan_nama: string;
  tipe: 'earn' | 'redeem' | 'adjust';
  poin: number;
  keterangan: string;
  created_at: string;
}

export interface PointRedemption {
  id: string;
  pelanggan_id: string;
  pelanggan_nama: string;
  voucher_kode: string;
  nilai_voucher: number;
  poin_dipakai: number;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  msg: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created_at: string;
}

export interface LogActivity {
  id: string;
  user: string;
  aksi: string;
  modul: string;
  created_at: string;
}

export interface PaymentMethodConfig {
  id: string;
  nama: string;
  icon: string;
  biaya: number; // %
  aktif: boolean;
}

export interface AttendanceStatusConfig {
  id: string;
  label: string;
  warna: string;
  potongan_persen: number;
  potongan_flat: number;
}

export interface MasterSettings {
  toko: {
    nama: string;
    telepon: string;
    alamat: string;
    footer: string;
  };
  pajak: {
    aktif: boolean;
    nama: string;
    persen: number;
  };
  diskon: {
    kasir: number;
    manager: number;
  };
  poin: {
    aktif: boolean;
    rate: number;
    pin_threshold: number;
    tiers: { poin: number; nilai: number; min_belanja: number }[];
  };
  komisi: {
    rate: number;
  };
  jam_operasional: {
    mulai: number;
    selesai: number;
  };
  absensi: {
    jam_masuk_max: string;
    jam_keluar_min: string;
    jam_lembur_mulai: string;
  };
  shift: {
    toleransi_menit: number;
  };
  sound: {
    aktif: boolean;
  };
  wa: {
    nomor_bisnis: string;
  };
  logo: string | null;
  pembayaran: PaymentMethodConfig[];
  struk: {
    mode: 'wa' | 'thermal' | 'both';
    kertas: '58' | '80';
    autoPrint: boolean;
  };
  payroll_settings: {
    status_kehadiran: AttendanceStatusConfig[];
    hari_kerja_per_bulan: number;
    jam_kerja_normal: number;
    rate_lembur_per_jam: number;
    uang_makan_per_hari: number;
    uang_transport_per_hari: number;
  };

  // Optional flat aliases for UI convenience:
  nama_toko?: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  footer_struk?: string;
  printer_mode?: string;
  pajak_persen?: number;
  biaya_layanan_persen?: number;
  poin_per_rupiah?: number;
  nilai_per_poin?: number;
  qris_merchant_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  [key: string]: any;
}

export interface DatabaseState {
  company: { nama: string; kode: string };
  outlets: { id: string; nama: string }[];
  kategori: { id: string; nama: string; icon: string }[];
  aroma: { id: string; nama: string; kode: string }[];
  ukuran: { id: string; nama: string; ml: number }[];
  harga: { id: string; aroma_id: string; ukuran_id: string; harga: number }[];
  produk: Produk[];
  bahan_baku: BahanBaku[];
  pelanggan: Pelanggan[];
  karyawan: Karyawan[];
  absensi: AbsensiRecord[];
  payroll: PayrollRecord[];
  transaksi: Transaksi[];
  kasbon: Kasbon[];
  vouchers: Voucher[];
  pending_orders: PendingOrder[];
  suppliers: Supplier[];
  purchase_orders: PurchaseOrder[];
  shifts: ShiftSession[];
  shift_schedules: ShiftSchedule[];
  shift_groups: ShiftGroup[];
  opname_sessions: OpnameSession[];
  returns: ReturRecord[];
  notifications: AppNotification[];
  point_ledger: PointLedger[];
  point_redemptions: PointRedemption[];
  users: User[];
  roles: Role[];
  log: LogActivity[];
  master: MasterSettings;

  // Convenient aliases
  settings?: MasterSettings;
  po?: PurchaseOrder[];
  shift_sessions?: ShiftSession[];
  opname?: OpnameSession[];
  role_permissions?: Record<string, string[]>;
  [key: string]: any;
}
