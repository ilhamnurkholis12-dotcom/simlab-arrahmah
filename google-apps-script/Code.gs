/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT PRODUCTION DATABASE BACKEND - SIMLAB AR-RAHMAH CENDEKIA
 * ==============================================================================
 * File: Code.gs
 * Target Spreadsheet ID: 16kGRoKS-Nw5YRIIovs1e4_RNDV-dkaiyb14gQKv4LIw
 * 
 * Karakteristik:
 * 1. ZERO DUMMY DATA / PURE PRODUCTION:
 *    Fungsi setupDatabase() HANYA membuat struktur Sheet dan Header Kolom resmi.
 *    Sheet dibiarkan BERSIH & KOSONG (tanpa data simulasi/imitasi).
 * 
 * 2. FULL CRUD REAL-TIME:
 *    - GET : Mengambil data dari tabel (jika kosong, kembalikan array kosong []).
 *    - POST: Insert (tambah), Update (edit), Delete (hapus), dan Setup Database.
 * 
 * 3. MULTI-SHEET LENGKAP:
 *    - Pengguna          : Autentikasi & Akun Petugas/Laboran
 *    - Alat              : Inventaris Stok Alat Ukur, Gelas, Optik & APD
 *    - Bahan             : Inventaris Reagen & Bahan Kimia Habis Pakai
 *    - Peminjaman        : Sirkulasi Peminjaman & Pengembalian Alat
 *    - Penggunaan_Bahan  : Transaksi Pemakaian Bahan & Mutasi Stok
 *    - Slideshow         : Banner Dashboard & Video SOP K3
 *    - Jurnal_Praktikum  : Log Harian Sesi Praktikum & Presensi
 *    - Data_Siswa        : Direktori Santri & Rombel
 *    - E_Raport          : Rekapitulasi Nilai & Asesmen Sikap Lab
 * ==============================================================================
 */

// SPREADSHEET ID TARGET RESMI
var TARGET_SPREADSHEET_ID = '16kGRoKS-Nw5YRIIovs1e4_RNDV-dkaiyb14gQKv4LIw';

/**
 * Mendapatkan referensi Google Spreadsheet target.
 * Berfungsi baik saat skrip standalone (openById) maupun container-bound.
 */
