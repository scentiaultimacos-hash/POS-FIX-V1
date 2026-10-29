import React, { useRef, useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import { today, nowISO, uuid } from '../utils/constants';
import { AbsensiRecord } from '../types';
import {
  Camera,
  Video,
  VideoOff,
  LogIn,
  LogOut,
  Plus,
  FileText,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const AbsensiPage: React.FC = () => {
  const { db, updateDb, showToast, logActivity, setCurrentPage } = usePOS();
  const staff = db.karyawan || [];
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id || '');
  const [filterTanggal, setFilterTanggal] = useState<string>(today());

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [hasPhotoError, setHasPhotoError] = useState(false);

  // Tab on right panel: list or photo gallery
  const [viewTab, setViewTab] = useState<'list' | 'gallery'>('list');

  // Photo modal preview
  const [zoomPhoto, setZoomPhoto] = useState<{
    url: string;
    karyawan: string;
    tipe: 'Masuk' | 'Keluar';
    jam?: string;
    status?: string;
  } | null>(null);

  // Manual attendance modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualStaffId, setManualStaffId] = useState('');
  const [manualStatus, setManualStatus] = useState<AbsensiRecord['status']>('hadir');
  const [manualJamMasuk, setManualJamMasuk] = useState('08:00');
  const [manualJamKeluar, setManualJamKeluar] = useState('17:00');
  const [manualKeterangan, setManualKeterangan] = useState('');
  const [manualPhoto, setManualPhoto] = useState<string | null>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    try {
      stopCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 400 },
          height: { ideal: 400 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsCameraActive(true);
      }
    } catch {
      showToast('Kamera tidak dapat diakses atau izin ditolak. Anda bisa menggunakan tombol Upload Foto.', 'error');
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

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      await startCamera(nextFacing);
    }
  };

  /**
   * Ultra-lightweight photo compression:
   * Crops to 280x280 square and compresses to JPEG quality 0.65.
   * This yields only ~10-14 KB base64, preserving memory and localStorage.
   */
  const processImageToLightweightDataUrl = (
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number
  ): string => {
    const canvas = document.createElement('canvas');
    const targetDim = 280;
    canvas.width = targetDim;
    canvas.height = targetDim;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Center crop square
    const minDim = Math.min(sourceWidth, sourceHeight);
    const sx = (sourceWidth - minDim) / 2;
    const sy = (sourceHeight - minDim) / 2;

    ctx.drawImage(source, sx, sy, minDim, minDim, 0, 0, targetDim, targetDim);

    // Add timestamp watermark
    const jamNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tglNow = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(0, targetDim - 22, targetDim, 22);
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`🕒 ${tglNow} ${jamNow}`, 8, targetDim - 7);

    return canvas.toDataURL('image/jpeg', 0.65);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      showToast('Kamera belum siap, silakan tunggu sebentar', 'warning');
      return;
    }

    // Trigger visual flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const compressed = processImageToLightweightDataUrl(video, video.videoWidth, video.videoHeight);
    if (compressed) {
      setCapturedPhoto(compressed);
      setHasPhotoError(false);
      showToast('📸 Foto selfie presensi berhasil diambil!', 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isManual = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const compressed = processImageToLightweightDataUrl(img, img.width, img.height);
        if (isManual) {
          setManualPhoto(compressed);
        } else {
          setCapturedPhoto(compressed);
          setHasPhotoError(false);
          showToast('📸 Foto selfie berhasil diunggah & dikompres!', 'success');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAbsen = (tipe: 'masuk' | 'keluar') => {
    const k = staff.find((s) => s.id === selectedStaffId);
    if (!k) {
      showToast('Pilih karyawan terlebih dahulu', 'error');
      return;
    }

    // MANDATORY PHOTO CHECK (Requested by user)
    if (!capturedPhoto) {
      setHasPhotoError(true);
      showToast('⚠️ Wajib mengambil foto selfie wajah terlebih dahulu!', 'error');
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
          foto_masuk: capturedPhoto,
          keterangan: isLate ? 'Presensi masuk lewat batas toleransi' : 'Hadir tepat waktu',
        };

        logActivity(`Absen MASUK berfoto: ${k.nama} (${jamNow})`, 'Absensi');
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
            ? { ...a, jam_keluar: jamNow, foto_keluar: capturedPhoto }
            : a
        );

        logActivity(`Absen KELUAR berfoto: ${k.nama} (${jamNow})`, 'Absensi');
        showToast(`✅ Absen Keluar berhasil: ${k.nama}`, 'success');
        return {
          ...prev,
          absensi: updated,
        };
      }
    });

    // Reset captured photo for next attendance
    setCapturedPhoto(null);
    setHasPhotoError(false);
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
      foto_masuk: manualPhoto || undefined,
      keterangan: manualKeterangan || 'Input manual oleh pengelola',
    };

    updateDb((prev) => ({
      ...prev,
      absensi: [newRecord, ...(prev.absensi || [])],
    }));

    showToast(`✅ Absensi manual ${k.nama} berhasil dicatat`, 'success');
    setIsManualModalOpen(false);
    setManualPhoto(null);
    setManualKeterangan('');
  };

  const filteredRecords = (db.absensi || []).filter(
    (a) => a.tanggal === filterTanggal && !a.deleted_at
  );

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`REKAP ABSENSI KARYAWAN BERFOTO - ${filterTanggal}`, 14, 15);
    const rows = filteredRecords.map((a, i) => [
      i + 1,
      a.karyawan_nama,
      a.jam_masuk || '-',
      a.jam_keluar || '-',
      a.status.toUpperCase(),
      a.foto_masuk ? 'Ya (Terverifikasi)' : 'Tidak',
      a.foto_keluar ? 'Ya (Terverifikasi)' : 'Tidak',
    ]);

    autoTable(doc, {
      startY: 22,
      head: [['#', 'Nama Karyawan', 'Jam Masuk', 'Jam Keluar', 'Status', 'Foto Masuk', 'Foto Keluar']],
      body: rows,
    });
    doc.save(`Absensi_Berfoto_${filterTanggal}.pdf`);
    showToast('📄 PDF Absensi berhasil diunduh', 'success');
  };

  return (
    <div className="space-y-4 animate-fade-in p-4 md:p-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 md:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5 text-[#00C9A7]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                Portal Presensi Wajib Foto Selfie
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Anti-Fraud
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Karyawan wajib mengambil foto selfie wajah sebelum absen masuk maupun absen keluar.
              </p>
            </div>
          </div>
        </div>

        {/* Quick link to analytical report */}
        <button
          onClick={() => setCurrentPage('laporan-karyawan')}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition-all self-start md:self-auto shadow-2xs"
        >
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Buka Arsip Laporan & Foto Karyawan</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Camera & Verification Portal (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <span>📸 Verifikasi Wajah Karyawan</span>
              </h3>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full font-semibold">
                *Foto Wajib
              </span>
            </div>

            {/* Select Employee */}
            <div className="mb-3">
              <label className="text-xs font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                Pilih Karyawan yang Absen:
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
              >
                {staff.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} — ({k.jabatan || k.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Video Preview or Captured Photo Box */}
            <div
              className={`relative aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 transition-all flex items-center justify-center ${
                hasPhotoError
                  ? 'border-rose-500 ring-4 ring-rose-500/20 animate-shake'
                  : capturedPhoto
                  ? 'border-emerald-500 ring-4 ring-emerald-500/20'
                  : 'border-slate-800'
              }`}
            >
              {/* Flash effect overlay */}
              {isFlashing && (
                <div className="absolute inset-0 bg-white z-20 animate-fade-out" />
              )}

              {capturedPhoto ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedPhoto}
                    alt="Selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-emerald-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-sm">
                    <Check className="w-3 h-3" /> Foto Siap
                  </div>
                  <button
                    type="button"
                    onClick={() => setCapturedPhoto(null)}
                    className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-xs"
                    title="Foto Ulang"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isCameraActive ? '' : 'hidden'}`}
                  />

                  {/* Face Guide Overlay when camera is active */}
                  {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                      <div className="w-44 h-44 rounded-full border-2 border-dashed border-teal-400/70" />
                      <span className="text-[10px] text-teal-200 mt-2 bg-black/50 px-2 py-0.5 rounded-full">
                        Posisikan wajah di dalam lingkaran
                      </span>
                    </div>
                  )}

                  {!isCameraActive && (
                    <div className="text-center p-5 text-slate-400 text-xs">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center mb-2.5 text-slate-500">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-300">Kamera Belum Aktif</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Klik "Nyalakan Kamera" atau "Pilih File Selfie" di bawah
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Error prompt if no photo */}
            {hasPhotoError && (
              <div className="mt-2.5 text-center text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Foto selfie belum diambil! Silakan ambil foto sebelum absen.</span>
              </div>
            )}

            {/* Camera Controls */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={isCameraActive ? stopCamera : () => startCamera()}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isCameraActive ? (
                  <>
                    <VideoOff className="w-4 h-4 text-rose-500" />
                    <span>Matikan</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 text-teal-500" />
                    <span>Nyalakan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={takePhoto}
                disabled={!isCameraActive}
                className="py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <Camera className="w-4 h-4" />
                <span>Ambil Foto</span>
              </button>
            </div>

            {/* Additional Options: Switch Camera & Upload Fallback */}
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={toggleCameraFacing}
                disabled={!isCameraActive}
                className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Ganti Kamera ({cameraFacing === 'user' ? 'Depan' : 'Belakang'})</span>
              </button>

              <label className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer">
                <Upload className="w-3 h-3 text-teal-600" />
                <span>Upload Selfie</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Action Buttons: Absen Masuk & Keluar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
            <div className="text-[11px] text-slate-400 text-center">
              Pastikan foto wajah terlihat jelas sebelum menekan tombol di bawah.
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleAbsen('masuk')}
                className="py-3 px-4 rounded-2xl bg-[#00C9A7] hover:bg-[#00B894] active:scale-98 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Absen Masuk</span>
              </button>

              <button
                type="button"
                onClick={() => handleAbsen('keluar')}
                className="py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Absen Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Rekap & Galeri Foto Presensi (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <span>📊 Rekap & Bukti Foto Kehadiran</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {filteredRecords.length} Catatan
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik foto thumbnail untuk melihat foto resolusi penuh.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setManualStaffId(staff[0]?.id || '');
                    setIsManualModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Manual
                </button>
                <button
                  onClick={exportPDF}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>

            {/* Date filter & View tab switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4">
              <input
                type="date"
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
              />

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-750 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewTab('list')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewTab === 'list'
                      ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Daftar
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('gallery')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    viewTab === 'gallery'
                      ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" /> Galeri Foto
                </button>
              </div>
            </div>

            {/* Content List / Gallery */}
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Belum ada presensi tercatat pada tanggal {filterTanggal}
                </div>
              ) : viewTab === 'list' ? (
                /* LIST VIEW */
                filteredRecords.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/60 dark:hover:bg-slate-900 transition-all text-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Photo Thumbnail */}
                      <div className="flex items-center gap-1">
                        {a.foto_masuk ? (
                          <button
                            type="button"
                            onClick={() =>
                              setZoomPhoto({
                                url: a.foto_masuk!,
                                karyawan: a.karyawan_nama,
                                tipe: 'Masuk',
                                jam: a.jam_masuk,
                                status: a.status,
                              })
                            }
                            className="relative group w-10 h-10 rounded-xl overflow-hidden border border-emerald-400/60 hover:scale-105 transition-transform"
                            title="Klik untuk zoom foto masuk"
                          >
                            <img
                              src={a.foto_masuk}
                              alt="Masuk"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-3 h-3" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                            {a.karyawan_nama.charAt(0)}
                          </div>
                        )}

                        {a.foto_keluar && (
                          <button
                            type="button"
                            onClick={() =>
                              setZoomPhoto({
                                url: a.foto_keluar!,
                                karyawan: a.karyawan_nama,
                                tipe: 'Keluar',
                                jam: a.jam_keluar,
                                status: a.status,
                              })
                            }
                            className="relative group w-10 h-10 rounded-xl overflow-hidden border border-amber-400/60 hover:scale-105 transition-transform"
                            title="Klik untuk zoom foto keluar"
                          >
                            <img
                              src={a.foto_keluar}
                              alt="Keluar"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-3 h-3" />
                            </div>
                          </button>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-white truncate">
                          {a.karyawan_nama}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="text-emerald-600 font-medium">
                            Masuk: {a.jam_masuk || '-'}
                          </span>
                          <span>•</span>
                          <span className="text-amber-600 font-medium">
                            Keluar: {a.jam_keluar || '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          a.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : a.status === 'telat'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                /* GALLERY VIEW (Photo cards) */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredRecords.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-white truncate">
                            {a.karyawan_nama}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full font-bold uppercase text-[9px] ${
                              a.status === 'hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.status === 'telat'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>

                        {/* Photos row */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {a.foto_masuk ? (
                            <div
                              onClick={() =>
                                setZoomPhoto({
                                  url: a.foto_masuk!,
                                  karyawan: a.karyawan_nama,
                                  tipe: 'Masuk',
                                  jam: a.jam_masuk,
                                  status: a.status,
                                })
                              }
                              className="cursor-pointer group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border border-emerald-500/50"
                            >
                              <img
                                src={a.foto_masuk}
                                alt="Masuk"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute bottom-1 left-1 bg-black/60 text-emerald-300 text-[9px] px-1 rounded font-bold">
                                In {a.jam_masuk || ''}
                              </span>
                            </div>
                          ) : (
                            <div className="aspect-square rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                              Tanpa Foto
                            </div>
                          )}

                          {a.foto_keluar ? (
                            <div
                              onClick={() =>
                                setZoomPhoto({
                                  url: a.foto_keluar!,
                                  karyawan: a.karyawan_nama,
                                  tipe: 'Keluar',
                                  jam: a.jam_keluar,
                                  status: a.status,
                                })
                              }
                              className="cursor-pointer group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border border-amber-500/50"
                            >
                              <img
                                src={a.foto_keluar}
                                alt="Keluar"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute bottom-1 left-1 bg-black/60 text-amber-300 text-[9px] px-1 rounded font-bold">
                                Out {a.jam_keluar || ''}
                              </span>
                            </div>
                          ) : (
                            <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-[10px] text-slate-400">
                              Belum Keluar
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom link to comprehensive reports */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <span>Rekap bulanan, jam lembur, dan komisi tersimpan di Laporan Karyawan</span>
            <button
              onClick={() => setCurrentPage('laporan-karyawan')}
              className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Lihat Laporan Lengkap ➔
            </button>
          </div>
        </div>
      </div>

      {/* High-Resolution Photo Zoom Modal */}
      {zoomPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-scale-up border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  Bukti Foto Selfie {zoomPhoto.tipe}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {zoomPhoto.karyawan} • Jam {zoomPhoto.jam || '-'}
                </p>
              </div>
              <button
                onClick={() => setZoomPhoto(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-center">
              <img
                src={zoomPhoto.url}
                alt="Zoom Selfie"
                className="w-full aspect-square object-contain rounded-2xl shadow-md border border-slate-800"
              />
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Status: <b className="uppercase text-teal-600">{zoomPhoto.status || 'Hadir'}</b>
              </span>
              <button
                onClick={() => setZoomPhoto(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-5 border border-slate-100 dark:border-slate-700 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Input Presensi Manual</h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Karyawan</label>
                <select
                  value={manualStaffId}
                  onChange={(e) => setManualStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900 font-semibold"
                >
                  {staff.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama} ({k.jabatan})
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

              {/* Upload Bukti / Foto Manual jika ada */}
              <div>
                <label className="text-xs font-semibold block mb-1">Lampirkan Foto Bukti (Opsional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-teal-600" />
                    <span>{manualPhoto ? 'Ganti Foto' : 'Pilih Foto / Surat'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                  {manualPhoto && (
                    <div className="w-9 h-9 rounded-xl overflow-hidden border border-teal-500">
                      <img src={manualPhoto} alt="Bukti" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Keterangan / Alasan</label>
                <input
                  type="text"
                  placeholder="Contoh: Izin urusan keluarga / sakit flu"
                  value={manualKeterangan}
                  onChange={(e) => setManualKeterangan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs dark:bg-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold"
                >
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

export default AbsensiPage;
