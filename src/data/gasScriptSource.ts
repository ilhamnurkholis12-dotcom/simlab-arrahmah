/**
 * Source code representation of Google Apps Script Code.gs
 * for easy viewing and 1-click clipboard copying inside SIMLAB.
 */

export const GAS_CODE_GS_SOURCE = `/**
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
// 4. HANDLER POST (UPSERT ENGINE: 100% ANTI-DUPLIKASI DATA)
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

  var action = (postData.action || 'upsert').toLowerCase();
  var sheetParam = postData.sheet || postData.sheetName || '';

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

  // Pastikan baris header sudah ada di Baris 1
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    var schemaConf = DATABASE_SCHEMA[resolvedName];
    var defaultHeaders = schemaConf ? schemaConf.headers : ['ID', 'Data'];

    var headerRange = sheet.getRange(1, 1, 1, defaultHeaders.length);
    headerRange.setValues([defaultHeaders]);
    headerRange.setBackground('#064e3b');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    lastRow = 1;
    lastCol = defaultHeaders.length;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // ----------------------------------------------------------------------------
  // A. DELETE ACTION (HAPUS DATA BERDASARKAN ID DI KOLOM A)
  // ----------------------------------------------------------------------------
  if (action === 'delete' || action === 'remove') {
    var rawDelData = postData.data !== undefined ? postData.data : postData;
    var delTargetId = extractRecordId(rawDelData, headers) || postData.id || postData.targetId;

    if (!delTargetId) {
      return createJsonResponse({
        status: 'error',
        message: 'Target ID tidak ditemukan untuk aksi delete.'
      });
    }

    var delClean = String(delTargetId).trim().toLowerCase();
    var curLastRow = sheet.getLastRow();
    var delRowFound = -1;

    if (curLastRow > 1) {
      var colA = sheet.getRange(2, 1, curLastRow - 1, 1).getValues();
      for (var rDel = 0; rDel < colA.length; rDel++) {
        if (String(colA[rDel][0] || '').trim().toLowerCase() === delClean) {
          delRowFound = rDel + 2;
          break;
        }
      }
    }

    if (delRowFound !== -1) {
      sheet.deleteRow(delRowFound);
      return createJsonResponse({
        status: 'success',
        action: 'delete',
        sheet: resolvedName,
        targetId: delTargetId,
        message: 'Data dengan ID "' + delTargetId + '" berhasil dihapus dari sheet ' + resolvedName + '.'
      });
    } else {
      return createJsonResponse({
        status: 'error',
        message: 'Data dengan ID "' + delTargetId + '" tidak ditemukan di sheet ' + resolvedName + '.'
      });
    }
  }

  // ----------------------------------------------------------------------------
  // B. UPSERT ENGINE (ANTI-DUPLIKASI: PERIKSA KOLOM A PER BARIS)
  // ----------------------------------------------------------------------------
  // 1. Ekstrak data yang akan diproses (mendukung objek tunggal maupun Array banyak data)
  var itemsToProcess = [];
  if (Array.isArray(postData.data)) {
    itemsToProcess = postData.data;
  } else if (Array.isArray(postData)) {
    itemsToProcess = postData;
  } else if (postData.data && typeof postData.data === 'object') {
    itemsToProcess = [postData.data];
  } else {
    itemsToProcess = [postData];
  }

  // 2. Baca seluruh data baris yang ada di Sheet target saat ini
  var currentLastRow = sheet.getLastRow();
  var existingRows = currentLastRow > 1 ? sheet.getRange(2, 1, currentLastRow - 1, headers.length).getValues() : [];

  // 3. Petakan nilai ID di Kolom A (kolom 1) ke nomor baris riil di sheet
  var idToRowMap = {};
  for (var r = 0; r < existingRows.length; r++) {
    var colAVal = String(existingRows[r][0] !== undefined && existingRows[r][0] !== null ? existingRows[r][0] : '').trim().toLowerCase();
    if (colAVal !== '') {
      idToRowMap[colAVal] = r + 2; // Baris riil di spreadsheet (baris 1 adalah header)
    }
    // Khusus tabel Pengguna, juga petakan Email_Petugas untuk proteksi akun duplikat
    if (resolvedName === 'Pengguna' && existingRows[r][2]) {
      var emVal = String(existingRows[r][2]).trim().toLowerCase();
      if (emVal !== '') {
        idToRowMap['email:' + emVal] = r + 2;
      }
    }
  }

  var updatedCount = 0;
  var insertedCount = 0;
  var lastResultRow = -1;
  var lastTargetId = '';

  // 4. Lakukan pengecekan ID per baris satu demi satu (baik single data maupun Array)
  for (var i = 0; i < itemsToProcess.length; i++) {
    var item = itemsToProcess[i];
    if (!item || typeof item !== 'object') continue;

    // Ambil data ID dari objek JSON
    var itemId = extractRecordId(item, headers);
    if (!itemId && item.id) itemId = String(item.id).trim();
    if (!itemId && item.code) itemId = String(item.code).trim();

    var cleanId = itemId ? String(itemId).trim().toLowerCase() : '';

    // Cari apakah nilai ID tersebut SUDAH ADA di Kolom A
    var targetRow = -1;
    if (cleanId !== '' && idToRowMap[cleanId]) {
      targetRow = idToRowMap[cleanId];
    } else if (resolvedName === 'Pengguna' && item.Email_Petugas && idToRowMap['email:' + String(item.Email_Petugas).trim().toLowerCase()]) {
      targetRow = idToRowMap['email:' + String(item.Email_Petugas).trim().toLowerCase()];
    }

    // Bangun baris data lengkap dari kolom 1 (Kolom A) sampai kolom akhir sesuai header
    var rowValues = [];
    for (var c = 0; c < headers.length; c++) {
      var hName = String(headers[c]).trim();
      var val = getFieldValue(item, hName);

      // Jika kolom pertama (Kolom A / ID) kosong di payload, masukkan itemId yang diekstrak
      if ((val === undefined || val === null || val === '') && c === 0 && itemId) {
        val = itemId;
      }

      // Jika aksi update dan nilai field tertentu tidak dikirim di payload, pertahankan nilai lama
      if ((val === undefined || val === null) && targetRow !== -1) {
        var rowOffset = targetRow - 2;
        if (existingRows[rowOffset] && existingRows[rowOffset][c] !== undefined) {
          val = existingRows[rowOffset][c];
        }
      }

      rowValues.push(val !== undefined && val !== null ? val : '');
    }

    if (targetRow !== -1) {
      // 5. JIKA ID SUDAH ADA: Perbarui (overwrite) baris tersebut dari kolom A sampai kolom akhir. JANGAN appendRow!
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
      existingRows[targetRow - 2] = rowValues; // Update memori
      updatedCount++;
      lastResultRow = targetRow;
      lastTargetId = itemId;
    } else {
      // 6. JIKA ID BELUM ADA: Baru jalankan appendRow()
      sheet.appendRow(rowValues);
      var newRowNumber = sheet.getLastRow();
      if (cleanId !== '') {
        idToRowMap[cleanId] = newRowNumber;
      }
      existingRows.push(rowValues); // Tambah ke memori
      insertedCount++;
      lastResultRow = newRowNumber;
      lastTargetId = itemId;
    }
  }

  // 7. Berikan respon JSON yang informatif
  if (itemsToProcess.length === 1) {
    var wasUpdated = updatedCount > 0;
    return createJsonResponse({
      status: 'success',
      action: wasUpdated ? 'update' : 'insert',
      isUpsert: true,
      sheet: resolvedName,
      targetId: lastTargetId,
      rowNumber: lastResultRow,
      message: wasUpdated
        ? 'Data dengan ID "' + lastTargetId + '" sudah ada di baris ' + lastResultRow + ' sheet ' + resolvedName + '; baris berhasil diperbarui (OVERWRITE).'
        : 'Data baru dengan ID "' + lastTargetId + '" belum ada; berhasil ditambahkan ke baris ' + lastResultRow + ' sheet ' + resolvedName + ' (INSERT).'
    });
  }

  return createJsonResponse({
    status: 'success',
    action: 'batch_upsert',
    isUpsert: true,
    sheet: resolvedName,
    totalProcessed: itemsToProcess.length,
    updatedCount: updatedCount,
    insertedCount: insertedCount,
    message: 'Selesai memproses ' + itemsToProcess.length + ' data pada sheet ' + resolvedName + ': ' + updatedCount + ' baris diperbarui (OVERWRITE), ' + insertedCount + ' baris baru ditambahkan (INSERT). Bebas duplikasi 100%.'
  });
}

/**
 * Universal ID Extractor: Mencari ID unik record dari berbagai variasi key JSON
 */
function extractRecordId(item, headers) {
  if (!item || typeof item !== 'object') return '';

  // 1. Cek langsung nilai dari header kolom pertama (Kolom A)
  if (headers && headers.length > 0) {
    var col1Header = String(headers[0]).trim();
    var col1Val = getFieldValue(item, col1Header);
    if (col1Val !== undefined && col1Val !== null && String(col1Val).trim() !== '') {
      return String(col1Val).trim();
    }
  }

  // 2. Cek properti id, ID, code, Code
  if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
    return String(item.id).trim();
  }
  if (item.ID !== undefined && item.ID !== null && String(item.ID).trim() !== '') {
    return String(item.ID).trim();
  }
  if (item.code !== undefined && item.code !== null && String(item.code).trim() !== '') {
    return String(item.code).trim();
  }

  // 3. Cek properti ID spesifik tabel
  var candidateKeys = [
    'ID_Barang', 'id_barang', 'kode_barang', 'kode_alat', 'id_alat',
    'ID_Bahan', 'id_bahan', 'kode_bahan',
    'ID_Pengguna', 'id_pengguna', 'id_user', 'user_id', 'Email_Petugas', 'email',
    'ID_Pinjam', 'id_pinjam', 'kode_pinjam', 'id_peminjaman',
    'ID_Transaksi', 'id_transaksi', 'kode_transaksi',
    'ID_Slide', 'id_slide',
    'ID_Jurnal', 'id_jurnal',
    'ID_Siswa', 'id_siswa', 'NISN', 'nisn',
    'ID_Nilai', 'id_nilai'
  ];

  for (var i = 0; i < candidateKeys.length; i++) {
    var k = candidateKeys[i];
    if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== '') {
      return String(item[k]).trim();
    }
  }

  return '';
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
`;
