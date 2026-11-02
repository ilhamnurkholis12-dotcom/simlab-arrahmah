import React, { useState, useEffect } from 'react';
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
  Save,
  Sparkles,
  Eye,
  Printer,
  ShieldCheck,
  Info,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
} from 'lucide-react';

export const KopSettingsForm: React.FC = () => {
  const { kopConfig, updateKopConfig, resetKopConfigToDefault, settings } = useInventory();

  // Local state for form
  const [formData, setFormData] = useState<KopBeritaAcaraConfig>({ ...kopConfig });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'kop' | 'signatures'>('kop');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setFormData({ ...kopConfig });
  }, [kopConfig]);

  const handleChange = (field: keyof KopBeritaAcaraConfig, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setLogoError('Hanya file gambar dengan format PNG atau JPG/JPEG yang diperbolehkan.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Ukuran file logo maksimal 2MB.');
      return;
    }

    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleChange('logoUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateKopConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleConfirmReset = () => {
    resetKopConfigToDefault();
    setFormData(DEFAULT_KOP_CONFIG);
    setShowResetConfirm(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Building2 className="w-3.5 h-3.5" />
              Format Berita Acara Resmi
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-sky-50 text-sky-800 border border-sky-200">
              <Sparkles className="w-3 h-3 text-sky-600" />
              Sinkronisasi Otomatis Seluruh Laporan
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan KOP & Tanda Tangan Laporan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Sesuaikan nama yayasan resmi, alamat laboratorium, kota penetapan, serta nama dan NIP para pejabat pengesah berita acara laporan. Data ini otomatis disinkronkan ke seluruh dokumen cetak dan unduhan PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 shadow-xs"
            title="Kembalikan semua nilai ke default format standar resmi"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>
        </div>
      </div>

      {/* Sync Information Notice */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-emerald-950 shadow-xs">
        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
          <p className="font-bold text-emerald-900">
            Otomatis Terintegrasi ke Seluruh Dokumen Cetak & PDF
          </p>
          <p className="text-xs text-emerald-800">
            Setiap perubahan pada formulir ini akan langsung diterapkan secara realtime pada:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-semibold text-xs text-emerald-950">
            <li className="flex items-center gap-1.5 bg-white/70 px-2 py-1 rounded-lg border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Laporan Berkala (Layar & PDF)
            </li>
            <li className="flex items-center gap-1.5 bg-white/70 px-2 py-1 rounded-lg border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Cetak Tabel Inventaris
            </li>
            <li className="flex items-center gap-1.5 bg-white/70 px-2 py-1 rounded-lg border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Cetak Matriks Sinkronisasi
            </li>
            <li className="flex items-center gap-1.5 bg-white/70 px-2 py-1 rounded-lg border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Cetak Riwayat Transaksi Mutasi
            </li>
          </ul>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-900 shadow-xs animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <div className="text-xs sm:text-sm">
            <strong className="font-bold">Pengaturan KOP Berhasil Disimpan!</strong> Data KOP surat berita acara, kota penetapan, dan 3 penandatangan telah diperbarui di sistem. Seluruh laporan cetak kini tersinkronisasi otomatis.
          </div>
        </div>
      )}

      {/* Tab Switcher: KOP vs Tanda Tangan */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-5 pt-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('kop')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'kop'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/70 rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-700" />
          <span>1. Data KOP Surat & Penetapan Kota</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('signatures')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'signatures'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/70 rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-700" />
          <span>2. Pejabat Pengesah (Nama & NIP 3 Penandatangan)</span>
        </button>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form Inputs */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'kop' && (
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Header KOP Surat & Tempat Penetapan
                  </h2>
                </div>

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

                {/* 1. Nama Yayasan */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Nama Yayasan Resmi <span className="text-red-500">*</span></span>
                    <span className="font-mono text-[10px] text-slate-400 font-normal">Baris 1 KOP</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.namaYayasan}
                    onChange={(e) => handleChange('namaYayasan', e.target.value)}
                    placeholder="YAYASAN BAYTU RAHMAH MADANIA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-sm font-bold text-slate-900 uppercase outline-none transition-all shadow-xs"
                  />
                  <p className="text-[11px] text-slate-500">
                    Ditampilkan dengan huruf kapital di bagian paling atas KOP surat lembar laporan resmi.
                  </p>
                </div>

                {/* 2. Nama Sekolah & Unit Laboratorium */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Nama Sekolah / Satuan Pendidikan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.namaSekolah}
                      onChange={(e) => handleChange('namaSekolah', e.target.value)}
                      placeholder="SMP dan SMA IT Ar-Rahmah Cendekia"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Nama Unit Laboratorium <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.unitLaboratorium}
                      onChange={(e) => handleChange('unitLaboratorium', e.target.value)}
                      placeholder="UNIT LABORATORIUM IPA TERPADU SMP DAN SMA IT AR-RAHMAH CENDEKIA"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* 3. Alamat Lengkap */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Alamat Lengkap Laboratorium & Sekolah <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.alamat}
                    onChange={(e) => handleChange('alamat', e.target.value)}
                    placeholder="Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs sm:text-sm leading-relaxed text-slate-900 outline-none transition-all shadow-xs"
                  />
                  <p className="text-[11px] text-slate-500">
                    Cantumkan gedung, jalan, RT/RW, kelurahan, kecamatan, kota, provinsi, dan kode pos untuk validitas administratif.
                  </p>
                </div>

                {/* 4. Kota Penetapan & Tanggal Penetapan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Kota Penetapan Berita Acara <span className="text-red-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.kotaPenetapan}
                      onChange={(e) => handleChange('kotaPenetapan', e.target.value)}
                      placeholder="Kota Tangerang"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-xs"
                    />
                    <p className="text-[11px] text-slate-500">
                      Format di berita acara: &quot;Ditetapkan di: <strong>{formData.kotaPenetapan || 'Kota Tangerang'}</strong>&quot;
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Tanggal Penetapan Kustom (Opsional)</span>
                      </span>
                      {formData.tanggalPenetapan && (
                        <button
                          type="button"
                          onClick={() => handleChange('tanggalPenetapan', '')}
                          className="text-[10px] text-emerald-700 font-bold hover:underline"
                        >
                          Gunakan Realtime
                        </button>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.tanggalPenetapan}
                      onChange={(e) => handleChange('tanggalPenetapan', e.target.value)}
                      placeholder="Kosongkan untuk otomatis tanggal hari ini"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-sm font-medium text-slate-900 outline-none transition-all shadow-xs"
                    />
                    <p className="text-[11px] text-slate-500">
                      Kosongkan agar selalu menggunakan tanggal cetak hari ini secara otomatis.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'signatures' && (
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Nama & NIP 3 Pejabat Penandatangan Laporan
                  </h2>
                </div>

                {/* Pejabat 1: Penanggung Jawab Laboratorium */}
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">1</span>
                      Penanggung Jawab Laboratorium
                    </span>
                    <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Kolom Kiri</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Judul Jabatan</label>
                      <input
                        type="text"
                        value={formData.pjTitle}
                        onChange={(e) => handleChange('pjTitle', e.target.value)}
                        placeholder="Penanggung Jawab Laboratorium"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Nama Instansi</label>
                      <input
                        type="text"
                        value={formData.pjInstansi}
                        onChange={(e) => handleChange('pjInstansi', e.target.value)}
                        placeholder="SMP dan SMA IT Ar-Rahmah Cendekia"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
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
                      <label className="block text-xs font-bold text-slate-800">
                        Nomor Induk Pegawai (NIP / NIPY) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.pjNip}
                        onChange={(e) => handleChange('pjNip', e.target.value)}
                        placeholder="NIPY. 2026.ARC.0412"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Pejabat 2: Kepala Laboratorium IPA Terpadu */}
                <div className="bg-emerald-50/60 p-4 sm:p-5 rounded-2xl border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px]">2</span>
                      Kepala Laboratorium IPA Terpadu
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded border border-emerald-300">
                      Kolom Tengah · Otoritas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-emerald-900">Judul Jabatan</label>
                      <input
                        type="text"
                        value={formData.kepalaLabTitle}
                        onChange={(e) => handleChange('kepalaLabTitle', e.target.value)}
                        placeholder="Kepala Laboratorium IPA Terpadu"
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-emerald-900">Nama Instansi</label>
                      <input
                        type="text"
                        value={formData.kepalaLabInstansi}
                        onChange={(e) => handleChange('kepalaLabInstansi', e.target.value)}
                        placeholder="SMP dan SMA IT Ar-Rahmah Cendekia"
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-900">
                        Nama Lengkap & Gelar Resmi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.kepalaLabNama}
                        onChange={(e) => handleChange('kepalaLabNama', e.target.value)}
                        placeholder="Ilham Nurkholis Majid, S. Pd., Gr."
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-900">
                        Nomor Induk Pegawai (NIP / NIPY) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.kepalaLabNip}
                        onChange={(e) => handleChange('kepalaLabNip', e.target.value)}
                        placeholder="NIPY. 2026.ARC.0101"
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Pejabat 3: Mengetahui, Kepala Sekolah */}
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">3</span>
                      Mengetahui, Kepala Sekolah
                    </span>
                    <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Kolom Kanan</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Judul Jabatan</label>
                      <input
                        type="text"
                        value={formData.kepalaSekolahTitle}
                        onChange={(e) => handleChange('kepalaSekolahTitle', e.target.value)}
                        placeholder="Mengetahui, Kepala Sekolah"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Nama Instansi</label>
                      <input
                        type="text"
                        value={formData.kepalaSekolahInstansi}
                        onChange={(e) => handleChange('kepalaSekolahInstansi', e.target.value)}
                        placeholder="SMP dan SMA IT Ar-Rahmah Cendekia"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Nama Lengkap & Gelar Resmi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.kepalaSekolahNama}
                        onChange={(e) => handleChange('kepalaSekolahNama', e.target.value)}
                        placeholder="H. Ahmad Zaki, Lc., M.Ag"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Nomor Induk Pegawai (NIP / NIPY) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.kepalaSekolahNip}
                        onChange={(e) => handleChange('kepalaSekolahNip', e.target.value)}
                        placeholder="NIPY. 2026.ARC.0001"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto min-h-[46px] px-8 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan KOP & Tanda Tangan</span>
              </button>
            </div>
          </div>

          {/* Right Col: Live Preview Card */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Eye className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pratinjau KOP Surat (Live Preview)
                </h3>
              </div>

              {/* Document Paper Preview */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 text-center space-y-2 text-slate-900">
                <div className="flex items-center gap-3 pb-1 border-b border-slate-200">
                  <div className="w-12 h-12 shrink-0 bg-white p-0.5 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                    <img
                      src={formData.logoUrl || '/src/assets/images/arcss_logo_official.svg'}
                      alt="Logo KOP"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-[9px] font-bold text-emerald-900 uppercase tracking-wider truncate">
                      {formData.namaYayasan || 'YAYASAN BAYTU RAHMAH MADANIA'}
                    </div>
                    <div className="text-xs font-extrabold uppercase tracking-tight text-slate-900 truncate">
                      {formData.namaSekolah || 'SMP DAN SMA IT AR-RAHMAH CENDEKIA'}
                    </div>
                    <div className="text-[9.5px] font-bold text-slate-800 uppercase truncate">
                      {formData.unitLaboratorium || 'UNIT LABORATORIUM IPA TERPADU SMP DAN SMA IT AR-RAHMAH CENDEKIA'}
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-slate-600 leading-snug line-clamp-2 text-left">
                  {formData.alamat ||
                    'Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114'}
                </p>
                <div className="border-b-2 border-slate-900 my-1.5" />
                <div className="border-b border-slate-900 -mt-1 mb-2.5" />

                {/* Location */}
                <div className="text-right text-[9px] text-slate-600 font-medium">
                  Ditetapkan di: <strong>{formData.kotaPenetapan || 'Kota Tangerang'}</strong>, Tanggal:{' '}
                  {formData.tanggalPenetapan || '21 Oktober 2026'}
                </div>

                {/* Mini 3 Columns Signatures */}
                <div className="grid grid-cols-3 gap-2 pt-3 text-[8.5px] border-t border-slate-200 mt-2">
                  <div className="flex flex-col justify-between h-20">
                    <span className="font-semibold text-slate-700 leading-tight">{formData.pjTitle || 'PJ Lab'}</span>
                    <div>
                      <span className="font-bold underline block text-slate-900 truncate">{formData.pjNama}</span>
                      <span className="text-[7.5px] font-mono text-slate-500 block truncate">{formData.pjNip}</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between h-20">
                    <span className="font-semibold text-emerald-900 leading-tight">{formData.kepalaLabTitle || 'Kepala Lab'}</span>
                    <div>
                      <span className="font-bold underline block text-slate-900 truncate">{formData.kepalaLabNama}</span>
                      <span className="text-[7.5px] font-mono text-slate-500 block truncate">{formData.kepalaLabNip}</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between h-20">
                    <span className="font-semibold text-slate-700 leading-tight">{formData.kepalaSekolahTitle || 'Kepala Sekolah'}</span>
                    <div>
                      <span className="font-bold underline block text-slate-900 truncate">{formData.kepalaSekolahNama}</span>
                      <span className="text-[7.5px] font-mono text-slate-500 block truncate">{formData.kepalaSekolahNip}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  Pratinjau di atas merepresentasikan lembar fisik kop surat dan blok tanda tangan berita acara yang dicetak printer fisik atau diekspor ke PDF dokumen resmi.
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Dialog Konfirmasi Reset Format KOP In-App */}
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
              Kembalikan seluruh teks KOP dan data penandatangan berita acara ke format standar resmi sekolah?
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
  );
};
