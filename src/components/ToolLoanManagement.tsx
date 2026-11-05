import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  ToolLoanRecord,
  LoanStatus,
  LoanBorrowerType,
  LAB_DEFINITIONS,
  LabId,
} from '../types/inventory';
import {
  Boxes,
  CalendarDays,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  FileDown,
  Trash2,
  Clock,
  User,
  GraduationCap,
  FlaskConical,
  X,
  FileSpreadsheet,
  Check,
  AlertCircle,
  ShieldAlert,
  Shield,
  Lock,
} from 'lucide-react';
import { PrintReportHeader, PrintSignatures } from './PrintReportHeader';

export const ToolLoanManagement: React.FC = () => {
  const {
    loans,
    items,
    currentUser,
    addToolLoan,
    returnToolLoan,
    deleteToolLoan,
    schoolLevelFilter,
    settings,
    isAdmin,
    isHeadOfLab,
    showToast,
  } = useInventory();

  const isActualAdmin = Boolean(
    isAdmin ||
    isHeadOfLab ||
    currentUser?.role === 'KEPALA_LAB' ||
    (currentUser as any)?.role === 'admin' ||
    (currentUser?.email || '').toLowerCase().trim() === 'ilham.nurkholis114@guru.sma.belajar.id'
  );

  // Tab & Filters
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | LoanStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLab, setSelectedLab] = useState<LabId | 'ALL'>('ALL');
  const [selectedBorrowerType, setSelectedBorrowerType] = useState<'ALL' | LoanBorrowerType>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [returningLoan, setReturningLoan] = useState<ToolLoanRecord | null>(null);
  const [receiptLoan, setReceiptLoan] = useState<ToolLoanRecord | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<ToolLoanRecord | null>(null);

  // Form: Tambah Peminjaman
  const [selectedItemId, setSelectedItemId] = useState('');
  const [loanQty, setLoanQty] = useState(1);
  const [borrowerType, setBorrowerType] = useState<LoanBorrowerType>('SISWA');
  const [schoolLevel, setSchoolLevel] = useState<'SMP' | 'SMA'>(
    schoolLevelFilter === 'SMP' ? 'SMP' : 'SMA'
  );
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerClassOrDept, setBorrowerClassOrDept] = useState('Kelas XII MIPA 1');
  const [targetLab, setTargetLab] = useState<LabId>('FISIKA');
  const [borrowDate, setBorrowDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedReturnDate, setExpectedReturnDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [purpose, setPurpose] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  // Form: Pengembalian & Laporan Rusak
  const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnCondition, setReturnCondition] = useState<
    'Baik' | 'Rusak Ringan' | 'Pecah / Rusak Berat' | 'Hilang'
  >('Baik');
  const [damagedQty, setDamagedQty] = useState(0);
  const [damageIncidentReport, setDamageIncidentReport] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // 1. Status Tab filter
      if (activeFilterTab !== 'ALL' && loan.status !== activeFilterTab) {
        return false;
      }

      // 2. School level filter (from TopBar or custom)
      if (schoolLevelFilter !== 'ALL' && loan.schoolLevel !== schoolLevelFilter) {
        return false;
      }

      // 3. Lab filter
      if (selectedLab !== 'ALL' && loan.targetLab !== selectedLab) {
        return false;
      }

      // 4. Borrower type
      if (selectedBorrowerType !== 'ALL' && loan.borrowerType !== selectedBorrowerType) {
        return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = loan.borrowerName.toLowerCase().includes(q);
        const matchItem = loan.itemName.toLowerCase().includes(q);
        const matchCode = loan.code.toLowerCase().includes(q);
        const matchClass = loan.borrowerClassOrDept.toLowerCase().includes(q);
        const matchPurpose = loan.purpose.toLowerCase().includes(q);
        if (!matchName && !matchItem && !matchCode && !matchClass && !matchPurpose) {
          return false;
        }
      }

      return true;
    });
  }, [loans, activeFilterTab, schoolLevelFilter, selectedLab, selectedBorrowerType, searchQuery]);

  // Statistics
  const activeLoans = loans.filter((l) => l.status === 'DIPINJAM');
  const returnedGood = loans.filter((l) => l.status === 'KEMBALI_BAIK');
  const brokenLoans = loans.filter((l) => l.status === 'KEMBALI_RUSAK_PECAH');
  const totalUnitsBorrowed = activeLoans.reduce((sum, l) => sum + l.quantity, 0);

  // Selected item info for add modal
  const currentSelectedItem = items.find((i) => i.id === selectedItemId);

  const handleOpenAddModal = () => {
    if (items.length > 0) {
      setSelectedItemId(items[0].id);
      setTargetLab(items[0].primaryLab === 'ALL' ? 'FISIKA' : items[0].primaryLab);
    }
    setLoanQty(1);
    setBorrowerType('SISWA');
    setSchoolLevel(schoolLevelFilter === 'SMP' ? 'SMP' : 'SMA');
    setBorrowerName('');
    setBorrowerClassOrDept(
      schoolLevelFilter === 'SMP' ? 'Kelas VIII-A SMP IT' : 'Kelas XII MIPA 1'
    );
    setBorrowDate(new Date().toISOString().slice(0, 10));
    setExpectedReturnDate(new Date().toISOString().slice(0, 10));
    setPurpose('');
    setLoanNotes('');
    setIsSubmittingLoan(false);
    setIsAddModalOpen(true);
  };

  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const handleSubmitAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingLoan) return;

    if (!currentSelectedItem) {
      showToast({ title: 'Validasi Gagal', message: 'Pilih alat praktikum yang valid.', type: 'warning' });
      return;
    }
    if (!borrowerName.trim()) {
      showToast({ title: 'Validasi Gagal', message: 'Nama peminjam wajib diisi.', type: 'warning' });
      return;
    }
    if (loanQty <= 0) {
      showToast({ title: 'Validasi Gagal', message: 'Jumlah peminjaman minimal 1 unit.', type: 'warning' });
      return;
    }

    setIsSubmittingLoan(true);

    addToolLoan({
      itemId: currentSelectedItem.id,
      itemCode: currentSelectedItem.code,
      itemName: currentSelectedItem.name,
      quantity: loanQty,
      borrowerType,
      borrowerName: borrowerName.trim(),
      borrowerClassOrDept: borrowerClassOrDept.trim(),
      schoolLevel,
      targetLab,
      borrowDate,
      expectedReturnDate,
      purpose: purpose.trim() || 'Praktikum Sains Mandiri',
      status: 'DIPINJAM',
      picOfficer: currentUser?.name || 'Petugas Laboratorium',
      notes: loanNotes.trim(),
    });

    setIsAddModalOpen(false);
  };

  const handleOpenReturnModal = (loan: ToolLoanRecord) => {
    setReturningLoan(loan);
    setActualReturnDate(new Date().toISOString().slice(0, 10));
    setReturnCondition('Baik');
    setDamagedQty(0);
    setDamageIncidentReport('');
    setActionTaken('');
    setReturnNotes('');
    setIsSubmittingReturn(false);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningLoan || isSubmittingReturn) return;
    setIsSubmittingReturn(true);

    returnToolLoan(returningLoan.id, {
      actualReturnDate,
      returnedCondition: returnCondition,
      damagedQuantity: returnCondition === 'Baik' ? 0 : damagedQty,
      damageIncidentReport: returnCondition === 'Baik' ? '' : damageIncidentReport.trim(),
      actionTaken: returnCondition === 'Baik' ? '' : actionTaken.trim(),
      notes: returnNotes.trim(),
    });

    setReturningLoan(null);
  };

  // 3. Handler Hapus Rekam Peminjaman (Role-Based Access Control)
  const handleDeleteLending = (loan: ToolLoanRecord) => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Khusus Admin / Kepala Lab)',
        message: 'Akses khusus Kepala Lab (Admin). Akun Guru dan Laboran tidak memiliki izin menghapus rekam peminjaman.',
        duration: 5000,
      });
      return;
    }
    setLoanToDelete(loan);
  };

  const handleConfirmDeleteLending = () => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Khusus Admin / Kepala Lab)',
        message: 'Akses khusus Kepala Lab (Admin). Akun Guru dan Laboran tidak memiliki izin menghapus rekam peminjaman.',
        duration: 5000,
      });
      setLoanToDelete(null);
      return;
    }
    if (!loanToDelete) return;

    const res = deleteToolLoan(loanToDelete.id);
    if (res.success) {
      setLoanToDelete(null);
    }
  };

  const exportToCsv = () => {
    const headers = [
      'No',
      'Kode Pinjam',
      'Tanggal Pinjam',
      'Peminjam',
      'Kategori',
      'Jenjang',
      'Rombel/Kelas',
      'Nama Alat',
      'Kode Alat',
      'Jumlah',
      'Lab Tujuan',
      'Target Kembali',
      'Tgl Realisasi',
      'Status',
      'Kondisi Kembali',
      'Jumlah Rusak/Pecah',
      'Laporan Kejadian/Kerusakan',
      'Tindakan',
      'Petugas',
    ];

    const rows = filteredLoans.map((l, idx) => [
      idx + 1,
      l.code,
      l.borrowDate,
      `"${l.borrowerName}"`,
      l.borrowerType,
      l.schoolLevel,
      `"${l.borrowerClassOrDept}"`,
      `"${l.itemName}"`,
      l.itemCode,
      l.quantity,
      l.targetLab,
      l.expectedReturnDate,
      l.actualReturnDate || '-',
      l.status,
      l.returnedCondition || 'Belum Kembali',
      l.damagedQuantity || 0,
      `"${(l.damageIncidentReport || '-').replace(/"/g, '""')}"`,
      `"${(l.actionTaken || '-').replace(/"/g, '""')}"`,
      `"${l.picOfficer}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Peminjaman_Alat_${settings.tahun_ajaran || '2026'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Printable Report Header */}
      <PrintReportHeader
        title="Buku Kendali Peminjaman & Berita Acara Kerusakan Alat Praktikum"
        subtitle={`Laporan Peminjaman Harian Guru & Siswa Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia TA ${settings.tahun_ajaran || '2026'}`}
        selectedLab={selectedLab}
        extraMetadata={[
          { label: 'Filter Jenjang', value: schoolLevelFilter === 'ALL' ? 'Terpadu (SMP & SMA)' : schoolLevelFilter },
          { label: 'Peminjaman Aktif', value: `${activeLoans.length} berkas (${totalUnitsBorrowed} unit)` },
          { label: 'Laporan Alat Rusak/Pecah', value: `${brokenLoans.length} insiden` },
        ]}
      />

      {/* Header Bar */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg border border-teal-200">
              <Boxes className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Peminjaman & Pengembalian Alat
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {schoolLevelFilter === 'ALL' ? 'SMP & SMA Terpadu' : `Jenjang ${schoolLevelFilter}`}
            </span>

            {isActualAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Admin / Kepala Lab (Otoritas Hapus Peminjaman)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>{currentUser?.roleTitle || 'Akun Guru / Laboran'} (Hapus Rekam Terkunci: Khusus Admin)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pencatatan sirkulasi alat praktikum harian guru dan siswa serta pendataan resmi laporan alat retak, pecah, atau rusak selama kegiatan laboratorium.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Cetak Rekap</span>
          </button>
          <button
            onClick={exportToCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Peminjaman</span>
          </button>
        </div>
      </div>

      {/* Metrics Highlights Cards */}
      <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Sedang Dipinjam</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-800">
            {activeLoans.length}{' '}
            <span className="text-xs font-sans font-medium text-slate-500">berkas</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total {totalUnitsBorrowed} unit instrumen/alat
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Kembali Utuh & Baik</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-800">
            {returnedGood.length}{' '}
            <span className="text-xs font-sans font-medium text-slate-500">berkas</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pengembalian tertib & bersih
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Laporan Rusak / Pecah</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-800">
            {brokenLoans.length}{' '}
            <span className="text-xs font-sans font-medium text-slate-500">insiden</span>
          </div>
          <div className="text-[11px] text-rose-600 mt-1 font-medium">
            Tercatat berita acara penggantian
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Rekam Sirkulasi</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <RotateCcw className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900">
            {loans.length}{' '}
            <span className="text-xs font-sans font-medium text-slate-500">transaksi</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Buku kendali TA {settings.tahun_ajaran || '2026'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        {/* Status Tab buttons */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <button
            onClick={() => setActiveFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeFilterTab === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({loans.length})
          </button>
          <button
            onClick={() => setActiveFilterTab('DIPINJAM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeFilterTab === 'DIPINJAM'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Sedang Dipinjam ({activeLoans.length})</span>
          </button>
          <button
            onClick={() => setActiveFilterTab('KEMBALI_BAIK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeFilterTab === 'KEMBALI_BAIK'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Selesai / Baik ({returnedGood.length})</span>
          </button>
          <button
            onClick={() => setActiveFilterTab('KEMBALI_RUSAK_PECAH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeFilterTab === 'KEMBALI_RUSAK_PECAH'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Laporan Rusak/Pecah ({brokenLoans.length})</span>
          </button>
        </div>

        {/* Search & dropdown selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari peminjam, alat, rombel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Laboratorium</option>
              <option value="FISIKA">Lab Fisika (SMA)</option>
              <option value="KIMIA">Lab Kimia (SMA)</option>
              <option value="BIOLOGI">Lab Biologi (SMA)</option>
              <option value="SMP_TERPADU">Lab IPA Terpadu (SMP)</option>
            </select>
          </div>

          <div>
            <select
              value={selectedBorrowerType}
              onChange={(e) => setSelectedBorrowerType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Kategori Peminjam</option>
              <option value="SISWA">Siswa / Kelompok Praktikum</option>
              <option value="GURU">Guru / Pengampu Mapel</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Kode & Tgl Pinjam</th>
                <th className="py-3.5 px-4">Peminjam & Rombel</th>
                <th className="py-3.5 px-4">Alat & Kuantitas</th>
                <th className="py-3.5 px-4">Lab / Lokasi</th>
                <th className="py-3.5 px-4">Target Kembali</th>
                <th className="py-3.5 px-4">Status & Kondisi</th>
                <th className="py-3.5 px-4 no-print text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Belum ada data peminjaman yang sesuai kriteria
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Klik "+ Catat Peminjaman" untuk menambahkan rekam peminjaman harian baru.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan, idx) => {
                  const isOverdue =
                    loan.status === 'DIPINJAM' &&
                    new Date(loan.expectedReturnDate).getTime() <
                      new Date(new Date().toISOString().slice(0, 10)).getTime();

                  return (
                    <tr
                      key={loan.id}
                      id={`loan-row-${loan.id}`}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        loan.status === 'KEMBALI_RUSAK_PECAH'
                          ? 'bg-rose-50/30'
                          : loan.status === 'DIPINJAM'
                          ? 'bg-amber-50/15'
                          : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>

                      {/* Code & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{loan.code}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 text-slate-400" />
                          <span>{loan.borrowDate}</span>
                        </div>
                      </td>

                      {/* Borrower */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{loan.borrowerName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              loan.borrowerType === 'GURU'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {loan.borrowerType}
                          </span>
                          <span>{loan.borrowerClassOrDept}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-teal-700">{loan.schoolLevel}</span>
                        </div>
                        {loan.purpose && (
                          <div className="text-[10.5px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                            Keperluan: {loan.purpose}
                          </div>
                        )}
                      </td>

                      {/* Tool & Quantity */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{loan.itemName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-slate-500">{loan.itemCode}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            {loan.quantity} Unit
                          </span>
                        </div>
                      </td>

                      {/* Lab Location */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                            LAB_DEFINITIONS[loan.targetLab]?.badgeBg ||
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {LAB_DEFINITIONS[loan.targetLab]?.shortName || loan.targetLab}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                          PJ: {loan.picOfficer}
                        </div>
                      </td>

                      {/* Target Return Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-semibold text-slate-800">
                          {loan.expectedReturnDate}
                        </div>
                        {loan.actualReturnDate ? (
                          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                            Kembali: {loan.actualReturnDate}
                          </div>
                        ) : isOverdue ? (
                          <div className="text-[10px] text-rose-600 font-bold mt-0.5 flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" />
                            <span>Melewati Jadwal</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">Aktif dipinjam</div>
                        )}
                      </td>

                      {/* Status & Condition */}
                      <td className="py-3.5 px-4">
                        {loan.status === 'DIPINJAM' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Sedang Dipinjam</span>
                          </span>
                        )}

                        {loan.status === 'KEMBALI_BAIK' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Kembali Baik</span>
                            </span>
                          </div>
                        )}

                        {loan.status === 'KEMBALI_RUSAK_PECAH' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>
                                {loan.returnedCondition} ({loan.damagedQuantity || 1} unit)
                              </span>
                            </span>
                            {loan.damageIncidentReport && (
                              <p className="text-[10.5px] text-rose-700 leading-tight max-w-xs font-medium">
                                {loan.damageIncidentReport}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 no-print text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {loan.status === 'DIPINJAM' && (
                            <button
                              onClick={() => handleOpenReturnModal(loan)}
                              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg border border-teal-200 text-xs flex items-center gap-1 transition-colors"
                              title="Proses Pengembalian Alat"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
                              <span>Kembalikan</span>
                            </button>
                          )}

                          <button
                            onClick={() => setReceiptLoan(loan)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                            title="Lihat / Cetak Bukti Peminjaman"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {isActualAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteLending(loan)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                              title="Hapus Rekam Peminjaman (Khusus Admin / Kepala Lab)"
                              aria-label={`Hapus rekam peminjaman ${loan.code}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 text-slate-300 cursor-not-allowed rounded-lg opacity-60 bg-slate-50 border border-slate-200"
                              title="Akses khusus Kepala Lab (Admin)"
                              aria-label="Akses khusus Kepala Lab (Admin)"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          )}
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

      {/* Official Signatures for Printed Reports */}
      <PrintSignatures selectedLab={selectedLab} />

      {/* ===================================================================== */}
      {/* MODAL 1: CATAT PEMINJAMAN ALAT BARU */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Boxes className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-extrabold text-base">Catat Peminjaman Alat Praktikum</h3>
                  <p className="text-xs text-slate-300">
                    Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddLoan} className="p-6 space-y-4 text-xs">
              {/* 1. Pilih Alat */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Pilih Alat Praktikum <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const it = items.find((i) => i.id === e.target.value);
                    if (it && it.primaryLab !== 'ALL') {
                      setTargetLab(it.primaryLab);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-600 focus:bg-white"
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name} (Tersedia: {item.currentTotalStock} {item.unit})
                    </option>
                  ))}
                </select>
                {currentSelectedItem && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Lokasi Simpan: {currentSelectedItem.storageRack} · Total Stok Gabungan:{' '}
                    <strong>
                      {currentSelectedItem.currentTotalStock} {currentSelectedItem.unit}
                    </strong>
                  </p>
                )}
              </div>

              {/* 2. Jumlah & Laboratorium */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Jumlah Unit Dipinjam <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={currentSelectedItem ? Math.max(1, currentSelectedItem.currentTotalStock) : 50}
                    value={loanQty}
                    onChange={(e) => setLoanQty(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Laboratorium Asal / Lokasi
                  </label>
                  <select
                    value={targetLab}
                    onChange={(e) => setTargetLab(e.target.value as LabId)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="FISIKA">Lab Fisika (SMA)</option>
                    <option value="KIMIA">Lab Kimia (SMA)</option>
                    <option value="BIOLOGI">Lab Biologi (SMA)</option>
                    <option value="SMP_TERPADU">Lab IPA Terpadu (SMP)</option>
                  </select>
                </div>
              </div>

              {/* 3. Kategori & Jenjang Peminjam */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Peminjam</label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        checked={borrowerType === 'SISWA'}
                        onChange={() => setBorrowerType('SISWA')}
                        className="text-teal-600 focus:ring-teal-600"
                      />
                      <span>Siswa / Rombel</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        checked={borrowerType === 'GURU'}
                        onChange={() => setBorrowerType('GURU')}
                        className="text-teal-600 focus:ring-teal-600"
                      />
                      <span>Guru / Laboran</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenjang Pendidikan</label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        checked={schoolLevel === 'SMP'}
                        onChange={() => {
                          setSchoolLevel('SMP');
                          setBorrowerClassOrDept('Kelas VIII-A SMP IT');
                        }}
                        className="text-teal-600 focus:ring-teal-600"
                      />
                      <span>SMP IT</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        checked={schoolLevel === 'SMA'}
                        onChange={() => {
                          setSchoolLevel('SMA');
                          setBorrowerClassOrDept('Kelas XII MIPA 1');
                        }}
                        className="text-teal-600 focus:ring-teal-600"
                      />
                      <span>SMA IT</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 4. Nama Peminjam & Rombel/Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Peminjam / Kelompok <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="misal: Ahmad Fathan / Kelompok 2"
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Kelas / Rombel / Departemen
                  </label>
                  <input
                    type="text"
                    placeholder="misal: Kelas XII MIPA 1 atau Guru Kimia"
                    value={borrowerClassOrDept}
                    onChange={(e) => setBorrowerClassOrDept(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* 5. Tanggal Pinjam & Target Pengembalian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Pinjam</label>
                  <input
                    type="date"
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Target Tanggal Kembali
                  </label>
                  <input
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* 6. Keperluan & Catatan */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Keperluan / Judul Praktikum
                </label>
                <input
                  type="text"
                  placeholder="misal: Praktikum Titrasi Asam Basa Larutan Standar"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Awal Kondisi Alat
                </label>
                <textarea
                  rows={2}
                  placeholder="misal: Jarum neraca seimbang, lensa mikroskop bersih..."
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingLoan}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLoan}
                  className="px-5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmittingLoan ? 'Menyimpan...' : 'Simpan Peminjaman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: PROSES PENGEMBALIAN & LAPORAN KERUSAKAN */}
      {/* ===================================================================== */}
      {returningLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-extrabold text-base">Proses Pengembalian Alat</h3>
                  <p className="text-xs text-slate-300">
                    Verifikasi kelengkapan & kondisi alat praktikum
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReturningLoan(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-6 space-y-4 text-xs">
              {/* Summary box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                  <span>{returningLoan.code}</span>
                  <span className="text-teal-700">{returningLoan.quantity} Unit</span>
                </div>
                <div className="text-slate-700 font-bold">{returningLoan.itemName}</div>
                <div className="text-[11px] text-slate-500">
                  Peminjam: <strong>{returningLoan.borrowerName}</strong> ({returningLoan.borrowerClassOrDept})
                </div>
              </div>

              {/* Tanggal Realisasi */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tanggal Pengembalian Aktual <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={actualReturnDate}
                  onChange={(e) => setActualReturnDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              {/* Kondisi saat dikembalikan */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Kondisi Alat saat Dikembalikan <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2 mt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="condition"
                      checked={returnCondition === 'Baik'}
                      onChange={() => {
                        setReturnCondition('Baik');
                        setDamagedQty(0);
                      }}
                      className="text-emerald-600 focus:ring-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-emerald-800">Utuh & Baik Semua</div>
                      <div className="text-[10.5px] text-slate-500">
                        Seluruh {returningLoan.quantity} unit dalam kondisi lengkap, bersih, dan berfungsi normal.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="condition"
                      checked={returnCondition === 'Rusak Ringan'}
                      onChange={() => {
                        setReturnCondition('Rusak Ringan');
                        if (damagedQty === 0) setDamagedQty(1);
                      }}
                      className="text-amber-600 focus:ring-amber-600"
                    />
                    <div>
                      <div className="font-bold text-amber-800">
                        Terdapat Kerusakan Ringan / Perlu Kalibrasi
                      </div>
                      <div className="text-[10.5px] text-slate-500">
                        Alat tidak presisi, baut kendur, atau kotor membandel.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="condition"
                      checked={
                        returnCondition === 'Pecah / Rusak Berat' || returnCondition === 'Hilang'
                      }
                      onChange={() => {
                        setReturnCondition('Pecah / Rusak Berat');
                        if (damagedQty === 0) setDamagedQty(1);
                      }}
                      className="text-rose-600 focus:ring-rose-600"
                    />
                    <div>
                      <div className="font-bold text-rose-800">Pecah / Rusak Berat / Hilang</div>
                      <div className="text-[10.5px] text-slate-500">
                        Kaca pecah, instrumen korslet, atau hilang saat praktikum.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Jika terjadi kerusakan / pecah */}
              {returnCondition !== 'Baik' && (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-rose-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Laporan Insiden Praktikum & Berita Acara</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Jumlah Unit Pecah / Rusak
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={returningLoan.quantity}
                      value={damagedQty}
                      onChange={(e) => setDamagedQty(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-mono font-bold text-rose-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Kronologi / Keterangan Kejadian <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="misal: Tabung Erlenmeyer retak/pecah saat dibilas santri di wastafel lab..."
                      value={damageIncidentReport}
                      onChange={(e) => setDamageIncidentReport(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Tindakan Penyelesaian / Tanggung Jawab
                    </label>
                    <input
                      type="text"
                      placeholder="misal: Diganti spesifikasi sejenis oleh kelompok / Dihapuskan dari stok aktif"
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="misal: Dikembalikan dalam keadaan bersih dan dikeringkan"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReturningLoan(null)}
                  disabled={isSubmittingReturn}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="px-5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmittingReturn ? 'Menyimpan...' : 'Simpan Pengembalian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: CETAK BUKTI TANDA TERIMA PEMINJAMAN */}
      {/* ===================================================================== */}
      {receiptLoan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <span className="font-bold text-sm">Bukti Peminjaman Alat Praktikum</span>
              <button
                onClick={() => setReceiptLoan(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="text-center pb-3 border-b border-slate-200 space-y-0.5">
                <h4 className="font-bold text-slate-900 text-sm">
                  BUKTI TANDA TERIMA PEMINJAMAN ALAT
                </h4>
                <p className="text-[11px] text-slate-500">
                  Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia
                </p>
                <p className="text-[10px] font-mono text-teal-700">{receiptLoan.code}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="text-slate-500">Tanggal Pinjam:</div>
                <div className="font-bold text-slate-900">{receiptLoan.borrowDate}</div>
                <div className="text-slate-500">Nama Peminjam:</div>
                <div className="font-bold text-slate-900">{receiptLoan.borrowerName}</div>
                <div className="text-slate-500">Kelas / Rombel:</div>
                <div className="font-bold text-slate-900">
                  {receiptLoan.borrowerClassOrDept} ({receiptLoan.schoolLevel})
                </div>
                <div className="text-slate-500">Nama Alat:</div>
                <div className="font-bold text-slate-900">{receiptLoan.itemName}</div>
                <div className="text-slate-500">Jumlah Unit:</div>
                <div className="font-bold text-teal-800">{receiptLoan.quantity} Unit</div>
                <div className="text-slate-500">Target Pengembalian:</div>
                <div className="font-bold text-slate-900">{receiptLoan.expectedReturnDate}</div>
                <div className="text-slate-500">Status Saat Ini:</div>
                <div className="font-bold text-slate-900">{receiptLoan.status}</div>
              </div>

              {receiptLoan.damageIncidentReport && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px]">
                  <strong>Laporan Kerusakan:</strong> {receiptLoan.damageIncidentReport}
                </div>
              )}

              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10.5px] border-t border-slate-200">
                <div>
                  <p className="text-slate-500 mb-10">Peminjam,</p>
                  <p className="font-bold text-slate-900 underline">{receiptLoan.borrowerName}</p>
                  <p className="text-slate-400">{receiptLoan.borrowerClassOrDept}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-10">Petugas Laboratorium,</p>
                  <p className="font-bold text-slate-900 underline">{receiptLoan.picOfficer}</p>
                  <p className="text-slate-400">SIMLAB Ar-Rahmah Cendekia</p>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => setReceiptLoan(null)}
                  className="px-4 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Tanda Terima</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Rekam Peminjaman (Khusus Admin / Kepala Lab) */}
      {loanToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Hapus Rekam Peminjaman</h3>
                <p className="text-xs text-slate-500">Tindakan ini permanen dan menghapus riwayat dari sistem.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div><strong>Kode Peminjaman:</strong> <span className="font-mono text-teal-800">{loanToDelete.code}</span></div>
              <div><strong>Peminjam:</strong> {loanToDelete.borrowerName} ({loanToDelete.borrowerClassOrDept})</div>
              <div><strong>Barang:</strong> {loanToDelete.itemName} ({loanToDelete.quantity} unit)</div>
              <div><strong>Tanggal Pinjam:</strong> {loanToDelete.borrowDate}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLoanToDelete(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Rekam</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Alias export for consistency across the application
export const LendingManagement = ToolLoanManagement;
