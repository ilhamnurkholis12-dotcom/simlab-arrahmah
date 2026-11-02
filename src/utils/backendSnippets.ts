/**
 * Panduan & Kode Backend Lengkap Pengolah Import Excel
 * dengan Fitur Clean Reset (Pembersihan Total Data Imitasi AI)
 * dan Otomatisasi Pendaftaran Akun PIC/Laboran Baru
 * 
 * untuk SIMLAB AR-RAHMAH CENDEKIA
 * Tersedia dalam Node.js (Express + xlsx + mysql2) & PHP (PhpSpreadsheet + PDO MySQL)
 */

export const NODEJS_BACKEND_CODE = `// ==============================================================================
// 1. BACKEND NODE.JS + EXPRESS (MENGGUNAKAN LIBRARY 'xlsx' & 'mysql2')
// Penempatan File: server/controllers/inventoryImportController.js
// atau server/import-excel-handler.js
//
// Instalasi library yang dibutuhkan:
// npm install express xlsx multer cors dotenv mysql2 bcryptjs
// ==============================================================================

const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi upload multer (simpan file di memori server)
const upload = multer({ storage: multer.memoryStorage() });

// Konfigurasi Koneksi Database MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'simlab_arcss',
  waitForConnections: true,
  connectionLimit: 10,
});

// Helper regex untuk mengekstrak angka dari keterangan/kuantitas ('5 unit' -> 5)
function extractNumber(str) {
  if (!str) return 0;
  const match = String(str).match(/(\\d+(?:[.,]\\d+)?)/);
  return match ? Math.round(parseFloat(match[1].replace(',', '.'))) : 0;
}

// Helper pemetaan jenis item (Jangka panjang -> alat, Habis pakai -> reagen)
function mapJenisItem(raw) {
  if (!raw) return 'alat';
  const lower = String(raw).toLowerCase();
  if (lower.includes('habis') || lower.includes('pakai') || lower.includes('reagen') || lower.includes('kimia')) {
    return 'reagen';
  }
  return 'alat';
}

// Helper pembersih teks catatan pengadaan dan pemetaan pejabat resmi
function cleanNameText(text) {
  if (!text) return '';
  let str = String(text).trim();

  // Aturan Pemetaan Nama Resmi
  if (/oktaviawan/i.test(str)) {
    return 'Oktaviawan Arif Sudarsono, M. Pd., Gr';
  }
  if (/ilham/i.test(str)) {
    return 'Ilham Nurkholis Majid, S. Pd., Gr.';
  }
  if (/siti|aminatuh/i.test(str)) {
    return 'Siti Aminatuh Juhriah, M. Si., Gr.';
  }
  if (/farkhatul/i.test(str)) {
    return 'Farkhatul Amaliya, S. Pd';
  }

  // Bersihkan teks pengantar pengadaan seperti 'Restok Tambahan (PIC: ...)' atau 'Alat Baru TA 2026/2027'
  str = str.replace(
    /^(?:restok\\s*tambahan|restok|pengadaan(?:\\s*baru|\\s*apbd|\\s*ta)?(?:\\s*\\d{4}(?:\\/\\d{4})?)?|alat\\s*baru(?:\\s*ta)?(?:\\s*\\d{4}(?:\\/\\d{4})?)?)\\s*[:(-]?\\s*/gi,
    ''
  );
  str = str.replace(
    /^(?:pic|penanggung\\s*jawab|laboran|penerima|petugas|diterima\\s*oleh|diserahkan\\s*ke)\\s*[:=-]?\\s*/gi,
    ''
  );
  str = str.replace(/[)\\]]+$/g, '').trim();

  // Evaluasi ulang setelah dibersihkan
  if (/oktaviawan/i.test(str)) return 'Oktaviawan Arif Sudarsono, M. Pd., Gr';
  if (/ilham/i.test(str)) return 'Ilham Nurkholis Majid, S. Pd., Gr.';
  if (/siti|aminatuh/i.test(str)) return 'Siti Aminatuh Juhriah, M. Si., Gr.';
  if (/farkhatul/i.test(str)) return 'Farkhatul Amaliya, S. Pd';

  return str;
}

// Ekstrak nama PIC dari kolom atau teks catatan pengadaan
function extractPicName(rawText, specificPicCol) {
  const combined = \`\${specificPicCol || ''} \${rawText || ''}\`;

  // 1. Prioritas Utama: Cek 4 Pejabat / Laboran Resmi Berdasarkan Kata Kunci
  if (/oktaviawan/i.test(combined)) {
    return 'Oktaviawan Arif Sudarsono, M. Pd., Gr';
  }
  if (/ilham/i.test(combined)) {
    return 'Ilham Nurkholis Majid, S. Pd., Gr.';
  }
  if (/siti|aminatuh/i.test(combined)) {
    return 'Siti Aminatuh Juhriah, M. Si., Gr.';
  }
  if (/farkhatul/i.test(combined)) {
    return 'Farkhatul Amaliya, S. Pd';
  }

  // 2. Jika ada nilai kolom spesifik PIC / Catatan Pengadaan
  if (specificPicCol && String(specificPicCol).trim().length > 2) {
    const val = String(specificPicCol).trim();

    // Cek label PIC di dalam kolom (misal: "Restok Tambahan (PIC: Usth. Dewi Kartik)")
    const labelInCol = val.match(
      /(?:pic|penanggung\\s*jawab|laboran|penerima|petugas|diterima\\s*oleh|diserahkan\\s*ke)\\s*[:=-]?\\s*([a-zA-Z\\s.,']+?)(?=[)\\];,]|$|(?:\\s+(?:untuk|pada|di|via|tgl|ta|dengan)))/i
    );
    if (labelInCol && labelInCol[1].trim().length > 2) {
      const cleaned = cleanNameText(labelInCol[1]);
      if (cleaned.length > 2) return cleaned;
    }

    // Cek gelar kehormatan di kolom (misal: "Ust. Fajar Ramad")
    const honorificInCol = val.match(
      /\\b(Ust(?:h)?\\.|Ustadz(?:ah)?|Bpk\\.|Ibu|Pak|Dra?\\.)\\s+([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)*)/i
    );
    if (honorificInCol) {
      return \`\${honorificInCol[1]} \${honorificInCol[2]}\`.trim();
    }

    if (!/^(no|nomor|jumlah|qty|stok|unit|item|ket|keterangan|restok|pengadaan|alat baru)/i.test(val)) {
      const cleaned = cleanNameText(val);
      if (cleaned.length > 2 && !/^(restok|pengadaan|alat baru)/i.test(cleaned)) {
        return cleaned;
      }
    }
  }

  if (!rawText) return null;

  // 3. Cari dari label eksplisit pada seluruh baris
  const labelMatch = String(rawText).match(
    /(?:pic|penanggung\\s*jawab|laboran|penerima|petugas|diterima\\s*oleh|diserahkan\\s*ke)\\s*[:=-]?\\s*([a-zA-Z\\s.,']+?)(?=[)\\];,]|$|(?:\\s+(?:untuk|pada|di|via|tgl|ta|dengan)))/i
  );
  if (labelMatch && labelMatch[1].trim().length > 2) {
    const cleaned = cleanNameText(labelMatch[1]);
    if (cleaned.length > 2 && !/^(restok|pengadaan|alat baru)/i.test(cleaned)) {
      return cleaned;
    }
  }

  // 4. Cari dari gelar kehormatan pada seluruh baris
  const honorificMatch = String(rawText).match(
    /\\b(Ust(?:h)?\\.|Ustadz(?:ah)?|Bpk\\.|Ibu|Pak|Dra?\\.)\\s+([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)*)/i
  );
  if (honorificMatch) {
    return \`\${honorificMatch[1]} \${honorificMatch[2]}\`.trim();
  }

  return null;
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
    // Fallback otomatis ke Kepala Lab Utama
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

// ==============================================================================
// ENDPOINT UTAMA: POST /api/inventory/import-excel
// Body params:
//   - excel_file: file binary (multipart/form-data)
//   - clean_reset: 'true' (opsional, default 'true' untuk membersihkan data dummy AI)
// ==============================================================================
app.post('/api/inventory/import-excel', upload.single('excel_file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File Excel (.xlsx/.xls) wajib diunggah.' });
  }

  const isCleanReset = req.body.clean_reset !== 'false';
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // --------------------------------------------------------------------------
    // LOGIKA 1: KOSONGKAN DATA LAMA (CLEAN RESET DATA DUMMY AI)
    // --------------------------------------------------------------------------
    if (isCleanReset) {
      console.log('Menjalankan Clean Reset: Menghapus data imitasi AI lama...');
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      await connection.query('TRUNCATE TABLE log_aktivitas');
      await connection.query('TRUNCATE TABLE inventory');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // Baca buffer workbook Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    let totalStokAwal = 0;
    let totalStokMasukUpdated = 0;
    let totalStokMasukCreated = 0;
    const registeredUsers = [];

    // Loop setiap sheet laboratorium (FISIKA, KIMIA, BIOLOGI, SMP_TERPADU)
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rows || rows.length === 0) continue;

      let isSection2 = false;
      let namaCol = 1, jenisCol = 2, rakCol = 3, ketCol = 4, picCol = -1;

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const rowStr = row.join(' ').toLowerCase();

        // Deteksi pembatas vertikal Tabel 2: Stok Masuk Baru
        if (rowStr.includes('stok masuk') || rowStr.includes('masuk baru') || rowStr.includes('ta 2026') || rowStr.includes('pengadaan baru')) {
          isSection2 = true;
          continue;
        }

        // Deteksi baris header untuk membaca posisi kolom secara dinamis
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
          // --------------------------------------------------------------------
          // LOGIKA 3A: TABEL ATAS - STOK AWAL (TA 2025/2026)
          // --------------------------------------------------------------------
          const jenisItem = mapJenisItem(row[jenisCol]);
          const lokasiRak = String(row[rakCol] || '').trim() || \`Rak \${sheetName}\`;
          const stok = extractNumber(row[ketCol]);

          const [existing] = await connection.execute(
            'SELECT id FROM inventory WHERE LOWER(TRIM(nama_barang)) = LOWER(?) LIMIT 1',
            [namaBarang]
          );

          if (existing.length === 0) {
            await connection.execute(
              \`INSERT INTO inventory (nama_barang, jenis_item, lokasi_rak, stok, laboratorium, created_at)
               VALUES (?, ?, ?, ?, ?, NOW())\`,
              [namaBarang, jenisItem, lokasiRak, stok, sheetName]
            );
            totalStokAwal++;
          }
        } else {
          // --------------------------------------------------------------------
          // LOGIKA 3B: TABEL BAWAH - STOK MASUK BARU (TA 2026/2027)
          // --------------------------------------------------------------------
          const jumlahMasuk = extractNumber(row[ketCol] || row[jenisCol]) || 1;
          const lokasiRak = String(row[rakCol] || '').trim() || \`Rak \${sheetName}\`;
          const rawRowStr = row.join(' ');
          const specificPicVal = picCol !== -1 ? row[picCol] : null;

          // Aturan Ketat 1, 2, 3: Resolusi hanya ke 4 Akun Resmi Saja (tanpa membuat user baru)
          const combinedPicVal = \`\${specificPicVal || ''} \${rawRowStr}\`;
          const laboran = await resolveOfficialLaboranUser(connection, combinedPicVal);

          // Periksa apakah nama barang sudah ada di inventory
          const [existing] = await connection.execute(
            'SELECT id, stok FROM inventory WHERE LOWER(TRIM(nama_barang)) = LOWER(?) LIMIT 1',
            [namaBarang]
          );

          let itemId;
          if (existing.length > 0) {
            // A. BARANG SUDAH ADA: Tambahkan jumlah stoknya
            itemId = existing[0].id;
            const newStock = existing[0].stok + jumlahMasuk;
            await connection.execute(
              'UPDATE inventory SET stok = ?, updated_at = NOW() WHERE id = ?',
              [newStock, itemId]
            );
            totalStokMasukUpdated++;
          } else {
            // B. BARANG BELUM ADA: Buat baris barang baru di inventory (alat / reagen)
            const jenisItemBaru = mapJenisItem(namaBarang + ' ' + (row[jenisCol] || ''));
            const [insertResult] = await connection.execute(
              \`INSERT INTO inventory (nama_barang, jenis_item, lokasi_rak, stok, laboratorium, created_at)
               VALUES (?, ?, ?, ?, ?, NOW())\`,
              [namaBarang, jenisItemBaru, lokasiRak, jumlahMasuk, sheetName]
            );
            itemId = insertResult.insertId;
            totalStokMasukCreated++;
          }

          // LOGIKA 3C: Catat riwayat di log_aktivitas dan tautkan user_id ke akun laboran asli
          await connection.execute(
            \`INSERT INTO log_aktivitas (item_id, user_id, pic_name, nama_barang, jenis_aksi, jumlah, laboratorium, keterangan, created_at)
             VALUES (?, ?, ?, ?, 'masuk', ?, ?, ?, NOW())\`,
            [
              itemId,
              laboran.userId,
              laboran.picName,
              namaBarang,
              jumlahMasuk,
              sheetName,
              \`Stok Masuk Baru TA 2026/2027 (PIC: \${laboran.picName})\`,
            ]
          );
        }
      }
    }

    await connection.commit();

    return res.json({
      success: true,
      message: isCleanReset
        ? 'Clean Reset & Import Excel Asli Berhasil! Data dummy lama terhapus sepenuhnya.'
        : 'Import Excel Berhasil Diperbarui!',
      stats: {
        cleanResetExecuted: isCleanReset,
        totalStokAwal,
        totalStokMasukUpdated,
        totalStokMasukCreated,
        totalTransactions: totalStokMasukUpdated + totalStokMasukCreated,
        newUsersRegistered: registeredUsers,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error saat import excel:', err);
    return res.status(500).json({ success: false, message: 'Gagal import: ' + err.message });
  } finally {
    connection.release();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(\`Backend SIMLAB aktif pada port \${PORT}\`));
`;

