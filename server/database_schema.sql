-- ==============================================================================
-- DATABASE SCHEMA SIMLAB AR-RAHMAH CENDEKIA (MySQL 8.0 / MariaDB 10.4+)
-- File: /server/database_schema.sql
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS simlab_arcss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE simlab_arcss;

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

-- Seed Data Akun Resmi Awal
INSERT INTO users (id, nama, email, password, role, status) VALUES
(1, 'Ilham Nurkholis Majid, S. Pd., Gr.', 'Ilham.nurkholis114@guru.sma.belajar.id', 'labarcss2026', 'admin', 'aktif'),
(2, 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', 'oktaviawan901@guru.smp.belajar.id', 'laboran', 'aktif'),
(3, 'Siti Aminatuh Juhriah, M. Si., Gr.', 'sitijuhriahssi21@guru.sma.belajar.id', 'laboran', 'aktif'),
(4, 'Farkhatul Amaliya, S. Pd', 'farkhatullamaliyaa@gmail.com', 'laboran', 'aktif')
ON DUPLICATE KEY UPDATE nama=VALUES(nama);

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

-- 4. TABEL PENGATURAN SISTEM WEB (pengaturan_sistem)
CREATE TABLE IF NOT EXISTS pengaturan_sistem (
  id INT PRIMARY KEY,
  nama_sistem VARCHAR(255) NOT NULL DEFAULT 'SIMLAB AR-RAHMAH CENDEKIA',
  nama_sekolah VARCHAR(255) NOT NULL DEFAULT 'SMA IT Ar-Rahmah Cendekia',
  teks_pengumuman TEXT NOT NULL,
  tipe_pengumuman ENUM('info', 'warning', 'success') DEFAULT 'info',
  tampilkan_pengumuman BOOLEAN DEFAULT TRUE,
  tahun_ajaran VARCHAR(50) DEFAULT '2026',
  sub_judul_dashboard VARCHAR(255) DEFAULT 'Sistem Rekapitulasi Stok Barang Inventaris Laboratorium IPA Terpadu',
  kontak_bantuan VARCHAR(100) DEFAULT 'Ilham.nurkholis114@guru.sma.belajar.id',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data Awal Pengaturan
INSERT INTO pengaturan_sistem (id, nama_sistem, nama_sekolah, teks_pengumuman, tipe_pengumuman, tampilkan_pengumuman, tahun_ajaran, updated_by)
VALUES (
  1,
  'SIMLAB AR-RAHMAH CENDEKIA',
  'SMA IT Ar-Rahmah Cendekia',
  'PENGUMUMAN RESMI: Rekapitulasi terpusat stok barang inventaris laboratorium IPA Tahun 2026 telah disinkronkan realtime dengan Laboratorium Fisika, Kimia, Biologi, dan IPA Terpadu SMP.',
  'info',
  1,
  '2026',
  'Ilham Nurkholis Majid, S. Pd., Gr.'
) ON DUPLICATE KEY UPDATE nama_sistem=VALUES(nama_sistem);


-- ==============================================================================
-- MODUL BUKU KENDALI PRAKTIKUM GURU & BERITA ACARA OTOMATIS (2026)
-- ==============================================================================

-- 5. TABEL KELAS PRAKTIKUM (lab_classes)
CREATE TABLE IF NOT EXISTS lab_classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_kelas VARCHAR(50) NOT NULL,
  tahun_ajaran VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kelas_tahun (nama_kelas, tahun_ajaran),
  INDEX idx_nama_kelas (nama_kelas),
  INDEX idx_tahun_ajaran (tahun_ajaran)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABEL SISWA PRAKTIKUM (lab_students)
CREATE TABLE IF NOT EXISTS lab_students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_siswa VARCHAR(150) NOT NULL,
  kelas_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_class FOREIGN KEY (kelas_id) 
    REFERENCES lab_classes(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  INDEX idx_student_kelas (kelas_id),
  INDEX idx_student_nama (nama_siswa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABEL BUKU KENDALI & BERITA ACARA PRAKTIKUM (lab_activities_records)
CREATE TABLE IF NOT EXISTS lab_activities_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal_kegiatan DATE NOT NULL,
  laboratorium ENUM('FISIKA', 'KIMIA', 'BIOLOGI', 'SMP_TERPADU') NOT NULL,
  kelas_id INT NULL,
  judul_percobaan VARCHAR(255) NOT NULL,
  materi_pokok VARCHAR(255) NULL,
  jumlah_hadir INT NOT NULL DEFAULT 0,
  jumlah_absen INT NOT NULL DEFAULT 0,
  nama_absen TEXT NULL,
  rekap_nilai_json LONGTEXT NOT NULL,
  catatan_kejadian TEXT NULL,
  guru_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_class FOREIGN KEY (kelas_id) 
    REFERENCES lab_classes(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE,
  CONSTRAINT fk_activity_guru FOREIGN KEY (guru_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE,
  INDEX idx_activity_lab (laboratorium),
  INDEX idx_activity_tanggal (tanggal_kegiatan),
  INDEX idx_activity_lab_tgl (laboratorium, tanggal_kegiatan),
  INDEX idx_activity_kelas (kelas_id),
  INDEX idx_activity_guru (guru_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- DATA SEEDER AWAL (1 Kelas Tiruan & 5 Siswa Uji Coba)
-- ==============================================================================

-- Seeder 1: Kelas Tiruan
INSERT INTO lab_classes (id, nama_kelas, tahun_ajaran) 
VALUES (1, 'XII MIPA 1', '2025/2026')
ON DUPLICATE KEY UPDATE nama_kelas=VALUES(nama_kelas), tahun_ajaran=VALUES(tahun_ajaran);

-- Seeder 2: 5 Siswa Tiruan Terhubung ke Kelas id = 1
INSERT INTO lab_students (id, nama_siswa, kelas_id) VALUES
(1, 'Ahmad Fathan Al-Ghifari', 1),
(2, 'Aisyah Putri Azzahra', 1),
(3, 'Fadhil Muhammad Rayyan', 1),
(4, 'Nabila Khairunnisa', 1),
(5, 'Zaidan Hafizh Ar-Rasyid', 1)
ON DUPLICATE KEY UPDATE nama_siswa=VALUES(nama_siswa), kelas_id=VALUES(kelas_id);

-- Seeder 3: Contoh 1 Rekaman Berita Acara & Buku Kendali Praktikum Awal
INSERT INTO lab_activities_records (
  id,
  tanggal_kegiatan,
  laboratorium,
  kelas_id,
  judul_percobaan,
  materi_pokok,
  jumlah_hadir,
  jumlah_absen,
  nama_absen,
  rekap_nilai_json,
  catatan_kejadian,
  guru_id
) VALUES (
  1,
  '2026-10-21',
  'KIMIA',
  1,
  'Titrasi Asam-Basa Menentukan Konsentrasi Larutan HCl dengan Standar NaOH 0.1 M',
  'Larutan Asam Basa & Stoikiometri Larutan',
  5,
  0,
  NULL,
  '[{"student_id":1,"nama":"Ahmad Fathan Al-Ghifari","nilai_kinerja":88,"nilai_laporan":90,"nilai_akhir":89,"status":"Hadir"},{"student_id":2,"nama":"Aisyah Putri Azzahra","nilai_kinerja":92,"nilai_laporan":94,"nilai_akhir":93,"status":"Hadir"},{"student_id":3,"nama":"Fadhil Muhammad Rayyan","nilai_kinerja":85,"nilai_laporan":88,"nilai_akhir":87,"status":"Hadir"},{"student_id":4,"nama":"Nabila Khairunnisa","nilai_kinerja":90,"nilai_laporan":92,"nilai_akhir":91,"status":"Hadir"},{"student_id":5,"nama":"Zaidan Hafizh Ar-Rasyid","nilai_kinerja":87,"nilai_laporan":89,"nilai_akhir":88,"status":"Hadir"}]',
  'Praktikum berjalan tertib, seluruh buret dan labu Erlenmeyer telah dibersihkan serta disimpan kembali ke rak B-02.',
  1
) ON DUPLICATE KEY UPDATE judul_percobaan=VALUES(judul_percobaan);
