import * as XLSX from 'xlsx';
import { LabId, ItemCategory, InventoryItem, UserAccount, LAB_DEFINITIONS } from '../types/inventory';
import {
  ParsedStokAwalRow,
  ParsedStokMasukRow,
  SheetParseResult,
  ExcelImportSummary,
  DetectedLaboranUser,
} from '../types/excelImport';

/**
 * Normalizes text for matching item names
 */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a unit string represents a chemical/substance netto quantity (volume or mass)
 * rather than physical container/packaging count.
 */
export function isNettoUnit(unitStr?: string): boolean {
  if (!unitStr) return false;
  const clean = unitStr.toLowerCase().trim();
  return /^(gram|gr|g|mg|kg|kilo|ml|milli|liter|l|ltr|cc|ppm|%|mol|molar)$/i.test(clean);
}

/**
 * Calculates the physical packaging unit count (Item Count / Kemasan / Botol / Pcs)
 * for a single inventory item, preventing raw chemical netto (e.g. 1000 gram, 500 ml)
 * from inflating the physical unit metrics.
 */
export function calculatePhysicalPackagingCount(item: InventoryItem, labId?: LabId): number {
  const isNetto = isNettoUnit(item.unit);
  const isChemical = item.category === 'Bahan Kimia & Reagen';

  if (labId) {
    const rawLabStock = item.distribution?.[labId] || 0;
    if (rawLabStock <= 0) return 0;

    // If unit is chemical netto (e.g. gram, ml) or it's a chemical with large raw number:
    // 1 row/lot represents 1 physical packaging container (Botol / Kemasan)
    if (isNetto || (isChemical && rawLabStock >= 30)) {
      return 1;
    }
    return rawLabStock;
  }

  const rawTotal = item.currentTotalStock;
  if (rawTotal <= 0) return 0;

  if (isNetto || (isChemical && rawTotal >= 30)) {
    // If distributed to specific labs, count labs with >0 stock, minimum 1
    const activeLabsCount = Object.values(item.distribution || {}).filter((qty) => (qty || 0) > 0).length;
    return Math.max(1, activeLabsCount);
  }

  return rawTotal;
}

/**
 * Extracts numeric value and unit from strings preserving raw units:
 * e.g. "100 gram", "500 ml", "1 liter", "2 roll", "50 botol", "15 unit", "10 pcs", "1 set"
 */