function getSpreadsheet() {
  if (TARGET_SPREADSHEET_ID && TARGET_SPREADSHEET_ID.trim() !== '') {
    try {
      return SpreadsheetApp.openById(TARGET_SPREADSHEET_ID.trim());
    } catch (err) {
      Logger.log('[WARN] openById gagal, menggunakan getActiveSpreadsheet(): ' + err.toString());
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ==============================================================================
// 1. DEFINISI STRUKTUR TABEL & HEADER KOLOM (100% PERSIS PROTOTYPE SIMLAB)
// ==============================================================================

var DATABASE_SCHEMA = {
  // 1. PENGGUNA (Akun Petugas & Autentikasi)
  Pengguna: {
    sheetName: 'Pengguna',
    idColumn: 'ID_Pengguna',
    headers: [
      'ID_Pengguna',
      'Nama_Lengkap',
      'Email_Petugas',
      'Kata_Sandi',
      'Role',
      'Unit_Tugas',
      'NIP_ID',
      'Avatar_URL',
      'Status'
    ]
  },

  // 2. ALAT (Inventaris Alat Praktikum)
  Alat: {
    sheetName: 'Alat',
    idColumn: 'ID_Barang',
    headers: [
      'ID_Barang',
      'Nama_Alat',
      'Kategori',
      'Sub_Lab',
      'Jumlah_Stok',
      'Kondisi_Baik',
      'Kondisi_Rusak_Ringan',
      'Kondisi_Rusak_Berat',
      'Lokasi_Penyimpanan',
      'Spesifikasi_Merek',
      'Status_Kalibrasi'
    ]
  },

  // 3. BAHAN (Inventaris Bahan Kimia & Reagen)
  Bahan: {
    sheetName: 'Bahan',
    idColumn: 'ID_Bahan',
    headers: [
      'ID_Bahan',
      'Nama_Bahan',
      'Rumus_Kimia',
      'Bentuk_Wujud',
      'Stok_Tersedia',
      'Satuan',
      'Batas_Minimum',
      'Lokasi_Penyimpanan',
      'Tanggal_Kadaluarsa',
      'Klasifikasi_Bahaya'
    ]
  },

  // 4. PEMINJAMAN (Sirkulasi Peminjaman Alat)
  Peminjaman: {
    sheetName: 'Peminjaman',
    idColumn: 'ID_Pinjam',
    headers: [
      'ID_Pinjam',
      'Peminjam_Nama',
      'Kelas_Rombel',
      'Kontak_WA',
      'Nama_Barang',
      'Jumlah',
      'Tgl_Pinjam',
      'Tgl_Batas_Kembali',
      'Tgl_Realisasi_Kembali',
      'Status',
      'Petugas_PIC',
      'Kondisi_Kembali',
      'Laporan_Kerusakan'
    ]
  },

  // 5. PENGGUNAAN BAHAN (Mutasi Stok Keluar & Pemakaian Reagen)
  Penggunaan_Bahan: {
    sheetName: 'Penggunaan_Bahan',
    idColumn: 'ID_Transaksi',
    headers: [
      'ID_Transaksi',
      'ID_Barang',
      'Kode_Barang',
      'Nama_Barang',
      'Tipe_Transaksi',
      'Jumlah',
      'Satuan',
      'Tanggal',
      'Lab_Tujuan',
      'Lab_Asal',
      'Keperluan_Praktikum',
      'Kelas_Rombel',
      'Nama_PIC',
      'Kondisi_Barang',
      'Catatan'
    ]
  },

  // 6. SLIDESHOW (Informasi, Banner & Media Lab)
  Slideshow: {
    sheetName: 'Slideshow',
    idColumn: 'ID_Slide',
    headers: [
      'ID_Slide',
      'Judul_Pengumuman',
      'Deskripsi_Singkat',
      'Tipe_Media',
      'Media_URL',
      'Kategori',
      'Status_Aktif',
      'Urutan_Tampil'
    ]
  },

  // 7. JURNAL PRAKTIKUM (Buku Kendali & Log Harian)
  Jurnal_Praktikum: {
    sheetName: 'Jurnal_Praktikum',
    idColumn: 'ID_Jurnal',
    headers: [
      'ID_Jurnal',
      'Tanggal_Praktikum',
      'Guru_Pengampu',
      'Mata_Pelajaran',
      'Kelas_Rombel',
      'Judul_Materi_Praktikum',
      'Sub_Lab',
      'Jumlah_Siswa_Hadir',
      'Jumlah_Siswa_Absen',
      'Catatan_Insiden_Limbah'
    ]
  },

  // 8. DATA SISWA (Direktori Santri)
  Data_Siswa: {
    sheetName: 'Data_Siswa',
    idColumn: 'NISN',
    headers: [
      'NISN',
      'Nama_Lengkap_Santri',
      'Tingkat_Sekolah',
      'Kelas_Rombel',
      'Jenis_Kelamin',
      'Status_Keaktifan'
    ]
  },

  // 9. E-RAPORT (Rekap Nilai Praktikum)
  E_Raport: {
    sheetName: 'E_Raport',
    idColumn: 'ID_Nilai',
    headers: [
      'ID_Nilai',
      'NISN',
      'Nama_Santri',
      'Mata_Pelajaran',
      'Materi_Praktikum',
      'Nilai_Keterampilan_Psikomotorik',
      'Nilai_Laporan_Analisis',
      'Predikat_Sikap_K3',
      'Guru_Penilai'
    ]
  }
};

// ==============================================================================
// 2. FUNGSI SETUP DATABASE (MURNI TANPA DATA DUMMY)
// ==============================================================================

/**
 * Membuat seluruh sheet, mengatur header Dark Emerald (#064e3b), membekukan baris 1,
 * dan membiarkan isi tabel KOSONG BERSIH (hanya header, 0 baris data).
 */
function setupDatabase() {
  var ss = getSpreadsheet();
  var logResults = [];

  var tableKeys = Object.keys(DATABASE_SCHEMA);

  for (var i = 0; i < tableKeys.length; i++) {
    var key = tableKeys[i];
    var config = DATABASE_SCHEMA[key];

    var sheet = ss.getSheetByName(config.sheetName);
    var isNew = false;

    if (!sheet) {
      sheet = ss.insertSheet(config.sheetName);
      isNew = true;
    }

    // Bersihkan seluruh isi lama agar terformat rapi sesuai schema terbaru
    sheet.clear();

    // 1. Tulis Header Kolom di Baris 1
    var headerRange = sheet.getRange(1, 1, 1, config.headers.length);
    headerRange.setValues([config.headers]);
    headerRange.setBackground('#064e3b'); // Dark Emerald
    headerRange.setFontColor('#ffffff'); // Putih
    headerRange.setFontWeight('bold');
    headerRange.setFontFamily('Arial');
    headerRange.setFontSize(10);
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');

    // 2. Format Baris Header & Freeze Row 1
    sheet.setRowHeight(1, 34);
    sheet.setFrozenRows(1);

    // 3. Auto-fit lebar kolom
    for (var c = 1; c <= config.headers.length; c++) {
      sheet.autoResizeColumn(c);
    }

    logResults.push({
      sheet: config.sheetName,
      status: isNew ? 'created_clean' : 'reformatted_clean',
      columnsCount: config.headers.length,
      dataRows: 0
    });
  }

  // Bersihkan Sheet bawaan kosong ("Sheet1" / "Lembar 1")
  cleanDefaultSheets(ss);

  var summaryMsg = 'Setup Database Berhasil! Seluruh ' + tableKeys.length + ' tabel telah siap dalam kondisi bersih (tanpa data imitasi).';
  Logger.log('[SIMLAB SETUP] ' + summaryMsg);

  return {
    status: 'success',
    spreadsheetId: ss.getId(),
    message: summaryMsg,
    sheetsCreated: logResults
  };
}

/**
 * Membersihkan Sheet1 default yang kosong
 */
function cleanDefaultSheets(ss) {
  var defaultNames = ['Sheet1', 'Sheet 1', 'Lembar1', 'Lembar 1'];
  for (var i = 0; i < defaultNames.length; i++) {
    var def = ss.getSheetByName(defaultNames[i]);
    if (def && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(def);
      } catch (e) {}
    }
  }
}

// ==============================================================================
// 3. HANDLER GET (READ DATA DENGAN DUKUNGAN REAL-TIME)
// ==============================================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  var sheetParam = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : '';

  // 1. Jalankan setup database via GET: ?action=setupDatabase
  if (action === 'setupDatabase' || action === 'init') {
    return createJsonResponse(setupDatabase());
  }

  // 2. Baca data dari tabel tertentu: ?action=getData&sheet=Alat
  if (action === 'getData' || action === 'read') {
    return handleGetData(sheetParam || 'Alat');
  }

  // Jika parameter sheet dikirim langsung tanpa action
  if (sheetParam) {
    return handleGetData(sheetParam);
  }

  // 3. Cek Status Endpoint API SIMLAB
  var ss = getSpreadsheet();
  var sheetList = ss.getSheets().map(function (s) {
    return {
      name: s.getName(),
      rows: Math.max(0, s.getLastRow() - 1),
      columns: s.getLastColumn()
    };
  });

  return createJsonResponse({
    status: 'online',
    system: 'SIMLAB Ar-Rahmah Cendekia Backend API (2026)',
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    message: 'API Google Apps Script SIMLAB aktif dan siap melayani permintaan GET / POST.',
    sheets: sheetList,
    timestamp: new Date().toISOString()
  });
}

/**
 * Mengambil seluruh data baris pada tabel tertentu
 */
function handleGetData(sheetName) {
  var ss = getSpreadsheet();
  var resolvedName = resolveSheetName(ss, sheetName);
  var sheet = ss.getSheetByName(resolvedName);

  if (!sheet) {
    return createJsonResponse({
      status: 'error',
      sheet: sheetName,
      message: 'Sheet "' + sheetName + '" tidak ditemukan di Spreadsheet.',
      data: []
    });
  }

  // Optimasi Performa: Ambil seluruh data sheet sekaligus menggunakan getDataRange().getValues()
  var dataRange = sheet.getDataRange();
  var values = dataRange ? dataRange.getValues() : [];

  // Jika sheet kosong atau hanya berisi baris header (tanpa baris data)
  if (!values || values.length <= 1 || values[0].length === 0) {
    return createJsonResponse({
      status: 'success',
      sheet: resolvedName,
      count: 0,
      data: [] // Mengembalikan array kosong sesuai permintaan
    });
  }

  var headers = values[0];
  var rows = [];

  for (var r = 1; r < values.length; r++) {
    var rowObj = {};
    var hasContent = false;

    for (var c = 0; c < headers.length; c++) {
      var key = String(headers[c]).trim();
      var cellVal = values[r][c];

      // Format tanggal ke string YYYY-MM-DD
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }

      rowObj[key] = (cellVal !== undefined && cellVal !== null) ? cellVal : '';

      if (cellVal !== '' && cellVal !== null && cellVal !== undefined) {
        hasContent = true;
      }
    }

    if (hasContent) {
      rows.push(rowObj);
    }
  }

  return createJsonResponse({
    status: 'success',
    sheet: resolvedName,
    count: rows.length,
    data: rows
  });
}

