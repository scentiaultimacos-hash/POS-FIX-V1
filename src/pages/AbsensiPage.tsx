import React, { useRef, useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { today, nowISO, uuid } from '../utils/constants';
import { AbsensiRecord } from '../types';
import { Camera, Video, LogIn, LogOut, Plus, FileText, Check, X, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const AbsensiPage: React.FC = () => {
  const { db, updateDb, showToast, logActivity } = usePOS();
  const staff = db.karyawan || [];
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id || '');
  const [filterTanggal, setFilterTanggal] = useState<string>(today());

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Manual attendance modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualStaffId, setManualStaffId] = useState('');
  const [manualStatus, setManualStatus] = useState<AbsensiRecord['status']>('hadir');
  const [manualJamMasuk, setManualJamMasuk] = useState('08:00');
  const [manualJamKeluar, setManualJamKeluar] = useState('17:00');

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsCameraActive(true);
      }
    } catch {
      showToast('Kamera tidak dapat diakses atau diblokir browser', 'error');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const s = videoRef.current.srcObject as MediaStream;
      s.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, 320, 320);
      const data = canvas.toDataURL('image/jpeg', 0.7);
      setCapturedPhoto(data);
      showToast('📸 Foto wajah berhasil diambil', 'success');
    }
  };

  const handleAbsen = (tipe: 'masuk' | 'keluar') => {
    const k = staff.find((s) => s.id === selectedStaffId);
    if (!k) {
      showToast('Pilih karyawan terlebih dahulu', 'error');
      return;
    }

    const tgl = today();
    const jamNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    updateDb((prev) => {
      const existing = (prev.absensi || []).find(
        (a) => a.karyawan_id === k.id && a.tanggal === tgl && !a.deleted_at
      );

      if (tipe === 'masuk') {
        if (existing && existing.jam_masuk) {
          showToast(`${k.nama} sudah absen masuk hari ini`, 'warning');
          return prev;
        }

        const isLate = jamNow > (db.master?.absensi?.jam_masuk_max || '09:00');
        const newRecord: AbsensiRecord = {
          id: uuid(),
          karyawan_id: k.id,
          karyawan_nama: k.nama,
          tanggal: tgl,
          jam_masuk: jamNow,
          status: isLate ? 'telat' : 'hadir',
          foto_masuk: capturedPhoto || undefined,
        };

        logActivity(`Absen MASUK: ${k.nama} (${jamNow})`, 'Absensi');
        showToast(`✅ Absen Masuk berhasil: ${k.nama}`, 'success');
        return {
          ...prev,
          absensi: [newRecord, ...(prev.absensi || [])],
        };
      } else {
        // Keluar
        if (!existing) {
          showToast(`Karyawan belum absen masuk hari ini`, 'error');
          return prev;
        }
        if (existing.jam_keluar) {
          showToast(`${k.nama} sudah absen keluar`, 'warning');
          return prev;
        }

        const updated = (prev.absensi || []).map((a) =>
          a.id === existing.id
            ? { ...a, jam_keluar: jamNow, foto_keluar: capturedPhoto || undefined }
            : a
        );

        logActivity(`Absen KELUAR: ${k.nama} (${jamNow})`, 'Absensi');
        showToast(`✅ Absen Keluar berhasil: ${k.nama}`, 'success');
        return {
          ...prev,
          absensi: updated,
        };
      }
    });

    setCapturedPhoto(null);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const k = staff.find((s) => s.id === manualStaffId);
    if (!k) return;

    const newRecord: AbsensiRecord = {
      id: uuid(),
      karyawan_id: k.id,
      karyawan_nama: k.nama,
      tanggal: filterTanggal,
      jam_masuk: manualJamMasuk,
      jam_keluar: manualJamKeluar,
      status: manualStatus,
    };

    updateDb((prev) => ({
      ...prev,
      absensi: [newRecord, ...(prev.absensi || [])],
    }));

    showToast(`✅ Absensi manual ${k.nama} dicatat`, 'success');
    setIsManualModalOpen(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`REKAP ABSENSI KARYAWAN - ${filterTanggal}`, 14, 15);
    const rows = filteredRecords.map((a, i) => [
      i + 1,
      a.karyawan_nama,
      a.jam_masuk || '-',
      a.jam_keluar || '-',
      a.status.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: 22,
      head: [['#', 'Nama Karyawan', 'Jam Masuk', 'Jam Keluar', 'Status']],
      body: rows,
    });
    doc.save(`Absensi_${filterTanggal}.pdf`);
    showToast('📄 PDF Absensi berhasil diunduh', 'success');
  };

  const filteredRecords = (db.absensi || []).filter(
    (a) => a.tanggal === filterTanggal && !a.deleted_at
  );

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-[#00C9A7]" /> Portal Absensi Foto Kamera
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Presensi kehadiran masuk dan keluar menggunakan verifikasi foto selfie kamera
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Camera Portal */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">
              📷 Kamera Presensi Karyawan
            </h3>

            <div className="mb-3">
              <label className="text-xs font-semibold block mb-1">Pilih Karyawan:</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-xs dark:bg-slate-900 font-semibold"
              >
                {staff.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} ({k.jabatan})
                  </option>
                ))}
              </select>
            </div>

            {/* Video preview / Snapshot */}
            <div className="relative aspect-square max-w-[280px] mx-auto bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center mb-3">
              {capturedPhoto ? (
                <img src={capturedPhoto} alt="Snapshot" className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCameraActive ? '' : 'hidden'}`}
                />
              )}

              {!isCameraActive && !capturedPhoto && (
                <div className="text-center p-4 text-slate-400 text-xs">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  Kamera belum aktif. Klik "Nyalakan Kamera" di bawah.
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={isCameraActive ? stopCamera : startCamera}
                className="py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" />
                <span>{isCameraActive ? 'Matikan Kamera' : 'Nyalakan Kamera'}</span>
              </button>
              <button
                type="button"
                onClick={takePhoto}
                disabled={!isCameraActive}
                className="py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Ambil Foto</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => handleAbsen('masuk')}
              className="py-3 rounded-2xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <LogIn className="w-4 h-4" /> Absen Masuk
            </button>
            <button
              type="button"
              onClick={() => handleAbsen('keluar')}
              className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <LogOut className="w-4 h-4" /> Absen Keluar
            </button>
          </div>
        </div>

        {/* Right: Attendance Recap */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                📊 Rekap Kehadiran
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setManualStaffId(staff[0]?.id || '');
                    setIsManualModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Manual
                </button>
                <button
                  onClick={exportPDF}
                  className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" /> Unduh PDF
                </button>
              </div>
            </div>

            <div className="mb-3">
              <input
                type="date"
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
              />
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Belum ada presensi pada tanggal {filterTanggal}
                </div>
              ) : (
                filteredRecords.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      {a.foto_masuk ? (
                        <img src={a.foto_masuk} alt="Face" className="w-9 h-9 rounded-xl object-cover border" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold">
                          {a.karyawan_nama.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">{a.karyawan_nama}</div>
                        <div className="text-[10px] text-slate-400">
                          Masuk: {a.jam_masuk || '-'} · Keluar: {a.jam_keluar || '-'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        a.status === 'hadir'
                          ? 'bg-emerald-100 text-emerald-800'
                          : a.status === 'telat'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Input Presensi Manual</h3>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Karyawan</label>
                <select
                  value={manualStaffId}
                  onChange={(e) => setManualStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                >
                  {staff.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Status Kehadiran</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                >
                  <option value="hadir">Hadir Tepat Waktu</option>
                  <option value="telat">Telat</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alfa">Alfa (Tanpa Keterangan)</option>
                  <option value="cuti">Cuti</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Jam Masuk</label>
                  <input
                    type="time"
                    value={manualJamMasuk}
                    onChange={(e) => setManualJamMasuk(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900 text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Jam Keluar</label>
                  <input
                    type="time"
                    value={manualJamKeluar}
                    onChange={(e) => setManualJamKeluar(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900 text-center font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#00C9A7] text-white text-xs font-bold">
                  Simpan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
