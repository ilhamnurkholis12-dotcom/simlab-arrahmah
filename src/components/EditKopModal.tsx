import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { KopBeritaAcaraConfig, DEFAULT_KOP_CONFIG } from '../types/inventory';
import {
  FileText,
  Building2,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  RotateCcw,
  X,
  Save,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface EditKopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditKopModal: React.FC<EditKopModalProps> = ({ isOpen, onClose }) => {
  const { kopConfig, updateKopConfig, resetKopConfigToDefault } = useInventory();

  // Local form state
  const [formData, setFormData] = useState<KopBeritaAcaraConfig>({ ...kopConfig });
  const [activeTab, setActiveTab] = useState<'kop' | 'signatures'>('kop');
  const [successMsg, setSuccessMsg] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync if kopConfig changes
  React.useEffect(() => {
    setFormData({ ...kopConfig });
  }, [kopConfig, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof KopBeritaAcaraConfig, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type: PNG or JPG/JPEG
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setLogoError('Format file tidak didukung! Harap pilih file gambar format PNG atau JPG/JPEG.');
      return;
    }

    // Check size limit: 2MB
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Ukuran file terlalu besar! Maksimal ukuran logo adalah 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleChange('logoUrl', reader.result);
      }
    };
    reader.onerror = () => {
      setLogoError('Gagal membaca file gambar. Silakan coba kembali.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateKopConfig(formData);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1000);
  };

  const handleConfirmReset = () => {
    resetKopConfigToDefault();
    setFormData(DEFAULT_KOP_CONFIG);
    setShowResetConfirm(false);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-200 flex items-center justify-center border border-emerald-600 shadow-xs">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">
                Edit KOP & Tanda Tangan Berita Acara
              </h3>
              <p className="text-xs text-slate-400">
                Sesuaikan nama yayasan, alamat resmi, kota penetapan, serta nama & NIP pejabat penandatangan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('kop')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'kop'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>KOP Surat & Lokasi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signatures')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'signatures'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-700" />
            <span>Penandatangan (3 Pejabat)</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Data KOP dan Tanda Tangan berhasil disimpan dan diperbarui!</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {activeTab === 'kop' && (
            <div className="space-y-4">
              {/* Insert Logo Instansi / Satuan Pendidikan (PNG / JPG) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-900 uppercase">
                      Logo Instansi / KOP Surat (PNG / JPG)
                    </span>
                  </div>
                  {formData.logoUrl ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      Logo Kustom Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                      Logo Resmi Default
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                  {/* Logo Preview Box */}
                  <div className="w-20 h-20 shrink-0 bg-white p-1.5 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-2xs">
                    <img
                      src={formData.logoUrl || '/src/assets/images/arcss_logo_official.svg'}
                      alt="Pratinjau Logo KOP"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Actions & Instructions */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <label className="cursor-pointer min-h-[36px] px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih Logo (PNG / JPG)</span>
                        <input
                          type="file"
                          accept=".png, .jpg, .jpeg, image/png, image/jpeg"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>

                      {formData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => handleChange('logoUrl', '')}
                          className="min-h-[36px] px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus & Gunakan Default</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Format file: <strong>PNG</strong> atau <strong>JPG/JPEG</strong> (maksimal 2MB). Disarankan logo berlatar transparan atau persegi. Logo ini otomatis tampil di sisi kiri KOP laporan di layar, cetak printer, dan ekspor PDF.
                    </p>

                    {logoError && (
                      <div className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{logoError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Nama Yayasan */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Nama Yayasan Resmi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.namaYayasan}
                  onChange={(e) => handleChange('namaYayasan', e.target.value)}
                  placeholder="YAYASAN BAYTU RAHMAH MADANIA"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-500">
                  Muncul di baris paling atas KOP surat berita acara laporan berkala dan cetak dokumen.
                </p>
              </div>

              {/* Nama Sekolah & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Nama Sekolah / Satuan Pendidikan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.namaSekolah}
                    onChange={(e) => handleChange('namaSekolah', e.target.value)}
                    placeholder="SMP dan SMA IT Ar-Rahmah Cendekia"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Nama Unit Laboratorium
                  </label>
                  <input
                    type="text"
                    value={formData.unitLaboratorium}
                    onChange={(e) => handleChange('unitLaboratorium', e.target.value)}
                    placeholder="UNIT LABORATORIUM IPA TERPADU SMP DAN SMA IT AR-RAHMAH CENDEKIA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                  />
                </div>
              </div>

              {/* Alamat Lengkap */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Alamat Lengkap Laboratorium & Sekolah <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.alamat}
                  onChange={(e) => handleChange('alamat', e.target.value)}
                  placeholder="Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-500">
                  Dicantumkan lengkap pada lembar berita acara cetak dan file PDF inventaris laboratorium.
                </p>
              </div>

              {/* Kota Penetapan & Tanggal Penetapan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Ditetapkan di (Kota) <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.kotaPenetapan}
                    onChange={(e) => handleChange('kotaPenetapan', e.target.value)}
                    placeholder="Kota Tangerang"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                  />
                  <p className="text-[10.5px] text-slate-400">
                    Format: &quot;Ditetapkan di: <strong>{formData.kotaPenetapan || 'Kota Tangerang'}</strong>&quot;
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Tanggal Penetapan (Kustom)</span>
                    </span>
                    {formData.tanggalPenetapan && (
                      <button
                        type="button"
                        onClick={() => handleChange('tanggalPenetapan', '')}
                        className="text-[10px] text-emerald-700 hover:underline"
                      >
                        Gunakan Tgl Hari Ini
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.tanggalPenetapan}
                    onChange={(e) => handleChange('tanggalPenetapan', e.target.value)}
                    placeholder="Kosongkan untuk otomatis tanggal hari ini"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                  />
                  <p className="text-[10.5px] text-slate-400">
                    Contoh: &quot;20 Oktober 2026&quot; atau biarkan kosong untuk realtime.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signatures' && (
            <div className="space-y-5">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p>
                  Atur pengesah laporan resmi inventaris (PJ Lab, Kepala Lab, & Kepala Sekolah SMA IT Ar-Rahmah Narendra Ichiputra Hariyanto). Sistem otomatis menyesuaikan nama PJ sesuai lab terpilih (Fisika: Oktaviawan Arif, Biologi: Siti Aminatuh, SMP: Farkhatul Amaliya, Kimia: Ilham Nurkholis). Khusus dokumen <strong>Rekap E-Raport</strong> cukup 2 pengesah: <strong>Guru Mapel & Kepala Lab IPA Terpadu</strong>.
                </p>
              </div>

              {/* Pejabat 1: Penanggung Jawab Laboratorium */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    1. Penanggung Jawab Laboratorium
                  </span>
                  <span className="text-[10px] text-slate-500">Kolom Kiri</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Judul Jabatan
                    </label>
                    <input
                      type="text"
                      value={formData.pjTitle}
                      onChange={(e) => handleChange('pjTitle', e.target.value)}
                      placeholder="Penanggung Jawab Laboratorium"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Nama Instansi
                    </label>
                    <input
                      type="text"
                      value={formData.pjInstansi}
                      onChange={(e) => handleChange('pjInstansi', e.target.value)}
                      placeholder="SMP dan SMA IT Ar-Rahmah Cendekia"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-800">
                      Nama Lengkap & Gelar Resmi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pjNama}
                      onChange={(e) => handleChange('pjNama', e.target.value)}
                      placeholder="Oktaviawan Arif Sudarsono, M. Pd., Gr."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-800">
                      Nomor Induk Pegawai (NIP / NIPY) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pjNip}
                      onChange={(e) => handleChange('pjNip', e.target.value)}
                      placeholder="NIPY. 2026.ARC.0412"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Pejabat 2: Kepala Laboratorium IPA Terpadu */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    2. Kepala Laboratorium IPA Terpadu
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                    Kolom Tengah
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Judul Jabatan
                    </label>
                    <input
                      type="text"
                      value={formData.kepalaLabTitle}
                      onChange={(e) => handleChange('kepalaLabTitle', e.target.value)}
                      placeholder="Kepala Laboratorium IPA Terpadu"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Nama Instansi
                    </label>
                    <input
                      type="text"
                      value={formData.kepalaLabInstansi}
                      onChange={(e) => handleChange('kepalaLabInstansi', e.target.value)}
                      placeholder="SMP dan SMA IT Ar-Rahmah Cendekia"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-800">
                      Nama Lengkap & Gelar Resmi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.kepalaLabNama}
                      onChange={(e) => handleChange('kepalaLabNama', e.target.value)}
                      placeholder="Ilham Nurkholis Majid, S. Pd., Gr."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-800">
                      Nomor Induk Pegawai (NIP / NIPY) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.kepalaLabNip}
                      onChange={(e) => handleChange('kepalaLabNip', e.target.value)}
                      placeholder="NIPY. 2026.ARC.0101"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Pejabat 3: Kepala Sekolah SMA IT Ar-Rahmah */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    3. Mengetahui, Kepala Sekolah SMA IT Ar-Rahmah
                  </span>
                  <span className="text-[10px] text-slate-500">Kolom Kanan</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Judul Jabatan
                    </label>
                    <input
                      type="text"
                      value={formData.kepalaSekolahTitle}
                      onChange={(e) => handleChange('kepalaSekolahTitle', e.target.value)}
                      placeholder="Mengetahui, Kepala Sekolah SMA IT Ar-Rahmah"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Nama Instansi
                    </label>
                    <input
                      type="text"
                      value={formData.kepalaSekolahInstansi}
                      onChange={(e) => handleChange('kepalaSekolahInstansi', e.target.value)}
                      placeholder="SMA IT Ar-Rahmah Cendekia"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-800">
                      Nama Lengkap & Gelar Resmi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.kepalaSekolahNama}
                      onChange={(e) => handleChange('kepalaSekolahNama', e.target.value)}
                      placeholder="Narendra Ichiputra Hariyanto, M. Pd."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-800">
                      Nomor Induk Pegawai (NIP / NIPY) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.kepalaSekolahNip}
                      onChange={(e) => handleChange('kepalaSekolahNip', e.target.value)}
                      placeholder="NIPY. 2026.ARC.0002"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembalikan Default Standar</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan KOP</span>
              </button>
            </div>
          </div>
        </form>

        {/* Dialog Konfirmasi Reset Standar In-App */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-amber-600 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Konfirmasi Reset Format KOP</h4>
                  <p className="text-xs text-slate-500">SIMLAB SMP & SMA IT Ar-Rahmah Cendekia</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-5">
                Apakah Anda yakin ingin mengembalikan seluruh teks KOP dan data penandatangan berita acara ke format standar resmi sekolah?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ya, Kembalikan Default</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