// ==============================================================================
// 4. HANDLER POST (INSERT, UPDATE, DELETE DATA REAL-TIME)
// ==============================================================================

function doPost(e) {
  var postData = null;

  try {
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      postData = e.parameter;
    }
  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: 'Format payload JSON tidak valid: ' + err.toString()
    });
  }

  if (!postData) {
    return createJsonResponse({
      status: 'error',
      message: 'Payload POST kosong.'
    });
  }

  var action = (postData.action || 'insert').toLowerCase();
  var sheetParam = postData.sheet || postData.sheetName || '';
  var record = postData.data || postData;

  // 1. Eksekusi remote setupDatabase melalui POST
  if (action === 'setupdatabase' || action === 'init') {
    return createJsonResponse(setupDatabase());
  }

  if (!sheetParam) {
    return createJsonResponse({
      status: 'error',
      message: 'Parameter "sheet" diperlukan dalam request.'
    });
  }

  var ss = getSpreadsheet();
  var resolvedName = resolveSheetName(ss, sheetParam);
  var sheet = ss.getSheetByName(resolvedName);

  if (!sheet) {
    sheet = ss.insertSheet(resolvedName);
  }

  // Pastikan baris header sudah ada
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    var schemaConf = DATABASE_SCHEMA[resolvedName];
    var defaultHeaders = schemaConf ? schemaConf.headers : Object.keys(record).filter(function (k) {
      return k !== 'action' && k !== 'sheet' && k !== 'sheetName';
    });

    var headerRange = sheet.getRange(1, 1, 1, defaultHeaders.length);
    headerRange.setValues([defaultHeaders]);
    headerRange.setBackground('#064e3b');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    lastRow = 1;
    lastCol = defaultHeaders.length;
  }

  var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // ----------------------------------------------------------------------------
  // A. DELETE RECORD (HAPUS DATA BERDASARKAN ID)
  // ----------------------------------------------------------------------------
  if (action === 'delete' || action === 'remove') {
    var delTargetId = extractRecordId(record, resolvedName) || postData.id || postData.targetId;

    if (!delTargetId) {
      return createJsonResponse({
        status: 'error',
        message: 'Target ID tidak ditemukan untuk aksi delete.'
      });
    }

    var targetDeleteRow = findRowById(sheet, existingHeaders, delTargetId, resolvedName);

    if (targetDeleteRow !== -1) {
      sheet.deleteRow(targetDeleteRow);
      return createJsonResponse({
        status: 'success',
        action: 'delete',
        sheet: resolvedName,
        message: 'Data dengan ID ' + delTargetId + ' berhasil dihapus dari sheet ' + resolvedName + '.'
      });
    } else {
      return createJsonResponse({
        status: 'error',
        message: 'Data dengan ID ' + delTargetId + ' tidak ditemukan di sheet ' + resolvedName + '.'
      });
    }
  }

  // ----------------------------------------------------------------------------
  // B. UPSERT ENGINE (ANTI-DUPLIKASI: UPDATE JIKA ADA, INSERT JIKA BARU)
  // ----------------------------------------------------------------------------
  // Seluruh aksi penulisan data (insert, update, edit, upsert) diproses melalui logika UPSERT ini
  // untuk menjamin 100% TIDAK PERNAH TERJADI DUPLIKASI DATA di Google Sheets.
  var targetId = extractRecordId(record, resolvedName) || postData.id || postData.targetId;
  var foundRow = targetId ? findRowById(sheet, existingHeaders, targetId, resolvedName) : -1;

  if (foundRow !== -1) {
    // 1. ID SUDAH ADA DI SHEET -> LAKUKAN UPDATE (TIMPA BARIS SECARA ATOMIK)
    var currentRowValues = sheet.getRange(foundRow, 1, 1, existingHeaders.length).getValues()[0];
    for (var col = 0; col < existingHeaders.length; col++) {
      var hName = String(existingHeaders[col]).trim();
      var val = getFieldValue(record, hName);
      if (val !== undefined && val !== null) {
        currentRowValues[col] = val;
      }
    }
    // Batch update 1 baris sekaligus (efisien, cepat, anti-duplikasi)
    sheet.getRange(foundRow, 1, 1, existingHeaders.length).setValues([currentRowValues]);

    return createJsonResponse({
      status: 'success',
      action: 'update',
      isUpsert: true,
      sheet: resolvedName,
      targetId: targetId,
      rowNumber: foundRow,
      message: 'Data dengan ID "' + targetId + '" sudah ada di sheet ' + resolvedName + '; baris berhasil diperbarui tanpa duplikasi.'
    });
  } else {
    // 2. ID BELUM ADA DI SHEET -> BARU LAKUKAN INSERT (APPEND ROW)
    return insertRecord(sheet, existingHeaders, record, resolvedName);
  }
}

