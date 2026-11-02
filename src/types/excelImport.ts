import { LabId, ItemCategory, InventoryItem, StockTransaction } from './inventory';

export interface ParsedStokAwalRow {
  rowNumber: number;
  sheetName: string;
  labId: LabId;
  namaBarang: string;
  jenisItemRaw: string;
  jenisItemMapped: 'alat' | 'reagen';
  penyimpanan: string;
  keteranganRaw: string;
  stokExtracted: number;
  unit: string;
  kondisi?: string;
  nettoDescription?: string;
  isNetto?: boolean;
}

export interface ParsedStokMasukRow {
  rowNumber: number;
  sheetName: string;
  labId: LabId;
  namaBarang: string;
  jumlahRaw: string;
  jumlahExtracted: number;
  penyimpanan?: string;
  keterangan?: string;
  tanggal?: string;
  picName?: string;
  isExisting: boolean;
  matchedItemId?: string;
  nettoDescription?: string;
  isNetto?: boolean;
}

export interface SheetParseResult {
  sheetName: string;
  labId: LabId;
  stokAwalRows: ParsedStokAwalRow[];
  stokMasukRows: ParsedStokMasukRow[];
  rawRowCount: number;
  warnings: string[];
}

export interface DetectedLaboranUser {
  name: string;
  email: string;
  role: 'laboran';
  passwordDefault: string;
  assignedLab: LabId | 'ALL';
  isNew: boolean;
}

export interface ExcelImportSummary {
  fileName: string;
  fileSizeBytes: number;
  sheets: SheetParseResult[];
  totalStokAwalItems: number;
  totalStokMasukExisting: number;
  totalStokMasukNew: number;
  totalTransactionsCreated: number;
  detectedPicUsers: DetectedLaboranUser[];
  errors: string[];
}

export interface ExcelImportExecutionResult {
  itemsCreated: number;
  itemsUpdated: number;
  transactionsCreated: number;
  usersCreated: number;
  newUsersList: DetectedLaboranUser[];
  isCleanReset: boolean;
  details: {
    sheet: string;
    action: 'CREATE_INITIAL' | 'UPDATE_STOCK_IN' | 'CREATE_STOCK_IN';
    itemName: string;
    qty: number;
    lab: LabId;
    picName?: string;
  }[];
}