export function extractNumberAndUnit(input: string | number | null | undefined): {
  number: number;
  unit: string;
} {
  if (input === null || input === undefined || input === '') {
    return { number: 0, unit: 'unit' };
  }

  if (typeof input === 'number') {
    return { number: Math.max(0, Math.round(input)), unit: 'unit' };
  }

  const str = String(input).trim();
  const lower = str.toLowerCase();

  // 1. Check for explicit packaging keyword first if any (e.g. "4 botol (500ml)", "2 roll", "50 botol", "15 unit")
  const packagingRegex = /(\d+(?:[.,]\d+)?)\s*(botol|btl|pack|pak|kotak|box|set|st|roll|rol|tube|tabung|jerigen|drigen|vial|lembar|kit|buah|bh|pcs|unit)/i;
  const packMatch = lower.match(packagingRegex);

  if (packMatch) {
    const qty = Math.max(0, Math.round(parseFloat(packMatch[1].replace(',', '.'))));
    const rawPackUnit = packMatch[2].toLowerCase();
    let standardizedUnit = 'unit';

    if (['botol', 'btl', 'vial', 'tube', 'tabung'].includes(rawPackUnit)) standardizedUnit = 'botol';
    else if (['pack', 'pak'].includes(rawPackUnit)) standardizedUnit = 'pack';
    else if (['kotak', 'box'].includes(rawPackUnit)) standardizedUnit = 'kotak';
    else if (['set', 'st'].includes(rawPackUnit)) standardizedUnit = 'set';
    else if (['roll', 'rol'].includes(rawPackUnit)) standardizedUnit = 'roll';
    else if (['jerigen', 'drigen'].includes(rawPackUnit)) standardizedUnit = 'jerigen';
    else if (['kit'].includes(rawPackUnit)) standardizedUnit = 'kit';
    else if (['buah', 'bh', 'pcs', 'unit', 'lembar'].includes(rawPackUnit)) standardizedUnit = 'unit';

    return { number: qty, unit: standardizedUnit };
  }

  // 2. Match first sequence of numbers e.g. "100 gram", "500 ml", "1 liter", "2,5 liter"
  const numMatch = str.match(/(\d+(?:[.,]\d+)?)/);
  if (!numMatch) {
    return { number: 0, unit: 'unit' };
  }

  const numValue = Math.round(parseFloat(numMatch[1].replace(',', '.'))) || 0;
  const remainder = str.replace(numMatch[0], '').replace(/[()]/g, '').trim().toLowerCase();
  const unitMatch = remainder.match(/[a-zA-Z]+/);
  let unit = unitMatch ? unitMatch[0].toLowerCase() : 'unit';

  // Standardize common unit names while keeping gram, ml, liter, roll, etc. intact!
  if (['bh', 'buah', 'pcs', 'unit'].includes(unit)) unit = 'unit';
  else if (['btl', 'botol'].includes(unit)) unit = 'botol';
  else if (['pk', 'pack', 'pak'].includes(unit)) unit = 'pack';
  else if (['kotak', 'box'].includes(unit)) unit = 'kotak';
  else if (['st', 'set'].includes(unit)) unit = 'set';
  else if (['roll', 'rol'].includes(unit)) unit = 'roll';
  else if (['l', 'liter', 'ltr'].includes(unit)) unit = 'liter';
  else if (['ml', 'milli'].includes(unit)) unit = 'ml';
  else if (['gr', 'gram', 'g'].includes(unit)) unit = 'gram';
  else if (['kg', 'kilo'].includes(unit)) unit = 'kg';
  else if (['lembar'].includes(unit)) unit = 'lembar';

  return { number: numValue, unit };
}

/**
 * Maps raw "Jenis Item" text:
 * - 'Jangka panjang' -> 'alat'
 * - 'Habis pakai' -> 'reagen'
 */
export function mapJenisItem(rawJenis: string | null | undefined): 'alat' | 'reagen' {
  if (!rawJenis) return 'alat';
  const lower = String(rawJenis).toLowerCase().trim();

  if (lower.includes('habis') || lower.includes('pakai') || lower.includes('reagen') || lower.includes('kimia')) {
    return 'reagen';
  }
  return 'alat';
}

/**
 * Maps 'alat' or 'reagen' to full ItemCategory in system
 */
export function resolveCategory(jenis: 'alat' | 'reagen', labId: LabId): ItemCategory {
  if (jenis === 'reagen') {
    return 'Bahan Kimia & Reagen';
  }

  switch (labId) {
    case 'FISIKA':
      return 'Alat Ukur & Neraca';
    case 'KIMIA':
      return 'Alat Gelas & Keramik';
    case 'BIOLOGI':
      return 'Model & Preparat Biologi';
    case 'SMP_TERPADU':
    default:
      return 'Kit Praktikum Terpadu';
  }
}

/**
 * Maps sheet name to system LabId:
 * - FISIKA / FISIKA (SMA) -> FISIKA
 * - KIMIA / KIMIA (SMA) -> KIMIA
 * - BIOLOGI / BIOLOGI (SMA) -> BIOLOGI
 * - IPA TERPADU (SMP) / IPA SMP / SMP -> SMP_TERPADU
 */