/**
 * Menambahkan 1 baris baru ke sheet
 */
function insertRecord(sheet, headers, data, sheetName) {
  var newRow = [];

  for (var i = 0; i < headers.length; i++) {
    var headerName = String(headers[i]).trim();
    var val = getFieldValue(data, headerName);
    newRow.push(val !== undefined && val !== null ? val : '');
  }

  sheet.appendRow(newRow);

  return createJsonResponse({
    status: 'success',
    action: 'insert',
    isUpsert: true,
    sheet: sheetName,
    message: 'Data baru berhasil disimpan ke Google Sheets (' + sheetName + ').',
    insertedRow: sheet.getLastRow()
  });
}

/**
 * Universal ID Extractor: Mencari ID unik record dari berbagai variasi key JSON
 */
function extractRecordId(record, sheetName) {
  if (!record || typeof record !== 'object') return '';

  var idKey = getIdKeyForSheet(sheetName);
  if (record[idKey] !== undefined && record[idKey] !== null && String(record[idKey]).trim() !== '') {
    return String(record[idKey]).trim();
  }

  var candidates = [
    'id', 'ID', 'code', 'Code',
    'ID_Barang', 'id_barang', 'kode_barang', 'Kode_Barang', 'kode_alat',
    'ID_Bahan', 'id_bahan', 'kode_bahan',
    'ID_Pinjam', 'id_pinjam', 'id_peminjaman',
    'ID_Pengguna', 'id_pengguna', 'id_user', 'Email_Petugas', 'email',
    'ID_Transaksi', 'id_transaksi',
    'ID_Slide', 'id_slide',
    'ID_Jurnal', 'id_jurnal',
    'ID_Siswa', 'id_siswa', 'NISN', 'nisn',
    'ID_Nilai', 'id_nilai'
  ];

  for (var i = 0; i < candidates.length; i++) {
    var k = candidates[i];
    if (record[k] !== undefined && record[k] !== null && String(record[k]).trim() !== '') {
      return String(record[k]).trim();
    }
  }

  return '';
}

