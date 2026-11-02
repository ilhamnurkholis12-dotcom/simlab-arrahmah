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
} from '../types/inventory';

export const DEFAULT_GAS_API_URL =
  'https://script.google.com/macros/s/AKfycbzCa0JROg_WauIbIAFxbBWdeVRwnB5mVatF80xTkKTWH5bSk9isuZaBEKOPr1GXClhp/exec';

export type GasSheetName =
  | 'Stok_Alat'
  | 'Bahan_Kimia'
  | 'Peminjaman_Alat'
  | 'Jurnal_Praktikum'
  | 'Data_Siswa'
  | 'E_Rapot'
  | 'E_Raport'
  | 'Pengguna';

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
 * Save / Insert data (POST) to a specific sheet in Google Sheets
 * Uses text/plain Content-Type to avoid browser CORS preflight blocks.
 */
export const saveSheetData = async (
  sheetName: GasSheetName,
  dataRecord: Record<string, any>,
  apiUrl: string = getGasApiUrl()
): Promise<{ success: boolean; message: string }> => {
  try {
    const payload = {
      action: 'insert',
      sheet: sheetName,
      data: dataRecord,
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

    // Try fallback for E_Rapot -> E_Raport
    if (sheetName === 'E_Rapot' && json.status === 'error') {
      try {
        const fbRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'insert', sheet: 'E_Raport', data: dataRecord }),
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
 * Map SIMLAB InventoryItem to Google Sheet Row (Stok_Alat or Bahan_Kimia)
 */
export const mapItemToGasPayload = (
  item: InventoryItem
): { targetSheet: 'Stok_Alat' | 'Bahan_Kimia'; row: Record<string, any> } => {
  if (item.category === 'Bahan Kimia & Reagen') {
    return {
      targetSheet: 'Bahan_Kimia',
      row: {
        ID_Bahan: item.code || item.id,
        Nama_Bahan: item.name,
        Rumus_Kimia: item.brandOrSpec || '-',
        Jumlah_Stok: Number(item.currentTotalStock ?? 0),
        Satuan: item.unit || 'Botol',
      },
    };
  }

  return {
    targetSheet: 'Stok_Alat',
    row: {
      ID_Barang: item.code || item.id,
      Nama_Alat: item.name,
      Kategori: item.category,
      Jumlah_Stok: Number(item.currentTotalStock ?? 0),
      Kondisi: (item.conditionGood ?? 0) > 0 ? 'Baik' : 'Perlu Perbaikan',
      Lokasi_Penyimpanan: item.storageRack || '-',
    },
  };
};

/**
 * Parse Google Sheet row into InventoryItem
 */
export const mapGasRowToInventoryItem = (
  row: Record<string, any>,
  sheetType: 'Stok_Alat' | 'Bahan_Kimia'
): InventoryItem | null => {
  if (sheetType === 'Bahan_Kimia') {
    const id = String(row.ID_Bahan || '').trim();
    const name = String(row.Nama_Bahan || '').trim();
    if (!id && !name) return null;

    const stock = Number(row.Jumlah_Stok) || 0;
    return {
      id: id || `BHM-${Date.now()}`,
      code: id || 'BHM-01',
      name: name || 'Bahan Kimia',
      category: 'Bahan Kimia & Reagen',
      primaryLab: 'KIMIA',
      unit: String(row.Satuan || 'Botol'),
      initialStock2026: stock,
      totalIn: 0,
      totalOut: 0,
      currentTotalStock: stock,
      minStockAlert: 5,
      conditionGood: stock,
      conditionLightDamage: 0,
      conditionHeavyDamage: 0,
      distribution: {
        FISIKA: 0,
        KIMIA: stock,
        BIOLOGI: 0,
        SMP_TERPADU: 0,
      },
      storageRack: 'Lemari Bahan Kimia A-1',
      brandOrSpec: String(row.Rumus_Kimia || '-'),
      lastUpdated: new Date().toISOString().substring(0, 10),
    };
  }

  // Stok_Alat
  const id = String(row.ID_Barang || '').trim();
  const name = String(row.Nama_Alat || '').trim();
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

  return {
    id: id || `ALT-${Date.now()}`,
    code: id || 'ALT-001',
    name: name || 'Alat Praktikum',
    category,
    primaryLab: 'ALL',
    unit: 'Unit',
    initialStock2026: stock,
    totalIn: 0,
    totalOut: 0,
    currentTotalStock: stock,
    minStockAlert: 2,
    conditionGood: row.Kondisi === 'Perlu Perbaikan' ? 0 : stock,
    conditionLightDamage: row.Kondisi === 'Perlu Perbaikan' ? stock : 0,
    conditionHeavyDamage: 0,
    distribution: {
      FISIKA: Math.floor(stock / 3),
      KIMIA: Math.floor(stock / 3),
      BIOLOGI: stock - Math.floor(stock / 3) * 2,
      SMP_TERPADU: 0,
    },
    storageRack: String(row.Lokasi_Penyimpanan || 'Rak Penyimpanan Lab'),
    brandOrSpec: '-',
    lastUpdated: new Date().toISOString().substring(0, 10),
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
  return {
    ID_Pengguna: user.id || user.schoolIdNumber || 'USR',
    Nama_Lengkap: user.name,
    Email_Petugas: user.email,
    Kata_Sandi: user.password || 'labarcss2026',
    Role: user.role,
    Unit_Tugas: user.assignedLab || 'ALL',
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
 * Map LabStudent to Data_Siswa row in Google Sheets
 */
export const mapStudentToGasPayload = (
  student: LabStudent,
  className?: string
): Record<string, any> => {
  return {
    ID_Siswa: String(student.id),
    NISN: student.nisn || '-',
    Nama_Siswa: student.nama_siswa,
    Kelas: className || '-',
    Status: student.status || 'Aktif',
  };
};

/**
 * Map Data_Siswa row from Google Sheets into LabStudent
 */
export const mapGasRowToStudent = (
  row: Record<string, any>,
  index: number
): LabStudent | null => {
  const name = String(row.Nama_Siswa || '').trim();
  if (!name) return null;

  return {
    id: Number(row.ID_Siswa) || index + 100,
    nama_siswa: name,
    kelas_id: 1,
    nisn: String(row.NISN || ''),
    status: (row.Status as any) || 'Aktif',
    created_at: new Date().toISOString(),
  };
};

// ==============================================================================
// ASYNCHRONOUS REAL-TIME SYNC UTILITIES (NON-BLOCKING)
// ==============================================================================

/**
 * Asynchronously sync an item to Google Sheets in background
 */
export const syncItemToGas = (item: InventoryItem, apiUrl: string = getGasApiUrl()): void => {
  const { targetSheet, row } = mapItemToGasPayload(item);
  saveSheetData(targetSheet, row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background sync item failed for ${item.name}:`, err);
  });
};

/**
 * Asynchronously sync an activity to Google Sheets in background
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

  // If there are scores, also sync to E_Rapot in background
  try {
    const scores = act.rekap_nilai_json ? JSON.parse(act.rekap_nilai_json) : [];
    if (Array.isArray(scores) && scores.length > 0) {
      scores.slice(0, 5).forEach((sc: any, idx: number) => {
        saveSheetData(
          'E_Rapot',
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
 * Asynchronously sync a new user account to Google Sheets in background
 */
export const syncUserToGas = (user: UserAccount, apiUrl: string = getGasApiUrl()): void => {
  const row = mapUserToGasPayload(user);
  saveSheetData('Pengguna', row, apiUrl).catch((err) => {
    console.warn(`[GAS] Background sync user failed for ${user.email}:`, err);
  });
};

/**
 * Asynchronously sync a student to Google Sheets in background
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
 * Fetch and parse all 6 sheets from Google Apps Script Web App
 */
export const fetchAllGasData = async (
  apiUrl: string = getGasApiUrl()
): Promise<{
  success: boolean;
  items: InventoryItem[];
  users: UserAccount[];
  activities: LabActivityRecord[];
  students: LabStudent[];
  rawCounts: {
    stokAlat: number;
    bahanKimia: number;
    jurnalPraktikum: number;
    dataSiswa: number;
    erapot: number;
    pengguna: number;
  };
  message: string;
}> => {
  try {
    const [alatRes, bahanRes, jurnalRes, siswaRes, penggunaRes, erapotRes] =
      await Promise.all([
        fetchSheetData('Stok_Alat', apiUrl),
        fetchSheetData('Bahan_Kimia', apiUrl),
        fetchSheetData('Jurnal_Praktikum', apiUrl),
        fetchSheetData('Data_Siswa', apiUrl),
        fetchSheetData('Pengguna', apiUrl),
        fetchSheetData('E_Rapot', apiUrl),
      ]);

    const parsedItems: InventoryItem[] = [];

    // Parse Stok_Alat
    if (alatRes.success && Array.isArray(alatRes.data)) {
      alatRes.data.forEach((r) => {
        const item = mapGasRowToInventoryItem(r, 'Stok_Alat');
        if (item && item.name && item.name.trim() !== '') parsedItems.push(item);
      });
    }

    // Parse Bahan_Kimia
    if (bahanRes.success && Array.isArray(bahanRes.data)) {
      bahanRes.data.forEach((r) => {
        const item = mapGasRowToInventoryItem(r, 'Bahan_Kimia');
        if (item && item.name && item.name.trim() !== '') parsedItems.push(item);
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

    return {
      success: true,
      items: parsedItems,
      users: parsedUsers,
      activities: parsedActivities,
      students: parsedStudents,
      rawCounts: {
        stokAlat: alatRes.data?.length || 0,
        bahanKimia: bahanRes.data?.length || 0,
        jurnalPraktikum: jurnalRes.data?.length || 0,
        dataSiswa: siswaRes.data?.length || 0,
        erapot: erapotRes.data?.length || 0,
        pengguna: penggunaRes.data?.length || 0,
      },
      message: 'Seluruh sheet berhasil disinkronkan dengan Google Sheets.',
    };
  } catch (err: any) {
    return {
      success: false,
      items: [],
      users: [],
      activities: [],
      students: [],
      rawCounts: {
        stokAlat: 0,
        bahanKimia: 0,
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
