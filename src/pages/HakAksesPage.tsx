import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { User, Role } from '../types';
import { Shield, Plus, Edit2, Trash2, Key, Check, X, Users, Lock, Sparkles } from 'lucide-react';
import { hashPassword, ROLE_PERMISSIONS } from '../utils/constants';

type RoleType = string;

const DEFAULT_ROLES: Role[] = [
  { id: 'r1', nama: 'owner', label: 'Owner', deskripsi: 'Akses penuh seluruh sistem', warna: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  { id: 'r2', nama: 'manager', label: 'Manager', deskripsi: 'Kelola toko & laporan', warna: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
  { id: 'r3', nama: 'kasir', label: 'Kasir', deskripsi: 'Operasional kasir & penjualan', warna: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' },
  { id: 'r4', nama: 'gudang', label: 'Gudang', deskripsi: 'Stok, opname, & supplier', warna: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
];

const ALL_PERMISSIONS: { key: string; label: string; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard & Statistik', group: 'Menu Utama' },
  { key: 'kasir', label: 'Mesin Kasir (POS)', group: 'Menu Utama' },
  { key: 'pending', label: 'Pending Order (Hold/Call)', group: 'Menu Utama' },
  { key: 'redeem', label: 'Tukar Poin Loyalty', group: 'Menu Utama' },
  { key: 'barcode-designer', label: 'Barcode & QR Designer', group: 'Menu Utama' },

  { key: 'produk', label: 'Kelola Katalog Produk', group: 'Katalog & Stok' },
  { key: 'inventori', label: 'Bahan Baku & Inventori', group: 'Katalog & Stok' },
  { key: 'opname', label: 'Stock Opname Fisik', group: 'Katalog & Stok' },
  { key: 'supplier', label: 'Supplier & Purchase Order', group: 'Katalog & Stok' },

  { key: 'pelanggan', label: 'Database CRM Pelanggan', group: 'CRM & Keuangan' },
  { key: 'kasbon', label: 'Buku Catatan Kasbon', group: 'CRM & Keuangan' },
  { key: 'voucher', label: 'Voucher & Diskon Promo', group: 'CRM & Keuangan' },
  { key: 'rfm', label: 'Analisis RFM Pelanggan', group: 'CRM & Keuangan' },

  { key: 'karyawan', label: 'Daftar Karyawan', group: 'SDM & Shift' },
  { key: 'shift-groups', label: 'Grup Shift Kerja', group: 'SDM & Shift' },
  { key: 'shift-schedule', label: 'Jadwal Roster Shift', group: 'SDM & Shift' },
  { key: 'absensi', label: 'Presensi Foto Selfie', group: 'SDM & Shift' },
  { key: 'payroll', label: 'Penggajian / Payroll', group: 'SDM & Shift' },
  { key: 'laporan-karyawan', label: 'Laporan Kinerja Karyawan', group: 'SDM & Shift' },
  { key: 'shift-history', label: 'Riwayat Tutup Shift', group: 'SDM & Shift' },

  { key: 'laporan-penjualan', label: 'Laporan Penjualan', group: 'Laporan' },
  { key: 'laporan-kasir', label: 'Laporan Kasir', group: 'Laporan' },
  { key: 'laporan-retur', label: 'Laporan Retur', group: 'Laporan' },
  { key: 'laporan-stok', label: 'Laporan Stok & Mutasi', group: 'Laporan' },
  { key: 'laporan-keuangan', label: 'Laporan Laba Rugi', group: 'Laporan' },

  { key: 'hak-akses', label: 'Hak Akses & User', group: 'Sistem' },
  { key: 'master', label: 'Pengaturan Toko', group: 'Sistem' },
  { key: 'database', label: 'Database Cleanup', group: 'Sistem' },
];

export const HakAksesPage: React.FC = () => {
  const { db, setDb, currentUser, addNotification, openPinModal } = usePOS();
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');

  // Combined roles list
  const availableRoles: Role[] = React.useMemo(() => {
    const customRoles = db.roles || [];
    const roleMap = new Map<string, Role>();
    DEFAULT_ROLES.forEach((r) => roleMap.set(r.nama.toLowerCase(), r));
    customRoles.forEach((r) => roleMap.set(r.nama.toLowerCase(), r));
    return Array.from(roleMap.values());
  }, [db.roles]);

  // User form modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [role, setRole] = useState<RoleType>('kasir');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Selected role for matrix tab
  const [matrixRole, setMatrixRole] = useState<RoleType>('kasir');

  // Role creation modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleWarna, setNewRoleWarna] = useState('bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300');
  const [newRoleInitialPerms, setNewRoleInitialPerms] = useState<string[]>([
    'dashboard',
    'kasir',
    'produk',
    'pelanggan',
  ]);

  const openNewUser = () => {
    setEditingUser(null);
    setUsername('');
    setNamaLengkap('');
    setRole(availableRoles[0]?.nama || 'kasir');
    setPassword('');
    setPin('');
    setIsActive(true);
    setIsUserModalOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setNamaLengkap(u.nama_lengkap || u.nama || '');
    setRole((u.role as RoleType) || 'kasir');
    setPassword('');
    setPin(u.pin || '');
    setIsActive(u.is_active ?? u.aktif ?? true);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !namaLengkap.trim()) {
      addNotification('Username dan Nama Lengkap wajib diisi', 'error');
      return;
    }

    if (editingUser) {
      setDb((prev) => ({
        ...prev,
        users: prev.users.map((u) => {
          if (u.id === editingUser.id) {
            return {
              ...u,
              username: username.trim(),
              nama: namaLengkap.trim(),
              nama_lengkap: namaLengkap.trim(),
              role,
              pin: pin || u.pin,
              aktif: isActive,
              is_active: isActive,
              password_hash: password ? hashPassword(password) : u.password_hash,
            };
          }
          return u;
        }),
      }));
      addNotification(`User ${username} berhasil diperbarui`, 'success');
    } else {
      if (!password) {
        addNotification('Password wajib diisi untuk user baru', 'error');
        return;
      }
      if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        addNotification('Username sudah digunakan', 'error');
        return;
      }
      const newUser: User = {
        id: 'usr_' + Date.now(),
        username: username.trim(),
        nama: namaLengkap.trim(),
        nama_lengkap: namaLengkap.trim(),
        role,
        pin: pin || '123456',
        password_hash: hashPassword(password),
        aktif: isActive,
        is_active: isActive,
        permissions: db.role_permissions?.[role] || [],
        created_at: new Date().toISOString(),
      };
      setDb((prev) => ({ ...prev, users: [...prev.users, newUser] }));
      addNotification(`User ${username} berhasil didaftarkan`, 'success');
    }
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === currentUser?.id) {
      addNotification('Tidak dapat menghapus akun Anda sendiri!', 'error');
      return;
    }
    const displayName = u.nama_lengkap || u.nama || u.username;
    openPinModal(`Hapus user ${displayName}?`, () => {
      setDb((prev) => ({ ...prev, users: prev.users.filter((item) => item.id !== u.id) }));
      addNotification(`User ${displayName} telah dihapus`, 'success');
    });
  };

  const toggleRolePermission = (permKey: string) => {
    if (matrixRole === 'owner') {
      addNotification('Owner memiliki semua hak akses secara absolut', 'info');
      return;
    }
    const rolePerms = db.role_permissions || {};
    const defaultList = ROLE_PERMISSIONS[matrixRole] || [];
    const currentList = rolePerms[matrixRole] !== undefined ? rolePerms[matrixRole] : defaultList;

    const hasPerm = currentList.includes(permKey) || currentList.includes('*');
    const updated = hasPerm
      ? currentList.filter((k: string) => k !== permKey && k !== '*')
      : [...currentList, permKey];

    setDb((prev) => ({
      ...prev,
      role_permissions: {
        ...(prev.role_permissions || {}),
        [matrixRole]: updated,
      },
    }));
  };

  const handleSaveNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newRoleLabel.trim();
    if (!label) {
      addNotification('Nama role wajib diisi', 'error');
      return;
    }

    const slug = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existing = db.roles || [];
    if (existing.some((r) => r.nama.toLowerCase() === slug || r.label.toLowerCase() === label.toLowerCase())) {
      addNotification('Role ini sudah ada!', 'warning');
      return;
    }

    const newRoleObj: Role = {
      id: 'role_' + Date.now().toString(36),
      nama: slug,
      label,
      deskripsi: newRoleDesc.trim() || `Role kustom ${label}`,
      warna: newRoleWarna,
    };

    setDb((prev) => ({
      ...prev,
      roles: [...(prev.roles || []), newRoleObj],
      role_permissions: {
        ...(prev.role_permissions || {}),
        [slug]: newRoleInitialPerms,
      },
    }));

    setMatrixRole(slug);
    setIsRoleModalOpen(false);
    setNewRoleLabel('');
    setNewRoleDesc('');
    addNotification(`✅ Role "${label}" berhasil dibuat dan terhubung ke data karyawan`, 'success');
  };

  const handleDeleteRole = (r: Role) => {
    if (['owner', 'manager', 'kasir', 'gudang'].includes(r.nama.toLowerCase())) {
      addNotification('Role sistem utama tidak dapat dihapus', 'error');
      return;
    }

    openPinModal(`Hapus role "${r.label}"?`, () => {
      setDb((prev) => {
        const nextRoles = (prev.roles || []).filter((item) => item.nama !== r.nama);
        const nextKaryawan = (prev.karyawan || []).map((k) =>
          k.role === r.nama ? { ...k, role: 'kasir' } : k
        );
        const nextUsers = (prev.users || []).map((u) =>
          u.role === r.nama ? { ...u, role: 'kasir' } : u
        );
        const nextPerms = { ...(prev.role_permissions || {}) };
        delete nextPerms[r.nama];

        return {
          ...prev,
          roles: nextRoles,
          karyawan: nextKaryawan,
          users: nextUsers,
          role_permissions: nextPerms,
        };
      });

      setMatrixRole('kasir');
      addNotification(`Role "${r.label}" telah dihapus`, 'info');
    });
  };

  const groups = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.group)));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 md:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#00C9A7]" />
            Hak Akses & Manajemen Role User
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola role kustom (Supervisor, Sales, Kurir), matriks izin, dan kredensial akun kasir
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-[#00C9A7]'
                  : 'text-slate-500'
              }`}
            >
              Pengguna ({db.users.length})
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'matrix'
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-[#00C9A7]'
                  : 'text-slate-500'
              }`}
            >
              Matriks Izin Role ({availableRoles.length})
            </button>
          </div>

          <button
            onClick={() => setIsRoleModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#00C9A7]" /> Tambah Role Baru
          </button>

          {activeTab === 'users' && (
            <button
              onClick={openNewUser}
              className="bg-[#00C9A7] hover:bg-[#00B894] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Tambah User
            </button>
          )}
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase font-bold border-b border-slate-100 dark:border-slate-700/60">
                <tr>
                  <th className="p-4">Pengguna</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Role Akses</th>
                  <th className="p-4">PIN Otorisasi</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {db.users.map((u) => {
                  const displayName = u.nama_lengkap || u.nama || u.username;
                  const isActiveUser = u.is_active ?? u.aktif ?? true;
                  const roleObj = availableRoles.find((r) => r.nama === u.role);
                  const roleColor =
                    roleObj?.warna ||
                    (u.role === 'owner'
                      ? 'bg-amber-100 text-amber-700'
                      : u.role === 'manager'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-emerald-100 text-emerald-700');

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950 text-[#00C9A7] flex items-center justify-center font-black uppercase text-sm shadow-2xs">
                            {displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-white">
                              {displayName}
                            </div>
                            <div className="text-[10px] text-slate-400">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        @{u.username}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${roleColor}`}>
                          {roleObj?.label || u.role}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {u.pin ? '••••••' : <span className="text-red-400">Belum diset</span>}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActiveUser
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActiveUser ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          ></span>
                          {isActiveUser ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditUser(u)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 hover:text-[#00C9A7] transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                            title="Hapus User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MATRIX TAB */
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 md:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h2 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                Pilih Role untuk Mengatur Izin Akses
              </h2>
              <p className="text-xs text-slate-500">
                Pilih peran pengguna di bawah untuk mengaktifkan atau menonaktifkan modul sistem
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {availableRoles.map((r) => {
                const isSelected = matrixRole.toLowerCase() === r.nama.toLowerCase();
                const isCustom = !['owner', 'manager', 'kasir', 'gudang'].includes(r.nama.toLowerCase());

                return (
                  <div key={r.nama} className="relative group flex items-center">
                    <button
                      onClick={() => setMatrixRole(r.nama)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#00C9A7] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>{r.label || r.nama}</span>
                    </button>
                    {isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(r);
                        }}
                        className="ml-1 p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        title={`Hapus role ${r.label}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="px-3 py-2 rounded-2xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-[#00C9A7] text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Role Baru
              </button>
            </div>
          </div>

          {matrixRole === 'owner' ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Role <b>Owner</b> adalah administrator utama dan memiliki akses penuh ke seluruh menu aplikasi secara permanen.</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>Mengatur izin untuk role:</span>
              <span className="font-extrabold uppercase text-[#00C9A7]">
                {availableRoles.find((r) => r.nama === matrixRole)?.label || matrixRole}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((grp) => (
              <div
                key={grp}
                className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 space-y-3"
              >
                <div className="font-black text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  {grp}
                </div>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.filter((p) => p.group === grp).map((perm) => {
                    const rolePerms = db.role_permissions || {};
                    const currentList =
                      rolePerms[matrixRole] !== undefined
                        ? rolePerms[matrixRole]
                        : ROLE_PERMISSIONS[matrixRole] || [];

                    const hasPerm =
                      matrixRole === 'owner' ||
                      currentList.includes('*') ||
                      currentList.includes(perm.key) ||
                      currentList.includes(perm.key.replace(/-/g, '_'));

                    return (
                      <label
                        key={perm.key}
                        onClick={() => toggleRolePermission(perm.key)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                          hasPerm
                            ? 'bg-teal-50/80 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800/60'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        <span>{perm.label}</span>
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                            hasPerm
                              ? 'bg-[#00C9A7] text-white shadow-2xs'
                              : 'border border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {hasPerm && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Add/Edit User */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 animate-slide-up my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-[#00C9A7]" />
                {editingUser ? 'Edit User Pengguna' : 'Tambah User Baru'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  placeholder="Contoh: Ahmad Kasir"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:border-[#00C9A7] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    placeholder="ahmad"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold focus:border-[#00C9A7] outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Role Level
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserModalOpen(false);
                        setIsRoleModalOpen(true);
                      }}
                      className="text-[10px] text-[#00C9A7] font-bold hover:underline"
                    >
                      + Role
                    </button>
                  </div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:border-[#00C9A7] outline-none"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.nama} value={r.nama}>
                        {r.label || r.nama.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Password{' '}
                  {editingUser && (
                    <span className="text-[10px] text-slate-400 font-normal lowercase">
                      (kosongkan jika tidak diubah)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? '••••••••' : 'Password login'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:border-[#00C9A7] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  PIN Otorisasi (6 Digit)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono tracking-widest text-center focus:border-[#00C9A7] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-[#00C9A7] focus:ring-[#00C9A7] w-4 h-4"
                />
                <label
                  htmlFor="isActiveCheck"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Akun Aktif (Dapat Login ke Kasir & Sistem)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-black shadow-sm transition-all"
                >
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Role Baru */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 animate-slide-up my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#00C9A7]" />
                Tambah Role Baru
              </h3>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRole} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Nama / Label Role *
                </label>
                <input
                  type="text"
                  required
                  value={newRoleLabel}
                  onChange={(e) => setNewRoleLabel(e.target.value)}
                  placeholder="Contoh: Supervisor, Blender, Sales Marketing"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:border-[#00C9A7] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Deskripsi Tanggung Jawab
                </label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Contoh: Mengawasi operasional dan shift harian"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:border-[#00C9A7] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Warna Label Badge
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Teal', val: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' },
                    { label: 'Blue', val: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
                    { label: 'Purple', val: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
                    { label: 'Amber', val: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
                    { label: 'Rose', val: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
                    { label: 'Slate', val: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
                  ].map((col) => (
                    <button
                      key={col.label}
                      type="button"
                      onClick={() => setNewRoleWarna(col.val)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all ${col.val} ${
                        newRoleWarna === col.val ? 'ring-2 ring-teal-500 scale-105' : 'opacity-70'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                  Hak Akses Modul Awal
                </label>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto space-y-1.5">
                  {ALL_PERMISSIONS.slice(0, 15).map((p) => {
                    const isChecked = newRoleInitialPerms.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        className="flex items-center justify-between text-[11px] cursor-pointer hover:bg-white dark:hover:bg-slate-800 p-1.5 rounded-lg"
                      >
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {p.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRoleInitialPerms((prev) => [...prev, p.key]);
                            } else {
                              setNewRoleInitialPerms((prev) => prev.filter((k) => k !== p.key));
                            }
                          }}
                          className="rounded border-slate-300 text-[#00C9A7] focus:ring-[#00C9A7] w-3.5 h-3.5"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-black shadow-sm transition-all"
                >
                  Simpan Role Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