export function mapSheetToLabId(sheetName: string): LabId {
  const upper = sheetName.toUpperCase().trim();
  // Check SMP / Terpadu / Science first
  if (upper.includes('SMP') || upper.includes('TERPADU') || upper.includes('SCIENCE')) {
    return 'SMP_TERPADU';
  }
  if (upper.includes('FISIK') || upper.includes('PHYSIC')) return 'FISIKA';
  if (upper.includes('KIMI') || upper.includes('CHEM')) return 'KIMIA';
  if (upper.includes('BIOLOG') || upper.includes('BIO')) return 'BIOLOGI';
  if (upper.includes('IPA')) return 'SMP_TERPADU';
  return 'FISIKA';
}

export interface OfficialStaffProfile {
  id: string;
  name: string;
  email: string;
  roleTitle: string;
  assignedLab: 'ALL' | 'FISIKA' | 'BIOLOGI' | 'SMP_TERPADU' | 'KIMIA';
  badge: string;
  keywords: string[];
}

export const OFFICIAL_STAFF_ACCOUNTS: OfficialStaffProfile[] = [
  {
    id: 'user-kepala-lab',
    name: 'Ilham Nurkholis Majid, S. Pd., Gr.',
    email: 'Ilham.nurkholis114@guru.sma.belajar.id',
    roleTitle: 'Kepala Laboratorium IPA Terpadu & PJ Lab Kimia',
    assignedLab: 'KIMIA',
    badge: 'Kepala Lab & PJ Lab Kimia (Utama / Fallback)',
    keywords: ['ilham'],
  },
  {
    id: 'user-fisika',
    name: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
    email: 'oktaviawan901@guru.smp.belajar.id',
    roleTitle: 'Penanggung Jawab Lab Fisika (SMA)',
    assignedLab: 'FISIKA',
    badge: 'PJ Lab Fisika (SMA)',
    keywords: ['oktaviawan'],
  },
  {
    id: 'user-biologi',
    name: 'Siti Aminatuh Juhriah, M. Si., Gr.',
    email: 'sitijuhriahssi21@guru.sma.belajar.id',
    roleTitle: 'Penanggung Jawab Lab Biologi (SMA)',
    assignedLab: 'BIOLOGI',
    badge: 'PJ Lab Biologi (SMA)',
    keywords: ['siti', 'aminatuh'],
  },
  {
    id: 'user-ipa-smp',
    name: 'Farkhatul Amaliya, S. Pd',
    email: 'farkhatullamaliyaa@gmail.com',
    roleTitle: 'Laboran dan Guru IPA Terpadu (SMP)',
    assignedLab: 'SMP_TERPADU',
    badge: 'PJ Lab IPA Terpadu (SMP)',
    keywords: ['farkhatul'],
  },
];

/**
 * Strict resolver that locks PIC mapping exclusively to the 4 official staff accounts:
 * - Mengandung 'Oktaviawan' -> Oktaviawan Arif Sudarsono, M. Pd., Gr. (oktaviawan901@guru.smp.belajar.id)
 * - Mengandung 'Ilham' -> Ilham Nurkholis Majid, S. Pd., Gr. (Ilham.nurkholis114@guru.sma.belajar.id)
 * - Mengandung 'Siti' atau 'Aminatuh' -> Siti Aminatuh Juhriah, M. Si., Gr. (sitijuhriahssi21@guru.sma.belajar.id)
 * - Mengandung 'Farkhatul' -> Farkhatul Amaliya, S. Pd (farkhatullamaliyaa@gmail.com)
 * - Fallback (kosong / nama lain) -> Langsung ke Kepala Lab (Ilham Nurkholis Majid, S. Pd., Gr.)
 * 
 * TIDAK PERNAH MEMBUAT AKUN BARU.
 */
