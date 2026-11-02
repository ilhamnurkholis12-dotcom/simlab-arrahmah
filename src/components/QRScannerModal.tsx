import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem } from '../types/inventory';
import {
  X,
  Camera,
  RefreshCw,
  AlertCircle,
  QrCode,
  Upload,
  Sparkles,
  Search,
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemFound: (item: InventoryItem) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onItemFound,
}) => {
  const { items } = useInventory();
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'simulate'>('camera');
  const [simulationCode, setSimulationCode] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerId = 'qr-camera-stream-container';

  // Find item by scanned raw text
  const matchItem = (decodedText: string): InventoryItem | null => {
    const cleanText = decodedText.trim();

    // Check if it's formatted as JSON
    try {
      const parsed = JSON.parse(cleanText);
      if (parsed.code) {
        const found = items.find((i) => i.code.toLowerCase() === parsed.code.toLowerCase());
        if (found) return found;
      }
      if (parsed.id) {
        const found = items.find((i) => i.id === parsed.id);
        if (found) return found;
      }
    } catch {
      // not JSON, proceed to direct text matching
    }

    // Direct match against item code
    const byCode = items.find(
      (i) => i.code.toLowerCase() === cleanText.toLowerCase()
    );
    if (byCode) return byCode;

    // Partial match or substring in code
    const bySubCode = items.find(
      (i) => cleanText.toLowerCase().includes(i.code.toLowerCase())
    );
    if (bySubCode) return bySubCode;

    // By Item Name match
    const byName = items.find(
      (i) => i.name.toLowerCase() === cleanText.toLowerCase()
    );
    if (byName) return byName;

    return null;
  };

  const handleScanSuccess = (decodedText: string) => {
    // Haptic feedback if supported on mobile
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(100);
      } catch {
        // ignore
      }
    }

    const item = matchItem(decodedText);
    if (item) {
      stopCamera();
      onItemFound(item);
      onClose();
    } else {
      setScannerError(
        `Kode QR "${decodedText}" terdeteksi, namun tidak cocok dengan nomor inventaris laboratorium yang terdaftar.`
      );
    }
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setScannerError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      const qrScanner = html5QrCodeRef.current;
      if (qrScanner.isScanning) {
        await qrScanner.stop();
      }

      await qrScanner.start(
        { facingMode: mode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame scan error (normal when no QR is in view)
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setIsScanning(false);
      setScannerError(
        err?.message ||
          'Kamera tidak dapat diakses atau izin ditolak. Anda dapat menggunakan tab "Unggah Gambar" atau "Pilih Cepat Label" untuk simulasi.'
      );
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Stop scanner error:', err);
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCamera(facingMode);
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, facingMode]);

  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScannerError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }
      const qrScanner = html5QrCodeRef.current;
      const result = await qrScanner.scanFile(file, true);
      handleScanSuccess(result);
    } catch (err: any) {
      setScannerError('Tidak dapat membaca QR code dari gambar yang diunggah. Pastikan gambar jelas dan tidak buram.');
    }
  };

  const handleSimulate = (code: string) => {
    handleScanSuccess(code);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pindai QR Code Inventaris Laboratorium
              </h2>
              <p className="text-xs text-slate-500">
                Arahkan kamera ke label stiker alat untuk melihat spesifikasi & riwayat mutasi
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'camera'
                ? 'border-emerald-700 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera HP/Webcam</span>
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('upload');
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-emerald-700 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Foto QR</span>
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('simulate');
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'simulate'
                ? 'border-emerald-700 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Pilih Cepat Label</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {scannerError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Info Pemindai: </span>
                <span>{scannerError}</span>
              </div>
            </div>
          )}

          {/* Camera View */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square max-w-[320px] mx-auto border-2 border-slate-700 flex items-center justify-center">
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Overlay Scanning Guide Target */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative shadow-2xl">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/60 shadow-lg shadow-emerald-400 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    Ganti Kamera ({facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'})
                  </span>
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-500">
                Posisikan QR Code stiker alat laboratorium tepat di dalam kotak bidik hijau.
              </p>
            </div>
          )}

          {/* Upload Image View */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-center py-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-600 hover:bg-slate-50 transition-colors p-8 rounded-2xl cursor-pointer max-w-sm mx-auto"
              >
                <QrCode className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">Klik untuk Pilih Foto QR</p>
                <p className="text-xs text-slate-500 mt-1">
                  Ambil foto dari galeri kamera ponsel atau file komputer
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Simulation / Quick Item List View */}
          {activeTab === 'simulate' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                Klik salah satu barang di bawah ini untuk mensimulasikan hasil pemindaian stiker QR label secara langsung:
              </p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSimulate(item.code)}
                    className="w-full text-left p-3 hover:bg-emerald-50/70 transition-colors flex items-center justify-between gap-2 group"
                  >
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 group-hover:text-emerald-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{item.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.primaryLab}</span>
                        <span aria-hidden="true">·</span>
                        <span>Stok: {item.currentTotalStock} {item.unit}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-800 group-hover:underline shrink-0">
                      Pindai Item →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Format yang didukung: Kode Inventaris ARC atau JSON</span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
