import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, LAB_DEFINITIONS, LabId, ItemCategory } from '../types/inventory';
import {
  Search,
  SlidersHorizontal,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  X,
  FileDown,
  Trash2,
  Edit3,
  QrCode,
  Info,
  FileSpreadsheet,
  Printer,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Building2,
  Lock,
} from 'lucide-react';
import { PrintReportHeader, PrintSignatures } from './PrintReportHeader';
import { getExpiryStatus } from '../utils/helpers';

interface InventoryTableProps {
  selectedLab: LabId | 'ALL';
  onSelectLab: (labId: LabId | 'ALL') => void;
  onOpenAddItem: () => void;
  onOpenEditItem: (item: InventoryItem) => void;
  onQuickTransaction: (item: InventoryItem, type: 'IN' | 'OUT') => void;
  onOpenTransfer: (item: InventoryItem) => void;
  onOpenItemDetail: (item: InventoryItem) => void;
  onOpenQRScanner: () => void;
  onOpenExcelImport?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  selectedLab,
  onSelectLab,
  onOpenAddItem,
  onOpenEditItem,
  onQuickTransaction,
  onOpenTransfer,
  onOpenItemDetail,
  onOpenQRScanner,
  onOpenExcelImport,
}) => {
  const {
    items,
    transactions,
    deleteItem,
    batchDeleteItems,
    batchAssignItemsToLab,
    updateMinStockThreshold,
    settings,
    schoolLevelFilter,
    currentUser,
    isAdmin,
    isHeadOfLab,
    canManageUsers,
    showToast,
  } = useInventory();

  // Strict Role-Based Access Control (Admin / Kepala Lab Only)
  const isActualAdmin = Boolean(
    isAdmin ||
    isHeadOfLab ||
    currentUser?.role === 'KEPALA_LAB' ||
    (currentUser as any)?.role === 'admin' ||
    canManageUsers ||
    (currentUser?.email || '').toLowerCase().trim() === 'ilham.nurkholis114@guru.sma.belajar.id'
  );

  // Bulk Selection & Batch Actions State
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [batchTargetLab, setBatchTargetLab] = useState<LabId | 'ALL'>('KIMIA');

  // State Hapus Data Inventaris (Manual Satu Persatu)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const handleConfirmDelete = () => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Khusus Admin)',
        message: 'Akses khusus Kepala Lab (Admin). Akun Guru dan Laboran tidak memiliki izin menghapus barang inventaris.',
      });
      setItemToDelete(null);
      return;
    }
    if (!itemToDelete) return;
    const name = itemToDelete.name;
    const code = itemToDelete.code;
    deleteItem(itemToDelete.id);
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(itemToDelete.id);
      return next;
    });
    setItemToDelete(null);
    showToast({
      type: 'success',
      title: 'Data Inventaris Berhasil Dihapus',
      message: `Barang "${name}" (${code}) telah berhasil dihapus dari daftar inventaris.`,
      duration: 4000,
    });
  };

  const handleConfirmBatchDelete = () => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Khusus Admin)',
        message: 'Akses khusus Kepala Lab (Admin). Akun Guru dan Laboran tidak memiliki izin menghapus barang inventaris secara massal.',
      });
      setIsBatchDeleteModalOpen(false);
      return;
    }
    const res = batchDeleteItems(Array.from(selectedItemIds));
    if (res.success) {
      setIsBatchDeleteModalOpen(false);
      setSelectedItemIds(new Set());
    }
  };

  const handleConfirmBatchAssign = () => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Khusus Admin)',
        message: 'Akses khusus Kepala Lab (Admin). Akun Guru dan Laboran tidak memiliki izin penugasan lab massal.',
      });
      setIsBatchAssignModalOpen(false);
      return;
    }
    const res = batchAssignItemsToLab(Array.from(selectedItemIds), batchTargetLab);
    if (res.success) {
      setIsBatchAssignModalOpen(false);
      setSelectedItemIds(new Set());
    }
  };

  // Advanced Filters State
  const [searchNameQuery, setSearchNameQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedConditionFilter, setSelectedConditionFilter] = useState<
    'ALL' | 'LOW_STOCK' | 'GOOD' | 'CALIBRATION' | 'HAS_DAMAGE' | 'EXPIRED'
  >('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Categories list
  const categories: ItemCategory[] = [
    'Alat Ukur & Neraca',
    'Alat Gelas & Keramik',
    'Bahan Kimia & Reagen',
    'Instrumen Optik',
    'Model & Preparat Biologi',
    'Kit Praktikum Terpadu',
    'Perkakas & Keselamatan Kerja',
  ];

  // Helper: check if item has transactions within date range
  const itemIdsWithTransactionsInRange = useMemo(() => {
    if (!startDateFilter && !endDateFilter) return null;

    const start = startDateFilter ? new Date(startDateFilter).getTime() : 0;
    const end = endDateFilter ? new Date(endDateFilter).getTime() + 86400000 : Infinity;

    const matchedIds = new Set<string>();
    transactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= start && txTime <= end) {
        matchedIds.add(tx.itemId);
      }
    });
    return matchedIds;
  }, [transactions, startDateFilter, endDateFilter]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 0. School Level Filter (from TopBar)
      if (schoolLevelFilter === 'SMP') {
        const isSmp =
          item.primaryLab === 'SMP_TERPADU' ||
          item.primaryLab === 'ALL' ||
          (item.distribution.SMP_TERPADU || 0) > 0;
        if (!isSmp) return false;
      } else if (schoolLevelFilter === 'SMA') {
        const isSma =
          item.primaryLab === 'FISIKA' ||
          item.primaryLab === 'KIMIA' ||
          item.primaryLab === 'BIOLOGI' ||
          item.primaryLab === 'ALL' ||
          (item.distribution.FISIKA || 0) > 0 ||
          (item.distribution.KIMIA || 0) > 0 ||
          (item.distribution.BIOLOGI || 0) > 0;
        if (!isSma) return false;
      }

      // 1. Lab filter: if specific lab selected, either primaryLab === lab or distribution in that lab > 0
      if (selectedLab !== 'ALL') {
        const hasStockInLab = (item.distribution[selectedLab] || 0) > 0;
        const isPrimaryLab = item.primaryLab === selectedLab || item.primaryLab === 'ALL';
        if (!hasStockInLab && !isPrimaryLab) {
          return false;
        }
      }

      // 2. Name / Code search
      if (searchNameQuery.trim()) {
        const query = searchNameQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(query);
        const matchCode = item.code.toLowerCase().includes(query);
        const matchBrand = item.brandOrSpec.toLowerCase().includes(query);
        const matchRack = item.storageRack.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchBrand && !matchRack) {
          return false;
        }
      }

      // 3. Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // 4. Condition / Calibration / Expired filter
      if (selectedConditionFilter === 'LOW_STOCK') {
        if (item.currentTotalStock > item.minStockAlert) return false;
      } else if (selectedConditionFilter === 'GOOD') {
        if (item.calibrationStatus === 'Rusak' || item.calibrationStatus === 'Perlu Kalibrasi' || item.conditionHeavyDamage > 0) {
          return false;
        }
      } else if (selectedConditionFilter === 'CALIBRATION') {
        if (item.calibrationStatus !== 'Perlu Kalibrasi') return false;
      } else if (selectedConditionFilter === 'HAS_DAMAGE') {
        if (
          item.calibrationStatus !== 'Rusak' &&
          item.conditionLightDamage === 0 &&
          item.conditionHeavyDamage === 0
        ) {
          return false;
        }
      } else if (selectedConditionFilter === 'EXPIRED') {
        if (!item.expiredDate) return false;
        const expTime = new Date(item.expiredDate).getTime();
        const now = new Date().getTime();
        // Expired or expiring within 90 days
        if (expTime - now > 90 * 86400000) return false;
      }

      // 5. Date range filter for in/out transactions
      if (itemIdsWithTransactionsInRange !== null) {
        if (!itemIdsWithTransactionsInRange.has(item.id)) {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    schoolLevelFilter,
    selectedLab,
    searchNameQuery,
    selectedCategory,
    selectedConditionFilter,
    itemIdsWithTransactionsInRange,
  ]);

  const resetAllFilters = () => {
    setSearchNameQuery('');
    onSelectLab('ALL');
    setSelectedCategory('ALL');
    setSelectedConditionFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const hasActiveFilters =
    searchNameQuery !== '' ||
    selectedLab !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedConditionFilter !== 'ALL' ||
    startDateFilter !== '' ||
    endDateFilter !== '';

  // Pagination for Ultra-Smooth Anti-Lag Rendering
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Auto reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchNameQuery,
    selectedLab,
    selectedCategory,
    selectedConditionFilter,
    startDateFilter,
    endDateFilter,
    schoolLevelFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    if (pageSize >= 9999) return filteredItems;
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Bulk Selection Helpers
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllPaginatedSelected = useMemo(() => {
    if (paginatedItems.length === 0) return false;
    return paginatedItems.every((item) => selectedItemIds.has(item.id));
  }, [paginatedItems, selectedItemIds]);

  const isSomePaginatedSelected = useMemo(() => {
    if (paginatedItems.length === 0) return false;
    return (
      paginatedItems.some((item) => selectedItemIds.has(item.id)) &&
      !isAllPaginatedSelected
    );
  }, [paginatedItems, selectedItemIds, isAllPaginatedSelected]);

  const handleToggleSelectAllPaginated = () => {
    if (isAllPaginatedSelected) {
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.delete(item.id));
        return next;
      });
    } else {
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.add(item.id));
        return next;
      });
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedItemIds(new Set(filteredItems.map((item) => item.id)));
  };

  const handleClearSelection = () => {
    setSelectedItemIds(new Set());
  };

  // Selected items objects for modal previews
  const selectedItemsList = useMemo(() => {
    return items.filter((item) => selectedItemIds.has(item.id));
  }, [items, selectedItemIds]);

  return (
    <div className="space-y-4">
      {/* Official Printable Report Header */}
      <PrintReportHeader
        title="Laporan Rekapitulasi Inventaris Alat & Bahan Laboratorium"
        subtitle={`Daftar Lengkap Stok, Mutasi, dan Kondisi Fisik Alat Praktikum TA ${settings.tahun_ajaran || '2025/2026'}`}
        selectedLab={selectedLab}
        extraMetadata={[
          { label: 'Total Item Terfilter', value: `${filteredItems.length} barang` },
          { label: 'Filter Kategori', value: selectedCategory === 'ALL' ? 'Semua Kategori' : selectedCategory },
        ]}
      />

      {/* Search & Top Action Bar (hidden on print) */}
      <div className="no-print bg-white/95 backdrop-blur-xs p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama barang, kode inventaris, merk, spesifikasi, atau rak..."
              value={searchNameQuery}
              onChange={(e) => setSearchNameQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
            />
            {searchNameQuery && (
              <button
                onClick={() => setSearchNameQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.print()}
              className="min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-2xs"
              title="Cetak laporan data inventaris ke format PDF atau printer fisik"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Laporan</span>
            </button>

            <button
              onClick={onOpenQRScanner}
              className="min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl border border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100 flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-2xs"
            >
              <QrCode className="w-4 h-4 text-teal-700" />
              <span>Pindai QR</span>
            </button>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-2xs ${
                showAdvancedFilters || hasActiveFilters
                  ? 'border-teal-600 bg-teal-50 text-teal-900'
                  : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-teal-700" />
              <span>Filter Lanjutan</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
              )}
            </button>

            {onOpenExcelImport && (
              <button
                onClick={onOpenExcelImport}
                className="min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl border border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100 flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-2xs"
                title="Import data inventaris dari file Excel multi-sheet (Fisika, Kimia, Biologi)"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                <span>Import Excel</span>
              </button>
            )}

            <button
              onClick={onOpenAddItem}
              className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap hover:shadow-md"
            >
              <Plus className="w-4 h-4 text-teal-400" />
              <span>+ Tambah Barang Baru</span>
            </button>
          </div>
        </div>

        {/* Laboratory Filter Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1.5 no-scrollbar border-t border-slate-100">
          <button
            onClick={() => onSelectLab('ALL')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedLab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
            }`}
          >
            Seluruh Lab IPA Terpadu ({items.length})
          </button>
          {(Object.keys(LAB_DEFINITIONS) as LabId[]).map((labId) => {
            const lab = LAB_DEFINITIONS[labId];
            const isSelected = selectedLab === labId;
            const count = items.filter(
              (i) => i.primaryLab === labId || (i.distribution[labId] || 0) > 0
            ).length;

            return (
              <button
                key={labId}
                onClick={() => onSelectLab(labId)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
              >
                {lab.shortName} ({count})
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50/70 p-3 rounded-xl animate-in fade-in duration-150">
            {/* Filter 1: Kategori Barang */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Kategori Barang
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 2: Kondisi, Kalibrasi & Status Stok */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Kondisi, Kalibrasi & Stok
              </label>
              <select
                value={selectedConditionFilter}
                onChange={(e) => setSelectedConditionFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-700"
              >
                <option value="ALL">Semua Status & Kondisi</option>
                <option value="GOOD">Kondisi: Bagus / Siap Pakai</option>
                <option value="CALIBRATION">Status: Perlu Kalibrasi / Tera Titik Nol</option>
                <option value="HAS_DAMAGE">Status: Terdapat Kerusakan / Rusak</option>
                <option value="EXPIRED">Bahan Kimia: Kadaluarsa / Mendekati Expired</option>
                <option value="LOW_STOCK">Peringatan: Stok &lt;= Batas Minimum</option>
              </select>
            </div>

            {/* Filter 3: Rentang Tanggal Mutasi Keluar/Masuk */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Rentang Tanggal Keluar/Masuk</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <span className="text-slate-400 text-xs">s/d</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500">
                  Ditemukan <strong>{filteredItems.length}</strong> barang dari filter aktif.
                </span>
                <button
                  onClick={resetAllFilters}
                  className="text-emerald-800 font-semibold hover:underline flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset Semua Filter</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Table View (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs print-clean">
        {/* Table Header Summary / Bulk Action Banner */}
        {selectedItemIds.size > 0 ? (
          <div className="no-print px-4 py-3 bg-teal-50/95 border-b border-teal-200 flex flex-wrap items-center justify-between gap-3 text-xs text-teal-950 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold bg-teal-700 text-white shadow-2xs">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{selectedItemIds.size} Barang Terpilih</span>
              </span>
              {filteredItems.length > selectedItemIds.size && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-teal-800 hover:text-teal-950 font-semibold underline underline-offset-2 transition-colors"
                >
                  Pilih Seluruh {filteredItems.length} Hasil Filter
                </button>
              )}
              <span className="text-teal-300">·</span>
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Batalkan Pilihan
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Batch Action: Assign to Lab */}
              {isActualAdmin ? (
                <button
                  type="button"
                  onClick={() => setIsBatchAssignModalOpen(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tugaskan seluruh barang terpilih ke laboratorium tertentu"
                >
                  <Building2 className="w-3.5 h-3.5 text-teal-700" />
                  <span>Tugaskan ke Lab</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 bg-slate-100 text-slate-400 font-medium rounded-xl border border-slate-200 cursor-not-allowed opacity-75 flex items-center gap-1.5"
                  title="Akses khusus Kepala Lab (Admin)"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tugaskan ke Lab (Admin)</span>
                </button>
              )}

              {/* Batch Action: Delete Selected */}
              {isActualAdmin ? (
                <button
                  type="button"
                  onClick={() => setIsBatchDeleteModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Hapus massal barang terpilih dari inventaris"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih ({selectedItemIds.size})</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 bg-slate-100 text-slate-400 font-medium rounded-xl border border-slate-200 cursor-not-allowed opacity-75 flex items-center gap-1.5"
                  title="Akses khusus Kepala Lab (Admin)"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hapus Terpilih (Admin)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="no-print px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              <span>Menampilkan </span>
              <strong className="font-mono text-slate-900">{filteredItems.length}</strong>
              <span> barang inventaris </span>
              {selectedLab !== 'ALL' && (
                <span className="font-semibold text-emerald-800">
                  · {LAB_DEFINITIONS[selectedLab].name}
                </span>
              )}
            </div>
            <div className="hidden sm:block text-slate-500 text-[11px]">
              Total Otomatis: Stok = Awal + Masuk - Keluar
            </div>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Tidak ada barang yang cocok</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian, rentang tanggal, atau pilih laboratorium lainnya.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table (hidden on mobile, force visible on print) */}
            <div className="hidden lg:block overflow-x-auto print-show-block">
              <table className="w-full text-left border-collapse text-xs print-table">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="no-print py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllPaginatedSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomePaginatedSelected;
                        }}
                        onChange={handleToggleSelectAllPaginated}
                        className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500 cursor-pointer accent-teal-700"
                        title={isAllPaginatedSelected ? 'Batalkan pilihan halaman ini' : 'Pilih semua barang di halaman ini'}
                        aria-label="Pilih semua barang di halaman ini"
                      />
                    </th>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-4">Kode & Nama Barang</th>
                    <th className="py-3 px-4">Lab Utama</th>
                    <th className="py-3 px-3 text-right">Stok Awal</th>
                    <th className="py-3 px-3 text-right">Masuk (+)</th>
                    <th className="py-3 px-3 text-right">Keluar (-)</th>
                    <th className="py-3 px-4 text-right">Total Stok</th>
                    <th className="py-3 px-3 text-center">Batas Min</th>
                    <th className="py-3 px-4">Kondisi</th>
                    <th className="no-print py-3 px-4 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.map((item, index) => {
                    const isUnderMin = item.currentTotalStock <= item.minStockAlert;
                    const isSelected = selectedItemIds.has(item.id);
                    const labStockDisplay =
                      selectedLab === 'ALL'
                        ? item.currentTotalStock
                        : item.distribution[selectedLab] || 0;
                    const itemIndex = (currentPage - 1) * pageSize + index + 1;
                    const expiryInfo = getExpiryStatus(item.expiredDate);

                    return (
                      <tr
                        key={item.id}
                        id={`item-row-${item.id}`}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected
                            ? 'bg-teal-50/60 font-medium'
                            : isUnderMin
                            ? 'bg-amber-50/20'
                            : ''
                        }`}
                      >
                        <td className="no-print py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectItem(item.id)}
                            className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500 cursor-pointer accent-teal-700"
                            aria-label={`Pilih ${item.name}`}
                          />
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-400 tabular-nums">
                          {itemIndex}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {isUnderMin && (
                              <span
                                title="Stok mencapai atau di bawah batas minimum"
                                className="text-amber-600 inline-flex items-center"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="font-mono text-slate-600 font-semibold">{item.code}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.storageRack}</span>
                          </div>

                          {/* Indikator Tanggal Kadaluarsa (Bahan Kimia / Reagen) */}
                          {item.category === 'Bahan Kimia & Reagen' && (
                            <div className="mt-1 flex items-center gap-1.5">
                              {item.expiredDate ? (
                                expiryInfo.isExpired ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    <span>Kadaluarsa: {item.expiredDate}</span>
                                  </span>
                                ) : expiryInfo.isExpiringSoon ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Mendekati Exp: {item.expiredDate} ({expiryInfo.daysRemaining} hari)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-teal-800 bg-teal-50 border border-teal-200">
                                    Exp: {item.expiredDate}
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  Exp: Belum diatur
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-xs font-medium text-slate-700">
                            {item.primaryLab === 'ALL'
                              ? 'Seluruh Lab'
                              : LAB_DEFINITIONS[item.primaryLab]?.shortName || item.primaryLab}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                          {item.initialStock2026}
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                          +{item.totalIn}
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700 font-semibold">
                          -{item.totalOut}
                        </td>

                        {/* Automatic total */}
                        <td className="py-3 px-4 text-right">
                          <div
                            className={`font-mono font-bold text-sm tabular-nums ${
                              isUnderMin ? 'text-amber-800' : 'text-slate-900'
                            }`}
                          >
                            {selectedLab === 'ALL' ? item.currentTotalStock : labStockDisplay}{' '}
                            <span className="text-xs font-sans font-normal text-slate-500">
                              {item.unit}
                            </span>
                          </div>
                          {selectedLab !== 'ALL' && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Total Gabungan: {item.currentTotalStock}
                            </div>
                          )}
                        </td>

                        {/* Minimum Stock Alert Threshold */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded ${
                              isUnderMin
                                ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                : 'text-slate-600'
                            }`}
                          >
                            {item.minStockAlert} {item.unit}
                          </span>
                        </td>

                        {/* Status Kondisi & Kalibrasi */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div>
                              {item.calibrationStatus === 'Perlu Kalibrasi' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Perlu Kalibrasi</span>
                                </span>
                              ) : item.calibrationStatus === 'Rusak' ||
                                (item.conditionHeavyDamage > 0 && item.conditionGood === 0) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>Rusak</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Bagus</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-slate-500 font-mono">
                              Baik: <strong>{item.conditionGood}</strong>
                              {(item.conditionLightDamage > 0 || item.conditionHeavyDamage > 0) && (
                                <span className="text-amber-800 ml-1">
                                  (R:{item.conditionLightDamage + item.conditionHeavyDamage})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Action buttons (hidden on print) */}
                        <td className="no-print py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenItemDetail(item)}
                              title="Lihat Detail & QR Label"
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-emerald-100 hover:text-emerald-900 transition-colors"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onQuickTransaction(item, 'IN')}
                              title="Catat Stok Masuk"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                            >
                              <ArrowDownLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onQuickTransaction(item, 'OUT')}
                              title="Catat Stok Keluar"
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onOpenTransfer(item)}
                              title="Transfer Antar Lab"
                              className="p-1.5 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 transition-colors"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onOpenEditItem(item)}
                              title="Edit Data Barang"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {isActualAdmin ? (
                              <button
                                onClick={() => setItemToDelete(item)}
                                title="Hapus Barang Inventaris (Khusus Admin / Kepala Lab)"
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="Akses khusus Kepala Lab (Admin)"
                                className="p-1.5 rounded-lg text-slate-300 opacity-60 cursor-not-allowed bg-slate-50 border border-slate-200"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (shown on smartphone screens, hidden on print) */}
            <div className="no-print lg:hidden divide-y divide-slate-100">
              {paginatedItems.map((item) => {
                const isUnderMin = item.currentTotalStock <= item.minStockAlert;
                const isSelected = selectedItemIds.has(item.id);
                const labStockDisplay =
                  selectedLab === 'ALL'
                    ? item.currentTotalStock
                    : item.distribution[selectedLab] || 0;

                return (
                  <div
                    key={item.id}
                    className={`p-4 space-y-3 transition-colors ${
                      isSelected
                        ? 'bg-teal-50/70 border-l-4 border-l-teal-600'
                        : isUnderMin
                        ? 'bg-amber-50/30'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectItem(item.id)}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500 cursor-pointer accent-teal-700 shrink-0"
                          aria-label={`Pilih ${item.name}`}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-slate-500">
                              {item.code}
                            </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-xs font-medium text-emerald-800">
                            {item.primaryLab === 'ALL'
                              ? 'Semua Lab'
                              : LAB_DEFINITIONS[item.primaryLab]?.shortName}
                          </span>
                          {isUnderMin && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                              Stok Kritis
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{item.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.category} · Rak: {item.storageRack}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                        <div className="text-[11px] text-slate-400">Total Stok</div>
                        <div
                          className={`font-mono text-lg font-bold tabular-nums ${
                            isUnderMin ? 'text-amber-800' : 'text-slate-900'
                          }`}
                        >
                          {labStockDisplay}{' '}
                          <span className="text-xs font-sans font-normal text-slate-500">
                            {item.unit}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Batas Min: {item.minStockAlert}
                        </div>
                      </div>
                    </div>

                    {/* In / Out / Awal Stats Strip */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Stok Awal</div>
                        <div className="font-mono font-bold text-slate-700">{item.initialStock2026}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Masuk (+)</div>
                        <div className="font-mono font-bold text-emerald-700">+{item.totalIn}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Keluar (-)</div>
                        <div className="font-mono font-bold text-amber-700">-{item.totalOut}</div>
                      </div>
                    </div>

                    {/* Action buttons (min 44px hitboxes for touch) */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                      <button
                        onClick={() => onOpenItemDetail(item)}
                        className="min-h-[44px] py-2 bg-slate-100 text-slate-800 hover:bg-emerald-100 font-semibold text-[11px] rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors"
                        title="Lihat QR Code & Riwayat Mutasi"
                      >
                        <QrCode className="w-4 h-4 text-emerald-800" />
                        <span>QR Detail</span>
                      </button>
                      <button
                        onClick={() => onQuickTransaction(item, 'IN')}
                        className="min-h-[44px] py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px] rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors"
                      >
                        <ArrowDownLeft className="w-4 h-4" />
                        <span>Masuk</span>
                      </button>
                      <button
                        onClick={() => onQuickTransaction(item, 'OUT')}
                        className="min-h-[44px] py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold text-[11px] rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Keluar</span>
                      </button>
                      <button
                        onClick={() => onOpenTransfer(item)}
                        className="min-h-[44px] py-2 bg-sky-50 text-sky-800 hover:bg-sky-100 font-semibold text-[11px] rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Transfer</span>
                      </button>
                      <button
                        onClick={() => onOpenEditItem(item)}
                        className="min-h-[44px] py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      {isActualAdmin ? (
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="min-h-[44px] py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[11px] rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors"
                          title="Hapus Barang Inventaris (Khusus Admin / Kepala Lab)"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Hapus</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="min-h-[44px] py-2 bg-slate-50 text-slate-300 font-semibold text-[11px] rounded-lg flex flex-col items-center justify-center gap-0.5 opacity-60 cursor-not-allowed"
                          title="Akses khusus Kepala Lab (Admin)"
                        >
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span>Terkunci</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls Bar (Ultra-Smooth Anti-Lag Table Browsing) */}
            {filteredItems.length > 25 && (
              <div className="no-print px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <span>Menampilkan</span>
                  <span className="font-bold text-slate-800">
                    {Math.min((currentPage - 1) * pageSize + 1, filteredItems.length)} -{' '}
                    {Math.min(currentPage * pageSize, filteredItems.length)}
                  </span>
                  <span>dari</span>
                  <span className="font-bold text-slate-800">{filteredItems.length}</span>
                  <span>barang</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 mr-2">
                    <span className="text-[11px] text-slate-500">Baris:</span>
                    {[25, 50, 100].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setPageSize(sz);
                          setCurrentPage(1);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                          pageSize === sz
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-mono font-bold text-slate-700">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Data Inventaris (Manual Satu Persatu) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Data Inventaris?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data barang inventaris ini secara manual dari katalog aktif?
                </p>
              </div>
              <button
                onClick={() => setItemToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detail Barang Box */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Kode Barang:</span>
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {itemToDelete.code}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 font-medium shrink-0">Nama Barang:</span>
                  <span className="font-bold text-slate-900 text-right">
                    {itemToDelete.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-medium">Kategori:</span>
                  <span className="text-slate-700 font-medium">
                    {itemToDelete.category}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-medium">Lokasi Lab:</span>
                  <span className="font-semibold text-teal-800">
                    {itemToDelete.primaryLab === 'ALL'
                      ? 'Semua Laboratorium'
                      : LAB_DEFINITIONS[itemToDelete.primaryLab]?.name || itemToDelete.primaryLab}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-medium">Total Stok Saat Ini:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {itemToDelete.currentTotalStock} {itemToDelete.unit}
                  </span>
                </div>
                {itemToDelete.storageRack && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-medium">Tempat Simpan:</span>
                    <span className="text-slate-600">
                      {itemToDelete.storageRack}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Penghapusan ini akan menghapus data barang dari tabel inventaris aktif secara permanen.
                </span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Barang Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Bulk Action Pill (Screen sticky when items are selected) */}
      {selectedItemIds.size > 0 && (
        <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 sm:gap-5 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[95vw]">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center font-bold text-xs">
              {selectedItemIds.size}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-100 hidden sm:inline">
              Barang Terpilih
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            {isActualAdmin ? (
              <button
                type="button"
                onClick={() => setIsBatchAssignModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white font-bold text-xs rounded-xl border border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Tugaskan seluruh barang terpilih ke lab tertentu"
              >
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Tugaskan Lab</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-3 py-1.5 bg-slate-800/60 text-slate-500 font-medium text-xs rounded-xl border border-slate-700 cursor-not-allowed flex items-center gap-1.5"
                title="Akses khusus Kepala Lab (Admin)"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Tugaskan Lab</span>
              </button>
            )}

            {isActualAdmin ? (
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Hapus massal barang terpilih"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus ({selectedItemIds.size})</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-3 py-1.5 bg-slate-800/60 text-slate-500 font-medium text-xs rounded-xl border border-slate-700 cursor-not-allowed flex items-center gap-1.5"
                title="Akses khusus Kepala Lab (Admin)"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Hapus Terpilih</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs transition-colors rounded-lg hover:bg-slate-800 cursor-pointer"
              title="Batalkan seluruh pilihan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal 1: Konfirmasi Hapus Massal (Batch Delete) */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Header Modal */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                    Aksi Massal Admin
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    {selectedItemIds.size} Barang
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Hapus {selectedItemIds.size} Barang Inventaris?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus seluruh data barang inventaris terpilih secara massal dari katalog aktif?
                </p>
              </div>
              <button
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & Item Preview */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Daftar Barang Terpilih ({selectedItemIds.size} Item):
                </label>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2 text-xs">
                  {selectedItemsList.slice(0, 15).map((it) => (
                    <div key={it.id} className="py-2 px-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{it.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-slate-600 font-semibold">{it.code}</span>
                          <span>·</span>
                          <span>{it.category}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono text-[11px]">
                        <span className="font-bold text-slate-800">{it.currentTotalStock}</span>{' '}
                        <span className="text-slate-500">{it.unit}</span>
                      </div>
                    </div>
                  ))}
                  {selectedItemsList.length > 15 && (
                    <div className="py-2 px-3 text-center text-slate-500 italic text-[11px] bg-slate-100/60 rounded-xl">
                      ... serta {selectedItemsList.length - 15} barang inventaris lainnya.
                    </div>
                  )}
                </div>
              </div>

              {!isActualAdmin ? (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs leading-relaxed">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Akses Terkunci (Khusus Admin / Kepala Lab)</strong>
                    <span>Akun Anda tidak memiliki hak akses untuk mengeksekusi penghapusan data inventaris secara massal.</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Penghapusan ini bersifat permanen. Riwayat mutasi lama tetap diarsipkan dalam database untuk audit berita acara.
                  </span>
                </div>
              )}
            </div>

            {/* Tombol Aksi */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              {isActualAdmin && (
                <button
                  type="button"
                  onClick={handleConfirmBatchDelete}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Ya, Hapus {selectedItemIds.size} Barang</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Penugasan Lab Massal (Batch Assign to Lab) */}
      {isBatchAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Header Modal */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                    Aksi Massal Admin
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    {selectedItemIds.size} Barang
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Tugaskan ke Laboratorium
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Pilih laboratorium tujuan untuk menugaskan {selectedItemIds.size} barang terpilih secara terpusat.
                </p>
              </div>
              <button
                onClick={() => setIsBatchAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pilihan Laboratorium */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Pilih Laboratorium Tujuan:
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'KIMIA' as const,
                      name: 'Laboratorium Kimia (SMA)',
                      desc: 'Gedung B Lt. 1 · PJ: Ilham Nurkholis Majid, S. Pd., Gr.',
                      badge: 'SMA',
                    },
                    {
                      id: 'FISIKA' as const,
                      name: 'Laboratorium Fisika (SMA)',
                      desc: 'Gedung B Lt. 2 · PJ: Oktaviawan Arif Sudarsono, M. Pd., Gr.',
                      badge: 'SMA',
                    },
                    {
                      id: 'BIOLOGI' as const,
                      name: 'Laboratorium Biologi (SMA)',
                      desc: 'Gedung B Lt. 1 · PJ: Siti Aminatuh Juhriah, M. Si., Gr.',
                      badge: 'SMA',
                    },
                    {
                      id: 'SMP_TERPADU' as const,
                      name: 'Laboratorium IPA Terpadu (SMP)',
                      desc: 'Gedung B Lt. 1 & 2 · PJ: Farkhatul Amaliya, S. Pd',
                      badge: 'SMP',
                    },
                    {
                      id: 'ALL' as const,
                      name: 'Seluruh Laboratorium (Umum / Bersama)',
                      desc: 'Inventaris gabungan bebas dipinjam antar unit SMP & SMA',
                      badge: 'Umum',
                    },
                  ].map((target) => (
                    <label
                      key={target.id}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        batchTargetLab === target.id
                          ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="batchTargetLab"
                        checked={batchTargetLab === target.id}
                        onChange={() => setBatchTargetLab(target.id)}
                        className="mt-1 w-4 h-4 text-teal-700 focus:ring-teal-600 accent-teal-700 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{target.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-700">
                            {target.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{target.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {!isActualAdmin ? (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs leading-relaxed">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Akses Terkunci (Khusus Admin / Kepala Lab)</strong>
                    <span>Akun Anda tidak memiliki hak akses untuk memindahkan atau menugaskan inventaris secara massal.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed space-y-1">
                  <p className="font-semibold text-slate-800">
                    Dampak Perubahan Penugasan Lab:
                  </p>
                  <p>
                    • Kolom <strong>Lab Utama</strong> pada {selectedItemIds.size} barang terpilih akan dialihkan ke laboratorium tujuan.
                  </p>
                  <p>
                    • Alokasi stok inventaris akan dipusatkan pada laboratorium tujuan yang dipilih untuk konsistensi kartu stok.
                  </p>
                </div>
              )}
            </div>

            {/* Tombol Aksi */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBatchAssignModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              {isActualAdmin && (
                <button
                  type="button"
                  onClick={handleConfirmBatchAssign}
                  className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Tugaskan {selectedItemIds.size} Barang</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Signatures for Printed Report */}
      <PrintSignatures selectedLab={selectedLab} />
    </div>
  );
};
