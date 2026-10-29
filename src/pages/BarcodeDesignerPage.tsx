import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '../context/POSContext';
import { Produk } from '../types';
import { fmtRp } from '../utils/constants';
import { Printer, Sliders, Layers, RefreshCw, Download, FileText, Check } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

interface LabelItem {
  produk: Produk;
  count: number;
}

export const BarcodeDesignerPage: React.FC = () => {
  const { db, addNotification } = usePOS();

  // Settings
  const [paperSize, setPaperSize] = useState<'a4' | 'letter' | 'thermal58' | 'thermal80' | 'sticker108'>('sticker108');
  const [barcodeType, setBarcodeType] = useState<'code128' | 'qrcode'>('code128');
  const [columns, setColumns] = useState(4);
  const [labelWidth, setLabelWidth] = useState(38); // mm
  const [labelHeight, setLabelHeight] = useState(20); // mm
  const [gapX, setGapX] = useState(3);
  const [gapY, setGapY] = useState(3);

  // Content flags
  const [showStoreName, setShowStoreName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [customText, setCustomText] = useState('');

  // Selected items to print
  const [selectedItems, setSelectedItems] = useState<LabelItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick preset loader
  const applyPreset = (preset: 'a4_standard' | 'sticker_tomjerry' | 'thermal_single') => {
    if (preset === 'a4_standard') {
      setPaperSize('a4');
      setColumns(4);
      setLabelWidth(45);
      setLabelHeight(25);
      setGapX(4);
      setGapY(4);
    } else if (preset === 'sticker_tomjerry') {
      setPaperSize('sticker108');
      setColumns(5);
      setLabelWidth(38);
      setLabelHeight(19);
      setGapX(3);
      setGapY(2);
    } else if (preset === 'thermal_single') {
      setPaperSize('thermal58');
      setColumns(1);
      setLabelWidth(50);
      setLabelHeight(30);
      setGapX(0);
      setGapY(2);
    }
  };

  // Pre-populate with first few products if none
  useEffect(() => {
    if (selectedItems.length === 0 && db.produk.length > 0) {
      setSelectedItems(
        db.produk.slice(0, 3).map(p => ({ produk: p, count: 4 }))
      );
    }
  }, [db.produk]);

  const addProductToPrint = (p: Produk) => {
    setSelectedItems(prev => {
      const idx = prev.findIndex(item => item.produk.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].count += 1;
        return copy;
      }
      return [...prev, { produk: p, count: 1 }];
    });
  };

  const updateCount = (id: string, count: number) => {
    if (count <= 0) {
      setSelectedItems(prev => prev.filter(item => item.produk.id !== id));
    } else {
      setSelectedItems(prev =>
        prev.map(item => (item.produk.id === id ? { ...item, count } : item))
      );
    }
  };

  // Total labels
  const totalLabels = selectedItems.reduce((acc, curr) => acc + curr.count, 0);

  // Flatten items into single array of cards for rendering
  const flattenedLabels: Produk[] = [];
  selectedItems.forEach(item => {
    for (let i = 0; i < item.count; i++) {
      flattenedLabels.push(item.produk);
    }
  });

  // Export to PDF
  const handleExportPDF = async () => {
    if (flattenedLabels.length === 0) {
      addNotification('Pilih produk yang ingin dicetak terlebih dahulu', 'error');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: paperSize.startsWith('thermal') ? 'portrait' : 'portrait',
        unit: 'mm',
        format: paperSize === 'a4' ? 'a4' : paperSize === 'letter' ? 'letter' : [labelWidth + 6, (labelHeight + 4) * flattenedLabels.length]
      });

      const storeName = db.settings?.nama_toko || db.master?.toko?.nama || 'PARFUMKU';
      let x = 10;
      let y = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      for (let i = 0; i < flattenedLabels.length; i++) {
        const prod = flattenedLabels[i];

        // Check if page overflow
        if (paperSize !== 'thermal58' && paperSize !== 'thermal80') {
          if (x + labelWidth > pageWidth - 5) {
            x = 10;
            y += labelHeight + gapY;
          }
          if (y + labelHeight > pageHeight - 5) {
            doc.addPage();
            x = 10;
            y = 10;
          }
        }

        // Draw label outline
        doc.setDrawColor(220, 220, 220);
        doc.rect(x, y, labelWidth, labelHeight);

        let cursorY = y + 3.5;

        // Store Name
        if (showStoreName) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(80, 80, 80);
          doc.text(storeName, x + labelWidth / 2, cursorY, { align: 'center' });
          cursorY += 3;
        }

        // Product Name
        if (showProductName) {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(20, 20, 20);
          const shortName = prod.nama.length > 20 ? prod.nama.substring(0, 18) + '...' : prod.nama;
          doc.text(shortName, x + labelWidth / 2, cursorY, { align: 'center' });
          cursorY += 3;
        }

        // Generate barcode image as canvas/base64
        try {
          if (barcodeType === 'qrcode') {
            const qrDataUrl = await QRCode.toDataURL(prod.barcode || prod.sku, { margin: 1, width: 64 });
            doc.addImage(qrDataUrl, 'PNG', x + labelWidth / 2 - 4.5, cursorY, 9, 9);
            cursorY += 9.5;
          } else {
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, prod.barcode || prod.sku, {
              format: 'CODE128',
              width: 1.2,
              height: 24,
              displayValue: showBarcodeText,
              fontSize: 8,
              margin: 0
            });
            const barcodeDataUrl = canvas.toDataURL('image/png');
            doc.addImage(barcodeDataUrl, 'PNG', x + 3, cursorY, labelWidth - 6, 6);
            cursorY += showBarcodeText ? 7.5 : 6.5;
          }
        } catch (err) {
          // fallback text
          doc.setFontSize(6);
          doc.text(prod.barcode || prod.sku, x + labelWidth / 2, cursorY, { align: 'center' });
          cursorY += 3;
        }

        // Price
        if (showPrice) {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 150, 120);
          doc.text(fmtRp(prod.harga_jual), x + labelWidth / 2, cursorY + 1, { align: 'center' });
        }

        if (paperSize.startsWith('thermal')) {
          y += labelHeight + gapY;
        } else {
          x += labelWidth + gapX;
        }
      }

      doc.save(`Barcode_Labels_${Date.now()}.pdf`);
      addNotification('File PDF Barcode berhasil diunduh', 'success');
    } catch (err) {
      console.error(err);
      addNotification('Gagal membuat file PDF Barcode', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary" />
            Barcode & Label Sticker Designer
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Desain tata letak cetak barcode, QR code produk, kertas stiker Tom & Jerry, atau printer thermal
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" /> Unduh PDF
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak Langsung
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-4 space-y-5">
          {/* Preset Buttons */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-app-border shadow-card space-y-3">
            <div className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" /> Format Preset
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('sticker_tomjerry')}
                className="p-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-700/50 hover:border-primary text-left"
              >
                <div className="font-bold text-[11px] text-slate-800 dark:text-white">Stiker No 108</div>
                <div className="text-[9px] text-slate-400">38x19mm (5 Kolom)</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('a4_standard')}
                className="p-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-700/50 hover:border-primary text-left"
              >
                <div className="font-bold text-[11px] text-slate-800 dark:text-white">Kertas A4</div>
                <div className="text-[9px] text-slate-400">45x25mm (4 Kolom)</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('thermal_single')}
                className="p-2 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-700/50 hover:border-primary text-left"
              >
                <div className="font-bold text-[11px] text-slate-800 dark:text-white">Thermal POS</div>
                <div className="text-[9px] text-slate-400">58mm Roll Satuan</div>
              </button>
            </div>
          </div>

          {/* Dimensi & Tipe */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-app-border shadow-card space-y-4">
            <div className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-primary" /> Pengaturan Dimensi & Barcode
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Tipe Barcode</label>
                <select
                  value={barcodeType}
                  onChange={e => setBarcodeType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-app-border bg-slate-50 dark:bg-slate-900 font-bold"
                >
                  <option value="code128">Barcode 1D (Code 128)</option>
                  <option value="qrcode">QR Code 2D</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Jumlah Kolom</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={columns}
                  onChange={e => setColumns(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-app-border bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Lebar Label (mm)</label>
                <input
                  type="number"
                  value={labelWidth}
                  onChange={e => setLabelWidth(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-app-border bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Tinggi Label (mm)</label>
                <input
                  type="number"
                  value={labelHeight}
                  onChange={e => setLabelHeight(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-app-border bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-app-border space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Elemen Label yang Ditampilkan</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={e => setShowStoreName(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Nama Toko</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProductName}
                    onChange={e => setShowProductName(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Nama Produk</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={e => setShowPrice(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Harga Jual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcodeText}
                    onChange={e => setShowBarcodeText(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Teks SKU/Kode</span>
                </label>
              </div>
            </div>
          </div>

          {/* Daftar Produk yang Dicetak */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-app-border shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                Produk Dipilih ({selectedItems.length}) · Total {totalLabels} Label
              </div>
              <button
                onClick={() => setSelectedItems([])}
                className="text-[10px] text-rose-500 hover:underline font-bold"
              >
                Hapus Semua
              </button>
            </div>

            {/* Quick add dropdown / search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari produk untuk ditambahkan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-app-border bg-slate-50 dark:bg-slate-900 text-xs"
              />
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-app-border shadow-lg z-20 divide-y divide-app-border">
                  {db.produk
                    .filter(p => p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 6)
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          addProductToPrint(p);
                          setSearchQuery('');
                        }}
                        className="w-full p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold truncate">{p.nama}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {selectedItems.map(item => (
                <div
                  key={item.produk.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-app-border text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold truncate">{item.produk.nama}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.produk.sku} · {fmtRp(item.produk.harga_jual)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateCount(item.produk.id, item.count - 1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-app-border flex items-center justify-center font-black text-slate-500"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-xs">{item.count}</span>
                    <button
                      onClick={() => updateCount(item.produk.id, item.count + 1)}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-app-border flex items-center justify-center font-black text-slate-500"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Paper */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-app-border shadow-card flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Pratinjau Lembar Cetak</span>
              <span className="text-xs text-slate-400">({columns} Kolom · Ukuran: {labelWidth}x{labelHeight}mm)</span>
            </div>
            <div className="text-xs text-slate-500">
              Total {flattenedLabels.length} Stiker
            </div>
          </div>

          <div className="bg-slate-200 dark:bg-slate-900/80 p-6 rounded-2xl border border-app-border min-h-[500px] flex justify-center overflow-auto print:p-0 print:bg-white print:border-none">
            {flattenedLabels.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center my-auto p-12 text-slate-400">
                <FileText className="w-12 h-12 mb-3 stroke-1 opacity-50" />
                <div className="font-bold text-sm">Belum ada label produk dipilih</div>
                <div className="text-xs mt-1 max-w-xs">Tambahkan produk dari panel samping kiri untuk melihat pratinjau stiker barcode</div>
              </div>
            ) : (
              <div
                className="bg-white text-slate-900 shadow-xl rounded-sm p-4 w-full max-w-3xl transition-all print:shadow-none print:p-0"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: `${gapY * 2}px ${gapX * 2}px`,
                }}
              >
                {flattenedLabels.map((prod, idx) => (
                  <BarcodeCardPreview
                    key={`${prod.id}-${idx}`}
                    produk={prod}
                    barcodeType={barcodeType}
                    storeName={db.settings?.nama_toko || db.master?.toko?.nama || 'PARFUMKU'}
                    showStoreName={showStoreName}
                    showProductName={showProductName}
                    showPrice={showPrice}
                    showBarcodeText={showBarcodeText}
                    width={labelWidth}
                    height={labelHeight}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CardPreviewProps {
  produk: Produk;
  barcodeType: 'code128' | 'qrcode';
  storeName: string;
  showStoreName: boolean;
  showProductName: boolean;
  showPrice: boolean;
  showBarcodeText: boolean;
  width: number;
  height: number;
}

const BarcodeCardPreview: React.FC<CardPreviewProps> = ({
  produk,
  barcodeType,
  storeName,
  showStoreName,
  showProductName,
  showPrice,
  showBarcodeText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    const code = produk.barcode || produk.sku;
    if (barcodeType === 'code128' && canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, code, {
          format: 'CODE128',
          width: 1.2,
          height: 28,
          displayValue: showBarcodeText,
          fontSize: 9,
          margin: 0,
        });
      } catch (e) {
        // invalid chars fallback
      }
    } else if (barcodeType === 'qrcode') {
      QRCode.toDataURL(code, { width: 70, margin: 1 })
        .then(url => setQrSrc(url))
        .catch(() => {});
    }
  }, [produk, barcodeType, showBarcodeText]);

  return (
    <div className="border border-dashed border-slate-300 rounded p-2 flex flex-col items-center justify-between text-center bg-white min-h-[90px] overflow-hidden">
      {showStoreName && (
        <div className="text-[9px] font-black tracking-wider uppercase text-slate-600 truncate max-w-full">
          {storeName}
        </div>
      )}

      {showProductName && (
        <div className="text-[10px] font-bold text-slate-800 leading-tight line-clamp-2 max-w-full px-0.5">
          {produk.nama}
        </div>
      )}

      <div className="my-1 flex items-center justify-center max-w-full">
        {barcodeType === 'qrcode' ? (
          qrSrc ? <img src={qrSrc} alt="QR" className="w-12 h-12 object-contain" /> : <div className="text-[9px]">QR</div>
        ) : (
          <canvas ref={canvasRef} className="max-w-full h-auto" />
        )}
      </div>

      {showPrice && (
        <div className="text-[11px] font-black text-primary-dark">
          {fmtRp(produk.harga_jual)}
        </div>
      )}
    </div>
  );
};
