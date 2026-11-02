import { ItemCategory, LabId } from '../types/inventory';

export interface MockSearchItem {
  id: string;
  nama: string;
  kode: string;
  kategori: ItemCategory;
  lokasi: string;
  stok: number;
  satuan: string;
  lab: LabId | 'ALL';
  kondisi: string;
  spesifikasi?: string;
}

export const MOCK_FALLBACK_LAB_ITEMS: MockSearchItem[] = [
  {
    id: 'mock-fis-01',
    nama: 'Jangka Sorong Digital 150mm Mitutoyo',
    kode: 'ARC-FIS-001',
    kategori: 'Alat Ukur & Neraca',
    lokasi: 'Lemari A - Rak 1 (Lab Fisika SMA)',
    stok: 15,
    satuan: 'Unit',
    lab: 'FISIKA',
    kondisi: 'Baik (100% Terkalibrasi)',
    spesifikasi: 'Ketelitian 0.01 mm, Stainless Steel',
  },
  {
    id: 'mock-fis-02',
    nama: 'Neraca Ohaus 4 Lengan 311g',
    kode: 'ARC-FIS-002',
    kategori: 'Alat Ukur & Neraca',
    lokasi: 'Lemari A - Rak 2 (Lab Fisika SMA)',
    stok: 8,
    satuan: 'Unit',
    lab: 'FISIKA',
    kondisi: 'Baik',
    spesifikasi: 'Kapasitas 311 gram, Sensitivitas 0.01g',
  },
  {
    id: 'mock-kim-01',
    nama: 'Asam Klorida (HCl 37%) Pro Analisis',
    kode: 'ARC-KIM-001',
    kategori: 'Bahan Kimia & Reagen',
    lokasi: 'Lemari Asam LA-01 (Lab Kimia SMA)',
    stok: 5,
    satuan: 'Botol 1L',
    lab: 'KIMIA',
    kondisi: 'Tersimpan Aman (Segel Rapat)',
    spesifikasi: 'Merck Grade PA 37%, Korosif Tinggi',
  },
  {
    id: 'mock-kim-02',
    nama: 'Tabung Reaksi Kaca Borosilikat Pyrex 15x150mm',
    kode: 'ARC-KIM-002',
    kategori: 'Alat Gelas & Keramik',
    lokasi: 'Lemari C - Rak 4 (Lab Kimia SMA)',
    stok: 150,
    satuan: 'Buah',
    lab: 'KIMIA',
    kondisi: '145 Baik, 5 Retak',
    spesifikasi: 'Pyrex Glassware, Tahan Panas 500°C',
  },
  {
    id: 'mock-kim-03',
    nama: 'Larutan Indikator Fenolftalein (PP 1%)',
    kode: 'ARC-KIM-003',
    kategori: 'Bahan Kimia & Reagen',
    lokasi: 'Lemari K-02 Rak Reagen (Lab Kimia SMA)',
    stok: 8,
    satuan: 'Botol 250ml',
    lab: 'KIMIA',
    kondisi: 'Baik',
    spesifikasi: 'Indikator Trayek Asam Basa pH 8.3 - 10.0',
  },
  {
    id: 'mock-bio-01',
    nama: 'Mikroskop Binokuler Olympus CX23 LED',
    kode: 'ARC-BIO-001',
    kategori: 'Instrumen Optik',
    lokasi: 'Lemari B - Rak 1 (Lab Biologi SMA)',
    stok: 12,
    satuan: 'Unit',
    lab: 'BIOLOGI',
    kondisi: 'Bagus (Lensa Bersih Terkalibrasi)',
    spesifikasi: 'Perbesaran 40x - 1000x, Quadruple Nosepiece',
  },
  {
    id: 'mock-bio-02',
    nama: 'Set Preparat Awetan Jaringan Hewan & Tumbuhan',
    kode: 'ARC-BIO-002',
    kategori: 'Model & Preparat Biologi',
    lokasi: 'Lemari B - Rak 3 (Lab Biologi SMA)',
    stok: 25,
    satuan: 'Kotak',
    lab: 'BIOLOGI',
    kondisi: 'Baik',
    spesifikasi: 'Isi 50 Keping Kaca Preparat Permanen',
  },
  {
    id: 'mock-bio-03',
    nama: 'Model Anatomi Torso Manusia Lengkap (Unisex)',
    kode: 'ARC-BIO-003',
    kategori: 'Model & Preparat Biologi',
    lokasi: 'Display Etalase B-05 (Lab Biologi SMA)',
    stok: 3,
    satuan: 'Unit',
    lab: 'BIOLOGI',
    kondisi: 'Baik & Lengkap',
    spesifikasi: 'Tinggi 85cm, 23 Bagian Organ Dapat Dilepas',
  },
  {
    id: 'mock-smp-01',
    nama: 'Kit Praktikum Optik Lensa & Prisma Terpadu SMP',
    kode: 'ARC-SMP-001',
    kategori: 'Kit Praktikum Terpadu',
    lokasi: 'Lemari D - Rak 1 (Lab IPA Terpadu SMP)',
    stok: 10,
    satuan: 'Kotak Kit',
    lab: 'SMP_TERPADU',
    kondisi: 'Baik (Kit Lengkap)',
    spesifikasi: 'Meja Optik, Sumber Cahaya LED, Lensa Cekung/Cembung',
  },
  {
    id: 'mock-smp-02',
    nama: 'Set Pembakar Bunsen & Kasa Asbes Kaki Tiga',
    kode: 'ARC-SMP-002',
    kategori: 'Perkakas & Keselamatan Kerja',
    lokasi: 'Lemari D - Rak 3 (Lab IPA Terpadu SMP)',
    stok: 18,
    satuan: 'Set',
    lab: 'SMP_TERPADU',
    kondisi: 'Baik',
    spesifikasi: 'Kaki Tiga Besi Tahan Karat + Kassa Kawat Asbes',
  },
  {
    id: 'mock-smp-03',
    nama: 'Magnet Batang Alnico & Serbuk Besi Percobaan',
    kode: 'ARC-SMP-003',
    kategori: 'Kit Praktikum Terpadu',
    lokasi: 'Lemari D - Rak 2 (Lab IPA Terpadu SMP)',
    stok: 20,
    satuan: 'Set',
    lab: 'SMP_TERPADU',
    kondisi: 'Baik',
    spesifikasi: 'Kutub Merah (U) dan Biru (S), Medan Magnet Kuat',
  },
  {
    id: 'mock-fis-03',
    nama: 'Multimeter Digital Sanwa CD800a',
    kode: 'ARC-FIS-003',
    kategori: 'Alat Ukur & Neraca',
    lokasi: 'Lemari A - Rak 3 (Lab Fisika SMA)',
    stok: 14,
    satuan: 'Unit',
    lab: 'FISIKA',
    kondisi: 'Baik',
    spesifikasi: 'Pengukuran Tegangan AC/DC, Resistansi, Arus',
  },
];

