import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DatabaseState,
  User,
  CartItem,
  Pelanggan,
  Produk,
  ShiftSession,
  AppNotification,
  PendingOrder,
} from '../types';
import {
  DB_KEY,
  SESSION_KEY,
  THEME_KEY,
  THEME_COLOR_KEY,
  ROLE_PERMISSIONS,
  today,
  nowISO,
  uuid,
  verifyPassword,
  playSound,
  applyThemeColor,
} from '../utils/constants';
import { seedV7 } from '../utils/seed';
import {
  uploadStateToSupabase,
  downloadStateFromSupabase,
  subscribeToSupabaseRealtime,
} from '../services/supabase';

export interface ToastMessage {
  id: string;
  msg: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  msg: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm?: () => void;
}

export interface PinState {
  isOpen: boolean;
  msg: string;
  onApprove?: (approver: User) => void;
}

interface POSContextType {
  user: User | null;
  db: DatabaseState;
  updateDb: (updater: (prev: DatabaseState) => DatabaseState) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  activeShift: ShiftSession | null;
  bukaShift: (modalAwal: number) => void;
  tutupShift: (uangFisik: number, catatan?: string) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canAccess: (pageId: string) => boolean;
  canAction: (actionKey: string) => boolean;
  // Cart
  cart: CartItem[];
  addToCart: (produkId: string, qty?: number) => boolean;
  updateCartQty: (produkId: string, qty: number) => void;
  removeFromCart: (produkId: string) => void;
  clearCart: () => void;
  cartCustomer: Pelanggan | null;
  setCartCustomer: (p: Pelanggan | null) => void;
  cartVoucherCode: string;
  cartVoucherDiskon: number; // percentage
  applyVoucher: (code: string) => { success: boolean; msg: string };
  removeVoucher: () => void;
  cartManualDiskon: number;
  setCartManualDiskon: (val: number) => void;
  holdCurrentOrder: () => boolean;
  restorePendingOrder: (order: PendingOrder) => void;
  deletePendingOrder: (id: string) => void;
  // Computations
  cartSubtotal: number;
  cartDiskonTotal: number;
  cartPajakTotal: number;
  cartGrandTotal: number;
  cartTotalItems: number;
  // Modals & Popups
  toasts: ToastMessage[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  confirmState: ConfirmState;
  showConfirm: (title: string, msg: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info' | 'success') => void;
  closeConfirm: () => void;
  pinState: PinState;
  requestPinApproval: (msg: string, onApprove: (approver: User) => void) => void;
  closePin: () => void;
  // Logs & Notifs
  logActivity: (aksi: string, modul: string) => void;
  pushNotification: (title: string, msg: string, type?: 'info' | 'warning' | 'success' | 'error') => void;
  markNotificationsRead: () => void;
  // Aliases for cross-page compatibility
  currentUser: User | null;
  hasPermission: (pageIdOrKey: string) => boolean;
  setDb: (updater: DatabaseState | ((prev: DatabaseState) => DatabaseState)) => void;
  addNotification: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  openPinModal: (msg: string, onApprove: (approver?: any) => void) => void;
  // Cloud Sync
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'needs_table' | 'error';
  lastCloudSyncTime: string | null;
  triggerCloudSync: () => Promise<void>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const normalizeDb = (parsed: any): DatabaseState => {
    const seeded = seedV7();
    const merged = { ...seeded, ...parsed };
    if (!merged.settings && merged.master) {
      merged.settings = {
        nama_toko: merged.master.toko?.nama || 'PARFUMKU STORE',
        alamat: merged.master.toko?.alamat || 'Jl. Malioboro No. 45, Yogyakarta',
        telepon: merged.master.toko?.telepon || '0812-3456-7890',
        email: 'info@parfumku.id',
        website: 'www.parfumku.id',
        footer_struk: merged.master.toko?.footer || 'Terima Kasih Atas Kunjungan Anda',
        pajak_persen: merged.master.pajak?.persen || 0,
        biaya_layanan_persen: 0,
        poin_per_rupiah: merged.master.poin?.rate || 10000,
        nilai_per_poin: 100,
        printer_mode: merged.master.struk?.kertas === '80' ? '80mm' : '58mm',
        ...merged.master,
      };
    }
    if (!merged.po) merged.po = merged.purchase_orders || [];
    if (!merged.shift_sessions) merged.shift_sessions = merged.shifts || [];
    if (!merged.opname) merged.opname = merged.opname_sessions || [];
    if (!merged.role_permissions) merged.role_permissions = ROLE_PERMISSIONS;
    return merged;
  };

  // 1. Initial State from localStorage
  const [db, setDb] = useState<DatabaseState>(() => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return normalizeDb(parsed);
      }
    } catch (e) {
      console.warn('DB load fail', e);
    }
    return normalizeDb(seedV7());
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const sess = JSON.parse(raw);
        const initialDb = (() => {
          try {
            const rawDb = localStorage.getItem(DB_KEY);
            return rawDb ? JSON.parse(rawDb) : seedV7();
          } catch {
            return seedV7();
          }
        })();
        const found = (initialDb.users || []).find((u: User) => u.username === sess.username && u.aktif !== false);
        return found || null;
      }
    } catch {
      return null;
    }
    return null;
  });

  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [themeColor, setThemeColorState] = useState<string>(() => {
    return localStorage.getItem(THEME_COLOR_KEY) || 'emerald';
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success', duration = 3000) => {
    const id = uuid();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  // Confirm Modal
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    msg: '',
    type: 'danger',
  });
  const showConfirm = useCallback((title: string, msg: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' | 'success' = 'danger') => {
    setConfirmState({
      isOpen: true,
      title,
      msg,
      type,
      onConfirm,
    });
  }, []);
  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false, onConfirm: undefined }));
  }, []);

  // PIN Approval Modal
  const [pinState, setPinState] = useState<PinState>({
    isOpen: false,
    msg: '',
  });
  const requestPinApproval = useCallback((msg: string, onApprove: (approver: User) => void) => {
    setPinState({
      isOpen: true,
      msg,
      onApprove,
    });
  }, []);
  const closePin = useCallback(() => {
    setPinState((prev) => ({ ...prev, isOpen: false, onApprove: undefined }));
  }, []);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCustomer, setCartCustomer] = useState<Pelanggan | null>(null);
  const [cartVoucherCode, setCartVoucherCode] = useState<string>('');
  const [cartVoucherDiskon, setCartVoucherDiskon] = useState<number>(0);
  const [cartManualDiskon, setCartManualDiskon] = useState<number>(0);

  // Sync DB to localStorage
  const updateDb = useCallback((updater: (prev: DatabaseState) => DatabaseState) => {
    setDb((prev) => {
      const updated = updater(prev);
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Storage full or error', err);
      }
      return updated;
    });
  }, []);

  // Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'needs_table' | 'error'>('synced');
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);
  const syncTimeoutRef = useRef<any>(null);
  const isRemoteSyncRef = useRef<boolean>(false);

  const triggerCloudSync = useCallback(async () => {
    if (!navigator.onLine) {
      setCloudSyncStatus('offline');
      return;
    }
    setCloudSyncStatus('syncing');
    const res = await uploadStateToSupabase(db);
    if (res.success) {
      setCloudSyncStatus('synced');
      setLastCloudSyncTime(res.timestamp || new Date().toISOString());
    } else if (res.message && res.message.includes('pos_backups')) {
      setCloudSyncStatus('needs_table');
    } else {
      setCloudSyncStatus('error');
    }
  }, [db]);

  // Debounced auto-sync whenever db changes
  useEffect(() => {
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      return;
    }
    if (!navigator.onLine) {
      setCloudSyncStatus('offline');
      return;
    }

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      setCloudSyncStatus('syncing');
      const res = await uploadStateToSupabase(db);
      if (res.success) {
        setCloudSyncStatus('synced');
        setLastCloudSyncTime(res.timestamp || new Date().toISOString());
      } else if (res.message && res.message.includes('pos_backups')) {
        setCloudSyncStatus('needs_table');
      } else {
        setCloudSyncStatus('error');
      }
    }, 1200);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [db]);

  // Initial cloud fetch and realtime subscription
  useEffect(() => {
    // 1. Initial connection check & pull
    downloadStateFromSupabase().then((res) => {
      if (res.success && res.data) {
        isRemoteSyncRef.current = true;
        setDb(res.data);
        setCloudSyncStatus('synced');
        if (res.updatedAt) setLastCloudSyncTime(res.updatedAt);
      }
    });

    // 2. Realtime listener across devices
    const unsubscribe = subscribeToSupabaseRealtime((incomingDb, updatedAt) => {
      isRemoteSyncRef.current = true;
      setDb(incomingDb);
      setCloudSyncStatus('synced');
      setLastCloudSyncTime(updatedAt);
      showToast('⚡ Data diperbarui dari cloud secara realtime', 'info', 2000);
    });

    // 3. Online/offline listener
    const handleOnline = () => {
      setCloudSyncStatus('syncing');
      triggerCloudSync();
    };
    const handleOffline = () => setCloudSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Log Activity
  const logActivity = useCallback((aksi: string, modul: string) => {
    updateDb((prev) => {
      const logs = prev.log || [];
      const newLog = {
        id: uuid(),
        user: user?.nama || 'System',
        aksi,
        modul,
        created_at: nowISO(),
      };
      return {
        ...prev,
        log: [newLog, ...logs.slice(0, 199)],
      };
    });
  }, [updateDb, user]);

  // Notifications
  const pushNotification = useCallback((title: string, msg: string, type: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    updateDb((prev) => {
      const notifs = prev.notifications || [];
      const newNotif: AppNotification = {
        id: uuid(),
        title,
        msg,
        type,
        read: false,
        created_at: nowISO(),
      };
      return {
        ...prev,
        notifications: [newNotif, ...notifs.slice(0, 49)],
      };
    });
  }, [updateDb]);

  const markNotificationsRead = useCallback(() => {
    updateDb((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => ({ ...n, read: true })),
    }));
  }, [updateDb]);

  // Active Shift
  const activeShift = useMemo(() => {
    if (!user) return null;
    return (db.shifts || []).find((s) => s.status === 'aktif' && s.kasir_id === user.id) || null;
  }, [db.shifts, user]);

  const bukaShift = useCallback((modalAwal: number) => {
    if (!user) return;
    const newSession: ShiftSession = {
      id: uuid(),
      kasir_id: user.id,
      kasir_nama: user.nama,
      buka_at: nowISO(),
      modal_awal: modalAwal,
      status: 'aktif',
      total_penjualan: 0,
      total_transaksi: 0,
    };
    updateDb((prev) => ({
      ...prev,
      shifts: [newSession, ...(prev.shifts || [])],
    }));
    logActivity(`Buka shift dengan modal ${modalAwal}`, 'Shift');
    showToast('✅ Shift berhasil dibuka', 'success');
  }, [user, updateDb, logActivity, showToast]);

  const tutupShift = useCallback((uangFisik: number, catatan?: string) => {
    if (!activeShift) return;
    updateDb((prev) => ({
      ...prev,
      shifts: (prev.shifts || []).map((s) =>
        s.id === activeShift.id
          ? {
              ...s,
              status: 'tutup',
              tutup_at: nowISO(),
              uang_fisik: uangFisik,
              catatan: catatan || '',
            }
          : s
      ),
    }));
    logActivity(`Tutup shift. Fisik: ${uangFisik}`, 'Shift');
    showToast('✅ Shift ditutup', 'info');
  }, [activeShift, updateDb, logActivity, showToast]);

  // Login & Logout
  const login = useCallback(async (usernameVal: string, passwordVal: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = usernameVal.trim().toLowerCase();
    const cleanPass = passwordVal.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Username dan password wajib diisi' };
    }

    const found = (db.users || []).find((u) => u.username === cleanUser);
    if (!found || found.aktif === false) {
      return { success: false, error: 'User tidak ditemukan atau nonaktif' };
    }

    if (!verifyPassword(cleanPass, found.password_hash)) {
      return { success: false, error: 'Password salah' };
    }

    setUser(found);
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ userId: found.id, username: found.username, loginAt: nowISO() })
    );

    logActivity(`User login: ${found.username}`, 'Auth');
    showToast(`👋 Selamat datang, ${found.nama}!`, 'success');
    return { success: true };
  }, [db.users, logActivity, showToast]);

  const logout = useCallback(() => {
    if (user) {
      logActivity(`User logout: ${user.username}`, 'Auth');
    }
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    showToast('👋 Berhasil keluar', 'info');
  }, [user, logActivity, showToast]);

  // Permissions
  const canAccess = useCallback((pageId: string): boolean => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    const rolePerms = db.role_permissions?.[user.role] || ROLE_PERMISSIONS[user.role] || [];
    const perms = (user.permissions && user.permissions.length > 0 ? user.permissions : rolePerms).map((p) =>
      p.toLowerCase().replace(/^page_/, '').replace(/_/g, '-')
    );
    if (perms.includes('*')) return true;
    const cleanId = pageId.toLowerCase().replace(/^page_/, '').replace(/_/g, '-');
    return perms.includes(cleanId);
  }, [user, db.role_permissions]);

  const canAction = useCallback((actionKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'owner' || (user.permissions && user.permissions.includes('*'))) return true;
    const rolePerms = db.role_permissions?.[user.role] || ROLE_PERMISSIONS[user.role] || [];
    const allowed = (user.permissions && user.permissions.length > 0 ? user.permissions : rolePerms);
    if (actionKey.startsWith('produk.') && allowed.includes('produk')) return true;
    if (actionKey.startsWith('pelanggan.') && allowed.includes('pelanggan')) return true;
    return false;
  }, [user, db.role_permissions]);

  // Theme
  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyThemeColor(themeColor, next === 'dark');
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    showToast(next === 'dark' ? '🌙 Dark Mode aktif' : '☀️ Light Mode aktif', 'info', 1500);
  }, [theme, themeColor, showToast]);

  const setThemeColor = useCallback((colorId: string) => {
    setThemeColorState(colorId);
    applyThemeColor(colorId, theme === 'dark');
    updateDb((prev) => ({
      ...prev,
      master: {
        ...prev.master,
        theme_color: colorId,
      },
    }));
    showToast('🎨 Tema warna berhasil diubah', 'success', 2000);
  }, [theme, updateDb, showToast]);

  useEffect(() => {
    applyThemeColor(themeColor, theme === 'dark');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, themeColor]);

  // Cart operations
  const addToCart = useCallback((produkId: string, qty = 1): boolean => {
    const prod = (db.produk || []).find((p) => p.id === produkId);
    if (!prod) return false;
    if (prod.stok <= 0) {
      showToast(`⚠️ Stok produk ${prod.nama} habis!`, 'warning');
      playSound('error', db.master?.sound?.aktif);
      return false;
    }

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === produkId);
      if (idx >= 0) {
        const item = prev[idx];
        const newQty = item.qty + qty;
        if (newQty > prod.stok) {
          showToast(`Stok maksimal ${prod.nama} hanya ${prod.stok}`, 'warning');
          return prev;
        }
        const updated = [...prev];
        updated[idx] = {
          ...item,
          qty: newQty,
          subtotal: newQty * item.harga,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: prod.id,
          sku: prod.sku,
          nama: prod.nama,
          harga: prod.harga_jual,
          qty: Math.min(qty, prod.stok),
          subtotal: Math.min(qty, prod.stok) * prod.harga_jual,
          foto: prod.foto,
          stok: prod.stok,
        };
        return [...prev, newItem];
      }
    });

    playSound('add', db.master?.sound?.aktif);
    return true;
  }, [db.produk, db.master?.sound?.aktif, showToast]);

  const updateCartQty = useCallback((produkId: string, qty: number) => {
    const prod = (db.produk || []).find((p) => p.id === produkId);
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== produkId));
      return;
    }
    if (prod && qty > prod.stok) {
      showToast(`Stok hanya ${prod.stok}`, 'warning');
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.id === produkId
          ? {
              ...i,
              qty,
              subtotal: qty * i.harga,
            }
          : i
      )
    );
  }, [db.produk, showToast]);

  const removeFromCart = useCallback((produkId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== produkId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCartCustomer(null);
    setCartVoucherCode('');
    setCartVoucherDiskon(0);
    setCartManualDiskon(0);
  }, []);

  const applyVoucher = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return { success: false, msg: 'Masukkan kode voucher' };
    const v = (db.vouchers || []).find((x) => x.kode === clean && x.aktif);
    if (!v) {
      return { success: false, msg: 'Voucher tidak valid atau sudah nonaktif' };
    }
    if (v.kuota && v.terpakai >= v.kuota) {
      return { success: false, msg: 'Kuota voucher sudah habis' };
    }
    setCartVoucherCode(v.kode);
    setCartVoucherDiskon(v.diskon);
    return { success: true, msg: `Voucher ${v.kode} (${v.diskon}%) berhasil dipasang` };
  }, [db.vouchers]);

  const removeVoucher = useCallback(() => {
    setCartVoucherCode('');
    setCartVoucherDiskon(0);
  }, []);

  // Hold current order
  const holdCurrentOrder = useCallback((): boolean => {
    if (cart.length === 0) {
      showToast('Keranjang masih kosong', 'warning');
      return false;
    }
    const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
    const diskon = (subtotal * (cartVoucherDiskon / 100)) + cartManualDiskon;
    const afterDiskon = Math.max(0, subtotal - diskon);
    const pajak = db.master?.pajak?.aktif ? Math.round(afterDiskon * ((db.master.pajak.persen || 0) / 100)) : 0;
    const total = afterDiskon + pajak;

    const newPending: PendingOrder = {
      id: uuid(),
      nomor: 'HOLD-' + Math.floor(1000 + Math.random() * 9000),
      tanggal: today(),
      pelanggan: cartCustomer,
      items: [...cart],
      subtotal,
      diskon,
      voucher_kode: cartVoucherCode,
      pajak,
      total,
      created_at: nowISO(),
    };

    updateDb((prev) => ({
      ...prev,
      pending_orders: [newPending, ...(prev.pending_orders || [])],
    }));

    clearCart();
    playSound('success', db.master?.sound?.aktif);
    showToast(`Order ${newPending.nomor} berhasil di-hold`, 'info');
    return true;
  }, [cart, cartVoucherDiskon, cartManualDiskon, cartCustomer, cartVoucherCode, db.master, updateDb, clearCart, showToast]);

  const restorePendingOrder = useCallback((order: PendingOrder) => {
    setCart(order.items);
    setCartCustomer(order.pelanggan);
    setCartVoucherCode(order.voucher_kode || '');
    setCartManualDiskon(order.diskon || 0);

    // Remove from pending
    updateDb((prev) => ({
      ...prev,
      pending_orders: (prev.pending_orders || []).filter((o) => o.id !== order.id),
    }));

    showToast(`Order ${order.nomor} berhasil dipanggil`, 'success');
  }, [updateDb, showToast]);

  const deletePendingOrder = useCallback((id: string) => {
    updateDb((prev) => ({
      ...prev,
      pending_orders: (prev.pending_orders || []).filter((o) => o.id !== id),
    }));
    showToast('Pending order dihapus', 'info');
  }, [updateDb, showToast]);

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartDiskonTotal = useMemo(() => {
    const voucherCut = (cartSubtotal * cartVoucherDiskon) / 100;
    return voucherCut + cartManualDiskon;
  }, [cartSubtotal, cartVoucherDiskon, cartManualDiskon]);

  const cartPajakTotal = useMemo(() => {
    if (!db.master?.pajak?.aktif) return 0;
    const afterDiskon = Math.max(0, cartSubtotal - cartDiskonTotal);
    return Math.round(afterDiskon * ((db.master.pajak.persen || 0) / 100));
  }, [cartSubtotal, cartDiskonTotal, db.master?.pajak]);

  const cartGrandTotal = useMemo(() => {
    const afterDiskon = Math.max(0, cartSubtotal - cartDiskonTotal);
    return afterDiskon + cartPajakTotal;
  }, [cartSubtotal, cartDiskonTotal, cartPajakTotal]);

  const cartTotalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  return (
    <POSContext.Provider
      value={{
        user,
        db,
        updateDb,
        currentPage,
        setCurrentPage,
        theme,
        toggleTheme,
        themeColor,
        setThemeColor,
        activeShift,
        bukaShift,
        tutupShift,
        login,
        logout,
        canAccess,
        canAction,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartCustomer,
        setCartCustomer,
        cartVoucherCode,
        cartVoucherDiskon,
        applyVoucher,
        removeVoucher,
        cartManualDiskon,
        setCartManualDiskon,
        holdCurrentOrder,
        restorePendingOrder,
        deletePendingOrder,
        cartSubtotal,
        cartDiskonTotal,
        cartPajakTotal,
        cartGrandTotal,
        cartTotalItems,
        toasts,
        showToast,
        confirmState,
        showConfirm,
        closeConfirm,
        pinState,
        requestPinApproval,
        closePin,
        logActivity,
        pushNotification,
        markNotificationsRead,
        currentUser: user,
        hasPermission: canAccess,
        setDb,
        addNotification: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => showToast(msg, type),
        openPinModal: (msg: string, onApprove: (approver?: any) => void) => requestPinApproval(msg, (u) => onApprove(u)),
        cloudSyncStatus,
        lastCloudSyncTime,
        triggerCloudSync,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
