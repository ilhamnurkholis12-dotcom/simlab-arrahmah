import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  MOCK_FALLBACK_LAB_ITEMS,
  SEARCH_MENUS,
  SEARCH_ACTIONS,
} from '../data/mockSearchData';
import { LAB_DEFINITIONS, LabId } from '../types/inventory';
import {
  Menu,
  Search,
  Bell,
  QrCode,
  ChevronDown,
  Settings,
  LogOut,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  Camera,
  GraduationCap,
  X,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Printer,
  FileSpreadsheet,
  Boxes,
  BookOpen,
  Users,
  AlertTriangle,
  ArrowRight,
  LayoutDashboard,
  Building2,
  FileText,
} from 'lucide-react';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMobileSidebar: () => void;
  onOpenLowStockModal: () => void;
  onOpenQRScanner: () => void;
  onOpenProfileModal?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  // Real-Time Universal Search Props
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectSearchResult: (result: any) => void;
  onOpenGoogleSheetsSync?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenMobileSidebar,
  onOpenLowStockModal,
  onOpenQRScanner,
  onOpenProfileModal,
  isSidebarCollapsed = false,
  onToggleSidebar,
  searchQuery,
  setSearchQuery,
  isSearchOpen,
  setIsSearchOpen,
  searchInputRef,
  onSelectSearchResult,
  onOpenGoogleSheetsSync,
}) => {
  const {
    currentUser,
    logout,
    lowStockItems,
    schoolLevelFilter,
    setSchoolLevelFilter,
    items,
    labActivities,
    students,
    classes,
    isAdmin,
    gasSyncStatus,
    syncWithGoogleSheets,
  } = useInventory();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<
    'ALL' | 'ACTIONS' | 'MENUS' | 'ITEMS' | 'PRACTICUM' | 'STUDENTS'
  >('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Title / Breadcrumb lookup (Bahasa Indonesia Baku)
  const getTabInfo = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Dashboard Utama', category: 'Ringkasan & Metrik' };
      case 'sync':
        return { title: 'Manajemen Laboratorium', category: 'Sinkronisasi Ruang Kerja' };
      case 'inventory':
        return { title: 'Inventaris & Stok', category: 'Katalog Barang & Mutasi' };
      case 'loans':
        return { title: 'Peminjaman & Pengembalian Alat', category: 'Sirkulasi & Kendali Harian' };
      case 'practicum':
        return { title: 'Jadwal & Jurnal Praktikum', category: 'Buku Kendali & Absensi' };
      case 'students':
        return { title: 'Data Siswa & Kelas', category: 'Rombel & Anggota Lab' };
      case 'reports':
        return { title: 'Laporan Resmi & Berita Acara', category: 'Dokumen & Ekspor' };
      case 'settings':
        return { title: 'Kelola Pengguna & Otoritas', category: 'Pengaturan Sistem' };
      default:
        return { title: 'Dashboard', category: 'SIMLAB' };
    }
  };

  const currentInfo = getTabInfo(activeTab);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen, setIsSearchOpen]);

  // Fallback mock items if context inventory items are not yet populated
  const effectiveInventoryItems = useMemo(() => {
    if (items && items.length > 0) return items;
    return MOCK_FALLBACK_LAB_ITEMS;
  }, [items]);

  const getMenuIcon = (route: string) => {
    switch (route) {
      case 'dashboard':
        return <LayoutDashboard className="w-4 h-4 text-teal-700" />;
      case 'sync':
        return <Building2 className="w-4 h-4 text-teal-700" />;
      case 'inventory':
        return <Boxes className="w-4 h-4 text-emerald-700" />;
      case 'loans':
        return <CheckCircle2 className="w-4 h-4 text-indigo-700" />;
      case 'practicum':
        return <BookOpen className="w-4 h-4 text-amber-700" />;
      case 'students':
        return <Users className="w-4 h-4 text-sky-700" />;
      case 'reports':
        return <FileText className="w-4 h-4 text-emerald-800" />;
      case 'settings':
        return <Settings className="w-4 h-4 text-slate-700" />;
      default:
        return <LayoutDashboard className="w-4 h-4 text-teal-700" />;
    }
  };

  const getActionIcon = (actionId: string) => {
    switch (actionId) {
      case 'add-item':
        return <Plus className="w-4 h-4 text-emerald-700" />;
      case 'qr-scanner':
        return <QrCode className="w-4 h-4 text-teal-700" />;
      case 'tx-in':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-700" />;
      case 'tx-out':
        return <ArrowUpRight className="w-4 h-4 text-amber-700" />;
      case 'transfer':
        return <ArrowRightLeft className="w-4 h-4 text-sky-700" />;
      case 'print-report':
        return <Printer className="w-4 h-4 text-slate-700" />;
      case 'import-excel':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-700" />;
      case 'low-stock':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'filter-all':
      case 'filter-smp':
      case 'filter-sma':
        return <SlidersHorizontal className="w-4 h-4 text-teal-700" />;
      default:
        return <Sparkles className="w-4 h-4 text-teal-700" />;
    }
  };

  // Compile real-time Universal Search Index
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // 1. Actions index
    const actionsResults = SEARCH_ACTIONS.filter((act) => {
      if (!q) return true;
      return (
        act.title.toLowerCase().includes(q) ||
        act.description.toLowerCase().includes(q) ||
        act.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }).map((act) => ({
      id: act.id,
      type: 'ACTION' as const,
      category: 'ACTIONS' as const,
      categoryLabel: '🚀 AKSI CEPAT & TOMBOL',
      title: act.title,
      subtitle: act.description,
      meta: act.badge,
      badge: {
        text: act.badge,
        bg: 'bg-emerald-50',
        textCol: 'text-emerald-800',
        borderCol: 'border-emerald-200',
      },
      icon: getActionIcon(act.actionId),
      actionId: act.actionId,
    }));

    // 2. Menus index
    const menusResults = SEARCH_MENUS.filter((menu) => {
      // Sembunyikan menu Pengaturan Sistem bagi akun non-admin (Laboran & Guru)
      if (!isAdmin && menu.route === 'settings') return false;
      if (!q) return true;
      return (
        menu.title.toLowerCase().includes(q) ||
        menu.description.toLowerCase().includes(q) ||
        menu.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }).map((menu) => ({
      id: menu.id,
      type: 'MENU' as const,
      category: 'MENUS' as const,
      categoryLabel: '📁 MENU & HALAMAN',
      title: menu.title,
      subtitle: menu.description,
      meta: menu.category,
      badge: {
        text: menu.category,
        bg: 'bg-slate-100',
        textCol: 'text-slate-800',
        borderCol: 'border-slate-200',
      },
      icon: getMenuIcon(menu.route),
      route: menu.route,
    }));

    // 3. Inventory Items index (Alat, Zat Kimia, Reagen)
    const itemsResults = effectiveInventoryItems
      .filter((item: any) => {
        if (!q) {
          const stock = item.currentTotalStock ?? item.stok ?? 0;
          const minStock = item.minStockAlert ?? 5;
          return stock <= minStock;
        }
        const name = (item.name || item.nama || '').toLowerCase();
        const code = (item.code || item.kode || '').toLowerCase();
        const category = (item.category || item.kategori || '').toLowerCase();
        const rack = (item.storageRack || item.lokasi || '').toLowerCase();
        const brand = (item.brandOrSpec || item.spesifikasi || '').toLowerCase();
        const lab = (item.primaryLab || item.lab || '').toLowerCase();

        return (
          name.includes(q) ||
          code.includes(q) ||
          category.includes(q) ||
          rack.includes(q) ||
          brand.includes(q) ||
          lab.includes(q)
        );
      })
      .slice(0, 25)
      .map((item: any) => {
        const name = item.name || item.nama;
        const code = item.code || item.kode;
        const category = item.category || item.kategori;
        const rack = item.storageRack || item.lokasi;
        const stock = item.currentTotalStock ?? item.stok ?? 0;
        const unit = item.unit || item.satuan || 'Unit';
        const lab = item.primaryLab || item.lab || 'ALL';
        const labShort =
          lab !== 'ALL' && LAB_DEFINITIONS[lab as LabId]
            ? LAB_DEFINITIONS[lab as LabId].shortName
            : 'Semua Lab';
        const isLow = stock <= (item.minStockAlert ?? 5);

        return {
          id: `item-${item.id}`,
          type: 'ITEM' as const,
          category: 'ITEMS' as const,
          categoryLabel: '📦 DATA INVENTARIS & ALAT/BAHAN',
          title: name,
          subtitle: `Kode: ${code} · ${category} · Lokasi: ${rack || '-'}`,
          meta: `Stok: ${stock} ${unit}`,
          badge: {
            text: isLow ? `Stok Kritis (${labShort})` : labShort,
            bg: isLow ? 'bg-amber-100' : 'bg-slate-100',
            textCol: isLow ? 'text-amber-900 font-bold' : 'text-slate-700',
            borderCol: isLow ? 'border-amber-300' : 'border-slate-200',
          },
          icon: isLow ? (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          ) : (
            <Boxes className="w-4 h-4 text-emerald-700" />
          ),
          item,
        };
      });

    // 4. Practicum index (Jadwal & Jurnal)
    const practicumResults = (labActivities || [])
      .filter((act) => {
        if (!q) return false;
        const matchedClass = classes?.find((c) => c.id === act.kelas_id);
        const className = matchedClass ? matchedClass.nama_kelas.toLowerCase() : '';
        return (
          act.judul_percobaan.toLowerCase().includes(q) ||
          (act.materi_pokok && act.materi_pokok.toLowerCase().includes(q)) ||
          (act.nama_guru && act.nama_guru.toLowerCase().includes(q)) ||
          act.tanggal_kegiatan.includes(q) ||
          className.includes(q)
        );
      })
      .slice(0, 10)
      .map((act) => {
        const matchedClass = classes?.find((c) => c.id === act.kelas_id);
        const labShort = LAB_DEFINITIONS[act.laboratorium]?.shortName || act.laboratorium;

        return {
          id: `practicum-${act.id}`,
          type: 'PRACTICUM' as const,
          category: 'PRACTICUM' as const,
          categoryLabel: '📅 JADWAL & JURNAL PRAKTIKUM',
          title: act.judul_percobaan,
          subtitle: `Guru: ${act.nama_guru || '-'} · ${act.tanggal_kegiatan} · Kelas #${act.kelas_id}`,
          meta: `${matchedClass?.nama_kelas || 'Kelas'}`,
          badge: {
            text: labShort,
            bg: 'bg-amber-50',
            textCol: 'text-amber-900 font-bold',
            borderCol: 'border-amber-200',
          },
          icon: <BookOpen className="w-4 h-4 text-amber-700" />,
          activity: act,
        };
      });

    // 5. Students index
    const studentsResults = (students || [])
      .filter((s) => {
        if (!q) return false;
        const matchedClass = classes?.find((c) => c.id === s.kelas_id);
        const className = matchedClass ? matchedClass.nama_kelas.toLowerCase() : '';
        return (
          s.nama_siswa.toLowerCase().includes(q) ||
          (s.nisn && s.nisn.includes(q)) ||
          className.includes(q)
        );
      })
      .slice(0, 15)
      .map((s) => {
        const matchedClass = classes?.find((c) => c.id === s.kelas_id);

        return {
          id: `student-${s.id}`,
          type: 'STUDENT' as const,
          category: 'STUDENTS' as const,
          categoryLabel: '👥 DATA SISWA & KELAS',
          title: s.nama_siswa,
          subtitle: `NISN: ${s.nisn || '-'} · ${matchedClass?.nama_kelas || 'Santri Lab'}`,
          meta: `Kelas ${matchedClass?.nama_kelas || '-'}`,
          badge: {
            text: matchedClass?.nama_kelas || 'Siswa',
            bg: 'bg-sky-50',
            textCol: 'text-sky-900',
            borderCol: 'border-sky-200',
          },
          icon: <Users className="w-4 h-4 text-sky-700" />,
          student: s,
        };
      });

    if (!q) {
      return [...actionsResults.slice(0, 6), ...menusResults.slice(0, 4), ...itemsResults.slice(0, 4)];
    }

    return [
      ...actionsResults,
      ...menusResults,
      ...itemsResults,
      ...practicumResults,
      ...studentsResults,
    ];
  }, [searchQuery, effectiveInventoryItems, labActivities, classes, students, isAdmin]);

  // Filter by category tab
  const filteredResults = useMemo(() => {
    if (selectedCategoryTab === 'ALL') return searchResults;
    return searchResults.filter((r) => r.category === selectedCategoryTab);
  }, [searchResults, selectedCategoryTab]);

  // Grouped results for section rendering
  const groupedResults = useMemo(() => {
    const groups: { [key: string]: typeof filteredResults } = {};
    filteredResults.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredResults]);

  // Flattened for keyboard traversal
  const flattenedList = useMemo(() => {
    const list: typeof filteredResults = [];
    const order = ['ACTIONS', 'MENUS', 'ITEMS', 'PRACTICUM', 'STUDENTS'];
    order.forEach((cat) => {
      if (groupedResults[cat]) {
        list.push(...groupedResults[cat]);
      }
    });
    return list;
  }, [groupedResults]);

  // Handle keyboard events in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flattenedList.length > 0) {
        const next = (selectedIndex + 1) % flattenedList.length;
        setSelectedIndex(next);
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flattenedList.length > 0) {
        const prev = (selectedIndex - 1 + flattenedList.length) % flattenedList.length;
        setSelectedIndex(prev);
        itemRefs.current[prev]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flattenedList[selectedIndex]) {
        onSelectSearchResult(flattenedList[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <>
      {/* Backdrop overlay when search is open */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] z-30 transition-opacity"
          onClick={() => setIsSearchOpen(false)}
        />
      )}

      <header className="no-print relative h-16 sm:h-18 bg-[#0A192F] text-white border-b border-slate-800/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-md z-40">
        {/* Left: Sidebar Toggle Button (Mobile & Desktop) & Title / Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Unified Sidebar Toggle Button */}
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                if (onToggleSidebar) onToggleSidebar();
              } else {
                onOpenMobileSidebar();
              }
            }}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-700/80 transition-all shrink-0 group"
            title="Buka / Kecilkan Navigasi Sidebar (☰)"
          >
            <Menu className="w-5 h-5 text-amber-400 group-hover:scale-105 transition-transform" />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider hidden sm:inline">
                {currentInfo.category}
              </span>
              <span className="text-slate-600 hidden sm:inline">/</span>
              <h1 className="text-sm sm:text-base font-extrabold text-white truncate tracking-tight">
                {currentInfo.title}
              </h1>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia
            </span>
          </div>
        </div>

        {/* Center/Right: School Level Filter, UNIVERSAL REALTIME SEARCH, QR, Bell, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Filter Cepat Jenjang Pendidikan (SMP / SMA / Terpadu) */}
          <div className="hidden md:flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-700/80 shadow-2xs">
            <button
              onClick={() => setSchoolLevelFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                schoolLevelFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tampilkan seluruh data Terpadu (SMP dan SMA)"
            >
              Terpadu
            </button>
            <button
              onClick={() => setSchoolLevelFilter('SMP')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                schoolLevelFilter === 'SMP'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Filter khusus jenjang SMP IT"
            >
              SMP
            </button>
            <button
              onClick={() => setSchoolLevelFilter('SMA')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                schoolLevelFilter === 'SMA'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Filter khusus jenjang SMA IT"
            >
              SMA
            </button>
          </div>

          {/* ============================================================== */}
          {/* UNIVERSAL GLOBAL SEARCH BAR (Active Real-Time Search Input)   */}
          {/* ============================================================== */}
          <div ref={searchContainerRef} className="relative">
            <div className="relative flex items-center w-48 sm:w-64 lg:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 text-teal-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                  setSelectedIndex(0);
                }}
                onFocus={() => {
                  setIsSearchOpen(true);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Cari alat, menu, aksi... (Ctrl+K)"
                className="w-full pl-8 pr-14 py-1.5 bg-slate-900/90 hover:bg-slate-800/90 focus:bg-slate-950 border border-slate-700/90 focus:border-teal-400 rounded-xl text-xs font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20 transition-all shadow-2xs"
              />

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-0.5 absolute right-2 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-slate-400 shadow-2xs pointer-events-none">
                  <span>Ctrl</span>
                  <span>K</span>
                </div>
              )}
            </div>

            {/* FLOATING REAL-TIME SEARCH RESULTS DROPDOWN */}
            {isSearchOpen && (
              <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-[92vw] max-w-[92vw] sm:w-[540px] lg:w-[680px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[75vh]">
                {/* Category filter pills inside dropdown */}
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryTab('ALL');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedCategoryTab === 'ALL'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    Semua ({searchResults.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryTab('ACTIONS');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedCategoryTab === 'ACTIONS'
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    🚀 Aksi Cepat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryTab('MENUS');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedCategoryTab === 'MENUS'
                        ? 'bg-teal-800 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    📁 Menu Navigasi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryTab('ITEMS');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedCategoryTab === 'ITEMS'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    📦 Inventaris Alat & Zat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryTab('PRACTICUM');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedCategoryTab === 'PRACTICUM'
                        ? 'bg-amber-700 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    📅 Jadwal & Jurnal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryTab('STUDENTS');
                      setSelectedIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedCategoryTab === 'STUDENTS'
                        ? 'bg-sky-800 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    👥 Data Siswa
                  </button>
                </div>

                {/* Results list */}
                <div ref={listContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-3">
                  {flattenedList.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Tidak ada hasil yang cocok dengan "{searchQuery}"
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Coba gunakan kata kunci lain seperti Fisika, Kimia, Mikroskop, Asam, Jangka Sorong, atau Tambah Barang.
                      </p>
                    </div>
                  ) : (
                    (() => {
                      let runningIdx = 0;
                      const order = [
                        { key: 'ACTIONS', label: '🚀 AKSI CEPAT & TOMBOL' },
                        { key: 'MENUS', label: '📁 MENU & HALAMAN SISTEM' },
                        { key: 'ITEMS', label: '📦 DATA INVENTARIS & ALAT/BAHAN' },
                        { key: 'PRACTICUM', label: '📅 JADWAL & JURNAL PRAKTIKUM' },
                        { key: 'STUDENTS', label: '👥 DATA SISWA & KELAS' },
                      ];

                      return order.map(({ key, label }) => {
                        const itemsInGroup = groupedResults[key];
                        if (!itemsInGroup || itemsInGroup.length === 0) return null;

                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                              <span>{label}</span>
                              <span className="font-mono text-[9.5px] text-slate-400">
                                {itemsInGroup.length} hasil
                              </span>
                            </div>

                            <div className="space-y-1">
                              {itemsInGroup.map((item) => {
                                const currentIndex = runningIdx++;
                                const isSelected = currentIndex === selectedIndex;

                                return (
                                  <button
                                    key={item.id}
                                    ref={(el) => {
                                      itemRefs.current[currentIndex] = el;
                                    }}
                                    type="button"
                                    onClick={() => onSelectSearchResult(item)}
                                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 group cursor-pointer ${
                                      isSelected
                                        ? 'bg-teal-50/90 border-teal-400 ring-2 ring-teal-500/30 text-teal-950 shadow-xs'
                                        : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                      <div
                                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 border shadow-2xs ${
                                          isSelected
                                            ? 'bg-white text-teal-800 border-teal-300'
                                            : 'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                      >
                                        {item.icon}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-bold text-slate-900 group-hover:text-teal-900 truncate">
                                            {item.title}
                                          </span>
                                          {item.badge && (
                                            <span
                                              className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${item.badge.bg} ${item.badge.textCol} ${item.badge.borderCol}`}
                                            >
                                              {item.badge.text}
                                            </span>
                                          )}
                                        </div>
                                        {item.subtitle && (
                                          <p className="text-[10.5px] text-slate-500 truncate mt-0.5">
                                            {item.subtitle}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {item.meta && (
                                        <span className="hidden sm:inline-block text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                          {item.meta}
                                        </span>
                                      )}
                                      <div
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                          isSelected
                                            ? 'bg-teal-700 text-white'
                                            : 'text-slate-300 group-hover:text-slate-500'
                                        }`}
                                      >
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>

                {/* Footer instructions */}
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>
                      <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold">
                        ↑
                      </kbd>{' '}
                      <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold">
                        ↓
                      </kbd>{' '}
                      Navigasi
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold">
                        Enter
                      </kbd>{' '}
                      Meluncur
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold">
                        Esc
                      </kbd>{' '}
                      Tutup
                    </span>
                  </div>
                  <span className="font-semibold text-teal-800 hidden sm:inline">
                    Universal Global Search · Realtime
                  </span>
                </div>
              </div>
            )}
          </div>

        {/* Google Sheets Real-Time Sync Button */}
        {onOpenGoogleSheetsSync && (
          <button
            type="button"
            onClick={onOpenGoogleSheetsSync}
            className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 font-bold text-xs shadow-2xs cursor-pointer ${
              gasSyncStatus.isSyncing
                ? 'border-emerald-500 bg-emerald-500/25 text-emerald-200 animate-pulse'
                : gasSyncStatus.isConnected
                ? 'border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
            }`}
            title={`Database Google Sheets: ${
              gasSyncStatus.isSyncing
                ? 'Sedang menyinkronkan data...'
                : gasSyncStatus.isConnected
                ? `Terhubung (${gasSyncStatus.lastSyncTime ? `Sinkron: ${gasSyncStatus.lastSyncTime}` : 'Online'})`
                : 'Koneksi Terputus'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <FileSpreadsheet className={`w-4 h-4 ${gasSyncStatus.isSyncing ? 'animate-spin text-emerald-300' : 'text-emerald-400'}`} />
              <span
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-slate-900 ${
                  gasSyncStatus.isSyncing
                    ? 'bg-amber-400 animate-ping'
                    : gasSyncStatus.isConnected
                    ? 'bg-emerald-400'
                    : 'bg-rose-500'
                }`}
              />
            </div>
            <span className="hidden lg:inline">Google Sheets</span>
            {gasSyncStatus.lastSyncTime && (
              <span className="hidden xl:inline text-[9.5px] font-mono text-emerald-300/80 font-normal">
                {gasSyncStatus.lastSyncTime}
              </span>
            )}
          </button>
        )}

        {/* Pindai QR Button */}
        <button
          onClick={onOpenQRScanner}
          className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-teal-500/40 bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 transition-colors flex items-center gap-1.5 font-bold text-xs shadow-2xs cursor-pointer"
          title="Pindai QR Code Alat/Bahan"
        >
          <QrCode className="w-4 h-4 text-teal-400" />
          <span className="hidden md:inline">Pindai QR</span>
        </button>

        {/* Low Stock Warning Bell */}
        <button
          onClick={onOpenLowStockModal}
          className={`relative min-h-[36px] min-w-[36px] p-2 rounded-xl border transition-colors flex items-center justify-center shadow-2xs ${
            lowStockItems.length > 0
              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              : 'border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Peringatan Stok Minimum"
        >
          <Bell className="w-4 h-4" />
          {lowStockItems.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-mono text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#0A192F] tabular-nums shadow-xs">
              {lowStockItems.length}
            </span>
          )}
        </button>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-700/90 bg-slate-900/90 hover:bg-slate-800 transition-colors min-h-[36px] shadow-2xs"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-lg object-cover border border-teal-500/50 shrink-0 shadow-2xs"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-bold flex items-center justify-center border border-teal-500/30 shadow-xs">
                {currentUser?.avatarInitials || 'ARC'}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white truncate max-w-[110px]">
                {currentUser?.name || 'Petugas'}
              </span>
              <span className="text-[10px] font-medium text-amber-400/90 truncate max-w-[110px]">
                {currentUser?.roleTitle || 'Petugas Lab'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Profile Dropdown Popover */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/90 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-100 mb-2">
                <div className="flex items-center gap-3">
                  {currentUser?.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-xl object-cover border-2 border-teal-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-teal-300 font-bold flex items-center justify-center text-sm shrink-0">
                      {currentUser?.avatarInitials || 'ARC'}
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Sesi Login Pengguna
                    </p>
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
                    <p className="text-[10.5px] font-mono text-teal-700 truncate">{currentUser?.email}</p>
                  </div>
                </div>

                {/* Button Ganti Foto Profil */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onOpenProfileModal) onOpenProfileModal();
                  }}
                  className="w-full mt-2.5 py-1.5 px-2 bg-white hover:bg-teal-50 text-teal-800 border border-teal-200/80 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-600" />
                  <span>Kelola Foto & Profil Saya</span>
                </button>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                {isAdmin ? (
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-teal-700" />
                      <span>Kelola Pengguna & Pengaturan</span>
                    </div>
                    <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kelola Pengguna</span>
                    </div>
                    <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200/80 font-bold px-1.5 py-0.5 rounded">
                      Khusus Admin
                    </span>
                  </div>
                )}

                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Sistem</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
};
