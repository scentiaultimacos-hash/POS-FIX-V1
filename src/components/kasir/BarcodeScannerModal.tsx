import React, { useRef, useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { Camera, X, ScanLine, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanned,
}) => {
  const { showToast } = usePOS();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or unavailable', err);
      setCameraError('Kamera tidak dapat diakses atau diblokir oleh browser. Anda dapat mengetikkan kode SKU / Barcode secara manual di bawah.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScanned(manualCode.trim());
    setManualCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center modal-backdrop p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-[#00C9A7]" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Scan Barcode Kamera</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video / Camera area */}
        <div className="p-5 space-y-4">
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Overlay target frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-28 border-2 border-[#00C9A7] rounded-xl relative">
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
                <div className="w-full h-0.5 bg-red-500/80 animate-pulse mt-14"></div>
              </div>
            </div>

            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-300">
                <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                <p>{cameraError}</p>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Arahkan kamera ke barcode / label produk, atau masukkan SKU di bawah
          </p>

          {/* Manual Input form */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ketik kode SKU / Barcode..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs outline-none focus:border-[#00C9A7]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B894] text-white text-xs font-bold transition-colors"
            >
              Cari & Tambah
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
