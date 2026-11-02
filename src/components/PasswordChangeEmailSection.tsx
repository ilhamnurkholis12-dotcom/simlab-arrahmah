import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Key,
  Mail,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Sparkles,
  Inbox,
  Send,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const PasswordChangeEmailSection: React.FC = () => {
  const {
    currentUser,
    requestPasswordChangeVerification,
    verifyAndChangePassword,
  } = useInventory();

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification flow
  const [step, setStep] = useState<'INPUT' | 'VERIFY' | 'SUCCESS'>('INPUT');
  const [verificationCode, setVerificationCode] = useState('');
  const [activeOtp, setActiveOtp] = useState<string | null>(null);
  const [showEmailInboxModal, setShowEmailInboxModal] = useState(false);
  const [countdown, setCountdown] = useState<number>(600); // 10 minutes
  const [copiedCode, setCopiedCode] = useState(false);

  // Status alerts
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (step === 'VERIFY' && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, countdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Step 1: Request Verification Code
  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertError(null);
    setAlertSuccess(null);

    if (!currentUser?.email) {
      setAlertError('Sesi akun tidak valid atau email tidak terdeteksi.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setAlertError('Kata sandi baru minimal harus terdiri dari 6 karakter!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlertError('Konfirmasi kata sandi baru tidak sesuai!');
      return;
    }

    setIsSubmitting(true);

    const res = requestPasswordChangeVerification(currentUser.email);
    setIsSubmitting(false);

    if (res.success && res.verificationCode) {
      setActiveOtp(res.verificationCode);
      setStep('VERIFY');
      setCountdown(600);
      setAlertSuccess(
        `Kode verifikasi 6 digit telah dikirimkan ke email terdaftar Anda: ${currentUser.email}. Silakan buka email atau cek kotak masuk simulasi di bawah.`
      );
      // Automatically show simulated email preview so the user can easily see their code
      setShowEmailInboxModal(true);
    } else {
      setAlertError(res.message);
    }
  };

  // Step 2: Verify Code and Update Password
  const handleVerifyAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertError(null);
    setAlertSuccess(null);

    if (!currentUser?.email) return;

    if (!verificationCode.trim()) {
      setAlertError('Harap masukkan 6 digit kode verifikasi!');
      return;
    }

    if (countdown <= 0) {
      setAlertError('Waktu verifikasi telah habis (kadaluarsa). Silakan kirim ulang kode baru.');
      return;
    }

    setIsSubmitting(true);
    const result = verifyAndChangePassword(
      currentUser.email,
      verificationCode.trim(),
      newPassword.trim()
    );
    setIsSubmitting(false);

    if (result.success) {
      setStep('SUCCESS');
      setAlertSuccess(result.message);
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setActiveOtp(null);
    } else {
      setAlertError(result.message);
    }
  };

  // Resend OTP
  const handleResendCode = () => {
    if (!currentUser?.email) return;
    const res = requestPasswordChangeVerification(currentUser.email);
    if (res.success && res.verificationCode) {
      setActiveOtp(res.verificationCode);
      setCountdown(600);
      setVerificationCode('');
      setAlertSuccess(`Kode verifikasi baru telah dikirimkan ke ${currentUser.email}!`);
      setShowEmailInboxModal(true);
    } else {
      setAlertError(res.message);
    }
  };

  const copyOtpToClipboard = () => {
    if (activeOtp) {
      navigator.clipboard.writeText(activeOtp);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const autoFillOtp = () => {
    if (activeOtp) {
      setVerificationCode(activeOtp);
      setShowEmailInboxModal(false);
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
              <Mail className="w-3.5 h-3.5 text-sky-700" />
              Sistem Keamanan Akun
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Verifikasi Email Otomatis
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Ganti Kata Sandi Akun (Verifikasi Email Terdaftar)
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Fitur keamanan mandiri bagi setiap pengguna/laboran untuk memperbarui kata sandi akun masing-masing. Sistem akan mengirimkan kode verifikasi 6 digit ke alamat email akun terdaftar Anda. Seluruh riwayat perubahan tetap dipantau langsung oleh akun Kepala Lab pada panel Manajemen Akun.
          </p>
        </div>
      </div>

      {/* Account Info Profile Badge */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
            {currentUser?.avatarInitials || 'AR'}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">
              {currentUser?.name || 'Pengguna SIMLAB'}
            </div>
            <div className="text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-slate-700 font-semibold">{currentUser?.email}</span>
              <span className="text-slate-300">·</span>
              <span className="text-emerald-800 font-semibold">{currentUser?.roleTitle || currentUser?.role}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:items-end text-[11px] text-slate-500 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Status Sandi:</span>
            {currentUser?.lastPasswordChangedAt ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Terverifikasi Email
              </span>
            ) : (
              <span className="font-medium text-slate-600">Sandi Standar Sistem</span>
            )}
          </div>
          {currentUser?.lastPasswordChangedAt && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              Diubah: {new Date(currentUser.lastPasswordChangedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })} WIB
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alertSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-emerald-950 text-xs shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{alertSuccess}</div>
        </div>
      )}

      {alertError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-950 text-xs shadow-xs animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{alertError}</div>
        </div>
      )}

      {/* Flow Step 1: Input New Password */}
      {step === 'INPUT' && (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kata Sandi Baru */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Kata Sandi Baru <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Kata Sandi Baru */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Ulangi Kata Sandi Baru <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs sm:text-sm text-slate-900 outline-none transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Kode OTP 6 digit akan dikirimkan otomatis ke <strong>{currentUser?.email}</strong></span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim Kode Verifikasi ke Email'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Flow Step 2: Verify OTP Code */}
      {step === 'VERIFY' && (
        <form onSubmit={handleVerifyAndSubmit} className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Kode verifikasi telah terkirim ke <strong>{currentUser?.email}</strong>. Berlaku selama{' '}
                <span className="font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  {formatCountdown(countdown)}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowEmailInboxModal(true)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Inbox className="w-3.5 h-3.5 text-emerald-700" />
              <span>Buka Kotak Masuk Email Simulasi</span>
            </button>
          </div>

          <div className="max-w-md mx-auto space-y-3 py-2 text-center">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Masukkan 6 Digit Kode Verifikasi Email
            </label>
            <input
              type="text"
              maxLength={6}
              required
              autoFocus
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              className="w-48 mx-auto px-4 py-2.5 bg-slate-50 border-2 border-emerald-600 focus:bg-white rounded-xl text-center font-mono text-2xl font-bold tracking-[0.4em] text-slate-900 outline-none transition-all shadow-xs"
            />
            <p className="text-[11px] text-slate-500">
              Periksa kotak masuk email Anda atau gunakan panel simulasi di atas untuk menyalin kode.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('INPUT');
                  setVerificationCode('');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1 px-2 rounded hover:bg-slate-100 transition-colors"
              >
                ← Ubah Kata Sandi Baru
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold py-1 px-2 rounded hover:bg-emerald-50 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Kirim Ulang Kode</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || verificationCode.length < 6}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Memverifikasi...' : 'Verifikasi & Simpan Kata Sandi'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Flow Step 3: Success Screen */}
      {step === 'SUCCESS' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-emerald-950">
            Kata Sandi Baru Berhasil Diperbarui & Terverifikasi!
          </h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
            Kata sandi untuk akun <strong>{currentUser?.name}</strong> ({currentUser?.email}) telah aktif. Perubahan ini telah dicatat pada sistem audit keamanan dan dapat dipantau oleh Kepala Lab.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('INPUT');
                setAlertSuccess(null);
              }}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Selesai / Ganti Lagi Nanti
            </button>
          </div>
        </div>
      )}

      {/* SIMULATED EMAIL INBOX POPUP MODAL */}
      {showEmailInboxModal && activeOtp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Webmail Client Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 text-emerald-300 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Kotak Masuk Email Akun (Simulasi)</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Penerima: {currentUser?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailInboxModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Email Body */}
            <div className="p-5 sm:p-6 space-y-4 bg-slate-50 text-slate-900 text-xs">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      [SIMLAB ARC] Kode Verifikasi Ganti Kata Sandi Akun
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Dari: <span className="font-mono text-slate-700">no-reply@ar-rahmah-cendekia.sch.id</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    Baru saja
                  </span>
                </div>

                <div className="space-y-2 text-slate-700 leading-relaxed text-xs">
                  <p>
                    Yth. <strong>{currentUser?.name}</strong>,
                  </p>
                  <p>
                    Kami menerima permintaan perubahan kata sandi untuk akun Anda di{' '}
                    <strong>SIMLAB SMP dan SMA IT Ar-Rahmah Cendekia Kota Tangerang</strong>.
                  </p>
                  <p>
                    Gunakan kode verifikasi 6 digit berikut ini untuk mengonfirmasi penggantian kata sandi Anda:
                  </p>
                </div>

                {/* Big OTP Display */}
                <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-xl p-4 text-center space-y-2 my-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">
                    KODE VERIFIKASI KEAMANAN ANDA:
                  </span>
                  <div className="font-mono text-3xl font-extrabold text-emerald-950 tracking-[0.3em]">
                    {activeOtp}
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Berlaku selama 10 menit. Jangan berikan kode ini kepada siapa pun.
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={copyOtpToClipboard}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Kode OTP'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={autoFillOtp}
                    className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tempel & Gunakan Kode</span>
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center">
                Sistem Otentikasi Terpadu SIMLAB · SMP dan SMA IT Ar-Rahmah Cendekia Kota Tangerang
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
