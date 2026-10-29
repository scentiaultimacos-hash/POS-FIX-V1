import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { User } from '../types';
import { Shield, Plus, Edit2, Trash2, Key, Check, X } from 'lucide-react';
import { hashPassword } from '../utils/constants';

type RoleType = string;

const DEFAULT_ROLES = ['owner', 'manager', 'kasir', 'gudang'];

const ALL_PERMISSIONS: { key: string; label: string; group: string }[] = [
  { key: 'page_dashboard', label: 'Akses Dashboard', group: 'Menu' },
  { key: 'page_kasir', label: 'Akses Mesin Kasir', group: 'Menu' },
  { key: 'page_pending', label: 'Pending Order', group: 'Menu' },
  { key: 'page_redeem', label: 'Tukar Poin', group: 'Menu' },
  { key: 'page_barcode_designer', label: 'Barcode Designer', group: 'Menu' },
  { key: 'page_produk', label: 'Kelola Produk', group: 'Katalog' },
  { key: 'page_inventori', label: 'Bahan Baku & Resep', group: 'Katalog' },
  { key: 'page_opname', label: 'Stock Opname', group: 'Katalog' },
  { key: 'page_supplier', label: 'Supplier & PO', group: 'Katalog' },
  { key: 'page_pelanggan', label: 'Pelanggan CRM', group: 'CRM' },
  { key: 'page_kasbon', label: 'Buku Kasbon', group: 'CRM' },
  { key: 'page_voucher', label: 'Voucher Promo', group: 'CRM' },
  { key: 'page_rfm', label: 'Analisis RFM', group: 'CRM' },
  { key: 'page_karyawan', label: 'Kelola Karyawan', group: 'SDM' },
  { key: 'page_shift', label: 'Jadwal & Shift', group: 'SDM' },
  { key: 'page_absensi', label: 'Absensi Kamera', group: 'SDM' },
  { key: 'page_payroll', label: 'Penggajian / Payroll', group: 'SDM' },
  { key: 'page_laporan', label: 'Semua Laporan', group: 'Laporan' },
  { key: 'page_hak_akses', label: 'Hak Akses & User', group: 'Sistem' },
  { key: 'page_master', label: 'Pengaturan Toko', group: 'Sistem' },
  { key: 'page_database', label: 'Manajemen Database', group: 'Sistem' },

  { key: 'discount_above_10', label: 'Beri Diskon > 10%', group: 'Otorisasi' },
  { key: 'void_item', label: 'Void / Hapus Item Belanja', group: 'Otorisasi' },
  { key: 'cancel_order', label: 'Batalkan Seluruh Transaksi', group: 'Otorisasi' },
  { key: 'open_cash_drawer', label: 'Buka Cash Drawer Tanpa Transaksi', group: 'Otorisasi' },
  { key: 'reprint_receipt', label: 'Cetak Ulang Struk Lama', group: 'Otorisasi' },
  { key: 'edit_stock', label: 'Koreksi Stok Manual', group: 'Otorisasi' },
  { key: 'view_cogs', label: 'Lihat HPP & Laba Bersih', group: 'Otorisasi' },
];

