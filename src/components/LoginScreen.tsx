import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { INITIAL_ACCOUNTS } from '../data/initialInventory';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  X,
  Building2,
} from 'lucide-react';

import officialLogoSvg from '../assets/images/arcss_logo_official.svg';

// ============================================================================
// KONFIGURASI GAMBAR LATAR BELAKANG & LOGO LOGIN (SPLIT BACKGROUND CONFIG)
// Anda dapat mengganti link URL foto Gedung Sekolah dan Lab IPA di bawah ini:
// ============================================================================
export const DEFAULT_BUILDING_IMAGE = 'https://lh3.googleusercontent.com/d/1u4eCdMdtcNPNj87jFO5XDqSjxFaxY4Fo';
export const DEFAULT_LAB_IMAGE = 'https://lh3.googleusercontent.com/d/17JSXiw02JISFZNr-cTNRuYPTWmSuIsTw';
export const DEFAULT_LOGO_IMAGE = officialLogoSvg || '/src/assets/images/arcss_logo_official.svg';

// Fallback lokal jika jaringan memblokir Google Direct URL
export const FALLBACK_BUILDING_IMAGE = '/assets/aistudio/Gedung_Sekolah_Ar_Rahmah_6e9459bb.jpeg';
export const FALLBACK_LAB_IMAGE = '/assets/aistudio/WhatsApp_Image_2025-05-22_at_17.13.57_642e654d.jpeg';

