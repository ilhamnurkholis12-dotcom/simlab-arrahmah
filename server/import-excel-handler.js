// ==============================================================================
// SIMLAB AR-RAHMAH CENDEKIA - IMPORT EXCEL BACKEND HANDLER (NODE.JS + EXPRESS)
// File: /server/import-excel-handler.js
//
// Fitur:
// 1. Clean Reset: Mengosongkan data lama di tabel inventory & log_aktivitas
// 2. Auto-Register PIC: Membaca nama PIC dari Excel ('Ust. Fajar Ramad', dll.)
//    dan otomatis mendaftarkan ke tabel users sebagai role 'laboran'
// 3. Sinkronisasi Inventori & Log: Memasukkan data dan menautkan user_id ke PIC asli
//
// Menjalankan server:
// node server/import-excel-handler.js
// ==============================================================================

const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi upload multer (simpan file dalam memori RAM)
const upload = multer({ storage: multer.memoryStorage() });

// Konfigurasi Database MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'simlab_arcss',
  waitForConnections: true,
  connectionLimit: 10,
});

// Ekstrak angka dari teks seperti '5 unit', '12 botol' -> 5
function extractNumber(str) {
  if (!str) return 0;
  const match = String(str).match(/(\d+(?:[.,]\d+)?)/);
  return match ? Math.round(parseFloat(match[1].replace(',', '.'))) : 0;
}

// Pemetaan jenis item: 'Jangka panjang' -> 'alat', 'Habis pakai' -> 'reagen'
function mapJenisItem(raw) {
  if (!raw) return 'alat';
  const lower = String(raw).toLowerCase();
  if (lower.includes('habis') || lower.includes('pakai') || lower.includes('reagen') || lower.includes('kimia')) {
    return 'reagen';
  }
  return 'alat';
}

// Aturan Ketat 1, 2, 3: Resolusi hanya ke 4 Akun Resmi SIMLAB (TANPA MEMBUAT USER BARU)
// 1. Matikan fungsi yang mendaftarkan/INSERT INTO users
// 2. Kunci ke 4 akun resmi via substring matching ('Oktaviawan', 'Ilham', 'Siti'/'Aminatuh', 'Farkhatul')
// 3. Fallback jika kosong atau tidak cocok -> Kepala Lab: Ilham Nurkholis Majid, S. Pd., Gr.
async function resolveOfficialLaboranUser(connection, rawPicText) {
  const str = String(rawPicText || '').toLowerCase();
  let targetEmail = 'Ilham.nurkholis114@guru.sma.belajar.id';
  let targetName = 'Ilham Nurkholis Majid, S. Pd., Gr.';

  if (str.includes('oktaviawan')) {
    targetEmail = 'oktaviawan901@guru.smp.belajar.id';
    targetName = 'Oktaviawan Arif Sudarsono, M. Pd., Gr.';
  } else if (str.includes('ilham')) {
    targetEmail = 'Ilham.nurkholis114@guru.sma.belajar.id';
    targetName = 'Ilham Nurkholis Majid, S. Pd., Gr.';
  } else if (str.includes('siti') || str.includes('aminatuh')) {
    targetEmail = 'sitijuhriahssi21@guru.sma.belajar.id';
    targetName = 'Siti Aminatuh Juhriah, M. Si., Gr.';
  } else if (str.includes('farkhatul')) {
    targetEmail = 'farkhatullamaliyaa@gmail.com';
    targetName = 'Farkhatul Amaliya, S. Pd';
  } else {
    // Fallback otomatis ke Kepala Lab
    targetEmail = 'Ilham.nurkholis114@guru.sma.belajar.id';
    targetName = 'Ilham Nurkholis Majid, S. Pd., Gr.';
  }

  let userId = null;
  if (connection) {
    try {
      const [rows] = await connection.execute(
        'SELECT id, nama, email FROM users WHERE LOWER(TRIM(email)) = LOWER(?) LIMIT 1',
        [targetEmail]
      );
      if (rows.length > 0) {
        userId = rows[0].id;
        targetName = rows[0].nama;
      }
    } catch (e) {
      // ignore
    }
  }

  return {
    userId,
    picName: targetName,
    email: targetEmail,
  };
}

