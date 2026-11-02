<?php
// ==============================================================================
// SIMLAB AR-RAHMAH CENDEKIA - PHP BACKEND HANDLER (CLEAN RESET & AUTO PIC)
// File: /backend/import_excel_clean_reset.php
//
// Prasyarat:
// composer require phpoffice/phpspreadsheet
// ==============================================================================

require_once __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Konfigurasi Database
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
} catch (\PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Koneksi database gagal: ' . $e->getMessage()]);
    exit;
}

if (!isset($_FILES['excel_file']) || $_FILES['excel_file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Silakan upload file Excel (.xlsx/.xls) yang valid.']);
    exit;
}

$isCleanReset = !isset($_POST['clean_reset']) || $_POST['clean_reset'] !== 'false';
$filePath = $_FILES['excel_file']['tmp_name'];

// Ekstrak angka dari keterangan ('5 unit' -> 5)
function extractStockNumber($text) {
    if (empty($text)) return 0;
    if (preg_match('/(\d+(?:[.,]\d+)?)/', $text, $matches)) {
        return (int) str_replace(',', '.', $matches[1]);
    }
    return 0;
}

// Pemetaan jenis item
function mapItemType($raw) {
    $lower = strtolower(trim($raw ?? ''));
    if (strpos($lower, 'habis') !== false || strpos($lower, 'pakai') !== false || strpos($lower, 'reagen') !== false) {
        return 'reagen';
    }
    return 'alat';
}

// Ekstrak nama PIC dari baris catatan/kolom
function extractPicNamePhp($rawText, $specificPicVal = null) {
    if (!empty($specificPicVal) && strlen(trim($specificPicVal)) > 2) {
        return trim($specificPicVal);
    }
    if (empty($rawText)) return null;

    if (preg_match('/(?:pic|penanggung\s*jawab|laboran|penerima|petugas|diterima\s*oleh)\s*[:=-]?\s*([a-zA-Z\s.,\']+?)(?=[,;(]|$)/i', $rawText, $m)) {
        if (strlen(trim($m[1])) > 2) return trim($m[1]);
    }
    if (preg_match('/\b(Ust(?:h)?\.|Ustadz(?:ah)?|Bpk\.|Ibu|Pak|Dra?\.)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i', $rawText, $m)) {
        return trim($m[1] . ' ' . $m[2]);
    }
    return null;
}

// Logika 2: Cek atau daftarkan laboran baru ke tabel users
function getOrCreateLaboranUserPhp($pdo, $picRawName, $defaultLab) {
    $cleanName = trim($picRawName ?? '') ?: "Laboran " . $defaultLab;

    $stmt = $pdo->prepare('SELECT id, nama, email, role FROM users WHERE LOWER(TRIM(nama)) = LOWER(?) LIMIT 1');
    $stmt->execute([$cleanName]);
    $user = $stmt->fetch();
    if ($user) {
        return ['user_id' => $user['id'], 'pic_name' => $user['nama'], 'is_new' => false];
    }

    $slug = preg_replace('/(ustadzah|ustadz|usth|ust|bpk|ibu|pak|dr|dra|ir|s\.pd|m\.pd|gr|m\.si)\.?/i', '', strtolower($cleanName));
    $slug = trim(preg_replace('/[^a-z0-9]+/i', '.', $slug), '.');
    if (empty($slug)) $slug = 'laboran';
    $email = $slug . rand(10, 99) . '@guru.sma.belajar.id';
    $defaultPassHash = password_hash('labarcss2026', PASSWORD_DEFAULT);

    $ins = $pdo->prepare("INSERT INTO users (nama, email, password, role, status, created_at) VALUES (?, ?, ?, 'laboran', 'aktif', NOW())");
    $ins->execute([$cleanName, $email, $defaultPassHash]);

    return [
        'user_id'  => $pdo->lastInsertId(),
        'pic_name' => $cleanName,
        'email'    => $email,
        'is_new'   => true
    ];
}

try {
    $spreadsheet = IOFactory::load($filePath);
    $pdo->beginTransaction();

    // 1. KOSONGKAN DATA LAMA JIKA CLEAN RESET
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
                // TABEL 1: STOK AWAL (TA 2025/2026)
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
                // TABEL 2: STOK MASUK BARU (TA 2026/2027)
                $jumlahMasuk = extractStockNumber($row['C'] ?? $row['E'] ?? '');
                $lokasiRak = trim($row['D'] ?? '') ?: "Rak $sheetName";
                $catatanRow = implode(' ', array_filter($row));

                // Ekstrak nama PIC dan daftarkan ke tabel users jika belum ada
                $picName = extractPicNamePhp($catatanRow, $row['E'] ?? null);
                $laboran = getOrCreateLaboranUserPhp($pdo, $picName, $sheetName);
                if ($laboran['is_new']) {
                    $stats['new_users_registered'][] = $laboran;
                }

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
                    $ins = $pdo->prepare('INSERT INTO inventory (nama_barang, jenis_item, lokasi_rak, stok, laboratorium, created_at) VALUES (?, "alat", ?, ?, ?, NOW())');
                    $ins->execute([$namaBarang, $lokasiRak, $jumlahMasuk, $sheetName]);
                    $itemId = $pdo->lastInsertId();
                    $stats['stok_masuk_new']++;
                }

                // Catat log aktivitas dengan user_id laboran asli
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
            ? 'Clean Reset & Import Excel Asli Berhasil! Data imitasi AI telah dibersihkan.'
            : 'Import Excel Berhasil Disinkronkan!',
        'stats'   => $stats
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Gagal: ' . $e->getMessage()]);
}
