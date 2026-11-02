/**
 * Source code representation of Google Apps Script Code.gs
 * for easy viewing and 1-click clipboard copying inside SIMLAB.
 */

export const GAS_CODE_GS_SOURCE = `/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT DATABASE BACKEND FOR SIMLAB AR-RAHMAH CENDEKIA (2026)
 * ==============================================================================
 * File: Code.gs
 * 
 * Deskripsi:
 * Backend Google Apps Script Web App untuk portal SIMLAB SMP & SMA IT Ar-Rahmah Cendekia.
 * Berisi seluruh data asli prototype:
 * 1. Akun Pengguna & Laboran Resmi (Ilham Nurkholis Majid, Oktaviawan Arif, Siti Aminatuh, Farkhatul Amaliya)
 * 2. Inventaris Lengkap Stok Alat (Fisika, Kimia, Biologi, SMP Terpadu, APD/K3)
 * 3. Bahan Kimia & Reagen Otentik (HCl, PP, Biuret, Benedict, Lugol, dsb.)
 * 4. Peminjaman Alat Riil (Catatan peminjaman guru & siswa lengkap dengan status pengembalian & denda/pecah)
 * 5. Jurnal Kegiatan Praktikum Riil Guru
 * 6. Direktori Data Siswa / Santri SMP & SMA IT Ar-Rahmah Cendekia
 * 7. E-Raport Nilai Praktikum & Sikap Lab
 * 
 * CARA SETUP OTOMATIS:
 * - Opsi 1 (Langsung di Apps Script): Pilih fungsi 'setupDatabase' di toolbar atas lalu klik 'Run' (Jalankan).
 * - Opsi 2 (Melalui Web App): Buka Web App URL dengan parameter '?action=setupDatabase'.
 * - Opsi 3 (Auto-detect): Buka Web App URL; jika sheet kosong, script otomatis membuat dan mengisinya.
 * ==============================================================================
 */

// ==============================================================================
// 1. DATASET ASLI PROTOTYPE SIMLAB AR-RAHMAH CENDEKIA (TERLENGKAP)
// ==============================================================================

var INITIAL_DATABASE_SEED = {
  // ----------------------------------------------------------------------------
  // TABEL 1: PENGGUNA (AKUN RESMI LABORAN & KEPALA LAB AR-RAHMAH CENDEKIA)
  // ----------------------------------------------------------------------------
  Pengguna: {
    headers: ['ID_Pengguna', 'Nama_Lengkap', 'Email_Petugas', 'Kata_Sandi', 'Role', 'Unit_Tugas', 'NIP_ID'],
    rows: [
      ['ARC-2026-LAB01', 'Ilham Nurkholis Majid, S. Pd., Gr.', 'Ilham.nurkholis114@guru.sma.belajar.id', 'labarcss2026', 'KEPALA_LAB', 'ALL', '2025.14.02.03'],
      ['ARC-2026-FIS02', 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', 'oktaviawan901@guru.smp.belajar.id', 'labarcss2026', 'LABORAN_FISIKA', 'FISIKA', '2025.14.02.08'],
      ['ARC-2026-BIO04', 'Siti Aminatuh Juhriah, M. Si., Gr.', 'sitijuhriahssi21@guru.sma.belajar.id', 'labarcss2026', 'LABORAN_BIOLOGI', 'BIOLOGI', '2025.14.02.10'],
      ['ARC-2026-SMP05', 'Farkhatul Amaliya, S. Pd', 'farkhatullamaliyaa@gmail.com', 'labarcss2026', 'GURU_IPA_SMP', 'SMP_TERPADU', '-']
    ]
  },

  // ----------------------------------------------------------------------------
  // TABEL 2: STOK ALAT PRAKTIKUM LENGKAP DARI PROTOTYPE (17 INSTRUMEN & PERKAKAS)
  // ----------------------------------------------------------------------------
  Stok_Alat: {
    headers: ['ID_Barang', 'Nama_Alat', 'Kategori', 'Sub_Lab', 'Jumlah_Stok', 'Kondisi_Baik', 'Kondisi_Rusak_Ringan', 'Kondisi_Rusak_Berat', 'Lokasi_Penyimpanan', 'Spesifikasi_Merek'],
    rows: [
      ['FIS-26-001', 'Neraca Ohaus 311 Gram (4 Lengan)', 'Alat Ukur & Neraca', 'FISIKA', 9, 8, 1, 0, 'Lemari Fisika A1 - Rak 1', 'Ohaus Corp USA, Ketelitian 0.01 g'],
      ['FIS-26-002', 'Jangka Sorong Stainless 0.05 mm', 'Alat Ukur & Neraca', 'FISIKA', 18, 16, 2, 0, 'Lemari Fisika A2 - Rak Bawah', 'Tricle Brand 150mm Stainless Hardened'],
      ['FIS-26-003', 'Kit Optik Geometri Lengkap dengan Meja Optik', 'Instrumen Optik', 'FISIKA', 5, 4, 1, 0, 'Rak Instrumen Presisi No. 04', 'Pudak Scientific - Rel Presisi 100cm'],
      ['FIS-26-004', 'Catu Daya Listrik DC/AC 0-12 Volt (Power Supply)', 'Kit Praktikum Terpadu', 'FISIKA', 12, 11, 1, 0, 'Lemari Elektronika Fisika Lt. 2', 'Pudak 3A Proteksi Overload'],
      ['FIS-26-005', 'Multimeter Digital Auto-Ranging DT9205A', 'Alat Ukur & Neraca', 'FISIKA', 9, 8, 1, 0, 'Lemari Instrumen Listrik A4', 'Sunwa Digital Backlit LCD'],
      ['KIM-26-001', 'Gelas Kimia (Beaker Glass) 250 mL', 'Alat Gelas & Keramik', 'KIMIA', 54, 50, 4, 0, 'Lemari Kaca Barat - Rak 2', 'Iwaki Pyrex Borosilikat 3.3'],
      ['KIM-26-002', 'Erlenmeyer 250 mL Tahan Panas', 'Alat Gelas & Keramik', 'KIMIA', 36, 34, 2, 0, 'Lemari Kaca Barat - Rak 3', 'Duran Schott Borosilicate'],
      ['KIM-26-003', 'Buret Titrasi 50 mL dengan Keran Teflon', 'Alat Gelas & Keramik', 'KIMIA', 10, 9, 1, 0, 'Stand Buret Khusus Lab Kimia', 'Normax Class A Amber Marking'],
      ['KIM-26-006', 'Pipet Tetes Kaca Panjang 15 cm dengan Karet Merah', 'Alat Gelas & Keramik', 'KIMIA', 65, 60, 5, 0, 'Laci Alat Gelas Meja Kerja', 'Pyrex Glass Dropper'],
      ['BIO-26-001', 'Mikroskop Binokuler Siswa XSZ-107BN', 'Instrumen Optik', 'BIOLOGI', 14, 12, 2, 0, 'Lemari Kering Dehumidifier Lab Biologi', 'Olympus Compatible LED Illumination 1600x'],
      ['BIO-26-002', 'Set Preparat Awetan Sel Hewan & Tumbuhan (50 pcs)', 'Model & Preparat Biologi', 'BIOLOGI', 6, 6, 0, 0, 'Kotak Kayu Preparat Lt. 2', 'Biological Specimen Box 50 pcs'],
      ['BIO-26-003', 'Model Kerangka Manusia Ukuran Penuh (170 cm)', 'Model & Preparat Biologi', 'BIOLOGI', 2, 2, 0, 0, 'Pojok Anatomi Lab Sains', 'PVC Resin Standar Medis Beroda'],
      ['BIO-26-004', 'Gelas Obyek (Object Glass) & Kaca Penutup (Cover Glass)', 'Alat Gelas & Keramik', 'BIOLOGI', 20, 20, 0, 0, 'Laci Mikroteknik Meja 1', 'Sail Brand 72 pcs/box'],
      ['SMP-26-001', 'Kit Praktikum IPA Terpadu SMP (Mekanika & Optik)', 'Kit Praktikum Terpadu', 'SMP_TERPADU', 9, 8, 1, 0, 'Lemari Khusus SMP Terpadu Rak A', 'Pudak Scientific Kurikulum Merdeka'],
      ['SMP-26-002', 'Torso Anatomi Tubuh Manusia Mini Unisex (50 cm)', 'Model & Preparat Biologi', 'SMP_TERPADU', 5, 4, 1, 0, 'Meja Demonstrasi Guru SMP', 'Organ Bisa Dilepas 15 Bagian'],
      ['GEN-26-001', 'Pembakar Spirtus Kaca 150 mL Lengkap Sumbu', 'Perkakas & Keselamatan Kerja', 'ALL', 28, 26, 2, 0, 'Gudang Alat Bersama - Lemari Api', 'Kaca Tebal Tahan Tekanan & Tutup Plastik'],
      ['GEN-26-002', 'Kacamata Pengaman Praktikum (Safety Goggles)', 'Perkakas & Keselamatan Kerja', 'ALL', 46, 42, 4, 0, 'Box Sterilisasi APD Lt. 2', '3M Polycarbonate UV Protect Anti-Splash']
    ]
  },

  // ----------------------------------------------------------------------------
  // TABEL 3: BAHAN KIMIA & REAGEN LENGKAP DARI PROTOTYPE
  // ----------------------------------------------------------------------------
  Bahan_Kimia: {
    headers: ['ID_Bahan', 'Nama_Bahan', 'Rumus_Kimia', 'Jumlah_Stok', 'Satuan', 'Batas_Minimum', 'Lokasi_Simpan', 'Tanggal_Kadaluarsa'],
    rows: [
      ['KIM-26-004', 'Larutan Indikator Fenolftalein (PP) 100 mL', 'C20H14O4', 3, 'Botol', 4, 'Lemari B3 Reagen Asam-Basa', '2026-12-31'],
      ['KIM-26-005', 'Asam Klorida (HCl) 37% Pro Analisa 1000 mL', 'HCl', 2, 'Botol', 3, 'Lemari Asam Fume Hood Khusus Korosif', '2027-08-20'],
      ['SMP-26-003', 'Kertas Lakmus Merah & Biru (Set Uji Asam Basa)', 'Litmus Paper', 7, 'Box', 8, 'Kotak Reagen Kering SMP', '2028-01-01'],
      ['BIO-26-005', 'Reagen Lugol / Kalium Iodida Cair 250 mL', 'I2-KI', 2, 'Botol', 3, 'Lemari Reagen Uji Biokimia', '2027-05-15'],
      ['BHM-26-002', 'Asam Sulfat Pekat 98% p.a (Sulfuric Acid)', 'H2SO4', 1000, 'mL', 500, 'Lemari Asam Fume Hood B3', '2028-12-31'],
      ['BHM-26-003', 'Natrium Hidroksida Pellet p.a (Sodium Hydroxide)', 'NaOH', 1500, 'Gram', 500, 'Lemari Basa & Garam Rak B', '2028-06-30'],
      ['BHM-26-006', 'Reagen Biuret Siap Pakai (Uji Protein Makanan)', 'Biuret Reagent', 1000, 'mL', 300, 'Lemari Reagen Biologi Lt. 2', '2027-10-15'],
      ['BHM-26-007', 'Reagen Benedict Kualitatif (Uji Gula Pereduksi)', 'Benedict Reagent', 1500, 'mL', 400, 'Lemari Reagen Biologi Lt. 2', '2027-11-20'],
      ['BHM-26-009', 'Etanol Teknis 96% (Spiritus Putih / Alkohol Pelarut)', 'C2H5OH', 5000, 'mL', 1500, 'Gudang Pelarut Organik Terlindung', '2029-01-01'],
      ['BHM-26-010', 'Tembaga(II) Sulfat Pentahidrat (Terusi Kristal Biru)', 'CuSO4.5H2O', 500, 'Gram', 200, 'Lemari Garam Anorganik', '2028-09-01'],
      ['BHM-26-012', 'Pita Magnesium Murni Roll (Panjang 25 Meter)', 'Mg', 2, 'Roll', 1, 'Laci Logam Reaktif Kering', '2030-01-01'],
      ['BHM-26-015', 'Kertas Indikator Universal pH 0-14 (Merck Box)', 'Universal pH', 10, 'Box', 4, 'Lemari Instrumen Presisi', '2029-05-01']
    ]
  },

  // ----------------------------------------------------------------------------
  // TABEL 4: PEMINJAMAN ALAT LENGKAP DARI PROTOTYPE (LOG PEMINJAMAN ASLI)
  // ----------------------------------------------------------------------------
  Peminjaman_Alat: {
    headers: ['ID_Peminjaman', 'Kode_Barang', 'Nama_Barang', 'Jumlah', 'Tipe_Peminjam', 'Nama_Peminjam', 'Kelas_Unit', 'Jenjang', 'Tgl_Pinjam', 'Tgl_Kembali', 'Status', 'Kondisi_Kembali', 'Petugas_PIC', 'Keterangan_Insiden'],
    rows: [
      ['PINJAM-26-001', 'FIS-26-001', 'Neraca Ohaus 311 Gram (4 Lengan)', 2, 'SISWA', 'Ahmad Fathan Al-Ghifari (Kel. 1)', 'Kelas XII MIPA 1', 'SMA', '2026-10-23', '2026-10-25', 'DIPINJAM', '-', 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', 'Kondisi awal 2 unit terkalibrasi baik, jarum seimbang'],
      ['PINJAM-26-002', 'BIO-26-001', 'Mikroskop Binokuler Siswa XSZ-107BN', 3, 'GURU', 'Siti Aminatuh Juhriah, M. Si., Gr.', 'Guru Biologi SMA', 'SMA', '2026-10-20', '2026-10-21', 'KEMBALI_BAIK', 'Baik', 'Ilham Nurkholis Majid, S. Pd., Gr.', 'Lensa telah dibersihkan dengan lens paper, tersimpan rapi'],
      ['PINJAM-26-003', 'KIM-26-002', 'Erlenmeyer Pyrex 250 mL', 4, 'SISWA', 'Fadhil Muhammad Rayyan (Kel. 3)', 'Kelas VIII-A SMP IT', 'SMP', '2026-10-22', '2026-10-22', 'KEMBALI_RUSAK_PECAH', 'Pecah / Rusak Berat', 'Farkhatul Amaliya, S. Pd', '1 unit retak/pecah saat dibilas di wastafel. Dibuatkan berita acara penggantian.'],
      ['PINJAM-26-004', 'FIS-26-002', 'Jangka Sorong Stainless 0.05 mm', 5, 'GURU', 'Farkhatul Amaliya, S. Pd', 'Guru IPA SMP Terpadu', 'SMP', '2026-10-24', '2026-10-24', 'DIPINJAM', '-', 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', 'Dipinjam dari Lab Fisika ke Lab IPA SMP Terpadu Lt. 1']
    ]
  },

  // ----------------------------------------------------------------------------
  // TABEL 5: JURNAL PRAKTIKUM GURU DARI PROTOTYPE
  // ----------------------------------------------------------------------------
  Jurnal_Praktikum: {
    headers: ['ID_Jurnal', 'Tanggal', 'Laboratorium', 'Kelas', 'Materi_Praktikum', 'Jumlah_Hadir', 'Jumlah_Absen', 'Guru_Pengampu', 'Catatan_Kejadian'],
    rows: [
      ['JRN-26-001', '2026-08-04', 'FISIKA', 'XII MIPA 1 (SMA)', 'Pengenalan Alat Ukur Panjang & Analisis Ketidakpastian Pengukuran Fisika', 5, 0, 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', 'Sesi perdana semester ganjil. Seluruh siswa memahami K3 fisika dan instrumen presisi.'],
      ['JRN-26-002', '2026-08-11', 'KIMIA', 'XI MIPA 2 (SMA)', 'Keselamatan Kerja Laboratorium & Manajemen Simbol Bahaya Bahan Kimia (MSDS)', 2, 0, 'Ilham Nurkholis Majid, S. Pd., Gr.', 'Pengenalan lemari asam dan eyewash station berjalan lancar tanpa kendala.'],
      ['JRN-26-003', '2026-08-18', 'BIOLOGI', 'XII MIPA 1 (SMA)', 'Teknik Penggunaan Mikroskop Cahaya & Pengamatan Sel Prokariotik Cyanobacteria', 5, 0, 'Siti Aminatuh Juhriah, M. Si., Gr.', 'Pembuatan preparat segar berjalan baik. Siswa berhasil menemukan objek mikro.'],
      ['JRN-26-004', '2026-08-25', 'SMP_TERPADU', 'VIII-A (SMP Terpadu)', 'Uji Sifat Larutan Asam Basa dengan Kertas Lakmus & Indikator Alami Kunyit', 3, 0, 'Farkhatul Amaliya, S. Pd', 'Siswa antusias mengamati perubahan warna lakmus merah dan biru.'],
      ['JRN-26-005', '2026-09-01', 'SMP_TERPADU', 'VII-B (SMP Terpadu)', 'Pengamatan Sel Epidermis Bawang Merah & Sel Epitel Pipi Menggunakan Metilen Biru', 2, 0, 'Farkhatul Amaliya, S. Pd', 'Praktikum mikroskop dasar SMP berjalan tertib di bawah panduan LKPD.']
    ]
  },

  // ----------------------------------------------------------------------------
  // TABEL 6: DATA SISWA / SANTRI RESMI PROTOTYPE
  // ----------------------------------------------------------------------------
  Data_Siswa: {
    headers: ['ID_Siswa', 'NISN', 'Nama_Siswa', 'Kelas_Rombel', 'Unit_Sekolah', 'Status'],
    rows: [
      ['1', '0075849301', 'Ahmad Fathan Al-Ghifari', 'XII MIPA 1 (SMA)', 'SMA', 'Aktif'],
      ['2', '0079384722', 'Aisyah Putri Azzahra', 'XII MIPA 1 (SMA)', 'SMA', 'Aktif'],
      ['3', '0074628193', 'Fadhil Muhammad Rayyan', 'XII MIPA 1 (SMA)', 'SMA', 'Aktif'],
      ['4', '0081739485', 'Nabila Khairunnisa', 'XII MIPA 1 (SMA)', 'SMA', 'Aktif'],
      ['5', '0079827402', 'Zaidan Hafizh Ar-Rasyid', 'XII MIPA 1 (SMA)', 'SMA', 'Aktif'],
      ['6', '0082394811', 'Muhammad Rayhan Pratama', 'XI MIPA 2 (SMA)', 'SMA', 'Aktif'],
      ['7', '0083948192', 'Zahra Nurul Izzah', 'XI MIPA 2 (SMA)', 'SMA', 'Aktif'],
      ['8', '0092837461', 'Fakhri Ramadhan Al-Farisi', 'VIII-A (SMP Terpadu)', 'SMP', 'Aktif'],
      ['9', '0093847562', 'Khansa Humaira Zahid', 'VIII-A (SMP Terpadu)', 'SMP', 'Aktif'],
      ['10', '0091827364', 'Bilal Habibi Siregar', 'VIII-A (SMP Terpadu)', 'SMP', 'Aktif'],
      ['11', '0102938475', 'Salma Salsabila Putri', 'VII-B (SMP Terpadu)', 'SMP', 'Aktif'],
      ['12', '0103948576', 'Umar Abdullah As-Syahid', 'VII-B (SMP Terpadu)', 'SMP', 'Aktif']
    ]
  },

  // ----------------------------------------------------------------------------
  // TABEL 7: E-RAPORT (REKAP NILAI PRAKTIKUM & SIKAP LAB SANTRI)
  // ----------------------------------------------------------------------------
  E_Raport: {
    headers: ['ID_Nilai', 'NISN', 'Nama_Siswa', 'Mata_Pelajaran', 'Nilai_Kinerja', 'Nilai_Laporan', 'Nilai_Akhir', 'Nilai_Sikap', 'Predikat'],
    rows: [
      ['RAP-26-001', '0075849301', 'Ahmad Fathan Al-Ghifari', 'Fisika SMA', 85, 88, 87, 'A', 'Sangat Baik'],
      ['RAP-26-002', '0079384722', 'Aisyah Putri Azzahra', 'Fisika SMA', 90, 92, 91, 'A', 'Sangat Baik'],
      ['RAP-26-003', '0074628193', 'Fadhil Muhammad Rayyan', 'Fisika SMA', 84, 86, 85, 'B+', 'Baik'],
      ['RAP-26-004', '0081739485', 'Nabila Khairunnisa', 'Fisika SMA', 89, 90, 90, 'A', 'Sangat Baik'],
      ['RAP-26-005', '0079827402', 'Zaidan Hafizh Ar-Rasyid', 'Fisika SMA', 86, 85, 86, 'A', 'Sangat Baik'],
      ['RAP-26-006', '0082394811', 'Muhammad Rayhan Pratama', 'Kimia SMA', 88, 89, 89, 'A', 'Sangat Baik'],
      ['RAP-26-007', '0083948192', 'Zahra Nurul Izzah', 'Kimia SMA', 92, 93, 93, 'A', 'Sangat Baik'],
      ['RAP-26-008', '0092837461', 'Fakhri Ramadhan Al-Farisi', 'IPA Terpadu SMP', 87, 89, 88, 'A', 'Sangat Baik'],
      ['RAP-26-009', '0102938475', 'Salma Salsabila Putri', 'IPA Terpadu SMP', 90, 91, 91, 'A', 'Sangat Baik']
    ]
  }
};

// ==============================================================================
// 2. FUNGSI SETUP OTOMATIS (BISA DIJALANKAN MANUAL DI APPS SCRIPT)
// ==============================================================================

/**
 * FUNGSI UTAMA UNTUK RUN MANUAL DARI APPS SCRIPT EDITOR:
 * Pilih fungsi 'setupDatabase' di menu atas, lalu klik tombol 'Run' (Jalankan).
 * Google Sheets Anda akan langsung terisi penuh dengan 7 sheet lengkap dan rapi!
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logResults = [];

  var tableKeys = [
    'Pengguna',
    'Stok_Alat',
    'Bahan_Kimia',
    'Peminjaman_Alat',
    'Jurnal_Praktikum',
    'Data_Siswa',
    'E_Raport'
  ];

  for (var i = 0; i < tableKeys.length; i++) {
    var key = tableKeys[i];
    var config = INITIAL_DATABASE_SEED[key];
    if (config) {
      var res = buildFormattedSheet(ss, key, config);
      logResults.push(res);
      Logger.log('[SIMLAB SETUP] Sheet: ' + key + ' -> ' + res.status + ' (' + res.rowCount + ' baris)');
    }
  }

  // Hapus sheet default kosong bawaan (Sheet1 / Lembar 1) jika ada
  cleanDefaultSheets(ss);

  Logger.log('[SIMLAB SETUP SUKSES] Seluruh 7 tabel database SIMLAB berhasil diinisialisasi dan diformat.');
  return {
    status: 'success',
    message: 'Setup database SIMLAB berhasil diselesaikan!',
    details: logResults
  };
}

/**
 * Membuat atau memperbarui sheet dengan header dark emerald, freeze baris 1, dan data awal
 */
function buildFormattedSheet(ss, sheetKey, config) {
  var sheet = ss.getSheetByName(sheetKey);
  var isNew = false;

  if (!sheet) {
    sheet = ss.insertSheet(sheetKey);
    isNew = true;
  }

  var lastRow = sheet.getLastRow();

  // Jika sheet baru atau kosong, bersihkan dan masukkan seluruh header + baris data
  if (isNew || lastRow === 0) {
    sheet.clear();

    // 1. Set Header
    var headerRange = sheet.getRange(1, 1, 1, config.headers.length);
    headerRange.setValues([config.headers]);
    headerRange.setBackground('#064e3b'); // Dark Emerald
    headerRange.setFontColor('#ffffff'); // Pure White Text
    headerRange.setFontWeight('bold');
    headerRange.setFontFamily('Arial');
    headerRange.setFontSize(10);
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
    sheet.setRowHeight(1, 34);
    sheet.setFrozenRows(1);

    // 2. Masukkan Baris Data
    if (config.rows && config.rows.length > 0) {
      var dataRange = sheet.getRange(2, 1, config.rows.length, config.headers.length);
      dataRange.setValues(config.rows);
      dataRange.setFontFamily('Arial');
      dataRange.setFontSize(10);
      dataRange.setVerticalAlignment('middle');

      // Berikan warna baris selang-seling halus (zebra striping)
      for (var r = 2; r <= config.rows.length + 1; r++) {
        var rowRange = sheet.getRange(r, 1, 1, config.headers.length);
        sheet.setRowHeight(r, 26);
        if (r % 2 === 1) {
          rowRange.setBackground('#f8fafc'); // Slate-50 sangat lembut
        }
      }
    }

    // 3. Auto-fit lebar kolom
    for (var c = 1; c <= config.headers.length; c++) {
      sheet.autoResizeColumn(c);
    }

    return { sheet: sheetKey, status: 'created_and_seeded', rowCount: config.rows.length };
  }

  // Jika sheet sudah ada tapi datanya belum ada (hanya header baris 1)
  if (lastRow === 1 && config.rows && config.rows.length > 0) {
    var appendRange = sheet.getRange(2, 1, config.rows.length, config.headers.length);
    appendRange.setValues(config.rows);
    appendRange.setFontFamily('Arial');
    appendRange.setFontSize(10);
    appendRange.setVerticalAlignment('middle');
    return { sheet: sheetKey, status: 'seeded_existing', rowCount: config.rows.length };
  }

  return { sheet: sheetKey, status: 'already_populated', rowCount: lastRow - 1 };
}

/**
 * Menghapus Sheet default 'Sheet1' jika sudah ada sheet SIMLAB lainnya
 */
function cleanDefaultSheets(ss) {
  var defaultNames = ['Sheet1', 'Sheet 1', 'Lembar1', 'Lembar 1'];
  for (var i = 0; i < defaultNames.length; i++) {
    var def = ss.getSheetByName(defaultNames[i]);
    if (def && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(def);
      } catch (e) {
        // Abaikan jika tidak diizinkan oleh permission sheet
      }
    }
  }
}

// ==============================================================================
// 3. HANDLER GET (READ DATA & HTTP AUTO-SETUP)
// ==============================================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  var sheetParam = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : '';

  // 1. Eksekusi manual Inisialisasi Database via HTTP: ?action=setupDatabase
  if (action === 'setupDatabase' || action === 'init') {
    var setupRes = setupDatabase();
    return createJsonResponse({
      status: 'success',
      action: 'setupDatabase',
      message: 'Seluruh tabel SIMLAB berhasil dibuat, diformat, dan diisi data prototype!',
      details: setupRes.details
    });
  }

  // 2. Pengambilan data spesifik satu sheet: ?action=getData&sheet=Stok_Alat
  if (action === 'getData' && sheetParam) {
    return handleGetData(sheetParam);
  }

  // 3. Pemeriksaan Database Otomatis: jika sheet belum ada, jalankan setupDatabase!
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var checkSheet = ss.getSheetByName('Stok_Alat');
  var isFresh = false;

  if (!checkSheet || checkSheet.getLastRow() <= 1) {
    setupDatabase();
    isFresh = true;
  }

  var currentSheets = ss.getSheets().map(function (s) {
    return { name: s.getName(), rows: s.getLastRow() };
  });

  return createJsonResponse({
    status: 'online',
    system: 'SIMLAB Ar-Rahmah Cendekia Backend API (2026)',
    autoSetupPerformed: isFresh,
    message: isFresh
      ? 'Database kosong terdeteksi: Seluruh tabel & data awal prototype telah otomatis dibuat!'
      : 'API Google Apps Script SIMLAB aktif dan terhubung penuh.',
    sheets: currentSheets,
    timestamp: new Date().toISOString()
  });
}

function handleGetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resolvedName = resolveSheetName(ss, sheetName);
  var sheet = ss.getSheetByName(resolvedName);

  if (!sheet) {
    var seedConfig = INITIAL_DATABASE_SEED[resolvedName] || INITIAL_DATABASE_SEED[sheetName];
    if (seedConfig) {
      buildFormattedSheet(ss, resolvedName, seedConfig);
      sheet = ss.getSheetByName(resolvedName);
    }
  }

  if (!sheet) {
    return createJsonResponse({
      status: 'error',
      sheet: sheetName,
      message: 'Sheet "' + sheetName + '" tidak ditemukan di Google Spreadsheet.'
    });
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1 || lastCol === 0) {
    return createJsonResponse({
      status: 'success',
      sheet: sheetName,
      count: 0,
      data: []
    });
  }

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var rows = [];

  for (var r = 1; r < values.length; r++) {
    var rowObj = {};
    var hasContent = false;
    for (var c = 0; c < headers.length; c++) {
      var key = String(headers[c]).trim();
      var cellVal = values[r][c];
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      rowObj[key] = cellVal;
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
    sheet: sheetName,
    count: rows.length,
    data: rows
  });
}

// ==============================================================================
// 4. HANDLER POST (INSERT & UPDATE DATA DARI PROTOTYPE)
// ==============================================================================

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    var action = body.action || '';
    var sheetName = body.sheet || '';
    var data = body.data || body.record || body;

    // Pemicu setup via POST
    if (action === 'setupDatabase' || action === 'init') {
      var setupRes = setupDatabase();
      return createJsonResponse({
        status: 'success',
        action: 'setupDatabase',
        message: 'Inisialisasi database selesai.',
        details: setupRes.details
      });
    }

    if (!sheetName) {
      return createJsonResponse({
        status: 'error',
        message: 'Parameter "sheet" tidak ditentukan pada permintaan POST.'
      });
    }

    return handlePostData(sheetName, action, data);
  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: 'Kesalahan memproses permintaan POST: ' + error.toString()
    });
  }
}

function handlePostData(sheetName, action, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resolvedName = resolveSheetName(ss, sheetName);
  var sheet = ss.getSheetByName(resolvedName);

  if (!sheet) {
    var seedConfig = INITIAL_DATABASE_SEED[resolvedName] || INITIAL_DATABASE_SEED[sheetName];
    if (seedConfig) {
      buildFormattedSheet(ss, resolvedName, seedConfig);
      sheet = ss.getSheetByName(resolvedName);
    } else {
      sheet = ss.insertSheet(resolvedName);
    }
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    var headers = Object.keys(data);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#064e3b');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    lastRow = 1;
    lastCol = headers.length;
  }

  var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var newRowValues = [];

  for (var i = 0; i < existingHeaders.length; i++) {
    var headerName = String(existingHeaders[i]).trim();
    var val = data[headerName];
    if (val === undefined || val === null) {
      for (var k in data) {
        if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === headerName.toLowerCase().replace(/[^a-z0-9]/g, '')) {
          val = data[k];
          break;
        }
      }
    }
    newRowValues.push(val !== undefined && val !== null ? val : '');
  }

  sheet.appendRow(newRowValues);

  return createJsonResponse({
    status: 'success',
    action: action || 'insert',
    sheet: sheetName,
    message: 'Data berhasil disimpan ke sheet ' + sheetName,
    insertedRow: sheet.getLastRow()
  });
}

function resolveSheetName(ss, inputName) {
  if (!inputName) return 'Stok_Alat';
  var sheets = ss.getSheets();
  var cleanInput = inputName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName();
    var cleanSName = sName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanSName === cleanInput) {
      return sName;
    }
  }

  if (cleanInput === 'erapot' || cleanInput === 'eraport') {
    for (var j = 0; j < sheets.length; j++) {
      var n = sheets[j].getName().toLowerCase();
      if (n.indexOf('rap') !== -1) return sheets[j].getName();
    }
    return 'E_Raport';
  }

  return inputName;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