export const PHP_BACKEND_CODE = `<?php
// ==============================================================================
// 2. BACKEND PHP (NATIVE / LARAVEL CONTROLLER)
// Penempatan File:
// - Native PHP: backend/import_excel_clean_reset.php
// - Laravel: app/Http/Controllers/InventoryImportController.php
//
// Library yang dibutuhkan:
// composer require phpoffice/phpspreadsheet
// ==============================================================================

require_once __DIR__ . '/vendor/autoload.php';

use PhpOffice\\PhpSpreadsheet\\IOFactory;

header('Content-Type: application/json');

// Koneksi Database MySQL via PDO
$host = 'localhost';
$db   = 'simlab_arcss';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\\PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Koneksi database gagal: ' . $e->getMessage()]);
    exit;
}

if (!isset($_FILES['excel_file']) || $_FILES['excel_file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Silakan upload file Excel yang valid.']);
    exit;
}

$isCleanReset = !isset($_POST['clean_reset']) || $_POST['clean_reset'] !== 'false';
$filePath = $_FILES['excel_file']['tmp_name'];

// Helper Ekstrak Angka Stok ('5 unit' -> 5)
function extractStockNumber($text) {
    if (empty($text)) return 0;
    if (preg_match('/(\\d+(?:[.,]\\d+)?)/', $text, $matches)) {
        return (int) str_replace(',', '.', $matches[1]);
    }
    return 0;
}

// Helper Pemetaan Jenis Item
function mapItemType($raw) {
    $lower = strtolower(trim($raw ?? ''));
    if (strpos($lower, 'habis') !== false || strpos($lower, 'pakai') !== false || strpos($lower, 'reagen') !== false) {
        return 'reagen';
    }
    return 'alat';
}

// Helper pembersih teks catatan pengadaan dan pemetaan pejabat resmi
function cleanNameTextPhp($text) {
    if (empty($text)) return '';
    $str = trim((string)$text);

    // Aturan Pemetaan Nama Resmi
    if (preg_match('/oktaviawan/i', $str)) return 'Oktaviawan Arif Sudarsono, M. Pd., Gr';
    if (preg_match('/ilham/i', $str)) return 'Ilham Nurkholis Majid, S. Pd., Gr.';
    if (preg_match('/siti\\s*aminatuh/i', $str)) return 'Siti Aminatuh Juhriah, M. Si., Gr.';
    if (preg_match('/farkhatul/i', $str)) return 'Farkhatul Amaliya, S. Pd';

    // Bersihkan teks pengantar pengadaan
    $str = preg_replace('/^(?:restok\\s*tambahan|restok|pengadaan(?:\\s*baru|\\s*apbd|\\s*ta)?(?:\\s*\\d{4}(?:\\/\\d{4})?)?|alat\\s*baru(?:\\s*ta)?(?:\\s*\\d{4}(?:\\/\\d{4})?)?)\\s*[:(-]?\\s*/i', '', $str);
    $str = preg_replace('/^(?:pic|penanggung\\s*jawab|laboran|penerima|petugas|diterima\\s*oleh|diserahkan\\s*ke)\\s*[:=-]?\\s*/i', '', $str);
    $str = trim(preg_replace('/[)\\]]+$/', '', $str));

    if (preg_match('/oktaviawan/i', $str)) return 'Oktaviawan Arif Sudarsono, M. Pd., Gr';
    if (preg_match('/ilham/i', $str)) return 'Ilham Nurkholis Majid, S. Pd., Gr.';
    if (preg_match('/siti|aminatuh/i', $str)) return 'Siti Aminatuh Juhriah, M. Si., Gr.';
    if (preg_match('/farkhatul/i', $str)) return 'Farkhatul Amaliya, S. Pd';

    return $str;
}

// Helper Ekstrak Nama PIC dari baris (misal 'Ust. Fajar Ramad', 'Usth. Dewi Kartik')
function extractPicNamePhp($rawText, $specificPicVal = null) {
    $combined = ($specificPicVal ?? '') . ' ' . ($rawText ?? '');

    // 1. Prioritas Utama: Cek 4 Pejabat / Laboran Resmi
    if (preg_match('/oktaviawan/i', $combined)) return 'Oktaviawan Arif Sudarsono, M. Pd., Gr';
    if (preg_match('/ilham/i', $combined)) return 'Ilham Nurkholis Majid, S. Pd., Gr.';
    if (preg_match('/siti|aminatuh/i', $combined)) return 'Siti Aminatuh Juhriah, M. Si., Gr.';
    if (preg_match('/farkhatul/i', $combined)) return 'Farkhatul Amaliya, S. Pd';

    // 2. Jika ada nilai kolom spesifik
    if (!empty($specificPicVal) && strlen(trim($specificPicVal)) > 2) {
        $val = trim($specificPicVal);

        if (preg_match('/(?:pic|penanggung\\s*jawab|laboran|penerima|petugas|diterima\\s*oleh|diserahkan\\s*ke)\\s*[:=-]?\\s*([a-zA-Z\\s.,\']+?)(?=[)\\];,]|$)/i', $val, $m)) {
            if (strlen(trim($m[1])) > 2) return cleanNameTextPhp($m[1]);
        }
        if (preg_match('/\\b(Ust(?:h)?\\.|Ustadz(?:ah)?|Bpk\\.|Ibu|Pak|Dra?\\.)\\s+([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)*)/i', $val, $m)) {
            return trim($m[1] . ' ' . $m[2]);
        }
        if (!preg_match('/^(no|nomor|jumlah|qty|stok|unit|item|ket|keterangan|restok|pengadaan|alat baru)/i', $val)) {
            $cleaned = cleanNameTextPhp($val);
            if (strlen($cleaned) > 2 && !preg_match('/^(restok|pengadaan|alat baru)/i', $cleaned)) {
                return $cleaned;
            }
        }
    }

    if (empty($rawText)) return null;

    if (preg_match('/(?:pic|penanggung\\s*jawab|laboran|penerima|petugas|diterima\\s*oleh|diserahkan\\s*ke)\\s*[:=-]?\\s*([a-zA-Z\\s.,\']+?)(?=[)\\];,]|$)/i', $rawText, $m)) {
        if (strlen(trim($m[1])) > 2) {
            $cleaned = cleanNameTextPhp($m[1]);
            if (strlen($cleaned) > 2 && !preg_match('/^(restok|pengadaan|alat baru)/i', $cleaned)) return $cleaned;
        }
    }
    if (preg_match('/\\b(Ust(?:h)?\\.|Ustadz(?:ah)?|Bpk\\.|Ibu|Pak|Dra?\\.)\\s+([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)*)/i', $rawText, $m)) {
        return trim($m[1] . ' ' . $m[2]);
    }
    return null;
}

// Aturan Ketat 1, 2, 3: Resolusi hanya ke 4 Akun Resmi SIMLAB (TANPA MEMBUAT USER BARU)
// 1. Matikan fungsi yang mendaftarkan/INSERT INTO users
// 2. Kunci ke 4 akun resmi via substring matching ('Oktaviawan', 'Ilham', 'Siti'/'Aminatuh', 'Farkhatul')
// 3. Fallback jika kosong atau tidak cocok -> Kepala Lab: Ilham Nurkholis Majid, S. Pd., Gr.
function resolveOfficialLaboranUserPhp($pdo, $rawPicText) {
    $str = strtolower(trim((string)$rawPicText));
    $targetEmail = 'Ilham.nurkholis114@guru.sma.belajar.id';
    $targetName = 'Ilham Nurkholis Majid, S. Pd., Gr.';

    if (strpos($str, 'oktaviawan') !== false) {
        $targetEmail = 'oktaviawan901@guru.smp.belajar.id';
        $targetName = 'Oktaviawan Arif Sudarsono, M. Pd., Gr.';
    } elseif (strpos($str, 'ilham') !== false) {
        $targetEmail = 'Ilham.nurkholis114@guru.sma.belajar.id';
        $targetName = 'Ilham Nurkholis Majid, S. Pd., Gr.';
    } elseif (strpos($str, 'siti') !== false || strpos($str, 'aminatuh') !== false) {
        $targetEmail = 'sitijuhriahssi21@guru.sma.belajar.id';
        $targetName = 'Siti Aminatuh Juhriah, M. Si., Gr.';
    } elseif (strpos($str, 'farkhatul') !== false) {
        $targetEmail = 'farkhatullamaliyaa@gmail.com';
        $targetName = 'Farkhatul Amaliya, S. Pd';
    } else {
        // Fallback otomatis ke Kepala Lab Utama
        $targetEmail = 'Ilham.nurkholis114@guru.sma.belajar.id';
        $targetName = 'Ilham Nurkholis Majid, S. Pd., Gr.';
    }

    $userId = null;
    if ($pdo) {
        try {
            $stmt = $pdo->prepare('SELECT id, nama FROM users WHERE LOWER(TRIM(email)) = LOWER(?) LIMIT 1');
            $stmt->execute([$targetEmail]);
            $u = $stmt->fetch();
            if ($u) {
                $userId = $u['id'];
                $targetName = $u['nama'];
            }
        } catch (\\Exception $e) {
            // ignore
        }
    }

    return [
        'user_id'  => $userId,
        'pic_name' => $targetName,
        'email'    => $targetEmail
    ];
}

try {
    $spreadsheet = IOFactory::load($filePath);
    $pdo->beginTransaction();

    // --------------------------------------------------------------------------
    // LOGIKA 1: KOSONGKAN DATA LAMA (CLEAN RESET DATA DUMMY AI)
    // --------------------------------------------------------------------------
    if ($isCleanReset) {
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        $pdo->exec('TRUNCATE TABLE log_aktivitas');
        $pdo->exec('TRUNCATE TABLE inventory');
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    }

    $stats = [
        'clean_reset'           => $isCleanReset,
        'stok_awal_inserted'    => 0,
        'stok_masuk_updated'    => 0,
        'stok_masuk_new'        => 0,
        'log_aktivitas_created' => 0,
        'new_users_registered'  => []
    ];

    foreach ($spreadsheet->getSheetNames() as $sheetName) {
        $sheet = $spreadsheet->getSheetByName($sheetName);
        $rows = $sheet->toArray(null, true, true, true);

        $isSection2 = false;

        foreach ($rows as $r => $row) {
            $rowString = strtolower(implode(' ', array_filter($row)));

            // Deteksi pembatas vertikal Tabel 2: Stok Masuk Baru
            if (strpos($rowString, 'stok masuk') !== false || strpos($rowString, 'masuk baru') !== false || strpos($rowString, 'ta 2026') !== false) {
                $isSection2 = true;
                continue;
            }

            if (strpos($rowString, 'nama alat') !== false || strpos($rowString, 'nama barang') !== false || strpos($rowString, 'stok awal') !== false) {
                continue;
            }

            $namaBarang = trim($row['B'] ?? '');
            if (empty($namaBarang) || strtolower($namaBarang) === 'no') continue;

            if (!$isSection2) {
                // LOGIKA 3A: STOK AWAL (TA 2025/2026)
                $jenisItem = mapItemType($row['C'] ?? '');
                $lokasiRak = trim($row['D'] ?? '') ?: "Rak $sheetName";
                $stok = extractStockNumber($row['E'] ?? '');

                $stmt = $pdo->prepare('SELECT id FROM inventory WHERE LOWER(TRIM(nama_barang)) = LOWER(?) LIMIT 1');
                $stmt->execute([$namaBarang]);
                if (!$stmt->fetch()) {
                    $ins = $pdo->prepare('INSERT INTO inventory (nama_barang, jenis_item, lokasi_rak, stok, laboratorium, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
                    $ins->execute([$namaBarang, $jenisItem, $lokasiRak, $stok, $sheetName]);
                    $stats['stok_awal_inserted']++;
                }
            } else {
                // LOGIKA 3B: STOK MASUK BARU (TA 2026/2027)
                $jumlahMasuk = extractStockNumber($row['C'] ?? $row['E'] ?? '');
                $lokasiRak = trim($row['D'] ?? '') ?: "Rak $sheetName";
                $catatanRow = implode(' ', array_filter($row));

                // Aturan Ketat 1, 2, 3: Resolusi hanya ke 4 Akun Resmi Saja (tanpa membuat user baru)
                $combinedPicVal = ($row['E'] ?? '') . ' ' . $catatanRow;
                $laboran = resolveOfficialLaboranUserPhp($pdo, $combinedPicVal);

                $stmt = $pdo->prepare('SELECT id, stok FROM inventory WHERE LOWER(TRIM(nama_barang)) = LOWER(?) LIMIT 1');
                $stmt->execute([$namaBarang]);
                $existing = $stmt->fetch();

                if ($existing) {
                    $itemId = $existing['id'];
                    $newStock = (int)$existing['stok'] + $jumlahMasuk;
                    $upd = $pdo->prepare('UPDATE inventory SET stok = ?, updated_at = NOW() WHERE id = ?');
                    $upd->execute([$newStock, $itemId]);
                    $stats['stok_masuk_updated']++;
                } else {
                    $jenisItemBaru = mapItemType($namaBarang . ' ' . ($row['C'] ?? ''));
                    $ins = $pdo->prepare('INSERT INTO inventory (nama_barang, jenis_item, lokasi_rak, stok, laboratorium, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
                    $ins->execute([$namaBarang, $jenisItemBaru, $lokasiRak, $jumlahMasuk, $sheetName]);
                    $itemId = $pdo->lastInsertId();
                    $stats['stok_masuk_new']++;
                }

                // LOGIKA 3C: Catat riwayat di log_aktivitas dengan user_id laboran asli
                $log = $pdo->prepare('INSERT INTO log_aktivitas (item_id, user_id, pic_name, nama_barang, jenis_aksi, jumlah, laboratorium, keterangan, created_at) VALUES (?, ?, ?, ?, "masuk", ?, ?, ?, NOW())');
                $log->execute([
                    $itemId,
                    $laboran['user_id'],
                    $laboran['pic_name'],
                    $namaBarang,
                    $jumlahMasuk,
                    $sheetName,
                    "Stok Masuk Baru TA 2026/2027 (PIC: " . $laboran['pic_name'] . ")"
                ]);
                $stats['log_aktivitas_created']++;
            }
        }
    }

    $pdo->commit();
    echo json_encode([
        'success' => true,
        'message' => $isCleanReset
            ? 'Clean Reset & Import Excel Asli Berhasil! Seluruh data dummy AI lama telah dikosongkan.'
            : 'Import Excel Berhasil!',
        'stats'   => $stats
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Gagal: ' . $e->getMessage()]);
}
`;

