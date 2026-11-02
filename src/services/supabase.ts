import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON } from '../utils/constants';
import { DatabaseState } from '../types';

let cachedClient: any = null;
let activeSubscription: RealtimeChannel | null = null;

// Unique client ID per browser session to prevent echo loops when uploading state
export const CLIENT_SESSION_ID: string = (() => {
  try {
    const existing = window?.sessionStorage?.getItem('pos_client_session_id');
    if (existing) return existing;
    const generated = 'pos_client_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
    window?.sessionStorage?.setItem('pos_client_session_id', generated);
    return generated;
  } catch {
    return 'pos_client_' + Math.random().toString(36).slice(2, 9);
  }
})();

/**
 * Returns a consistent store partition ID.
 * Defaults to 'store_main' so all devices sharing the same Supabase project
 * automatically connect to and sync the exact same live database row.
 */
export const getStoreId = (_db?: DatabaseState): string => {
  try {
    const custom = localStorage.getItem('pos_store_partition_id');
    if (custom && custom.trim()) return custom.trim();
  } catch {
    // Ignore storage restrictions
  }
  return 'store_main';
};

/**
 * Intelligently merges local and remote database states.
 * Ensures transactions from Cashier and attendance selfies from Staff
 * are both preserved across all devices without clobbering each other.
 */
export const mergeDatabaseStates = (local: DatabaseState, remote: DatabaseState): DatabaseState => {
  if (!local) return remote;
  if (!remote) return local;

  const unionById = <T extends Record<string, any>>(localArr: T[] = [], remoteArr: T[] = [], key: string = 'id'): T[] => {
    const map = new Map<string, T>();

    // 1. Process remote records
    for (const item of remoteArr || []) {
      const k = item?.[key];
      if (k !== undefined && k !== null) {
        map.set(String(k), item);
      }
    }

    // 2. Process and merge local records
    for (const item of localArr || []) {
      const k = item?.[key];
      if (k === undefined || k === null) continue;
      const strKey = String(k);
      if (!map.has(strKey)) {
        map.set(strKey, item);
      } else {
        const existing = map.get(strKey)!;
        // Honor soft-deleted flags so deletions stick across all devices
        if (item.deleted_at || existing.deleted_at) {
          map.set(strKey, { ...existing, ...item, deleted_at: item.deleted_at || existing.deleted_at });
          continue;
        }

        const itemTime = item.updated_at ? new Date(item.updated_at).getTime() : (item.created_at ? new Date(item.created_at).getTime() : 0);
        const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : (existing.created_at ? new Date(existing.created_at).getTime() : 0);

        if (itemTime > existingTime) {
          map.set(strKey, { ...existing, ...item });
        } else {
          map.set(strKey, { ...item, ...existing });
        }
      }
    }

    return Array.from(map.values());
  };

  return {
    ...remote,
    ...local,
    company: remote.company || local.company,
    outlets: unionById(local.outlets, remote.outlets),
    kategori: unionById(local.kategori, remote.kategori),
    aroma: unionById(local.aroma, remote.aroma),
    ukuran: unionById(local.ukuran, remote.ukuran),
    harga: unionById(local.harga, remote.harga),
    produk: unionById(local.produk, remote.produk),
    bahan_baku: unionById(local.bahan_baku, remote.bahan_baku),
    pelanggan: unionById(local.pelanggan, remote.pelanggan),
    karyawan: unionById(local.karyawan, remote.karyawan),
    absensi: unionById(local.absensi, remote.absensi),
    payroll: unionById(local.payroll, remote.payroll),
    transaksi: unionById(local.transaksi, remote.transaksi),
    kasbon: unionById(local.kasbon, remote.kasbon),
    vouchers: unionById(local.vouchers, remote.vouchers),
    pending_orders: unionById(local.pending_orders, remote.pending_orders),
    suppliers: unionById(local.suppliers, remote.suppliers),
    purchase_orders: unionById(local.purchase_orders || local.po, remote.purchase_orders || remote.po),
    shifts: unionById(local.shifts || local.shift_sessions, remote.shifts || remote.shift_sessions),
    shift_schedules: unionById(local.shift_schedules, remote.shift_schedules),
    shift_groups: unionById(local.shift_groups, remote.shift_groups),
    opname_sessions: unionById(local.opname_sessions || local.opname, remote.opname_sessions || remote.opname),
    returns: unionById(local.returns, remote.returns),
    notifications: unionById(local.notifications, remote.notifications).slice(0, 100),
    point_ledger: unionById(local.point_ledger, remote.point_ledger),
    point_redemptions: unionById(local.point_redemptions, remote.point_redemptions),
    users: unionById(local.users, remote.users),
    roles: unionById(local.roles, remote.roles),
    log: unionById(local.log, remote.log).slice(0, 200),
    master: {
      ...(local.master || {}),
      ...(remote.master || {}),
      toko: { ...(local.master?.toko || {}), ...(remote.master?.toko || {}) },
      pajak: { ...(local.master?.pajak || {}), ...(remote.master?.pajak || {}) },
      poin: { ...(local.master?.poin || {}), ...(remote.master?.poin || {}) },
      absensi: { ...(local.master?.absensi || {}), ...(remote.master?.absensi || {}) },
      struk: { ...(local.master?.struk || {}), ...(remote.master?.struk || {}) },
      payroll_settings: { ...(local.master?.payroll_settings || {}), ...(remote.master?.payroll_settings || {}) },
    } as any,
    settings: {
      ...local.settings,
      ...remote.settings,
    },
    role_permissions: {
      ...(local.role_permissions || {}),
      ...(remote.role_permissions || {}),
    },
  };
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  storeId?: string;
  autoSync?: boolean;
}

