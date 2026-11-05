/**
 * Google Apps Script Backend Integration Service for SIMLAB Ar-Rahmah Cendekia
 * Handles real-time reading (GET) and writing (POST) for all SIMLAB modules:
 * - Stok_Alat (Equipment Inventory)
 * - Bahan_Kimia (Chemicals & Reagents)
 * - Jurnal_Praktikum (Practicum Journals & Logbooks)
 * - Data_Siswa (Student & Class Directory)
 * - E_Rapot / E_Raport (Student Practicum Scores & Rubrics)
 * - Pengguna (Official Staff & Laboran Authentication)
 */

import {
  InventoryItem,
  UserAccount,
  LabActivityRecord,
  LabStudent,
  LabId,
  ItemCategory,
  UserRole,
  ToolLoanRecord,
  LoanStatus,
  LoanBorrowerType,
  StockTransaction,
} from '../types/inventory';
import { LabBannerItem, normalizeMediaUrl } from '../data/labBanners';

export const DEFAULT_GAS_API_URL =
  'https://script.google.com/macros/s/AKfycbyM2H7Ygpzdq0eReTKndMUdZWisiDfl_nL0ISIZWR2sS_I3vxBNo5TtJAtdvVsF4zWX4A/exec';

export type GasSheetName =
  | 'Stok_Alat'
  | 'Alat'
  | 'Bahan_Kimia'
  | 'Bahan'
  | 'Peminjaman_Alat'
  | 'Peminjaman'
  | 'Slideshow'
  | 'Informasi'
  | 'Jurnal_Praktikum'
  | 'Data_Siswa'
  | 'E_Rapot'
  | 'E_Raport'
  | 'Pengguna'
  | 'Penggunaan_Bahan';

export interface GasApiResponse<T = any> {
  status: 'online' | 'success' | 'error';
  message?: string;
  data?: T;
}

export interface GasSyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  errorMessage: string | null;
  stats: {
    stokAlat: number;
    bahanKimia: number;
    peminjaman: number;
    slideshow: number;
    jurnalPraktikum: number;
    dataSiswa: number;
    erapot: number;
    pengguna: number;
  };
}

/**
 * Get current active Google Apps Script API URL from localStorage or default
 */
export const getGasApiUrl = (): string => {
  try {
    const saved = localStorage.getItem('simlab_gas_api_url');
    // Otomatis migrasi jika masih tersimpan deployment URL lama
    if (saved && (saved.includes('AKfycbzCa0JROg') || !saved.trim().startsWith('https://script.google.com/'))) {
      localStorage.setItem('simlab_gas_api_url', DEFAULT_GAS_API_URL);
      return DEFAULT_GAS_API_URL;
    }
    if (saved && saved.trim().startsWith('https://script.google.com/')) {
      return saved.trim();
    }
  } catch {
    // ignore
  }
  return DEFAULT_GAS_API_URL;
};

/**
 * Set active Google Apps Script API URL
 */
export const setGasApiUrl = (url: string): void => {
  try {
    localStorage.setItem('simlab_gas_api_url', url.trim());
  } catch {
    // ignore
  }
};

/**
 * Test connectivity with Google Apps Script Web App
 */
export const testGasConnection = async (
  apiUrl: string = getGasApiUrl()
): Promise<{ success: boolean; message: string; raw?: any }> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(apiUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}: Gagal terhubung ke Google Apps Script.`,
      };
    }

    const json = await res.json();
    return {
      success: true,
      message: json.message || 'API Google Apps Script siap dan terhubung.',
      raw: json,
    };
  } catch (err: any) {
    return {
      success: false,
      message:
        err.name === 'AbortError'
          ? 'Koneksi ke Google Apps Script timeout (12 detik). Periksa koneksi internet.'
          : `Gagal mengakses endpoint: ${err.message || 'Kesalahan jaringan'}`,
    };
  }
};

/**
 * Fetch data (GET) from a specific sheet in Google Sheets
 */
export const fetchSheetData = async <T = any>(
  sheetName: GasSheetName,
  apiUrl: string = getGasApiUrl()
): Promise<{ success: boolean; data: T[]; message: string }> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const targetUrl = `${apiUrl}?action=getData&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        data: [],
        message: `HTTP ${res.status}: Gagal mengambil data dari sheet ${sheetName}.`,
      };
    }

    let json: GasApiResponse<T[]> = await res.json();

    // Fallback for E_Rapot -> E_Raport if first attempt reports sheet not found
    if (json.status === 'error' && sheetName === 'E_Rapot') {
      try {
        const fallbackRes = await fetch(
          `${apiUrl}?action=getData&sheet=E_Raport`
        );
        const fallbackJson: GasApiResponse<T[]> = await fallbackRes.json();
        if (fallbackJson.status === 'success' && Array.isArray(fallbackJson.data)) {
          return {
            success: true,
            data: fallbackJson.data,
            message: `Data sheet E_Raport berhasil dimuat (${fallbackJson.data.length} baris).`,
          };
        }
      } catch {
        // ignore fallback error
      }
    }

    if (json.status === 'success' && Array.isArray(json.data)) {
      return {
        success: true,
        data: json.data,
        message: `Data sheet ${sheetName} berhasil dimuat (${json.data.length} baris).`,
      };
    }

    return {
      success: false,
      data: [],
      message: json.message || `Sheet ${sheetName} belum memiliki data atau belum ditemukan.`,
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      message:
        err.name === 'AbortError'
          ? `Timeout saat membaca sheet ${sheetName}.`
          : `Gagal membaca sheet ${sheetName}: ${err.message || 'Kesalahan jaringan'}`,
    };
  }
};

/**
 * Mengambil nama header Primary Key (Kolom A) resmi berdasarkan nama sheet
 */
export const getSheetPrimaryKeyHeader = (sheetName: string): string => {
  const clean = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean === 'pengguna' || clean === 'users' || clean === 'user' || clean === 'petugas') return 'ID_Pengguna';
  if (clean === 'alat' || clean === 'stokalat' || clean === 'inventarisalat') return 'ID_Barang';
  if (clean === 'bahan' || clean === 'bahankimia' || clean === 'reagen' || clean === 'stokbahan') return 'ID_Bahan';
  if (clean === 'peminjaman' || clean === 'peminjamanalat' || clean === 'pinjam') return 'ID_Pinjam';
  if (clean === 'penggunaanbahan' || clean === 'transaksibahan' || clean === 'transaksi' || clean === 'pemakaian') return 'ID_Transaksi';
  if (clean === 'slideshow' || clean === 'informasi' || clean === 'banner' || clean === 'slides') return 'ID_Slide';
  if (clean.includes('jurnal') || clean.includes('praktikum')) return 'ID_Jurnal';
  if (clean.includes('siswa') || clean.includes('santri')) return 'NISN';
  if (clean.includes('rap')) return 'ID_Nilai';
  return 'ID_Barang';
};