export const SQL_SCHEMA_REFERENCE = `-- ==============================================================================
-- SKEMA TABEL DATABASE LENGKAP: SIMLAB AR-RAHMAH CENDEKIA (MySQL / MariaDB)
-- Menyertakan tabel: users, inventory, log_aktivitas, dan pengaturan_sistem
-- ==============================================================================

-- 1. TABEL PENGGUNA & PIC LABORAN (users)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'laboran', 'guru') DEFAULT 'laboran',
  status VARCHAR(20) DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABEL INVENTARIS ALAT & REAGEN (inventory)
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode_barang VARCHAR(50) NULL,
  nama_barang VARCHAR(255) NOT NULL,
  jenis_item ENUM('alat', 'reagen') DEFAULT 'alat',
  lokasi_rak VARCHAR(100) DEFAULT 'Rak Lab',
  stok INT NOT NULL DEFAULT 0,
  laboratorium VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nama (nama_barang),
  INDEX idx_lab (laboratorium)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABEL RIWAYAT LOG MUTASI & AKTIVITAS (log_aktivitas)
CREATE TABLE IF NOT EXISTS log_aktivitas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  user_id INT NULL,
  pic_name VARCHAR(150) NULL,
  nama_barang VARCHAR(255) NOT NULL,
  jenis_aksi ENUM('masuk', 'keluar', 'penyesuaian', 'transfer') NOT NULL,
  jumlah INT NOT NULL,
  laboratorium VARCHAR(50) NOT NULL,
  keterangan VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_jenis_aksi (jenis_aksi),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABEL PENGATURAN WEB (pengaturan_sistem)
CREATE TABLE IF NOT EXISTS pengaturan_sistem (
  id INT PRIMARY KEY,
  nama_sistem VARCHAR(255) NOT NULL DEFAULT 'SIMLAB AR-RAHMAH CENDEKIA',
  nama_sekolah VARCHAR(255) NOT NULL DEFAULT 'SMP dan SMA IT Ar-Rahmah Cendekia',
  teks_pengumuman TEXT NOT NULL,
  tipe_pengumuman ENUM('info', 'warning', 'success') DEFAULT 'info',
  tampilkan_pengumuman BOOLEAN DEFAULT TRUE,
  tahun_ajaran VARCHAR(50) DEFAULT '2026',
  sub_judul_dashboard VARCHAR(255) DEFAULT 'Sistem Rekapitulasi Stok Barang Inventaris Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia',
  kontak_bantuan VARCHAR(100) DEFAULT 'Ilham.nurkholis114@guru.sma.belajar.id',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- PERINTAH CLEAN RESET MANDIRI (Jika Ingin Dijalankan Langsung via phpMyAdmin):
-- ------------------------------------------------------------------------------
-- SET FOREIGN_KEY_CHECKS = 0;
-- TRUNCATE TABLE log_aktivitas;
-- TRUNCATE TABLE inventory;
-- SET FOREIGN_KEY_CHECKS = 1;
`;
