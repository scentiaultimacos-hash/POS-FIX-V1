import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON } from '../utils/constants';
import { DatabaseState } from '../types';

let cachedClient: any = null;
let activeSubscription: RealtimeChannel | null = null;

export const getSupabaseClient = (customUrl?: string, customKey?: string) => {
  const url = customUrl || SUPABASE_URL;
  const key = customKey || SUPABASE_ANON;
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
      // PGRST205 / 42P01: Table not created yet, but server reached successfully
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
  customKey?: string
): Promise<{ success: boolean; message: string; timestamp?: string }> => {
  try {
    const client = getSupabaseClient(customUrl, customKey);
    if (!client) return { success: false, message: 'Supabase client belum siap.' };

    const timestamp = new Date().toISOString();
    const payload = {
      id: 'default_store',
      store_name: db.master?.toko?.nama || db.settings?.nama_toko || 'Parfumku POS',
      payload: db,
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
  customKey?: string
): Promise<{ success: boolean; data?: DatabaseState; updatedAt?: string; message: string }> => {
  try {
    const client = getSupabaseClient(customUrl, customKey);
    if (!client) return { success: false, message: 'Supabase client belum siap.' };

    const { data, error } = await client
      .from('pos_backups')
      .select('payload, updated_at')
      .eq('id', 'default_store')
      .maybeSingle();

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data || !data.payload) {
      return { success: false, message: 'Belum ada data cadangan di Supabase.' };
    }

    return {
      success: true,
      data: data.payload,
      updatedAt: data.updated_at,
      message: 'Berhasil memuat data dari Supabase!',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal memuat' };
  }
};

export type RealtimeSyncCallback = (incomingDb: DatabaseState, updatedAt: string) => void;

export const subscribeToSupabaseRealtime = (
  onRemoteChange: RealtimeSyncCallback,
  customUrl?: string,
  customKey?: string
) => {
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) return () => {};

  try {
    if (activeSubscription) {
      client.removeChannel(activeSubscription);
      activeSubscription = null;
    }

    const channel = client
      .channel('pos_backups_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pos_backups',
          filter: 'id=eq.default_store',
        },
        (payload: any) => {
          if (payload?.new && payload.new.payload) {
            onRemoteChange(payload.new.payload, payload.new.updated_at);
          }
        }
      )
      .subscribe();

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

export const SUPABASE_SETUP_SQL = `-- Jalankan SQL ini di menu SQL Editor pada Dashboard Supabase Anda:
CREATE TABLE IF NOT EXISTS public.pos_backups (
  id TEXT PRIMARY KEY,
  store_name TEXT,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aktifkan Realtime Replication untuk tabel pos_backups
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_backups;

-- Buka izin akses baca & tulis anonim (publik POS)
ALTER TABLE public.pos_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses Publik Anonim POS"
ON public.pos_backups
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
`;