export function resolveOfficialPicAccount(rawText: string | null | undefined): OfficialStaffProfile {
  const str = String(rawText || '').toLowerCase();

  // 1. Cek Oktaviawan
  if (str.includes('oktaviawan')) {
    return OFFICIAL_STAFF_ACCOUNTS[1];
  }

  // 2. Cek Ilham
  if (str.includes('ilham')) {
    return OFFICIAL_STAFF_ACCOUNTS[0];
  }

  // 3. Cek Siti atau Aminatuh
  if (str.includes('siti') || str.includes('aminatuh')) {
    return OFFICIAL_STAFF_ACCOUNTS[2];
  }

  // 4. Cek Farkhatul
  if (str.includes('farkhatul')) {
    return OFFICIAL_STAFF_ACCOUNTS[3];
  }

  // 5. Fallback ke Kepala Lab Utama (Ilham Nurkholis Majid)
  return OFFICIAL_STAFF_ACCOUNTS[0];
}

/**
 * Extracts PIC / Laboran name from explicit column or from notes/row text
 * strictly locked to the 4 official accounts with fallback to Kepala Lab.
 */
export function extractPicName(rawText: string, specificPicColValue?: string): string {
  const combined = `${specificPicColValue || ''} ${rawText || ''}`;
  return resolveOfficialPicAccount(combined).name;
}

/**
 * Always returns the official staff profile mapped to avoid creating new users
 */
export function generateLaboranAccount(
  rawName: string,
  _assignedLab: LabId | 'ALL' = 'ALL',
  _existingUsers: UserAccount[] = []
): DetectedLaboranUser {
  const official = resolveOfficialPicAccount(rawName);

  return {
    name: official.name,
    email: official.email,
    role: 'laboran',
    passwordDefault: 'labarcss2026',
    assignedLab: official.assignedLab,
    isNew: false, // Tidak pernah baru
  };
}

interface ColumnMapping {
  namaIndex: number;
  penyimpananIndex: number;
  keteranganIndex: number;
  jenisIndex: number;
  tanggalIndex?: number;
  picIndex?: number;
}

function detectColumns(headerRow: any[], isSection2 = false): ColumnMapping {
  let namaIndex = -1;
  let penyimpananIndex = -1;
  let keteranganIndex = -1;
  let jenisIndex = -1;
  let tanggalIndex = -1;
  let picIndex = -1;

  headerRow.forEach((col, idx) => {
    if (col === null || col === undefined) return;
    const text = String(col).toLowerCase().trim();

    // Nama
    if (/(nama|alat|bahan|barang|item)/i.test(text) && !/(jenis|tipe)/i.test(text)) {
      if (namaIndex === -1) namaIndex = idx;
    }

    // Penyimpanan
    if (/(penyimpanan|lokasi|rak|ruang|posisi|tempat)/i.test(text)) {
      if (penyimpananIndex === -1) penyimpananIndex = idx;
    }

    // Keterangan / Stok
    if (/(keterangan|ket|stok|jumlah|qty|vol|volume|kuantitas)/i.test(text)) {
      if (keteranganIndex === -1) keteranganIndex = idx;
    }

    // Jenis Item
    if (/(jenis|tipe|kategori|sifat)/i.test(text)) {
      if (jenisIndex === -1) jenisIndex = idx;
    }

    // Tanggal
    if (/(tanggal|tgl|waktu|date|ta|tahun)/i.test(text)) {
      if (tanggalIndex === -1) tanggalIndex = idx;
    }

    // PIC / Penanggung Jawab
    if (/(pic|penanggung|pj|laboran|petugas|penerima|user|pengadaan\s*oleh)/i.test(text)) {
      if (picIndex === -1) picIndex = idx;
    }
  });

  // Fallbacks if not recognized by keyword
  if (namaIndex === -1) {
    namaIndex = 1; // commonly column B (A is usually No)
  }
  if (penyimpananIndex === -1) {
    penyimpananIndex = isSection2 ? 3 : 3;
  }
  if (keteranganIndex === -1) {
    keteranganIndex = isSection2 ? 2 : 4;
  }
  if (jenisIndex === -1) {
    jenisIndex = 2;
  }

  return { namaIndex, penyimpananIndex, keteranganIndex, jenisIndex, tanggalIndex, picIndex };
}