export interface SearchMenuItem {
  id: string;
  route: string;
  title: string;
  category: string;
  description: string;
  keywords: string[];
}

export const SEARCH_MENUS: SearchMenuItem[] = [
  {
    id: 'menu-dashboard',
    route: 'dashboard',
    title: 'Dashboard Utama',
    category: 'Ringkasan & Metrik',
    description: 'Ringkasan eksekutif laboratorium, banner slideshow gedung, metrik stok, dan tren transaksi.',
    keywords: ['dashboard', 'beranda', 'home', 'slideshow', 'grafik', 'ringkasan', 'metrik'],
  },
  {
    id: 'menu-sync',
    route: 'sync',
    title: 'Manajemen Laboratorium',
    category: 'Sinkronisasi Ruang Kerja',
    description: 'Sinkronisasi 4 klaster: Lab Fisika, Kimia, Biologi SMA dan IPA Terpadu SMP.',
    keywords: ['manajemen', 'lab', 'sinkronisasi', 'matriks', 'ruang', 'klaster', 'sync'],
  },
  {
    id: 'menu-inventory',
    route: 'inventory',
    title: 'Inventaris & Stok',
    category: 'Katalog Barang & Mutasi',
    description: 'Daftar katalog master seluruh alat, bahan kimia, botol reagen, dan filter kondisi fisik.',
    keywords: ['inventaris', 'stok', 'katalog', 'barang', 'alat', 'reagen', 'bahan', 'rak', 'lemari'],
  },
  {
    id: 'menu-loans',
    route: 'loans',
    title: 'Peminjaman Alat',
    category: 'Sirkulasi & Kendali Harian',
    description: 'Pencatatan peminjaman harian guru/siswa dan buku berita acara alat retak, pecah, atau rusak.',
    keywords: ['peminjaman', 'pinjam', 'kembali', 'sirkulasi', 'pecah', 'rusak', 'alat', 'loans'],
  },
  {
    id: 'menu-practicum',
    route: 'practicum',
    title: 'Jadwal & Jurnal Praktikum',
    category: 'Buku Kendali & Absensi',
    description: 'Buku kendali jadwal praktikum, presensi santri, penilaian kinerja, dan berita acara otomatis.',
    keywords: ['jadwal', 'jurnal', 'praktikum', 'presensi', 'absensi', 'nilai', 'guru', 'percobaan'],
  },
  {
    id: 'menu-students',
    route: 'students',
    title: 'Data Siswa & Kelas',
    category: 'Rombel & Anggota Lab',
    description: 'Database siswa kelas VII–XII, data NISN, keikutsertaan praktikum, dan kelola rombel.',
    keywords: ['siswa', 'santri', 'kelas', 'rombel', 'nisn', 'angkatan', 'data siswa'],
  },
  {
    id: 'menu-reports',
    route: 'reports',
    title: 'Laporan Resmi & Berita Acara',
    category: 'Dokumen & Ekspor',
    description: 'Penyusunan berita acara stok opname berkala (bulanan/tahunan) dan unduh PDF resmi ber-KOP.',
    keywords: ['laporan', 'resmi', 'berita acara', 'kop', 'pdf', 'cetak', 'unduh pdf', 'print'],
  },
  {
    id: 'menu-settings',
    route: 'settings',
    title: 'Kelola Pengguna & Pengaturan Sistem',
    category: 'Pengaturan Sistem',
    description: 'Konfigurasi identitas sistem, ganti logo sidebar, pengumuman running text, dan akun petugas.',
    keywords: ['pengaturan', 'settings', 'pengguna', 'user', 'akun', 'password', 'logo', 'pengumuman'],
  },
];