/**
 * In-Flight Request Deduplicator:
 * Mencegah pengiriman request POST ganda (double-post) saat tombol submit atau sinkronisasi diklik berulang kali.
 */
const inFlightPostRequests = new Map<string, Promise<{ success: boolean; message: string }>>();

export const getRecordIdentifier = (dataRecord: Record<string, any>): string => {
  if (!dataRecord || typeof dataRecord !== 'object') return '';
  const val =
    dataRecord.id ||
    dataRecord.ID ||
    dataRecord.code ||
    dataRecord.ID_Barang ||
    dataRecord.ID_Bahan ||
    dataRecord.ID_Pinjam ||
    dataRecord.ID_Pengguna ||
    dataRecord.Email_Petugas ||
    dataRecord.email ||
    dataRecord.ID_Transaksi ||
    dataRecord.ID_Slide ||
    dataRecord.ID_Jurnal ||
    dataRecord.ID_Siswa ||
    dataRecord.NISN ||
    dataRecord.ID_Nilai;
  return val ? String(val).trim() : '';
};

/**
 * Save / Upsert data (POST) to a specific sheet in Google Sheets
 * 100% Anti-Duplikasi:
 * - Mengirim hanya objek data yang diubah/ditambah (bukan array mentah duplikat).
 * - Wajib menyertakan properti ID (baik `id` maupun nama Primary Key kolom A seperti ID_Pengguna/ID_Barang).
 * - Menolak double-click request yang sedang berjalan.
 */
export const saveSheetData = async (
  sheetName: GasSheetName,
  dataRecord: Record<string, any> | Record<string, any>[],
  apiUrl: string = getGasApiUrl()
): Promise<{ success: boolean; message: string }> => {
  const pkHeader = getSheetPrimaryKeyHeader(sheetName);

  // 1. Penanganan jika payload berupa Array (misal batch sinkronisasi):
  // Pastikan array telah dideduplikasi berdasarkan ID unik sebelum dikirim ke backend
  if (Array.isArray(dataRecord)) {
    const seenIds = new Set<string>();
    const sanitizedArray: Record<string, any>[] = [];

    for (const item of dataRecord) {
      if (!item || typeof item !== 'object') continue;
      const itemId = getRecordIdentifier(item) || `REC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const cleanKey = itemId.toLowerCase();
      if (!seenIds.has(cleanKey)) {
        seenIds.add(cleanKey);
        sanitizedArray.push({
          ...item,
          id: itemId,
          [pkHeader]: item[pkHeader] || itemId,
        });
      }
    }

    if (sanitizedArray.length === 0) {
      return { success: true, message: 'Tidak ada data baru untuk dikirim.' };
    }

    try {
      const payload = {
        action: 'upsert',
        sheet: sheetName,
        data: sanitizedArray,
      };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return { success: false, message: `HTTP ${res.status}: Gagal menyimpan batch ke sheet ${sheetName}.` };
      }
      const json = await res.json();
      return { success: json.status === 'success', message: json.message || `Data berhasil disimpan ke sheet ${sheetName}.` };
    } catch (err: any) {
      return { success: false, message: `Gagal mengirim batch ke sheet ${sheetName}: ${err.message || 'Kesalahan jaringan'}` };
    }
  }

  // 2. Penanganan Objek Tunggal (Single Data Record - Kasus Form Simpan / Edit)
  const rawId = getRecordIdentifier(dataRecord);
  const fallbackId = `REC-${Date.now()}`;
  const effectiveId = rawId || fallbackId;

  // Pastikan ID wajib ada di dalam objek data dan di root payload
  const normalizedData: Record<string, any> = {
    ...dataRecord,
    id: effectiveId,
    [pkHeader]: dataRecord[pkHeader] || effectiveId,
  };

  const dedupeKey = `upsert:${sheetName}:${effectiveId}`;

  // Cegah double-post / double-click jika request dengan ID yang sama sedang aktif berjalan
  if (inFlightPostRequests.has(dedupeKey)) {
    return inFlightPostRequests.get(dedupeKey)!;
  }

  const executionPromise = (async () => {
    try {
      const payload: Record<string, any> = {
        action: 'upsert', // Meminta UPSERT aman anti-duplikasi
        sheet: sheetName,
        id: effectiveId,
        [pkHeader]: effectiveId,
        data: normalizedData, // HANYA mengirimkan objek tunggal yang sedang ditambah/diubah
      };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return {
          success: false,
          message: `HTTP ${res.status}: Gagal menyimpan data ke sheet ${sheetName}.`,
        };
      }

      const json = await res.json();
      if (json.status === 'success') {
        return {
          success: true,
          message: json.message || `Data berhasil disimpan ke sheet ${sheetName}.`,
        };
      }

      // Fallback for E_Rapot -> E_Raport
      if (sheetName === 'E_Rapot' && json.status === 'error') {
        try {
          const fbRes = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'upsert',
              sheet: 'E_Raport',
              id: effectiveId,
              [getSheetPrimaryKeyHeader('E_Raport')]: effectiveId,
              data: normalizedData,
            }),
          });
          const fbJson = await fbRes.json();
          if (fbJson.status === 'success') {
            return { success: true, message: fbJson.message || 'Data berhasil disimpan ke E_Raport.' };
          }
        } catch {
          // ignore
        }
      }

      return {
        success: false,
        message: json.message || `Gagal menyimpan data ke sheet ${sheetName}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal mengirim data ke sheet ${sheetName}: ${err.message || 'Kesalahan jaringan'}`,
      };
    } finally {
      // Pertahankan lock selama 500ms untuk menepis multi-click cepat pada browser
      setTimeout(() => {
        inFlightPostRequests.delete(dedupeKey);
      }, 500);
    }
  })();

  inFlightPostRequests.set(dedupeKey, executionPromise);
  return executionPromise;
};

/**
 * Update data (POST action=update) on a specific sheet in Google Sheets
 * Matches target ID and updates the corresponding row in place using fast batch setValues.
 */
export const updateSheetData = async (
  sheetName: GasSheetName,
  targetId: string | number,
  dataRecord: Record<string, any>,
  apiUrl: string = getGasApiUrl()
): Promise<{ success: boolean; message: string }> => {
  const cleanId = String(targetId).trim();
  const pkHeader = getSheetPrimaryKeyHeader(sheetName);
  const dedupeKey = `update:${sheetName}:${cleanId}`;

  // Cegah double-post update jika request update dengan ID sama sedang berjalan
  if (cleanId && inFlightPostRequests.has(dedupeKey)) {
    return inFlightPostRequests.get(dedupeKey)!;
  }

  const normalizedData: Record<string, any> = {
    ...dataRecord,
    id: cleanId,
    [pkHeader]: dataRecord[pkHeader] || cleanId,
  };

  const executionPromise = (async () => {
    try {
      const payload = {
        action: 'update',
        sheet: sheetName,
        id: cleanId,
        [pkHeader]: cleanId,
        data: normalizedData, // HANYA mengirimkan 1 objek tunggal yang sedang diedit
      };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return {
          success: false,
          message: `HTTP ${res.status}: Gagal memperbarui data pada sheet ${sheetName}.`,
        };
      }

      const json = await res.json();
      return {
        success: json.status === 'success',
        message: json.message || `Data pada sheet ${sheetName} berhasil diperbarui.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal memperbarui data di sheet ${sheetName}: ${err.message || 'Kesalahan jaringan'}`,
      };
    } finally {
      setTimeout(() => {
        inFlightPostRequests.delete(dedupeKey);
      }, 500);
    }
  })();

  if (cleanId) {
    inFlightPostRequests.set(dedupeKey, executionPromise);
  }

  return executionPromise;
};

/**
 * Delete data (POST action=delete) from a specific sheet in Google Sheets
 */
export const deleteSheetData = async (
  sheetName: GasSheetName,
  targetId: string | number,
  apiUrl: string = getGasApiUrl()
): Promise<{ success: boolean; message: string }> => {
  try {
    const payload = {
      action: 'delete',
      sheet: sheetName,
      id: targetId,
    };

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}: Gagal menghapus data dari sheet ${sheetName}.`,
      };
    }

    const json = await res.json();
    return {
      success: json.status === 'success',
      message: json.message || `Data berhasil dihapus dari sheet ${sheetName}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghapus data di sheet ${sheetName}: ${err.message || 'Kesalahan jaringan'}`,
    };
  }
};