/**
 * Checks if a row indicates the boundary to Section 2: "Stok Masuk Baru (TA 2026/2027)"
 */
function isSection2Header(row: any[]): boolean {
  if (!row || !Array.isArray(row)) return false;
  const joined = row.join(' ').toLowerCase();

  return (
    (joined.includes('stok masuk') ||
      joined.includes('masuk baru') ||
      joined.includes('pengadaan baru') ||
      (joined.includes('masuk') && joined.includes('2026')) ||
      (joined.includes('masuk') && joined.includes('2027'))) &&
    !joined.includes('stok awal')
  );
}

/**
 * Parses an entire Excel workbook according to the specified 4-step logic
 */
export function parseExcelInventoryWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  existingItems: InventoryItem[],
  existingUsers: UserAccount[] = []
): ExcelImportSummary {
  const summary: ExcelImportSummary = {
    fileName,
    fileSizeBytes: 0,
    sheets: [],
    totalStokAwalItems: 0,
    totalStokMasukExisting: 0,
    totalStokMasukNew: 0,
    totalTransactionsCreated: 0,
    detectedPicUsers: [],
    errors: [],
  };

  const detectedPicMap = new Map<string, DetectedLaboranUser>();

  // Build a lookup map of existing items by normalized name
  const existingItemsMap = new Map<string, InventoryItem>();
  existingItems.forEach((item) => {
    existingItemsMap.set(normalizeItemName(item.name), item);
  });

  // Also keep track of items newly created during Stok Awal in this import
  const currentStokAwalMap = new Map<string, { name: string; labId: LabId; index: number }>();

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const labId = mapSheetToLabId(sheetName);
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawRows.length === 0) {
      return;
    }

    const sheetResult: SheetParseResult = {
      sheetName,
      labId,
      stokAwalRows: [],
      stokMasukRows: [],
      rawRowCount: rawRows.length,
      warnings: [],
    };

    let isSection2 = false;
    let section1Cols: ColumnMapping | null = null;
    let section2Cols: ColumnMapping | null = null;

    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rowStr = row.map((c) => String(c || '').trim()).join(' ');
      if (!rowStr) continue;

      // Check if this row is the Section 2 title
      if (isSection2Header(row)) {
        isSection2 = true;
        section2Cols = null; // will detect headers for section 2 on subsequent rows
        continue;
      }

      // If we haven't found Section 2 yet, check if this is a header row for Section 1
      if (!isSection2) {
        // Check if header row
        const hasHeaderKeywords =
          /(nama|alat|bahan)/i.test(rowStr) && /(penyimpanan|keterangan|stok|jenis)/i.test(rowStr);
        if (hasHeaderKeywords && !section1Cols) {
          section1Cols = detectColumns(row, false);
          continue;
        }

        if (!section1Cols) {
          // Skip title banner rows before the header
          if (/(stok awal|ta 2025|rekapitulasi|daftar inventaris)/i.test(rowStr)) {
            continue;
          }
          // Default heuristic columns if no clear header line
          section1Cols = detectColumns(['No', 'Nama Alat dan Bahan', 'Jenis Item', 'Penyimpanan', 'Keterangan'], false);
        }

        // Process Section 1 data row
        const rawName = String(row[section1Cols.namaIndex] || '').trim();
        if (!rawName || /^(no|nomor|nama|total|jumlah)$/i.test(rawName)) {
          continue;
        }

        const rawJenis = String(row[section1Cols.jenisIndex] || '').trim();
        const rawPenyimpanan = String(row[section1Cols.penyimpananIndex] || '').trim();
        const rawKeterangan = String(row[section1Cols.keteranganIndex] || '').trim();

        const { number: stokExtracted, unit } = extractNumberAndUnit(rawKeterangan || rawName);
        const jenisItemMapped = mapJenisItem(rawJenis);

        const stokAwalRow: ParsedStokAwalRow = {
          rowNumber: r + 1,
          sheetName,
          labId,
          namaBarang: rawName,
          jenisItemRaw: rawJenis,
          jenisItemMapped,
          penyimpanan: rawPenyimpanan || `Rak Lab ${labId}`,
          keteranganRaw: rawKeterangan,
          stokExtracted: stokExtracted > 0 ? stokExtracted : 1,
          unit: unit || 'unit',
        };

        sheetResult.stokAwalRows.push(stokAwalRow);
        currentStokAwalMap.set(normalizeItemName(rawName), {
          name: rawName,
          labId,
          index: sheetResult.stokAwalRows.length - 1,
        });
      } else {
        // Section 2: Stok Masuk Baru (TA 2026/2027)
        const hasHeaderKeywords =
          /(nama|alat|bahan)/i.test(rowStr) && /(jumlah|stok|masuk|qty|keterangan)/i.test(rowStr);
        if (hasHeaderKeywords && !section2Cols) {
          section2Cols = detectColumns(row, true);
          continue;
        }

        if (!section2Cols) {
          if (/(stok masuk|ta 2026|pengadaan baru)/i.test(rowStr)) {
            continue;
          }
          section2Cols = detectColumns(['No', 'Nama Alat dan Bahan', 'Jumlah Masuk', 'Penyimpanan', 'Catatan / PIC'], true);
        }

        // Process Section 2 data row
        const rawName = String(row[section2Cols.namaIndex] || '').trim();
        if (!rawName || /^(no|nomor|nama|total|jumlah)$/i.test(rawName)) {
          continue;
        }

        const rawJumlah = String(row[section2Cols.keteranganIndex] || '').trim();
        const rawPenyimpanan = String(row[section2Cols.penyimpananIndex] || '').trim();
        const { number: jumlahExtracted } = extractNumberAndUnit(rawJumlah);

        // Extract PIC Name (e.g. 'Ust. Fajar Ramad', 'Usth. Dewi Kartik')
        const specificPicColVal =
          section2Cols.picIndex !== undefined && section2Cols.picIndex !== -1
            ? String(row[section2Cols.picIndex] || '').trim()
            : undefined;

        // Kunci PIC ke 4 Akun Resmi SIMLAB (fallback ke Kepala Lab)
        const picName = extractPicName(rowStr, specificPicColVal);

        // Rule 4: Check if already in database or in Section 1
        const norm = normalizeItemName(rawName);
        const existingInDb = existingItemsMap.get(norm);
        const existingInStokAwal = currentStokAwalMap.has(norm);

        const isExisting = Boolean(existingInDb || existingInStokAwal);
        const matchedItemId = existingInDb?.id;

        const stokMasukRow: ParsedStokMasukRow = {
          rowNumber: r + 1,
          sheetName,
          labId,
          namaBarang: rawName,
          jumlahRaw: rawJumlah,
          jumlahExtracted: jumlahExtracted > 0 ? jumlahExtracted : 1,
          penyimpanan: rawPenyimpanan,
          keterangan: `Stok Masuk Baru (TA 2026/2027) - PIC: ${picName} [${sheetName}]`,
          picName,
          isExisting,
          matchedItemId,
        };

        sheetResult.stokMasukRows.push(stokMasukRow);
      }
    }

    summary.sheets.push(sheetResult);
    summary.totalStokAwalItems += sheetResult.stokAwalRows.length;
    sheetResult.stokMasukRows.forEach((row) => {
      if (row.isExisting) {
        summary.totalStokMasukExisting++;
      } else {
        summary.totalStokMasukNew++;
      }
      summary.totalTransactionsCreated++;
    });
  });

  // Kunci ke 4 Akun Resmi Saja secara permanen (tidak ada akun baru yang dibuat)
  summary.detectedPicUsers = OFFICIAL_STAFF_ACCOUNTS.map((acc) => ({
    name: acc.name,
    email: acc.email,
    role: 'laboran' as const,
    passwordDefault: 'labarcss2026',
    assignedLab: acc.assignedLab,
    isNew: false,
  }));
  return summary;
}