/**
 * Universal Row Finder: Mencari nomor baris (1-based) dari targetId di dalam sheet
 * Memeriksa kolom primary key dan fallback ke kolom ID alternatif lainnya.
 */
function findRowById(sheet, headers, targetId, sheetName) {
  if (!targetId) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  var cleanTarget = String(targetId).trim().toLowerCase();
  if (cleanTarget === '') return -1;

  var idKey = getIdKeyForSheet(sheetName).toLowerCase();
  var candidateColIndices = [];

  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c]).trim().toLowerCase();
    if (h === idKey) {
      candidateColIndices.unshift(c); // Prioritas tertinggi
    } else if (
      h.indexOf('id') !== -1 ||
      h.indexOf('kode') !== -1 ||
      h === 'nisn' ||
      (sheetName === 'Pengguna' && h.indexOf('email') !== -1)
    ) {
      candidateColIndices.push(c);
    }
  }

  if (candidateColIndices.length === 0) {
    candidateColIndices.push(0); // Default ke kolom 1
  }

  var numRows = lastRow - 1;
  var fullValues = sheet.getRange(2, 1, numRows, headers.length).getValues();

  for (var r = 0; r < fullValues.length; r++) {
    var row = fullValues[r];
    for (var k = 0; k < candidateColIndices.length; k++) {
      var colIdx = candidateColIndices[k];
      var cellVal = String(row[colIdx] || '').trim().toLowerCase();
      if (cellVal !== '' && cellVal === cleanTarget) {
        return r + 2; // Baris riil di spreadsheet (1-indexed + header baris 1)
      }
    }
  }

  return -1;
}

