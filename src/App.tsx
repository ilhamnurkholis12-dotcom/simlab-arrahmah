import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { LabBannerSlideshow } from './components/LabBannerSlideshow';
import { StatsHighlights } from './components/StatsHighlights';
import { MonthlyTrendsChart } from './components/MonthlyTrendsChart';
import { LabDistributionChart } from './components/LabDistributionChart';
import { InventoryTable } from './components/InventoryTable';
import { SyncMatrix } from './components/SyncMatrix';
import { TransactionHistory } from './components/TransactionHistory';
import { PeriodicReports } from './components/PeriodicReports';
import { LabActivityReport } from './components/LabActivityReport';
import { ERaportRecap } from './components/ERaportRecap';
import { StudentClassRecords } from './components/StudentClassRecords';
import { ToolLoanManagement } from './components/ToolLoanManagement';
import { ToolCalibrationManagement } from './components/ToolCalibrationManagement';
import { UserProfileModal } from './components/UserProfileModal';
import { SettingsPanel } from './components/SettingsPanel';
import { LowStockModal } from './components/LowStockModal';
import { TransactionModal } from './components/TransactionModal';
import { ItemModal } from './components/ItemModal';
import { TransferModal } from './components/TransferModal';
import { QRScannerModal } from './components/QRScannerModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { LoginScreen } from './components/LoginScreen';
import { InventoryItem, LabId, TransactionType, LAB_DEFINITIONS } from './types/inventory';
import {
  Download,
  Upload,
  RotateCcw,
  Plus,
  FileSpreadsheet,
  AlertTriangle,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  QrCode,
  Settings,
  Megaphone,
  CheckCircle2,
  Printer,
  Gauge,
  X,
} from 'lucide-react';
import { PrintReportHeader } from './components/PrintReportHeader';
import { ToastContainer } from './components/ToastNotification';