/**
 * Batch insert multiple rows into a sheet sequentially with delay
 */
export const batchSaveSheetData = async (
  sheetName: GasSheetName,
  dataRecords: Record<string, any>[],
  onProgress?: (completed: number, total: number) => void,
  apiUrl: string = getGasApiUrl()
): Promise<{ success: boolean; insertedCount: number; errorsCount: number; message: string }> => {
  let insertedCount = 0;
  let errorsCount = 0;

  for (let i = 0; i < dataRecords.length; i++) {
    const record = dataRecords[i];
    const result = await saveSheetData(sheetName, record, apiUrl);
    if (result.success) {
      insertedCount++;
    } else {
      errorsCount++;
    }
    if (onProgress) {
      onProgress(i + 1, dataRecords.length);
    }
    // Small pause to be gentle on Google Apps Script quotas
    if (i < dataRecords.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return {
    success: errorsCount === 0,
    insertedCount,
    errorsCount,
    message: `Selesai sinkronisasi sheet ${sheetName}: ${insertedCount} tersimpan, ${errorsCount} gagal.`,
  };
};

// ==============================================================================
// DOMAIN MAPPERS: SIMLAB <-> GOOGLE APPS SCRIPT DATABASE
// ==============================================================================

/**
 * Map SIMLAB InventoryItem to Google Sheet Row (Alat or Bahan)
 */
export const mapItemToGasPayload = (
  item: InventoryItem
): { targetSheet: 'Alat' | 'Bahan'; row: Record<string, any> } => {
  const primaryId = String(item.code || item.id).trim();

  if (item.category === 'Bahan Kimia & Reagen') {
    return {
      targetSheet: 'Bahan',
      row: {
        id: primaryId,
        ID_Bahan: primaryId,
        Nama_Bahan: item.name,
        Rumus_Kimia: item.brandOrSpec || '-',
        Bentuk_Wujud: 'Cair / Padat',
        Stok_Tersedia: Number(item.currentTotalStock ?? 0),
        Satuan: item.unit || 'Botol',
        Batas_Minimum: Number(item.minStockAlert ?? 5),
        Lokasi_Penyimpanan: item.storageRack || 'Lemari Bahan Kimia',
        Tanggal_Kadaluarsa: item.expiredDate || '2028-12-31',
        Klasifikasi_Bahaya: item.notes || 'Bahan Laboratorium',
      },
    };
  }

  return {
    targetSheet: 'Alat',
    row: {
      id: primaryId,
      ID_Barang: primaryId,
      Nama_Alat: item.name,
      Kategori: item.category,
      Sub_Lab: item.primaryLab || 'SEMUA_LAB',
      Jumlah_Stok: Number(item.currentTotalStock ?? 0),
      Kondisi_Baik: Number(item.conditionGood ?? item.currentTotalStock ?? 0),
      Kondisi_Rusak_Ringan: Number(item.conditionLightDamage ?? 0),
      Kondisi_Rusak_Berat: Number(item.conditionHeavyDamage ?? 0),
      Lokasi_Penyimpanan: item.storageRack || '-',
      Spesifikasi_Merek: item.brandOrSpec || '-',
      Status_Kalibrasi: item.calibrationStatus || 'Bagus',
    },
  };
};

/**
 * Parse Google Sheet row into InventoryItem (supporting both modern and legacy headers)
 */
export const mapGasRowToInventoryItem = (
  row: Record<string, any>,
  sheetType: 'Stok_Alat' | 'Alat' | 'Bahan_Kimia' | 'Bahan'
): InventoryItem | null => {
  const isChemical = sheetType === 'Bahan_Kimia' || sheetType === 'Bahan' || !!row.ID_Bahan;

  if (isChemical) {
    const id = String(row.ID_Bahan || row.ID_Barang || '').trim();
    const name = String(row.Nama_Bahan || row.Nama_Alat || '').trim();
    if (!id && !name) return null;

    const rawStock = row.Stok_Tersedia !== undefined ? row.Stok_Tersedia : row.Jumlah_Stok;
    const stock = Number(rawStock) || 0;
    const minAlert = Number(row.Batas_Minimum) || 5;

    return {
      id: id || `BHM-${Date.now()}`,
      code: id || 'BHM-01',
      name: name || 'Bahan Kimia & Reagen',
      category: 'Bahan Kimia & Reagen',
      primaryLab: 'KIMIA',
      unit: String(row.Satuan || 'Botol'),
      initialStock2026: stock,
      totalIn: 0,
      totalOut: 0,
      currentTotalStock: stock,
      minStockAlert: minAlert,
      conditionGood: stock,
      conditionLightDamage: 0,
      conditionHeavyDamage: 0,
      distribution: {
        FISIKA: 0,
        KIMIA: stock,
        BIOLOGI: 0,
        SMP_TERPADU: 0,
      },
      storageRack: String(row.Lokasi_Penyimpanan || 'Lemari Reagen & Bahan Kimia'),
      brandOrSpec: String(row.Rumus_Kimia || row.Spesifikasi_Merek || '-'),
      expiredDate: row.Tanggal_Kadaluarsa ? String(row.Tanggal_Kadaluarsa) : undefined,
      notes: row.Klasifikasi_Bahaya ? `Bahaya: ${row.Klasifikasi_Bahaya}` : undefined,
      lastUpdated: new Date().toISOString().substring(0, 10),
    };
  }

  // Stok_Alat / Alat
  const id = String(row.ID_Barang || row.ID_Alat || '').trim();
  const name = String(row.Nama_Alat || row.Nama_Barang || '').trim();
  if (!id && !name) return null;

  const stock = Number(row.Jumlah_Stok) || 0;
  const rawKategori = String(row.Kategori || '').trim();
  const validCategories: ItemCategory[] = [
    'Alat Ukur & Neraca',
    'Alat Gelas & Keramik',
    'Bahan Kimia & Reagen',
    'Instrumen Optik',
    'Model & Preparat Biologi',
    'Kit Praktikum Terpadu',
    'Perkakas & Keselamatan Kerja',
  ];
  const category = validCategories.find((c) => c.toLowerCase() === rawKategori.toLowerCase()) || 'Kit Praktikum Terpadu';

  // Sub_Lab mapping
  const rawSubLab = String(row.Sub_Lab || '').trim().toUpperCase();
  let primaryLab: LabId | 'ALL' = 'ALL';
  const distribution = {
    FISIKA: 0,
    KIMIA: 0,
    BIOLOGI: 0,
    SMP_TERPADU: 0,
  };

  if (rawSubLab === 'FISIKA') {
    primaryLab = 'FISIKA';
    distribution.FISIKA = stock;
  } else if (rawSubLab === 'KIMIA') {
    primaryLab = 'KIMIA';
    distribution.KIMIA = stock;
  } else if (rawSubLab === 'BIOLOGI') {
    primaryLab = 'BIOLOGI';
    distribution.BIOLOGI = stock;
  } else if (rawSubLab === 'SMP_TERPADU' || rawSubLab.includes('SMP')) {
    primaryLab = 'SMP_TERPADU';
    distribution.SMP_TERPADU = stock;
  } else {
    primaryLab = 'ALL';
    distribution.FISIKA = Math.floor(stock / 3);
    distribution.KIMIA = Math.floor(stock / 3);
    distribution.BIOLOGI = stock - Math.floor(stock / 3) * 2;
  }

  // Conditions
  const condBaik = row.Kondisi_Baik !== undefined ? Number(row.Kondisi_Baik) : (row.Kondisi === 'Perlu Perbaikan' ? 0 : stock);
  const condRusakRingan = row.Kondisi_Rusak_Ringan !== undefined ? Number(row.Kondisi_Rusak_Ringan) : (row.Kondisi === 'Perlu Perbaikan' ? stock : 0);
  const condRusakBerat = row.Kondisi_Rusak_Berat !== undefined ? Number(row.Kondisi_Rusak_Berat) : 0;

  return {
    id: id || `ALT-${Date.now()}`,
    code: id || 'ALT-001',
    name: name || 'Alat Praktikum',
    category,
    primaryLab,
    unit: 'Unit',
    initialStock2026: stock,
    totalIn: 0,
    totalOut: 0,
    currentTotalStock: stock,
    minStockAlert: Math.max(1, Math.floor(stock * 0.2)),
    conditionGood: isNaN(condBaik) ? stock : condBaik,
    conditionLightDamage: isNaN(condRusakRingan) ? 0 : condRusakRingan,
    conditionHeavyDamage: isNaN(condRusakBerat) ? 0 : condRusakBerat,
    distribution,
    storageRack: String(row.Lokasi_Penyimpanan || 'Rak Penyimpanan Lab'),
    brandOrSpec: String(row.Spesifikasi_Merek || '-'),
    lastUpdated: new Date().toISOString().substring(0, 10),
  };
};

/**
 * Map Google Sheet row into ToolLoanRecord
 */
export const mapGasRowToLoan = (row: Record<string, any>, index: number): ToolLoanRecord | null => {
  const idPinjam = String(row.ID_Pinjam || row.ID_Peminjaman || '').trim();
  const borrowerName = String(row.Peminjam_Nama || row.Nama_Peminjam || '').trim();
  const itemName = String(row.Nama_Barang || '').trim();

  if (!idPinjam && !borrowerName && !itemName) return null;

  const rawStatus = String(row.Status || '').trim().toUpperCase();
  let status: LoanStatus = 'DIPINJAM';
  if (rawStatus.includes('KEMBALI') || rawStatus === 'SUDAH_KEMBALI') {
    const rawCond = String(row.Kondisi_Kembali || '').toLowerCase();
    status = rawCond.includes('rusak') || rawCond.includes('pecah') ? 'KEMBALI_RUSAK_PECAH' : 'KEMBALI_BAIK';
  }

  const borrowerClass = String(row.Kelas_Rombel || row.Kelas_Unit || '-');
  const isGuru = borrowerClass.toLowerCase().includes('guru');
  const schoolLevel = borrowerClass.toUpperCase().includes('SMP') ? 'SMP' : 'SMA';

  return {
    id: idPinjam || `loan-${Date.now()}-${index}`,
    code: idPinjam || `PJM-2026-${String(index + 1).padStart(3, '0')}`,
    itemId: `item-ref-${index}`,
    itemCode: String(row.ID_Barang || '-'),
    itemName: itemName || 'Alat Praktikum',
    quantity: Number(row.Jumlah) || 1,
    borrowerType: isGuru ? 'GURU' : 'SISWA',
    borrowerName: borrowerName || 'Peminjam',
    borrowerClassOrDept: borrowerClass,
    schoolLevel,
    targetLab: 'FISIKA',
    borrowDate: String(row.Tgl_Pinjam || row.Tanggal_Pinjam || new Date().toISOString().substring(0, 10)),
    expectedReturnDate: String(row.Tgl_Batas_Kembali || row.Batas_Kembali || ''),
    actualReturnDate: row.Tgl_Realisasi_Kembali ? String(row.Tgl_Realisasi_Kembali) : undefined,
    purpose: 'Praktikum & Eksperimen Siswa',
    status,
    returnedCondition: row.Kondisi_Kembali ? (String(row.Kondisi_Kembali) as any) : undefined,
    picOfficer: String(row.Petugas_PIC || 'Petugas Lab'),
    notes: row.Kontak_WA ? `Kontak WA: ${row.Kontak_WA}` : undefined,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Map ToolLoanRecord to Google Sheet row payload
 */
export const mapLoanToGasPayload = (loan: ToolLoanRecord): Record<string, any> => {
  return {
    ID_Pinjam: loan.code || loan.id,
    Peminjam_Nama: loan.borrowerName,
    Kelas_Rombel: loan.borrowerClassOrDept,
    Kontak_WA: '-',
    Nama_Barang: loan.itemName,
    Jumlah: loan.quantity,
    Tgl_Pinjam: loan.borrowDate,
    Tgl_Batas_Kembali: loan.expectedReturnDate,
    Tgl_Realisasi_Kembali: loan.actualReturnDate || '',
    Status: loan.status === 'KEMBALI_BAIK' || loan.status === 'KEMBALI_RUSAK_PECAH' ? 'SUDAH_KEMBALI' : 'DIPINJAM',
    Petugas_PIC: loan.picOfficer,
    Kondisi_Kembali: loan.returnedCondition || (loan.status === 'DIPINJAM' ? '-' : 'Baik & Lengkap'),
  };
};

/**
 * Map Google Sheet row into LabBannerItem
 */
export const mapGasRowToBanner = (row: Record<string, any>, index: number): LabBannerItem | null => {
  const title = String(row.Judul_Pengumuman || '').trim();
  const url = String(row.Media_URL || '').trim();
  if (!title && !url) return null;

  const rawType = String(row.Tipe_Media || '').trim().toLowerCase();
  const type: 'image' | 'video' = rawType === 'video' ? 'video' : 'image';
  const categoryTag = String(row.Kategori || 'Fasilitas Kampus');

  return {
    id: String(row.ID_Slide || `banner-${index + 1}`),
    type,
    url: normalizeMediaUrl(url),
    title,
    subtitle: String(row.Deskripsi_Singkat || ''),
    badge: categoryTag,
    labLocation: categoryTag,
    categoryTag,
  };
};

/**
 * Map LabBannerItem to Google Sheet row payload
 */
export const mapBannerToGasPayload = (banner: LabBannerItem, index: number = 1): Record<string, any> => {
  return {
    ID_Slide: banner.id,
    Judul_Pengumuman: banner.title,
    Deskripsi_Singkat: banner.subtitle,
    Tipe_Media: banner.type === 'video' ? 'VIDEO' : 'GAMBAR',
    Media_URL: banner.url,
    Kategori: banner.categoryTag || banner.badge || 'Laboratorium',
    Status_Aktif: 'AKTIF',
    Urutan_Tampil: index,
  };
};

/**
 * Map SIMLAB LabActivityRecord to Google Sheet Row (Jurnal_Praktikum)
 */
export const mapActivityToGasPayload = (
  act: LabActivityRecord,
  className?: string
): Record<string, any> => {
  return {
    ID_Jurnal: `JRN-${act.id}`,
    Tanggal: act.tanggal_kegiatan,
    Kelas: className || `Kelas #${act.kelas_id}`,
    Materi_Praktikum: act.judul_percobaan,
    Guru_Pengampu: act.nama_guru || '-',
  };
};

/**
 * Map Google Sheet row into LabActivityRecord
 */
export const mapGasRowToActivity = (
  row: Record<string, any>,
  index: number
): LabActivityRecord | null => {
  const judul = String(row.Materi_Praktikum || '').trim();
  if (!judul && !row.ID_Jurnal) return null;

  return {
    id: index + 1000,
    tanggal_kegiatan: String(row.Tanggal || new Date().toISOString().substring(0, 10)),
    laboratorium: 'KIMIA',
    kelas_id: 1,
    nama_guru: String(row.Guru_Pengampu || 'Guru Pengampu'),
    judul_percobaan: judul || 'Praktikum IPA Terpadu',
    materi_pokok: 'Eksperimen Laboratorium',
    jumlah_hadir: 25,
    jumlah_absen: 0,
    rekap_nilai_json: '[]',
    catatan_kejadian: 'Kegiatan berjalan tertib dan aman',
    created_at: new Date().toISOString(),
  };
};

/**
 * Map UserAccount to Pengguna row in Google Sheets
 */
export const mapUserToGasPayload = (user: UserAccount): Record<string, any> => {
  const userId = String(user.id || user.schoolIdNumber || (user.email ? `USR-${user.email.split('@')[0]}` : 'USR-1')).trim();
  return {
    id: userId,
    ID_Pengguna: userId,
    Nama_Lengkap: user.name,
    Email_Petugas: user.email,
    Kata_Sandi: user.password || 'labarcss2026',
    Role: user.role,
    Unit_Tugas: user.assignedLab || 'ALL',
    NIP_ID: user.nip || user.schoolIdNumber || '-',
    Avatar_URL: user.avatarUrl || '',
    Status: user.status || 'aktif',
  };
};

/**
 * Map Pengguna row from Google Sheets into UserAccount
 */
export const mapGasRowToUser = (row: Record<string, any>): UserAccount | null => {
  const email = String(row.Email_Petugas || '').trim();
  const name = String(row.Nama_Lengkap || '').trim();
  if (!email || !name) return null;

  const rawRole = String(row.Role || 'LABORAN').trim().toUpperCase();
  const validRoles: UserRole[] = [
    'KEPALA_LAB',
    'LABORAN_FISIKA',
    'LABORAN_KIMIA',
    'LABORAN_BIOLOGI',
    'GURU_IPA_SMP',
    'LABORAN',
  ];
  const role: UserRole = validRoles.includes(rawRole as any) ? (rawRole as UserRole) : 'LABORAN';

  const defaultRoleTitleMap: Record<UserRole, string> = {
    KEPALA_LAB: 'Kepala Laboratorium IPA Terpadu',
    LABORAN_FISIKA: 'Penanggung Jawab Lab Fisika (SMA)',
    LABORAN_KIMIA: 'Penanggung Jawab Lab Kimia (SMA)',
    LABORAN_BIOLOGI: 'Penanggung Jawab Lab Biologi (SMA)',
    GURU_IPA_SMP: 'Laboran dan Guru IPA Terpadu (SMP)',
    LABORAN: 'Laboran Penanggung Jawab Lab',
  };

  const assignedLab = (['FISIKA', 'KIMIA', 'BIOLOGI', 'SMP_TERPADU'].includes(row.Unit_Tugas)
    ? row.Unit_Tugas
    : 'ALL') as LabId | 'ALL';

  const initials =
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ST';

  return {
    id: String(row.ID_Pengguna || `USR-${email.split('@')[0]}`),
    name,
    email,
    role,
    roleTitle: defaultRoleTitleMap[role],
    assignedLab,
    avatarInitials: initials,
    password: String(row.Kata_Sandi || 'labarcss2026'),
    status: 'aktif',
    schoolIdNumber: String(row.ID_Pengguna || ''),
  };
};

/**
 * Validate NISN value: Checks if valid number string and not empty/dash/null
 */
export const isValidNisn = (val: any): boolean => {
  if (val === undefined || val === null) return false;
  const str = String(val).trim();
  if (!str || str === '-' || str === '—' || str === '--' || str === 'null' || str === 'undefined' || str === '0') {
    return false;
  }
  return true;
};

/**
 * Generate a deterministic unique NISN fallback identifier
 * Format: NISN-<timestamp>-<padded-index>-<random>
 */
export const generateFallbackNisn = (seedIndex: number = 1): string => {
  const timestamp = Date.now().toString().slice(-6);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NISN-${timestamp}-${String(seedIndex).padStart(3, '0')}-${rand}`;
};

/**
 * Normalize Gender representation to 'Laki-laki' or 'Perempuan'
 */
export const normalizeGender = (val: any): 'Laki-laki' | 'Perempuan' => {
  if (!val) return 'Laki-laki';
  const s = String(val).toLowerCase().trim();
  if (s === 'p' || s.startsWith('per') || s.includes('wanita') || s === 'f' || s === 'female') {
    return 'Perempuan';
  }
  return 'Laki-laki';
};

/**
 * Map LabStudent to Data_Siswa row in Google Sheets
 * Uses exact headers: NISN, Nama_Lengkap_Santri, Tingkat_Sekolah, Kelas_Rombel, Jenis_Kelamin, Status_Keaktifan
 */
export const mapStudentToGasPayload = (
  student: LabStudent,
  className?: string
): Record<string, any> => {
  const nisn = isValidNisn(student.nisn)
    ? String(student.nisn).trim()
    : generateFallbackNisn(student.id || 1);

  const rawUnit = student.unit || (className && className.toUpperCase().includes('SMP') ? 'SMP' : 'SMA');
  const gender = normalizeGender(student.gender);
  const statusKeaktifan =
    student.status === 'pindah' ? 'Pindah' : student.status === 'keluar' ? 'Keluar' : 'Aktif';

  return {
    id: nisn, // Primary Key for Apps Script Column A UPSERT
    NISN: nisn,
    Nama_Lengkap_Santri: student.nama_siswa.trim(),
    Tingkat_Sekolah: rawUnit,
    Kelas_Rombel: className?.trim() || '-',
    Jenis_Kelamin: gender,
    Status_Keaktifan: statusKeaktifan,
    // Aliases for backward compatibility with existing components
    ID_Siswa: String(student.id),
    Nama_Siswa: student.nama_siswa.trim(),
    Kelas: className?.trim() || '-',
    Status: statusKeaktifan,
  };
};

/**
 * Map Data_Siswa row from Google Sheets into LabStudent
 */
export const mapGasRowToStudent = (
  row: Record<string, any>,
  index: number
): (LabStudent & { raw_kelas_rombel?: string }) | null => {
  const name = String(row.Nama_Lengkap_Santri || row.Nama_Siswa || row.nama || '').trim();
  if (!name) return null;

  const rawNisn = row.NISN || row.nisn;
  const nisn = isValidNisn(rawNisn) ? String(rawNisn).trim() : generateFallbackNisn(index + 1);

  const rawKelas = String(row.Kelas_Rombel || row.Kelas || row.kelas || '').trim();
  const rawUnit = String(
    row.Tingkat_Sekolah || row.unit || (rawKelas.toUpperCase().includes('SMP') ? 'SMP' : 'SMA')
  ).toUpperCase();
  const unit = rawUnit.includes('SMP') ? 'SMP' : 'SMA';

  const rawStatus = String(row.Status_Keaktifan || row.Status || row.status || 'Aktif').toLowerCase();
  const status: any = rawStatus.includes('pindah')
    ? 'pindah'
    : rawStatus.includes('keluar')
    ? 'keluar'
    : 'aktif';

  return {
    id: Number(row.ID_Siswa) || index + 100,
    nama_siswa: name,
    kelas_id: 1, // Will be dynamically resolved by class name in InventoryContext
    nisn,
    unit,
    gender: normalizeGender(row.Jenis_Kelamin || row.gender),
    status,
    raw_kelas_rombel: rawKelas || undefined,
    created_at: new Date().toISOString(),
  };
};

// ==============================================================================
// ASYNCHRONOUS REAL-TIME SYNC UTILITIES (NON-BLOCKING & OPTIMISTIC BACKGROUND)
// ==============================================================================

/**
 * Map StockTransaction to Penggunaan_Bahan row in Google Sheets
 */
export const mapTransactionToGasPayload = (
  tx: StockTransaction,
  unit: string = 'Unit'
): Record<string, any> => {
  return {
    ID_Transaksi: tx.id,
    ID_Barang: tx.itemId,
    Kode_Barang: tx.itemCode,
    Nama_Barang: tx.itemName,
    Tipe_Transaksi: tx.type,
    Jumlah: tx.quantity,
    Satuan: unit,
    Tanggal: tx.date,
    Lab_Tujuan: tx.targetLab,
    Lab_Asal: tx.fromLab || '-',
    Keperluan_Praktikum: tx.purpose,
    Kelas_Rombel: tx.studentClassOrBatch || '-',
    Nama_PIC: tx.picName,
    Kondisi_Barang: tx.conditionStatus,
    Catatan: tx.notes || '-',
  };
};

/**
 * Asynchronously sync an item to Google Sheets in background (Optimistic UI)
 */
export const syncItemToGas = (item: InventoryItem, apiUrl: string = getGasApiUrl()): void => {
  const { targetSheet, row } = mapItemToGasPayload(item);
  saveSheetData(targetSheet, row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background sync item failed for ${item.name}:`, err);
  });
};

/**
 * Asynchronously update an item in Google Sheets in background (Optimistic UI)
 */
export const syncUpdateItemInGas = (item: InventoryItem, apiUrl: string = getGasApiUrl()): void => {
  const { targetSheet, row } = mapItemToGasPayload(item);
  const targetId = item.code || item.id;
  updateSheetData(targetSheet, targetId, row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background update item failed for ${item.name}:`, err);
  });
};

/**
 * Asynchronously delete an item from Google Sheets in background (Optimistic UI)
 */
export const syncDeleteItemFromGas = (
  itemCodeOrId: string,
  isChemical: boolean = false,
  apiUrl: string = getGasApiUrl()
): void => {
  const targetSheet: GasSheetName = isChemical ? 'Bahan' : 'Alat';
  deleteSheetData(targetSheet, itemCodeOrId, apiUrl).catch((err) => {
    console.warn(`[GAS] Background delete item failed for ${itemCodeOrId}:`, err);
  });
};

/**
 * Asynchronously sync an activity to Google Sheets in background (Optimistic UI)
 */
export const syncActivityToGas = (
  act: LabActivityRecord,
  className?: string,
  apiUrl: string = getGasApiUrl()
): void => {
  const row = mapActivityToGasPayload(act, className);
  saveSheetData('Jurnal_Praktikum', row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background sync activity failed for ${act.judul_percobaan}:`, err);
  });

  // If there are scores, also sync to E_Raport in background
  try {
    const scores = act.rekap_nilai_json ? JSON.parse(act.rekap_nilai_json) : [];
    if (Array.isArray(scores) && scores.length > 0) {
      scores.slice(0, 5).forEach((sc: any, idx: number) => {
        saveSheetData(
          'E_Raport',
          {
            ID_Nilai: `RAP-${act.id}-${sc.nisn || idx}`,
            NISN: sc.nisn || '-',
            Mata_Pelajaran: act.laboratorium,
            Semester: 'Genap',
            Tahun_Ajaran: '2025/2026',
            Nilai_Praktikum: sc.nilai || 85,
            Nilai_Sikap_Lab: sc.sikap || 'A',
            Predikat: sc.predikat || 'Sangat Baik',
          },
          apiUrl
        ).catch(() => {});
      });
    }
  } catch {}
};