/**
 * Helper ekstraksi nilai field dengan pencocokan case-insensitive
 */
function getFieldValue(dataObj, headerName) {
  if (dataObj[headerName] !== undefined && dataObj[headerName] !== null) {
    return dataObj[headerName];
  }

  var normalized = headerName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (var key in dataObj) {
    if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) {
      return dataObj[key];
    }
  }

  return undefined;
}

/**
 * Menentukan Primary Key untuk masing-masing tabel
 */
function getIdKeyForSheet(sheetName) {
  var conf = DATABASE_SCHEMA[sheetName];
  if (conf && conf.idColumn) {
    return conf.idColumn;
  }
  return 'ID_Barang';
}

// ==============================================================================
// 5. HELPER RESOLVER ALIAS NAMA SHEET & CORS RESPONSE FORMATTER
// ==============================================================================

function resolveSheetName(ss, inputName) {
  if (!inputName) return 'Alat';
  var clean = inputName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  var sheets = ss.getSheets();

  // 1. Cek kecocokan nama langsung
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName();
    if (sName.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) {
      return sName;
    }
  }

  // 2. Pemetaan Alias Cerdas
  if (clean === 'alat' || clean === 'stokalat' || clean === 'inventarisalat') {
    return findExistingOrPreferred(sheets, ['Alat', 'Stok_Alat'], 'Alat');
  }
  if (clean === 'bahan' || clean === 'bahankimia' || clean === 'reagen' || clean === 'stokbahan') {
    return findExistingOrPreferred(sheets, ['Bahan', 'Bahan_Kimia'], 'Bahan');
  }
  if (clean === 'peminjaman' || clean === 'peminjamanalat' || clean === 'pinjam') {
    return findExistingOrPreferred(sheets, ['Peminjaman', 'Peminjaman_Alat'], 'Peminjaman');
  }
  if (clean === 'penggunaanbahan' || clean === 'transaksibahan' || clean === 'transaksi' || clean === 'pemakaian') {
    return findExistingOrPreferred(sheets, ['Penggunaan_Bahan', 'Transaksi_Stok'], 'Penggunaan_Bahan');
  }
  if (clean === 'slideshow' || clean === 'informasi' || clean === 'banner' || clean === 'slides') {
    return findExistingOrPreferred(sheets, ['Slideshow', 'Informasi'], 'Slideshow');
  }
  if (clean === 'pengguna' || clean === 'user' || clean === 'users' || clean === 'petugas') {
    return findExistingOrPreferred(sheets, ['Pengguna', 'Users'], 'Pengguna');
  }
  if (clean.indexOf('jurnal') !== -1 || clean.indexOf('praktikum') !== -1) {
    return findExistingOrPreferred(sheets, ['Jurnal_Praktikum', 'Jurnal'], 'Jurnal_Praktikum');
  }
  if (clean.indexOf('siswa') !== -1 || clean.indexOf('santri') !== -1) {
    return findExistingOrPreferred(sheets, ['Data_Siswa', 'Siswa'], 'Data_Siswa');
  }
  if (clean.indexOf('rap') !== -1) {
    return findExistingOrPreferred(sheets, ['E_Raport', 'E_Rapot'], 'E_Raport');
  }

  return inputName;
}

function findExistingOrPreferred(sheets, candidateNames, fallbackName) {
  for (var c = 0; c < candidateNames.length; c++) {
    for (var s = 0; s < sheets.length; s++) {
      if (sheets[s].getName().toLowerCase() === candidateNames[c].toLowerCase()) {
        return sheets[s].getName();
      }
    }
  }
  return fallbackName;
}

/**
 * Format respon JSON dengan MIME type application/json
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