const MainAppContent: React.FC = () => {
  const {
    currentUser,
    isHeadOfLab,
    items,
    transactions,
    lowStockItems,
    resetToDefaultData,
    exportDatabaseJson,
    importDatabaseJson,
    settings,
    toasts,
    removeToast,
    showToast,
    schoolLevelFilter,
    setSchoolLevelFilter,
    dueCalibrations,
    overdueCalibrationsCount,
    dueSoonCalibrationsCount,
  } = useInventory();

  // Manual Notification Dismissal State (Khusus Admin / Kepala Lab)
  const [dismissedNotifications, setDismissedNotifications] = useState<{
    announcement?: boolean;
    lowStock?: boolean;
    calibration?: boolean;
  }>(() => {
    try {
      const saved = sessionStorage.getItem('simlab_dismissed_notifications');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const handleDismissNotification = (type: 'announcement' | 'lowStock' | 'calibration') => {
    if (!isHeadOfLab && currentUser?.role !== 'KEPALA_LAB' && (currentUser as any)?.role !== 'admin') {
      showToast({
        type: 'warning',
        title: 'Akses Ditolak',
        message: 'Hanya Kepala Laboratorium (Admin) yang dapat menutup notifikasi sistem.',
      });
      return;
    }

    setDismissedNotifications((prev) => {
      const next = { ...prev, [type]: true };
      try {
        sessionStorage.setItem('simlab_dismissed_notifications', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    const labels = {
      announcement: 'Pengumuman Resmi',
      lowStock: 'Peringatan Stok Minimum',
      calibration: 'Pengingat Kalibrasi Alat',
    };

    showToast({
      type: 'info',
      title: 'Notifikasi Ditutup',
      message: `Kartu ${labels[type]} telah disembunyikan dari dashboard.`,
    });
  };

  // Navigation tab (defaults to dashboard)
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedLabFilter, setSelectedLabFilter] = useState<LabId | 'ALL'>('ALL');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('simlab_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('simlab_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Modals state
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isItemDetailModalOpen, setIsItemDetailModalOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isGoogleSheetsSyncOpen, setIsGoogleSheetsSyncOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isResetDefaultConfirmOpen, setIsResetDefaultConfirmOpen] = useState(false);
  // Global Search Bar state (Universal Real-Time Search in Header)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener: Ctrl+K / Cmd+K to focus search, Esc to close (Attached once for anti-lag)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Selected item for modals
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>('IN');

  // Import file ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Global Action Handler when user selects any search result (Menu / Action / Item / Practicum / Student)
  const handleSelectSearchResult = (result: any) => {
    setSearchQuery('');
    setIsSearchOpen(false);

    if (result.type === 'MENU') {
      setActiveTab(result.route);
    } else if (result.type === 'ACTION') {
      switch (result.actionId) {
        case 'add-item':
          handleOpenAddItem();
          break;
        case 'qr-scanner':
          setIsQRScannerOpen(true);
          break;
        case 'tx-in':
          setModalItem(null);
          setTransactionType('IN');
          setIsTransactionModalOpen(true);
          break;
        case 'tx-out':
          setModalItem(null);
          setTransactionType('OUT');
          setIsTransactionModalOpen(true);
          break;
        case 'transfer':
          handleOpenTransfer();
          break;
        case 'print-report':
          setActiveTab('reports');
          break;
        case 'import-excel':
          setIsExcelImportOpen(true);
          break;
        case 'low-stock':
          setIsLowStockModalOpen(true);
          break;
        case 'calibration':
          setActiveTab('calibration');
          break;
        case 'filter-all':
          setSchoolLevelFilter('ALL');
          break;
        case 'filter-smp':
          setSchoolLevelFilter('SMP');
          break;
        case 'filter-sma':
          setSchoolLevelFilter('SMA');
          break;
        default:
          break;
      }
    } else if (result.type === 'ITEM') {
      setActiveTab('inventory');
      setSelectedLabFilter('ALL');

      // Auto-scroll and highlight element with ring-2 ring-teal-500
      setTimeout(() => {
        const el = document.getElementById(`item-row-${result.item.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-teal-500', 'bg-teal-50/70', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-teal-500', 'bg-teal-50/70');
          }, 2200);
        }
      }, 220);

      // Open item detail modal
      handleOpenItemDetail(result.item);
    } else if (result.type === 'PRACTICUM') {
      setActiveTab('practicum');
      setTimeout(() => {
        const el = document.getElementById(`activity-row-${result.activity.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-teal-500', 'bg-teal-50/70', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-teal-500', 'bg-teal-50/70');
          }, 2200);
        }
      }, 220);
    } else if (result.type === 'STUDENT') {
      setActiveTab('students');
      setTimeout(() => {
        const el = document.getElementById(`student-row-${result.student.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-teal-500', 'bg-teal-50/70', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-teal-500', 'bg-teal-50/70');
          }, 2200);
        }
      }, 220);
    }
  };

  // Guard: Tampilkan Halaman Login jika pengguna belum terautentikasi
  if (!currentUser) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <LoginScreen
          onLoginSuccess={() => {
            showToast({
              type: 'success',
              title: 'Selamat Datang di SIMLAB',
              message: 'Beralih ke Dashboard Utama Laboratorium.',
            });
          }}
        />
      </>
    );
  }

  // Handlers
  const handleOpenAddItem = () => {
    setModalItem(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: InventoryItem) => {
    setModalItem(item);
    setIsItemModalOpen(true);
  };

  const handleQuickTransaction = (item: InventoryItem, type: 'IN' | 'OUT') => {
    setModalItem(item);
    setTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  const handleOpenTransfer = (item?: InventoryItem) => {
    setModalItem(item || null);
    setIsTransferModalOpen(true);
  };

  const handleOpenItemDetail = (item: InventoryItem) => {
    setDetailItem(item);
    setIsItemDetailModalOpen(true);
  };

  const handleItemFoundFromScan = (item: InventoryItem) => {
    setDetailItem(item);
    setIsItemDetailModalOpen(true);
  };

  const handleSelectLabFromDashboard = (labId: LabId | 'ALL') => {
    setSelectedLabFilter(labId);
    setActiveTab('inventory');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const success = importDatabaseJson(text);
          if (success) {
            showToast({
              type: 'success',
              title: 'Impor Berhasil',
              message: 'Data inventaris dan backup JSON berhasil dipulihkan!',
            });
          } else {
            showToast({
              type: 'error',
              title: 'Impor Gagal',
              message: 'Format file JSON tidak sesuai struktur SIMLAB.',
            });
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* SISI KIRI: Sidebar Navigation (Collapsible ~68px / 260px, Deep Navy) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenGoogleSheetsSync={() => setIsGoogleSheetsSyncOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* SISI KANAN: Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-[#F8FAFC]">
        {/* Top Bar Tipis di Paling Atas */}
        <TopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
          onOpenQRScanner={() => setIsQRScannerOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebarCollapse}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          searchInputRef={searchInputRef}
          onSelectSearchResult={handleSelectSearchResult}
          onOpenGoogleSheetsSync={() => setIsGoogleSheetsSyncOpen(true)}
        />

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-7">
          {/* Dynamic Announcement Banner */}
          {settings.tampilkan_pengumuman && settings.teks_pengumuman && activeTab !== 'settings' && !dismissedNotifications.announcement && (
            <div
              className={`rounded-3xl p-5 sm:p-6 border shadow-sm backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
                settings.tipe_pengumuman === 'warning'
                  ? 'bg-amber-50/90 border-amber-200/90 text-amber-950'
                  : settings.tipe_pengumuman === 'success'
                  ? 'bg-teal-50/90 border-teal-200/90 text-teal-950'
                  : 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-2xl shrink-0 mt-0.5 shadow-2xs ${
                    settings.tipe_pengumuman === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : settings.tipe_pengumuman === 'success'
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {settings.tipe_pengumuman === 'warning' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : settings.tipe_pengumuman === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Megaphone className="w-5 h-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider">
                      {settings.tipe_pengumuman === 'warning'
                        ? 'Peringatan Resmi Laboratorium'
                        : settings.tipe_pengumuman === 'success'
                        ? 'Pemberitahuan Sistem'
                        : 'Pengumuman Resmi Laboratorium'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-white/90 rounded-full border border-slate-200/80 text-slate-700 shadow-2xs font-semibold">
                      Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed font-medium">
                    {settings.teks_pengumuman}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {currentUser?.role === 'KEPALA_LAB' && (
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/90 hover:bg-white text-xs font-bold border border-slate-200/90 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Ubah pengumuman di panel pengaturan sistem"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-700" />
                    <span>Ubah Pengumuman</span>
                  </button>
                )}

                {isHeadOfLab && (
                  <button
                    type="button"
                    onClick={() => handleDismissNotification('announcement')}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/90 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200/90 hover:border-rose-300 shadow-2xs flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
                    title="Hapus / Tutup notifikasi pengumuman ini (Khusus Admin / Kepala Lab)"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hapus Notifikasi</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Low Stock Warning Banner */}
          {lowStockItems.length > 0 && activeTab !== 'reports' && activeTab !== 'settings' && !dismissedNotifications.lowStock && (
            <div className="bg-gradient-to-r from-amber-50/95 via-amber-50/80 to-amber-100/50 backdrop-blur-md border border-amber-300/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl shrink-0 shadow-2xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-amber-950">
                    Peringatan: {lowStockItems.length} Barang Mencapai / Di Bawah Ambang Batas Minimum!
                  </p>
                  <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                    Segera lakukan restock atau pengadaan untuk kelancaran praktikum santri SMP dan SMA IT Ar-Rahmah Cendekia.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  onClick={() => setIsLowStockModalOpen(true)}
                  className="min-h-[40px] px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs whitespace-nowrap hover:-translate-y-0.5 cursor-pointer"
                >
                  Kelola Ambang Batas & Restock →
                </button>
                {isHeadOfLab && (
                  <button
                    type="button"
                    onClick={() => handleDismissNotification('lowStock')}
                    className="min-h-[40px] px-3 py-2 bg-white/90 hover:bg-rose-50 text-amber-950 hover:text-rose-700 border border-amber-300/80 hover:border-rose-300 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    title="Hapus / Tutup notifikasi stok minimum ini (Khusus Admin / Kepala Lab)"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hapus Notifikasi</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Automatic Calibration Reminder Banner */}
          {dueCalibrations.length > 0 && activeTab !== 'reports' && activeTab !== 'settings' && !dismissedNotifications.calibration && (
            <div className="bg-gradient-to-r from-rose-50/95 via-amber-50/90 to-amber-100/60 backdrop-blur-md border border-rose-300/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-rose-100 text-rose-800 rounded-2xl shrink-0 shadow-2xs">
                  <Gauge className="w-5 h-5 text-rose-700" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs sm:text-sm font-bold text-rose-950">
                      Pengingat Kalibrasi: {dueCalibrations.length} Alat Ukur & Sensor Memerlukan Kalibrasi Berkala!
                    </p>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-900 border border-rose-300">
                      {overdueCalibrationsCount} Kadaluarsa · {dueSoonCalibrationsCount} Mendekati Batas
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-rose-900/80 mt-0.5">
                    Pastikan timbangan digital, pH meter, sensor pirometer, dan instrumen presisi terkalibrasi untuk menjamin akurasi data praktikum santri.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  onClick={() => setActiveTab('calibration')}
                  className="min-h-[40px] px-4 py-2 bg-gradient-to-r from-rose-700 to-amber-700 hover:from-rose-800 hover:to-amber-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs whitespace-nowrap hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Buka Modul Kalibrasi Alat →</span>
                </button>
                {isHeadOfLab && (
                  <button
                    type="button"
                    onClick={() => handleDismissNotification('calibration')}
                    className="min-h-[40px] px-3 py-2 bg-white/90 hover:bg-rose-50 text-rose-950 hover:text-rose-700 border border-rose-300/80 hover:border-rose-300 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    title="Hapus / Tutup pengingat kalibrasi ini (Khusus Admin / Kepala Lab)"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hapus Notifikasi</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tombol Pulihkan Notifikasi bagi Admin jika ada kartu yang ditutup */}
          {isHeadOfLab &&
            (dismissedNotifications.announcement ||
              dismissedNotifications.lowStock ||
              dismissedNotifications.calibration) && (
              <div className="flex items-center justify-end px-1 -mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDismissedNotifications({});
                    try {
                      sessionStorage.removeItem('simlab_dismissed_notifications');
                    } catch {}
                    showToast({
                      type: 'info',
                      title: 'Notifikasi Dipulihkan',
                      message: 'Seluruh kartu notifikasi dashboard ditampilkan kembali.',
                    });
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-teal-700 bg-white/80 hover:bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-teal-600" />
                  <span>Tampilkan kembali notifikasi yang ditutup</span>
                </button>
              </div>
            )}

          {/* 1. Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 sm:space-y-7">
              {/* Official Printable Report Header for Dashboard */}
              <PrintReportHeader
                title="Ringkasan Eksekutif & Statistik Inventaris Laboratorium"
                subtitle={`Laporan Posisi Stok, Nilai Aset Alat Praktikum & Rekapitulasi Mutasi Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia TA ${settings.tahun_ajaran || '2025/2026'}`}
                selectedLab="ALL"
                extraMetadata={[
                  { label: 'Total Katalog Barang', value: `${items.length} item` },
                  { label: 'Stok Minimum Kritis', value: `${lowStockItems.length} barang` },
                ]}
              />

              {/* Compact Soft Navy-Teal Welcome Banner */}
              <div className="no-print bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-4 sm:p-5 rounded-2xl border border-slate-700/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span>{schoolLevelFilter === 'ALL' ? 'SMP & SMA Terpadu' : `Jenjang ${schoolLevelFilter}`}</span>
                    </span>
                    <span className="text-[10.5px] font-mono text-slate-400">
                      TA {settings.tahun_ajaran || '2026'} · Realtime Sync
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="w-10 h-10 rounded-xl object-cover border border-teal-400/40 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                        {currentUser.avatarInitials}
                      </div>
                    )}
                    <div className="truncate">
                      <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight truncate">
                        Selamat Datang, {currentUser.name}
                      </h1>
                      <p className="text-xs text-slate-300 truncate mt-0.5">
                        {settings.sub_judul_dashboard ||
                          'Sistem Rekapitulasi Stok Barang Inventaris Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenAddItem}
                    className="px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Barang</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('loans')}
                    className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Boxes className="w-3.5 h-3.5 text-teal-400" />
                    <span>Peminjaman Alat</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('calibration')}
                    className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                    title="Buka modul kalibrasi dan verifikasi akurasi alat sensitif"
                  >
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kalibrasi Alat</span>
                  </button>
                  <button
                    onClick={() => setIsQRScannerOpen(true)}
                    className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5 text-teal-400" />
                    <span>Pindai QR</span>
                  </button>
                  <button
                    onClick={() => {
                      setModalItem(null);
                      setTransactionType('IN');
                      setIsTransactionModalOpen(true);
                    }}
                    className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Catat Masuk</span>
                  </button>
                  <button
                    onClick={() => {
                      setModalItem(null);
                      setTransactionType('OUT');
                      setIsTransactionModalOpen(true);
                    }}
                    className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>Catat Keluar</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cetak</span>
                  </button>
                </div>
              </div>

              {/* Banner Slideshow / Video Showcase Laboratorium IPA Terpadu */}
              <LabBannerSlideshow />

              {/* Stats Highlight Component */}
              <StatsHighlights
                onSelectLabFilter={handleSelectLabFromDashboard}
                onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
              />

              {/* Visual Recharts: Distribusi Barang per Kategori Laboratorium (Fisika, Kimia, Biologi) */}
              <LabDistributionChart onSelectLabFilter={handleSelectLabFromDashboard} />

              {/* Visual Recharts Trends Dashboard */}
              <MonthlyTrendsChart />

              {/* Quick Preview of Recent Transactions & Critical Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Box 1: Aktivitas Mutasi Terkini */}
                <div className="bg-white/95 backdrop-blur-xs p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">Aktivitas Mutasi Terkini</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline"
                    >
                      Lihat Semua Mutasi →
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="truncate">
                          <div className="font-bold text-slate-900 truncate">{tx.itemName}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{tx.date}</span>
                            <span aria-hidden="true">·</span>
                            <span>{tx.purpose}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-slate-600">{tx.picName}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono font-bold text-xs tabular-nums px-2.5 py-1 rounded-lg border ${
                              tx.type === 'IN'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                : tx.type === 'OUT'
                                ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                : 'bg-sky-50 text-sky-800 border-sky-200/80'
                            }`}
                          >
                            {tx.type === 'IN' ? `+${tx.quantity}` : tx.type === 'OUT' ? `-${tx.quantity}` : `${tx.quantity}`} unit
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Box 2: Monitoring Ambang Batas Minimum */}
                <div className="bg-white/95 backdrop-blur-xs p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Status Ambang Batas Minimum
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsLowStockModalOpen(true)}
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline"
                    >
                      Atur Ambang Batas →
                    </button>
                  </div>

                  {lowStockItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs font-medium">
                      Semua barang berada di atas ambang batas aman.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {lowStockItems.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="py-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="truncate">
                            <div className="font-bold text-slate-900 truncate">{item.name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-semibold">{item.code}</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.storageRack}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div className="font-mono text-xs tabular-nums text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              {item.currentTotalStock} / {item.minStockAlert} {item.unit}
                            </div>
                            <button
                              onClick={() => handleQuickTransaction(item, 'IN')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              + Masuk
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. Laboratory Management (Ruang Kerja Lab & Sinkronisasi) */}
          {activeTab === 'sync' && <SyncMatrix onOpenTransfer={handleOpenTransfer} />}

          {/* 3. Stock Inventory (Katalog Barang) */}
          {activeTab === 'inventory' && (
            <InventoryTable
              selectedLab={selectedLabFilter}
              onSelectLab={setSelectedLabFilter}
              onOpenAddItem={handleOpenAddItem}
              onOpenEditItem={handleOpenEditItem}
              onQuickTransaction={handleQuickTransaction}
              onOpenTransfer={handleOpenTransfer}
              onOpenItemDetail={handleOpenItemDetail}
              onOpenQRScanner={() => setIsQRScannerOpen(true)}
              onOpenExcelImport={() => setIsExcelImportOpen(true)}
            />
          )}

          {/* 3b. Mutasi Barang (Accessible via button or history) */}
          {activeTab === 'transactions' && (
            <TransactionHistory
              onOpenNewTransaction={() => {
                setModalItem(null);
                setTransactionType('IN');
                setIsTransactionModalOpen(true);
              }}
            />
          )}

          {/* 3c. Peminjaman & Pengembalian Alat Praktikum */}
          {activeTab === 'loans' && <ToolLoanManagement />}

          {/* 3d. Kalibrasi Alat Presisi & Sensor Sensitif Laboratorium */}
          {activeTab === 'calibration' && <ToolCalibrationManagement />}

          {/* 4. Schedule & Practicum (Jadwal & Jurnal Praktikum Guru) */}
          {activeTab === 'practicum' && <LabActivityReport />}

          {/* 4b. Rekap E-Raport (Matriks Nilai Rapor Terintegrasi Judul Percobaan) */}
          {activeTab === 'eraport' && <ERaportRecap />}

          {/* 5. Student & Class Records (Data Siswa & Rombel) */}
          {activeTab === 'students' && <StudentClassRecords />}

          {/* 6. Reports (Laporan Resmi & Berita Acara PDF) */}
          {activeTab === 'reports' && <PeriodicReports />}

          {/* 7. User Management & Otoritas (Pengaturan Sistem) */}
          {activeTab === 'settings' && (
            <SettingsPanel
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              onOpenGoogleSheetsSync={() => setIsGoogleSheetsSyncOpen(true)}
            />
          )}

          {/* Quiet Footer with Backup & Recovery tools */}
          <footer className="no-print border-t border-slate-200/90 bg-white/80 backdrop-blur-md p-5 rounded-2xl text-xs text-slate-500 shadow-2xs mt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-center sm:text-left">
                <span className="font-bold text-slate-800">
                  Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia
                </span>
                <span aria-hidden="true" className="hidden sm:inline text-slate-300">·</span>
                <span className="text-slate-500">Tahun Ajaran {settings.tahun_ajaran || '2026'}</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-1 text-teal-800 hover:text-teal-950 font-bold transition-colors"
                  title="Buka panel pengaturan sistem web"
                >
                  <Settings className="w-3.5 h-3.5 text-teal-700" />
                  <span>Pengaturan</span>
                </button>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <button
                  onClick={exportDatabaseJson}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold transition-colors"
                  title="Cadangkan seluruh data inventaris dan mutasi ke format JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Backup JSON</span>
                </button>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <button
                  onClick={() => setIsExcelImportOpen(true)}
                  className="flex items-center gap-1 text-teal-800 hover:text-teal-950 font-bold transition-colors"
                  title="Import data inventaris dari file Excel multi-sheet (Fisika, Kimia, Biologi)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Import Excel</span>
                </button>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold transition-colors"
                  title="Pulihkan data inventaris dari file backup JSON"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <span aria-hidden="true" className="text-slate-300">·</span>
                <button
                  onClick={() => setIsResetDefaultConfirmOpen(true)}
                  className="flex items-center gap-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Reset ke data awal laboratorium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* All Interactive Modals */}
      <LowStockModal
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
        onQuickRestock={(item) => handleQuickTransaction(item, 'IN')}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        selectedItem={modalItem}
        defaultType={transactionType}
      />

      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        editingItem={modalItem}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        selectedItem={modalItem}
      />

      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onItemFound={handleItemFoundFromScan}
      />

      <ItemDetailModal
        isOpen={isItemDetailModalOpen}
        onClose={() => setIsItemDetailModalOpen(false)}
        item={detailItem}
        onQuickTransaction={handleQuickTransaction}
        onOpenTransfer={handleOpenTransfer}
        onOpenEditItem={handleOpenEditItem}
      />

      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        onSuccessNavigate={(tab) => setActiveTab(tab)}
      />

      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsSyncOpen}
        onClose={() => setIsGoogleSheetsSyncOpen(false)}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Dialog Konfirmasi Reset Default Database In-App */}
      {isResetDefaultConfirmOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Reset ke Kondisi Awal?</h4>
                <p className="text-xs text-slate-500">SIMLAB SMP & SMA IT Ar-Rahmah Cendekia</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin mereset seluruh data inventaris dan pengaturan ke kondisi awal tahun ajaran 2026? Perubahan manual yang belum dibackup ke JSON akan tergantikan.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResetDefaultConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDefaultData();
                  setIsResetDefaultConfirmOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ya, Reset Data Default</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <InventoryProvider>
      <MainAppContent />
    </InventoryProvider>
  );
}