/**
 * Asynchronously delete a journal activity from Google Sheets in background (Optimistic UI)
 */
export const syncDeleteActivityFromGas = (
  activityId: number | string,
  apiUrl: string = getGasApiUrl()
): void => {
  const targetId = `JRN-${activityId}`;
  deleteSheetData('Jurnal_Praktikum', targetId, apiUrl).catch((err) => {
    console.warn(`[GAS] Background delete activity failed for ${activityId}:`, err);
  });
};

/**
 * Asynchronously sync a new user account to Google Sheets in background (Optimistic UI)
 */
export const syncUserToGas = (user: UserAccount, apiUrl: string = getGasApiUrl()): void => {
  const row = mapUserToGasPayload(user);
  saveSheetData('Pengguna', row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background sync user failed for ${user.email}:`, err);
  });
};

/**
 * Asynchronously delete a user account from Google Sheets in background (Optimistic UI)
 */
export const syncDeleteUserFromGas = (userId: string, apiUrl: string = getGasApiUrl()): void => {
  deleteSheetData('Pengguna', userId, apiUrl).catch((err) => {
    console.warn(`[GAS] Background delete user failed for ${userId}:`, err);
  });
};

/**
 * Asynchronously sync a student to Google Sheets in background (Optimistic UI)
 */
export const syncStudentToGas = (
  student: LabStudent,
  className?: string,
  apiUrl: string = getGasApiUrl()
): void => {
  const row = mapStudentToGasPayload(student, className);
  saveSheetData('Data_Siswa', row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background sync student failed for ${student.nama_siswa}:`, err);
  });
};