// Endpoint: POST /api/inventory/import-excel
app.post('/api/inventory/import-excel', upload.single('excel_file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File Excel (.xlsx/.xls) wajib diunggah.' });
  }

  const isCleanReset = req.body.clean_reset !== 'false';
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. KOSONGKAN DATA LAMA JIKA CLEAN RESET AKTIF
    if (isCleanReset) {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      await connection.query('TRUNCATE TABLE log_aktivitas');
      await connection.query('TRUNCATE TABLE inventory');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('Clean Reset Berhasil: Seluruh isi inventory & log_aktivitas dikosongkan.');
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    let totalStokAwal = 0;
    let totalStokMasukUpdated = 0;
    let totalStokMasukCreated = 0;
    const registeredUsers = [];

    // Loop semua sheet laboratorium (FISIKA, KIMIA, BIOLOGI, SMP)
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rows || rows.length === 0) continue;

      let isSection2 = false;
      let namaCol = 1, jenisCol = 2, rakCol = 3, ketCol = 4, picCol = -1;

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const rowStr = row.join(' ').toLowerCase();

        // Deteksi pembatas Tabel 2: Stok Masuk Baru
        if (rowStr.includes('stok masuk') || rowStr.includes('masuk baru') || rowStr.includes('ta 2026') || rowStr.includes('pengadaan baru')) {
          isSection2 = true;
          continue;
        }

        // Deteksi header kolom
        if (rowStr.includes('nama alat') || rowStr.includes('nama bahan') || rowStr.includes('nama barang')) {
          row.forEach((col, idx) => {
            const h = String(col).toLowerCase();
            if (/(pic|penanggung|pj|laboran|penerima|petugas)/i.test(h)) picCol = idx;
            if (/(penyimpanan|lokasi|rak)/i.test(h)) rakCol = idx;
            if (/(keterangan|jumlah|qty|stok)/i.test(h) && isSection2) ketCol = idx;
          });
          continue;
        }

        const namaBarang = String(row[namaCol] || '').trim();
        if (!namaBarang || /^(no|nomor|nama|total|jumlah)$/i.test(namaBarang)) continue;

        if (!isSection2) {
          // --- TABEL 1: STOK AWAL (TA 2025/2026) ---
          const jenisItem = mapJenisItem(row[jenisCol]);
          const lokasiRak = String(row[rakCol] || '').trim() || `Rak ${sheetName}`;
          const stok = extractNumber(row[ketCol]);

          const [existing] = await connection.execute(
            'SELECT id FROM inventory WHERE LOWER(TRIM(nama_barang)) = LOWER(?) LIMIT 1',
            [namaBarang]
          );

          if (existing.length === 0) {
            await connection.execute(
              `INSERT INTO inventory (nama_barang, jenis_item, lokasi_rak, stok, laboratorium, created_at)
               VALUES (?, ?, ?, ?, ?, NOW())`,
              [namaBarang, jenisItem, lokasiRak, stok, sheetName]
            );
            totalStokAwal++;
          }
        } else {
          // --- TABEL 2: STOK MASUK BARU (TA 2026/2027) ---
          const jumlahMasuk = extractNumber(row[ketCol] || row[jenisCol]) || 1;
          const lokasiRak = String(row[rakCol] || '').trim() || `Rak ${sheetName}`;
          const rawRowStr = row.join(' ');
          const specificPicVal = picCol !== -1 ? row[picCol] : null;

          // Aturan Ketat: Resolusi nama & ID ke 4 Akun Resmi Saja (tanpa membuat user baru)
          const combinedPicVal = `${specificPicVal || ''} ${rawRowStr}`;
          const laboran = await resolveOfficialLaboranUser(connection, combinedPicVal);

          const [existing] = await connection.execute(
            'SELECT id, stok FROM inventory WHERE LOWER(TRIM(nama_barang)) = LOWER(?) LIMIT 1',
            [namaBarang]
          );

          let itemId;
          if (existing.length > 0) {
            itemId = existing[0].id;
            const newStock = existing[0].stok + jumlahMasuk;
            await connection.execute(
              'UPDATE inventory SET stok = ?, updated_at = NOW() WHERE id = ?',
              [newStock, itemId]
            );
            totalStokMasukUpdated++;
          } else {
            const jenisItemBaru = mapJenisItem(namaBarang + ' ' + (row[jenisCol] || ''));
            const [insertResult] = await connection.execute(
              `INSERT INTO inventory (nama_barang, jenis_item, lokasi_rak, stok, laboratorium, created_at)
               VALUES (?, ?, ?, ?, ?, NOW())`,
              [namaBarang, jenisItemBaru, lokasiRak, jumlahMasuk, sheetName]
            );
            itemId = insertResult.insertId;
            totalStokMasukCreated++;
          }

          // Catat riwayat di log_aktivitas dan hubungkan user_id ke akun laboran asli
          await connection.execute(
            `INSERT INTO log_aktivitas (item_id, user_id, pic_name, nama_barang, jenis_aksi, jumlah, laboratorium, keterangan, created_at)
             VALUES (?, ?, ?, ?, 'masuk', ?, ?, ?, NOW())`,
            [
              itemId,
              laboran.userId,
              laboran.picName,
              namaBarang,
              jumlahMasuk,
              sheetName,
              `Stok Masuk Baru TA 2026/2027 (PIC: ${laboran.picName})`,
            ]
          );
        }
      }
    }

    await connection.commit();

    return res.json({
      success: true,
      message: isCleanReset
        ? 'Clean Reset & Import Excel Asli Berhasil! Data dummy bawaan AI telah dihapus sepenuhnya.'
        : 'Import Excel Berhasil Disinkronkan!',
      stats: {
        cleanResetExecuted: isCleanReset,
        totalStokAwal,
        totalStokMasukUpdated,
        totalStokMasukCreated,
        totalTransactions: totalStokMasukUpdated + totalStokMasukCreated,
        officialAccountsLocked: true,
        newUsersRegistered: [],
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error saat import excel:', err);
    return res.status(500).json({ success: false, message: 'Gagal: ' + err.message });
  } finally {
    connection.release();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend Server SIMLAB berjalan pada port ${PORT}`);
  console.log(`Endpoint Import: POST http://localhost:${PORT}/api/inventory/import-excel`);
});
