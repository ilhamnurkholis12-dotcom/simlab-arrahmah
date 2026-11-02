import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  FileCode,
  Copy,
  Layers,
  ArrowDownToLine,
  Boxes,
  PlusCircle,
  RefreshCw,
  FolderOpen,
  Trash2,
  UserCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { LAB_DEFINITIONS, LabId } from '../types/inventory';
import { ExcelImportSummary, ExcelImportExecutionResult } from '../types/excelImport';
import {
  parseExcelInventoryWorkbook,
  generateSampleInventoryExcel,
  OFFICIAL_STAFF_ACCOUNTS,
  resolveOfficialPicAccount,
} from '../utils/excelImportParser';
import {
  NODEJS_BACKEND_CODE,
  PHP_BACKEND_CODE,
  SQL_SCHEMA_REFERENCE,
} from '../utils/backendSnippets';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessNavigate?: (tab: 'inventory' | 'transactions') => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccessNavigate,
}) => {
  const { items, accounts, importExcelData, showToast } = useInventory();

  const [activeTab, setActiveTab] = useState<'upload' | 'backend_code'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseSummary, setParseSummary] = useState<ExcelImportSummary | null>(null);
  const [activePreviewSheetIdx, setActivePreviewSheetIdx] = useState<number>(0);
  const [executionResult, setExecutionResult] = useState<ExcelImportExecutionResult | null>(null);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [cleanReset, setCleanReset] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const accountAllocationStats = useMemo(() => {
    const stats: Record<string, { count: number; totalQty: number }> = {
      'Ilham.nurkholis114@guru.sma.belajar.id': { count: 0, totalQty: 0 },
      'oktaviawan901@guru.smp.belajar.id': { count: 0, totalQty: 0 },
      'sitijuhriahssi21@guru.sma.belajar.id': { count: 0, totalQty: 0 },
      'farkhatullamaliyaa@gmail.com': { count: 0, totalQty: 0 },
    };

    if (!parseSummary) return stats;

    parseSummary.sheets.forEach((sheet) => {
      sheet.stokMasukRows.forEach((row) => {
        const combined = `${row.picName || ''} ${row.keterangan || ''}`;
        const official = resolveOfficialPicAccount(combined);
        const email = official.email;
        if (!stats[email]) {
          stats[email] = { count: 0, totalQty: 0 };
        }
        stats[email].count += 1;
        stats[email].totalQty += row.jumlahExtracted || 0;
      });
    });

    return stats;
  }, [parseSummary]);

  if (!isOpen) return null;

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setExecutionResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const summary = parseExcelInventoryWorkbook(workbook, file.name, items, accounts);
        summary.fileSizeBytes = file.size;
        setParseSummary(summary);
        setActivePreviewSheetIdx(0);
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Format File Tidak Sesuai',
          message: 'Gagal membaca file Excel. Pastikan file berformat .xlsx atau .xls yang valid.',
        });
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      showToast({
        type: 'error',
        title: 'Gagal Membaca File',
        message: 'Terjadi kesalahan saat membaca file spreadsheet.',
      });
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      handleFileSelected(file);
    } else {
      showToast({
        type: 'warning',
        title: 'Format Tidak Didukung',
        message: 'Silakan upload file dengan ekstensi .xlsx atau .xls',
      });
    }
  };

  const handleDownloadSampleExcel = () => {
    try {
      const buffer = generateSampleInventoryExcel();
      const blob = new Blob([buffer as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Format_Inventaris_MultiSheet_SIMLAB_ARC_2026.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Ekspor Template Gagal',
        message: 'Gagal membuat file template Excel.',
      });
    }
  };

  const handleExecuteImport = () => {
    if (!parseSummary) return;

    try {
      const result = importExcelData(parseSummary, { cleanReset });
      setExecutionResult(result);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Penyimpanan Gagal',
        message: 'Terjadi kesalahan saat menyimpan data ke inventaris.',
      });
      console.error(err);
    }
  };

  const handleCopyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeKey(key);
    setTimeout(() => setCopiedCodeKey(null), 2500);
  };

  const activeSheet = parseSummary?.sheets[activePreviewSheetIdx];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Import File Excel Inventaris Data Asli</span>
                <span className="text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Clean Reset & 4 Akun Resmi
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pembersihan total data dummy AI, penautan ketat ke 4 akun resmi laboran, dan sinkronisasi log mutasi tanpa duplikasi akun
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSampleExcel}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              title="Unduh Contoh Format File Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contoh Format Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File & Eksekusi Import Langsung</span>
          </button>
          <button
            onClick={() => setActiveTab('backend_code')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'backend_code'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Kode Backend & Petunjuk File (Node.js & PHP)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'upload' ? (
            <>
              {/* SUCCESS BANNER WHEN IMPORT EXECUTED */}
              {executionResult && (
                <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-emerald-900">
                        {executionResult.isCleanReset
                          ? 'Clean Reset & Import Excel Data Asli Berhasil Diterapkan!'
                          : 'Import Excel Berhasil Disinkronkan!'}
                      </h4>
                      <p className="text-xs text-emerald-800">
                        Seluruh data inventaris asli telah berhasil dipetakan ke seluruh laboratorium.
                      </p>
                    </div>
                  </div>

                  {/* Clean Reset Confirmation Badge */}
                  {executionResult.isCleanReset && (
                    <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center gap-2.5">
                      <Trash2 className="w-4 h-4 text-amber-800 shrink-0" />
                      <div>
                        <b>Pembersihan Total Sukses:</b> Seluruh isi tabel <code>inventory</code> dan <code>log_aktivitas</code> bawaan AI telah dikosongkan sepenuhnya sebelum memasukkan data asli dari file Excel Anda.
                      </div>
                    </div>
                  )}

                  {/* Official Accounts Linked Confirmation */}
                  <div className="p-3.5 bg-white/90 border border-emerald-300 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-700" />
                        <span>Data Mutasi Berhasil Ditautkan ke 4 Akun Resmi SIMLAB:</span>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        0 Akun Tambahan Dibuat
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {OFFICIAL_STAFF_ACCOUNTS.map((usr, i) => (
                        <div key={i} className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-lg">
                          <div className="font-bold text-slate-900 truncate">{usr.name}</div>
                          <div className="text-[10.5px] font-mono text-emerald-800 truncate">{usr.email}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{usr.badge}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10.5px] text-slate-600">
                      * Seluruh mutasi 'Stok Masuk Baru' di log aktivitas berhasil ditautkan ke akun resmi di atas sesuai kata kunci PIC atau dialihkan ke Kepala Lab.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                      <div className="text-[11px] text-emerald-700 font-medium">Barang Baru Dibuat</div>
                      <div className="text-xl font-bold font-mono text-emerald-900">
                        {executionResult.itemsCreated} item
                      </div>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                      <div className="text-[11px] text-emerald-700 font-medium">Barang Diperbarui Stoknya</div>
                      <div className="text-xl font-bold font-mono text-emerald-900">
                        {executionResult.itemsUpdated} item
                      </div>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                      <div className="text-[11px] text-emerald-700 font-medium">Log Mutasi Masuk Dicatat</div>
                      <div className="text-xl font-bold font-mono text-emerald-900">
                        {executionResult.transactionsCreated} transaksi
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        onClose();
                        if (onSuccessNavigate) onSuccessNavigate('inventory');
                      }}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Buka Tabel Rekap Stok Asli →
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        if (onSuccessNavigate) onSuccessNavigate('transactions');
                      }}
                      className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-colors"
                    >
                      Buka Log Aktivitas (Riwayat Mutasi) →
                    </button>
                    <button
                      onClick={() => {
                        setExecutionResult(null);
                        setParseSummary(null);
                        setSelectedFile(null);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 underline ml-auto"
                    >
                      Upload File Lain
                    </button>
                  </div>
                </div>
              )}

              {/* UPLOAD DROP ZONE (if not executed yet) */}
              {!executionResult && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                    isDragOver
                      ? 'border-emerald-600 bg-emerald-50/50 scale-[0.99]'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                    className="hidden"
                  />

                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                      <FolderOpen className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedFile ? selectedFile.name : 'Pilih atau Drag & Drop File Excel Data Asli (.xlsx / .xls)'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Sistem mendukung multi-sheet (FISIKA, KIMIA, BIOLOGI, SMP) dengan struktur 2 tabel vertikal
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-3">
                      <span className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih File Dari Komputer</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSampleExcel();
                        }}
                        className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Contoh Format Excel</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* LOADING STATE */}
              {isProcessing && (
                <div className="p-8 text-center text-slate-600 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-700" />
                  <p className="text-xs font-medium">Menganalisis lembar kerja, mendeteksi PIC baru, dan memetakan struktur tabel vertikal...</p>
                </div>
              )}

              {/* PARSED PREVIEW & CONFIRMATION */}
              {parseSummary && !executionResult && (
                <div className="space-y-5">
                  {/* CLEAN RESET TOGGLE CARD */}
                  <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2">
                          <span>1. Mode Pembersihan Total (Clean Reset)</span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                            Direkomendasikan untuk Data Asli
                          </span>
                        </h4>
                        <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                          Kosongkan seluruh data imitasi/dummy bawaan AI di tabel <code>inventory</code> dan <code>log_aktivitas</code> sebelum mengimpor file ini. Data tiruan AI lama akan hilang 100% dan digantikan data asli dari Excel Anda.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-amber-300 shadow-xs shrink-0 hover:bg-amber-50/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={cleanReset}
                        onChange={(e) => setCleanReset(e.target.checked)}
                        className="w-4 h-4 text-emerald-800 rounded border-amber-400 focus:ring-emerald-700"
                      />
                      <span className="text-xs font-bold text-slate-800">Jalankan Clean Reset</span>
                    </label>
                  </div>

                  {/* 4 AKUN RESMI SIMLAB PENERIMA DATA */}
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-emerald-950">
                        <UserCheck className="w-4 h-4 text-emerald-700" />
                        <span>2. Penanggung Jawab Resmi Penerima Data (4 Akun Resmi SIMLAB)</span>
                      </div>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                        Terkunci Resmi (0 Akun Baru)
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-900">
                      Sistem <b>tidak akan membuat akun baru</b> dari file Excel Anda. Seluruh mutasi 'Stok Masuk Baru' otomatis ditautkan ke salah satu dari 4 akun resmi berikut via kata kunci, atau dialihkan ke Kepala Lab jika kosong:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                      {OFFICIAL_STAFF_ACCOUNTS.map((acc, uIdx) => (
                        <div key={uIdx} className="bg-white p-3 rounded-xl border border-emerald-200 text-xs shadow-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 truncate" title={acc.name}>{acc.name}</span>
                          </div>
                          <div className="text-[10.5px] font-mono text-emerald-800 truncate" title={acc.email}>{acc.email}</div>
                          <div className="text-[10px] text-slate-600 font-medium pt-1.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-emerald-800 font-semibold truncate">{acc.badge}</span>
                            <span className="text-[9.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded shrink-0">Resmi</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">Sheet Terdeteksi</div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                        {parseSummary.sheets.length} Laboratorium
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        {parseSummary.sheets.map((s) => s.sheetName).join(', ')}
                      </div>
                    </div>

                    <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-200">
                      <div className="text-[11px] text-sky-800 font-medium flex items-center gap-1">
                        <Boxes className="w-3 h-3" />
                        <span>Stok Awal (2025/2026)</span>
                      </div>
                      <div className="text-lg font-bold text-sky-900 mt-0.5 font-mono">
                        {parseSummary.totalStokAwalItems} item
                      </div>
                      <div className="text-[10px] text-sky-700 mt-1">Dimasukkan ke tabel inventory</div>
                    </div>

                    <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                      <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        <span>Masuk (Barang Ada)</span>
                      </div>
                      <div className="text-lg font-bold text-amber-900 mt-0.5 font-mono">
                        {cleanReset ? 0 : parseSummary.totalStokMasukExisting} mutasi
                      </div>
                      <div className="text-[10px] text-amber-700 mt-1">
                        {cleanReset ? 'Dibuat dari stok awal Excel' : 'Tambah stok + catat log'}
                      </div>
                    </div>

                    <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                      <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                        <PlusCircle className="w-3 h-3" />
                        <span>Masuk (Barang Baru)</span>
                      </div>
                      <div className="text-lg font-bold text-emerald-900 mt-0.5 font-mono">
                        {cleanReset
                          ? parseSummary.totalStokMasukNew + parseSummary.totalStokMasukExisting
                          : parseSummary.totalStokMasukNew} item
                      </div>
                      <div className="text-[10px] text-emerald-700 mt-1">Baris baru + catat log mutasi</div>
                    </div>
                  </div>

                  {/* Sheet Selector Tabs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>Pilih Lembar Kerja (Sheet Laboratorium):</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {parseSummary.sheets.map((sheet, idx) => {
                        const labInfo = LAB_DEFINITIONS[sheet.labId];
                        return (
                          <button
                            key={sheet.sheetName}
                            onClick={() => setActivePreviewSheetIdx(idx)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors whitespace-nowrap ${
                              activePreviewSheetIdx === idx
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>Sheet: {sheet.sheetName}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                activePreviewSheetIdx === idx
                                  ? 'bg-slate-700 text-slate-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {labInfo ? labInfo.shortName : sheet.labId}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Sheet Detail Preview */}
                  {activeSheet && (
                    <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                      {/* Section 1: Stok Awal (Bagian Atas) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-sky-900 flex items-center gap-1.5 uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-sky-600" />
                            <span>1. Tabel Atas: Stok Awal (TA 2025/2026) — [{activeSheet.stokAwalRows.length} Baris]</span>
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Aturan: Petakan Jenis (alat/reagen) · Ekstrak angka stok · Simpan lokasi rak
                          </span>
                        </div>

                        {activeSheet.stokAwalRows.length === 0 ? (
                          <div className="p-4 bg-white rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                            Tidak ditemukan data baris untuk Stok Awal pada sheet ini.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs max-h-48 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="py-2 px-3 w-12">No</th>
                                  <th className="py-2 px-3">Nama Alat dan Bahan</th>
                                  <th className="py-2 px-3 w-28">Jenis Item</th>
                                  <th className="py-2 px-3">Lokasi Penyimpanan</th>
                                  <th className="py-2 px-3 w-32 text-right">Stok Diekstrak</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {activeSheet.stokAwalRows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{rIdx + 1}</td>
                                    <td className="py-2 px-3 font-semibold text-slate-900">{row.namaBarang}</td>
                                    <td className="py-2 px-3">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                          row.jenisItemMapped === 'alat'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {row.jenisItemMapped}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-slate-600">{row.penyimpanan}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                      {row.stokExtracted} <span className="text-slate-400 font-normal text-[10px]">{row.unit}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Section 2: Stok Masuk Baru (Bagian Bawah) */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>2. Tabel Bawah: Stok Masuk Baru (TA 2026/2027) — [{activeSheet.stokMasukRows.length} Baris]</span>
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Aturan: Cek duplikasi · Tambah stok · Tautkan user_id ke PIC asli di log_aktivitas
                          </span>
                        </div>

                        {activeSheet.stokMasukRows.length === 0 ? (
                          <div className="p-4 bg-white rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                            Tidak ditemukan data baris untuk Stok Masuk Baru pada sheet ini.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs max-h-48 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="py-2 px-3 w-12">No</th>
                                  <th className="py-2 px-3">Nama Alat dan Bahan</th>
                                  <th className="py-2 px-3 w-28 text-right">Jumlah Masuk</th>
                                  <th className="py-2 px-3 w-40">PIC / Penerima Asli</th>
                                  <th className="py-2 px-3">Aksi yang Dijalankan</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {activeSheet.stokMasukRows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{rIdx + 1}</td>
                                    <td className="py-2 px-3 font-semibold text-slate-900">{row.namaBarang}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                                      +{row.jumlahExtracted}
                                    </td>
                                    <td className="py-2 px-3 font-medium text-emerald-900">
                                      <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-bold">
                                        <UserCheck className="w-3 h-3 text-emerald-700" />
                                        <span>{row.picName || 'Laboran'}</span>
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-[11px] text-slate-600">
                                      <span>
                                        Catat ke <b className="text-emerald-800">log_aktivitas (masuk)</b> ditautkan ke akun <b className="text-slate-900">{row.picName || 'Laboran'}</b>
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Execution CTA Buttons */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      {cleanReset ? (
                        <span className="font-semibold text-amber-800">
                          Mode Clean Reset aktif: Data dummy lama akan dihapus dan digantikan data asli ini.
                        </span>
                      ) : (
                        <span>
                          Total <span className="font-bold text-slate-800">{parseSummary.totalStokAwalItems} barang stok awal</span> dan{' '}
                          <span className="font-bold text-emerald-800">{parseSummary.totalTransactionsCreated} mutasi</span> siap disinkronkan.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setParseSummary(null);
                          setSelectedFile(null);
                        }}
                        className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                      >
                        Batal
                      </button>

                      <button
                        onClick={handleExecuteImport}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{cleanReset ? 'Jalankan Clean Reset & Simpan Data Asli' : 'Terapkan Import ke Database'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* BACKEND CODE DOCUMENTATION TAB */
            <div className="space-y-6">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <Info className="w-4 h-4 text-sky-700" />
                  <span>Petunjuk Penempatan File & Integrasi Backend</span>
                </div>
                <p className="text-xs text-sky-900 leading-relaxed">
                  Kode backend pengolah Clean Reset dan pendaftaran otomatis akun laboran telah disiapkan lengkap dalam dua pilihan arsitektur: <b>Node.js (Express + xlsx + mysql2)</b> dan <b>PHP (PhpSpreadsheet + PDO MySQL)</b>. File-file ini juga telah disimpan langsung pada repositori proyek ini.
                </p>
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-sky-200">
                    <span className="text-[10px] text-sky-600 font-bold block">File Node.js Backend:</span>
                    <code className="font-mono text-slate-800 text-[11px]">/server/import-excel-handler.js</code>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-sky-200">
                    <span className="text-[10px] text-sky-600 font-bold block">File PHP Backend:</span>
                    <code className="font-mono text-slate-800 text-[11px]">/backend/import_excel_clean_reset.php</code>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-sky-200">
                    <span className="text-[10px] text-sky-600 font-bold block">Skema Tabel Database:</span>
                    <code className="font-mono text-slate-800 text-[11px]">/server/database_schema.sql</code>
                  </div>
                </div>
              </div>

              {/* Node.js Block */}
              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                <div className="bg-slate-800/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <FileCode className="w-4 h-4" />
                    <span>1. Implementasi Node.js (Express + xlsx + mysql2) — /server/import-excel-handler.js</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(NODEJS_BACKEND_CODE, 'node')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedCodeKey === 'node' ? 'Tersalin!' : 'Salin Kode'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 text-slate-400 text-xs font-mono border-b border-slate-800">
                  Instalasi library: <span className="text-emerald-300">npm install express xlsx multer cors dotenv mysql2</span>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-72">
                  {NODEJS_BACKEND_CODE}
                </pre>
              </div>

              {/* PHP Block */}
              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                <div className="bg-slate-800/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                    <FileCode className="w-4 h-4" />
                    <span>2. Implementasi PHP (PhpSpreadsheet + PDO MySQL) — /backend/import_excel_clean_reset.php</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(PHP_BACKEND_CODE, 'php')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedCodeKey === 'php' ? 'Tersalin!' : 'Salin Kode'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 text-slate-400 text-xs font-mono border-b border-slate-800">
                  Instalasi library: <span className="text-indigo-300">composer require phpoffice/phpspreadsheet</span>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-72">
                  {PHP_BACKEND_CODE}
                </pre>
              </div>

              {/* SQL Schema Block */}
              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                <div className="bg-slate-800/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <FileCode className="w-4 h-4" />
                    <span>3. Skema SQL Tabel: users, inventory, log_aktivitas — /server/database_schema.sql</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(SQL_SCHEMA_REFERENCE, 'sql')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedCodeKey === 'sql' ? 'Tersalin!' : 'Salin SQL'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-48">
                  {SQL_SCHEMA_REFERENCE}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
