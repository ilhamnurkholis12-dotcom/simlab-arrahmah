/**
 * Initial Seed Dataset for SIMLAB Ar-Rahmah Cendekia Google Sheets Database
 * Matches 100% of the authentic prototype records:
 * - Pengguna (Official accounts: Ilham Nurkholis, Oktaviawan Arif, Siti Aminatuh, Farkhatul Amaliya)
 * - Stok_Alat (17 instruments & tools across Physics, Chemistry, Biology, SMP, and APD)
 * - Bahan_Kimia (Chemicals & Reagents: HCl, PP, Lugol, Biuret, Benedict, Etanol, dsb.)
 * - Peminjaman_Alat (Tool loan records with returned & damaged reports)
 * - Jurnal_Praktikum (Official teacher practical sessions)
 * - Data_Siswa (12 authentic students & rombels)
 * - E_Raport (Student practicum performance & attitude rubrics)
 */

export interface SheetSeedDefinition {
  tableName: string;
  description: string;
  headers: string[];
  records: Record<string, any>[];
  rawArray: any[][];
}

export const GAS_INITIAL_DATABASE: Record<string, SheetSeedDefinition> = {
  // 1. PENGGUNA
  Pengguna: {
    tableName: 'Pengguna',
    description: 'Akun Petugas Resmi, Laboran & Hak Akses Autentikasi',
    headers: ['ID_Pengguna', 'Nama_Lengkap', 'Email_Petugas', 'Kata_Sandi', 'Role', 'Unit_Tugas', 'NIP_ID'],
    rawArray: [
      ['ARC-2026-LAB01', 'Ilham Nurkholis Majid, S. Pd., Gr.', 'Ilham.nurkholis114@guru.sma.belajar.id', 'labarcss2026', 'KEPALA_LAB', 'ALL', '2025.14.02.03'],
      ['ARC-2026-FIS02', 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', 'oktaviawan901@guru.smp.belajar.id', 'labarcss2026', 'LABORAN_FISIKA', 'FISIKA', '2025.14.02.08'],
      ['ARC-2026-BIO04', 'Siti Aminatuh Juhriah, M. Si., Gr.', 'sitijuhriahssi21@guru.sma.belajar.id', 'labarcss2026', 'LABORAN_BIOLOGI', 'BIOLOGI', '2025.14.02.10'],
      ['ARC-2026-SMP05', 'Farkhatul Amaliya, S. Pd', 'farkhatullamaliyaa@gmail.com', 'labarcss2026', 'GURU_IPA_SMP', 'SMP_TERPADU', '-']
    ],
    records: [
      { ID_Pengguna: 'ARC-2026-LAB01', Nama_Lengkap: 'Ilham Nurkholis Majid, S. Pd., Gr.', Email_Petugas: 'Ilham.nurkholis114@guru.sma.belajar.id', Kata_Sandi: 'labarcss2026', Role: 'KEPALA_LAB', Unit_Tugas: 'ALL', NIP_ID: '2025.14.02.03' },
      { ID_Pengguna: 'ARC-2026-FIS02', Nama_Lengkap: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', Email_Petugas: 'oktaviawan901@guru.smp.belajar.id', Kata_Sandi: 'labarcss2026', Role: 'LABORAN_FISIKA', Unit_Tugas: 'FISIKA', NIP_ID: '2025.14.02.08' },
      { ID_Pengguna: 'ARC-2026-BIO04', Nama_Lengkap: 'Siti Aminatuh Juhriah, M. Si., Gr.', Email_Petugas: 'sitijuhriahssi21@guru.sma.belajar.id', Kata_Sandi: 'labarcss2026', Role: 'LABORAN_BIOLOGI', Unit_Tugas: 'BIOLOGI', NIP_ID: '2025.14.02.10' },
      { ID_Pengguna: 'ARC-2026-SMP05', Nama_Lengkap: 'Farkhatul Amaliya, S. Pd', Email_Petugas: 'farkhatullamaliyaa@gmail.com', Kata_Sandi: 'labarcss2026', Role: 'GURU_IPA_SMP', Unit_Tugas: 'SMP_TERPADU', NIP_ID: '-' }
    ]
  },

  // 2. STOK ALAT
  Stok_Alat: {
    tableName: 'Stok_Alat',
    description: 'Inventaris Lengkap Instrumen Praktikum Fisika, Kimia, Biologi & SMP Terpadu',
    headers: ['ID_Barang', 'Nama_Alat', 'Kategori', 'Sub_Lab', 'Jumlah_Stok', 'Kondisi_Baik', 'Kondisi_Rusak_Ringan', 'Kondisi_Rusak_Berat', 'Lokasi_Penyimpanan', 'Spesifikasi_Merek'],
    rawArray: [
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
    ],
    records: [
      { ID_Barang: 'FIS-26-001', Nama_Alat: 'Neraca Ohaus 311 Gram (4 Lengan)', Kategori: 'Alat Ukur & Neraca', Sub_Lab: 'FISIKA', Jumlah_Stok: 9, Kondisi_Baik: 8, Kondisi_Rusak_Ringan: 1, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Lemari Fisika A1 - Rak 1', Spesifikasi_Merek: 'Ohaus Corp USA, Ketelitian 0.01 g' },
      { ID_Barang: 'FIS-26-002', Nama_Alat: 'Jangka Sorong Stainless 0.05 mm', Kategori: 'Alat Ukur & Neraca', Sub_Lab: 'FISIKA', Jumlah_Stok: 18, Kondisi_Baik: 16, Kondisi_Rusak_Ringan: 2, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Lemari Fisika A2 - Rak Bawah', Spesifikasi_Merek: 'Tricle Brand 150mm Stainless Hardened' },
      { ID_Barang: 'FIS-26-003', Nama_Alat: 'Kit Optik Geometri Lengkap dengan Meja Optik', Kategori: 'Instrumen Optik', Sub_Lab: 'FISIKA', Jumlah_Stok: 5, Kondisi_Baik: 4, Kondisi_Rusak_Ringan: 1, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Rak Instrumen Presisi No. 04', Spesifikasi_Merek: 'Pudak Scientific - Rel Presisi 100cm' },
      { ID_Barang: 'FIS-26-004', Nama_Alat: 'Catu Daya Listrik DC/AC 0-12 Volt (Power Supply)', Kategori: 'Kit Praktikum Terpadu', Sub_Lab: 'FISIKA', Jumlah_Stok: 12, Kondisi_Baik: 11, Kondisi_Rusak_Ringan: 1, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Lemari Elektronika Fisika Lt. 2', Spesifikasi_Merek: 'Pudak 3A Proteksi Overload' },
      { ID_Barang: 'FIS-26-005', Nama_Alat: 'Multimeter Digital Auto-Ranging DT9205A', Kategori: 'Alat Ukur & Neraca', Sub_Lab: 'FISIKA', Jumlah_Stok: 9, Kondisi_Baik: 8, Kondisi_Rusak_Ringan: 1, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Lemari Instrumen Listrik A4', Spesifikasi_Merek: 'Sunwa Digital Backlit LCD' },
      { ID_Barang: 'KIM-26-001', Nama_Alat: 'Gelas Kimia (Beaker Glass) 250 mL', Kategori: 'Alat Gelas & Keramik', Sub_Lab: 'KIMIA', Jumlah_Stok: 54, Kondisi_Baik: 50, Kondisi_Rusak_Ringan: 4, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Lemari Kaca Barat - Rak 2', Spesifikasi_Merek: 'Iwaki Pyrex Borosilikat 3.3' },
      { ID_Barang: 'KIM-26-002', Nama_Alat: 'Erlenmeyer 250 mL Tahan Panas', Kategori: 'Alat Gelas & Keramik', Sub_Lab: 'KIMIA', Jumlah_Stok: 36, Kondisi_Baik: 34, Kondisi_Rusak_Ringan: 2, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Lemari Kaca Barat - Rak 3', Spesifikasi_Merek: 'Duran Schott Borosilicate' },
      { ID_Barang: 'KIM-26-003', Nama_Alat: 'Buret Titrasi 50 mL dengan Keran Teflon', Kategori: 'Alat Gelas & Keramik', Sub_Lab: 'KIMIA', Jumlah_Stok: 10, Kondisi_Baik: 9, Kondisi_Rusak_Ringan: 1, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Stand Buret Khusus Lab Kimia', Spesifikasi_Merek: 'Normax Class A Amber Marking' },
      { ID_Barang: 'KIM-26-006', Nama_Alat: 'Pipet Tetes Kaca Panjang 15 cm dengan Karet Merah', Kategori: 'Alat Gelas & Keramik', Sub_Lab: 'KIMIA', Jumlah_Stok: 65, Kondisi_Baik: 60, Kondisi_Rusak_Ringan: 5, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Laci Alat Gelas Meja Kerja', Spesifikasi_Merek: 'Pyrex Glass Dropper' },
      { ID_Barang: 'BIO-26-001', Nama_Alat: 'Mikroskop Binokuler Siswa XSZ-107BN', Kategori: 'Instrumen Optik', Sub_Lab: 'BIOLOGI', Jumlah_Stok: 14, Kondisi_Baik: 12, Kondisi_Rusak_Ringan: 2, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Lemari Kering Dehumidifier Lab Biologi', Spesifikasi_Merek: 'Olympus Compatible LED Illumination 1600x' },
      { ID_Barang: 'BIO-26-002', Nama_Alat: 'Set Preparat Awetan Sel Hewan & Tumbuhan (50 pcs)', Kategori: 'Model & Preparat Biologi', Sub_Lab: 'BIOLOGI', Jumlah_Stok: 6, Kondisi_Baik: 6, Kondisi_Rusak_Ringan: 0, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Kotak Kayu Preparat Lt. 2', Spesifikasi_Merek: 'Biological Specimen Box 50 pcs' },
      { ID_Barang: 'BIO-26-003', Nama_Alat: 'Model Kerangka Manusia Ukuran Penuh (170 cm)', Kategori: 'Model & Preparat Biologi', Sub_Lab: 'BIOLOGI', Jumlah_Stok: 2, Kondisi_Baik: 2, Kondisi_Rusak_Ringan: 0, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Pojok Anatomi Lab Sains', Spesifikasi_Merek: 'PVC Resin Standar Medis Beroda' },
      { ID_Barang: 'BIO-26-004', Nama_Alat: 'Gelas Obyek (Object Glass) & Kaca Penutup (Cover Glass)', Kategori: 'Alat Gelas & Keramik', Sub_Lab: 'BIOLOGI', Jumlah_Stok: 20, Kondisi_Baik: 20, Kondisi_Rusak_Ringan: 0, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Laci Mikroteknik Meja 1', Spesifikasi_Merek: 'Sail Brand 72 pcs/box' },
      { ID_Barang: 'SMP-26-001', Nama_Alat: 'Kit Praktikum IPA Terpadu SMP (Mekanika & Optik)', Kategori: 'Kit Praktikum Terpadu', Sub_Lab: 'SMP_TERPADU', Jumlah_Stok: 9, Kondisi_Baik: 8, Kondisi_Rusak_Ringan: 1, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Lemari Khusus SMP Terpadu Rak A', Spesifikasi_Merek: 'Pudak Scientific Kurikulum Merdeka' },
      { ID_Barang: 'SMP-26-002', Nama_Alat: 'Torso Anatomi Tubuh Manusia Mini Unisex (50 cm)', Kategori: 'Model & Preparat Biologi', Sub_Lab: 'SMP_TERPADU', Jumlah_Stok: 5, Kondisi_Baik: 4, Kondisi_Rusak_Ringan: 1, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Meja Demonstrasi Guru SMP', Spesifikasi_Merek: 'Organ Bisa Dilepas 15 Bagian' },
      { ID_Barang: 'GEN-26-001', Nama_Alat: 'Pembakar Spirtus Kaca 150 mL Lengkap Sumbu', Kategori: 'Perkakas & Keselamatan Kerja', Sub_Lab: 'ALL', Jumlah_Stok: 28, Kondisi_Baik: 26, Kondisi_Rusak_Ringan: 2, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Gudang Alat Bersama - Lemari Api', Spesifikasi_Merek: 'Kaca Tebal Tahan Tekanan & Tutup Plastik' },
      { ID_Barang: 'GEN-26-002', Nama_Alat: 'Kacamata Pengaman Praktikum (Safety Goggles)', Kategori: 'Perkakas & Keselamatan Kerja', Sub_Lab: 'ALL', Jumlah_Stok: 46, Kondisi_Baik: 42, Kondisi_Rusak_Ringan: 4, Kondisi_Rusak_Berat: 0, Lokasi_Penyimpanan: 'Box Sterilisasi APD Lt. 2', Spesifikasi_Merek: '3M Polycarbonate UV Protect Anti-Splash' }
    ]
  },

  // 3. BAHAN KIMIA
  Bahan_Kimia: {
    tableName: 'Bahan_Kimia',
    description: 'Inventaris Stok Bahan Kimia & Reagen Laboratorium IPA',
    headers: ['ID_Bahan', 'Nama_Bahan', 'Rumus_Kimia', 'Jumlah_Stok', 'Satuan', 'Batas_Minimum', 'Lokasi_Simpan', 'Tanggal_Kadaluarsa'],
    rawArray: [
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
    ],
    records: [
      { ID_Bahan: 'KIM-26-004', Nama_Bahan: 'Larutan Indikator Fenolftalein (PP) 100 mL', Rumus_Kimia: 'C20H14O4', Jumlah_Stok: 3, Satuan: 'Botol', Batas_Minimum: 4, Lokasi_Simpan: 'Lemari B3 Reagen Asam-Basa', Tanggal_Kadaluarsa: '2026-12-31' },
      { ID_Bahan: 'KIM-26-005', Nama_Bahan: 'Asam Klorida (HCl) 37% Pro Analisa 1000 mL', Rumus_Kimia: 'HCl', Jumlah_Stok: 2, Satuan: 'Botol', Batas_Minimum: 3, Lokasi_Simpan: 'Lemari Asam Fume Hood Khusus Korosif', Tanggal_Kadaluarsa: '2027-08-20' },
      { ID_Bahan: 'SMP-26-003', Nama_Bahan: 'Kertas Lakmus Merah & Biru (Set Uji Asam Basa)', Rumus_Kimia: 'Litmus Paper', Jumlah_Stok: 7, Satuan: 'Box', Batas_Minimum: 8, Lokasi_Simpan: 'Kotak Reagen Kering SMP', Tanggal_Kadaluarsa: '2028-01-01' },
      { ID_Bahan: 'BIO-26-005', Nama_Bahan: 'Reagen Lugol / Kalium Iodida Cair 250 mL', Rumus_Kimia: 'I2-KI', Jumlah_Stok: 2, Satuan: 'Botol', Batas_Minimum: 3, Lokasi_Simpan: 'Lemari Reagen Uji Biokimia', Tanggal_Kadaluarsa: '2027-05-15' },
      { ID_Bahan: 'BHM-26-002', Nama_Bahan: 'Asam Sulfat Pekat 98% p.a (Sulfuric Acid)', Rumus_Kimia: 'H2SO4', Jumlah_Stok: 1000, Satuan: 'mL', Batas_Minimum: 500, Lokasi_Simpan: 'Lemari Asam Fume Hood B3', Tanggal_Kadaluarsa: '2028-12-31' },
      { ID_Bahan: 'BHM-26-003', Nama_Bahan: 'Natrium Hidroksida Pellet p.a (Sodium Hydroxide)', Rumus_Kimia: 'NaOH', Jumlah_Stok: 1500, Satuan: 'Gram', Batas_Minimum: 500, Lokasi_Simpan: 'Lemari Basa & Garam Rak B', Tanggal_Kadaluarsa: '2028-06-30' },
      { ID_Bahan: 'BHM-26-006', Nama_Bahan: 'Reagen Biuret Siap Pakai (Uji Protein Makanan)', Rumus_Kimia: 'Biuret Reagent', Jumlah_Stok: 1000, Satuan: 'mL', Batas_Minimum: 300, Lokasi_Simpan: 'Lemari Reagen Biologi Lt. 2', Tanggal_Kadaluarsa: '2027-10-15' },
      { ID_Bahan: 'BHM-26-007', Nama_Bahan: 'Reagen Benedict Kualitatif (Uji Gula Pereduksi)', Rumus_Kimia: 'Benedict Reagent', Jumlah_Stok: 1500, Satuan: 'mL', Batas_Minimum: 400, Lokasi_Simpan: 'Lemari Reagen Biologi Lt. 2', Tanggal_Kadaluarsa: '2027-11-20' },
      { ID_Bahan: 'BHM-26-009', Nama_Bahan: 'Etanol Teknis 96% (Spiritus Putih / Alkohol Pelarut)', Rumus_Kimia: 'C2H5OH', Jumlah_Stok: 5000, Satuan: 'mL', Batas_Minimum: 1500, Lokasi_Simpan: 'Gudang Pelarut Organik Terlindung', Tanggal_Kadaluarsa: '2029-01-01' },
      { ID_Bahan: 'BHM-26-010', Nama_Bahan: 'Tembaga(II) Sulfat Pentahidrat (Terusi Kristal Biru)', Rumus_Kimia: 'CuSO4.5H2O', Jumlah_Stok: 500, Satuan: 'Gram', Batas_Minimum: 200, Lokasi_Simpan: 'Lemari Garam Anorganik', Tanggal_Kadaluarsa: '2028-09-01' },
      { ID_Bahan: 'BHM-26-012', Nama_Bahan: 'Pita Magnesium Murni Roll (Panjang 25 Meter)', Rumus_Kimia: 'Mg', Jumlah_Stok: 2, Satuan: 'Roll', Batas_Minimum: 1, Lokasi_Simpan: 'Laci Logam Reaktif Kering', Tanggal_Kadaluarsa: '2030-01-01' },
      { ID_Bahan: 'BHM-26-015', Nama_Bahan: 'Kertas Indikator Universal pH 0-14 (Merck Box)', Rumus_Kimia: 'Universal pH', Jumlah_Stok: 10, Satuan: 'Box', Batas_Minimum: 4, Lokasi_Simpan: 'Lemari Instrumen Presisi', Tanggal_Kadaluarsa: '2029-05-01' }
    ]
  },

  // 4. PEMINJAMAN ALAT
  Peminjaman_Alat: {
    tableName: 'Peminjaman_Alat',
    description: 'Catatan Peminjaman & Pengembalian Alat Praktikum Siswa & Guru',
    headers: ['ID_Peminjaman', 'Kode_Barang', 'Nama_Barang', 'Jumlah', 'Tipe_Peminjam', 'Nama_Peminjam', 'Kelas_Unit', 'Jenjang', 'Tgl_Pinjam', 'Tgl_Kembali', 'Status', 'Kondisi_Kembali', 'Petugas_PIC', 'Keterangan_Insiden'],
    rawArray: [
      ['PINJAM-26-001', 'FIS-26-001', 'Neraca Ohaus 311 Gram (4 Lengan)', 2, 'SISWA', 'Ahmad Fathan Al-Ghifari (Kel. 1)', 'Kelas XII MIPA 1', 'SMA', '2026-10-23', '2026-10-25', 'DIPINJAM', '-', 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', 'Kondisi awal 2 unit terkalibrasi baik, jarum seimbang'],
      ['PINJAM-26-002', 'BIO-26-001', 'Mikroskop Binokuler Siswa XSZ-107BN', 3, 'GURU', 'Siti Aminatuh Juhriah, M. Si., Gr.', 'Guru Biologi SMA', 'SMA', '2026-10-20', '2026-10-21', 'KEMBALI_BAIK', 'Baik', 'Ilham Nurkholis Majid, S. Pd., Gr.', 'Lensa telah dibersihkan dengan lens paper, tersimpan rapi'],
      ['PINJAM-26-003', 'KIM-26-002', 'Erlenmeyer Pyrex 250 mL', 4, 'SISWA', 'Fadhil Muhammad Rayyan (Kel. 3)', 'Kelas VIII-A SMP IT', 'SMP', '2026-10-22', '2026-10-22', 'KEMBALI_RUSAK_PECAH', 'Pecah / Rusak Berat', 'Farkhatul Amaliya, S. Pd', '1 unit retak/pecah saat dibilas di wastafel. Dibuatkan berita acara penggantian.'],
      ['PINJAM-26-004', 'FIS-26-002', 'Jangka Sorong Stainless 0.05 mm', 5, 'GURU', 'Farkhatul Amaliya, S. Pd', 'Guru IPA SMP Terpadu', 'SMP', '2026-10-24', '2026-10-24', 'DIPINJAM', '-', 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', 'Dipinjam dari Lab Fisika ke Lab IPA SMP Terpadu Lt. 1']
    ],
    records: [
      { ID_Peminjaman: 'PINJAM-26-001', Kode_Barang: 'FIS-26-001', Nama_Barang: 'Neraca Ohaus 311 Gram (4 Lengan)', Jumlah: 2, Tipe_Peminjam: 'SISWA', Nama_Peminjam: 'Ahmad Fathan Al-Ghifari (Kel. 1)', Kelas_Unit: 'Kelas XII MIPA 1', Jenjang: 'SMA', Tgl_Pinjam: '2026-10-23', Tgl_Kembali: '2026-10-25', Status: 'DIPINJAM', Kondisi_Kembali: '-', Petugas_PIC: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', Keterangan_Insiden: 'Kondisi awal 2 unit terkalibrasi baik, jarum seimbang' },
      { ID_Peminjaman: 'PINJAM-26-002', Kode_Barang: 'BIO-26-001', Nama_Barang: 'Mikroskop Binokuler Siswa XSZ-107BN', Jumlah: 3, Tipe_Peminjam: 'GURU', Nama_Peminjam: 'Siti Aminatuh Juhriah, M. Si., Gr.', Kelas_Unit: 'Guru Biologi SMA', Jenjang: 'SMA', Tgl_Pinjam: '2026-10-20', Tgl_Kembali: '2026-10-21', Status: 'KEMBALI_BAIK', Kondisi_Kembali: 'Baik', Petugas_PIC: 'Ilham Nurkholis Majid, S. Pd., Gr.', Keterangan_Insiden: 'Lensa telah dibersihkan dengan lens paper, tersimpan rapi' },
      { ID_Peminjaman: 'PINJAM-26-003', Kode_Barang: 'KIM-26-002', Nama_Barang: 'Erlenmeyer Pyrex 250 mL', Jumlah: 4, Tipe_Peminjam: 'SISWA', Nama_Peminjam: 'Fadhil Muhammad Rayyan (Kel. 3)', Kelas_Unit: 'Kelas VIII-A SMP IT', Jenjang: 'SMP', Tgl_Pinjam: '2026-10-22', Tgl_Kembali: '2026-10-22', Status: 'KEMBALI_RUSAK_PECAH', Kondisi_Kembali: 'Pecah / Rusak Berat', Petugas_PIC: 'Farkhatul Amaliya, S. Pd', Keterangan_Insiden: '1 unit retak/pecah saat dibilas di wastafel. Dibuatkan berita acara penggantian.' },
      { ID_Peminjaman: 'PINJAM-26-004', Kode_Barang: 'FIS-26-002', Nama_Barang: 'Jangka Sorong Stainless 0.05 mm', Jumlah: 5, Tipe_Peminjam: 'GURU', Nama_Peminjam: 'Farkhatul Amaliya, S. Pd', Kelas_Unit: 'Guru IPA SMP Terpadu', Jenjang: 'SMP', Tgl_Pinjam: '2026-10-24', Tgl_Kembali: '2026-10-24', Status: 'DIPINJAM', Kondisi_Kembali: '-', Petugas_PIC: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', Keterangan_Insiden: 'Dipinjam dari Lab Fisika ke Lab IPA SMP Terpadu Lt. 1' }
    ]
  },

  // 5. SLIDESHOW
  Slideshow: {
    tableName: 'Slideshow',
    description: 'Foto Publik Gedung Kampus, Interior Lab IPA & Video Dokumentasi K3',
    headers: ['ID_Slide', 'Judul', 'Subjudul', 'Kategori_Badge', 'URL_Media', 'Tipe_Media', 'Lokasi_Gedung', 'Status_Aktif'],
    rawArray: [
      ['SLD-001', 'Gedung Utama SMP & SMA IT Ar-Rahmah Cendekia', 'Kampus terpadu modern dengan fasilitas sains dan ruang riset laboratorium berstandar K3.', 'Gedung Sekolah', 'https://lh3.googleusercontent.com/d/1u4eCdMdtcNPNj87jFO5XDqSjxFaxY4Fo', 'image', 'Kompleks Gedung Kampus Cimone', 'Aktif'],
      ['SLD-002', 'Interior Ruang Laboratorium IPA Terpadu', 'Pusat observasi dan praktikum terintegrasi dengan meja praktikum berkeramik dan exhaust fume hood.', 'Interior Lab', 'https://lh3.googleusercontent.com/d/17JSXiw02JISFZNr-cTNRuYPTWmSuIsTw', 'image', 'Gedung B Unit Laboratorium', 'Aktif'],
      ['SLD-003', 'Laboratorium Fisika & Eksperimen Optik', 'Fasilitas praktikum mekanika, optika canggih, kelistrikan, dan gelombang bagi santri SMA IT Ar-Rahmah Cendekia.', 'Lab Fisika (SMA)', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1600&q=80', 'image', 'Gedung B Lt. 2 . R. Physics Lab', 'Aktif'],
      ['SLD-004', 'Laboratorium Kimia Terpadu & Reagen', 'Ruang reaksi stoikiometri, titrasi asam basa, serta analisis larutan kimia dengan standar K3 keselamatan laboratorium lengkap.', 'Lab Kimia (SMA)', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80', 'image', 'Gedung B Lt. 1 . R. Chemistry Lab', 'Aktif'],
      ['SLD-005', 'Laboratorium Biologi & Pengamatan Mikroskopis', 'Observasi sitologi sel, preparat jaringan basah, fisiologi hayati, dan pembedahan anatomi untuk eksplorasi biologi modern.', 'Lab Biologi (SMA)', 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1600&q=80', 'image', 'Gedung B Lt. 1 . R. Biology Lab', 'Aktif'],
      ['SLD-006', 'Laboratorium IPA Terpadu Santri SMP', 'Wahana inkuiri sains terpadu, kit praktikum tematik, dan pembentukan karakter saintis muda muslim berakhlak mulia.', 'Lab IPA Terpadu (SMP)', 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1600&q=80', 'image', 'Gedung B Lt. 1 & 2 . R. Science Lab', 'Aktif'],
      ['SLD-007', 'Klip Video Dokumentasi & Budaya Keselamatan Kerja Lab', 'Video profil panduan SOP keselamatan kerja (K3), tata tertib penggunaan alat gelas, dan rekam suasana praktikum terpadu.', 'Video Profil Lab', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'video', 'Gedung B Kompleks Laboratorium Sains', 'Aktif']
    ],
    records: [
      { ID_Slide: 'SLD-001', Judul: 'Gedung Utama SMP & SMA IT Ar-Rahmah Cendekia', Subjudul: 'Kampus terpadu modern dengan fasilitas sains dan ruang riset laboratorium berstandar K3.', Kategori_Badge: 'Gedung Sekolah', URL_Media: 'https://lh3.googleusercontent.com/d/1u4eCdMdtcNPNj87jFO5XDqSjxFaxY4Fo', Tipe_Media: 'image', Lokasi_Gedung: 'Kompleks Gedung Kampus Cimone', Status_Aktif: 'Aktif' },
      { ID_Slide: 'SLD-002', Judul: 'Interior Ruang Laboratorium IPA Terpadu', Subjudul: 'Pusat observasi dan praktikum terintegrasi dengan meja praktikum berkeramik dan exhaust fume hood.', Kategori_Badge: 'Interior Lab', URL_Media: 'https://lh3.googleusercontent.com/d/17JSXiw02JISFZNr-cTNRuYPTWmSuIsTw', Tipe_Media: 'image', Lokasi_Gedung: 'Gedung B Unit Laboratorium', Status_Aktif: 'Aktif' },
      { ID_Slide: 'SLD-003', Judul: 'Laboratorium Fisika & Eksperimen Optik', Subjudul: 'Fasilitas praktikum mekanika, optika canggih, kelistrikan, dan gelombang bagi santri SMA IT Ar-Rahmah Cendekia.', Kategori_Badge: 'Lab Fisika (SMA)', URL_Media: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1600&q=80', Tipe_Media: 'image', Lokasi_Gedung: 'Gedung B Lt. 2 . R. Physics Lab', Status_Aktif: 'Aktif' },
      { ID_Slide: 'SLD-004', Judul: 'Laboratorium Kimia Terpadu & Reagen', Subjudul: 'Ruang reaksi stoikiometri, titrasi asam basa, serta analisis larutan kimia dengan standar K3 keselamatan laboratorium lengkap.', Kategori_Badge: 'Lab Kimia (SMA)', URL_Media: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80', Tipe_Media: 'image', Lokasi_Gedung: 'Gedung B Lt. 1 . R. Chemistry Lab', Status_Aktif: 'Aktif' },
      { ID_Slide: 'SLD-005', Judul: 'Laboratorium Biologi & Pengamatan Mikroskopis', Subjudul: 'Observasi sitologi sel, preparat jaringan basah, fisiologi hayati, dan pembedahan anatomi untuk eksplorasi biologi modern.', Kategori_Badge: 'Lab Biologi (SMA)', URL_Media: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1600&q=80', Tipe_Media: 'image', Lokasi_Gedung: 'Gedung B Lt. 1 . R. Biology Lab', Status_Aktif: 'Aktif' },
      { ID_Slide: 'SLD-006', Judul: 'Laboratorium IPA Terpadu Santri SMP', Subjudul: 'Wahana inkuiri sains terpadu, kit praktikum tematik, dan pembentukan karakter saintis muda muslim berakhlak mulia.', Kategori_Badge: 'Lab IPA Terpadu (SMP)', URL_Media: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1600&q=80', Tipe_Media: 'image', Lokasi_Gedung: 'Gedung B Lt. 1 & 2 . R. Science Lab', Status_Aktif: 'Aktif' },
      { ID_Slide: 'SLD-007', Judul: 'Klip Video Dokumentasi & Budaya Keselamatan Kerja Lab', Subjudul: 'Video profil panduan SOP keselamatan kerja (K3), tata tertib penggunaan alat gelas, dan rekam suasana praktikum terpadu.', Kategori_Badge: 'Video Profil Lab', URL_Media: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', Tipe_Media: 'video', Lokasi_Gedung: 'Gedung B Kompleks Laboratorium Sains', Status_Aktif: 'Aktif' }
    ]
  },

  // 5. JURNAL PRAKTIKUM
  Jurnal_Praktikum: {
    tableName: 'Jurnal_Praktikum',
    description: 'Buku Kendali Praktikum & Agenda Harian Kegiatan Laboratorium Guru',
    headers: ['ID_Jurnal', 'Tanggal', 'Laboratorium', 'Kelas', 'Materi_Praktikum', 'Jumlah_Hadir', 'Jumlah_Absen', 'Guru_Pengampu', 'Catatan_Kejadian'],
    rawArray: [
      ['JRN-26-001', '2026-08-04', 'FISIKA', 'XII MIPA 1 (SMA)', 'Pengenalan Alat Ukur Panjang & Analisis Ketidakpastian Pengukuran Fisika', 5, 0, 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', 'Sesi perdana semester ganjil. Seluruh siswa memahami K3 fisika dan instrumen presisi.'],
      ['JRN-26-002', '2026-08-11', 'KIMIA', 'XI MIPA 2 (SMA)', 'Keselamatan Kerja Laboratorium & Manajemen Simbol Bahaya Bahan Kimia (MSDS)', 2, 0, 'Ilham Nurkholis Majid, S. Pd., Gr.', 'Pengenalan lemari asam dan eyewash station berjalan lancar tanpa kendala.'],
      ['JRN-26-003', '2026-08-18', 'BIOLOGI', 'XII MIPA 1 (SMA)', 'Teknik Penggunaan Mikroskop Cahaya & Pengamatan Sel Prokariotik Cyanobacteria', 5, 0, 'Siti Aminatuh Juhriah, M. Si., Gr.', 'Pembuatan preparat segar berjalan baik. Siswa berhasil menemukan objek mikro.'],
      ['JRN-26-004', '2026-08-25', 'SMP_TERPADU', 'VIII-A (SMP Terpadu)', 'Uji Sifat Larutan Asam Basa dengan Kertas Lakmus & Indikator Alami Kunyit', 3, 0, 'Farkhatul Amaliya, S. Pd', 'Siswa antusias mengamati perubahan warna lakmus merah dan biru.'],
      ['JRN-26-005', '2026-09-01', 'SMP_TERPADU', 'VII-B (SMP Terpadu)', 'Pengamatan Sel Epidermis Bawang Merah & Sel Epitel Pipi Menggunakan Metilen Biru', 2, 0, 'Farkhatul Amaliya, S. Pd', 'Praktikum mikroskop dasar SMP berjalan tertib di bawah panduan LKPD.']
    ],
    records: [
      { ID_Jurnal: 'JRN-26-001', Tanggal: '2026-08-04', Laboratorium: 'FISIKA', Kelas: 'XII MIPA 1 (SMA)', Materi_Praktikum: 'Pengenalan Alat Ukur Panjang & Analisis Ketidakpastian Pengukuran Fisika', Jumlah_Hadir: 5, Jumlah_Absen: 0, Guru_Pengampu: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.', Catatan_Kejadian: 'Sesi perdana semester ganjil. Seluruh siswa memahami K3 fisika dan instrumen presisi.' },
      { ID_Jurnal: 'JRN-26-002', Tanggal: '2026-08-11', Laboratorium: 'KIMIA', Kelas: 'XI MIPA 2 (SMA)', Materi_Praktikum: 'Keselamatan Kerja Laboratorium & Manajemen Simbol Bahaya Bahan Kimia (MSDS)', Jumlah_Hadir: 2, Jumlah_Absen: 0, Guru_Pengampu: 'Ilham Nurkholis Majid, S. Pd., Gr.', Catatan_Kejadian: 'Pengenalan lemari asam dan eyewash station berjalan lancar tanpa kendala.' },
      { ID_Jurnal: 'JRN-26-003', Tanggal: '2026-08-18', Laboratorium: 'BIOLOGI', Kelas: 'XII MIPA 1 (SMA)', Materi_Praktikum: 'Teknik Penggunaan Mikroskop Cahaya & Pengamatan Sel Prokariotik Cyanobacteria', Jumlah_Hadir: 5, Jumlah_Absen: 0, Guru_Pengampu: 'Siti Aminatuh Juhriah, M. Si., Gr.', Catatan_Kejadian: 'Pembuatan preparat segar berjalan baik. Siswa berhasil menemukan objek mikro.' },
      { ID_Jurnal: 'JRN-26-004', Tanggal: '2026-08-25', Laboratorium: 'SMP_TERPADU', Kelas: 'VIII-A (SMP Terpadu)', Materi_Praktikum: 'Uji Sifat Larutan Asam Basa dengan Kertas Lakmus & Indikator Alami Kunyit', Jumlah_Hadir: 3, Jumlah_Absen: 0, Guru_Pengampu: 'Farkhatul Amaliya, S. Pd', Catatan_Kejadian: 'Siswa antusias mengamati perubahan warna lakmus merah dan biru.' },
      { ID_Jurnal: 'JRN-26-005', Tanggal: '2026-09-01', Laboratorium: 'SMP_TERPADU', Kelas: 'VII-B (SMP Terpadu)', Materi_Praktikum: 'Pengamatan Sel Epidermis Bawang Merah & Sel Epitel Pipi Menggunakan Metilen Biru', Jumlah_Hadir: 2, Jumlah_Absen: 0, Guru_Pengampu: 'Farkhatul Amaliya, S. Pd', Catatan_Kejadian: 'Praktikum mikroskop dasar SMP berjalan tertib di bawah panduan LKPD.' }
    ]
  },

  // 6. DATA SISWA
  Data_Siswa: {
    tableName: 'Data_Siswa',
    description: 'Direktori Santri, NISN, Rombel & Status Siswa SMP/SMA',
    headers: ['ID_Siswa', 'NISN', 'Nama_Siswa', 'Kelas_Rombel', 'Unit_Sekolah', 'Status'],
    rawArray: [
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
    ],
    records: [
      { ID_Siswa: '1', NISN: '0075849301', Nama_Siswa: 'Ahmad Fathan Al-Ghifari', Kelas_Rombel: 'XII MIPA 1 (SMA)', Unit_Sekolah: 'SMA', Status: 'Aktif' },
      { ID_Siswa: '2', NISN: '0079384722', Nama_Siswa: 'Aisyah Putri Azzahra', Kelas_Rombel: 'XII MIPA 1 (SMA)', Unit_Sekolah: 'SMA', Status: 'Aktif' },
      { ID_Siswa: '3', NISN: '0074628193', Nama_Siswa: 'Fadhil Muhammad Rayyan', Kelas_Rombel: 'XII MIPA 1 (SMA)', Unit_Sekolah: 'SMA', Status: 'Aktif' },
      { ID_Siswa: '4', NISN: '0081739485', Nama_Siswa: 'Nabila Khairunnisa', Kelas_Rombel: 'XII MIPA 1 (SMA)', Unit_Sekolah: 'SMA', Status: 'Aktif' },
      { ID_Siswa: '5', NISN: '0079827402', Nama_Siswa: 'Zaidan Hafizh Ar-Rasyid', Kelas_Rombel: 'XII MIPA 1 (SMA)', Unit_Sekolah: 'SMA', Status: 'Aktif' },
      { ID_Siswa: '6', NISN: '0082394811', Nama_Siswa: 'Muhammad Rayhan Pratama', Kelas_Rombel: 'XI MIPA 2 (SMA)', Unit_Sekolah: 'SMA', Status: 'Aktif' },
      { ID_Siswa: '7', NISN: '0083948192', Nama_Siswa: 'Zahra Nurul Izzah', Kelas_Rombel: 'XI MIPA 2 (SMA)', Unit_Sekolah: 'SMA', Status: 'Aktif' },
      { ID_Siswa: '8', NISN: '0092837461', Nama_Siswa: 'Fakhri Ramadhan Al-Farisi', Kelas_Rombel: 'VIII-A (SMP Terpadu)', Unit_Sekolah: 'SMP', Status: 'Aktif' },
      { ID_Siswa: '9', NISN: '0093847562', Nama_Siswa: 'Khansa Humaira Zahid', Kelas_Rombel: 'VIII-A (SMP Terpadu)', Unit_Sekolah: 'SMP', Status: 'Aktif' },
      { ID_Siswa: '10', NISN: '0091827364', Nama_Siswa: 'Bilal Habibi Siregar', Kelas_Rombel: 'VIII-A (SMP Terpadu)', Unit_Sekolah: 'SMP', Status: 'Aktif' },
      { ID_Siswa: '11', NISN: '0102938475', Nama_Siswa: 'Salma Salsabila Putri', Kelas_Rombel: 'VII-B (SMP Terpadu)', Unit_Sekolah: 'SMP', Status: 'Aktif' },
      { ID_Siswa: '12', NISN: '0103948576', Nama_Siswa: 'Umar Abdullah As-Syahid', Kelas_Rombel: 'VII-B (SMP Terpadu)', Unit_Sekolah: 'SMP', Status: 'Aktif' }
    ]
  },

  // 7. E-RAPORT
  E_Raport: {
    tableName: 'E_Raport',
    description: 'Rekapitulasi Nilai Praktikum Siswa, Nilai Sikap & Predikat Rapor',
    headers: ['ID_Nilai', 'NISN', 'Nama_Siswa', 'Mata_Pelajaran', 'Nilai_Kinerja', 'Nilai_Laporan', 'Nilai_Akhir', 'Nilai_Sikap', 'Predikat'],
    rawArray: [
      ['RAP-26-001', '0075849301', 'Ahmad Fathan Al-Ghifari', 'Fisika SMA', 85, 88, 87, 'A', 'Sangat Baik'],
      ['RAP-26-002', '0079384722', 'Aisyah Putri Azzahra', 'Fisika SMA', 90, 92, 91, 'A', 'Sangat Baik'],
      ['RAP-26-003', '0074628193', 'Fadhil Muhammad Rayyan', 'Fisika SMA', 84, 86, 85, 'B+', 'Baik'],
      ['RAP-26-004', '0081739485', 'Nabila Khairunnisa', 'Fisika SMA', 89, 90, 90, 'A', 'Sangat Baik'],
      ['RAP-26-005', '0079827402', 'Zaidan Hafizh Ar-Rasyid', 'Fisika SMA', 86, 85, 86, 'A', 'Sangat Baik'],
      ['RAP-26-006', '0082394811', 'Muhammad Rayhan Pratama', 'Kimia SMA', 88, 89, 89, 'A', 'Sangat Baik'],
      ['RAP-26-007', '0083948192', 'Zahra Nurul Izzah', 'Kimia SMA', 92, 93, 93, 'A', 'Sangat Baik'],
      ['RAP-26-008', '0092837461', 'Fakhri Ramadhan Al-Farisi', 'IPA Terpadu SMP', 87, 89, 88, 'A', 'Sangat Baik'],
      ['RAP-26-009', '0102938475', 'Salma Salsabila Putri', 'IPA Terpadu SMP', 90, 91, 91, 'A', 'Sangat Baik']
    ],
    records: [
      { ID_Nilai: 'RAP-26-001', NISN: '0075849301', Nama_Siswa: 'Ahmad Fathan Al-Ghifari', Mata_Pelajaran: 'Fisika SMA', Nilai_Kinerja: 85, Nilai_Laporan: 88, Nilai_Akhir: 87, Nilai_Sikap: 'A', Predikat: 'Sangat Baik' },
      { ID_Nilai: 'RAP-26-002', NISN: '0079384722', Nama_Siswa: 'Aisyah Putri Azzahra', Mata_Pelajaran: 'Fisika SMA', Nilai_Kinerja: 90, Nilai_Laporan: 92, Nilai_Akhir: 91, Nilai_Sikap: 'A', Predikat: 'Sangat Baik' },
      { ID_Nilai: 'RAP-26-003', NISN: '0074628193', Nama_Siswa: 'Fadhil Muhammad Rayyan', Mata_Pelajaran: 'Fisika SMA', Nilai_Kinerja: 84, Nilai_Laporan: 86, Nilai_Akhir: 85, Nilai_Sikap: 'B+', Predikat: 'Baik' },
      { ID_Nilai: 'RAP-26-004', NISN: '0081739485', Nama_Siswa: 'Nabila Khairunnisa', Mata_Pelajaran: 'Fisika SMA', Nilai_Kinerja: 89, Nilai_Laporan: 90, Nilai_Akhir: 90, Nilai_Sikap: 'A', Predikat: 'Sangat Baik' },
      { ID_Nilai: 'RAP-26-005', NISN: '0079827402', Nama_Siswa: 'Zaidan Hafizh Ar-Rasyid', Mata_Pelajaran: 'Fisika SMA', Nilai_Kinerja: 86, Nilai_Laporan: 85, Nilai_Akhir: 86, Nilai_Sikap: 'A', Predikat: 'Sangat Baik' },
      { ID_Nilai: 'RAP-26-006', NISN: '0082394811', Nama_Siswa: 'Muhammad Rayhan Pratama', Mata_Pelajaran: 'Kimia SMA', Nilai_Kinerja: 88, Nilai_Laporan: 89, Nilai_Akhir: 89, Nilai_Sikap: 'A', Predikat: 'Sangat Baik' },
      { ID_Nilai: 'RAP-26-007', NISN: '0083948192', Nama_Siswa: 'Zahra Nurul Izzah', Mata_Pelajaran: 'Kimia SMA', Nilai_Kinerja: 92, Nilai_Laporan: 93, Nilai_Akhir: 93, Nilai_Sikap: 'A', Predikat: 'Sangat Baik' },
      { ID_Nilai: 'RAP-26-008', NISN: '0092837461', Nama_Siswa: 'Fakhri Ramadhan Al-Farisi', Mata_Pelajaran: 'IPA Terpadu SMP', Nilai_Kinerja: 87, Nilai_Laporan: 89, Nilai_Akhir: 88, Nilai_Sikap: 'A', Predikat: 'Sangat Baik' },
      { ID_Nilai: 'RAP-26-009', NISN: '0102938475', Nama_Siswa: 'Salma Salsabila Putri', Mata_Pelajaran: 'IPA Terpadu SMP', Nilai_Kinerja: 90, Nilai_Laporan: 91, Nilai_Akhir: 91, Nilai_Sikap: 'A', Predikat: 'Sangat Baik' }
    ]
  }
};