export interface LoginScreenProps {
  onLoginSuccess?: () => void;
  buildingImageUrl?: string;
  labImageUrl?: string;
  logoImageUrl?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  buildingImageUrl = DEFAULT_BUILDING_IMAGE,
  labImageUrl = DEFAULT_LAB_IMAGE,
  logoImageUrl = DEFAULT_LOGO_IMAGE,
}) => {
  const { login, loginAsync, settings, accounts, gasSyncStatus } = useInventory();
  const activeAccounts = accounts && accounts.length > 0 ? accounts : INITIAL_ACCOUNTS;

  // Background image state with graceful fallback
  const [buildingSrc, setBuildingSrc] = useState(buildingImageUrl);
  const [labSrc, setLabSrc] = useState(labImageUrl);

  // Form input states — HARUS KOSONG (EMPTY) secara default demi keamanan & kebersihan
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resolvedLogoUrl = settings?.logo_url || logoImageUrl;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Silakan masukkan Alamat Email, NIP, atau ID Akun Anda.');
      return;
    }

    if (!password) {
      setErrorMsg('Silakan masukkan Kata Sandi Anda.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanInput = identifier.toLowerCase().trim();
      const matched = activeAccounts.find(
        (a) =>
          a.email.toLowerCase().trim() === cleanInput ||
          (a.schoolIdNumber && a.schoolIdNumber.toLowerCase().trim() === cleanInput) ||
          (a.nip && a.nip.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))
      );

      const targetEmail = matched ? matched.email : identifier;

      // 1. Cek autentikasi lokal
      let ok = login(targetEmail, password);

      // 2. Jika tidak ditemukan lokal, verifikasi langsung ke Google Sheets (Pengguna) secara real-time
      if (!ok && loginAsync) {
        const remoteAuth = await loginAsync(targetEmail, password);
        ok = remoteAuth.success;
        if (!ok && remoteAuth.message) {
          setErrorMsg(remoteAuth.message);
        }
      }

      setIsLoading(false);

      if (ok) {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setErrorMsg((prev) => prev || 'Email / NIP atau kata sandi tidak cocok.');
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Terjadi kendala saat memeriksa kredensial ke database.');
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between selection:bg-emerald-500 selection:text-white bg-slate-950 font-sans">
      {/* =========================================================================
          1. SPLIT GRADIENT BACKGROUND (GEDUNG SEKOLAH KIRI | INTERIOR LAB KANAN)
          ========================================================================= */}
      {/* =========================================================================
          1. SPLIT GRADIENT BACKGROUND (GEDUNG SEKOLAH KIRI | INTERIOR LAB KANAN)
          Seamless Cross-Fade Blend via CSS Mask Gradient (~30% overlap blend zone)
          ========================================================================= */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {/* Sisi Kiri: Foto Gedung Sekolah (Split Layout 50% Kiri, Skala & Framing Asli object-cover center) */}
        <div className="absolute inset-y-0 left-0 w-1/2 h-full overflow-hidden">
          <img
            src={buildingSrc}
            alt="Gedung Sekolah Ar-Rahmah Cendekia"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-[1.03] contrast-[1.02] saturate-[1.05] transition-all duration-700"
            onError={() => {
              if (buildingSrc !== FALLBACK_BUILDING_IMAGE) {
                setBuildingSrc(FALLBACK_BUILDING_IMAGE);
              }
            }}
          />
        </div>

        {/* Sisi Kanan: Foto Interior Laboratorium IPA (Split Layout 50% Kanan, Skala & Framing Asli object-cover center) */}
        <div className="absolute inset-y-0 right-0 w-1/2 h-full overflow-hidden">
          <img
            src={labSrc}
            alt="Laboratorium IPA Terpadu Ar-Rahmah Cendekia"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-[1.03] contrast-[1.02] saturate-[1.05] transition-all duration-700"
            onError={() => {
              if (labSrc !== FALLBACK_LAB_IMAGE) {
                setLabSrc(FALLBACK_LAB_IMAGE);
              }
            }}
          />
        </div>

        {/* Lapisan Linear Gradient Horizontal Lembut di atas Sambungan Pertengahan (50% Lebar Layar) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent 35%, rgba(15, 23, 42, 0.75) 50%, transparent 65%)',
          }}
        />

        {/* Soft Center Boundary Feathering (Menghilangkan garis batas tegas sambungan) */}
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-48 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(15, 23, 42, 0.6) 50%, transparent)',
          }}
        />

        {/* Gradasi Transparan & Elegan Dark Overlay (terang, hidup, & kontras sempurna) */}
        <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.45)_0%,rgba(2,6,23,0.15)_50%,rgba(2,6,23,0.40)_100%)] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-transparent to-slate-950/45 pointer-events-none" />

        {/* Futuristic Tech Grid Overlay Lines */}
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(16, 185, 129, 0.25) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(14, 165, 233, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glowing Radial Accent Orbs (Emerald & Cyan) */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-teal-500/10 rounded-full blur-[130px] pointer-events-none" />

        {/* Subtle Ambient Circuit Line Graphic in Center */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="0" y1="20%" x2="100%" y2="20%" stroke="#10b981" strokeWidth="0.5" strokeDasharray="6 12" />
          <line x1="0" y1="80%" x2="100%" y2="80%" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="6 12" />
          <circle cx="20%" cy="20%" r="3" fill="#10b981" />
          <circle cx="80%" cy="80%" r="3" fill="#06b6d4" />
        </svg>
      </div>

      {/* =========================================================================
          TOP BAR CONTROL (STATUS INDIKATOR RESMI & KEAMANAN SISTEM)
          ========================================================================= */}
      <header className="relative z-20 w-full px-4 sm:px-8 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 border border-emerald-500/30 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-300 tracking-wide">
              SISTEM AKTIF • TAHUN 2026
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/60 border border-slate-700/60 px-3 py-1.5 rounded-full backdrop-blur-md">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            <span>SMP &amp; SMA IT Ar-Rahmah Cendekia</span>
          </div>
        </div>

        {/* Status Sistem Terenkripsi (Tombol bypass dan info akses dihapus total) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/70 border border-emerald-500/30 text-emerald-300 text-xs backdrop-blur-md shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-medium">Portal Terproteksi</span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. FORM LOGIN (MODERN GLASSMORPHISM CARD - CENTER SCREEN)
          ========================================================================= */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[440px] relative">
          {/* Soft ambient glow halo around card */}
          <div className="absolute -inset-1.5 rounded-[32px] bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-cyan-500/25 blur-xl opacity-80 -z-10 pointer-events-none" />

          {/* Glassmorphism Card */}
          <div className="relative rounded-3xl bg-slate-950/85 backdrop-blur-3xl border border-white/20 p-7 sm:p-9 shadow-[0_25px_70px_-10px_rgba(0,0,0,0.95)] ring-1 ring-emerald-400/30">
            {/* Top Glowing Edge Highlight */}
            <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

            {/* Logo Resmi SIMLAB & Header Identitas */}
            <div className="text-center mb-7">
              <div className="relative inline-flex items-center justify-center mb-3.5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600/30 via-slate-800/80 to-teal-500/30 border border-emerald-400/40 p-2.5 shadow-xl shadow-emerald-950/80 flex items-center justify-center backdrop-blur-sm group">
                  <img
                    src={resolvedLogoUrl}
                    alt="Logo Resmi SIMLAB Ar-Rahmah Cendekia"
                    className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      if (officialLogoSvg && e.currentTarget.src !== officialLogoSvg) {
                        e.currentTarget.src = officialLogoSvg;
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                </div>
                {/* Micro badge icon */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-sans uppercase">
                SIMLAB AR-RAHMAH CENDEKIA
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-emerald-200/80 font-medium leading-relaxed max-w-xs mx-auto">
                Laboratorium IPA Terpadu SMP &amp; SMA IT Ar-Rahmah Cendekia
              </p>
            </div>

            {/* Alert Error Box */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 backdrop-blur-md animate-shake">
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5 cursor-pointer" onClick={() => setErrorMsg('')} />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* FORM LOGIN INPUT */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Kolom 1: Alamat Email / NIP / ID Petugas */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alamat Email / NIP Petugas
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="nama@guru.sma.belajar.id / NIP"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Kolom 2: Kata Sandi (Password) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Kata Sandi (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setErrorMsg('Silakan hubungi Kepala Lab / Administrator sekolah untuk permohonan reset kata sandi.')
                    }
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                  >
                    Lupa Sandi?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Masukkan kata sandi..."
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                    title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-600 focus:ring-emerald-500/40 focus:ring-offset-0"
                  />
                  <span>Ingat saya di perangkat ini</span>
                </label>

                <span className="text-[11px] text-slate-400">Ver. 2026.1</span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-lg shadow-emerald-950/70 border border-emerald-400/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk Sistem SIMLAB</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Security Indicator Footer within card */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sesi Terenkripsi &amp; Otorisasi Multi-Level (RBAC)</span>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          FOOTER INFORMASI & KREDIT
          ========================================================================= */}
      <footer className="relative z-20 w-full px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-800/40 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <span>&copy; 2026 Laboratorium IPA Terpadu Ar-Rahmah Cendekia</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:inline text-slate-400">Kota Tangerang</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-emerald-400 font-medium">Fisika • Kimia • Biologi • IPA SMP</span>
        </div>
      </footer>
    </div>
  );
};