export const getStoredSupabaseConfig = (): SupabaseConfig => {
  try {
    const savedUrl = localStorage.getItem('pos_supabase_url') || '';
    const savedKey = localStorage.getItem('pos_supabase_anon_key') || '';
    const savedStoreId = localStorage.getItem('pos_store_partition_id') || 'store_main';
    const envUrl = ((import.meta as any)?.env?.VITE_SUPABASE_URL as string) || '';
    const envKey = ((import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string) || '';

    return {
      url: (savedUrl.trim() || envUrl.trim() || SUPABASE_URL || ''),
      anonKey: (savedKey.trim() || envKey.trim() || SUPABASE_ANON || ''),
      storeId: savedStoreId.trim() || 'store_main',
      autoSync: localStorage.getItem('pos_auto_sync') !== 'false',
    };
  } catch {
    return { url: SUPABASE_URL || '', anonKey: SUPABASE_ANON || '', storeId: 'store_main', autoSync: true };
  }
};

export const saveSupabaseConfig = (config: Partial<SupabaseConfig>) => {
  try {
    if (config.url !== undefined) localStorage.setItem('pos_supabase_url', config.url.trim());
    if (config.anonKey !== undefined) localStorage.setItem('pos_supabase_anon_key', config.anonKey.trim());
    if (config.storeId !== undefined) localStorage.setItem('pos_store_partition_id', config.storeId.trim());
    if (config.autoSync !== undefined) localStorage.setItem('pos_auto_sync', String(config.autoSync));
    cachedClient = null;
  } catch (e) {
    console.error('Failed to save Supabase config', e);
  }
};

export const clearSupabaseConfig = () => {
  try {
    localStorage.removeItem('pos_supabase_url');
    localStorage.removeItem('pos_supabase_anon_key');
    cachedClient = null;
    if (activeSubscription) {
      activeSubscription = null;
    }
  } catch (e) {
    // ignore
  }
};

export const getSupabaseClient = (customUrl?: string, customKey?: string) => {
  const config = getStoredSupabaseConfig();
  const url = customUrl || config.url;
  const key = customKey || config.anonKey;
  if (!url || !key) return null;
  if (!cachedClient || cachedClient._url !== url) {
    try {
      cachedClient = createClient(url, key, {
        auth: { persistSession: false },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      cachedClient._url = url;
    } catch (err) {
      console.error('Failed to init Supabase client', err);
      return null;
    }
  }
  return cachedClient;
};

export const checkSupabaseConnection = async (
  customUrl?: string,
  customKey?: string
): Promise<{
  connected: boolean;
  status: 'connected_with_table' | 'connected_no_table' | 'disconnected';
  message: string;
}> => {
  try {
    const client = getSupabaseClient(customUrl, customKey);
    if (!client) {
      return { connected: false, status: 'disconnected', message: 'Kredensial URL / Anon Key kosong.' };
    }

    const { error } = await client.from('pos_backups').select('id, updated_at').limit(1);

    if (error) {
      // Table not created yet, but server reached successfully
      if (error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('not find the table')) {
        return {
          connected: true,
          status: 'connected_no_table',
          message: 'Terhubung ke server Supabase, namun tabel `pos_backups` belum dibuat di database.',
        };
      }
      return {
        connected: false,
        status: 'disconnected',
        message: `Koneksi ditolak Supabase: ${error.message} (${error.code || 'ERR'})`,
      };
    }

    return {
      connected: true,
      status: 'connected_with_table',
      message: 'Terhubung aktif & siap melakukan sinkronisasi cloud real-time.',
    };
  } catch (err: any) {
    return {
      connected: false,
      status: 'disconnected',
      message: `Gagal menghubungi server Supabase: ${err.message || 'Network error'}`,
    };
  }
};

export const uploadStateToSupabase = async (
  db: DatabaseState,
  customUrl?: string,
  customKey?: string,
  storeIdOverride?: string
): Promise<{ success: boolean; message: string; timestamp?: string }> => {
  try {
    const client = getSupabaseClient(customUrl, customKey);
    if (!client) return { success: false, message: 'Supabase client belum siap.' };

    const timestamp = new Date().toISOString();
    const targetStoreId = storeIdOverride || getStoreId(db);

    const payload = {
      id: targetStoreId,
      store_name: db.master?.toko?.nama || db.settings?.nama_toko || 'Parfumku POS',
      payload: db,
      client_id: CLIENT_SESSION_ID,
      client_timestamp: Date.now(),
      updated_at: timestamp,
    };

    const { error } = await client.from('pos_backups').upsert(payload, { onConflict: 'id' });

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('not find the table')) {
        return {
          success: false,
          message: 'Tabel `pos_backups` belum ada di Supabase. Silakan jalankan script SQL pembuatan tabel.',
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Data berhasil disinkronkan ke Supabase cloud!', timestamp };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal sinkronisasi' };
  }
};

export const downloadStateFromSupabase = async (
  customUrl?: string,
  customKey?: string,
  storeIdOverride?: string
): Promise<{
  success: boolean;
  data?: DatabaseState;
  updatedAt?: string;
  clientId?: string;
  clientTimestamp?: number;
  message: string;
}> => {
  try {
    const client = getSupabaseClient(customUrl, customKey);
    if (!client) return { success: false, message: 'Supabase client belum siap.' };

    const targetStoreId = storeIdOverride || getStoreId();

    const { data, error } = await client
      .from('pos_backups')
      .select('payload, updated_at, client_id, client_timestamp')
      .eq('id', targetStoreId)
      .maybeSingle();

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data || !data.payload) {
      return { success: false, message: 'Belum ada data cadangan di Supabase untuk toko ini.' };
    }

    return {
      success: true,
      data: data.payload,
      updatedAt: data.updated_at,
      clientId: data.client_id,
      clientTimestamp: data.client_timestamp,
      message: 'Berhasil memuat data dari Supabase!',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal memuat' };
  }
};

export type RealtimeSyncCallback = (
  incomingDb: DatabaseState,
  updatedAt: string,
  senderClientId?: string,
  clientTimestamp?: number
) => void;

export const subscribeToSupabaseRealtime = (
  onRemoteChange: RealtimeSyncCallback,
  customUrl?: string,
  customKey?: string,
  storeIdOverride?: string
) => {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) return () => {};

  const targetStoreId = storeIdOverride || getStoreId();

  try {
    if (activeSubscription) {
      client.removeChannel(activeSubscription);
      activeSubscription = null;
    }

    const channelName = `pos_realtime_${targetStoreId}_${Date.now()}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pos_backups',
          filter: `id=eq.${targetStoreId}`,
        },
        (payload: any) => {
          if (payload?.new && payload.new.payload) {
            const senderId = payload.new.client_id;
            const clientTimestamp = payload.new.client_timestamp || 0;

            // ECHO SUPPRESSION: If update originated from this client session, ignore it completely!
            if (senderId && senderId === CLIENT_SESSION_ID) {
              return;
            }

            onRemoteChange(
              payload.new.payload,
              payload.new.updated_at,
              senderId,
              clientTimestamp
            );
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Supabase Realtime] ✅ Channel aktif terhubung (${targetStoreId})`);
        }
      });

    activeSubscription = channel;

    return () => {
      try {
        if (client && channel) {
          client.removeChannel(channel);
        }
      } catch (e) {
        // cleanup ignore
      }
      activeSubscription = null;
    };
  } catch (err) {
    console.error('Realtime subscription error', err);
    return () => {};
  }
};

