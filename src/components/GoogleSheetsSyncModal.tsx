import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  DEFAULT_GAS_API_URL,
  GasSheetName,
  getGasApiUrl,
  setGasApiUrl,
  testGasConnection,
  fetchSheetData,
  saveSheetData,
  batchSaveSheetData,
} from '../services/googleAppsScriptService';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Activity,
  Layers,
  FlaskConical,
  Boxes,
  BookOpen,
  Users,
  GraduationCap,
  Sparkles,
  Link2,
} from 'lucide-react';
import { InventoryItem, UserAccount, LabActivityRecord, LabStudent } from '../types/inventory';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SheetCardInfo {
  id: GasSheetName;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgLight: string;
  borderCol: string;
  localCount: number;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    items,
    accounts,
    labActivities,
    students,
    classes,
    showToast,
    isHeadOfLab,
  } = useInventory();

  const [apiUrl, setApiUrlState] = useState(getGasApiUrl());
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ tested: false, loading: false });

  const [activeSyncingSheet, setActiveSyncingSheet] = useState<GasSheetName | 'ALL' | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [fetchedDataPreview, setFetchedDataPreview] = useState<{ sheetName: GasSheetName; data: any[] } | null>(null);
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'error' }>>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('id-ID');
    setLogs((prev) => [{ timestamp: time, message, type }, ...prev.slice(0, 49)]);
  };

  // Test connection on modal open
  useEffect(() => {
    if (isOpen && !testStatus.tested) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus({ tested: true, loading: true });
    addLog(`Menguji koneksi ke Google Apps Script: ${apiUrl}...`, 'info');
    const res = await testGasConnection(apiUrl);
    setTestStatus({
      tested: true,
      loading: false,
      success: res.success,
      message: res.message,
    });
    if (res.success) {
      addLog(`Koneksi Backend Berhasil: ${res.message}`, 'success');
      showToast({
        type: 'success',
        title: 'Google Apps Script Terhubung',
        message: 'Endpoint Web App aktif dan siap menerima query GET / POST.',
      });
    } else {
      addLog(`Koneksi Backend Gagal: ${res.message}`, 'error');
      showToast({
        type: 'error',
        title: 'Koneksi Gagal',
        message: res.message,
      });
    }
  };

  const handleSaveApiUrl = () => {
    if (!apiUrl.trim().startsWith('https://script.google.com/')) {
      showToast({
        type: 'error',
        title: 'URL Tidak Valid',
        message: 'URL Google Apps Script harus dimulai dengan https://script.google.com/',
      });
      return;
    }
    setGasApiUrl(apiUrl.trim());
    setIsEditingUrl(false);
    showToast({
      type: 'success',
      title: 'URL Disimpan',
      message: 'Alamat Google Apps Script Web App berhasil diperbarui.',
    });
    handleTestConnection();
  };

  // Local data partitions
  const alatItems = items.filter((i) => i.category !== 'Bahan Kimia & Reagen');
  const bahanItems = items.filter((i) => i.category === 'Bahan Kimia & Reagen');

  const sheetDefinitions: SheetCardInfo[] = [
    {
      id: 'Stok_Alat',
      name: 'Stok_Alat',
      description: 'Inventaris instrumen, neraca digital, alat gelas & perkakas',
      icon: <Boxes className="w-5 h-5 text-sky-700" />,
      color: 'text-sky-700',
      bgLight: 'bg-sky-50',
      borderCol: 'border-sky-200',
      localCount: alatItems.length,
    },
    {
      id: 'Bahan_Kimia',
      name: 'Bahan_Kimia',
      description: 'Stok bahan kimia, larutan asam/basa, reagen & garam',
      icon: <FlaskConical className="w-5 h-5 text-amber-700" />,
      color: 'text-amber-700',
      bgLight: 'bg-amber-50',
      borderCol: 'border-amber-200',
      localCount: bahanItems.length,
    },
    {
      id: 'Jurnal_Praktikum',
      name: 'Jurnal_Praktikum',
      description: 'Buku kendali praktikum, agenda harian guru & absensi santri',
      icon: <BookOpen className="w-5 h-5 text-emerald-700" />,
      color: 'text-emerald-700',
      bgLight: 'bg-emerald-50',
      borderCol: 'border-emerald-200',
      localCount: labActivities.length,
    },
    {
      id: 'Data_Siswa',
      name: 'Data_Siswa',
      description: 'Direktori santri, NISN, kelas & rombel lab SMP/SMA',
      icon: <Users className="w-5 h-5 text-indigo-700" />,
      color: 'text-indigo-700',
      bgLight: 'bg-indigo-50',
      borderCol: 'border-indigo-200',
      localCount: students.length,
    },
    {
      id: 'E_Rapot',
      name: 'E_Rapot',
      description: 'Rekapitulasi nilai praktikum siswa, nilai sikap & predikat',
      icon: <GraduationCap className="w-5 h-5 text-purple-700" />,
      color: 'text-purple-700',
      bgLight: 'bg-purple-50',
      borderCol: 'border-purple-200',
      localCount: labActivities.reduce((acc, act) => {
        try {
          const list = act.rekap_nilai_json ? JSON.parse(act.rekap_nilai_json) : [];
          return acc + (Array.isArray(list) ? list.length : 0);
        } catch {
          return acc;
        }
      }, 0),
    },
    {
      id: 'Pengguna',
      name: 'Pengguna',
      description: 'Akun petugas resmi, email, role (Admin/Guru/Laboran) & sandi',
      icon: <ShieldCheck className="w-5 h-5 text-teal-700" />,
      color: 'text-teal-700',
      bgLight: 'bg-teal-50',
      borderCol: 'border-teal-200',
      localCount: accounts.length,
    },
  ];

  // Helper to map SIMLAB item to Google Sheet row payload
  const mapItemToGasRow = (sheetName: GasSheetName, item: any): Record<string, any> => {
    switch (sheetName) {
      case 'Stok_Alat':
        return {
          ID_Barang: item.code || item.id,
          Nama_Alat: item.name,
          Kategori: item.category,
          Jumlah_Stok: item.currentTotalStock ?? item.stok ?? 0,
          Kondisi: (item.conditionGood ?? 0) > 0 ? 'Baik' : 'Perlu Perbaikan',
          Lokasi_Penyimpanan: item.storageRack || '-',
        };
      case 'Bahan_Kimia':
        return {
          ID_Bahan: item.code || item.id,
          Nama_Bahan: item.name,
          Rumus_Kimia: item.brandOrSpec || '-',
          Jumlah_Stok: item.currentTotalStock ?? item.stok ?? 0,
          Satuan: item.unit || 'Botol',
        };
      case 'Jurnal_Praktikum':
        const matchedClass = classes.find((c) => c.id === item.kelas_id);
        return {
          ID_Jurnal: `JRN-${item.id}`,
          Tanggal: item.tanggal_kegiatan,
          Kelas: matchedClass?.nama_kelas || `Kelas #${item.kelas_id}`,
          Materi_Praktikum: item.judul_percobaan,
          Guru_Pengampu: item.nama_guru || '-',
        };
      case 'Pengguna':
        return {
          ID_Pengguna: item.id || item.schoolIdNumber || 'USR',
          Nama_Lengkap: item.name,
          Email_Petugas: item.email,
          Kata_Sandi: item.password || 'labarcss2026',
          Role: item.role,
          Unit_Tugas: item.assignedLab || 'ALL',
        };
      case 'Data_Siswa':
        const studentClass = classes.find((c) => c.id === item.kelas_id);
        return {
          ID_Siswa: String(item.id),
          NISN: item.nisn || '-',
          Nama_Siswa: item.nama_siswa,
          Kelas: studentClass?.nama_kelas || '-',
          Status: item.status || 'Aktif',
        };
      case 'E_Rapot':
        return {
          ID_Nilai: item.id || `RAP-${Date.now()}`,
          NISN: item.nisn || '-',
          Mata_Pelajaran: item.mapel || 'IPA Terpadu',
          Semester: 'Genap',
          Tahun_Ajaran: '2025/2026',
          Nilai_Praktikum: item.nilai_praktikum ?? item.nilai ?? 85,
          Nilai_Sikap_Lab: item.nilai_sikap ?? 'A',
          Predikat: item.predikat ?? 'Sangat Baik',
        };
      default:
        return item;
    }
  };

  // 1. Fetch single sheet (GET)
  const handleFetchSheet = async (sheetName: GasSheetName) => {
    setActiveSyncingSheet(sheetName);
    addLog(`Memulai GET data dari sheet "${sheetName}"...`, 'info');

    const res = await fetchSheetData(sheetName, apiUrl);
    setActiveSyncingSheet(null);

    if (res.success) {
      setFetchedDataPreview({ sheetName, data: res.data });
      addLog(`GET "${sheetName}" Berhasil: Ditemukan ${res.data.length} baris data.`, 'success');
      showToast({
        type: 'success',
        title: `Data ${sheetName} Diambil`,
        message: `Berhasil menarik ${res.data.length} data dari Google Sheets.`,
      });
    } else {
      addLog(`GET "${sheetName}" Gagal: ${res.message}`, 'error');
      showToast({
        type: 'error',
        title: `Gagal Tarik ${sheetName}`,
        message: res.message,
      });
    }
  };

  // 2. Save / Push single sheet (POST)
  const handlePushSheet = async (sheetName: GasSheetName) => {
    let sourceData: any[] = [];
    if (sheetName === 'Stok_Alat') sourceData = alatItems;
    else if (sheetName === 'Bahan_Kimia') sourceData = bahanItems;
    else if (sheetName === 'Jurnal_Praktikum') sourceData = labActivities;
    else if (sheetName === 'Pengguna') sourceData = accounts;
    else if (sheetName === 'Data_Siswa') sourceData = students;
    else if (sheetName === 'E_Rapot') {
      labActivities.forEach((act) => {
        try {
          const list = act.rekap_nilai_json ? JSON.parse(act.rekap_nilai_json) : [];
          if (Array.isArray(list)) {
            list.forEach((score: any, idx: number) => {
              sourceData.push({
                id: `RAP-${act.id}-${score.nisn || idx}`,
                nisn: score.nisn,
                mapel: act.laboratorium,
                nilai_praktikum: score.nilai,
                nilai_sikap: score.sikap || 'A',
                predikat: score.predikat || 'Sangat Baik',
              });
            });
          }
        } catch {
          // ignore
        }
      });
    }

    if (sourceData.length === 0) {
      showToast({
        type: 'info',
        title: 'Data Kosong',
        message: `Tidak ada data lokal untuk dikirim ke sheet ${sheetName}.`,
      });
      return;
    }

    setActiveSyncingSheet(sheetName);
    setSyncProgress({ current: 0, total: sourceData.length });
    addLog(`Mengirim ${sourceData.length} baris data ke sheet "${sheetName}" (POST)...`, 'info');

    const mappedRows = sourceData.map((item) => mapItemToGasRow(sheetName, item));
    const result = await batchSaveSheetData(
      sheetName,
      mappedRows,
      (current, total) => setSyncProgress({ current, total }),
      apiUrl
    );

    setActiveSyncingSheet(null);
    setSyncProgress(null);

    if (result.success) {
      addLog(`POST "${sheetName}" Selesai: ${result.insertedCount} data berhasil tersimpan di Google Sheets.`, 'success');
      showToast({
        type: 'success',
        title: `Sync ${sheetName} Berhasil`,
        message: `${result.insertedCount} baris data berhasil disinkronkan ke Google Sheets.`,
      });
    } else {
      addLog(`POST "${sheetName}" Sebagian Gagal: ${result.insertedCount} berhasil, ${result.errorsCount} gagal.`, 'error');
      showToast({
        type: 'warning',
        title: `Sync ${sheetName}`,
        message: result.message,
      });
    }
  };

  // 3. Push All Sheets sequentially
  const handlePushAll = async () => {
    setActiveSyncingSheet('ALL');
    addLog('--- Memulai Sinkronisasi Lengkap (POST Semua Sheet) ---', 'info');

    for (const def of sheetDefinitions) {
      await handlePushSheet(def.id);
      await new Promise((r) => setTimeout(r, 400));
    }

    setActiveSyncingSheet(null);
    addLog('--- Sinkronisasi Lengkap Selesai ---', 'success');
    showToast({
      type: 'success',
      title: 'Sinkronisasi Lengkap Selesai',
      message: 'Seluruh sheet (Stok Alat, Bahan, Jurnal, Siswa, E-Rapot, Pengguna) telah diproses.',
    });
  };

  // 4. Fetch All Sheets sequentially
  const handleFetchAll = async () => {
    setActiveSyncingSheet('ALL');
    addLog('--- Memulai Pengambilan Lengkap (GET Semua Sheet) ---', 'info');

    for (const def of sheetDefinitions) {
      await handleFetchSheet(def.id);
      await new Promise((r) => setTimeout(r, 300));
    }

    setActiveSyncingSheet(null);
    addLog('--- Pengambilan Lengkap Selesai ---', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Sinkronisasi Google Sheets &amp; Apps Script
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Backend API v2026
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Penghubung dua arah (Bi-Directional Sync) antara portal SIMLAB dan Google Sheets melalui Google Apps Script Web App.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Endpoint Configuration Bar */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Endpoint Google Apps Script Web App
                </span>
              </div>

              <div className="flex items-center gap-2">
                {testStatus.tested && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      testStatus.success
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {testStatus.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{testStatus.success ? 'Online & Terhubung' : 'Terputus'}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus.loading}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-teal-700 ${
                      testStatus.loading ? 'animate-spin' : ''
                    }`}
                  />
                  <span>{testStatus.loading ? 'Memeriksa...' : 'Uji Koneksi'}</span>
                </button>
              </div>
            </div>

            {isEditingUrl ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrlState(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-teal-500 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                />
                <button
                  type="button"
                  onClick={handleSaveApiUrl}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiUrlState(getGasApiUrl());
                    setIsEditingUrl(false);
                  }}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 break-all">
                <span className="truncate">{apiUrl}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(true)}
                  className="shrink-0 text-teal-700 hover:underline font-sans text-xs font-bold px-1"
                >
                  Ubah
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions Global Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-teal-200/80 rounded-2xl">
            <div>
              <p className="text-xs font-extrabold text-teal-950 uppercase tracking-wide">
                Operasi Masal Seluruh Sheet (Bulk Action)
              </p>
              <p className="text-[11px] text-slate-600">
                Lakukan pengiriman atau pengambilan data sekaligus untuk 6 sheet.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleFetchAll}
                disabled={activeSyncingSheet !== null}
                className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" />
                <span>Tarik Semua (GET)</span>
              </button>

              <button
                type="button"
                onClick={handlePushAll}
                disabled={activeSyncingSheet !== null}
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Kirim Semua (POST)</span>
              </button>
            </div>
          </div>

          {/* Progress Indicator if active */}
          {syncProgress && (
            <div className="bg-teal-900 text-white rounded-2xl p-4 shadow-md space-y-2 animate-in fade-in">
              <div className="flex justify-between text-xs font-bold">
                <span>Sinkronisasi Sheet: {activeSyncingSheet}</span>
                <span>
                  {syncProgress.current} / {syncProgress.total} baris (
                  {Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-teal-950/80 h-2.5 rounded-full overflow-hidden border border-teal-700">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full transition-all duration-300"
                  style={{
                    width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Sheet Cards Grid (6 Sheets) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-700" />
                <span>Daftar 6 Sheet Target Terkonfigurasi</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Pilih aksi per sheet secara spesifik
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {sheetDefinitions.map((sheet) => {
                const isSyncing = activeSyncingSheet === sheet.id;
                return (
                  <div
                    key={sheet.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${sheet.bgLight} border ${sheet.borderCol}`}
                      >
                        {sheet.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {sheet.name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                            {sheet.localCount} baris lokal
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {sheet.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleFetchSheet(sheet.id)}
                        disabled={activeSyncingSheet !== null}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        title={`Tarik data terbaru dari sheet ${sheet.name} (GET)`}
                      >
                        <Download className="w-3.5 h-3.5 text-teal-700" />
                        <span>Tarik (GET)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePushSheet(sheet.id)}
                        disabled={activeSyncingSheet !== null}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                        title={`Kirim data lokal ke sheet ${sheet.name} (POST)`}
                      >
                        {isSyncing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{isSyncing ? 'Mengirim...' : 'Kirim (POST)'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Data Preview Table (When Data is Fetched via GET) */}
          {fetchedDataPreview && (
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 text-white space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold font-mono text-emerald-300">
                    Pratinjau Data Live Sheet: {fetchedDataPreview.sheetName}
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                    {fetchedDataPreview.data.length} Baris Diterima
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFetchedDataPreview(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Tutup Pratinjau ✕
                </button>
              </div>

              {fetchedDataPreview.data.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">
                  Sheet ini belum memiliki baris data di Google Sheets.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-48 rounded-lg border border-slate-800">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-950 text-slate-300 uppercase sticky top-0 border-b border-slate-800">
                      <tr>
                        {Object.keys(fetchedDataPreview.data[0] || {}).map((headerKey) => (
                          <th key={headerKey} className="px-3 py-2 font-bold whitespace-nowrap">
                            {headerKey}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                      {fetchedDataPreview.data.slice(0, 15).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                          {Object.keys(fetchedDataPreview.data[0] || {}).map((colKey, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 text-slate-200 whitespace-nowrap max-w-[200px] truncate">
                              {row[colKey] !== undefined && row[colKey] !== null ? String(row[colKey]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {fetchedDataPreview.data.length > 15 && (
                    <div className="text-[10px] text-slate-400 text-center py-1.5 bg-slate-950 border-t border-slate-800">
                      Menampilkan 15 dari {fetchedDataPreview.data.length} total baris data.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Activity Log Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-600" />
                <span>Log Aktivitas Sinkronisasi Real-Time</span>
              </span>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-[10.5px] text-slate-400 hover:text-slate-600"
                >
                  Bersihkan Log
                </button>
              )}
            </div>

            <div className="h-32 bg-slate-950 text-emerald-400 rounded-xl p-3 font-mono text-[11px] overflow-y-auto space-y-1 shadow-inner border border-slate-800">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">
                  Belum ada riwayat aktivitas. Silakan klik "Uji Koneksi", "Tarik (GET)", atau "Kirim (POST)".
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    <span
                      className={
                        log.type === 'error'
                          ? 'text-rose-400 font-semibold'
                          : log.type === 'success'
                          ? 'text-emerald-300 font-semibold'
                          : 'text-slate-300'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Google Apps Script Backend Active • Port 3000 HTTPS Proxy Safe</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            Tutup Panel
          </button>
        </div>
      </div>
    </div>
  );
};
