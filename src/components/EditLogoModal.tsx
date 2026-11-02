import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { normalizeMediaUrl } from '../data/labBanners';
import {
  X,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Check,
  Camera,
  Sparkles,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';

interface EditLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_OFFICIAL_LOGO = '/src/assets/images/arcss_logo_official.svg';

export const EditLogoModal: React.FC<EditLogoModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    updateSettings,
    kopConfig,
    updateKopConfig,
    showToast,
    currentUser,
    isHeadOfLab,
  } = useInventory();

  const isAdmin = currentUser?.role === 'KEPALA_LAB' || isHeadOfLab;

  const [activeMode, setActiveMode] = useState<'upload' | 'url'>('upload');
  const [logoPreview, setLogoPreview] = useState<string>(
    settings.logo_url || DEFAULT_OFFICIAL_LOGO
  );
  const [urlInput, setUrlInput] = useState<string>('');
  const [syncToKop, setSyncToKop] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const current = settings.logo_url || DEFAULT_OFFICIAL_LOGO;
      setLogoPreview(current);
      if (current.startsWith('http')) {
        setUrlInput(current);
      } else {
        setUrlInput('');
      }
      setErrorMsg('');
      setIsSuccess(false);
    }
  }, [isOpen, settings.logo_url]);

  if (!isOpen) return null;

  // Access control protection: Only Admin (Kepala Lab) can edit the sidebar logo
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Akses Ditolak (Sistem ACL)</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hanya Kepala Laboratorium (Admin) yang memiliki wewenang untuk mengubah logo instansi pada sidebar.
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // Handle file upload (PNG, JPG, SVG, WebP)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 3MB
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Ukuran file terlalu besar! Maksimal ukuran file logo adalah 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoPreview(reader.result);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca file gambar. Silakan coba file lain.');
    };
    reader.readAsDataURL(file);
  };

  // Handle URL or Google Drive link input
  const handleUrlChange = (val: string) => {
    setErrorMsg('');
    setUrlInput(val);
    const normalized = normalizeMediaUrl(val);
    if (normalized.trim()) {
      setLogoPreview(normalized.trim());
    }
  };

  // Reset to default official logo
  const handleResetDefault = () => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (ACL)',
        message: 'Hanya Kepala Laboratorium (Admin) yang berwenang mereset logo instansi.',
      });
      return;
    }
    setLogoPreview(DEFAULT_OFFICIAL_LOGO);
    setUrlInput('');
    setErrorMsg('');
  };

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (ACL)',
        message: 'Hanya Kepala Laboratorium (Admin) yang berwenang mengubah logo instansi.',
      });
      onClose();
      return;
    }

    if (!logoPreview || !logoPreview.trim()) {
      setErrorMsg('Logo tidak boleh kosong! Harap unggah gambar atau masukkan URL yang valid.');
      return;
    }

    // 1. Update logo_url in PengaturanSistem
    updateSettings({
      logo_url: logoPreview,
    });

    // 2. If syncToKop is checked, also update KOP Berita Acara configuration
    if (syncToKop) {
      updateKopConfig({
        logoUrl: logoPreview,
      });
    }

    setIsSuccess(true);
    showToast({
      type: 'success',
      title: 'Logo Berhasil Diperbarui',
      message: 'Logo resmi instansi pada sidebar dan sistem berhasil disimpan.',
      duration: 4000,
    });

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 600);
  };

  const isGoogleDriveDirect =
    logoPreview && logoPreview.includes('lh3.googleusercontent.com/d/');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/80">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ubah Logo Sidebar
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ganti logo instansi pada bilah navigasi utama (Sidebar) SIMLAB.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Dual Live Preview Card */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-700 block">Pratinjau Tampilan Logo:</span>
            <div className="grid grid-cols-2 gap-3">
              {/* Preview in Dark Sidebar Theme */}
              <div className="p-3.5 rounded-2xl bg-[#0F172A] border border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-[10px] font-mono text-slate-400 font-medium">
                  Pada Sidebar (Gelap)
                </span>
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 opacity-40 blur-xs" />
                  <img
                    src={logoPreview}
                    alt="Pratinjau Logo Sidebar"
                    className="relative w-12 h-12 object-contain p-1 rounded-xl bg-white border border-slate-700 shadow-xs"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_OFFICIAL_LOGO;
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold text-white tracking-tight">
                  {settings.nama_sistem || 'SIMLAB AR-RAHMAH'}
                </span>
              </div>

              {/* Preview on White / Print Background */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-[10px] font-mono text-slate-500 font-medium">
                  Pada Cetak / Terang
                </span>
                <img
                  src={logoPreview}
                  alt="Pratinjau Logo Terang"
                  className="w-12 h-12 object-contain p-1 rounded-xl bg-white border border-slate-200 shadow-xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_OFFICIAL_LOGO;
                  }}
                />
                <span className="text-[11px] font-bold text-slate-800 tracking-tight">
                  Logo Resmi Lab
                </span>
              </div>
            </div>
          </div>

          {/* Mode Tabs: Upload vs Link URL */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveMode('upload')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeMode === 'upload'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Berkas Gambar</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('url')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeMode === 'url'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Tautan URL / Drive</span>
              </button>
            </div>

            {/* Mode 1: File Upload */}
            {activeMode === 'upload' && (
              <div className="border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-2xl p-4 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="sidebar-logo-upload"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="sidebar-logo-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center shadow-2xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-teal-800 hover:underline">
                      Klik di sini untuk memilih foto/logo
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Format: PNG, JPG, SVG, atau WebP (Maksimal 3 MB)
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Mode 2: URL or Google Drive Link */}
            {activeMode === 'url' && (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  Tempelkan URL Gambar atau Link Google Drive:
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://... atau link Google Drive file/d/..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white transition-colors"
                />
                {isGoogleDriveDirect && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[10.5px] text-emerald-900 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Link Google Drive otomatis dikonversi ke Direct Embed resmi!</span>
                  </div>
                )}
                <p className="text-[10.5px] text-slate-500">
                  Tips: Jika menggunakan link Google Drive, pastikan pengaturan berbagi disetel ke{' '}
                  <strong>"Siapa saja yang memiliki link"</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Sync Option Checkbox */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-colors">
              <input
                type="checkbox"
                checked={syncToKop}
                onChange={(e) => setSyncToKop(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
              />
              <span className="text-xs text-slate-700 font-medium leading-tight">
                Terapkan juga logo ini pada <strong>KOP Berita Acara & Lembar Cetak Laporan</strong>
              </span>
            </label>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
              title="Kembalikan ke logo resmi bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Logo Bawaan</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSuccess}
                className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSuccess ? 'Tersimpan!' : 'Simpan Logo'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