export const HakAksesPage: React.FC = () => {
  const { db, setDb, currentUser, addNotification, openPinModal } = usePOS();
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');

  const availableRoles = (db.roles && db.roles.length > 0)
    ? db.roles
    : DEFAULT_ROLES.map(r => ({ id: r, nama: r, label: r.toUpperCase() }));

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

  const openNewUser = () => {
    setEditingUser(null);
    setUsername('');
    setNamaLengkap('');
    setRole('kasir');
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
      setDb(prev => ({
        ...prev,
        users: prev.users.map(u => {
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
        })
      }));
      addNotification(`User ${username} berhasil diperbarui`, 'success');
    } else {
      if (!password) {
        addNotification('Password wajib diisi untuk user baru', 'error');
        return;
      }
      if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
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
        permissions: [],
        created_at: new Date().toISOString()
      };
      setDb(prev => ({ ...prev, users: [...prev.users, newUser] }));
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
      setDb(prev => ({ ...prev, users: prev.users.filter(item => item.id !== u.id) }));
      addNotification(`User ${displayName} telah dihapus`, 'success');
    });
  };

  const toggleRolePermission = (permKey: string) => {
    if (matrixRole === 'owner') {
      addNotification('Owner memiliki semua hak akses secara absolut', 'info');
      return;
    }
    const rolePerms = db.role_permissions || {};
    const currentList = rolePerms[matrixRole] || [];
    const hasPerm = currentList.includes(permKey);
    const updated = hasPerm
      ? currentList.filter((k: string) => k !== permKey)
      : [...currentList, permKey];

    setDb(prev => ({
      ...prev,
      role_permissions: {
        ...(prev.role_permissions || {}),
        [matrixRole]: updated
      }
    }));
  };

  const groups = Array.from(new Set(ALL_PERMISSIONS.map(p => p.group)));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Hak Akses & Manajemen User
          </h1>
          <p className="text-xs md:text-sm text-slate-500">Kelola kredensial akun kasir, manager, dan matriks hak akses sistem</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'users' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'
              }`}
            >
              Pengguna ({db.users.length})
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'matrix' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'
              }`}
            >
              Matriks Akses Role
            </button>
          </div>
          {activeTab === 'users' && (
            <button
              onClick={openNewUser}
              className="bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tambah User
            </button>
          )}
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-app-border overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 border-b border-app-border">
                <tr>
                  <th className="p-4 font-bold">Pengguna</th>
                  <th className="p-4 font-bold">Username</th>
                  <th className="p-4 font-bold">Role Level</th>
                  <th className="p-4 font-bold">PIN Otorisasi</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {db.users.map(u => {
                  const displayName = u.nama_lengkap || u.nama || u.username;
                  const isActiveUser = u.is_active ?? u.aktif ?? true;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black uppercase text-sm">
                            {displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-white">{displayName}</div>
                            <div className="text-[10px] text-slate-400">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">@{u.username}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          u.role === 'owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                          u.role === 'manager' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' :
                          u.role === 'gudang' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}>
                          {String(u.role)}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {u.pin ? '••••••' : <span className="text-red-400">Belum diset</span>}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActiveUser ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActiveUser ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {isActiveUser ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditUser(u)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-primary"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500"
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-app-border p-6 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-4">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white">Pilih Role untuk Dikelola</h2>
              <p className="text-xs text-slate-500">Centang fitur yang diizinkan untuk setiap peran pengguna</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map(r => (
                <button
                  key={r.nama}
                  onClick={() => setMatrixRole(r.nama)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    matrixRole === r.nama
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {r.label || r.nama}
                </button>
              ))}
            </div>
          </div>

          {matrixRole === 'owner' ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
              Role <b>Owner</b> adalah super-administrator dan memiliki seluruh izin akses sistem secara default.
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(grp => (
              <div key={grp} className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-app-border space-y-3">
                <div className="font-extrabold text-xs uppercase tracking-wider text-slate-400 border-b border-app-border pb-2">
                  {grp}
                </div>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.filter(p => p.group === grp).map(perm => {
                    const rolePerms = db.role_permissions || {};
                    const hasPerm = matrixRole === 'owner' || (rolePerms[matrixRole] || []).includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        onClick={() => toggleRolePermission(perm.key)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          hasPerm
                            ? 'bg-primary/10 text-primary-dark dark:text-primary-light font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span>{perm.label}</span>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          hasPerm ? 'bg-primary text-white' : 'border border-slate-300 dark:border-slate-600'
                        }`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-app-border shadow-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-app-border">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                {editingUser ? 'Edit User Pengguna' : 'Tambah User Baru'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={namaLengkap}
                  onChange={e => setNamaLengkap(e.target.value)}
                  placeholder="cth: Rian Kasir 1"
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="cth: rian"
                    className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                  >
                    {availableRoles.map(r => (
                      <option key={r.nama} value={r.nama}>
                        {r.label || r.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Password {editingUser && <span className="text-[10px] text-slate-400 font-normal">(Kosongkan jika tidak diubah)</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={editingUser ? '••••••••' : 'Password baru'}
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">PIN Otorisasi (6 Digit)</label>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-3 py-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 text-xs font-mono tracking-widest"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Akun Aktif (Dapat Login)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-app-border">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-app-border text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm"
                >
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