/**
 * Generates an official sample Excel file (.xlsx) formatted with multi-sheet
 * and vertical split (Stok Awal 2025/2026 on top, Stok Masuk Baru 2026/2027 on bottom)
 * including realistic PIC entries like 'Ust. Fajar Ramad' and 'Usth. Dewi Kartik'
 */
export function generateSampleInventoryExcel(): Uint8Array {
  const wb = XLSX.utils.book_new();

  const createSheetData = (labName: string) => [
    [`REKAPITULASI INVENTARIS ${labName.toUpperCase()}`],
    [`SMP DAN SMA IT AR-RAHMAH CENDEKIA`],
    [],
    [`--- TABEL 1: STOK AWAL (TA 2025/2026) ---`],
    ['No', 'Nama Alat dan Bahan', 'Jenis Item', 'Penyimpanan', 'Keterangan'],
    [1, 'Mikroskop Binokuler Digital ARC', 'Jangka panjang', 'Lemari Optik A-1', '5 unit'],
    [2, 'Gelas Ukur Borosilikat 100 mL', 'Jangka panjang', 'Rak Kaca B-2', '15 unit'],
    [3, 'Natrium Klorida (NaCl) 1000 gram', 'Habis pakai', 'Lemari Reagen Kimia R-2', '1000 gram'],
    [4, 'Asam Klorida (HCl) 1 M', 'Habis pakai', 'Lemari Asam Kimia L-3', '4 botol (500ml)'],
    [5, 'Kertas Lakmus Merah & Biru', 'Habis pakai', 'Laci Reagen K-1', '10 pack'],
    [6, 'Termometer Raksa Skala -10 s.d 110 C', 'Jangka panjang', 'Rak Fisika F-04', '8 unit'],
    [],
    [],
    [`--- TABEL 2: STOK MASUK BARU (TA 2026/2027) ---`],
    ['No', 'Nama Alat dan Bahan', 'Keterangan / Jumlah Masuk', 'Penyimpanan', 'Catatan Pengadaan & PIC Penanggung Jawab'],
    [1, 'Mikroskop Binokuler Digital ARC', '2 unit', 'Lemari Optik A-1', 'Pengadaan APBD 2026 (Diterima oleh Ust. Oktaviawan)'],
    [2, 'Gelas Ukur Borosilikat 100 mL', '5 unit', 'Rak Kaca B-2', 'Restok Tambahan (PIC: Ilham Nurkholis)'],
    [3, 'pH Meter Digital Precision 0.01', '3 unit', 'Lemari Instrumen C-2', 'Alat Baru TA 2026/2027 (Penerima: Usth. Siti Aminatuh)'],
    [4, 'Indikator Universal Paper Test', '6 pack', 'Laci Reagen K-1', 'Pengadaan Baru (PIC: Usth. Farkhatul)'],
  ];

  const sheetsConfig = [
    { name: 'FISIKA', title: 'LABORATORIUM FISIKA (SMA)' },
    { name: 'KIMIA', title: 'LABORATORIUM KIMIA (SMA)' },
    { name: 'BIOLOGI', title: 'LABORATORIUM BIOLOGI (SMA)' },
    { name: 'IPA TERPADU (SMP)', title: 'LABORATORIUM IPA TERPADU (SMP)' },
  ];

  sheetsConfig.forEach(({ name, title }) => {
    const ws = XLSX.utils.aoa_to_sheet(createSheetData(title));

    // Set column widths for comfortable reading
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 38 }, // Nama
      { wch: 18 }, // Jenis Item / Keterangan
      { wch: 24 }, // Penyimpanan
      { wch: 48 }, // Keterangan & PIC
    ];

    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
