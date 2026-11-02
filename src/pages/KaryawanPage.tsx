import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, uuid, hashPassword } from '../utils/constants';
import { Karyawan, Role, User } from '../types';
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Shield,
  Search,
  Filter,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

const DEFAULT_ROLES: Role[] = [
  { id: 'r1', nama: 'owner', label: 'Owner', deskripsi: 'Akses penuh seluruh sistem', warna: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  { id: 'r2', nama: 'manager', label: 'Manager', deskripsi: 'Kelola toko & laporan', warna: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
  { id: 'r3', nama: 'kasir', label: 'Kasir', deskripsi: 'Operasional kasir & penjualan', warna: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' },
  { id: 'r4', nama: 'gudang', label: 'Gudang', deskripsi: 'Stok, opname, & supplier', warna: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
];

export const KaryawanPage: React.FC = () => {
  const { db, updateDb, showToast, showConfirm, logActivity, setCurrentPage } = usePOS();
  const list = db.karyawan || [];

  // Dynamically resolve roles from database, combining db.roles with defaults
  const availableRoles: Role[] = React.useMemo(() => {
    const customRoles = db.roles || [];
    const roleMap = new Map<string, Role>();
    DEFAULT_ROLES.forEach((r) => roleMap.set(r.nama.toLowerCase(), r));
    customRoles.forEach((r) => roleMap.set(r.nama.toLowerCase(), r));
    return Array.from(roleMap.values());
  }, [db.roles]);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKar, setEditingKar] = useState<Karyawan | null>(null);

  // Form states
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('Kasir');
  const [telepon, setTelepon] = useState('');
  const [gajiPokok, setGajiPokok] = useState(2500000);
  const [tunjangan, setTunjangan] = useState(500000);
  const [pin, setPin] = useState('1234');
  const [role, setRole] = useState('kasir');
  const [createLoginAccount, setCreateLoginAccount] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Quick Add Role Modal
  const [isQuickRoleModalOpen, setIsQuickRoleModalOpen] = useState(false);
  const [quickRoleName, setQuickRoleName] = useState('');
  const [quickRoleDesc, setQuickRoleDesc] = useState('');
  const [quickRoleColor, setQuickRoleColor] = useState('bg-teal-100 text-teal-800');

  const openAdd = () => {
    setEditingKar(null);
    setNama('');
    setJabatan('Kasir');
    setTelepon('');
    setGajiPokok(2500000);
    setTunjangan(500000);
    setPin('1234');
    setRole(availableRoles[0]?.nama || 'kasir');
    setCreateLoginAccount(true);
    setLoginUsername('');
    setLoginPassword('');
    setIsModalOpen(true);
  };

  const openEdit = (k: Karyawan) => {
    setEditingKar(k);
    setNama(k.nama);
    setJabatan(k.jabatan);
    setTelepon(k.telepon);
    setGajiPokok(k.gaji_pokok);
    setTunjangan(k.tunjangan);
    setPin(k.pin);
    setRole(k.role);
    setCreateLoginAccount(false);
    setLoginUsername(k.username || '');
    setLoginPassword('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      showToast('Nama karyawan wajib diisi', 'error');
      return;
    }

    const usernameGenerated = (loginUsername.trim() || nama.trim().toLowerCase().replace(/[^a-z0-9]/g, '')) || 'staff_' + Math.floor(100 + Math.random() * 900);

    if (editingKar) {
      updateDb((prev) => {
        // Update employee
        const updatedKaryawan = (prev.karyawan || []).map((k) =>
          k.id === editingKar.id
            ? {
                ...k,
                nama: nama.trim(),
                jabatan: jabatan.trim() || nama.trim(),
                telepon,
                gaji_pokok: gajiPokok,
                tunjangan,
                pin,
                role,
                username: k.username || usernameGenerated,
              }
            : k
        );

        // Also sync role in db.users if a linked account exists
        const updatedUsers = (prev.users || []).map((u) => {
          if (u.username === editingKar.username || u.nama === editingKar.nama || u.id === `usr_${editingKar.id}`) {
            return {
              ...u,
              nama: nama.trim(),
              nama_lengkap: nama.trim(),
              role,
              pin: pin || u.pin,
            };
          }
          return u;
        });

        return {
          ...prev,
          karyawan: updatedKaryawan,
          users: updatedUsers,
        };
      });

      logActivity(`Edit data karyawan: ${nama} (Role: ${role})`, 'Karyawan');
      showToast('✅ Data karyawan & role berhasil diperbarui', 'success');
    } else {
      const newId = uuid();
      const newK: Karyawan = {
        id: newId,
        nama: nama.trim(),
        jabatan: jabatan.trim() || 'Staf',
        telepon,
        gaji_pokok: gajiPokok,
        tunjangan,
        pin: pin || '1234',
        role,
        username: usernameGenerated,
        aktif: true,
      };

      updateDb((prev) => {
        const usersList = prev.users || [];
        let newUsers = [...usersList];

        if (createLoginAccount) {
          const userExists = usersList.some(
            (u) => u.username.toLowerCase() === usernameGenerated.toLowerCase()
          );

          if (!userExists) {
            const pwd = loginPassword.trim() || pin || '123456';
            const newUser: User = {
              id: `usr_${newId}`,
              username: usernameGenerated,
              nama: nama.trim(),
              nama_lengkap: nama.trim(),
              role,
              pin: pin || '123456',
              password_hash: hashPassword(pwd),
              aktif: true,
              is_active: true,
              permissions: prev.role_permissions?.[role] || [],
              created_at: new Date().toISOString(),
            };
            newUsers.push(newUser);
          }
        }

        return {
          ...prev,
          karyawan: [newK, ...(prev.karyawan || [])],
          users: newUsers,
        };
      });

      logActivity(`Tambah karyawan baru: ${nama} (Role: ${role})`, 'Karyawan');
      showToast('✅ Karyawan baru ditambahkan dan role terhubung', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (k: Karyawan) => {
    showConfirm('Hapus Karyawan', `Hapus data karyawan "${k.nama}"?`, () => {
      updateDb((prev) => ({
        ...prev,
        karyawan: (prev.karyawan || []).filter((item) => item.id !== k.id),
      }));
      showToast('Karyawan dihapus', 'info');
      logActivity(`Hapus karyawan: ${k.nama}`, 'Karyawan');
    });
  };

  const handleQuickAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const label = quickRoleName.trim();
    if (!label) {
      showToast('Nama role wajib diisi', 'error');
      return;
    }

    const slug = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existing = db.roles || [];
    if (existing.some((r) => r.nama.toLowerCase() === slug || r.label.toLowerCase() === label.toLowerCase())) {
      showToast('Role ini sudah ada!', 'warning');
      setRole(slug);
      setIsQuickRoleModalOpen(false);
      return;
    }

    const newRoleObj: Role = {
      id: 'role_' + Date.now().toString(36),
      nama: slug,
      label,
      deskripsi: quickRoleDesc.trim() || `Role ${label}`,
      warna: quickRoleColor,
    };

    updateDb((prev) => {
      const rolePerms = { ...(prev.role_permissions || {}) };
      if (!rolePerms[slug]) {
        // Default permission set for new role
        rolePerms[slug] = ['dashboard', 'kasir', 'produk', 'pelanggan'];
      }
      return {
        ...prev,
        roles: [...(prev.roles || []), newRoleObj],
        role_permissions: rolePerms,
      };
    });

    setRole(slug);
    setIsQuickRoleModalOpen(false);
    setQuickRoleName('');
    setQuickRoleDesc('');
    showToast(`✅ Role "${label}" berhasil dibuat dan langsung dipilih`, 'success');
    logActivity(`Tambah role kustom: ${label}`, 'Role');
  };

  const filteredList = list.filter((k) => {
    const matchesSearch =
      k.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.jabatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (k.telepon || '').includes(searchTerm);
    const matchesRole = roleFilter === 'all' || k.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4 animate-fade-in p-4 md:p-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 md:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-[#00C9A7]" /> Data Karyawan & Staf Toko
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola staf toko, jabatan, gaji pokok, sinkronisasi role & hak akses akun kasir
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage('hak-akses')}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Shield className="w-4 h-4 text-primary" /> Matriks Hak Akses
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari karyawan, jabatan, HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:border-[#00C9A7] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-500">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:border-[#00C9A7] outline-none"
          >
            <option value="all">Semua Role ({list.length})</option>
            {availableRoles.map((r) => (
              <option key={r.nama} value={r.nama}>
                {r.label || r.nama.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Karyawan Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase font-bold border-b border-slate-100 dark:border-slate-700/60">
              <tr>
                <th className="py-3.5 px-4">Nama Staf</th>
                <th className="py-3.5 px-4">Jabatan</th>
                <th className="py-3.5 px-4">No. WhatsApp</th>
                <th className="py-3.5 px-4 text-center">Role Akses Sistem</th>
                <th className="py-3.5 px-4 text-right">Gaji Pokok</th>
                <th className="py-3.5 px-4 text-right">Tunjangan</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ada data karyawan yang cocok dengan pencarian
                  </td>
                </tr>
              ) : (
                filteredList.map((k) => {
                  const roleObj = availableRoles.find(
                    (r) => r.nama.toLowerCase() === (k.role || '').toLowerCase()
                  );
                  const roleColor = roleObj?.warna || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
                  const roleLabel = roleObj?.label || k.role || 'Kasir';

                  return (
                    <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#00C9A7] font-black flex items-center justify-center text-xs shadow-2xs">
                            {k.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold">{k.nama}</div>
                            {k.username && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                @{k.username}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {k.jabatan}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{k.telepon || '-'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${roleColor}`}>
                          {roleLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-700 dark:text-slate-200">
                        {fmtRp(k.gaji_pokok)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                        {fmtRp(k.tunjangan)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(k)}
                            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#00C9A7] transition-colors"
                            title="Edit Karyawan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(k)}
                            className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 transition-colors"
                            title="Hapus Karyawan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Karyawan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-200 dark:border-slate-700 animate-slide-up my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-[#00C9A7]" />
                {editingKar ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Kasir Utama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-900 font-semibold focus:border-[#00C9A7] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jabatan Operasional
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kasir Shift 1"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-900 focus:border-[#00C9A7] outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Role Sistem *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickRoleModalOpen(true)}
                      className="text-[10px] text-[#00C9A7] font-extrabold hover:underline"
                    >
                      + Role Baru
                    </button>
                  </div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-900 font-bold focus:border-[#00C9A7] outline-none"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.nama} value={r.nama}>
                        {r.label || r.nama.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="0812xxxxxxx"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-900 focus:border-[#00C9A7] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    PIN Otorisasi (4-6 Digit)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="123456"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono dark:bg-slate-900 text-center tracking-widest focus:border-[#00C9A7] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Gaji Pokok (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={gajiPokok}
                    onChange={(e) => setGajiPokok(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-900 font-bold focus:border-[#00C9A7] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tunjangan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tunjangan}
                    onChange={(e) => setTunjangan(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-900 focus:border-[#00C9A7] outline-none"
                  />
                </div>
              </div>

              {/* Account login integration */}
              {!editingKar && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createLoginAccount}
                      onChange={(e) => setCreateLoginAccount(e.target.checked)}
                      className="rounded border-slate-300 text-[#00C9A7] focus:ring-[#00C9A7] w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      Buat Akun Login Kasir / Sistem Sekaligus
                    </span>
                  </label>

                  {createLoginAccount && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-semibold block mb-0.5">Username Login:</span>
                        <input
                          type="text"
                          placeholder="cth: ryan"
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block mb-0.5">Password:</span>
                        <input
                          type="password"
                          placeholder="Default: sesuai PIN"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-black shadow-sm transition-all"
                >
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Role Modal */}
      {isQuickRoleModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-200 dark:border-slate-700 animate-slide-up">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700 mb-3">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#00C9A7]" /> Tambah Role Kustom Baru
              </h4>
              <button
                onClick={() => setIsQuickRoleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddRole} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama / Label Role *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Supervisor, Blender, Sales"
                  value={quickRoleName}
                  onChange={(e) => setQuickRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-900 font-semibold focus:border-[#00C9A7] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Deskripsi Singkat
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Mengawasi operasional dan shift kasir"
                  value={quickRoleDesc}
                  onChange={(e) => setQuickRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs dark:bg-slate-900 focus:border-[#00C9A7] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Warna Badge
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Teal', val: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' },
                    { label: 'Blue', val: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
                    { label: 'Purple', val: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
                    { label: 'Amber', val: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
                    { label: 'Rose', val: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
                  ].map((col) => (
                    <button
                      key={col.label}
                      type="button"
                      onClick={() => setQuickRoleColor(col.val)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${col.val} ${
                        quickRoleColor === col.val ? 'ring-2 ring-teal-500 scale-105' : 'opacity-70'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickRoleModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold shadow-sm"
                >
                  Simpan Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
