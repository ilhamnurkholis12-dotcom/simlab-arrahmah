import React, { useState, useEffect } from 'react';
import { useInventory, AUTHORIZED_HEAD_OF_LAB_EMAIL } from '../context/InventoryContext';
import { UserManagementSection } from './UserManagementSection';
import { KopSettingsForm } from './KopSettingsForm';
import { PasswordChangeEmailSection } from './PasswordChangeEmailSection';
import {
  Settings,
  ShieldAlert,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Building2,
  Laptop,
  Megaphone,
  Database,
  Copy,
  Check,
  Eye,
  Sliders,
  Sparkles,
  Users,
  UserPlus,
  Key,
  Lock,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { DEFAULT_GAS_API_URL, getGasApiUrl } from '../services/googleAppsScriptService';

interface SettingsPanelProps {
  onNavigateToDashboard: () => void;
  onOpenGoogleSheetsSync?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onNavigateToDashboard,
  onOpenGoogleSheetsSync,
}) => {
  const {
    currentUser,
    settings,
    updateSettings,
    resetSettingsToDefault,
    accounts,
    showToast,
  } = useInventory();

  const HEAD_OF_LAB_EMAIL =
    AUTHORIZED_HEAD_OF_LAB_EMAIL || 'Ilham.nurkholis114@guru.sma.belajar.id';

  // Strict authority check: ONLY user with email 'Ilham.nurkholis114@guru.sma.belajar.id' can access or render User Management
  const canManageUsers =
    (currentUser?.email || '').toLowerCase().trim() ===
    HEAD_OF_LAB_EMAIL.toLowerCase().trim();

  // Sub-tab: 'users' (Manajemen Akun) | 'kop' (KOP Laporan) | 'system' (Identitas Web & Pengumuman)
  // Default to 'users' for authorized head of lab, otherwise 'kop'
  const [activeSection, setActiveSection] = useState<'users' | 'kop' | 'system'>(
    canManageUsers ? 'users' : 'kop'
  );

  useEffect(() => {
    // If current user is not authorized, ensure active section is never 'users'
    if (!canManageUsers && activeSection === 'users') {
      setActiveSection('kop');
    }
  }, [canManageUsers, activeSection]);

  // Form local state
  const [namaSistem, setNamaSistem] = useState(settings.nama_sistem);
  const [namaSekolah, setNamaSekolah] = useState(settings.nama_sekolah);
  const [teksPengumuman, setTeksPengumuman] = useState(settings.teks_pengumuman);
  const [tipePengumuman, setTipePengumuman] = useState<'info' | 'warning' | 'success'>(
    settings.tipe_pengumuman || 'info'
  );
  const [tampilkanPengumuman, setTampilkanPengumuman] = useState(
    settings.tampilkan_pengumuman ?? true
  );
  const [tahunAjaran, setTahunAjaran] = useState(settings.tahun_ajaran || '2026');
  const [subJudulDashboard, setSubJudulDashboard] = useState(
    settings.sub_judul_dashboard ||
      'Sistem Rekapitulasi Stok Barang Inventaris Laboratorium IPA Terpadu'
  );
  const [kontakBantuan, setKontakBantuan] = useState(
    settings.kontak_bantuan || 'Ilham.nurkholis114@guru.sma.belajar.id'
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state if context changes externally
  useEffect(() => {
    setNamaSistem(settings.nama_sistem);
    setNamaSekolah(settings.nama_sekolah);
    setTeksPengumuman(settings.teks_pengumuman);
    setTipePengumuman(settings.tipe_pengumuman || 'info');
    setTampilkanPengumuman(settings.tampilkan_pengumuman ?? true);
    setTahunAjaran(settings.tahun_ajaran || '2026');
    setSubJudulDashboard(
      settings.sub_judul_dashboard ||
        'Sistem Rekapitulasi Stok Barang Inventaris Laboratorium IPA Terpadu'
    );
    setKontakBantuan(settings.kontak_bantuan || 'Ilham.nurkholis114@guru.sma.belajar.id');
  }, [settings]);

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!namaSistem.trim() || !namaSekolah.trim()) {
      showToast({
        type: 'warning',
        title: 'Validasi Gagal',
        message: 'Nama Sistem dan Nama Sekolah tidak boleh kosong!',
      });
      return;
    }

    updateSettings({
      nama_sistem: namaSistem.trim(),
      nama_sekolah: namaSekolah.trim(),
      teks_pengumuman: teksPengumuman.trim(),
      tipe_pengumuman: tipePengumuman,
      tampilkan_pengumuman: tampilkanPengumuman,
      tahun_ajaran: tahunAjaran.trim(),
      sub_judul_dashboard: subJudulDashboard.trim(),
      kontak_bantuan: kontakBantuan.trim(),
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3500);
  };

  // Handle Reset to Default
  const handleConfirmReset = () => {
    resetSettingsToDefault();
    setShowResetConfirm(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Template Presets for Announcement
  const applyPreset = (presetType: 'stock_opname' | 'praktikum' | 'maintenance') => {
    if (presetType === 'stock_opname') {
      setTipePengumuman('warning');
      setTeksPengumuman(
        'PERHATIAN: Pelaksanaan Stock Opname Terpadu Laboratorium IPA Semester Genap 2026 sedang berlangsung. Seluruh mutasi barang masuk & keluar wajib diverifikasi oleh masing-masing Penanggung Jawab Lab sebelum tanggal 30 bulan ini.'
      );
    } else if (presetType === 'praktikum') {
      setTipePengumuman('info');
      setTeksPengumuman(
        'JADWAL PRAKTIKUM: Mohon seluruh laboran Fisika, Kimia, Biologi, dan IPA SMP memastikan kesiapan alat ukur dan reagen praktikum minimal H-1 sebelum modul dimulai.'
      );
    } else {
      setTipePengumuman('success');
      setTeksPengumuman(
        'INFORMASI SISTEM: Rekapitulasi terpusat stok barang inventaris laboratorium IPA Tahun 2026 telah sinkron 100% antar laboratorium. Terima kasih atas kerjasama seluruh tim sains.'
      );
    }
    setTampilkanPengumuman(true);
  };

  // SQL Schema Generator for user documentation
  const sqlScript = `-- Tabel pengaturan_sistem untuk SIMLAB AR-RAHMAH CENDEKIA
CREATE TABLE IF NOT EXISTS pengaturan_sistem (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama_sistem VARCHAR(255) NOT NULL DEFAULT 'SIMLAB AR-RAHMAH CENDEKIA',
  nama_sekolah VARCHAR(255) NOT NULL DEFAULT 'SMP dan SMA IT Ar-Rahmah Cendekia',
  teks_pengumuman TEXT NOT NULL,
  tipe_pengumuman ENUM('info', 'warning', 'success') DEFAULT 'info',
  tampilkan_pengumuman BOOLEAN DEFAULT TRUE,
  tahun_ajaran VARCHAR(50) DEFAULT '2026',
  sub_judul_dashboard VARCHAR(255) DEFAULT 'Sistem Rekapitulasi Stok Barang Inventaris Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia',
  kontak_bantuan VARCHAR(100) DEFAULT 'Ilham.nurkholis114@guru.sma.belajar.id',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100)
);

-- Data Awal / Seeder
INSERT INTO pengaturan_sistem (
  id, nama_sistem, nama_sekolah, teks_pengumuman, tipe_pengumuman, tampilkan_pengumuman, tahun_ajaran, updated_by
) VALUES (
  1,
  '${namaSistem.replace(/'/g, "''")}',
  '${namaSekolah.replace(/'/g, "''")}',
  '${teksPengumuman.replace(/'/g, "''")}',
  '${tipePengumuman}',
  ${tampilkanPengumuman ? 1 : 0},
  '${tahunAjaran}',
  '${currentUser?.name || 'Administrator'}'
) ON DUPLICATE KEY UPDATE
  nama_sistem = VALUES(nama_sistem),
  nama_sekolah = VALUES(nama_sekolah),
  teks_pengumuman = VALUES(teks_pengumuman),
  tipe_pengumuman = VALUES(tipe_pengumuman),
  tampilkan_pengumuman = VALUES(tampilkan_pengumuman),
  tahun_ajaran = VALUES(tahun_ajaran),
  updated_by = VALUES(updated_by);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // MAIN SETTINGS PANEL VIEW
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Sub-Tab Navigation Switcher */}
      <div className="flex border-b border-slate-200 gap-2">
        {canManageUsers ? (
          <button
            type="button"
            onClick={() => setActiveSection('users')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeSection === 'users'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/70 rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-700" />
            <span>Manajemen Akun Pengguna</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-100 text-emerald-800 font-bold">
              {accounts.length}
            </span>
            <span className="text-[9.5px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-bold uppercase hidden md:inline border border-emerald-300">
              Otoritas Penuh
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveSection('users')}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeSection === 'users'
                ? 'border-amber-500 text-amber-900 bg-amber-50/70 rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-t-xl'
            }`}
            title={`Fitur manajemen akun pengguna hanya dapat diakses oleh ${HEAD_OF_LAB_EMAIL}`}
          >
            <Lock className="w-4 h-4 text-amber-600" />
            <span>Manajemen Akun</span>
            <span className="text-[9.5px] bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded font-bold uppercase">
              Terkunci
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveSection('kop')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeSection === 'kop'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/70 rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-700" />
          <span>Pengaturan KOP Laporan</span>
          <span className="text-[9.5px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-bold uppercase hidden md:inline border border-emerald-300">
            Tersinkron
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('system')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeSection === 'system'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/70 rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <Laptop className="w-4 h-4 text-slate-600" />
          <span>Identitas Web & Pengumuman</span>
        </button>
      </div>

      {/* Tab 1: User Management Section - STRICTLY ENFORCED: ONLY render if canManageUsers */}
      {activeSection === 'users' && canManageUsers && (
        <UserManagementSection />
      )}

      {/* Tab 1 (Fallback Barrier): Access Denied Screen if unauthorized user navigates to users tab */}
      {activeSection === 'users' && !canManageUsers && (
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 sm:p-10 text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200 shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800">
              Akses Dibatasi · Khusus Kepala Lab
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Fitur Manajemen Akun Pengguna Terkunci
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Sesuai aturan keamanan sistem SIMLAB, penambahan akun user baru, pengaturan profil laboran, reset kata sandi, dan penghapusan akun <b>hanya dapat diakses atau ditampilkan secara eksklusif oleh akun Kepala Lab dengan email</b>:
            </p>
            <div className="inline-block p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <code className="text-xs font-bold text-emerald-900 font-mono">
                {HEAD_OF_LAB_EMAIL}
              </code>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2 text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Akun Anda:</span>
              <span className="font-semibold text-slate-800">{currentUser?.name || 'Staf'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Email:</span>
              <span className="font-mono text-slate-700">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Peran Akun:</span>
              <span className="font-mono text-amber-700 font-bold">{currentUser?.roleTitle || currentUser?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status Otoritas:</span>
              <span className="text-red-600 font-semibold">Tidak memiliki hak manajemen akun</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              onClick={() => setActiveSection('kop')}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Buka Pengaturan KOP & Tanda Tangan
            </button>
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Untuk mengelola user, silakan keluar dan login menggunakan akun Administrator.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: KOP & Tanda Tangan Laporan */}
      {activeSection === 'kop' && <KopSettingsForm />}

      {/* Tab 3: System Settings Section & Password Change with Email Verification */}
      {activeSection === 'system' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Fitur Mandiri Ganti Kata Sandi Akun dengan Sistem Verifikasi Email */}
          <PasswordChangeEmailSection />

          {/* Top Header Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Panel Administrator
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                  <Database className="w-3 h-3" />
                  Tabel: pengaturan_sistem (ID: #1)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Pengaturan Sistem Web
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Kelola identitas sistem, nama sekolah resmi, dan pengumuman/peringatan dashboard secara dinamis tanpa perlu mengubah baris kode.
              </p>
            </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 shadow-xs"
            title="Kembalikan semua nilai ke default awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>
          <button
            type="button"
            onClick={copySqlToClipboard}
            className="min-h-[44px] px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            title="Salin query SQL tabel pengaturan_sistem"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-sky-700" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'SQL Tersalin!' : 'Salin SQL Schema'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-900 shadow-xs animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs sm:text-sm">
            <strong className="font-bold">Pengaturan Berhasil Disimpan!</strong> Data tabel{' '}
            <code className="font-mono font-semibold bg-emerald-100 px-1 py-0.5 rounded">pengaturan_sistem</code> telah diperbarui. Tampilan dashboard, navbar, dan kop surat kini otomatis menggunakan data terbaru.
          </div>
        </div>
      )}

      {/* Google Sheets Apps Script Backend Integration Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-700/50 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Backend Google Apps Script Aktif
            </span>
            <span className="text-[10px] bg-slate-800/80 text-emerald-300 font-mono px-2 py-0.5 rounded border border-slate-700">
              REST GET & POST
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Sinkronisasi Google Sheets Spreadsheet</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Terhubung langsung ke Web App Apps Script resmi untuk pertukaran data dua arah (GET data & POST simpan) pada 6 tabel lembar kerja:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Stok_Alat', 'Bahan_Kimia', 'Jurnal_Praktikum', 'Data_Siswa', 'E_Rapot', 'Pengguna'].map((sheet) => (
              <span
                key={sheet}
                className="text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-200 border border-emerald-600/40"
              >
                {sheet}
              </span>
            ))}
          </div>
          <div className="pt-1 text-[11px] font-mono text-emerald-300/80 truncate">
            URL: {getGasApiUrl()}
          </div>
        </div>

        <div className="shrink-0 flex sm:flex-col gap-2">
          {onOpenGoogleSheetsSync && (
            <button
              type="button"
              onClick={onOpenGoogleSheetsSync}
              className="min-h-[44px] px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-emerald-500/30 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Buka Sinkronisasi</span>
            </button>
          )}
          <a
            href={getGasApiUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Cek Status API</span>
          </a>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Box 1: Core System & School Identity */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Laptop className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Identitas Sistem & Lembaga
                </h2>
              </div>

              {/* 1. Nama Sistem */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>1. Nama Sistem Web <span className="text-red-500">*</span></span>
                  <span className="font-mono text-[10px] text-slate-400 font-normal">field: nama_sistem</span>
                </label>
                <input
                  type="text"
                  required
                  value={namaSistem}
                  onChange={(e) => setNamaSistem(e.target.value)}
                  placeholder="contoh: SIMLAB AR-RAHMAH CENDEKIA"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-xs"
                />
                <p className="text-[11px] text-slate-500">
                  Nama ini muncul di top navbar, title browser, kop dokumen inventaris, dan file backup JSON.
                </p>
              </div>

              {/* 2. Nama Sekolah */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>2. Nama Sekolah / Lembaga <span className="text-red-500">*</span></span>
                  <span className="font-mono text-[10px] text-slate-400 font-normal">field: nama_sekolah</span>
                </label>
                <input
                  type="text"
                  required
                  value={namaSekolah}
                  onChange={(e) => setNamaSekolah(e.target.value)}
                  placeholder="contoh: SMP dan SMA IT Ar-Rahmah Cendekia"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-xs"
                />
                <p className="text-[11px] text-slate-500">
                  Nama resmi sekolah yang tercantum pada formulir login, kop surat PDF resmi, dan lembar verifikasi stok opname.
                </p>
              </div>

              {/* Sub-judul Dashboard & Tahun Ajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Tahun Buku / Ajaran
                  </label>
                  <input
                    type="text"
                    value={tahunAjaran}
                    onChange={(e) => setTahunAjaran(e.target.value)}
                    placeholder="2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg text-xs text-slate-900 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Kontak Bantuan / Email PIC
                  </label>
                  <input
                    type="email"
                    value={kontakBantuan}
                    onChange={(e) => setKontakBantuan(e.target.value)}
                    placeholder="Ilham.nurkholis114@guru.sma.belajar.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Teks Peringatan/Pengumuman di Dashboard */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    3. Teks Peringatan & Pengumuman Dashboard
                  </h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={tampilkanPengumuman}
                    onChange={(e) => setTampilkanPengumuman(e.target.checked)}
                    className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Tampilkan di Dashboard</span>
                </label>
              </div>

              {/* Presets buttons */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Gunakan Template Cepat:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('stock_opname')}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    ⚠️ Peringatan Stock Opname
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('praktikum')}
                    className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    🔬 Jadwal Praktikum Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('maintenance')}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    ✅ Pengumuman Sukses / Standar
                  </button>
                </div>
              </div>

              {/* Teks Pengumuman Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Isi Pesan / Pengumuman</span>
                  <span className="font-mono text-[10px] text-slate-400 font-normal">
                    {teksPengumuman.length} karakter
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={teksPengumuman}
                  onChange={(e) => setTeksPengumuman(e.target.value)}
                  placeholder="Ketik teks pengumuman penting, jadwal praktikum, arahan K3 laboratorium, atau batas waktu rekonsiliasi stok..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all shadow-xs leading-relaxed"
                />
              </div>

              {/* Tipe Banner Pengumuman */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Tipe Tampilan Banner:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all text-xs font-semibold ${
                      tipePengumuman === 'info'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipePengumuman"
                      checked={tipePengumuman === 'info'}
                      onChange={() => setTipePengumuman('info')}
                      className="sr-only"
                    />
                    <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Info (Emerald)</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all text-xs font-semibold ${
                      tipePengumuman === 'warning'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipePengumuman"
                      checked={tipePengumuman === 'warning'}
                      onChange={() => setTipePengumuman('warning')}
                      className="sr-only"
                    />
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Peringatan (Amber)</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all text-xs font-semibold ${
                      tipePengumuman === 'success'
                        ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipePengumuman"
                      checked={tipePengumuman === 'success'}
                      onChange={() => setTipePengumuman('success')}
                      className="sr-only"
                    />
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Sukses (Teal)</span>
                  </label>
                </div>
              </div>

              {/* Sub Judul Dashboard */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  Teks Subtitle di Bawah Sambutan Dashboard
                </label>
                <input
                  type="text"
                  value={subJudulDashboard}
                  onChange={(e) => setSubJudulDashboard(e.target.value)}
                  placeholder="Sistem Rekapitulasi Stok Barang Inventaris Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg text-xs text-slate-900 outline-none"
                />
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Terakhir diperbarui: {settings.updated_at} ({settings.updated_by || 'Admin'})</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onNavigateToDashboard}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none min-h-[44px] px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Web</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Live Preview & Database Info */}
          <div className="space-y-6">
            {/* Live Preview Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Eye className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pratinjau Langsung (Live Preview)
                </h3>
              </div>

              {/* Preview Navbar Wordmark */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Header Navbar Wordmark
                </div>
                <div className="font-bold text-xs text-slate-900 truncate">
                  {namaSistem || 'SIMLAB AR-RAHMAH CENDEKIA'}
                </div>
                <div className="text-[10px] text-emerald-800 font-medium uppercase tracking-wide truncate">
                  {namaSekolah || 'SMP dan SMA IT Ar-Rahmah Cendekia'} · {tahunAjaran}
                </div>
              </div>

              {/* Preview Announcement Banner */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Banner Pengumuman Dashboard
                </div>
                {tampilkanPengumuman ? (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      tipePengumuman === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : tipePengumuman === 'success'
                        ? 'bg-teal-50 border-teal-200 text-teal-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      {tipePengumuman === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      ) : tipePengumuman === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-emerald-700" />
                      )}
                      <span>PENGUMUMAN RESMI</span>
                    </div>
                    <p className="text-[11px] leading-relaxed line-clamp-3">
                      {teksPengumuman || 'Belum ada teks pengumuman yang diisi.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs italic">
                    Banner pengumuman dinonaktifkan
                  </div>
                )}
              </div>

              {/* Preview Dashboard Greeting */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Header Sambutan Dashboard
                </div>
                <div className="font-bold text-slate-900">
                  Selamat Datang, {currentUser?.name}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2">
                  {subJudulDashboard || 'Rekapitulasi terpusat stok barang...'}
                </div>
              </div>
            </div>

            {/* Database Architecture Info Box */}
            <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Database className="w-4 h-4" />
                  <span>Struktur Tabel: pengaturan_sistem</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded">
                  MySQL / PostgreSQL
                </span>
              </div>

              <div className="font-mono text-[11px] space-y-1 text-slate-300 overflow-x-auto">
                <div className="text-slate-400"># Definisi Field & Nilai Saat Ini:</div>
                <div><span className="text-sky-400">id:</span> <span className="text-amber-300">1</span> (PRIMARY KEY)</div>
                <div><span className="text-sky-400">nama_sistem:</span> &quot;<span className="text-emerald-300">{settings.nama_sistem}</span>&quot;</div>
                <div><span className="text-sky-400">nama_sekolah:</span> &quot;<span className="text-emerald-300">{settings.nama_sekolah}</span>&quot;</div>
                <div><span className="text-sky-400">tipe_pengumuman:</span> &quot;<span className="text-amber-300">{settings.tipe_pengumuman}</span>&quot;</div>
                <div><span className="text-sky-400">tampilkan_pengumuman:</span> <span className="text-purple-300">{settings.tampilkan_pengumuman ? 'TRUE' : 'FALSE'}</span></div>
                <div><span className="text-sky-400">tahun_ajaran:</span> &quot;<span className="text-emerald-300">{settings.tahun_ajaran}</span>&quot;</div>
                <div><span className="text-sky-400">updated_by:</span> &quot;<span className="text-slate-400">{settings.updated_by}</span>&quot;</div>
              </div>

              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 leading-relaxed">
                Data disimpan secara reaktif dan persisten di browser (LocalStorage) serta otomatis disertakan saat mengekspor cadangan sistem (<code className="font-mono text-emerald-400">backup.json</code>).
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )}

  {/* Dialog Konfirmasi Reset Pengaturan Sistem In-App */}
  {showResetConfirm && (
    <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 text-amber-600 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Reset Pengaturan Sistem?</h4>
            <p className="text-xs text-slate-500">SIMLAB SMP & SMA IT Ar-Rahmah Cendekia</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-5">
          Apakah Anda yakin ingin mengembalikan seluruh pengaturan sistem (identitas lembaga, pengumuman, dan kontak) ke nilai awal standar?
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
