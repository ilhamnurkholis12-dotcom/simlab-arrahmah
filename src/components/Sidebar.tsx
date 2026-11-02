import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { EditLogoModal } from './EditLogoModal';
import {
  LayoutDashboard,
  FlaskConical,
  Boxes,
  CalendarDays,
  GraduationCap,
  FileSpreadsheet,
  Users,
  LogOut,
  X,
  ShieldCheck,
  AlertTriangle,
  PackageCheck,
  Camera,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpenCheck,
  Gauge,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenLowStockModal: () => void;
  onOpenProfileModal?: () => void;
  onOpenGoogleSheetsSync?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
  onOpenLowStockModal,
  onOpenProfileModal,
  onOpenGoogleSheetsSync,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { currentUser, logout, settings, lowStockItems, loans, isHeadOfLab, isAdmin, dueCalibrations, gasSyncStatus } = useInventory();
  const [isEditLogoOpen, setIsEditLogoOpen] = useState(false);

  const isActualAdmin = Boolean(currentUser?.role === 'KEPALA_LAB' || isHeadOfLab || isAdmin);

  const activeLoansCount = useMemo(
    () => loans.filter((l) => l.status === 'DIPINJAM').length,
    [loans]
  );

  const navigationItems = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        badge: null,
      },
      {
        id: 'sync',
        label: 'Manajemen Laboratorium',
        icon: FlaskConical,
        badge: '4 Lab',
        badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/40',
        dotColor: 'bg-teal-400',
      },
      {
        id: 'inventory',
        label: 'Inventaris & Stok',
        icon: Boxes,
        badge: lowStockItems.length > 0 ? `${lowStockItems.length} Kritis` : null,
        badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
        dotColor: 'bg-amber-400 animate-pulse',
      },
      {
        id: 'loans',
        label: 'Peminjaman & Pengembalian',
        icon: PackageCheck,
        badge: activeLoansCount > 0 ? `${activeLoansCount} Aktif` : null,
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
        dotColor: 'bg-emerald-400',
      },
      {
        id: 'calibration',
        label: 'Kalibrasi Alat',
        icon: Gauge,
        badge: dueCalibrations.length > 0 ? `${dueCalibrations.length} Perlu Uji` : 'Presisi',
        badgeColor:
          dueCalibrations.length > 0
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            : 'bg-teal-500/20 text-teal-300 border border-teal-500/40',
        dotColor: dueCalibrations.length > 0 ? 'bg-rose-400 animate-pulse' : 'bg-teal-400',
      },
      {
        id: 'practicum',
        label: 'Jadwal & Jurnal',
        icon: CalendarDays,
        badge: null,
      },
      {
        id: 'eraport',
        label: 'Rekap E-Raport',
        icon: BookOpenCheck,
        badge: 'Nilai Akhir',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
        dotColor: 'bg-indigo-400',
      },
      {
        id: 'students',
        label: 'Data Siswa & Kelas',
        icon: GraduationCap,
        badge: null,
      },
      {
        id: 'reports',
        label: 'Laporan Resmi',
        icon: FileSpreadsheet,
        badge: null,
      },
      ...(isActualAdmin
        ? [
            {
              id: 'settings',
              label: 'Kelola Pengguna',
              icon: Users,
              badge: 'Admin' as const,
              badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
              dotColor: 'bg-amber-400',
            },
          ]
        : []),
    ],
    [isActualAdmin, activeLoansCount, lowStockItems.length, dueCalibrations.length]
  );

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    onCloseMobile();
  };

  const sidebarContent = (
    <aside
      className={`${
        isCollapsed
          ? 'w-[68px] min-w-[68px] max-w-[68px]'
          : 'w-[260px] min-w-[260px] max-w-[260px]'
      } h-screen bg-[#0A192F] text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-2xl transition-all duration-300 ease-in-out select-none relative z-30`}
    >
      {/* Top Part: Brand / Logo */}
      <div className="flex flex-col">
        {/* Header Branding Container */}
        <div
          className={`p-3.5 sm:p-4 border-b border-slate-800/80 flex items-center ${
            isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-2.5'
          } transition-all duration-300`}
        >
          <div
            onClick={() => handleSelectTab('dashboard')}
            className={`flex items-center gap-3 cursor-pointer group min-w-0 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'SIMLAB - Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia' : undefined}
          >
            <div className="relative shrink-0 group/logo">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-500 opacity-40 blur-xs group-hover:opacity-90 transition duration-300" />
              <img
                src={settings.logo_url || '/src/assets/images/arcss_logo_official.svg'}
                alt="Logo Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia"
                referrerPolicy="no-referrer"
                className="relative w-9 h-9 sm:w-10 sm:h-10 object-contain p-1 rounded-xl bg-white border border-slate-700 shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/src/assets/images/arcss_logo_official.svg';
                }}
              />
              {isAdmin && !isCollapsed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditLogoOpen(true);
                  }}
                  title="Ubah Logo Sidebar (Khusus Admin)"
                  className="absolute -bottom-1 -right-1 p-1 rounded-full bg-teal-600 hover:bg-teal-500 text-white shadow-xs border border-slate-900 transition-transform hover:scale-110 z-10 opacity-80 group-hover/logo:opacity-100"
                >
                  <Camera className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Brand Title (Hidden when collapsed) */}
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <span className="text-sm font-extrabold text-white tracking-tight truncate leading-tight group-hover:text-teal-300 transition-colors">
                  {settings.nama_sistem || 'SIMLAB AR-RAHMAH'}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block"></span>
                    IPA TERPADU
                  </span>
                  {isAdmin && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditLogoOpen(true);
                        }}
                        className="text-[9.5px] font-semibold text-slate-400 hover:text-teal-300 flex items-center gap-0.5 transition-colors"
                        title="Ubah Logo Laboratorium (Khusus Admin)"
                      >
                        <Pencil className="w-2 h-2 text-teal-400" />
                        <span>Edit Logo</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button inside Sidebar */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all ${
                isCollapsed ? 'mt-1 w-7 h-7' : 'shrink-0'
              }`}
              title={isCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar (Collapsed)'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-amber-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-teal-300" />
              )}
            </button>
          )}

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* School Branding Pill */}
        {!isCollapsed ? (
          <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800/60 transition-all duration-200">
            <p className="text-[10.5px] font-medium text-slate-300 leading-tight">
              Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia
            </p>
            <div className="flex items-center justify-between text-[10px] font-mono mt-1">
              <span className="text-amber-400/90 font-semibold">TA {settings.tahun_ajaran || '2026'}</span>
              <span className="text-teal-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Sistem Aktif
              </span>
            </div>
          </div>
        ) : (
          <div className="py-1.5 border-b border-slate-800/60 flex justify-center">
            <div className="w-2 h-2 rounded-full bg-teal-400/80 shadow-xs" title="Laboratorium IPA Terpadu SMP & SMA IT Ar-Rahmah Cendekia" />
          </div>
        )}

        {/* Navigation Menu List */}
        <div
          className={`py-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-270px)] ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}
        >
          {!isCollapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Menu Navigasi</span>
              <span className="text-[9px] text-amber-400/80 font-mono">SIMLAB</span>
            </div>
          )}

          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all ${
                    isCollapsed
                      ? 'justify-center p-2.5'
                      : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-md shadow-teal-950/60 border border-teal-400/30 ring-1 ring-teal-400/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className={`flex items-center truncate ${isCollapsed ? 'justify-center relative' : 'gap-3'}`}>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 group-hover:text-teal-300'
                      }`}
                    />

                    {/* Dot Indicator on collapsed mode when badge exists */}
                    {isCollapsed && item.badge && (
                      <span
                        className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                          item.dotColor || 'bg-amber-400'
                        }`}
                      />
                    )}

                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-1.5 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Floating Tooltip in Collapsed Mode */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-700/90 whitespace-nowrap z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 flex items-center gap-2">
                    <span className="text-white">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                          item.badgeColor || 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Part: User Profile & Logout Button */}
      <div
        className={`border-t border-slate-800/90 bg-[#071120] space-y-2 transition-all ${
          isCollapsed ? 'p-2' : 'p-3'
        }`}
      >
        {/* Quick Google Sheets Sync Button */}
        {onOpenGoogleSheetsSync && (
          <div className="relative group">
            <button
              type="button"
              onClick={onOpenGoogleSheetsSync}
              className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all ${
                isCollapsed
                  ? 'justify-center p-2 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/40'
                  : 'justify-between px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 shadow-xs'
              }`}
              title={isCollapsed ? `Google Sheets Database: ${gasSyncStatus.isSyncing ? 'Menyinkronkan...' : gasSyncStatus.isConnected ? 'Terhubung (Online)' : 'Terputus'}` : undefined}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center relative' : 'gap-2'}`}>
                <div className="relative">
                  <FileSpreadsheet className={`w-4 h-4 text-emerald-400 shrink-0 ${gasSyncStatus.isSyncing ? 'animate-spin' : ''}`} />
                  <span
                    className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${
                      gasSyncStatus.isSyncing
                        ? 'bg-amber-400 animate-ping'
                        : gasSyncStatus.isConnected
                        ? 'bg-emerald-400'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>
                {!isCollapsed && <span className="font-bold text-white">Google Sheets</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold uppercase">
                  {gasSyncStatus.isSyncing ? 'Syncing...' : 'Online'}
                </span>
              )}
            </button>

            {isCollapsed && (
              <div className="absolute left-full bottom-2 ml-3 px-3 py-1.5 bg-slate-900 text-emerald-300 text-xs font-semibold rounded-xl shadow-2xl border border-emerald-800/60 whitespace-nowrap z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                Sinkronisasi Google Sheets
              </div>
            )}
          </div>
        )}

        {/* User Card */}
        <div className="relative group">
          <div
            onClick={onOpenProfileModal}
            className={`rounded-xl bg-slate-900/90 border border-slate-800 flex items-center cursor-pointer hover:border-teal-500/50 hover:bg-slate-800/80 transition-all ${
              isCollapsed ? 'justify-center p-2' : 'justify-between p-2.5 gap-2.5'
            }`}
            title={!isCollapsed ? 'Klik untuk kelola profil & akun' : undefined}
          >
            <div className={`flex items-center truncate ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover border border-teal-500/50 shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-xs shrink-0 group-hover:border-teal-400">
                  {currentUser?.avatarInitials || 'ARC'}
                </div>
              )}

              {!isCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate group-hover:text-teal-300 transition-colors">
                    {currentUser?.name || 'Petugas Lab'}
                  </div>
                  <div className="text-[10px] text-amber-400/90 font-medium truncate">
                    {currentUser?.roleTitle || 'Petugas'}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
            )}
          </div>

          {/* User Card Tooltip in Collapsed Mode */}
          {isCollapsed && (
            <div className="absolute left-full bottom-2 ml-3 p-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xl border border-slate-700/90 whitespace-nowrap z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              <div className="font-bold text-white">{currentUser?.name || 'Petugas'}</div>
              <div className="text-[10px] text-teal-400 font-medium">{currentUser?.roleTitle || 'Petugas Lab'}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Klik untuk kelola profil</div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="relative group">
          <button
            onClick={() => {
              logout();
              onCloseMobile();
            }}
            className={`w-full flex items-center rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-950/60 border border-transparent hover:border-rose-900/60 transition-all ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-center gap-2 px-3 py-2'
            }`}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Keluar Sistem</span>}
          </button>

          {/* Logout Tooltip in Collapsed Mode */}
          {isCollapsed && (
            <div className="absolute left-full bottom-2 ml-3 px-3 py-1.5 bg-slate-900 text-rose-300 text-xs font-semibold rounded-xl shadow-2xl border border-rose-900/60 whitespace-nowrap z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              Keluar Sistem
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block shrink-0 no-print">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Sidebar with Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex no-print">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          />
          {/* Sidebar Drawer */}
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Modal Ubah Logo Sidebar */}
      <EditLogoModal
        isOpen={isEditLogoOpen}
        onClose={() => setIsEditLogoOpen(false)}
      />
    </>
  );
};