/**
 * Asynchronously sync an entire batch of students to Google Sheets (Data_Siswa) in background
 */
export const syncBatchStudentsToGas = (
  studentsWithClass: Array<{ student: LabStudent; className?: string }>,
  apiUrl: string = getGasApiUrl()
): Promise<boolean> => {
  if (!studentsWithClass || studentsWithClass.length === 0) {
    return Promise.resolve(true);
  }
  const rows = studentsWithClass.map(({ student, className }) =>
    mapStudentToGasPayload(student, className)
  );

  return saveSheetData('Data_Siswa', rows, apiUrl)
    .then((res) => {
      if (!res.success) {
        console.warn('[GAS] Batch sync students returned unsuccessful:', res.message);
        return false;
      }
      return true;
    })
    .catch((err) => {
      console.warn('[GAS] Background batch sync students failed:', err);
      return false;
    });
};

/**
 * Asynchronously delete a student from Google Sheets in background (Optimistic UI)
 */
export const syncDeleteStudentFromGas = (
  studentId: number | string,
  apiUrl: string = getGasApiUrl()
): void => {
  deleteSheetData('Data_Siswa', studentId, apiUrl).catch((err) => {
    console.warn(`[GAS] Background delete student failed for ${studentId}:`, err);
  });
};

/**
 * Asynchronously sync a tool loan record to Google Sheets in background (Optimistic UI)
 */
