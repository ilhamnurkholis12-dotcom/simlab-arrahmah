import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  InventoryItem,
  StockTransaction,
  UserAccount,
  UserRole,
  LabId,
  ItemCategory,
  TransactionType,
  PengaturanSistem,
  DEFAULT_PENGATURAN_SISTEM,
  KopBeritaAcaraConfig,
  DEFAULT_KOP_CONFIG,
  PasswordChangeLog,
  LabClass,
  LabStudent,
  LabActivityRecord,
  NewLabActivityInput,
  LabActivitiesGroupedSummary,
  LabActivityLabSummary,
  StudentScoreEntry,
  INITIAL_LAB_CLASSES,
  INITIAL_LAB_STUDENTS,
  INITIAL_LAB_ACTIVITIES,
  LAB_DEFINITIONS,
  ToastMessage,
  ToastType,
  ToolLoanRecord,
  LoanStatus,
  SchoolUnit,
  StudentStatus,
  LabStockDistribution,
  CalibrationRecord,
  CalibrationResult,
  CalibrationStatus,
  ParsedExcelStudent,
} from '../types/inventory';
import { getSchoolUnit } from '../utils/helpers';
import { ExcelImportSummary, ExcelImportExecutionResult, DetectedLaboranUser } from '../types/excelImport';
import {
  normalizeItemName,
  resolveCategory,
  mapJenisItem,
  resolveOfficialPicAccount,
  isNettoUnit,
  calculatePhysicalPackagingCount,
} from '../utils/excelImportParser';
import {
  INITIAL_ACCOUNTS,
  INITIAL_ITEMS,
  INITIAL_TRANSACTIONS,
  INITIAL_TOOL_LOANS,
  INITIAL_CALIBRATIONS,
} from '../data/initialInventory';
import { matchId } from '../utils/helpers';
import {
  syncItemToGas,
  syncUpdateItemInGas,
  syncDeleteItemFromGas,
  syncActivityToGas,
  syncDeleteActivityFromGas,
  syncUserToGas,
  syncDeleteUserFromGas,
  syncStudentToGas,
  syncBatchStudentsToGas,
  isValidNisn,
  generateFallbackNisn,
  normalizeGender,
  syncDeleteStudentFromGas,
  syncLoanToGas,
  syncDeleteLoanFromGas,
  syncTransactionToGas,
  syncBannerToGas,
  fetchAllGasData,
  fetchSheetData,
  mapGasRowToUser,
  invalidateGasCache,
  GasSyncStatus,
} from '../services/googleAppsScriptService';
import {
  LabBannerItem,
  DEFAULT_LAB_BANNERS,
  normalizeMediaUrl,
} from '../data/labBanners';

export const AUTHORIZED_HEAD_OF_LAB_EMAIL = 'Ilham.nurkholis114@guru.sma.belajar.id';

interface InventoryContextType {
  // Toast Notification System (Non-intrusive User Feedback & ACL)
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'> | string) => void;
  removeToast: (id: string) => void;

  currentUser: UserAccount | null;
  items: InventoryItem[];
  transactions: StockTransaction[];
  settings: PengaturanSistem;
  updateSettings: (newSettings: Partial<PengaturanSistem>) => void;
  resetSettingsToDefault: () => void;

  // Filter Cepat Jenjang Pendidikan (SMP / SMA / ALL)
  schoolLevelFilter: 'ALL' | 'SMP' | 'SMA';
  setSchoolLevelFilter: (filter: 'ALL' | 'SMP' | 'SMA') => void;

  // Peminjaman & Pengembalian Alat Praktikum serta Laporan Pecah / Rusak
  loans: ToolLoanRecord[];
  addToolLoan: (loanData: Omit<ToolLoanRecord, 'id' | 'code' | 'createdAt'>) => { success: boolean; message: string; record?: ToolLoanRecord };
  returnToolLoan: (
    loanId: string,
    returnData: {
      actualReturnDate: string;
      returnedCondition: 'Baik' | 'Rusak Ringan' | 'Pecah / Rusak Berat' | 'Hilang';
      damagedQuantity?: number;
      damageIncidentReport?: string;
      actionTaken?: string;
      notes?: string;
    }
  ) => { success: boolean; message: string };
  deleteToolLoan: (loanId: string) => { success: boolean; message: string };

  // Slideshow / Pengumuman & Media Lab
  slides: LabBannerItem[];
  updateSlides: (newSlides: LabBannerItem[]) => void;