export const SUPABASE_SETUP_SQL = `-- =====================================================================
-- SKRIP SQL SUPABASE LENGKAP - PARFUMKU POS & RETAIL MANAGEMENT v7.0
-- Jalankan skrip ini di menu SQL Editor pada Dashboard Supabase Anda
-- =====================================================================

-- 1. TABEL UTAMA SINKRONISASI REALTIME POS (Aplikasi Kasir)
CREATE TABLE IF NOT EXISTS public.pos_backups (
  id TEXT PRIMARY KEY,
  store_name TEXT,
  payload JSONB NOT NULL,
  client_id TEXT,
  client_timestamp BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REPLICA IDENTITY FULL memastikan seluruh payload JSON dikirim saat event UPDATE Realtime
ALTER TABLE public.pos_backups REPLICA IDENTITY FULL;

-- Aktifkan Row Level Security (RLS) untuk pos_backups
ALTER TABLE public.pos_backups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pos_backups' AND policyname = 'Akses Publik POS'
  ) THEN
    CREATE POLICY "Akses Publik POS"
    ON public.pos_backups
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Daftarkan tabel sinkronisasi ke publikasi Realtime Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'pos_backups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_backups;
  END IF;
END $$;

-- =====================================================================
-- 2. TABEL-TABEL DATA RELASIONAL LENGKAP (NORMALIZED TABLES)
-- =====================================================================

-- TABEL: ROLES SISTEM & HAK AKSES
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY,
  nama TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  deskripsi TEXT,
  warna TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL: PENGGUNA SISTEM (USERS / KASIR LOGIN)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  nama_lengkap TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'kasir',
  pin TEXT DEFAULT '123456',
  password_hash TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL: KARYAWAN & STAF
CREATE TABLE IF NOT EXISTS public.karyawan (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  jabatan TEXT,
  telepon TEXT,
  gaji_pokok NUMERIC(12,2) DEFAULT 0,
  tunjangan NUMERIC(12,2) DEFAULT 0,
  pin TEXT DEFAULT '1234',
  role TEXT DEFAULT 'kasir',
  username TEXT,
  aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL: PRESENSI / ABSENSI KARYAWAN (BERFOTO & JAM KERJA)
CREATE TABLE IF NOT EXISTS public.absensi (
  id TEXT PRIMARY KEY,
  karyawan_id TEXT REFERENCES public.karyawan(id) ON DELETE SET NULL,
  karyawan_nama TEXT NOT NULL,
  tanggal DATE NOT NULL,
  jam_masuk TIME,
  jam_keluar TIME,
  status TEXT NOT NULL DEFAULT 'hadir', -- hadir, telat, izin, sakit, alfa, cuti
  foto_masuk TEXT,
  foto_keluar TEXT,
  lembur_jam NUMERIC(4,2) DEFAULT 0,
  keterangan TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL: KATALOG PRODUK & STOK
CREATE TABLE IF NOT EXISTS public.produk (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  nama TEXT NOT NULL,
  kategori_id TEXT,
  klasifikasi TEXT DEFAULT 'produk_jadi', -- refill, bahan_baku, botol, aksesoris, dll
  harga_jual NUMERIC(12,2) NOT NULL DEFAULT 0,
  harga_beli NUMERIC(12,2) NOT NULL DEFAULT 0,
  stok NUMERIC(10,2) NOT NULL DEFAULT 0,
  stok_min NUMERIC(10,2) NOT NULL DEFAULT 5,
  satuan TEXT DEFAULT 'pcs',
  foto TEXT,
  aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL: DATABASE PELANGGAN (CRM)
CREATE TABLE IF NOT EXISTS public.pelanggan (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  telepon TEXT,
  email TEXT,
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold
  poin INTEGER DEFAULT 0,
  total_belanja NUMERIC(14,2) DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  avatar TEXT,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL: TRANSAKSI PENJUALAN
CREATE TABLE IF NOT EXISTS public.transaksi (
  id TEXT PRIMARY KEY,
  nomor_struk TEXT UNIQUE NOT NULL,
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  kasir_id TEXT,
  kasir_nama TEXT NOT NULL,
  pelanggan_id TEXT REFERENCES public.pelanggan(id) ON DELETE SET NULL,
  pelanggan_nama TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  diskon NUMERIC(12,2) DEFAULT 0,
  voucher_kode TEXT,
  pajak NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  metode_bayar TEXT NOT NULL DEFAULT 'Tunai',
  jumlah_bayar NUMERIC(12,2) NOT NULL DEFAULT 0,
  kembalian NUMERIC(12,2) DEFAULT 0,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL: CATATAN KASBON PELANGGAN
CREATE TABLE IF NOT EXISTS public.kasbon (
  id TEXT PRIMARY KEY,
  pelanggan_id TEXT REFERENCES public.pelanggan(id) ON DELETE CASCADE,
  pelanggan_nama TEXT NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  terbayar NUMERIC(12,2) DEFAULT 0,
  sisa NUMERIC(12,2) NOT NULL,
  jatuh_tempo DATE,
  status TEXT DEFAULT 'belum_lunas', -- lunas, belum_lunas
  keterangan TEXT,
  riwayat_bayar JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL: SESI SHIFT KASIR
CREATE TABLE IF NOT EXISTS public.shifts (
  id TEXT PRIMARY KEY,
  kasir_id TEXT NOT NULL,
  kasir_nama TEXT NOT NULL,
  buka_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tutup_at TIMESTAMPTZ,
  modal_awal NUMERIC(12,2) NOT NULL DEFAULT 0,
  uang_fisik NUMERIC(12,2),
  total_penjualan NUMERIC(12,2) DEFAULT 0,
  total_transaksi INTEGER DEFAULT 0,
  status TEXT DEFAULT 'aktif', -- aktif, tutup
  catatan TEXT
);

-- TABEL: VOUCHER PROMO
CREATE TABLE IF NOT EXISTS public.vouchers (
  id TEXT PRIMARY KEY,
  kode TEXT UNIQUE NOT NULL,
  diskon NUMERIC(5,2) NOT NULL DEFAULT 0,
  kuota INTEGER DEFAULT 100,
  terpakai INTEGER DEFAULT 0,
  expired DATE,
  aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL: SUPPLIER & PURCHASE ORDER
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  telepon TEXT,
  email TEXT,
  alamat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  nomor TEXT UNIQUE NOT NULL,
  supplier TEXT NOT NULL,
  tgl DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, diterima
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 3. BUKA ROW LEVEL SECURITY (RLS) UNTUK SEMUA TABEL
-- =====================================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karyawan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelanggan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kasbon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Policy Akses Penuh untuk Anon & Authenticated Key
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Akses Penuh POS" ON public.%I;
      CREATE POLICY "Akses Penuh POS" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    ', tbl, tbl);
  END LOOP;
END $$;

-- 4. INDEKS UNTUK PERFORMA QUERY CEPAT
CREATE INDEX IF NOT EXISTS idx_produk_sku ON public.produk(sku);
CREATE INDEX IF NOT EXISTS idx_produk_barcode ON public.produk(barcode);
CREATE INDEX IF NOT EXISTS idx_transaksi_tgl ON public.transaksi(tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_kasir ON public.transaksi(kasir_id);
CREATE INDEX IF NOT EXISTS idx_absensi_tgl ON public.absensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_karyawan ON public.absensi(karyawan_id);
CREATE INDEX IF NOT EXISTS idx_pelanggan_telp ON public.pelanggan(telepon);
`;