export interface SearchActionItem {
  id: string;
  actionId: string;
  title: string;
  category: string;
  description: string;
  badge: string;
  keywords: string[];
}

export const SEARCH_ACTIONS: SearchActionItem[] = [
  {
    id: 'act-add-item',
    actionId: 'add-item',
    title: '+ Tambah Barang Inventaris Baru',
    category: 'Aksi Cepat',
    description: 'Buka form penambahan barang/alat baru ke dalam database inventaris.',
    badge: 'Katalog',
    keywords: ['tambah', 'barang', 'baru', 'input', 'katalog', 'item', 'alat baru'],
  },
  {
    id: 'act-qr',
    actionId: 'qr-scanner',
    title: 'Pindai QR Code Alat / Bahan',
    category: 'Aksi Cepat',
    description: 'Aktifkan kamera scanner barcode / QR code label alat laboratorium.',
    badge: 'Scanner',
    keywords: ['pindai', 'scan', 'qr', 'barcode', 'kamera', 'label'],
  },
  {
    id: 'act-tx-in',
    actionId: 'tx-in',
    title: 'Catat Barang Masuk (Stok Masuk)',
    category: 'Aksi Cepat',
    description: 'Catat penambahan stok barang atau pengadaan alat dan reagen baru.',
    badge: 'Mutasi (+)',
    keywords: ['masuk', 'stok masuk', 'mutasi in', 'tambah stok', 'pengadaan'],
  },
  {
    id: 'act-tx-out',
    actionId: 'tx-out',
    title: 'Catat Barang Keluar (Stok Keluar)',
    category: 'Aksi Cepat',
    description: 'Catat pengurangan stok barang akibat pemakaian praktikum atau zat habis.',
    badge: 'Mutasi (-)',
    keywords: ['keluar', 'stok keluar', 'mutasi out', 'pakai', 'habis', 'zat'],
  },
  {
    id: 'act-transfer',
    actionId: 'transfer',
    title: 'Transfer Stok Antar Laboratorium',
    category: 'Aksi Cepat',
    description: 'Pindahkan stok antar ruang Fisika, Kimia, Biologi, dan IPA SMP.',
    badge: 'Transfer',
    keywords: ['transfer', 'pindah', 'antar lab', 'distribusi'],
  },
  {
    id: 'act-print',
    actionId: 'print-report',
    title: 'Cetak Laporan / Unduh PDF',
    category: 'Aksi Cepat',
    description: 'Buka modul Berita Acara Rekapitulasi Stok untuk cetak dokumen PDF resmi.',
    badge: 'Dokumen',
    keywords: ['cetak', 'print', 'laporan', 'pdf', 'unduh', 'download'],
  },
  {
    id: 'act-import',
    actionId: 'import-excel',
    title: 'Import Data Excel (.xlsx)',
    category: 'Aksi Cepat',
    description: 'Buka modal import file Excel spreadsheet untuk input massal barang.',
    badge: 'Spreadsheet',
    keywords: ['import', 'excel', 'xlsx', 'csv', 'unggah', 'spreadsheet'],
  },
  {
    id: 'act-low-stock',
    actionId: 'low-stock',
    title: 'Lihat Peringatan Stok Minimum',
    category: 'Aksi Cepat',
    description: 'Buka popover daftar barang yang telah mencapai batas kritis restock.',
    badge: 'Peringatan',
    keywords: ['stok minimum', 'kritis', 'habis', 'low stock', 'peringatan'],
  },
  {
    id: 'act-filter-all',
    actionId: 'filter-all',
    title: 'Filter Jenjang: Terpadu (SMP & SMA)',
    category: 'Filter Cepat',
    description: 'Tampilkan seluruh inventaris laboratorium tanpa batasan jenjang.',
    badge: 'Semua',
    keywords: ['filter', 'semua', 'terpadu', 'smp sma'],
  },
  {
    id: 'act-filter-smp',
    actionId: 'filter-smp',
    title: 'Filter Jenjang: Khusus SMP IT',
    category: 'Filter Cepat',
    description: 'Tampilkan hanya inventaris milik laboratorium IPA Terpadu SMP.',
    badge: 'SMP',
    keywords: ['filter', 'smp', 'smp it'],
  },
  {
    id: 'act-filter-sma',
    actionId: 'filter-sma',
    title: 'Filter Jenjang: Khusus SMA IT',
    category: 'Filter Cepat',
    description: 'Tampilkan hanya inventaris Fisika, Kimia, dan Biologi SMA.',
    badge: 'SMA',
    keywords: ['filter', 'sma', 'sma it'],
  },
];