export const syncLoanToGas = (
  loan: ToolLoanRecord,
  apiUrl: string = getGasApiUrl()
): void => {
  const row = mapLoanToGasPayload(loan);
  saveSheetData('Peminjaman', row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background sync loan failed for ${loan.itemName}:`, err);
  });
};

/**
 * Asynchronously delete a loan record from Google Sheets in background (Optimistic UI)
 */
export const syncDeleteLoanFromGas = (
  loanCodeOrId: string,
  apiUrl: string = getGasApiUrl()
): void => {
  deleteSheetData('Peminjaman', loanCodeOrId, apiUrl).catch((err) => {
    console.warn(`[GAS] Background delete loan failed for ${loanCodeOrId}:`, err);
  });
};

/**
 * Asynchronously sync a material/stock usage transaction to Google Sheets in background (Optimistic UI)
 */
export const syncTransactionToGas = (
  tx: StockTransaction,
  unit: string = 'Unit',
  apiUrl: string = getGasApiUrl()
): void => {
  const row = mapTransactionToGasPayload(tx, unit);
  saveSheetData('Penggunaan_Bahan', row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background sync transaction failed for ${tx.itemName}:`, err);
  });
};

/**
 * Asynchronously sync a slideshow / banner to Google Sheets in background
 */
export const syncBannerToGas = (
  banner: LabBannerItem,
  index: number = 1,
  apiUrl: string = getGasApiUrl()
): void => {
  const row = mapBannerToGasPayload(banner, index);
  saveSheetData('Slideshow', row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background sync banner failed for ${banner.title}:`, err);
  });
};

// ==============================================================================
// IN-MEMORY CACHE MECHANISM (Mencegah Re-fetch Berat Saat Berpindah Halaman)
// ==============================================================================

export interface GasFetchAllDataResult {
  success: boolean;
  items: InventoryItem[];
  loans: ToolLoanRecord[];
  banners: LabBannerItem[];
  users: UserAccount[];
  activities: LabActivityRecord[];
  students: LabStudent[];
  rawCounts: {
    stokAlat: number;
    bahanKimia: number;
    peminjaman: number;
    slideshow: number;
    jurnalPraktikum: number;
    dataSiswa: number;
    erapot: number;
    pengguna: number;
  };
  message: string;
}

let gasDataMemoryCache: GasFetchAllDataResult | null = null;
let gasDataCacheTimestamp: number = 0;
export const GAS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 Menit Cache TTL

/**
 * Invalidate the memory cache manually (misal setelah refresh manual / import selesai)
 */
export const invalidateGasCache = (): void => {
  gasDataMemoryCache = null;
  gasDataCacheTimestamp = 0;
};

/**
 * Fetch and parse all sheets from Google Apps Script Web App
 * Memanfaatkan in-memory cache dengan TTL 5 menit agar perpindahan halaman instan tanpa re-fetch 7 tabel berulang.
 */
export const fetchAllGasData = async (
  apiUrl: string = getGasApiUrl(),
  forceRefresh: boolean = false
): Promise<GasFetchAllDataResult> => {
  // 1. Cek Cache In-Memory: jika masih valid dan tidak dipaksa refresh, kembalikan instan
  const now = Date.now();
  if (!forceRefresh && gasDataMemoryCache && now - gasDataCacheTimestamp < GAS_CACHE_TTL_MS) {
    return gasDataMemoryCache;
  }

  try {
    const [alatRes, bahanRes, pinjamRes, slideRes, jurnalRes, siswaRes, penggunaRes, erapotRes] =
      await Promise.all([
        fetchSheetData('Alat', apiUrl),
        fetchSheetData('Bahan', apiUrl),
        fetchSheetData('Peminjaman', apiUrl),
        fetchSheetData('Slideshow', apiUrl),
        fetchSheetData('Jurnal_Praktikum', apiUrl),
        fetchSheetData('Data_Siswa', apiUrl),
        fetchSheetData('Pengguna', apiUrl),
        fetchSheetData('E_Raport', apiUrl),
      ]);

    const parsedItems: InventoryItem[] = [];

    // Parse Alat
    if (alatRes.success && Array.isArray(alatRes.data)) {
      alatRes.data.forEach((r) => {
        const item = mapGasRowToInventoryItem(r, 'Alat');
        if (item && item.name && item.name.trim() !== '') parsedItems.push(item);
      });
    }

    // Parse Bahan
    if (bahanRes.success && Array.isArray(bahanRes.data)) {
      bahanRes.data.forEach((r) => {
        const item = mapGasRowToInventoryItem(r, 'Bahan');
        if (item && item.name && item.name.trim() !== '') parsedItems.push(item);
      });
    }

    // Parse Peminjaman
    const parsedLoans: ToolLoanRecord[] = [];
    if (pinjamRes.success && Array.isArray(pinjamRes.data)) {
      pinjamRes.data.forEach((r, idx) => {
        const loan = mapGasRowToLoan(r, idx);
        if (loan) parsedLoans.push(loan);
      });
    }

    // Parse Slideshow
    const parsedBanners: LabBannerItem[] = [];
    if (slideRes.success && Array.isArray(slideRes.data)) {
      slideRes.data.forEach((r, idx) => {
        const banner = mapGasRowToBanner(r, idx);
        if (banner) parsedBanners.push(banner);
      });
    }

    // Parse Pengguna
    const parsedUsers: UserAccount[] = [];
    if (penggunaRes.success && Array.isArray(penggunaRes.data)) {
      penggunaRes.data.forEach((r) => {
        const user = mapGasRowToUser(r);
        if (user) parsedUsers.push(user);
      });
    }

    // Parse Jurnal_Praktikum
    const parsedActivities: LabActivityRecord[] = [];
    if (jurnalRes.success && Array.isArray(jurnalRes.data)) {
      jurnalRes.data.forEach((r, idx) => {
        const act = mapGasRowToActivity(r, idx);
        if (act) parsedActivities.push(act);
      });
    }

    // Parse Data_Siswa
    const parsedStudents: LabStudent[] = [];
    if (siswaRes.success && Array.isArray(siswaRes.data)) {
      siswaRes.data.forEach((r, idx) => {
        const st = mapGasRowToStudent(r, idx);
        if (st) parsedStudents.push(st);
      });
    }

    const result: GasFetchAllDataResult = {
      success: true,
      items: parsedItems,
      loans: parsedLoans,
      banners: parsedBanners,
      users: parsedUsers,
      activities: parsedActivities,
      students: parsedStudents,
      rawCounts: {
        stokAlat: alatRes.data?.length || 0,
        bahanKimia: bahanRes.data?.length || 0,
        peminjaman: pinjamRes.data?.length || 0,
        slideshow: slideRes.data?.length || 0,
        jurnalPraktikum: jurnalRes.data?.length || 0,
        dataSiswa: siswaRes.data?.length || 0,
        erapot: erapotRes.data?.length || 0,
        pengguna: penggunaRes.data?.length || 0,
      },
      message: 'Seluruh tabel Google Sheets berhasil disinkronkan ke SIMLAB.',
    };

    // Simpan ke memory cache
    gasDataMemoryCache = result;
    gasDataCacheTimestamp = Date.now();

    return result;
  } catch (err: any) {
    return {
      success: false,
      items: [],
      loans: [],
      banners: [],
      users: [],
      activities: [],
      students: [],
      rawCounts: {
        stokAlat: 0,
        bahanKimia: 0,
        peminjaman: 0,
        slideshow: 0,
        jurnalPraktikum: 0,
        dataSiswa: 0,
        erapot: 0,
        pengguna: 0,
      },
      message: err.message || 'Gagal membaca data dari Google Apps Script.',
    };
  }
};

/**
 * Trigger remote auto-setup of all tables and initial dummy data on Google Sheets
 */
export const triggerGasDatabaseSetup = async (
  apiUrl: string = getGasApiUrl()
): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    const res = await fetch(`${apiUrl}?action=setupDatabase`, {
      method: 'GET',
    });
    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}: Gagal memicu setup database.`,
      };
    }
    const json = await res.json();
    return {
      success: json.status === 'success',
      message: json.message || 'Setup database selesai.',
      details: json.details,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal memicu setup database: ${err.message || 'Kesalahan jaringan'}`,
    };
  }
};

/**
 * Trigger remote complete database reset to default prototype seed on Google Sheets
 */
export const triggerGasDatabaseReset = async (
  apiUrl: string = getGasApiUrl()
): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    const res = await fetch(`${apiUrl}?action=resetToDefaultDatabase`, {
      method: 'GET',
    });
    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}: Gagal mereset database Google Sheets.`,
      };
    }
    const json = await res.json();
    return {
      success: json.status === 'success',
      message: json.message || 'Reset database selesai.',
      details: json.details,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal mereset database: ${err.message || 'Kesalahan jaringan'}`,
    };
  }
};

