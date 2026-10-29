import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { fmtRp, nowISO, today, uuid } from '../utils/constants';
import { ShiftGroup, ShiftSchedule, ShiftSession } from '../types';
import {
  Users2,
  CalendarClock,
  Clock,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

/* -------------------------------------------------------------
 * 1. Shift Groups Page
 * ------------------------------------------------------------- */
export const ShiftGroupsPage: React.FC = () => {
  const { db, updateDb, showToast, showConfirm, logActivity } = usePOS();
  const list = db.shift_groups || [];
  const karyawanList = db.karyawan || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ShiftGroup | null>(null);

  const [nama, setNama] = useState('Pagi');
  const [jamMulai, setJamMulai] = useState('08:00');
  const [jamSelesai, setJamSelesai] = useState('14:00');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const openAdd = () => {
    setEditingGroup(null);
    setNama('Pagi');
    setJamMulai('08:00');
    setJamSelesai('14:00');
    setSelectedStaffIds([]);
    setIsModalOpen(true);
  };

  const openEdit = (g: ShiftGroup) => {
    setEditingGroup(g);
    setNama(g.nama);
    setJamMulai(g.jam_mulai);
    setJamSelesai(g.jam_selesai);
    setSelectedStaffIds(g.karyawan_ids || []);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      showToast('Nama grup shift wajib diisi', 'error');
      return;
    }

    if (editingGroup) {
      updateDb((prev) => ({
        ...prev,
        shift_groups: (prev.shift_groups || []).map((g) =>
          g.id === editingGroup.id
            ? { ...g, nama: nama.trim(), jam_mulai: jamMulai, jam_selesai: jamSelesai, karyawan_ids: selectedStaffIds }
            : g
        ),
      }));
      showToast('✅ Grup shift diperbarui', 'success');
    } else {
      const newG: ShiftGroup = {
        id: uuid(),
        nama: nama.trim(),
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        karyawan_ids: selectedStaffIds,
        created_at: nowISO(),
      };
      updateDb((prev) => ({
        ...prev,
        shift_groups: [newG, ...(prev.shift_groups || [])],
      }));
      logActivity(`Tambah grup shift: ${nama}`, 'Shift');
      showToast('✅ Grup shift berhasil dibuat', 'success');
    }
    setIsModalOpen(false);
  };

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Users2 className="w-6 h-6 text-[#00C9A7]" /> Konfigurasi Grup Shift Kerja
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Atur jam kerja shift pagi, siang, malam, dan staf yang bertugas
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Buat Grup Shift Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((g) => {
          const assignedStaff = karyawanList.filter((k) => (g.karyawan_ids || []).includes(k.id));
          return (
            <div
              key={g.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00C9A7]" /> Shift {g.nama}
                  </h3>
                  <button
                    onClick={() => openEdit(g)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 text-xs mb-3 text-center">
                  <span className="text-slate-500 dark:text-slate-400">Jam Operasional: </span>
                  <b className="text-[#00C9A7] text-sm font-bold font-mono">
                    {g.jam_mulai} - {g.jam_selesai}
                  </b>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Staf Bertugas ({assignedStaff.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {assignedStaff.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Belum ada staf ditugaskan</span>
                    ) : (
                      assignedStaff.map((st) => (
                        <span
                          key={st.id}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium"
                        >
                          👤 {st.nama}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Group */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">
              {editingGroup ? 'Edit Grup Shift' : 'Grup Shift Baru'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Nama Shift *</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Misal: Pagi, Siang, Malam"
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900 text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900 text-center font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5">Pilih Karyawan:</label>
                <div className="space-y-1 max-h-36 overflow-y-auto border p-2 rounded-xl text-xs dark:bg-slate-900">
                  {karyawanList.map((k) => (
                    <label key={k.id} className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.includes(k.id)}
                        onChange={() => toggleStaff(k.id)}
                        className="rounded text-[#00C9A7]"
                      />
                      <span>{k.nama} ({k.jabatan})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#00C9A7] text-white text-xs font-bold">
                  Simpan Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------
 * 2. Shift Schedule Page (Weekly Roster Calendar)
 * ------------------------------------------------------------- */
export const ShiftSchedulePage: React.FC = () => {
  const { db, updateDb, showToast } = usePOS();
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute days of current week (Monday to Sunday)
  const weekDays = React.useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7;
    const monday = new Date(d.setDate(diff));

    const days: { dateStr: string; label: string; dateNum: number }[] = [];
    const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      days.push({
        dateStr: cur.toISOString().slice(0, 10),
        label: dayNames[i],
        dateNum: cur.getDate(),
      });
    }
    return days;
  }, [weekOffset]);

  const schedules = db.shift_schedules || [];
  const staff = db.karyawan || [];

  const handleCellClick = (karyawanId: string, dateStr: string) => {
    const existing = schedules.find((s) => s.karyawan_id === karyawanId && s.tanggal === dateStr);
    const shifts = ['Pagi', 'Siang', 'Malam', 'OFF'];
    const curIdx = existing ? shifts.indexOf(existing.shift) : -1;
    const nextShift = shifts[(curIdx + 1) % shifts.length];

    updateDb((prev) => {
      const filtered = (prev.shift_schedules || []).filter(
        (s) => !(s.karyawan_id === karyawanId && s.tanggal === dateStr)
      );
      if (nextShift === 'OFF') {
        return { ...prev, shift_schedules: filtered };
      }
      const newEntry: ShiftSchedule = {
        id: uuid(),
        karyawan_id: karyawanId,
        tanggal: dateStr,
        shift: nextShift,
        jam_mulai: nextShift === 'Pagi' ? '08:00' : nextShift === 'Siang' ? '14:00' : '20:00',
        jam_selesai: nextShift === 'Pagi' ? '14:00' : nextShift === 'Siang' ? '20:00' : '02:00',
      };
      return {
        ...prev,
        shift_schedules: [...filtered, newEntry],
      };
    });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-[#00C9A7]" /> Jadwal & Roster Shift Mingguan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Klik kolom hari pada staf untuk mengganti shift (Pagi ➔ Siang ➔ Malam ➔ OFF)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((p) => p - 1)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-600 hover:bg-slate-50 shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#00C9A7]">
            {weekDays[0].dateStr} s/d {weekDays[6].dateStr}
          </span>
          <button
            onClick={() => setWeekOffset((p) => p + 1)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-600 hover:bg-slate-50 shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 text-left w-44">Nama Staf</th>
                {weekDays.map((d) => (
                  <th key={d.dateStr} className="py-2.5 px-3">
                    <div>{d.label}</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">{d.dateNum}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staff.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                  <td className="py-3 px-4 text-left font-bold text-slate-800 dark:text-white">
                    {k.nama}
                    <div className="text-[10px] text-slate-400 font-normal">{k.jabatan}</div>
                  </td>
                  {weekDays.map((d) => {
                    const sch = schedules.find(
                      (s) => s.karyawan_id === k.id && s.tanggal === d.dateStr
                    );
                    const shift = sch ? sch.shift : 'OFF';
                    const shiftBadge =
                      shift === 'Pagi'
                        ? 'bg-emerald-100 text-emerald-800 font-bold'
                        : shift === 'Siang'
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : shift === 'Malam'
                        ? 'bg-purple-100 text-purple-800 font-bold'
                        : 'bg-slate-100 text-slate-400';

                    return (
                      <td
                        key={d.dateStr}
                        onClick={() => handleCellClick(k.id, d.dateStr)}
                        className="py-2 px-1 cursor-pointer select-none"
                      >
                        <span className={`px-2 py-1 rounded-lg text-[10px] inline-block w-full transition-transform active:scale-95 ${shiftBadge}`}>
                          {shift}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
 * 3. Shift History Page (Cashier Sessions Log)
 * ------------------------------------------------------------- */
export const ShiftHistoryPage: React.FC = () => {
  const { db } = usePOS();
  const list = db.shifts || [];

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-[#00C9A7]" /> Riwayat Shift & Rekap Kas
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Log pembukaan dan penutupan shift kasir, modal awal, omset, dan selisih uang fisik
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Waktu Buka</th>
                <th className="py-3 px-4">Waktu Tutup</th>
                <th className="py-3 px-4 text-right">Modal Awal</th>
                <th className="py-3 px-4 text-right">Penjualan</th>
                <th className="py-3 px-4 text-right">Uang Fisik</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Belum ada riwayat shift
                  </td>
                </tr>
              ) : (
                list.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                      {s.kasir_nama}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(s.buka_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {s.tutup_at ? new Date(s.tutup_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{fmtRp(s.modal_awal)}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#00C9A7]">
                      {fmtRp(s.total_penjualan || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {s.uang_fisik ? fmtRp(s.uang_fisik) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          s.status === 'aktif'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.status === 'aktif' ? '🟢 Aktif' : 'Tutup'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const ShiftPages: React.FC<{ initialTab?: 'roster' | 'groups' | 'history' }> = ({ initialTab = 'roster' }) => {
  const [tab, setTab] = useState<'roster' | 'groups' | 'history'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'roster' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-slate-500'
          }`}
        >
          📅 Jadwal Mingguan (Roster)
        </button>
        <button
          onClick={() => setTab('groups')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'groups' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-slate-500'
          }`}
        >
          👥 Master Grup Shift
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'history' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-slate-500'
          }`}
        >
          🕒 Riwayat Sesi Kasir
        </button>
      </div>

      {tab === 'roster' && <ShiftSchedulePage />}
      {tab === 'groups' && <ShiftGroupsPage />}
      {tab === 'history' && <ShiftHistoryPage />}
    </div>
  );
};