  // Modul Kalibrasi Alat Presisi & Sensor Laboratorium
  calibrations: CalibrationRecord[];
  dueCalibrations: CalibrationRecord[];
  overdueCalibrationsCount: number;
  dueSoonCalibrationsCount: number;
  addCalibrationRecord: (
    data: Omit<CalibrationRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => { success: boolean; message: string; record?: CalibrationRecord };
  updateCalibrationRecord: (
    id: string,
    updates: Partial<CalibrationRecord>
  ) => { success: boolean; message: string };
  deleteCalibrationRecord: (id: string) => { success: boolean; message: string };
  performCalibrationTest: (
    id: string,
    testData: {
      lastCalibrationDate: string;
      calibrationIntervalMonths: number;
      calibratedBy: string;
      certificateNumber?: string;
      result: CalibrationResult;
      measuredDeviation?: string;
      standardReference?: string;
      actionTaken?: string;
      notes?: string;
    }
  ) => { success: boolean; message: string };

  // Update Foto Profil Akun Pengguna (JPG / PNG)
  updateCurrentUserPhoto: (photoDataUrl: string) => { success: boolean; message: string };

  // KOP Berita Acara & Tanda Tangan
  kopConfig: KopBeritaAcaraConfig;
  updateKopConfig: (updates: Partial<KopBeritaAcaraConfig>) => void;
  resetKopConfigToDefault: () => void;

  // Verifikasi Email & Ganti Kata Sandi Mandiri
  passwordChangeLogs: PasswordChangeLog[];
  requestPasswordChangeVerification: (email: string) => {
    success: boolean;
    message: string;
    verificationCode?: string;
    expiresInMinutes?: number;
  };
  verifyAndChangePassword: (
    email: string,
    code: string,
    newPassword: string
  ) => { success: boolean; message: string };
  clearPasswordChangeLogs: () => void;

  login: (email: string, password?: string) => boolean;
  logout: () => void;
  switchUserRole: (roleId: string) => void;
  
  // User Accounts Management (Restricted strictly to user with email 'Ilham.nurkholis114@guru.sma.belajar.id')
  canManageUsers: boolean;
  isHeadOfLab: boolean;
  addUserAccount: (data: {
    name: string;
    email: string;
    role: UserRole;
    roleTitle?: string;
    assignedLab: LabId | 'ALL';
    schoolIdNumber?: string;
    nip?: string;
    password?: string;
    status?: 'aktif' | 'nonaktif';
  }) => { success: boolean; message: string; account?: UserAccount };
  updateUserAccount: (id: string, updates: Partial<UserAccount>) => { success: boolean; message: string };
  deleteUserAccount: (id: string) => { success: boolean; message: string };
  resetUserPassword: (id: string, newPassword?: string) => { success: boolean; message: string; generatedPassword?: string };
  
  // Inventory actions
  addItem: (item: Omit<InventoryItem, 'id' | 'currentTotalStock' | 'totalIn' | 'totalOut' | 'lastUpdated'>) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  batchDeleteItems: (ids: string[]) => { success: boolean; count: number; message: string };
  batchAssignItemsToLab: (ids: string[], targetLab: LabId | 'ALL') => { success: boolean; count: number; message: string };
  updateMinStockThreshold: (id: string, newThreshold: number) => void;
  
  // Transactions
  addTransaction: (tx: {
    itemId: string;
    type: TransactionType;
    quantity: number;
    date: string;
    targetLab: LabId;
    fromLab?: LabId;
    purpose: string;
    picName: string;
    studentClassOrBatch?: string;
    conditionStatus: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
    notes?: string;
  }) => { success: boolean; message: string };
  
  // Stock Transfer between labs
  transferStock: (
    itemId: string,
    fromLab: LabId,
    toLab: LabId,
    quantity: number,
    picName: string,
    notes?: string
  ) => { success: boolean; message: string };

  accounts: UserAccount[];
  // Data helpers & stats
  lowStockItems: InventoryItem[];
  resetToDefaultData: () => void;
  clearAllInventoryAndLogs: () => void;
  exportDatabaseJson: () => void;
  importDatabaseJson: (jsonString: string) => boolean;
  importExcelData: (summary: ExcelImportSummary, options?: { cleanReset?: boolean }) => ExcelImportExecutionResult;

  // Modul Buku Kendali Praktikum & Berita Acara Guru (2026)
  classes: LabClass[];
  students: LabStudent[];
  labActivities: LabActivityRecord[];
  canEditLab: (labId: LabId) => boolean;
  addLabActivity: (
    activityData: NewLabActivityInput
  ) => { success: boolean; message: string; record?: LabActivityRecord };
  updateLabActivity: (
    id: number,
    updates: Partial<NewLabActivityInput>
  ) => { success: boolean; message: string; record?: LabActivityRecord };
  deleteLabActivity: (id: number) => { success: boolean; message: string };
  labActivitiesSummary: LabActivitiesGroupedSummary;
  getLabActivitiesSummary: () => LabActivitiesGroupedSummary;

  // Fitur Administrasi Praktikum Khusus KEPALA_LAB (2026)
  resetLabActivitiesByCluster: (lab: LabId, classId: number) => { success: boolean; message: string };
  wipeOutAllLabActivities: () => { success: boolean; message: string };
  addLabClass: (nama_kelas: string, tahun_ajaran: string, unit?: SchoolUnit) => { success: boolean; message: string; newClass?: LabClass };
  addLabStudent: (kelas_id: number, nama_siswa: string, nisn?: string) => { success: boolean; message: string; newStudent?: LabStudent };
  importStudentsFromExcel: (kelas_id: number, studentsList: Array<{ nama_siswa: string; nisn?: string; gender?: string; status?: string }>) => { success: boolean; message: string; count: number };
  updateLabStudent: (id: number | string, updates: { nama_siswa?: string; nisn?: string; status?: StudentStatus; status_keterangan?: string }) => { success: boolean; message: string };
  updateStudentStatus: (id: number | string, status: StudentStatus, keterangan?: string) => { success: boolean; message: string };
  deleteLabStudent: (id: number | string) => { success: boolean; message: string };
  deleteLabClass: (classId: number | string) => { success: boolean; message: string };
  importMultiClassStudents: (
    records: ParsedExcelStudent[]
  ) => { success: boolean; message: string; count: number; classesCount: number };
  isAdmin: boolean;
  isGuru: boolean;

  // Real-Time Google Apps Script Database Sync
  gasSyncStatus: GasSyncStatus;
  syncWithGoogleSheets: (isSilent?: boolean, forceRefresh?: boolean) => Promise<void>;
  loginAsync: (email: string, password?: string) => Promise<{ success: boolean; message: string }>;
}

const STORAGE_KEY_ITEMS = 'simlab_arcss_items_2026';
const STORAGE_KEY_TRX = 'simlab_arcss_transactions_2026';
const STORAGE_KEY_USER = 'simlab_arcss_current_user_2026';
const STORAGE_KEY_SETTINGS = 'simlab_arcss_pengaturan_sistem_2026';
const STORAGE_KEY_ACCOUNTS = 'simlab_arcss_accounts_2026';
const STORAGE_KEY_KOP = 'simlab_arcss_kop_berita_acara_2026';
const STORAGE_KEY_PASSWORD_LOGS = 'simlab_arcss_password_logs_2026';
const STORAGE_KEY_LAB_CLASSES = 'simlab_arcss_lab_classes_2026';
const STORAGE_KEY_LAB_STUDENTS = 'simlab_arcss_lab_students_2026';
const STORAGE_KEY_LAB_ACTIVITIES = 'simlab_arcss_lab_activities_2026';
const STORAGE_KEY_LOANS = 'simlab_arcss_tool_loans_2026';
const STORAGE_KEY_CALIBRATIONS = 'simlab_arcss_tool_calibrations_2026';
const STORAGE_KEY_SCHOOL_FILTER = 'simlab_arcss_school_filter_2026';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Jenjang Filter Cepat (SMP / SMA / ALL)
  const [schoolLevelFilter, setSchoolLevelFilterState] = useState<'ALL' | 'SMP' | 'SMA'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHOOL_FILTER);
      if (saved === 'SMP' || saved === 'SMA') return saved;
    } catch {
      // ignore
    }
    return 'ALL';
  });

  const setSchoolLevelFilter = useCallback((filter: 'ALL' | 'SMP' | 'SMA') => {
    setSchoolLevelFilterState(filter);
    try {
      localStorage.setItem(STORAGE_KEY_SCHOOL_FILTER, filter);
    } catch {
      // ignore
    }
  }, []);

  // Peminjaman & Pengembalian Alat Praktikum serta Laporan Pecah / Rusak
  const [loans, setLoans] = useState<ToolLoanRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOANS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_TOOL_LOANS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(loans));
  }, [loans]);

  // Modul Kalibrasi Alat Presisi & Sensor Laboratorium
  const [calibrations, setCalibrations] = useState<CalibrationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CALIBRATIONS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_CALIBRATIONS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CALIBRATIONS, JSON.stringify(calibrations));
  }, [calibrations]);

  // Slideshow & Media Banners State
  const [slides, setSlides] = useState<LabBannerItem[]>(() => {
    try {
      const saved = localStorage.getItem('simlab_custom_banners_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: LabBannerItem) => ({
            ...item,
            url: normalizeMediaUrl(item.url),
            posterUrl: item.posterUrl ? normalizeMediaUrl(item.posterUrl) : item.posterUrl,
          }));
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_LAB_BANNERS;
  });

  const updateSlides = useCallback((newSlides: LabBannerItem[]) => {
    const normalizedList = newSlides.map((s) => ({
      ...s,
      url: normalizeMediaUrl(s.url),
      posterUrl: s.posterUrl ? normalizeMediaUrl(s.posterUrl) : s.posterUrl,
    }));
    setSlides(normalizedList);
    try {
      localStorage.setItem('simlab_custom_banners_v1', JSON.stringify(normalizedList));
    } catch {
      // ignore
    }
    // Background sync to Google Sheets
    normalizedList.forEach((slide, idx) => {
      syncBannerToGas(slide, idx + 1);
    });
  }, []);
  // Toast notifications state (max 4 concurrent floating alerts)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toastInput: Omit<ToastMessage, 'id'> | string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage =
      typeof toastInput === 'string'
        ? {
            id,
            type: 'info',
            message: toastInput,
            duration: 4500,
            timestamp: Date.now(),
          }
        : {
            id,
            duration: toastInput.duration ?? 4500,
            timestamp: Date.now(),
            ...toastInput,
          };

    setToasts((prev) => [...prev.slice(-4), newToast]);
  }, []);

  // Password change logs for email verification & admin monitoring
  const [passwordChangeLogs, setPasswordChangeLogs] = useState<PasswordChangeLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PASSWORD_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PASSWORD_LOGS, JSON.stringify(passwordChangeLogs));
  }, [passwordChangeLogs]);

  // 0. Accounts state (persists detected real laboran accounts alongside initial staff)
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      const savedAccounts = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (savedAccounts) {
        const parsed = JSON.parse(savedAccounts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure root Kepala Lab (Ilham Nurkholis Majid) is always present
          const hasHead = parsed.some(
            (a: UserAccount) =>
              (a.email || '').toLowerCase().trim() ===
              'ilham.nurkholis114@guru.sma.belajar.id'
          );
          if (!hasHead) {
            parsed.unshift(INITIAL_ACCOUNTS[0]);
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ACCOUNTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  }, [accounts]);

  // 1. Current user
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      const savedAccounts = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      let accountList = INITIAL_ACCOUNTS;
      if (savedAccounts) {
        try {
          const parsedList = JSON.parse(savedAccounts);
          if (Array.isArray(parsedList) && parsedList.length > 0) {
            accountList = parsedList;
          }
        } catch {
          // ignore
        }
      }

      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const matched = accountList.find(
          (a) =>
            a.id === parsed.id ||
            a.email.toLowerCase().trim() === (parsed.email || '').toLowerCase().trim()
        );
        if (matched) return matched;
      }
    } catch {
      // ignore
    }
    return null; // Pengguna wajib login terlebih dahulu melalui LoginScreen
  });

  // 2. Items
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const savedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (savedItems) {
        const parsed: InventoryItem[] = JSON.parse(savedItems);
        // Kembalikan ke data asli jika sebelumnya sempat terkonversi menjadi 1 Botol
        return parsed.map((item) => {
          const nettoMatch = item.brandOrSpec?.match(/Netto:\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)/i);
          if (nettoMatch && item.unit === 'Botol' && item.currentTotalStock === 1) {
            const restoredNum = parseFloat(nettoMatch[1].replace(',', '.'));
            const restoredUnit = nettoMatch[2];
            const primaryLab = item.primaryLab || 'KIMIA';
            const newDist = { ...item.distribution };
            if (primaryLab !== 'ALL') {
              newDist[primaryLab] = restoredNum;
            }
            return {
              ...item,
              unit: restoredUnit,
              currentTotalStock: restoredNum,
              initialStock2026: restoredNum,
              conditionGood: restoredNum,
              distribution: newDist,
            };
          }
          return item;
        });
      }
    } catch {
      // ignore
    }
    return INITIAL_ITEMS;
  });

  // 3. Transactions
  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    try {
      const savedTrx = localStorage.getItem(STORAGE_KEY_TRX);
      if (savedTrx) {
        return JSON.parse(savedTrx);
      }
    } catch {
      // ignore
    }
    return INITIAL_TRANSACTIONS;
  });

  // 4. System Settings (tabel: pengaturan_sistem)
  const [settings, setSettings] = useState<PengaturanSistem>(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        return { ...DEFAULT_PENGATURAN_SISTEM, ...JSON.parse(savedSettings) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PENGATURAN_SISTEM;
  });

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<PengaturanSistem>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_by: currentUser?.name || 'Administrator',
    }));
  };

  const resetSettingsToDefault = () => {
    setSettings(DEFAULT_PENGATURAN_SISTEM);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
  };

  // 4b. KOP Berita Acara & Tanda Tangan
  const [kopConfig, setKopConfig] = useState<KopBeritaAcaraConfig>(() => {
    try {
      const savedKop = localStorage.getItem(STORAGE_KEY_KOP);
      if (savedKop) {
        const parsed = JSON.parse(savedKop);
        if (parsed.kepalaSekolahNama && parsed.kepalaSekolahNama.includes('Ahmad Zaki')) {
          parsed.kepalaSekolahNama = DEFAULT_KOP_CONFIG.kepalaSekolahNama;
          parsed.kepalaSekolahTitle = DEFAULT_KOP_CONFIG.kepalaSekolahTitle;
          parsed.kepalaSekolahInstansi = DEFAULT_KOP_CONFIG.kepalaSekolahInstansi;
          parsed.kepalaSekolahNip = DEFAULT_KOP_CONFIG.kepalaSekolahNip;
        }
        return { ...DEFAULT_KOP_CONFIG, ...parsed };
      }
    } catch {
      // ignore
    }
    return DEFAULT_KOP_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_KOP, JSON.stringify(kopConfig));
  }, [kopConfig]);

  const updateKopConfig = (updates: Partial<KopBeritaAcaraConfig>) => {
    setKopConfig((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const resetKopConfigToDefault = () => {
    setKopConfig(DEFAULT_KOP_CONFIG);
    localStorage.removeItem(STORAGE_KEY_KOP);
  };

  // 5. Modul Buku Kendali Praktikum: Kelas, Siswa, & Rekap Aktivitas Jurnal
  const [classes, setClasses] = useState<LabClass[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAB_CLASSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_LAB_CLASSES;
  });

  const [students, setStudents] = useState<LabStudent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAB_STUDENTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_LAB_STUDENTS;
  });

  const [labActivities, setLabActivities] = useState<LabActivityRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAB_ACTIVITIES);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_LAB_ACTIVITIES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LAB_CLASSES, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LAB_STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LAB_ACTIVITIES, JSON.stringify(labActivities));
  }, [labActivities]);

  // Google Apps Script Real-Time Synchronization State
  const [gasSyncStatus, setGasSyncStatus] = useState<GasSyncStatus>({
    isConnected: true,
    isSyncing: false,
    lastSyncTime: null,
    errorMessage: null,
    stats: {
      stokAlat: 0,
      bahanKimia: 0,
      peminjaman: 0,
      slideshow: 0,
      jurnalPraktikum: 0,
      dataSiswa: 0,
      erapot: 0,
      pengguna: 0,
    },
  });

  // Sinkronisasi data real-time dengan Google Apps Script (GET semua sheet & hydrate state dengan Memory Cache)
  const syncWithGoogleSheets = useCallback(
    async (isSilent = false, forceRefresh = false) => {
      setGasSyncStatus((prev) => ({ ...prev, isSyncing: true, errorMessage: null }));
      try {
        const res = await fetchAllGasData(undefined, forceRefresh);
        if (res.success) {
          // 1. Hydrate Stok_Alat & Bahan_Kimia
          if (res.items.length > 0) {
            setItems((prevItems) => {
              const itemMap = new Map(prevItems.map((i) => [i.code || i.id, i]));
              res.items.forEach((remote) => {
                const key = remote.code || remote.id;
                const existing = itemMap.get(key);
                if (existing) {
                  itemMap.set(key, {
                    ...existing,
                    ...remote,
                    distribution: remote.distribution || existing.distribution,
                    currentTotalStock: remote.currentTotalStock ?? existing.currentTotalStock,
                  });
                } else {
                  itemMap.set(key, remote);
                }
              });
              return Array.from(itemMap.values());
            });
          }

          // 2. Hydrate Pengguna (User Accounts)
          if (res.users.length > 0) {
            setAccounts((prevAccounts) => {
              const accMap = new Map(prevAccounts.map((a) => [a.email.toLowerCase().trim(), a]));
              res.users.forEach((remoteUser) => {
                const emailKey = remoteUser.email.toLowerCase().trim();
                if (emailKey) {
                  const existing = accMap.get(emailKey);
                  if (existing) {
                    accMap.set(emailKey, {
                      ...existing,
                      ...remoteUser,
                      password: remoteUser.password || existing.password,
                    });
                  } else {
                    accMap.set(emailKey, remoteUser);
                  }
                }
              });
              // Pastikan Kepala Lab utama selalu terdaftar
              const headEmail = AUTHORIZED_HEAD_OF_LAB_EMAIL.toLowerCase().trim();
              if (!accMap.has(headEmail)) {
                accMap.set(headEmail, INITIAL_ACCOUNTS[0]);
              }
              return Array.from(accMap.values());
            });
          }

          // 3. Hydrate Peminjaman Alat (Loans)
          if (res.loans && res.loans.length > 0) {
            setLoans((prevLoans) => {
              const loanMap = new Map(prevLoans.map((l) => [l.code || l.id, l]));
              res.loans.forEach((remoteLoan) => {
                const key = remoteLoan.code || remoteLoan.id;
                loanMap.set(key, remoteLoan);
              });
              return Array.from(loanMap.values());
            });
          }

          // 4. Hydrate Slideshow / Informasi Lab (Banners)
          if (res.banners && res.banners.length > 0) {
            setSlides(res.banners);
            try {
              localStorage.setItem('simlab_custom_banners_v1', JSON.stringify(res.banners));
            } catch {
              // ignore
            }
          }

          // 5. Hydrate Jurnal_Praktikum
          if (res.activities.length > 0) {
            setLabActivities((prevAct) => {
              const actMap = new Map(prevAct.map((a) => [a.id, a]));
              res.activities.forEach((remote) => {
                if (!actMap.has(remote.id)) {
                  actMap.set(remote.id, remote);
                }
              });
              return Array.from(actMap.values());
            });
          }

          // 6. Hydrate Data_Siswa (Pemisahan Kelas & Rombel Presisi)
          if (res.students.length > 0) {
            setClasses((prevClasses) => {
              const updatedClasses = [...prevClasses];
              let nextClassId = updatedClasses.length > 0 ? Math.max(...updatedClasses.map((c) => c.id)) + 1 : 1;
              const classLookup = new Map<string, number>();
              updatedClasses.forEach((c) => classLookup.set(c.nama_kelas.toLowerCase().trim(), c.id));

              // Auto-register any new rombel from remote Data_Siswa
              res.students.forEach((remote: any) => {
                const rombelName = (remote.raw_kelas_rombel || '').trim();
                if (rombelName && rombelName !== '-') {
                  const key = rombelName.toLowerCase();
                  if (!classLookup.has(key)) {
                    const cId = nextClassId++;
                    const unit = remote.unit || getSchoolUnit(rombelName);
                    const newCls: LabClass = {
                      id: cId,
                      nama_kelas: rombelName,
                      tahun_ajaran: '2025/2026',
                      unit,
                      created_at: new Date().toISOString(),
                    };
                    updatedClasses.push(newCls);
                    classLookup.set(key, cId);
                  }
                }
              });

              // Map students with their respective kelas_id
              setStudents((prevStudents) => {
                const stdMap = new Map(prevStudents.map((s) => [s.id, s]));
                const nisnMap = new Map(
                  prevStudents.filter((s) => s.nisn && isValidNisn(s.nisn)).map((s) => [s.nisn!, s])
                );

                res.students.forEach((remote: any) => {
                  const rombelName = (remote.raw_kelas_rombel || '').trim();
                  let targetClassId = 1;
                  if (rombelName && rombelName !== '-') {
                    targetClassId = classLookup.get(rombelName.toLowerCase()) || 1;
                  }

                  const studentWithClass: LabStudent = {
                    ...remote,
                    kelas_id: targetClassId,
                  };

                  if (remote.nisn && isValidNisn(remote.nisn) && nisnMap.has(remote.nisn)) {
                    const existing = nisnMap.get(remote.nisn)!;
                    stdMap.set(existing.id, { ...existing, ...studentWithClass, id: existing.id });
                  } else if (!stdMap.has(remote.id)) {
                    stdMap.set(remote.id, studentWithClass);
                  }
                });

                return Array.from(stdMap.values());
              });

              return updatedClasses;
            });
          }

          const now = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          });
          setGasSyncStatus({
            isConnected: true,
            isSyncing: false,
            lastSyncTime: now,
            errorMessage: null,
            stats: res.rawCounts,
          });

          if (!isSilent) {
            showToast({
              type: 'success',
              title: 'Database Google Sheets Tersambung',
              message: `Data termutakhir berhasil disinkronkan (${res.rawCounts.stokAlat} alat, ${res.rawCounts.bahanKimia} bahan, ${res.rawCounts.pengguna} user).`,
              duration: 3500,
            });
          }
        } else {
          setGasSyncStatus((prev) => ({
            ...prev,
            isConnected: false,
            isSyncing: false,
            errorMessage: res.message,
          }));
        }
      } catch (err: any) {
        setGasSyncStatus((prev) => ({
          ...prev,
          isConnected: false,
          isSyncing: false,
          errorMessage: err.message || 'Gagal tersambung ke Google Apps Script',
        }));
      }
    },
    [showToast]
  );

  // Auto-sync real-time dari Google Apps Script saat SIMLAB pertama kali dimuat
  useEffect(() => {
    syncWithGoogleSheets(true);
  }, [syncWithGoogleSheets]);

  // Helper Pengecekan Otoritas Akses Laboratorium (Access Control List)
  const canEditLab = (labId: LabId): boolean => {
    if (!currentUser) return false;
    // 1. Kepala Lab / Super Administrator memiliki akses penuh ke seluruh lab
    if (
      currentUser.role === 'KEPALA_LAB' ||
      (currentUser.email || '').toLowerCase().trim() === AUTHORIZED_HEAD_OF_LAB_EMAIL.toLowerCase().trim() ||
      currentUser.assignedLab === 'ALL'
    ) {
      return true;
    }
    // 2. Guru pengampu hanya berhak mengedit laboratorium yang ditugaskan (assignedLab)
    return currentUser.assignedLab === labId;
  };

  // Fungsi Tambah Rekap Jurnal Praktikum & Berita Acara Otomatis
  const addLabActivity = (
    activityData: NewLabActivityInput
  ): { success: boolean; message: string; record?: LabActivityRecord } => {
    try {
      // Validasi Keamanan Hak Akses (Access Control List)
      if (!canEditLab(activityData.laboratorium)) {
        const errMsg = 'Akses Ditolak: Anda tidak memiliki otoritas untuk mengubah data laboratorium ini.';
        showToast({
          type: 'error',
          title: 'Akses Ditolak (Sistem ACL)',
          message: errMsg,
          duration: 5000,
        });
        return {
          success: false,
          message: errMsg,
        };
      }

      let jumlahHadir = 0;
      let jumlahAbsen = 0;
      const absentList: string[] = [];
      let scoresJson = activityData.rekap_nilai_json || '[]';

      if (activityData.student_scores && Array.isArray(activityData.student_scores)) {
        activityData.student_scores.forEach((s) => {
          if (s.status === 'Hadir') {
            jumlahHadir += 1;
          } else {
            jumlahAbsen += 1;
            absentList.push(`${s.nama} (${s.status})`);
          }
        });
        scoresJson = JSON.stringify(activityData.student_scores);
      } else if (activityData.rekap_nilai_json) {
        try {
          const parsed = JSON.parse(activityData.rekap_nilai_json);
          if (Array.isArray(parsed)) {
            parsed.forEach((s: any) => {
              if (s.status === 'Hadir') {
                jumlahHadir += 1;
              } else {
                jumlahAbsen += 1;
                absentList.push(`${s.nama || 'Siswa'} (${s.status || 'Absen'})`);
              }
            });
          }
        } catch {
          // ignore parsing error if custom string
        }
      }

      // Gunakan nilai spesifik jika dikirim manual, atau hasil hitung otomatis
      if (activityData.jumlah_hadir !== undefined) jumlahHadir = activityData.jumlah_hadir;
      if (activityData.jumlah_absen !== undefined) jumlahAbsen = activityData.jumlah_absen;
      const namaAbsen =
        activityData.nama_absen !== undefined ? activityData.nama_absen : absentList.join(', ');

      const nextId =
        labActivities.length > 0 ? Math.max(...labActivities.map((a) => a.id)) + 1 : 1;

      const newRecord: LabActivityRecord = {
        id: nextId,
        tanggal_kegiatan: activityData.tanggal_kegiatan,
        laboratorium: activityData.laboratorium,
        kelas_id: activityData.kelas_id,
        judul_percobaan: activityData.judul_percobaan,
        materi_pokok: activityData.materi_pokok || '',
        jumlah_hadir: jumlahHadir,
        jumlah_absen: jumlahAbsen,
        nama_absen: namaAbsen,
        rekap_nilai_json: scoresJson,
        catatan_kejadian: activityData.catatan_kejadian || '',
        guru_id:
          activityData.guru_id || (currentUser?.id ? Number(currentUser.id) || 1 : 1),
        nama_guru: activityData.nama_guru || currentUser?.name || 'Guru Laboran Resmi',
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      const nextActivities = [newRecord, ...labActivities];
      setLabActivities(nextActivities);
      try {
        localStorage.setItem(STORAGE_KEY_LAB_ACTIVITIES, JSON.stringify(nextActivities));
      } catch (err) {
        console.error('Gagal menyimpan jurnal praktikum ke localStorage:', err);
      }

      // Real-time synchronization to Google Sheets (Jurnal_Praktikum & E_Rapot)
      const matchedClass = classes.find((c) => c.id === newRecord.kelas_id);
      syncActivityToGas(newRecord, matchedClass?.nama_kelas);

      const successMsg = 'Jurnal praktikum guru dan berita acara berhasil disimpan.';
      showToast({
        type: 'success',
        title: 'Jurnal Praktikum Disimpan',
        message: `Jurnal "${newRecord.judul_percobaan}" (${LAB_DEFINITIONS[newRecord.laboratorium]?.shortName || newRecord.laboratorium}) berhasil tersimpan ke database.`,
        duration: 4500,
      });

      return {
        success: true,
        message: successMsg,
        record: newRecord,
      };
    } catch (err: any) {
      const errMsg = `Gagal menyimpan kegiatan praktikum: ${err?.message || 'Kesalahan sistem'}`;
      showToast({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: errMsg,
      });
      return {
        success: false,
        message: errMsg,
      };
    }
  };

  // Fungsi Perbarui Rekap Jurnal Praktikum (dengan ACL Check)
  const updateLabActivity = (
    id: number,
    updates: Partial<NewLabActivityInput>
  ): { success: boolean; message: string; record?: LabActivityRecord } => {
    try {
      const existing = labActivities.find((a) => a.id === id);
      if (!existing) {
        return { success: false, message: 'Data jurnal praktikum tidak ditemukan.' };
      }

      const targetLab = updates.laboratorium || existing.laboratorium;
      if (!canEditLab(targetLab)) {
        const errMsg = 'Akses Ditolak: Anda tidak memiliki otoritas untuk mengubah data laboratorium ini.';
        showToast({
          type: 'error',
          title: 'Akses Ditolak (Sistem ACL)',
          message: errMsg,
          duration: 5000,
        });
        return {
          success: false,
          message: errMsg,
        };
      }

      let jumlahHadir = existing.jumlah_hadir;
      let jumlahAbsen = existing.jumlah_absen;
      let namaAbsen = existing.nama_absen;
      let scoresJson = existing.rekap_nilai_json;

      if (updates.student_scores && Array.isArray(updates.student_scores)) {
        let hadir = 0;
        let absen = 0;
        const absentList: string[] = [];
        updates.student_scores.forEach((s) => {
          if (s.status === 'Hadir') hadir += 1;
          else {
            absen += 1;
            absentList.push(`${s.nama} (${s.status})`);
          }
        });
        jumlahHadir = hadir;
        jumlahAbsen = absen;
        namaAbsen = absentList.join(', ');
        scoresJson = JSON.stringify(updates.student_scores);
      } else if (updates.rekap_nilai_json) {
        scoresJson = updates.rekap_nilai_json;
      }

      if (updates.jumlah_hadir !== undefined) jumlahHadir = updates.jumlah_hadir;
      if (updates.jumlah_absen !== undefined) jumlahAbsen = updates.jumlah_absen;
      if (updates.nama_absen !== undefined) namaAbsen = updates.nama_absen;

      const updatedRecord: LabActivityRecord = {
        ...existing,
        tanggal_kegiatan: updates.tanggal_kegiatan || existing.tanggal_kegiatan,
        laboratorium: targetLab,
        kelas_id: updates.kelas_id !== undefined ? updates.kelas_id : existing.kelas_id,
        judul_percobaan: updates.judul_percobaan !== undefined ? updates.judul_percobaan : existing.judul_percobaan,
        materi_pokok: updates.materi_pokok !== undefined ? updates.materi_pokok : existing.materi_pokok,
        jumlah_hadir: jumlahHadir,
        jumlah_absen: jumlahAbsen,
        nama_absen: namaAbsen,
        rekap_nilai_json: scoresJson,
        catatan_kejadian: updates.catatan_kejadian !== undefined ? updates.catatan_kejadian : existing.catatan_kejadian,
      };

      const nextActivities = labActivities.map((a) => (a.id === id ? updatedRecord : a));
      setLabActivities(nextActivities);
      try {
        localStorage.setItem(STORAGE_KEY_LAB_ACTIVITIES, JSON.stringify(nextActivities));
      } catch (err) {
        console.error('Gagal menyimpan pembaruan lab activities ke localStorage:', err);
      }

      // Optimistic background sync: Update di Google Sheets (Jurnal_Praktikum)
      syncActivityToGas(updatedRecord);

      const successMsg = 'Jurnal praktikum guru dan berita acara berhasil diperbarui.';
      showToast({
        type: 'success',
        title: 'Perubahan Jurnal Disimpan',
        message: `Jurnal "${updatedRecord.judul_percobaan}" (${LAB_DEFINITIONS[updatedRecord.laboratorium]?.shortName || updatedRecord.laboratorium}) berhasil diperbarui.`,
        duration: 4500,
      });

      return {
        success: true,
        message: successMsg,
        record: updatedRecord,
      };
    } catch (err: any) {
      const errMsg = `Gagal memperbarui kegiatan praktikum: ${err?.message || 'Kesalahan sistem'}`;
      showToast({
        type: 'error',
        title: 'Gagal Memperbarui',
        message: errMsg,
      });
      return {
        success: false,
        message: errMsg,
      };
    }
  };

  // Fungsi Hapus Rekap Jurnal Praktikum (dengan ACL Check & Sinkronisasi Langsung ke localStorage)
  const deleteLabActivity = (id: number): { success: boolean; message: string } => {
    try {
      const existing = labActivities.find((a) => a.id === id);
      if (!existing) {
        return { success: false, message: 'Data jurnal praktikum tidak ditemukan.' };
      }

      if (!canEditLab(existing.laboratorium)) {
        const errMsg = 'Akses Ditolak: Anda tidak memiliki otoritas untuk menghapus data laboratorium ini.';
        showToast({
          type: 'error',
          title: 'Akses Ditolak (Sistem ACL)',
          message: errMsg,
          duration: 5000,
        });
        return {
          success: false,
          message: errMsg,
        };
      }

      const remaining = labActivities.filter((a) => a.id !== id);
      setLabActivities(remaining);
      try {
        localStorage.setItem(STORAGE_KEY_LAB_ACTIVITIES, JSON.stringify(remaining));
      } catch (err) {
        console.error('Gagal menyimpan penghapusan lab activity ke localStorage:', err);
      }

      // Optimistic background sync: Hapus dari sheet Jurnal_Praktikum di Google Sheets
      syncDeleteActivityFromGas(id);

      showToast({
        type: 'info',
        title: 'Jurnal Dihapus',
        message: `Jurnal praktikum "${existing.judul_percobaan}" berhasil dihapus dari sistem.`,
      });
      return { success: true, message: 'Jurnal praktikum berhasil dihapus.' };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal menghapus kegiatan praktikum: ${err?.message || 'Kesalahan sistem'}`,
      };
    }
  };

  // --------------------------------------------------------------------------
  // FITUR ADMINISTRASI PRAKTIKUM KHUSUS KEPALA_LAB (ADMIN)
  // --------------------------------------------------------------------------

  // 1. Reset Klaster: Menghapus riwayat praktikum khusus mapel/lab aktif di kelas tersebut
  const resetLabActivitiesByCluster = (
    lab: LabId,
    classId: number
  ): { success: boolean; message: string } => {
    if (!canManageUsers && currentUser?.role !== 'KEPALA_LAB' && currentUser?.assignedLab !== 'ALL') {
      const errMsg = 'Akses Ditolak: Hanya Kepala Laboratorium (Admin) yang berhak mereset riwayat klaster praktikum.';
      showToast({ type: 'error', title: 'Akses Ditolak (ACL)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg };
    }

    const beforeCount = labActivities.length;
    const remaining = labActivities.filter(
      (a) => !(a.laboratorium === lab && a.kelas_id === Number(classId))
    );
    const removedCount = beforeCount - remaining.length;

    setLabActivities(remaining);
    localStorage.setItem(STORAGE_KEY_LAB_ACTIVITIES, JSON.stringify(remaining));

    const msg = `Berhasil mereset klaster ${LAB_DEFINITIONS[lab]?.shortName || lab} (${removedCount} rekaman jurnal dihapus).`;
    showToast({
      type: 'success',
      title: 'Reset Klaster Berhasil',
      message: msg,
    });
    return { success: true, message: msg };
  };

  // 2. Wipe Out All: Menghapus seluruh total riwayat praktikum secara global di database
  const wipeOutAllLabActivities = (): { success: boolean; message: string } => {
    if (!canManageUsers && currentUser?.role !== 'KEPALA_LAB' && currentUser?.assignedLab !== 'ALL') {
      const errMsg = 'Akses Ditolak: Hanya Kepala Laboratorium (Admin) yang berwenang melakukan Wipe Out data praktikum.';
      showToast({ type: 'error', title: 'Akses Ditolak (ACL)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg };
    }

    const totalCount = labActivities.length;
    setLabActivities([]);
    localStorage.setItem(STORAGE_KEY_LAB_ACTIVITIES, JSON.stringify([]));

    const msg = `Seluruh riwayat praktikum global (${totalCount} rekaman) berhasil di-wipe out dari database.`;
    showToast({
      type: 'warning',
      title: 'Database Praktikum Dikosongkan',
      message: msg,
      duration: 5000,
    });
    return { success: true, message: msg };
  };

  // 3. Tambah Kelas/Rombel Baru
  const addLabClass = (
    nama_kelas: string,
    tahun_ajaran: string,
    unit?: SchoolUnit
  ): { success: boolean; message: string; newClass?: LabClass } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Fitur tambah kelas hanya kewenangan Admin (Kepala Lab). Tingkatkan keamanan data rombel.';
      showToast({ type: 'error', title: 'Akses Ditolak (Keamanan Data)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg };
    }

    if (!nama_kelas.trim()) {
      return { success: false, message: 'Nama rombel/kelas wajib diisi.' };
    }

    const detectedUnit = unit || getSchoolUnit(nama_kelas);
    const nextId = classes.length > 0 ? Math.max(...classes.map((c) => c.id)) + 1 : 1;
    const newClassItem: LabClass = {
      id: nextId,
      nama_kelas: nama_kelas.trim(),
      tahun_ajaran: tahun_ajaran.trim() || '2025/2026',
      unit: detectedUnit,
      created_at: new Date().toISOString(),
    };

    const nextClasses = [...classes, newClassItem];
    setClasses(nextClasses);
    localStorage.setItem(STORAGE_KEY_LAB_CLASSES, JSON.stringify(nextClasses));

    showToast({
      type: 'success',
      title: 'Rombel Baru Ditambahkan',
      message: `Kelas "${newClassItem.nama_kelas}" (Unit ${newClassItem.unit}) berhasil dibuat.`,
    });

    return {
      success: true,
      message: 'Kelas berhasil ditambahkan.',
      newClass: newClassItem,
    };
  };

  // 4. Tambah Siswa Manual ke Rombel
  const addLabStudent = (
    kelas_id: number,
    nama_siswa: string,
    nisn?: string
  ): { success: boolean; message: string; newStudent?: LabStudent } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Fitur tambah siswa hanya kewenangan Admin (Kepala Lab). Akun Laboran dan Guru bersifat Read-Only.';
      showToast({ type: 'error', title: 'Akses Ditolak (Akses Khusus Admin)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg };
    }

    if (!nama_siswa.trim()) {
      return { success: false, message: 'Nama siswa wajib diisi.' };
    }

    const nextId = students.length > 0 ? Math.max(...students.map((s) => s.id)) + 1 : 1;
    const cleanNisn = isValidNisn(nisn) ? nisn!.trim() : generateFallbackNisn(nextId);
    const matchedClass = classes.find((c) => c.id === Number(kelas_id));
    const unit = matchedClass ? getSchoolUnit(matchedClass.nama_kelas, matchedClass.unit) : 'SMA';

    const newStudentItem: LabStudent = {
      id: nextId,
      nama_siswa: nama_siswa.trim(),
      kelas_id: Number(kelas_id),
      nisn: cleanNisn,
      unit,
      status: 'aktif',
      created_at: new Date().toISOString(),
    };

    const nextStudents = [...students, newStudentItem];
    setStudents(nextStudents);
    localStorage.setItem(STORAGE_KEY_LAB_STUDENTS, JSON.stringify(nextStudents));

    // Real-time synchronization to Google Sheets (Data_Siswa)
    syncStudentToGas(newStudentItem, matchedClass?.nama_kelas);

    showToast({
      type: 'success',
      title: 'Siswa Berhasil Didaftarkan',
      message: `Siswa "${newStudentItem.nama_siswa}" berhasil ditambahkan ke kelas.`,
    });

    return {
      success: true,
      message: `Siswa "${newStudentItem.nama_siswa}" berhasil didaftarkan.`,
      newStudent: newStudentItem,
    };
  };

  // 5. Import Siswa dari Excel (Rombel Tunggal)
  const importStudentsFromExcel = (
    kelas_id: number,
    studentsList: Array<{ nama_siswa: string; nisn?: string; gender?: string; status?: string }>
  ): { success: boolean; message: string; count: number } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Fitur import data siswa hanya kewenangan Admin (Kepala Lab). Akun Laboran dan Guru bersifat Read-Only.';
      showToast({ type: 'error', title: 'Akses Ditolak (Akses Khusus Admin)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg, count: 0 };
    }

    const validList = studentsList.filter((s) => s.nama_siswa && s.nama_siswa.trim().length > 0);
    if (validList.length === 0) {
      return { success: false, message: 'Tidak ada baris data siswa yang valid ditemukan dalam file Excel.', count: 0 };
    }

    const matchedClass = classes.find((c) => c.id === Number(kelas_id));
    const unit = matchedClass ? getSchoolUnit(matchedClass.nama_kelas, matchedClass.unit) : 'SMA';

    let startId = students.length > 0 ? Math.max(...students.map((s) => s.id)) + 1 : 1;
    const newItems: LabStudent[] = validList.map((s, idx) => {
      const cleanNisn = isValidNisn(s.nisn) ? s.nisn!.trim() : generateFallbackNisn(startId + idx);
      const gender = normalizeGender(s.gender);
      return {
        id: startId++,
        nama_siswa: s.nama_siswa.trim(),
        kelas_id: Number(kelas_id),
        nisn: cleanNisn,
        unit,
        gender,
        status: 'aktif' as const,
        created_at: new Date().toISOString(),
      };
    });

    const nextStudents = [...students, ...newItems];
    setStudents(nextStudents);
    localStorage.setItem(STORAGE_KEY_LAB_STUDENTS, JSON.stringify(nextStudents));

    // Real-time synchronization to Google Sheets (Data_Siswa) with complete 6 headers
    syncBatchStudentsToGas(
      newItems.map((st) => ({ student: st, className: matchedClass?.nama_kelas }))
    );

    showToast({
      type: 'success',
      title: 'Import Siswa Berhasil',
      message: `Berhasil mengimpor ${newItems.length} siswa ke rombel ${matchedClass?.nama_kelas || ''} dari Excel.`,
      duration: 5000,
    });

    return {
      success: true,
      message: `Berhasil menambahkan ${newItems.length} siswa ke rombel terpilih.`,
      count: newItems.length,
    };
  };

  // 6. Edit Identitas Siswa Manual & Status
  const updateLabStudent = (
    id: number | string,
    updates: { nama_siswa?: string; nisn?: string; status?: StudentStatus; status_keterangan?: string }
  ): { success: boolean; message: string } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Fitur ubah data siswa hanya kewenangan Admin (Kepala Lab).';
      showToast({ type: 'error', title: 'Akses Ditolak (Akses Khusus Admin)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg };
    }

    const target = students.find((s) => matchId(s.id, id));
    if (!target) {
      return { success: false, message: 'Data siswa tidak ditemukan.' };
    }

    const updated: LabStudent = {
      ...target,
      nama_siswa: updates.nama_siswa !== undefined ? updates.nama_siswa.trim() : target.nama_siswa,
      nisn: updates.nisn !== undefined ? updates.nisn.trim() : target.nisn,
      status: updates.status !== undefined ? updates.status : target.status || 'aktif',
      status_keterangan:
        updates.status_keterangan !== undefined
          ? updates.status_keterangan.trim()
          : target.status_keterangan,
    };

    const nextStudents = students.map((s) => (matchId(s.id, id) ? updated : s));
    setStudents(nextStudents);
    try {
      localStorage.setItem(STORAGE_KEY_LAB_STUDENTS, JSON.stringify(nextStudents));
    } catch {}

    showToast({
      type: 'success',
      title: 'Identitas Siswa Diperbarui',
      message: `Data siswa "${updated.nama_siswa}" berhasil disimpan.`,
    });

    return {
      success: true,
      message: `Data siswa "${updated.nama_siswa}" berhasil diperbarui.`,
    };
  };

  // 6b. Sinkronisasi Global Status Siswa (Pindah / Keluar / Aktif)
  const updateStudentStatus = (
    id: number | string,
    status: StudentStatus,
    keterangan?: string
  ): { success: boolean; message: string } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Hanya Admin (Kepala Lab) yang berwenang mengubah status siswa pindah/keluar.';
      showToast({ type: 'error', title: 'Akses Ditolak (Khusus Admin)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg };
    }

    const target = students.find((s) => matchId(s.id, id));
    if (!target) {
      return { success: false, message: 'Data siswa tidak ditemukan.' };
    }

    const label = status === 'aktif' ? 'Aktif' : status === 'pindah' ? 'Pindah Sekolah' : 'Keluar / Nonaktif';
    const note = keterangan?.trim() || `Status: ${label}`;

    const updated: LabStudent = {
      ...target,
      status,
      status_keterangan: status === 'aktif' ? '' : note,
    };

    const nextStudents = students.map((s) => (matchId(s.id, id) ? updated : s));
    setStudents(nextStudents);
    try {
      localStorage.setItem(STORAGE_KEY_LAB_STUDENTS, JSON.stringify(nextStudents));
    } catch {}

    showToast({
      type: 'info',
      title: 'Sinkronisasi Status Siswa Global',
      message: `Status siswa "${target.nama_siswa}" berhasil disinkronkan ke seluruh sistem: ${label}.`,
      duration: 5000,
    });

    return {
      success: true,
      message: `Status siswa "${target.nama_siswa}" berhasil diubah menjadi ${label}.`,
    };
  };



  // 7. Hapus Siswa dari Rombel (Reaktif, Instant State Update & LocalStorage Sync & Dependencies Cleanup)
  const deleteLabStudent = (id: number | string): { success: boolean; message: string } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Selain akun Admin (Kepala Lab), akun lainnya tidak dapat mengakses fitur hapus siswa di dalam kelas.';
      showToast({ type: 'error', title: 'Akses Ditolak (Khusus Admin / Kepala Lab)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg };
    }

    const target = students.find((s) => matchId(s.id, id));
    if (!target) {
      return { success: false, message: 'Data siswa dengan ID tersebut tidak ditemukan.' };
    }

    // 1. Hapus siswa dari state & storage
    const nextStudents = students.filter((s) => !matchId(s.id, id));
    setStudents(nextStudents);
    try {
      localStorage.setItem(STORAGE_KEY_LAB_STUDENTS, JSON.stringify(nextStudents));
    } catch {}

    // 2. Clear dependencies pada rekap aktivitas & nilai praktikum (sanitize orphaned student scores)
    let activitiesUpdated = false;
    const nextActivities = labActivities.map((act) => {
      try {
        const scores = JSON.parse(act.rekap_nilai_json || '[]');
        if (Array.isArray(scores) && scores.some((sc) => matchId(sc.student_id || sc.siswa_id, id))) {
          const filteredScores = scores.filter((sc) => !matchId(sc.student_id || sc.siswa_id, id));
          const hadirCount = filteredScores.filter(
            (sc) => sc.status === 'Hadir' || sc.status === 'HADIR' || sc.status === 'TERLAMBAT'
          ).length;
          const absenCount = filteredScores.length - hadirCount;
          activitiesUpdated = true;
          return {
            ...act,
            rekap_nilai_json: JSON.stringify(filteredScores),
            jumlah_hadir: hadirCount,
            jumlah_absen: absenCount,
          };
        }
      } catch {}
      return act;
    });

    if (activitiesUpdated) {
      setLabActivities(nextActivities);
      try {
        localStorage.setItem(STORAGE_KEY_LAB_ACTIVITIES, JSON.stringify(nextActivities));
      } catch {}
    }

    // Optimistic background sync: Hapus dari sheet Data_Siswa di Google Sheets
    syncDeleteStudentFromGas(id);

    showToast({
      type: 'success',
      title: 'Siswa Berhasil Dihapus',
      message: `Siswa "${target.nama_siswa}" telah dihapus secara permanen dari sistem.`,
      duration: 4000,
    });

    return {
      success: true,
      message: `Siswa "${target.nama_siswa}" berhasil dihapus.`,
    };
  };

  // 8. Hapus 1 Kelas Secara Keseluruhan (Cascade Delete Kelas + Seluruh Siswa + Jurnal Praktikum Terkait)
  const deleteLabClass = (classId: number | string): { success: boolean; message: string } => {
    // Keamanan Data: Fitur hapus kelas hanya kewenangan Admin (Kepala Lab)
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Fitur hapus kelas hanya kewenangan Admin (Kepala Lab). Tingkatkan keamanan data rombel.';
      showToast({ type: 'error', title: 'Akses Ditolak (Akses Khusus Admin)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg };
    }

    if (classes.length <= 1) {
      const errMsg = 'Penolakan Sistem: Tidak dapat menghapus kelas terakhir. Sistem harus memiliki minimal 1 rombel aktif.';
      showToast({ type: 'warning', title: 'Operasi Dibatalkan', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg };
    }

    const targetClass = classes.find((c) => matchId(c.id, classId));
    if (!targetClass) {
      return { success: false, message: 'Data kelas tidak ditemukan.' };
    }

    // 1. Hapus data kelas
    const nextClasses = classes.filter((c) => !matchId(c.id, classId));
    setClasses(nextClasses);
    try {
      localStorage.setItem(STORAGE_KEY_LAB_CLASSES, JSON.stringify(nextClasses));
    } catch {}

    // 2. Hapus seluruh siswa yang berada di kelas ini (Cascade Deletion)
    const countStudents = students.filter((s) => matchId(s.kelas_id, classId)).length;
    const nextStudents = students.filter((s) => !matchId(s.kelas_id, classId));
    setStudents(nextStudents);
    try {
      localStorage.setItem(STORAGE_KEY_LAB_STUDENTS, JSON.stringify(nextStudents));
    } catch {}

    // 3. Clear dependencies: Hapus seluruh sesi praktikum & berita acara yang terikat pada rombel ini
    const countActivities = labActivities.filter((a) => matchId(a.kelas_id, classId)).length;
    const nextActivities = labActivities.filter((a) => !matchId(a.kelas_id, classId));
    setLabActivities(nextActivities);
    try {
      localStorage.setItem(STORAGE_KEY_LAB_ACTIVITIES, JSON.stringify(nextActivities));
    } catch {}

    showToast({
      type: 'success',
      title: 'Kelas & Seluruh Dependensi Dihapus',
      message: `Rombel/Kelas "${targetClass.nama_kelas}" beserta ${countStudents} siswa dan ${countActivities} sesi aktivitas praktikum telah berhasil dihapus bersih.`,
      duration: 5000,
    });

    return {
      success: true,
      message: `Kelas "${targetClass.nama_kelas}" beserta ${countStudents} siswa dan ${countActivities} aktivitas praktikum berhasil dihapus.`,
    };
  };

  // 9. Import Siswa Multi-Halaman / Multi-Rombel (Otomatis deteksi & pecah ke masing-masing kelas)
  const importMultiClassStudents = (
    records: ParsedExcelStudent[]
  ): { success: boolean; message: string; count: number; classesCount: number } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Hanya Admin (Kepala Lab) yang berwenang mengimpor data siswa multi-rombel.';
      showToast({ type: 'error', title: 'Akses Ditolak (Akses Khusus Admin)', message: errMsg, duration: 5000 });
      return { success: false, message: errMsg, count: 0, classesCount: 0 };
    }

    const validRecords = records.filter(
      (r) => r.nama_siswa && r.nama_siswa.trim().length > 0
    );

    if (validRecords.length === 0) {
      return {
        success: false,
        message: 'Tidak ada baris data siswa yang valid ditemukan dalam file Excel.',
        count: 0,
        classesCount: 0,
      };
    }

    let currentClasses = [...classes];
    let currentStudents = [...students];
    let nextClassId = currentClasses.length > 0 ? Math.max(...currentClasses.map((c) => c.id)) + 1 : 1;
    let nextStudentId = currentStudents.length > 0 ? Math.max(...currentStudents.map((s) => s.id)) + 1 : 1;

    const classMap = new Map<string, number>();
    currentClasses.forEach((c) => {
      classMap.set(c.nama_kelas.toLowerCase().trim(), c.id);
    });

    let newClassesCreated = 0;
    const newStudentsToAdd: LabStudent[] = [];
    const studentsWithClassForGas: Array<{ student: LabStudent; className: string }> = [];

    validRecords.forEach((rec, idx) => {
      // 1. Parsing & Normalisasi Rombel / Kelas
      const rawClassName = (rec.nama_kelas || '').trim();
      const normClassName = rawClassName && rawClassName !== '-' ? rawClassName : 'Kelas Umum';
      const key = normClassName.toLowerCase();

      let targetClassId = classMap.get(key);
      let detectedUnit = rec.tingkat_sekolah || getSchoolUnit(normClassName);

      if (!targetClassId) {
        targetClassId = nextClassId++;
        const newClass: LabClass = {
          id: targetClassId,
          nama_kelas: normClassName,
          tahun_ajaran: rec.tahun_ajaran?.trim() || '2025/2026',
          unit: detectedUnit,
          created_at: new Date().toISOString(),
        };
        currentClasses.push(newClass);
        classMap.set(key, targetClassId);
        newClassesCreated++;
      } else {
        const found = currentClasses.find((c) => c.id === targetClassId);
        if (found) {
          detectedUnit = found.unit || detectedUnit;
        }
      }

      // 2. Validasi & Fallback NISN (Mencegah collision di Google Sheets)
      const validNisn = isValidNisn(rec.nisn)
        ? String(rec.nisn).trim()
        : generateFallbackNisn(nextStudentId + idx);

      // 3. Normalisasi Gender & Status
      const gender = normalizeGender(rec.jenis_kelamin);
      const rawStatus = (rec.status_keaktifan || 'aktif').toLowerCase();
      const studentStatus: StudentStatus = rawStatus.includes('pindah')
        ? 'pindah'
        : rawStatus.includes('keluar')
        ? 'keluar'
        : 'aktif';

      const studentItem: LabStudent = {
        id: nextStudentId++,
        nama_siswa: rec.nama_siswa.trim(),
        kelas_id: targetClassId,
        nisn: validNisn,
        unit: detectedUnit,
        gender,
        status: studentStatus,
        created_at: new Date().toISOString(),
      };

      newStudentsToAdd.push(studentItem);
      studentsWithClassForGas.push({
        student: studentItem,
        className: normClassName,
      });
    });

    const finalStudents = [...currentStudents, ...newStudentsToAdd];
    setClasses(currentClasses);
    setStudents(finalStudents);

    try {
      localStorage.setItem(STORAGE_KEY_LAB_CLASSES, JSON.stringify(currentClasses));
      localStorage.setItem(STORAGE_KEY_LAB_STUDENTS, JSON.stringify(finalStudents));
    } catch {}

    // Real-time synchronization to Google Sheets (Data_Siswa) with complete 6 headers
    syncBatchStudentsToGas(studentsWithClassForGas);

    showToast({
      type: 'success',
      title: 'Import Multi-Rombel Sukses',
      message: `Berhasil memetakan ${newStudentsToAdd.length} santri ke ${classMap.size} rombel (${newClassesCreated} rombel baru dibuat). Data tersinkronisasi ke Google Sheets.`,
      duration: 6000,
    });

    return {
      success: true,
      message: `Berhasil mengimpor ${newStudentsToAdd.length} siswa ke rombel masing-masing.`,
      count: newStudentsToAdd.length,
      classesCount: classMap.size,
    };
  };

  // Selektor Memoized untuk Mengambil Rekap Total Aktivitas & Rata-rata Nilai Siswa per Laboratorium
  const labActivitiesSummary = useMemo<LabActivitiesGroupedSummary>(() => {
    const labs: LabId[] = ['FISIKA', 'KIMIA', 'BIOLOGI', 'SMP_TERPADU'];
    const byLab = {} as Record<LabId, LabActivityLabSummary>;

    let totalAktivitasAll = 0;
    let totalScoreSumAll = 0;
    let totalStudentsScoredAll = 0;

    labs.forEach((labId) => {
      const recordsForLab = labActivities.filter((a) => a.laboratorium === labId);
      let totalHadir = 0;
      let totalAbsen = 0;
      let labScoreSum = 0;
      let labStudentsCount = 0;

      recordsForLab.forEach((record) => {
        totalHadir += record.jumlah_hadir || 0;
        totalAbsen += record.jumlah_absen || 0;

        try {
          const scores: StudentScoreEntry[] = JSON.parse(record.rekap_nilai_json);
          if (Array.isArray(scores)) {
            scores.forEach((s) => {
              const val = Number(s.nilai_akhir);
              if (!isNaN(val) && val > 0) {
                labScoreSum += val;
                labStudentsCount += 1;
              }
            });
          }
        } catch {
          // ignore
        }
      });

      const avgLabScore =
        labStudentsCount > 0 ? Number((labScoreSum / labStudentsCount).toFixed(2)) : 0;

      byLab[labId] = {
        laboratorium: labId,
        nama_lab: LAB_DEFINITIONS[labId]?.name || labId,
        total_aktivitas: recordsForLab.length,
        total_siswa_hadir: totalHadir,
        total_siswa_absen: totalAbsen,
        nilai_rata_rata: avgLabScore,
      };

      totalAktivitasAll += recordsForLab.length;
      totalScoreSumAll += labScoreSum;
      totalStudentsScoredAll += labStudentsCount;
    });

    const rataRataSemuaLab =
      totalStudentsScoredAll > 0
        ? Number((totalScoreSumAll / totalStudentsScoredAll).toFixed(2))
        : 0;

    return {
      byLab,
      totalAktivitasAll,
      rataRataSemuaLab,
    };
  }, [labActivities]);

  const getLabActivitiesSummary = () => labActivitiesSummary;

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [currentUser]);

  // Authority check: Hanya pengguna dengan email 'Ilham.nurkholis114@guru.sma.belajar.id' atau role 'KEPALA_LAB' / 'admin'
  const isHeadOfLab = Boolean(
    currentUser?.role === 'KEPALA_LAB' ||
    (currentUser as any)?.role === 'admin' ||
    (currentUser?.email || '').toLowerCase().trim() ===
      AUTHORIZED_HEAD_OF_LAB_EMAIL.toLowerCase().trim()
  );
  // Hak Akses Ketat: HANYA Akun Admin (Kepala Lab) yang memiliki otoritas modifikasi data siswa/kelas & sistem
  const isAdmin = isHeadOfLab;
  const isGuru = currentUser?.role === 'GURU_IPA_SMP';
  const canManageUsers = isHeadOfLab;

  // Auth methods - Restricted strictly to authorized staff & registered laboran accounts with mandatory password check
  const login = (email: string, password?: string): boolean => {
    const cleanEmail = email.toLowerCase().trim();
    const found = accounts.find(
      (acc) => acc.email.toLowerCase().trim() === cleanEmail
    );
    if (found) {
      if (found.status === 'nonaktif') {
        return false;
      }
      // Validasi ketat kata sandi: wajib diisi dan harus cocok
      if (!password || password.trim() === '') {
        return false;
      }
      const expected = found.password || 'labarcss2026';
      if (password !== expected) {
        return false;
      }
      setCurrentUser(found);
      return true;
    }
    // Unauthorized email
    return false;
  };

  const loginAsync = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Check local cache
    const found = accounts.find(
      (acc) => acc.email.toLowerCase().trim() === cleanEmail
    );
    if (found) {
      if (found.status === 'nonaktif') {
        return { success: false, message: 'Akun ini dinonaktifkan oleh Administrator.' };
      }
      const expected = found.password || 'labarcss2026';
      if (password === expected) {
        setCurrentUser(found);
        return { success: true, message: 'Login berhasil.' };
      }
    }

    // 2. Query remote Google Sheets Pengguna
    try {
      const res = await fetchSheetData('Pengguna');
      if (res.success && Array.isArray(res.data)) {
        for (const row of res.data) {
          const rowEmail = String(row.Email_Petugas || '').toLowerCase().trim();
          if (rowEmail === cleanEmail) {
            const rowPass = String(row.Kata_Sandi || 'labarcss2026');
            if (password === rowPass) {
              const mappedUser = mapGasRowToUser(row);
              if (mappedUser) {
                setAccounts((prev) => {
                  const filtered = prev.filter(
                    (a) => a.email.toLowerCase().trim() !== cleanEmail
                  );
                  return [...filtered, mappedUser];
                });
                setCurrentUser(mappedUser);
                return {
                  success: true,
                  message: 'Login berhasil (terotentikasi via Google Sheets).',
                };
              }
            } else {
              return { success: false, message: 'Kata sandi tidak sesuai.' };
            }
          }
        }
      }
    } catch {
      // ignore
    }

    return { success: false, message: 'Email atau kata sandi tidak cocok.' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchUserRole = (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId);
    if (target) {
      setCurrentUser(target);
    }
  };

  // --------------------------------------------------------------------------
  // USER ACCOUNT MANAGEMENT (KHUSUS: Ilham.nurkholis114@guru.sma.belajar.id)
  // --------------------------------------------------------------------------

  // 1. Tambah Akun User Baru
  const addUserAccount = (data: {
    name: string;
    email: string;
    role: UserRole;
    roleTitle?: string;
    assignedLab: LabId | 'ALL';
    schoolIdNumber?: string;
    nip?: string;
    password?: string;
    status?: 'aktif' | 'nonaktif';
  }): { success: boolean; message: string; account?: UserAccount } => {
    if (!canManageUsers) {
      return {
        success: false,
        message:
          `Akses Ditolak: Hanya pengguna dengan email ${AUTHORIZED_HEAD_OF_LAB_EMAIL} yang berhak menambahkan akun user baru.`,
      };
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();

    if (!cleanName || !cleanEmail) {
      return {
        success: false,
        message: 'Nama lengkap dan email resmi wajib diisi.',
      };
    }

    const isDuplicate = accounts.some(
      (a) => a.email.toLowerCase().trim() === cleanEmail
    );
    if (isDuplicate) {
      return {
        success: false,
        message: `Email ${cleanEmail} sudah terdaftar di sistem SIMLAB.`,
      };
    }

    const defaultRoleTitleMap: Record<UserRole, string> = {
      KEPALA_LAB: 'Kepala Laboratorium IPA Terpadu',
      LABORAN_FISIKA: 'Penanggung Jawab Lab Fisika (SMA)',
      LABORAN_KIMIA: 'Penanggung Jawab Lab Kimia (SMA)',
      LABORAN_BIOLOGI: 'Penanggung Jawab Lab Biologi (SMA)',
      GURU_IPA_SMP: 'Laboran dan Guru IPA Terpadu (SMP)',
      LABORAN: `Laboran Penanggung Jawab (${data.assignedLab})`,
    };

    const initials =
      cleanName
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'ST';

    const newAcc: UserAccount = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      email: cleanEmail,
      role: data.role,
      roleTitle:
        data.roleTitle?.trim() ||
        defaultRoleTitleMap[data.role] ||
        'Staf Laboratorium',
      assignedLab: data.assignedLab,
      schoolIdNumber:
        data.schoolIdNumber?.trim() ||
        `ARC-2026-LAB${Math.floor(10 + Math.random() * 90)}`,
      nip: data.nip?.trim() || '-',
      password: data.password?.trim() || 'labarcss2026',
      status: data.status || 'aktif',
      avatarInitials: initials,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAccounts((prev) => [...prev, newAcc]);

    // Real-time synchronization to Google Sheets (Pengguna)
    syncUserToGas(newAcc);

    return {
      success: true,
      message: `Akun baru ${newAcc.name} berhasil didaftarkan!`,
      account: newAcc,
    };
  };

  // 2. Setting / Edit Akun User
  const updateUserAccount = (
    id: string,
    updates: Partial<UserAccount>
  ): { success: boolean; message: string } => {
    const isSelf = currentUser?.id === id;
    if (!canManageUsers && !isSelf) {
      return {
        success: false,
        message:
          `Akses Ditolak: Hanya pengguna dengan email ${AUTHORIZED_HEAD_OF_LAB_EMAIL} yang berwenang mengubah profil/setting akun user lain.`,
      };
    }

    const target = accounts.find((a) => a.id === id);
    if (!target) {
      return { success: false, message: 'Akun user tidak ditemukan.' };
    }

    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      const duplicate = accounts.some(
        (a) => a.id !== id && a.email.toLowerCase().trim() === cleanEmail
      );
      if (duplicate) {
        return {
          success: false,
          message: `Email ${cleanEmail} sudah dipakai oleh akun lain.`,
        };
      }
    }

    // Proteksi akun root Kepala Lab
    if (
      target.email.toLowerCase().trim() ===
      AUTHORIZED_HEAD_OF_LAB_EMAIL.toLowerCase().trim()
    ) {
      if (updates.status === 'nonaktif') {
        return {
          success: false,
          message:
            'Perlindungan Keamanan: Akun Kepala Laboratorium IPA Terpadu tidak dapat dinonaktifkan.',
        };
      }
      if (updates.role && updates.role !== 'KEPALA_LAB') {
        return {
          success: false,
          message:
            'Peran Kepala Laboratorium IPA Terpadu utama tidak dapat diubah.',
        };
      }
    }

    let newInitials = target.avatarInitials;
    if (updates.name && updates.name.trim() !== target.name) {
      newInitials =
        updates.name
          .trim()
          .split(' ')
          .map((w) => w[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase() || target.avatarInitials;
    }

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          const updated = {
            ...acc,
            ...updates,
            avatarInitials: newInitials,
          };
          if (currentUser?.id === id) {
            setCurrentUser(updated);
          }
          // Optimistic background sync: Simpan pembaruan akun ke sheet Pengguna
          syncUserToGas(updated);
          return updated;
        }
        return acc;
      })
    );

    return { success: true, message: 'Pengaturan akun user berhasil disimpan.' };
  };

  // Update Foto Profil Akun Mandiri (JPG/PNG)
  const updateCurrentUserPhoto = (photoDataUrl: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: 'Pengguna belum login.' };

    const updated = {
      ...currentUser,
      avatarUrl: photoDataUrl,
    };
    setCurrentUser(updated);
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === currentUser.id ? { ...acc, avatarUrl: photoDataUrl } : acc))
    );

    showToast({
      type: 'success',
      title: 'Foto Profil Diperbarui',
      message: 'Foto profil akun Anda berhasil disimpan.',
    });

    return { success: true, message: 'Foto profil akun berhasil diperbarui.' };
  };

  // Peminjaman Alat Praktikum
  const addToolLoan = (
    loanData: Omit<ToolLoanRecord, 'id' | 'code' | 'createdAt'>
  ): { success: boolean; message: string; record?: ToolLoanRecord } => {
    const nextNum = Math.floor(100 + Math.random() * 900);
    const code = `PINJAM-26-${nextNum}`;
    const newRecord: ToolLoanRecord = {
      ...loanData,
      id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setLoans((prev) => [newRecord, ...prev]);

    // Real-time synchronization to Google Sheets (Peminjaman)
    syncLoanToGas(newRecord);

    showToast({
      type: 'success',
      title: 'Peminjaman Dicatat',
      message: `Peminjaman ${newRecord.quantity} unit ${newRecord.itemName} untuk ${newRecord.borrowerName} (${newRecord.borrowerClassOrDept}) berhasil dicatat.`,
    });

    return { success: true, message: 'Data peminjaman alat berhasil disimpan.', record: newRecord };
  };

  // Pengembalian Alat Praktikum & Laporan Rusak / Pecah
  const returnToolLoan = (
    loanId: string,
    returnData: {
      actualReturnDate: string;
      returnedCondition: 'Baik' | 'Rusak Ringan' | 'Pecah / Rusak Berat' | 'Hilang';
      damagedQuantity?: number;
      damageIncidentReport?: string;
      actionTaken?: string;
      notes?: string;
    }
  ): { success: boolean; message: string } => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) {
      return { success: false, message: 'Data peminjaman alat tidak ditemukan.' };
    }

    const isDamaged =
      returnData.returnedCondition === 'Pecah / Rusak Berat' ||
      returnData.returnedCondition === 'Rusak Ringan' ||
      returnData.returnedCondition === 'Hilang';
    const status: LoanStatus = isDamaged ? 'KEMBALI_RUSAK_PECAH' : 'KEMBALI_BAIK';
    const damagedQty = returnData.damagedQuantity ?? (isDamaged ? 1 : 0);

    let updatedLoanForGas: ToolLoanRecord | null = null;
    const updatedLoans = loans.map((l) => {
      if (l.id === loanId) {
        const updated: ToolLoanRecord = {
          ...l,
          status,
          actualReturnDate: returnData.actualReturnDate,
          returnedCondition: returnData.returnedCondition,
          damagedQuantity: damagedQty,
          damageIncidentReport: returnData.damageIncidentReport || '',
          actionTaken: returnData.actionTaken || '',
          notes: returnData.notes ? `${l.notes || ''} [Pengembalian: ${returnData.notes}]` : l.notes,
        };
        updatedLoanForGas = updated;
        return updated;
      }
      return l;
    });

    setLoans(updatedLoans);

    if (updatedLoanForGas) {
      syncLoanToGas(updatedLoanForGas);
    }

    // Jika terjadi kerusakan / pecah, buat entri mutasi keluar dan update status kondisi pada barang inventaris
    if (isDamaged && damagedQty > 0) {
      const targetItem = items.find((i) => i.id === loan.itemId);
      if (targetItem) {
        addTransaction({
          itemId: targetItem.id,
          type: 'OUT',
          quantity: damagedQty,
          date: returnData.actualReturnDate || new Date().toISOString().slice(0, 10),
          targetLab: loan.targetLab,
          purpose: `Laporan Alat Rusak/Pecah saat Praktikum: ${loan.borrowerName} (${loan.borrowerClassOrDept})`,
          picName: loan.picOfficer || currentUser?.name || 'Petugas Lab',
          studentClassOrBatch: loan.borrowerClassOrDept,
          conditionStatus: returnData.returnedCondition === 'Rusak Ringan' ? 'Rusak Ringan' : 'Rusak Berat',
          notes: returnData.damageIncidentReport,
        });

        updateItem(targetItem.id, {
          conditionGood: Math.max(0, targetItem.conditionGood - damagedQty),
          conditionLightDamage:
            returnData.returnedCondition === 'Rusak Ringan'
              ? targetItem.conditionLightDamage + damagedQty
              : targetItem.conditionLightDamage,
          conditionHeavyDamage:
            returnData.returnedCondition === 'Pecah / Rusak Berat' || returnData.returnedCondition === 'Hilang'
              ? targetItem.conditionHeavyDamage + damagedQty
              : targetItem.conditionHeavyDamage,
          calibrationStatus: returnData.returnedCondition === 'Rusak Ringan' ? 'Perlu Kalibrasi' : targetItem.calibrationStatus,
        });
      }
    }

    showToast({
      type: isDamaged ? 'warning' : 'success',
      title: isDamaged ? 'Pengembalian Dicatat dengan Laporan Kerusakan' : 'Pengembalian Selesai',
      message: `Peminjaman alat "${loan.itemName}" oleh ${loan.borrowerName} telah berhasil diproses.`,
    });

    return { success: true, message: 'Status peminjaman berhasil diperbarui.' };
  };

  // Hapus Peminjaman & Pengembalian Alat (Role-Based Access Control)
  const deleteToolLoan = (loanId: string): { success: boolean; message: string } => {
    const isAuthorizedAdmin = Boolean(
      isAdmin ||
      isHeadOfLab ||
      currentUser?.role === 'KEPALA_LAB' ||
      (currentUser as any)?.role === 'admin' ||
      (currentUser?.email || '').toLowerCase().trim() ===
        AUTHORIZED_HEAD_OF_LAB_EMAIL.toLowerCase().trim()
    );

    if (!isAuthorizedAdmin) {
      const errMsg = 'Akses Ditolak: Hanya Admin (Kepala Lab) yang berwenang menghapus rekam peminjaman alat.';
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Khusus Admin / Kepala Lab)',
        message: errMsg,
        duration: 5000,
      });
      return { success: false, message: errMsg };
    }

    const cleanTargetId = String(loanId).trim();
    const targetLoan = loans.find(
      (l) =>
        l.id === loanId ||
        String(l.id).trim() === cleanTargetId ||
        l.code === loanId ||
        l.code.toLowerCase().trim() === cleanTargetId.toLowerCase()
    );

    const nextLoans = loans.filter(
      (l) =>
        l.id !== loanId &&
        String(l.id).trim() !== cleanTargetId &&
        l.code !== loanId &&
        l.code.toLowerCase().trim() !== cleanTargetId.toLowerCase()
    );

    setLoans(nextLoans);
    try {
      localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(nextLoans));
    } catch (err) {
      console.error('Gagal menyimpan pembaruan peminjaman ke localStorage:', err);
    }

    // Optimistic background sync: Hapus dari sheet Peminjaman
    if (targetLoan) {
      syncDeleteLoanFromGas(targetLoan.code || targetLoan.id);
    }

    const itemLabel = targetLoan
      ? `${targetLoan.code} (${targetLoan.itemName} - ${targetLoan.borrowerName})`
      : `ID #${cleanTargetId}`;

    showToast({
      type: 'info',
      title: 'Rekam Peminjaman Dihapus',
      message: `Data peminjaman ${itemLabel} berhasil dihapus dari sistem.`,
    });
    return { success: true, message: 'Data peminjaman berhasil dihapus.' };
  };

  // ==========================================================================
  // MODUL KALIBRASI ALAT PRAKTIKUM & SENSOR PRESISI LABORATORIUM
  // ==========================================================================

  const computeCalibrationStatus = (
    dueDateStr: string,
    result: CalibrationResult
  ): CalibrationStatus => {
    if (result === 'GAGAL') {
      return 'PERLU_PERBAIKAN';
    }
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'KADALUARSA';
      if (diffDays <= 30) return 'MENDEKATI_JATUH_TEMPO';
      return 'TERKALIBRASI';
    } catch {
      return 'TERKALIBRASI';
    }
  };

  const computeNextDueDate = (lastDateStr: string, intervalMonths: number): string => {
    try {
      const d = new Date(lastDateStr);
      d.setMonth(d.getMonth() + intervalMonths);
      return d.toISOString().split('T')[0];
    } catch {
      return lastDateStr;
    }
  };

  // Memoized Due & Overdue Calibrations for Automatic Dashboard Reminders
  const { dueCalibrations, overdueCalibrationsCount, dueSoonCalibrationsCount } = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    const list: CalibrationRecord[] = [];

    calibrations.forEach((cal) => {
      const dynamicStatus = computeCalibrationStatus(cal.nextCalibrationDueDate, cal.result);
      if (dynamicStatus === 'KADALUARSA') {
        overdue++;
        list.push({ ...cal, status: 'KADALUARSA' });
      } else if (dynamicStatus === 'MENDEKATI_JATUH_TEMPO') {
        dueSoon++;
        list.push({ ...cal, status: 'MENDEKATI_JATUH_TEMPO' });
      } else if (dynamicStatus === 'PERLU_PERBAIKAN') {
        list.push({ ...cal, status: 'PERLU_PERBAIKAN' });
      }
    });

    return {
      dueCalibrations: list,
      overdueCalibrationsCount: overdue,
      dueSoonCalibrationsCount: dueSoon,
    };
  }, [calibrations]);

  // Tambah Rekam Kalibrasi Baru
  const addCalibrationRecord = (
    data: Omit<CalibrationRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): { success: boolean; message: string; record?: CalibrationRecord } => {
    if (!canEditLab(data.lab)) {
      const errMsg = 'Akses Ditolak: Anda tidak memiliki otoritas untuk mencatat kalibrasi di laboratorium ini.';
      showToast({ type: 'error', title: 'Akses Ditolak', message: errMsg });
      return { success: false, message: errMsg };
    }

    const calculatedDueDate =
      data.nextCalibrationDueDate ||
      computeNextDueDate(data.lastCalibrationDate, data.calibrationIntervalMonths || 6);
    const calculatedStatus = computeCalibrationStatus(calculatedDueDate, data.result);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newRecord: CalibrationRecord = {
      ...data,
      id: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nextCalibrationDueDate: calculatedDueDate,
      status: calculatedStatus,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    setCalibrations((prev) => [newRecord, ...prev]);

    // Sinkronkan status pada item master jika ada
    if (data.itemId) {
      updateItem(data.itemId, {
        calibrationStatus:
          calculatedStatus === 'TERKALIBRASI'
            ? 'Bagus'
            : calculatedStatus === 'PERLU_PERBAIKAN'
            ? 'Rusak'
            : 'Perlu Kalibrasi',
      });
    }

    showToast({
      type: 'success',
      title: 'Kalibrasi Berhasil Dicatat',
      message: `Jadwal & data kalibrasi alat "${newRecord.itemName}" (${
        LAB_DEFINITIONS[newRecord.lab]?.shortName || newRecord.lab
      }) berhasil disimpan.`,
    });

    return {
      success: true,
      message: 'Rekam kalibrasi berhasil ditambahkan.',
      record: newRecord,
    };
  };

  // Update Data Kalibrasi
  const updateCalibrationRecord = (
    id: string,
    updates: Partial<CalibrationRecord>
  ): { success: boolean; message: string } => {
    const existing = calibrations.find((c) => c.id === id);
    if (!existing) {
      return { success: false, message: 'Data kalibrasi tidak ditemukan.' };
    }

    if (updates.lab && !canEditLab(updates.lab)) {
      const errMsg = 'Akses Ditolak: Anda tidak memiliki otoritas mengubah data kalibrasi di laboratorium ini.';
      showToast({ type: 'error', title: 'Akses Ditolak', message: errMsg });
      return { success: false, message: errMsg };
    }

    const nextDueDate =
      updates.nextCalibrationDueDate ||
      (updates.lastCalibrationDate && updates.calibrationIntervalMonths
        ? computeNextDueDate(updates.lastCalibrationDate, updates.calibrationIntervalMonths)
        : existing.nextCalibrationDueDate);
    const result = updates.result || existing.result;
    const status = computeCalibrationStatus(nextDueDate, result);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setCalibrations((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...updates,
              nextCalibrationDueDate: nextDueDate,
              status,
              updatedAt: nowStr,
            }
          : c
      )
    );

    if (existing.itemId) {
      updateItem(existing.itemId, {
        calibrationStatus:
          status === 'TERKALIBRASI'
            ? 'Bagus'
            : status === 'PERLU_PERBAIKAN'
            ? 'Rusak'
            : 'Perlu Kalibrasi',
      });
    }

    showToast({
      type: 'success',
      title: 'Data Kalibrasi Diperbarui',
      message: `Pembaruan data kalibrasi "${existing.itemName}" berhasil disimpan.`,
    });

    return { success: true, message: 'Data kalibrasi berhasil diperbarui.' };
  };

  // Uji / Perbarui Kalibrasi Berkala Baru
  const performCalibrationTest = (
    id: string,
    testData: {
      lastCalibrationDate: string;
      calibrationIntervalMonths: number;
      calibratedBy: string;
      certificateNumber?: string;
      result: CalibrationResult;
      measuredDeviation?: string;
      standardReference?: string;
      actionTaken?: string;
      notes?: string;
    }
  ): { success: boolean; message: string } => {
    const existing = calibrations.find((c) => c.id === id);
    if (!existing) {
      return { success: false, message: 'Data kalibrasi tidak ditemukan.' };
    }

    const nextDueDate = computeNextDueDate(
      testData.lastCalibrationDate,
      testData.calibrationIntervalMonths
    );
    const status = computeCalibrationStatus(nextDueDate, testData.result);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setCalibrations((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...testData,
              nextCalibrationDueDate: nextDueDate,
              status,
              updatedAt: nowStr,
            }
          : c
      )
    );

    if (existing.itemId) {
      updateItem(existing.itemId, {
        calibrationStatus:
          status === 'TERKALIBRASI'
            ? 'Bagus'
            : status === 'PERLU_PERBAIKAN'
            ? 'Rusak'
            : 'Perlu Kalibrasi',
      });
    }

    showToast({
      type:
        testData.result === 'LULUS'
          ? 'success'
          : testData.result === 'LULUS_BERSYARAT'
          ? 'warning'
          : 'error',
      title: `Hasil Kalibrasi: ${testData.result}`,
      message: `Uji kalibrasi "${existing.itemName}" berhasil disimpan. Jatuh tempo berikutnya: ${nextDueDate}.`,
    });

    return { success: true, message: 'Hasil kalibrasi berhasil diperbarui.' };
  };

  // Hapus Rekam Kalibrasi
  const deleteCalibrationRecord = (id: string): { success: boolean; message: string } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Hanya Admin (Kepala Lab) yang berwenang menghapus rekam kalibrasi.';
      showToast({ type: 'error', title: 'Akses Ditolak', message: errMsg });
      return { success: false, message: errMsg };
    }

    const existing = calibrations.find((c) => c.id === id);
    setCalibrations((prev) => prev.filter((c) => c.id !== id));

    showToast({
      type: 'info',
      title: 'Rekam Kalibrasi Dihapus',
      message: `Data kalibrasi "${existing?.itemName || id}" telah dihapus dari sistem.`,
    });

    return { success: true, message: 'Data kalibrasi berhasil dihapus.' };
  };

  // 3. Hapus Akun User
  const deleteUserAccount = (id: string): { success: boolean; message: string } => {
    if (!canManageUsers) {
      return {
        success: false,
        message:
          `Akses Ditolak: Hanya pengguna dengan email ${AUTHORIZED_HEAD_OF_LAB_EMAIL} yang memiliki hak akses menghapus akun user.`,
      };
    }

    const target = accounts.find((a) => a.id === id);
    if (!target) {
      return { success: false, message: 'Akun user tidak ditemukan.' };
    }

    // Proteksi Root: Akun Kepala Lab utama tidak boleh dihapus
    if (
      target.email.toLowerCase().trim() ===
      AUTHORIZED_HEAD_OF_LAB_EMAIL.toLowerCase().trim()
    ) {
      return {
        success: false,
        message:
          'Proteksi Sistem: Akun Kepala Laboratorium IPA Terpadu utama tidak dapat dihapus untuk menjaga kestabilan data!',
      };
    }

    setAccounts((prev) => prev.filter((a) => a.id !== id));

    // Optimistic background sync: Hapus dari sheet Pengguna di Google Sheets
    syncDeleteUserFromGas(target.id);

    return {
      success: true,
      message: `Akun ${target.name} (${target.email}) berhasil dihapus permanen dari sistem.`,
    };
  };

  // 4. Reset Kata Sandi User
  const resetUserPassword = (
    id: string,
    newPassword?: string
  ): { success: boolean; message: string; generatedPassword?: string } => {
    if (!canManageUsers) {
      return {
        success: false,
        message:
          `Akses Ditolak: Hanya pengguna dengan email ${AUTHORIZED_HEAD_OF_LAB_EMAIL} yang berwenang mereset kata sandi akun.`,
      };
    }

    const target = accounts.find((a) => a.id === id);
    if (!target) {
      return { success: false, message: 'Akun user tidak ditemukan.' };
    }

    const passToSet = newPassword?.trim() || 'labarcss2026';

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          const updated = { ...acc, password: passToSet };
          if (currentUser?.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return acc;
      })
    );

    return {
      success: true,
      message: `Kata sandi akun ${target.name} berhasil direset!`,
      generatedPassword: passToSet,
    };
  };

  // 5. Permintaan Verifikasi Ganti Sandi via Email Mandiri
  const requestPasswordChangeVerification = (
    email: string
  ): {
    success: boolean;
    message: string;
    verificationCode?: string;
    expiresInMinutes?: number;
  } => {
    const cleanEmail = email.toLowerCase().trim();
    const targetAccount = accounts.find(
      (a) => a.email.toLowerCase().trim() === cleanEmail
    );
    if (!targetAccount) {
      return { success: false, message: 'Email akun tidak terdaftar di sistem SIMLAB.' };
    }

    // Generate 6 digit random OTP code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newLog: PasswordChangeLog = {
      id: `pwd-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: targetAccount.id,
      userEmail: targetAccount.email,
      userName: targetAccount.name,
      userRole: targetAccount.role,
      requestedAt: new Date().toISOString(),
      verificationCode,
      status: 'PENDING',
      device: typeof navigator !== 'undefined' && /Mobile|Android|iPhone/i.test(navigator.userAgent)
        ? 'Perangkat Seluler (Mobile)'
        : 'Perangkat Desktop (Browser PC)',
    };

    setPasswordChangeLogs((prev) => [newLog, ...prev.slice(0, 99)]);

    return {
      success: true,
      message: `Kode verifikasi 6 digit telah dikirimkan ke email terdaftar ${targetAccount.email}.`,
      verificationCode,
      expiresInMinutes: 10,
    };
  };

  // 6. Verifikasi Kode & Simpan Kata Sandi Baru
  const verifyAndChangePassword = (
    email: string,
    code: string,
    newPassword: string
  ): { success: boolean; message: string } => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();

    const targetAccount = accounts.find(
      (a) => a.email.toLowerCase().trim() === cleanEmail
    );
    if (!targetAccount) {
      return { success: false, message: 'Akun dengan email ini tidak ditemukan di sistem.' };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return {
        success: false,
        message: 'Kata sandi baru terlalu pendek! Minimal harus terdiri dari 6 karakter.',
      };
    }

    // Cari log verifikasi PENDING terbaru untuk email ini yang cocok kodenya
    const matchingLog = passwordChangeLogs.find(
      (log) =>
        log.userEmail.toLowerCase().trim() === cleanEmail &&
        log.status === 'PENDING' &&
        log.verificationCode.trim() === cleanCode
    );

    if (!matchingLog) {
      return {
        success: false,
        message: 'Kode verifikasi tidak sesuai atau sudah kadaluarsa. Silakan periksa kembali email Anda.',
      };
    }

    const nowIso = new Date().toISOString();

    // Update password di daftar akun
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.email.toLowerCase().trim() === cleanEmail) {
          const updated = {
            ...acc,
            password: newPassword.trim(),
            lastPasswordChangedAt: nowIso,
          };
          if (currentUser?.email.toLowerCase().trim() === cleanEmail) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return acc;
      })
    );

    // Update log status menjadi VERIFIED
    setPasswordChangeLogs((prev) =>
      prev.map((log) => {
        if (log.id === matchingLog.id) {
          return {
            ...log,
            status: 'VERIFIED',
            completedAt: nowIso,
            newPasswordMasked: '••••••••',
          };
        }
        return log;
      })
    );

    return {
      success: true,
      message: `Kata sandi akun ${targetAccount.name} (${cleanEmail}) berhasil diubah dan telah diverifikasi via email!`,
    };
  };

  const clearPasswordChangeLogs = () => {
    setPasswordChangeLogs([]);
    localStorage.removeItem(STORAGE_KEY_PASSWORD_LOGS);
  };

  // Clean Reset: Kosongkan seluruh isi data inventory dan log_aktivitas (hapus data tiruan AI)
  const clearAllInventoryAndLogs = () => {
    setItems([]);
    setTransactions([]);
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify([]));
  };

  // Add Item
  const addItem = (
    itemData: Omit<InventoryItem, 'id' | 'currentTotalStock' | 'totalIn' | 'totalOut' | 'lastUpdated'>
  ) => {
    const totalDist =
      (itemData.distribution.FISIKA || 0) +
      (itemData.distribution.KIMIA || 0) +
      (itemData.distribution.BIOLOGI || 0) +
      (itemData.distribution.SMP_TERPADU || 0);

    const initial = itemData.initialStock2026 || totalDist;
    const finalId = (itemData.code && itemData.code.trim()) || `ALT-${Date.now()}`;
    const newItem: InventoryItem = {
      ...itemData,
      id: finalId,
      code: (itemData.code && itemData.code.trim()) || finalId,
      initialStock2026: initial,
      totalIn: 0,
      totalOut: 0,
      currentTotalStock: totalDist,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    setItems((prev) => [newItem, ...prev]);

    // Real-time synchronization to Google Sheets (Stok_Alat / Bahan_Kimia)
    syncItemToGas(newItem);
  };

  // Update Item (Optimistic UI Update + Background Fast Batch GAS Sync)
  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates, lastUpdated: new Date().toISOString().split('T')[0] };

        // Ensure current total is synced with distribution if distribution was changed
        if (updates.distribution) {
          updated.currentTotalStock =
            (updates.distribution.FISIKA || 0) +
            (updates.distribution.KIMIA || 0) +
            (updates.distribution.BIOLOGI || 0) +
            (updates.distribution.SMP_TERPADU || 0);
        }

        // Real-time optimistic synchronization to Google Sheets (Stok_Alat / Bahan_Kimia)
        syncUpdateItemInGas(updated);

        return updated;
      })
    );
  };

  // Delete Item (Optimistic UI Update + Background GAS Delete Sync)
  const deleteItem = (id: string) => {
    const targetItem = items.find((item) => item.id === id);
    const remaining = items.filter((item) => item.id !== id);
    setItems(remaining);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(remaining));
    } catch (err) {
      console.error('Gagal menyimpan pembaruan items ke localStorage:', err);
    }

    if (targetItem) {
      const isChem = targetItem.category === 'Bahan Kimia & Reagen';
      syncDeleteItemFromGas(targetItem.code || targetItem.id, isChem);
    }
  };

  // Batch Delete Items (Admin / Kepala Lab Only - Optimistic UI + Background GAS Delete Sync)
  const batchDeleteItems = (ids: string[]): { success: boolean; count: number; message: string } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Aksi hapus massal data inventaris hanya dapat dilakukan oleh Admin (Kepala Lab).';
      showToast({ type: 'error', title: 'Akses Ditolak (Khusus Admin)', message: errMsg, duration: 5000 });
      return { success: false, count: 0, message: errMsg };
    }
    if (!ids || ids.length === 0) {
      return { success: false, count: 0, message: 'Tidak ada barang yang dipilih.' };
    }

    const idSet = new Set(ids);
    const deletedItems = items.filter((item) => idSet.has(item.id));
    const remaining = items.filter((item) => !idSet.has(item.id));
    const deletedCount = deletedItems.length;

    setItems(remaining);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(remaining));
    } catch {}

    // Asynchronous background deletion from Google Sheets
    deletedItems.forEach((it) => {
      const isChem = it.category === 'Bahan Kimia & Reagen';
      syncDeleteItemFromGas(it.code || it.id, isChem);
    });

    const successMsg = `Berhasil menghapus ${deletedCount} barang dari inventaris secara massal.`;
    showToast({
      type: 'success',
      title: 'Hapus Massal Berhasil',
      message: successMsg,
      duration: 4500,
    });

    return { success: true, count: deletedCount, message: successMsg };
  };

  // Batch Assign Items to Lab (Admin / Kepala Lab Only)
  const batchAssignItemsToLab = (
    ids: string[],
    targetLab: LabId | 'ALL'
  ): { success: boolean; count: number; message: string } => {
    if (!isAdmin) {
      const errMsg = 'Akses Ditolak: Aksi penugasan lab massal hanya dapat dilakukan oleh Admin (Kepala Lab).';
      showToast({ type: 'error', title: 'Akses Ditolak (Khusus Admin)', message: errMsg, duration: 5000 });
      return { success: false, count: 0, message: errMsg };
    }
    if (!ids || ids.length === 0) {
      return { success: false, count: 0, message: 'Tidak ada barang yang dipilih.' };
    }

    const idSet = new Set(ids);
    const todayStr = new Date().toISOString().split('T')[0];
    let updatedCount = 0;

    const updated = items.map((item) => {
      if (!idSet.has(item.id)) return item;
      updatedCount++;

      const newDist: LabStockDistribution = { ...item.distribution };
      if (targetLab !== 'ALL') {
        // Relocate total stock to the chosen lab
        newDist.FISIKA = 0;
        newDist.KIMIA = 0;
        newDist.BIOLOGI = 0;
        newDist.SMP_TERPADU = 0;
        newDist[targetLab] = item.currentTotalStock;
      }

      return {
        ...item,
        primaryLab: targetLab,
        distribution: newDist,
        lastUpdated: todayStr,
      };
    });

    setItems(updated);
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(updated));
    } catch {}

    const labName = targetLab === 'ALL' ? 'Seluruh Lab (Gabungan)' : LAB_DEFINITIONS[targetLab]?.shortName || targetLab;
    const successMsg = `Berhasil menugaskan ${updatedCount} barang ke ${labName}.`;
    showToast({
      type: 'success',
      title: 'Penugasan Lab Berhasil',
      message: successMsg,
      duration: 4500,
    });

    return { success: true, count: updatedCount, message: successMsg };
  };

  // Update Min Stock Threshold
  const updateMinStockThreshold = (id: string, newThreshold: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, minStockAlert: Math.max(0, newThreshold) } : item))
    );
  };

  // Add Transaction (Masuk / Keluar)
  const addTransaction = (tx: {
    itemId: string;
    type: TransactionType;
    quantity: number;
    date: string;
    targetLab: LabId;
    fromLab?: LabId;
    purpose: string;
    picName: string;
    studentClassOrBatch?: string;
    conditionStatus: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
    notes?: string;
  }): { success: boolean; message: string } => {
    const item = items.find((i) => i.id === tx.itemId);
    if (!item) {
      const errMsg = 'Barang tidak ditemukan di inventaris.';
      showToast({
        type: 'error',
        title: 'Transaksi Gagal',
        message: errMsg,
      });
      return { success: false, message: errMsg };
    }

    if (tx.quantity <= 0) {
      const errMsg = 'Jumlah kuantitas harus lebih dari 0.';
      showToast({
        type: 'error',
        title: 'Kuantitas Tidak Valid',
        message: errMsg,
      });
      return { success: false, message: errMsg };
    }

    // Check availability if OUT
    if (tx.type === 'OUT') {
      const currentLabStock = item.distribution[tx.targetLab] || 0;
      if (currentLabStock < tx.quantity) {
        const errMsg = `Stok tidak mencukupi di ${LAB_DEFINITIONS[tx.targetLab]?.shortName || tx.targetLab}. Stok tersedia: ${currentLabStock} ${item.unit}.`;
        showToast({
          type: 'error',
          title: 'Stok Tidak Mencukupi',
          message: errMsg,
        });
        return {
          success: false,
          message: errMsg,
        };
      }
    }

    const newTransaction: StockTransaction = {
      id: `trx-${Date.now()}`,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      type: tx.type,
      quantity: tx.quantity,
      date: tx.date || new Date().toISOString().split('T')[0],
      targetLab: tx.targetLab,
      fromLab: tx.fromLab,
      purpose: tx.purpose,
      picName: tx.picName || (currentUser?.name ?? 'Petugas Lab'),
      studentClassOrBatch: tx.studentClassOrBatch,
      conditionStatus: tx.conditionStatus,
      notes: tx.notes,
      createdAt: new Date().toISOString(),
    };

    // Update synchronized stock
    let updatedItemForGas: InventoryItem | null = null;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== tx.itemId) return it;

        const newDist = { ...it.distribution };
        let newTotalIn = it.totalIn;
        let newTotalOut = it.totalOut;

        if (tx.type === 'IN') {
          newDist[tx.targetLab] = (newDist[tx.targetLab] || 0) + tx.quantity;
          newTotalIn += tx.quantity;
        } else if (tx.type === 'OUT') {
          newDist[tx.targetLab] = Math.max(0, (newDist[tx.targetLab] || 0) - tx.quantity);
          newTotalOut += tx.quantity;
        }

        const totalDist =
          newDist.FISIKA + newDist.KIMIA + newDist.BIOLOGI + newDist.SMP_TERPADU;

        const updated = {
          ...it,
          distribution: newDist,
          totalIn: newTotalIn,
          totalOut: newTotalOut,
          currentTotalStock: totalDist,
          lastUpdated: tx.date,
        };
        updatedItemForGas = updated;
        return updated;
      })
    );

    if (updatedItemForGas) {
      syncItemToGas(updatedItemForGas);
    }

    // Optimistic background sync: Simpan rekam transaksi pemakaian ke sheet Penggunaan_Bahan
    syncTransactionToGas(newTransaction, item.unit);

    setTransactions((prev) => [newTransaction, ...prev]);

    const labName = LAB_DEFINITIONS[tx.targetLab]?.shortName || tx.targetLab;
    const successMsg = `Berhasil mencatat transaksi ${tx.type === 'IN' ? 'Masuk' : 'Keluar'} (${tx.quantity} ${item.unit}) untuk ${item.name} pada ${labName}.`;
    showToast({
      type: 'success',
      title: tx.type === 'IN' ? 'Stok Masuk Berhasil Dicatat' : 'Pemakaian Praktikum Berhasil Dicatat',
      message: successMsg,
    });

    return {
      success: true,
      message: successMsg,
    };
  };

  // Transfer stock between labs
  const transferStock = (
    itemId: string,
    fromLab: LabId,
    toLab: LabId,
    quantity: number,
    picName: string,
    notes?: string
  ): { success: boolean; message: string } => {
    if (fromLab === toLab) {
      const errMsg = 'Laboratorium asal dan tujuan tidak boleh sama.';
      showToast({
        type: 'error',
        title: 'Transfer Ditolak',
        message: errMsg,
      });
      return { success: false, message: errMsg };
    }
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      const errMsg = 'Barang tidak ditemukan di inventaris.';
      showToast({
        type: 'error',
        title: 'Transfer Gagal',
        message: errMsg,
      });
      return { success: false, message: errMsg };
    }
    const sourceStock = item.distribution[fromLab] || 0;
    if (sourceStock < quantity) {
      const errMsg = `Stok tidak mencukupi di ${LAB_DEFINITIONS[fromLab]?.shortName || fromLab}. Tersedia: ${sourceStock} ${item.unit}.`;
      showToast({
        type: 'error',
        title: 'Stok Tidak Mencukupi',
        message: errMsg,
      });
      return {
        success: false,
        message: errMsg,
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const newTx: StockTransaction = {
      id: `trx-trf-${Date.now()}`,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      type: 'TRANSFER',
      quantity,
      date: today,
      fromLab,
      targetLab: toLab,
      purpose: `Transfer Antar Laboratorium (${LAB_DEFINITIONS[fromLab]?.shortName} ➔ ${LAB_DEFINITIONS[toLab]?.shortName})`,
      picName: picName || (currentUser?.name ?? 'Petugas Lab'),
      studentClassOrBatch: 'Internal Lab Transfer',
      conditionStatus: 'Baik',
      notes: notes || 'Sinkronisasi alokasi antar laboratorium',
      createdAt: new Date().toISOString(),
    };

    let transferredItemForGas: InventoryItem | null = null;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const newDist = { ...it.distribution };
        newDist[fromLab] = Math.max(0, (newDist[fromLab] || 0) - quantity);
        newDist[toLab] = (newDist[toLab] || 0) + quantity;

        const totalDist =
          newDist.FISIKA + newDist.KIMIA + newDist.BIOLOGI + newDist.SMP_TERPADU;

        const updated = {
          ...it,
          distribution: newDist,
          currentTotalStock: totalDist,
          lastUpdated: today,
        };
        transferredItemForGas = updated;
        return updated;
      })
    );

    if (transferredItemForGas) {
      syncItemToGas(transferredItemForGas);
    }

    // Optimistic background sync: Simpan rekam transfer mutasi antar lab ke Google Sheets
    syncTransactionToGas(newTx, item.unit);

    setTransactions((prev) => [newTx, ...prev]);

    const successMsg = `Berhasil transfer ${quantity} ${item.unit} "${item.name}" dari ${LAB_DEFINITIONS[fromLab]?.shortName} ke ${LAB_DEFINITIONS[toLab]?.shortName}.`;
    showToast({
      type: 'success',
      title: 'Transfer Antar Lab Berhasil',
      message: successMsg,
    });

    return {
      success: true,
      message: successMsg,
    };
  };

  // Low stock items memo
  const lowStockItems = useMemo(() => {
    return items.filter((item) => item.currentTotalStock <= item.minStockAlert);
  }, [items]);

  // Reset & Backup
  const resetToDefaultData = () => {
    setItems(INITIAL_ITEMS);
    setTransactions(INITIAL_TRANSACTIONS);
    setSettings(DEFAULT_PENGATURAN_SISTEM);
    setClasses(INITIAL_LAB_CLASSES);
    setStudents(INITIAL_LAB_STUDENTS);
    setLabActivities(INITIAL_LAB_ACTIVITIES);
    setLoans(INITIAL_TOOL_LOANS);
    setCalibrations(INITIAL_CALIBRATIONS);
    setSchoolLevelFilterState('ALL');
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_TRX);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_LAB_CLASSES);
    localStorage.removeItem(STORAGE_KEY_LAB_STUDENTS);
    localStorage.removeItem(STORAGE_KEY_LAB_ACTIVITIES);
    localStorage.removeItem(STORAGE_KEY_LOANS);
    localStorage.removeItem(STORAGE_KEY_CALIBRATIONS);
    localStorage.removeItem(STORAGE_KEY_SCHOOL_FILTER);
  };

  const exportDatabaseJson = () => {
    const data = {
      app: settings.nama_sistem,
      school: settings.nama_sekolah,
      year: settings.tahun_ajaran,
      exportedAt: new Date().toISOString(),
      pengaturan_sistem: settings,
      kop_berita_acara: kopConfig,
      accounts,
      password_logs: passwordChangeLogs,
      items,
      transactions,
      loans,
      calibrations,
      lab_classes: classes,
      lab_students: students,
      lab_activities: labActivities,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_simlab_arcss_${settings.tahun_ajaran}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDatabaseJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.items) && Array.isArray(parsed.transactions)) {
        setItems(parsed.items);
        setTransactions(parsed.transactions);
        if (parsed.pengaturan_sistem) {
          setSettings({ ...DEFAULT_PENGATURAN_SISTEM, ...parsed.pengaturan_sistem });
        }
        if (parsed.kop_berita_acara) {
          setKopConfig({ ...DEFAULT_KOP_CONFIG, ...parsed.kop_berita_acara });
        }
        if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
          setAccounts(parsed.accounts);
        }
        if (Array.isArray(parsed.password_logs)) {
          setPasswordChangeLogs(parsed.password_logs);
        }
        if (Array.isArray(parsed.lab_classes)) {
          setClasses(parsed.lab_classes);
        }
        if (Array.isArray(parsed.lab_students)) {
          setStudents(parsed.lab_students);
        }
        if (Array.isArray(parsed.lab_activities)) {
          setLabActivities(parsed.lab_activities);
        }
        if (Array.isArray(parsed.loans)) {
          setLoans(parsed.loans);
        }
        if (Array.isArray(parsed.calibrations)) {
          setCalibrations(parsed.calibrations);
        }
        return true;
      }
    } catch {
      // invalid
    }
    return false;
  };

  const importExcelData = (
    summary: ExcelImportSummary,
    options?: { cleanReset?: boolean }
  ): ExcelImportExecutionResult => {
    const isCleanReset = options?.cleanReset ?? true;

    // 1. Clean Reset: Jika aktif, kosongkan data imitasi AI lama sepenuhnya
    const updatedItems: InventoryItem[] = isCleanReset ? [] : [...items];
    const newTransactions: StockTransaction[] = isCleanReset ? [] : [...transactions];
    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Kunci ke 4 Akun Resmi Saja - MATIKAN TOTAL PEMBUATAN AKUN BARU
    // Jangan membuat atau mendaftarkan akun baru dari file Excel.
    // Seluruh penanggung jawab wajib mengarah ke 4 akun resmi yang sudah ada.
    const execResult: ExcelImportExecutionResult = {
      itemsCreated: 0,
      itemsUpdated: 0,
      transactionsCreated: 0,
      usersCreated: 0,
      newUsersList: [],
      isCleanReset,
      details: [],
    };

    const nameMap = new Map<string, InventoryItem>();
    updatedItems.forEach((it) => {
      nameMap.set(normalizeItemName(it.name), it);
    });

    summary.sheets.forEach((sheet) => {
      // 1. Process Stok Awal (Bagian Atas)
      sheet.stokAwalRows.forEach((row) => {
        const normName = normalizeItemName(row.namaBarang);
        const existing = nameMap.get(normName);

        if (existing) {
          const newDist = { ...existing.distribution };
          newDist[row.labId] = (newDist[row.labId] || 0) + row.stokExtracted;
          existing.distribution = newDist;
          existing.currentTotalStock =
            (newDist.FISIKA || 0) +
            (newDist.KIMIA || 0) +
            (newDist.BIOLOGI || 0) +
            (newDist.SMP_TERPADU || 0);
          existing.initialStock2026 += row.stokExtracted;
          if (!existing.storageRack || existing.storageRack.includes('Rak Default')) {
            existing.storageRack = row.penyimpanan;
          }
          existing.lastUpdated = todayStr;

          execResult.itemsUpdated++;
          execResult.details.push({
            sheet: sheet.sheetName,
            action: 'UPDATE_STOCK_IN',
            itemName: row.namaBarang,
            qty: row.stokExtracted,
            lab: row.labId,
          });
        } else {
          const category = resolveCategory(row.jenisItemMapped, row.labId);
          const labPrefix = row.labId === 'SMP_TERPADU' ? 'SMP' : row.labId.substring(0, 3);
          const itemCode = `ARC-${labPrefix}-${String(updatedItems.length + 1).padStart(3, '0')}`;

          const newItem: InventoryItem = {
            id: `item-arc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            code: itemCode,
            name: row.namaBarang,
            category,
            primaryLab: row.labId,
            unit: row.unit || 'unit',
            initialStock2026: row.stokExtracted,
            totalIn: 0,
            totalOut: 0,
            currentTotalStock: row.stokExtracted,
            minStockAlert: Math.max(1, Math.floor(row.stokExtracted * 0.2)),
            conditionGood: row.stokExtracted,
            conditionLightDamage: 0,
            conditionHeavyDamage: 0,
            distribution: {
              FISIKA: row.labId === 'FISIKA' ? row.stokExtracted : 0,
              KIMIA: row.labId === 'KIMIA' ? row.stokExtracted : 0,
              BIOLOGI: row.labId === 'BIOLOGI' ? row.stokExtracted : 0,
              SMP_TERPADU: row.labId === 'SMP_TERPADU' ? row.stokExtracted : 0,
            },
            storageRack: row.penyimpanan || `Rak Lab ${row.labId}`,
            brandOrSpec: `Spesifikasi TA 2025/2026 (${
              row.jenisItemMapped === 'alat' ? 'Alat Jangka Panjang' : 'Bahan Reagen Habis Pakai'
            })`,
            notes: `Import Excel Data Asli [Sheet ${row.sheetName}, Baris ${row.rowNumber}]`,
            lastUpdated: todayStr,
          };

          updatedItems.push(newItem);
          nameMap.set(normName, newItem);
          execResult.itemsCreated++;
          execResult.details.push({
            sheet: sheet.sheetName,
            action: 'CREATE_INITIAL',
            itemName: row.namaBarang,
            qty: row.stokExtracted,
            lab: row.labId,
          });
        }
      });

      // 2. Process Stok Masuk Baru (Bagian Bawah)
      sheet.stokMasukRows.forEach((row) => {
        const normName = normalizeItemName(row.namaBarang);
        const existing = nameMap.get(normName);
        // Aturan Ketat 2 & 3: Kunci ke 4 Akun Resmi dengan pencarian kata kunci, fallback ke Kepala Lab
        const combinedPicText = `${row.picName || ''} ${row.keterangan || ''}`;
        const official = resolveOfficialPicAccount(combinedPicText);
        const resolvedUserId = official.id;
        const resolvedPicName = official.name;

        if (existing) {
          const newDist = { ...existing.distribution };
          newDist[row.labId] = (newDist[row.labId] || 0) + row.jumlahExtracted;
          existing.distribution = newDist;
          existing.totalIn = (existing.totalIn || 0) + row.jumlahExtracted;
          existing.currentTotalStock =
            (newDist.FISIKA || 0) +
            (newDist.KIMIA || 0) +
            (newDist.BIOLOGI || 0) +
            (newDist.SMP_TERPADU || 0);
          existing.lastUpdated = todayStr;

          const tx: StockTransaction = {
            id: `trx-in-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            itemId: existing.id,
            itemCode: existing.code,
            itemName: existing.name,
            type: 'IN',
            quantity: row.jumlahExtracted,
            date: todayStr,
            targetLab: row.labId,
            purpose: 'Penerimaan Stok Masuk Baru (TA 2026/2027) via Import Excel Asli',
            userId: resolvedUserId,
            picName: resolvedPicName,
            conditionStatus: 'Baik',
            notes: row.keterangan || `Stok Masuk Baru Excel [Sheet ${row.sheetName}]`,
            createdAt: new Date().toISOString(),
          };

          newTransactions.unshift(tx);
          execResult.transactionsCreated++;
          execResult.itemsUpdated++;
          execResult.details.push({
            sheet: sheet.sheetName,
            action: 'UPDATE_STOCK_IN',
            itemName: row.namaBarang,
            qty: row.jumlahExtracted,
            lab: row.labId,
            picName: resolvedPicName,
          });
        } else {
          const labPrefix = row.labId === 'SMP_TERPADU' ? 'SMP' : row.labId.substring(0, 3);
          const itemCode = `ARC-${labPrefix}-${String(updatedItems.length + 1).padStart(3, '0')}`;
          const jenisItemMapped = mapJenisItem(row.namaBarang + ' ' + (row.keterangan || ''));
          const category = resolveCategory(jenisItemMapped, row.labId);
          const isChemS2 = category === 'Bahan Kimia & Reagen';
          const defaultUnitS2 = isChemS2 ? 'Botol' : 'Unit';

          const newItem: InventoryItem = {
            id: `item-arc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            code: itemCode,
            name: row.namaBarang,
            category,
            primaryLab: row.labId,
            unit: 'unit',
            initialStock2026: 0,
            totalIn: row.jumlahExtracted,
            totalOut: 0,
            currentTotalStock: row.jumlahExtracted,
            minStockAlert: Math.max(1, Math.floor(row.jumlahExtracted * 0.2)),
            conditionGood: row.jumlahExtracted,
            conditionLightDamage: 0,
            conditionHeavyDamage: 0,
            distribution: {
              FISIKA: row.labId === 'FISIKA' ? row.jumlahExtracted : 0,
              KIMIA: row.labId === 'KIMIA' ? row.jumlahExtracted : 0,
              BIOLOGI: row.labId === 'BIOLOGI' ? row.jumlahExtracted : 0,
              SMP_TERPADU: row.labId === 'SMP_TERPADU' ? row.jumlahExtracted : 0,
            },
            storageRack: row.penyimpanan || `Rak Lab ${row.labId}`,
            brandOrSpec: `Barang Pengadaan Baru TA 2026/2027 (${jenisItemMapped === 'reagen' ? 'Bahan Reagen Habis Pakai' : 'Alat Jangka Panjang'})`,
            notes: `Import Excel Barang Baru [Sheet ${row.sheetName}, Baris ${row.rowNumber}]`,
            lastUpdated: todayStr,
          };

          updatedItems.push(newItem);
          nameMap.set(normName, newItem);
          execResult.itemsCreated++;

          const tx: StockTransaction = {
            id: `trx-in-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            itemId: newItem.id,
            itemCode: newItem.code,
            itemName: newItem.name,
            type: 'IN',
            quantity: row.jumlahExtracted,
            date: todayStr,
            targetLab: row.labId,
            purpose: 'Penerimaan Stok Masuk Baru (TA 2026/2027) via Import Excel Asli (Barang Baru)',
            userId: resolvedUserId,
            picName: resolvedPicName,
            conditionStatus: 'Baik',
            notes: row.keterangan || `Stok Masuk Baru Excel [Sheet ${row.sheetName}]`,
            createdAt: new Date().toISOString(),
          };

          newTransactions.unshift(tx);
          execResult.transactionsCreated++;
          execResult.details.push({
            sheet: sheet.sheetName,
            action: 'CREATE_STOCK_IN',
            itemName: row.namaBarang,
            qty: row.jumlahExtracted,
            lab: row.labId,
            picName: resolvedPicName,
          });
        }
      });
    });

    setItems(updatedItems);
    setTransactions(newTransactions);
    return execResult;
  };

  return (
    <InventoryContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        currentUser,
        accounts,
        items,
        transactions,
        settings,
        updateSettings,
        resetSettingsToDefault,
        kopConfig,
        updateKopConfig,
        resetKopConfigToDefault,
        passwordChangeLogs,
        requestPasswordChangeVerification,
        verifyAndChangePassword,
        clearPasswordChangeLogs,
        login,
        logout,
        switchUserRole,
        canManageUsers,
        isHeadOfLab,
        addUserAccount,
        updateUserAccount,
        deleteUserAccount,
        resetUserPassword,
        addItem,
        updateItem,
        deleteItem,
        batchDeleteItems,
        batchAssignItemsToLab,
        updateMinStockThreshold,
        addTransaction,
        transferStock,
        lowStockItems,
        resetToDefaultData,
        clearAllInventoryAndLogs,
        exportDatabaseJson,
        importDatabaseJson,
        importExcelData,
        classes,
        students,
        labActivities,
        canEditLab,
        addLabActivity,
        updateLabActivity,
        deleteLabActivity,
        labActivitiesSummary,
        getLabActivitiesSummary,
        resetLabActivitiesByCluster,
        wipeOutAllLabActivities,
        addLabClass,
        addLabStudent,
        importStudentsFromExcel,
        updateLabStudent,
        updateStudentStatus,
        deleteLabStudent,
        deleteLabClass,
        importMultiClassStudents,
        isAdmin,
        isGuru,
        schoolLevelFilter,
        setSchoolLevelFilter,
        loans,
        addToolLoan,
        returnToolLoan,
        deleteToolLoan,
        slides,
        updateSlides,
        calibrations,
        dueCalibrations,
        overdueCalibrationsCount,
        dueSoonCalibrationsCount,
        addCalibrationRecord,
        updateCalibrationRecord,
        deleteCalibrationRecord,
        performCalibrationTest,
        updateCurrentUserPhoto,
        gasSyncStatus,
        syncWithGoogleSheets,
        loginAsync,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
