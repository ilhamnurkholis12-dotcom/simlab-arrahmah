import React, { useState, useMemo } from 'react';
import { useInventory, AUTHORIZED_HEAD_OF_LAB_EMAIL } from '../context/InventoryContext';
import { UserAccount, UserRole, LabId, LAB_DEFINITIONS } from '../types/inventory';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Key,
  Trash2,
  Edit3,
  Search,
  Lock,
  Mail,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  User,
  Building2,
  BadgeAlert,
  Sparkles,
  Clock,
  Smartphone,
  Laptop,
} from 'lucide-react';

const HEAD_OF_LAB_EMAIL = AUTHORIZED_HEAD_OF_LAB_EMAIL || 'Ilham.nurkholis114@guru.sma.belajar.id';

export const UserManagementSection: React.FC = () => {
  const {
    currentUser,
    accounts,
    addUserAccount,
    updateUserAccount,
    deleteUserAccount,
    resetUserPassword,
    passwordChangeLogs,
    clearPasswordChangeLogs,
  } = useInventory();

  // Permission check: strictly Kepala Lab IPA Terpadu (Ilham Nurkholis Majid)
  const isAuthorized =
    (currentUser?.email || '').toLowerCase().trim() ===
    HEAD_OF_LAB_EMAIL.toLowerCase();

  // Active view: 'users' (Daftar Akun) or 'security_logs' (Log Verifikasi Sandi)
  const [activeView, setActiveView] = useState<'users' | 'security_logs'>('users');

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [resettingUser, setResettingUser] = useState<UserAccount | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);

  // Success alert message
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  const showAlert = (msg: string, isErr = false) => {
    if (isErr) {
      setAlertError(msg);
      setTimeout(() => setAlertError(null), 4000);
    } else {
      setAlertSuccess(msg);
      setTimeout(() => setAlertSuccess(null), 4000);
    }
  };

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        acc.name.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        (acc.nip || '').toLowerCase().includes(q) ||
        acc.roleTitle.toLowerCase().includes(q);

      const matchRole =
        filterRole === 'ALL' ||
        acc.role === filterRole ||
        (filterRole === 'LABORAN' && acc.role.startsWith('LABORAN'));

      return matchQuery && matchRole;
    });
  }, [accounts, searchQuery, filterRole]);

  // Statistics
  const totalUsers = accounts.length;
  const activeCount = accounts.filter((a) => a.status !== 'nonaktif').length;

  // Access Denied Screen if logged in as another user
  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 sm:p-10 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800">
            Akses Terbatas · Khusus Kepala Lab
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Fitur Manajemen Akun & Kata Sandi Terkunci
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Sesuai regulasi keamanan SIMLAB AR-RAHMAH CENDEKIA, pengelolaan akun laboran (penambahan akun baru, setting profil, reset kata sandi, dan penghapusan akun) <b>hanya dapat diakses secara eksklusif oleh Kepala Laboratorium IPA Terpadu</b> melalui email:
          </p>
          <div className="inline-block p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <code className="text-xs font-bold text-emerald-900 font-mono">
              {HEAD_OF_LAB_EMAIL}
            </code>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2 text-slate-600">
          <div className="flex justify-between">
            <span className="text-slate-400">Akun Anda Saat Ini:</span>
            <span className="font-semibold text-slate-800">{currentUser?.name || 'Staf'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Email:</span>
            <span className="font-mono text-slate-700">{currentUser?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Status Otoritas:</span>
            <span className="text-red-600 font-bold flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Tidak Berwenang Mengelola User
            </span>
          </div>
        </div>

        <div className="pt-2 text-center">
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Untuk mengelola data akun pengguna dan hak akses, silakan gunakan menu <strong>Keluar Sistem</strong> dan masuk kembali menggunakan kredensial akun Kepala Laboratorium / Administrator resmi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {alertSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-900 shadow-xs animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs sm:text-sm font-semibold">{alertSuccess}</div>
        </div>
      )}

      {alertError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-900 shadow-xs animate-in fade-in duration-300">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="text-xs sm:text-sm font-semibold">{alertError}</div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Otoritas Penuh Kepala Lab
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
              Admin: {HEAD_OF_LAB_EMAIL}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Manajemen Akun Pengguna & Laboran</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola akun petugas, reset kata sandi, tambahkan akun baru, atau nonaktifkan/hapus akun yang sudah tidak bertugas di laboratorium IPA.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-[44px] px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun User Baru</span>
        </button>
      </div>

      {/* Quick Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">Total Akun Terdaftar</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            {totalUsers} <span className="text-xs font-normal text-slate-400">Pengguna</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Akun Status Aktif</span>
          </span>
          <div className="text-xl font-bold font-mono text-emerald-950 mt-0.5">
            {activeCount} <span className="text-xs font-normal text-emerald-700">Akun</span>
          </div>
        </div>

        <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200 shadow-xs">
          <span className="text-[11px] text-sky-800 font-medium">Laboran Fisika, Kimia, Bio</span>
          <div className="text-xl font-bold font-mono text-sky-950 mt-0.5">
            {accounts.filter((a) => a.role !== 'KEPALA_LAB').length}{' '}
            <span className="text-xs font-normal text-sky-700">Petugas</span>
          </div>
        </div>

        <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 shadow-xs">
          <span className="text-[11px] text-purple-800 font-medium flex items-center gap-1">
            <Lock className="w-3 h-3 text-purple-600" />
            <span>Kata Sandi Default</span>
          </span>
          <div className="text-xs font-mono font-bold text-purple-950 mt-1.5 truncate">
            labarcss2026
          </div>
        </div>
      </div>

      {/* View Switcher: Daftar Akun vs Log Verifikasi Sandi */}
      <div className="flex border-b border-slate-200 gap-2 bg-white px-4 pt-3 rounded-t-2xl">
        <button
          type="button"
          onClick={() => setActiveView('users')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeView === 'users'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/70 rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-700" />
          <span>Daftar Akun Pengguna</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-100 text-emerald-800 font-bold">
            {accounts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('security_logs')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeView === 'security_logs'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/70 rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4 text-sky-700" />
          <span>Pemantauan Log Verifikasi Email Sandi</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              passwordChangeLogs.some((l) => l.status === 'PENDING')
                ? 'bg-amber-100 text-amber-900 animate-pulse'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {passwordChangeLogs.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: DAFTAR AKUN USER */}
      {activeView === 'users' && (
        <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama laboran, email, NIP, atau jabatan..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Filter Role:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
          >
            <option value="ALL">Semua Peran / Role</option>
            <option value="KEPALA_LAB">Kepala Laboratorium</option>
            <option value="LABORAN_FISIKA">PJ Lab Fisika</option>
            <option value="LABORAN_KIMIA">PJ Lab Kimia</option>
            <option value="LABORAN_BIOLOGI">PJ Lab Biologi</option>
            <option value="GURU_IPA_SMP">PJ Lab IPA SMP</option>
            <option value="LABORAN">Laboran Umum</option>
          </select>
        </div>
      </div>

      {/* Accounts List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Lengkap & NIP</th>
                <th className="py-3 px-4">Email Resmi Akun</th>
                <th className="py-3 px-4">Peran & Lab Yang Diampu</th>
                <th className="py-3 px-4">Kata Sandi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada akun yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const isRootHead =
                    acc.email.toLowerCase().trim() === HEAD_OF_LAB_EMAIL.toLowerCase();

                  // Assigned Lab badge styling
                  const labInfo =
                    acc.assignedLab !== 'ALL' ? LAB_DEFINITIONS[acc.assignedLab] : null;

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & NIP */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {acc.avatarUrl ? (
                            <img
                              src={acc.avatarUrl}
                              alt={acc.name}
                              className="w-9 h-9 rounded-xl object-cover border border-teal-500/40 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                                isRootHead
                                  ? 'bg-emerald-800 text-white'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {acc.avatarInitials}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{acc.name}</span>
                              {isRootHead && (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9.5px] px-1.5 py-0.2 rounded-full font-bold">
                                  Kepala Lab Utama
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>NIP: {acc.nip || '-'}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{acc.schoolIdNumber}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-[11.5px] text-slate-700">
                        {acc.email}
                      </td>

                      {/* Role & Assigned Lab */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800">{acc.roleTitle}</div>
                          <div>
                            {acc.assignedLab === 'ALL' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Seluruh Lab (Fisika, Kimia, Bio, SMP)
                              </span>
                            ) : (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  labInfo ? labInfo.badgeBg : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {labInfo ? labInfo.shortName : acc.assignedLab}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Password Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                            {acc.password ? acc.password : 'labarcss2026'}
                          </code>
                          {acc.lastPasswordChangedAt ? (
                            <div className="flex items-center gap-1 text-[9.5px] text-emerald-700 font-semibold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>
                                Verifikasi Email (
                                {new Date(acc.lastPasswordChangedAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                                )
                              </span>
                            </div>
                          ) : (
                            <div className="text-[9.5px] text-slate-400">
                              Sandi Default
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            acc.status === 'nonaktif'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              acc.status === 'nonaktif' ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>{acc.status === 'nonaktif' ? 'Nonaktif' : 'Aktif'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          <button
                            onClick={() => setResettingUser(acc)}
                            className="p-1.5 text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                            title="Reset Kata Sandi Akun"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Edit User Settings */}
                          <button
                            onClick={() => setEditingUser(acc)}
                            className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                            title="Setting / Ubah Profil Akun"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => {
                              if (isRootHead) {
                                showAlert('Akun Kepala Lab utama dilindungi dan tidak dapat dihapus!', true);
                                return;
                              }
                              setDeletingUser(acc);
                            }}
                            disabled={isRootHead}
                            className={`p-1.5 rounded-lg transition-colors border ${
                              isRootHead
                                ? 'text-slate-300 border-transparent cursor-not-allowed'
                                : 'text-slate-600 hover:text-red-700 hover:bg-red-50 border-transparent hover:border-red-200'
                            }`}
                            title={isRootHead ? 'Akun Kepala Lab Utama Tidak Dapat Dihapus' : 'Hapus Akun User'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* VIEW 2: LOG PEMANTAUAN VERIFIKASI EMAIL SANDI */}
      {activeView === 'security_logs' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Audit & Log Verifikasi Ganti Kata Sandi Email</span>
              </h3>
              <p className="text-xs text-slate-500">
                Memantau secara langsung seluruh aktivitas pergantian kata sandi yang diajukan oleh pengguna melalui sistem verifikasi kode email.
              </p>
            </div>

            {passwordChangeLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearLogsConfirm(true)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-colors shrink-0"
              >
                Bersihkan Riwayat Log
              </button>
            )}
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Waktu Permintaan</th>
                    <th className="py-3 px-4">Pengguna / Email</th>
                    <th className="py-3 px-4">Kode OTP Diberikan</th>
                    <th className="py-3 px-4">Status Verifikasi</th>
                    <th className="py-3 px-4">Waktu Selesai</th>
                    <th className="py-3 px-4">Perangkat / Asal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {passwordChangeLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">Belum Ada Aktivitas Verifikasi Ganti Sandi</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Saat pengguna mengganti kata sandi di laman &quot;Identitas Web & Pengumuman&quot;, riwayatnya akan otomatis tercatat dan dapat dipantau di sini.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    passwordChangeLogs.map((log) => {
                      const isVerified = log.status === 'VERIFIED';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {new Date(log.requestedAt).toLocaleString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                WIB
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{log.userName}</div>
                            <div className="font-mono text-slate-500 text-[11px]">{log.userEmail}</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs tracking-widest">
                              {log.verificationCode}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                <span>Terverifikasi (Sandi Berubah)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Menunggu Kode OTP</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                            {log.completedAt ? (
                              new Date(log.completedAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              }) + ' WIB'
                            ) : (
                              <span className="text-slate-400 italic">Belum selesai</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-600 text-[11px]">
                            {log.device || 'Browser Web'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 1: TAMBAH AKUN BARU USER */}
      {/* --------------------------------------------------------------------- */}
      {isAddModalOpen && (
        <AddUserModal
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={(data) => {
            const res = addUserAccount(data);
            if (res.success) {
              showAlert(res.message);
              setIsAddModalOpen(false);
            } else {
              showAlert(res.message, true);
            }
          }}
        />
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 2: SETTING / EDIT AKUN USER */}
      {/* --------------------------------------------------------------------- */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={(updates) => {
            const res = updateUserAccount(editingUser.id, updates);
            if (res.success) {
              showAlert(res.message);
              setEditingUser(null);
            } else {
              showAlert(res.message, true);
            }
          }}
        />
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 3: RESET KATA SANDI USER */}
      {/* --------------------------------------------------------------------- */}
      {resettingUser && (
        <ResetPasswordModal
          user={resettingUser}
          onClose={() => setResettingUser(null)}
          onSubmit={(newPass) => {
            const res = resetUserPassword(resettingUser.id, newPass);
            if (res.success) {
              showAlert(res.message);
              setResettingUser(null);
            } else {
              showAlert(res.message, true);
            }
          }}
        />
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 4: KONFIRMASI HAPUS AKUN USER */}
      {/* --------------------------------------------------------------------- */}
      {deletingUser && (
        <DeleteConfirmModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => {
            const res = deleteUserAccount(deletingUser.id);
            if (res.success) {
              showAlert(res.message);
              setDeletingUser(null);
            } else {
              showAlert(res.message, true);
            }
          }}
        />
      )}

      {/* MODAL 5: KONFIRMASI BERSIHKAN LOG GANTI SANDI */}
      {showClearLogsConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Bersihkan Riwayat Log Verifikasi?</h4>
                <p className="text-xs text-slate-500">Log pergantian kata sandi pengguna</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin membersihkan seluruh rekaman riwayat log verifikasi pergantian kata sandi? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearLogsConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  clearPasswordChangeLogs();
                  setShowClearLogsConfirm(false);
                  showAlert('Riwayat log verifikasi berhasil dibersihkan.');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Bersihkan Log</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-MODAL 1: FORM TAMBAH AKUN USER BARU
// ============================================================================
interface AddUserModalProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    role: UserRole;
    roleTitle?: string;
    assignedLab: LabId | 'ALL';
    schoolIdNumber?: string;
    nip?: string;
    password?: string;
    status?: 'aktif' | 'nonaktif';
  }) => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nip, setNip] = useState('');
  const [schoolIdNumber, setSchoolIdNumber] = useState('');
  const [role, setRole] = useState<UserRole>('LABORAN');
  const [assignedLab, setAssignedLab] = useState<LabId | 'ALL'>('FISIKA');
  const [password, setPassword] = useState('labarcss2026');
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim() || !email.trim()) {
      setErrorMsg('Nama lengkap dan email resmi wajib diisi!');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    onSubmit({
      name: name.trim(),
      email: email.trim(),
      nip: nip.trim() || '-',
      schoolIdNumber: schoolIdNumber.trim(),
      role,
      assignedLab,
      password: password.trim() || 'labarcss2026',
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Tambah Akun Pengguna / Laboran Baru</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {/* Nama Lengkap */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">
              Nama Lengkap beserta Gelar Resmi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: Dr. Rahmat Hidayat, M. Pd."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            />
          </div>

          {/* Email Resmi */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">
              Alamat Email Resmi <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh: rahmat.hidayat@guru.sma.belajar.id"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            />
          </div>

          {/* NIP & ID Sekolah */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">NIP / NUPTK</label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="2026.14.02.15 atau '-'"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">ID Petugas Sekolah</label>
              <input
                type="text"
                value={schoolIdNumber}
                onChange={(e) => setSchoolIdNumber(e.target.value)}
                placeholder="ARC-2026-LAB05"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* Role & Penugasan Lab */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Peran / Jabatan</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              >
                <option value="LABORAN">Laboran Pelaksana</option>
                <option value="LABORAN_FISIKA">Penanggung Jawab Fisika</option>
                <option value="LABORAN_KIMIA">Penanggung Jawab Kimia</option>
                <option value="LABORAN_BIOLOGI">Penanggung Jawab Biologi</option>
                <option value="GURU_IPA_SMP">Guru & Laboran IPA SMP</option>
                <option value="KEPALA_LAB">Kepala Laboratorium</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Lab Yang Diampu</label>
              <select
                value={assignedLab}
                onChange={(e) => setAssignedLab(e.target.value as LabId | 'ALL')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              >
                <option value="FISIKA">Laboratorium Fisika (SMA)</option>
                <option value="KIMIA">Laboratorium Kimia (SMA)</option>
                <option value="BIOLOGI">Laboratorium Biologi (SMA)</option>
                <option value="SMP_TERPADU">Laboratorium IPA Terpadu (SMP)</option>
                <option value="ALL">Semua Laboratorium (ALL)</option>
              </select>
            </div>
          </div>

          {/* Kata Sandi Awal */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 block">Kata Sandi Awal Akun</label>
              <span className="text-[10.5px] text-emerald-800 font-medium">Default: labarcss2026</span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="labarcss2026"
                className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1 pt-1">
            <label className="font-semibold text-slate-700 block">Status Akun</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={status === 'aktif'}
                  onChange={() => setStatus('aktif')}
                  className="text-emerald-700 focus:ring-emerald-700"
                />
                <span className="font-medium text-slate-800">Aktif (Dapat Login)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={status === 'nonaktif'}
                  onChange={() => setStatus('nonaktif')}
                  className="text-emerald-700 focus:ring-emerald-700"
                />
                <span className="font-medium text-slate-600">Nonaktif</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-emerald-700/60 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Mendaftarkan Akun...' : 'Daftarkan Akun'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-MODAL 2: FORM SETTING / EDIT AKUN USER
// ============================================================================
interface EditUserModalProps {
  user: UserAccount;
  onClose: () => void;
  onSubmit: (updates: Partial<UserAccount>) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSubmit }) => {
  const isRootHead = user.email.toLowerCase().trim() === HEAD_OF_LAB_EMAIL.toLowerCase();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatarUrl);
  const [nip, setNip] = useState(user.nip || '');
  const [schoolIdNumber, setSchoolIdNumber] = useState(user.schoolIdNumber || '');
  const [role, setRole] = useState<UserRole>(user.role);
  const [roleTitle, setRoleTitle] = useState(user.roleTitle);
  const [assignedLab, setAssignedLab] = useState<LabId | 'ALL'>(user.assignedLab);
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>(user.status || 'aktif');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim() || !email.trim()) {
      setErrorMsg('Nama lengkap dan email tidak boleh kosong!');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    onSubmit({
      name: name.trim(),
      email: email.trim(),
      avatarUrl,
      nip: nip.trim(),
      schoolIdNumber: schoolIdNumber.trim(),
      role,
      roleTitle: roleTitle.trim(),
      assignedLab,
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Setting Profil Akun</h3>
              <p className="text-[11px] text-slate-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {/* Foto Profil Pengguna */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.name}
                className="w-14 h-14 rounded-xl object-cover border border-teal-500 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-900 text-teal-300 font-bold flex items-center justify-center text-sm shrink-0">
                {user.avatarInitials}
              </div>
            )}
            <div className="space-y-1.5 flex-1">
              <span className="font-bold text-slate-800 block">Foto Profil Akun (JPG / PNG)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 3 * 1024 * 1024) {
                      setErrorMsg('Ukuran foto maksimal 3MB');
                      return;
                    }
                    setErrorMsg(null);
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      if (evt.target?.result) setAvatarUrl(evt.target.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200 shadow-2xs"
                >
                  Pilih Foto Baru
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(undefined)}
                    className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold"
                  >
                    Hapus Foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nama Lengkap */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">
              Nama Lengkap & Gelar Resmi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block">
              Alamat Email Resmi <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              disabled={isRootHead}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
            />
            {isRootHead && (
              <p className="text-[10px] text-slate-400">
                * Email akun Kepala Lab utama dilindungi dan tidak dapat diubah sembarangan.
              </p>
            )}
          </div>

          {/* NIP & ID Sekolah */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">NIP / NUPTK</label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">ID Petugas Sekolah</label>
              <input
                type="text"
                value={schoolIdNumber}
                onChange={(e) => setSchoolIdNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* Role & Penugasan Lab */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Peran / Jabatan</label>
              <select
                disabled={isRootHead}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              >
                <option value="KEPALA_LAB">Kepala Laboratorium</option>
                <option value="LABORAN_FISIKA">Penanggung Jawab Fisika</option>
                <option value="LABORAN_KIMIA">Penanggung Jawab Kimia</option>
                <option value="LABORAN_BIOLOGI">Penanggung Jawab Biologi</option>
                <option value="GURU_IPA_SMP">Guru & Laboran IPA SMP</option>
                <option value="LABORAN">Laboran Pelaksana</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Lab Yang Diampu</label>
              <select
                value={assignedLab}
                onChange={(e) => setAssignedLab(e.target.value as LabId | 'ALL')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
              >
                <option value="FISIKA">Laboratorium Fisika (SMA)</option>
                <option value="KIMIA">Laboratorium Kimia (SMA)</option>
                <option value="BIOLOGI">Laboratorium Biologi (SMA)</option>
                <option value="SMP_TERPADU">Laboratorium IPA Terpadu (SMP)</option>
                <option value="ALL">Semua Laboratorium (ALL)</option>
              </select>
            </div>
          </div>

          {/* Deskripsi Jabatan Kustom */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">Titel Jabatan Lengkap</label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {/* Status */}
          <div className="space-y-1 pt-1">
            <label className="font-semibold text-slate-700 block">Status Akun</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="editStatus"
                  checked={status === 'aktif'}
                  onChange={() => setStatus('aktif')}
                  className="text-emerald-700 focus:ring-emerald-700"
                />
                <span className="font-medium text-slate-800">Aktif (Dapat Login)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="editStatus"
                  disabled={isRootHead}
                  checked={status === 'nonaktif'}
                  onChange={() => setStatus('nonaktif')}
                  className="text-emerald-700 focus:ring-emerald-700 disabled:opacity-60"
                />
                <span className="font-medium text-slate-600">Nonaktif</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-emerald-700/60 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-MODAL 3: RESET KATA SANDI USER
// ============================================================================
interface ResetPasswordModalProps {
  user: UserAccount;
  onClose: () => void;
  onSubmit: (newPassword: string) => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ user, onClose, onSubmit }) => {
  const [mode, setMode] = useState<'default' | 'custom'>('default');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPass = mode === 'default' ? 'labarcss2026' : customPassword.trim();
    if (mode === 'custom' && (!finalPass || finalPass.length < 4)) {
      setErrorMsg('Kata sandi kustom minimal 4 karakter!');
      return;
    }
    setErrorMsg(null);
    onSubmit(finalPass);
  };

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Reset Kata Sandi Akun</h3>
              <p className="text-[11px] text-slate-400">{user.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="text-[11px] text-slate-500">Target Akun Pengguna:</div>
            <div className="font-bold text-slate-900">{user.name}</div>
            <div className="font-mono text-emerald-800 text-[11px]">{user.email}</div>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-800 block">Pilihan Kata Sandi Baru:</label>
            <div className="space-y-2">
              <label
                onClick={() => setMode('default')}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  mode === 'default'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="resetMode"
                  checked={mode === 'default'}
                  onChange={() => setMode('default')}
                  className="mt-0.5 text-emerald-700 focus:ring-emerald-700"
                />
                <div className="space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>Gunakan Kata Sandi Standar SIMLAB</span>
                    <span className="text-[9.5px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                      Rekomendasi
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 font-mono font-bold text-emerald-900">
                      labarcss2026
                    </code>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy('labarcss2026');
                      }}
                      className="text-[10px] text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>
              </label>

              <label
                onClick={() => setMode('custom')}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  mode === 'custom'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="resetMode"
                  checked={mode === 'custom'}
                  onChange={() => setMode('custom')}
                  className="mt-0.5 text-emerald-700 focus:ring-emerald-700"
                />
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-xs">Buat Kata Sandi Kustom</div>
                  <p className="text-[11px] text-slate-500">
                    Ketikkan kata sandi khusus pilihan Anda sendiri untuk user ini.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {mode === 'custom' && (
            <div className="space-y-1 animate-in fade-in duration-200 pt-1">
              <label className="font-semibold text-slate-700 block">Ketik Kata Sandi Baru:</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Masukkan minimal 4 karakter..."
                  className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Simpan Kata Sandi Baru</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-MODAL 4: KONFIRMASI HAPUS AKUN USER
// ============================================================================
interface DeleteConfirmModalProps {
  user: UserAccount;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ user, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
            <Trash2 className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Hapus Akun Pengguna?</h3>
            <p className="text-xs text-slate-500">
              Tindakan ini akan menghapus akun user secara permanen dari sistem SIMLAB AR-RAHMAH CENDEKIA.
            </p>
          </div>

          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-left text-xs space-y-1">
            <div className="font-bold text-slate-900">{user.name}</div>
            <div className="font-mono text-red-800 text-[11px]">{user.email}</div>
            <div className="text-[10.5px] text-slate-600">{user.roleTitle}</div>
          </div>

          <p className="text-[11px] text-slate-500">
            * Riwayat mutasi inventaris yang pernah dicatat oleh user ini akan tetap tersimpan di log aktivitas demi integritas data rekapitulasi.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex-1"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex-1"
            >
              Ya, Hapus Akun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
