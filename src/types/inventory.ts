export type LabId = 'FISIKA' | 'KIMIA' | 'BIOLOGI' | 'SMP_TERPADU';

export interface LabInfo {
  id: LabId;
  name: string;
  shortName: string;
  schoolLevel: 'SMA' | 'SMP';
  color: string;
  badgeBg: string;
  borderColor: string;
  roomLocation: string;
  leadPerson: string;
}

export const LAB_DEFINITIONS: Record<LabId, LabInfo> = {
  FISIKA: {
    id: 'FISIKA',
    name: 'Laboratorium Fisika (SMA)',
    shortName: 'Fisika SMA',
    schoolLevel: 'SMA',
    color: 'text-sky-700',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    borderColor: 'border-sky-300',
    roomLocation: 'Gedung B Lt. 2 . R. Physics Lab',
    leadPerson: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
  },
  KIMIA: {
    id: 'KIMIA',
    name: 'Laboratorium Kimia (SMA)',
    shortName: 'Kimia SMA',
    schoolLevel: 'SMA',
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    borderColor: 'border-amber-300',
    roomLocation: 'Gedung B Lt. 1 . R. Chemistry Lab',
    leadPerson: 'Ilham Nurkholis Majid, S. Pd., Gr.',
  },
  BIOLOGI: {
    id: 'BIOLOGI',
    name: 'Laboratorium Biologi (SMA)',
    shortName: 'Biologi SMA',
    schoolLevel: 'SMA',
    color: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderColor: 'border-emerald-300',
    roomLocation: 'Gedung B Lt. 1 . R. Biology Lab',
    leadPerson: 'Siti Aminatuh Juhriah, M. Si., Gr.',
  },
  SMP_TERPADU: {
    id: 'SMP_TERPADU',
    name: 'Laboratorium IPA Terpadu (SMP)',
    shortName: 'IPA SMP Terpadu',
    schoolLevel: 'SMP',
    color: 'text-indigo-700',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    borderColor: 'border-indigo-300',
    roomLocation: 'Gedung B Lt. 1 & 2 . R. Science Lab',
    leadPerson: 'Farkhatul Amaliya, S. Pd',
  },
};

export type ItemCategory =
  | 'Alat Ukur & Neraca'
  | 'Alat Gelas & Keramik'
  | 'Bahan Kimia & Reagen'
  | 'Instrumen Optik'
  | 'Model & Preparat Biologi'
  | 'Kit Praktikum Terpadu'
  | 'Perkakas & Keselamatan Kerja';

export interface LabStockDistribution {
  FISIKA: number;
  KIMIA: number;
  BIOLOGI: number;
  SMP_TERPADU: number;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: ItemCategory;
  primaryLab: LabId | 'ALL';
  unit: string;
  initialStock2026: number;
  totalIn: number;
  totalOut: number;
  currentTotalStock: number;
  minStockAlert: number;
  conditionGood: number;
  conditionLightDamage: number;
  conditionHeavyDamage: number;
  distribution: LabStockDistribution;
  storageRack: string;
  brandOrSpec: string;
  expiredDate?: string; // Tanggal Kadaluarsa (Khusus Bahan Kimia / Reagen)
  calibrationStatus?: 'Bagus' | 'Rusak' | 'Perlu Kalibrasi'; // Status Kondisi & Kalibrasi Alat
  notes?: string;
  lastUpdated: string;
}

export type TransactionType = 'IN' | 'OUT' | 'TRANSFER';

export interface StockTransaction {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  date: string;
  targetLab: LabId;
  fromLab?: LabId;
  purpose: string;
  userId?: string;
  picName: string;
  studentClassOrBatch?: string;
  conditionStatus: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  notes?: string;
  createdAt: string;
}

// ==============================================================================
// MODUL PEMINJAMAN & PENGEMBALIAN ALAT PRAKTIKUM SERTA LAPORAN PECAH / RUSAK
// ==============================================================================

export type LoanBorrowerType = 'GURU' | 'SISWA';
export type LoanStatus = 'DIPINJAM' | 'KEMBALI_BAIK' | 'KEMBALI_RUSAK_PECAH';

export interface ToolLoanRecord {
  id: string;
  code: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  borrowerType: LoanBorrowerType;
  borrowerName: string;
  borrowerClassOrDept: string;
  schoolLevel: 'SMP' | 'SMA';
  targetLab: LabId;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  purpose: string;
  status: LoanStatus;
  returnedCondition?: 'Baik' | 'Rusak Ringan' | 'Pecah / Rusak Berat' | 'Hilang';
  damagedQuantity?: number;
  damageIncidentReport?: string;
  actionTaken?: string;
  picOfficer: string;
  notes?: string;
  createdAt: string;
}

// ==============================================================================
// MODUL KALIBRASI ALAT PRAKTIKUM & SENSOR PRESISI LABORATORIUM
// ==============================================================================

export type CalibrationStatus =
  | 'TERKALIBRASI'
  | 'MENDEKATI_JATUH_TEMPO'
  | 'KADALUARSA'
  | 'PERLU_PERBAIKAN';

export type CalibrationResult = 'LULUS' | 'LULUS_BERSYARAT' | 'GAGAL' | 'BELUM_DIUJI';

export interface CalibrationRecord {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  lab: LabId;
  instrumentType: string; // Misal: 'Neraca Digital / Analitik', 'Sensor pH Digital', 'Sensor Suhu / Termometer', dsb.
  serialNumber: string;
  brandOrModel: string;
  locationRack: string;
  lastCalibrationDate: string; // YYYY-MM-DD
  calibrationIntervalMonths: number; // 3, 6, atau 12 bulan
  nextCalibrationDueDate: string; // YYYY-MM-DD
  calibratedBy: string; // Laboran / Teknisi / Lembaga Kalibrasi
  certificateNumber?: string;
  result: CalibrationResult;
  status: CalibrationStatus;
  measuredDeviation?: string; // misal: "+0.002 g" atau "-0.04 pH"
  standardReference?: string; // misal: "Anak Timbangan Standar E2" / "Larutan Buffer pH 4.01 & 7.00"
  actionTaken?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole =
  | 'KEPALA_LAB'
  | 'LABORAN_FISIKA'
  | 'LABORAN_KIMIA'
  | 'LABORAN_BIOLOGI'
  | 'GURU_IPA_SMP'
  | 'LABORAN';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  assignedLab: LabId | 'ALL';
  avatarInitials: string;
  avatarUrl?: string; // Data URL Base64 or image URL (PNG / JPG)
  schoolIdNumber: string;
  nip?: string;
  password?: string;
  status?: 'aktif' | 'nonaktif';
  phone?: string;
  createdAt?: string;
  lastPasswordChangedAt?: string;
}

export interface PasswordChangeLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  requestedAt: string;
  completedAt?: string;
  verificationCode: string; // 6-digit OTP
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
  newPasswordMasked?: string;
  device?: string;
}

export interface PengaturanSistem {
  id: number;
  nama_sistem: string;
  nama_sekolah: string;
  logo_url?: string; // URL gambar atau Base64 data logo resmi instansi pada sidebar & aplikasi
  teks_pengumuman: string;
  tipe_pengumuman: 'info' | 'warning' | 'success';
  tampilkan_pengumuman: boolean;
  tahun_ajaran: string;
  sub_judul_dashboard?: string;
  kontak_bantuan?: string;
  updated_at: string;
  updated_by?: string;
}

export const DEFAULT_PENGATURAN_SISTEM: PengaturanSistem = {
  id: 1,
  nama_sistem: 'SIMLAB AR-RAHMAH CENDEKIA',
  nama_sekolah: 'SMP dan SMA IT Ar-Rahmah Cendekia',
  logo_url: '/src/assets/images/arcss_logo_official.svg',
  teks_pengumuman: 'PENGUMUMAN RESMI: Rekapitulasi terpusat stok barang inventaris laboratorium IPA Terpadu Tahun 2026 telah disinkronkan realtime dengan Laboratorium Fisika, Kimia, Biologi, dan IPA Terpadu SMP. Harap seluruh penanggung jawab memeriksa berkala kondisi alat praktikum.',
  tipe_pengumuman: 'info',
  tampilkan_pengumuman: true,
  tahun_ajaran: '2026',
  sub_judul_dashboard: 'Sistem Rekapitulasi Stok Barang Inventaris Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia',
  kontak_bantuan: 'ilham.nurkholis114@guru.sma.belajar.id',
  updated_at: '2026-10-14 20:00:00',
  updated_by: 'Ilham Nurkholis Majid, S. Pd., Gr.',
};

export interface KopBeritaAcaraConfig {
  logoUrl?: string; // Data URL Base64 logo instansi (PNG / JPG)
  namaYayasan: string;
  namaSekolah: string;
  unitLaboratorium: string;
  alamat: string;
  kotaPenetapan: string;
  tanggalPenetapan: string;
  // Penandatangan 1: Penanggung Jawab Laboratorium
  pjTitle: string;
  pjInstansi: string;
  pjNama: string;
  pjNip: string;
  // Penandatangan 2: Kepala Laboratorium IPA Terpadu
  kepalaLabTitle: string;
  kepalaLabInstansi: string;
  kepalaLabNama: string;
  kepalaLabNip: string;
  // Penandatangan 3: Mengetahui, Kepala Sekolah
  kepalaSekolahTitle: string;
  kepalaSekolahInstansi: string;
  kepalaSekolahNama: string;
  kepalaSekolahNip: string;
}

export const DEFAULT_KOP_CONFIG: KopBeritaAcaraConfig = {
  logoUrl: '', // Kosong = gunakan logo default sistem
  namaYayasan: 'YAYASAN BAYTU RAHMAH MADANIA',
  namaSekolah: 'SMP dan SMA IT Ar-Rahmah Cendekia',
  unitLaboratorium: 'UNIT LABORATORIUM IPA TERPADU SMP DAN SMA IT AR-RAHMAH CENDEKIA',
  alamat:
    'Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114',
  kotaPenetapan: 'Kota Tangerang',
  tanggalPenetapan: '', // Kosong = otomatis tanggal sistem saat ini
  pjTitle: 'Penanggung Jawab Laboratorium',
  pjInstansi: 'SMP dan SMA IT Ar-Rahmah Cendekia',
  pjNama: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
  pjNip: 'NIPY. 2026.ARC.0412',
  kepalaLabTitle: 'Kepala Laboratorium IPA Terpadu',
  kepalaLabInstansi: 'SMP dan SMA IT Ar-Rahmah Cendekia',
  kepalaLabNama: 'Ilham Nurkholis Majid, S. Pd., Gr.',
  kepalaLabNip: 'NIPY. 2026.ARC.0101',
  kepalaSekolahTitle: 'Mengetahui, Kepala Sekolah SMA IT Ar-Rahmah',
  kepalaSekolahInstansi: 'SMA IT Ar-Rahmah Cendekia',
  kepalaSekolahNama: 'Narendra Ichiputra Hariyanto, M. Pd.',
  kepalaSekolahNip: 'NIPY. 2026.ARC.0002',
};



// ==============================================================================
// MODUL BUKU KENDALI PRAKTIKUM GURU & BERITA ACARA OTOMATIS (2026)
// ==============================================================================

export type SchoolUnit = 'SMP' | 'SMA';

export interface LabClass {
  id: number;
  nama_kelas: string;
  tahun_ajaran: string;
  unit?: SchoolUnit;
  created_at?: string;
}

export type StudentStatus = 'aktif' | 'pindah' | 'keluar';

export interface LabStudent {
  id: number;
  nama_siswa: string;
  kelas_id: number;
  nisn?: string;
  unit?: SchoolUnit;
  gender?: 'Laki-laki' | 'Perempuan' | string;
  status?: StudentStatus;
  status_keterangan?: string;
  created_at?: string;
}

export interface ParsedExcelStudent {
  nama_siswa: string;
  nisn?: string;
  nama_kelas: string;
  tingkat_sekolah?: SchoolUnit;
  jenis_kelamin?: 'Laki-laki' | 'Perempuan';
  status_keaktifan?: string;
  tahun_ajaran?: string;
  isNisnFallback?: boolean;
}

export type StudentAttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';

export interface StudentScoreEntry {
  student_id: number;
  nama: string;
  nisn?: string;
  nilai_kinerja: number;
  nilai_laporan: number;
  nilai_akhir: number;
  status: StudentAttendanceStatus;
  catatan?: string;
}

export interface LabActivityRecord {
  id: number;
  tanggal_kegiatan: string;
  laboratorium: LabId;
  kelas_id: number;
  judul_percobaan: string;
  materi_pokok?: string;
  jumlah_hadir: number;
  jumlah_absen: number;
  nama_absen?: string;
  rekap_nilai_json: string; // JSON String of StudentScoreEntry[]
  catatan_kejadian?: string;
  guru_id?: number;
  nama_guru?: string;
  created_at?: string;
}

export interface NewLabActivityInput {
  tanggal_kegiatan: string;
  laboratorium: LabId;
  kelas_id: number;
  judul_percobaan: string;
  materi_pokok?: string;
  catatan_kejadian?: string;
  guru_id?: number;
  nama_guru?: string;
  student_scores?: StudentScoreEntry[];
  rekap_nilai_json?: string;
  jumlah_hadir?: number;
  jumlah_absen?: number;
  nama_absen?: string;
}

export interface LabActivityLabSummary {
  laboratorium: LabId;
  nama_lab: string;
  total_aktivitas: number;
  total_siswa_hadir: number;
  total_siswa_absen: number;
  nilai_rata_rata: number;
}

export interface LabActivitiesGroupedSummary {
  byLab: Record<LabId, LabActivityLabSummary>;
  totalAktivitasAll: number;
  rataRataSemuaLab: number;
}

export const INITIAL_LAB_CLASSES: LabClass[] = [
  { id: 1, nama_kelas: 'XII MIPA 1 (SMA)', tahun_ajaran: '2025/2026', unit: 'SMA' },
  { id: 2, nama_kelas: 'XI MIPA 2 (SMA)', tahun_ajaran: '2025/2026', unit: 'SMA' },
  { id: 3, nama_kelas: 'VIII-A (SMP Terpadu)', tahun_ajaran: '2025/2026', unit: 'SMP' },
  { id: 4, nama_kelas: 'VII-B (SMP Terpadu)', tahun_ajaran: '2025/2026', unit: 'SMP' },
];

export const INITIAL_LAB_STUDENTS: LabStudent[] = [
  { id: 1, nama_siswa: 'Ahmad Fathan Al-Ghifari', kelas_id: 1, nisn: '0075849301', status: 'aktif' },
  { id: 2, nama_siswa: 'Aisyah Putri Azzahra', kelas_id: 1, nisn: '0079384722', status: 'aktif' },
  { id: 3, nama_siswa: 'Fadhil Muhammad Rayyan', kelas_id: 1, nisn: '0074628193', status: 'aktif' },
  { id: 4, nama_siswa: 'Nabila Khairunnisa', kelas_id: 1, nisn: '0081739485', status: 'aktif' },
  { id: 5, nama_siswa: 'Zaidan Hafizh Ar-Rasyid', kelas_id: 1, nisn: '0079827402', status: 'aktif' },
  { id: 6, nama_siswa: 'Muhammad Rayhan Pratama', kelas_id: 2, nisn: '0082394811', status: 'aktif' },
  { id: 7, nama_siswa: 'Zahra Nurul Izzah', kelas_id: 2, nisn: '0083948192', status: 'aktif' },
  { id: 8, nama_siswa: 'Fakhri Ramadhan Al-Farisi', kelas_id: 3, nisn: '0092837461', status: 'aktif' },
  { id: 9, nama_siswa: 'Khansa Humaira Zahid', kelas_id: 3, nisn: '0093847562', status: 'aktif' },
  { id: 10, nama_siswa: 'Bilal Habibi Siregar', kelas_id: 3, nisn: '0091827364', status: 'aktif' },
  { id: 11, nama_siswa: 'Salma Salsabila Putri', kelas_id: 4, nisn: '0102938475', status: 'aktif' },
  { id: 12, nama_siswa: 'Umar Abdullah As-Syahid', kelas_id: 4, nisn: '0103948576', status: 'aktif' },
];

export const INITIAL_LAB_ACTIVITIES: LabActivityRecord[] = [
  {
    id: 1,
    tanggal_kegiatan: '2026-08-04',
    laboratorium: 'FISIKA',
    kelas_id: 1,
    judul_percobaan: 'Pengenalan Alat Ukur Panjang & Analisis Ketidakpastian Pengukuran Fisika',
    materi_pokok: 'Besaran, Satuan & Ketidakpastian Pengukuran',
    jumlah_hadir: 5,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 1, nama: 'Ahmad Fathan Al-Ghifari', nilai_kinerja: 85, nilai_laporan: 88, nilai_akhir: 87, status: 'Hadir' },
      { student_id: 2, nama: 'Aisyah Putri Azzahra', nilai_kinerja: 90, nilai_laporan: 92, nilai_akhir: 91, status: 'Hadir' },
      { student_id: 3, nama: 'Fadhil Muhammad Rayyan', nilai_kinerja: 84, nilai_laporan: 86, nilai_akhir: 85, status: 'Hadir' },
      { student_id: 4, nama: 'Nabila Khairunnisa', nilai_kinerja: 89, nilai_laporan: 90, nilai_akhir: 90, status: 'Hadir' },
      { student_id: 5, nama: 'Zaidan Hafizh Ar-Rasyid', nilai_kinerja: 86, nilai_laporan: 85, nilai_akhir: 86, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Sesi perdana semester ganjil. Seluruh siswa memahami K3 fisika dan perlakuan instrumen presisi.',
    guru_id: 2,
    nama_guru: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
    created_at: '2026-08-04 08:30:00',
  },
  {
    id: 2,
    tanggal_kegiatan: '2026-08-11',
    laboratorium: 'KIMIA',
    kelas_id: 2,
    judul_percobaan: 'Keselamatan Kerja Laboratorium & Manajemen Simbol Bahaya Bahan Kimia (MSDS)',
    materi_pokok: 'K3 Laboratorium & Simbol Bahan Kimia',
    jumlah_hadir: 2,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 6, nama: 'Muhammad Rayhan Pratama', nilai_kinerja: 88, nilai_laporan: 89, nilai_akhir: 89, status: 'Hadir' },
      { student_id: 7, nama: 'Zahra Nurul Izzah', nilai_kinerja: 92, nilai_laporan: 93, nilai_akhir: 93, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Pengenalan lemari asam dan eyewash station berjalan lancar tanpa kendala.',
    guru_id: 1,
    nama_guru: 'Ilham Nurkholis Majid, S. Pd., Gr.',
    created_at: '2026-08-11 10:00:00',
  },
  {
    id: 3,
    tanggal_kegiatan: '2026-08-18',
    laboratorium: 'BIOLOGI',
    kelas_id: 1,
    judul_percobaan: 'Teknik Penggunaan Mikroskop Cahaya & Pengamatan Sel Prokariotik Cyanobacteria',
    materi_pokok: 'Instrumen Sitologi & Keanekaragaman Sel',
    jumlah_hadir: 5,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 1, nama: 'Ahmad Fathan Al-Ghifari', nilai_kinerja: 87, nilai_laporan: 89, nilai_akhir: 88, status: 'Hadir' },
      { student_id: 2, nama: 'Aisyah Putri Azzahra', nilai_kinerja: 94, nilai_laporan: 95, nilai_akhir: 95, status: 'Hadir' },
      { student_id: 3, nama: 'Fadhil Muhammad Rayyan', nilai_kinerja: 86, nilai_laporan: 88, nilai_akhir: 87, status: 'Hadir' },
      { student_id: 4, nama: 'Nabila Khairunnisa', nilai_kinerja: 91, nilai_laporan: 92, nilai_akhir: 92, status: 'Hadir' },
      { student_id: 5, nama: 'Zaidan Hafizh Ar-Rasyid', nilai_kinerja: 85, nilai_laporan: 87, nilai_akhir: 86, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Siswa berhasil memfokuskan lensa okuler 10x dan objektif 40x secara higienis.',
    guru_id: 3,
    nama_guru: 'Siti Aminatuh Juhriah, M. Si., Gr.',
    created_at: '2026-08-18 09:15:00',
  },
  {
    id: 4,
    tanggal_kegiatan: '2026-08-25',
    laboratorium: 'SMP_TERPADU',
    kelas_id: 4,
    judul_percobaan: 'Pengukuran Besaran Pokok dan Turunan dalam Eksperimen IPA Terpadu',
    materi_pokok: 'Besaran Pokok & Pengukuran Massa/Volume',
    jumlah_hadir: 2,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 11, nama: 'Salma Salsabila Putri', nilai_kinerja: 90, nilai_laporan: 91, nilai_akhir: 91, status: 'Hadir' },
      { student_id: 12, nama: 'Umar Abdullah As-Syahid', nilai_kinerja: 88, nilai_laporan: 87, nilai_akhir: 88, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Praktikum neraca ohaus 3 lengan berjalan tertib. Seluruh beban telah disimpan kembali.',
    guru_id: 4,
    nama_guru: 'Farkhatul Amaliya, S. Pd',
    created_at: '2026-08-25 10:45:00',
  },
  {
    id: 5,
    tanggal_kegiatan: '2026-09-02',
    laboratorium: 'FISIKA',
    kelas_id: 2,
    judul_percobaan: 'Verifikasi Hukum Hooke & Penentuan Konstanta Pegas Spiral Tunggal dan Paralel',
    materi_pokok: 'Elastisitas Bahan & Hukum Hooke',
    jumlah_hadir: 2,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 6, nama: 'Muhammad Rayhan Pratama', nilai_kinerja: 89, nilai_laporan: 90, nilai_akhir: 90, status: 'Hadir' },
      { student_id: 7, nama: 'Zahra Nurul Izzah', nilai_kinerja: 94, nilai_laporan: 96, nilai_akhir: 95, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Grafik hubungan gaya vs pertambahan panjang linier sempurna sesuai teori.',
    guru_id: 2,
    nama_guru: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
    created_at: '2026-09-02 08:30:00',
  },
  {
    id: 6,
    tanggal_kegiatan: '2026-09-08',
    laboratorium: 'KIMIA',
    kelas_id: 1,
    judul_percobaan: 'Penetapan Sifat Koligatif Larutan: Penurunan Titik Beku Larutan Urea & NaCl',
    materi_pokok: 'Sifat Koligatif Larutan',
    jumlah_hadir: 5,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 1, nama: 'Ahmad Fathan Al-Ghifari', nilai_kinerja: 88, nilai_laporan: 89, nilai_akhir: 89, status: 'Hadir' },
      { student_id: 2, nama: 'Aisyah Putri Azzahra', nilai_kinerja: 93, nilai_laporan: 94, nilai_akhir: 94, status: 'Hadir' },
      { student_id: 3, nama: 'Fadhil Muhammad Rayyan', nilai_kinerja: 87, nilai_laporan: 86, nilai_akhir: 87, status: 'Hadir' },
      { student_id: 4, nama: 'Nabila Khairunnisa', nilai_kinerja: 92, nilai_laporan: 91, nilai_akhir: 92, status: 'Hadir' },
      { student_id: 5, nama: 'Zaidan Hafizh Ar-Rasyid', nilai_kinerja: 86, nilai_laporan: 88, nilai_akhir: 87, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Termometer alkohol digunakan dengan penangas es batu kasar bercampur garam kasar.',
    guru_id: 1,
    nama_guru: 'Ilham Nurkholis Majid, S. Pd., Gr.',
    created_at: '2026-09-08 09:30:00',
  },
  {
    id: 7,
    tanggal_kegiatan: '2026-09-15',
    laboratorium: 'BIOLOGI',
    kelas_id: 2,
    judul_percobaan: 'Transpor Membran Sel: Investigasi Laju Difusi dan Osmosis pada Silinder Kentang',
    materi_pokok: 'Bioproses dalam Sel & Osmoregulasi',
    jumlah_hadir: 2,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 6, nama: 'Muhammad Rayhan Pratama', nilai_kinerja: 90, nilai_laporan: 92, nilai_akhir: 91, status: 'Hadir' },
      { student_id: 7, nama: 'Zahra Nurul Izzah', nilai_kinerja: 95, nilai_laporan: 94, nilai_akhir: 95, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Pengukuran massa awal dan akhir silinder umbi kentang menggunakan neraca digital presisi 0.01 g.',
    guru_id: 3,
    nama_guru: 'Siti Aminatuh Juhriah, M. Si., Gr.',
    created_at: '2026-09-15 10:30:00',
  },
  {
    id: 8,
    tanggal_kegiatan: '2026-09-22',
    laboratorium: 'SMP_TERPADU',
    kelas_id: 3,
    judul_percobaan: 'Identifikasi Tingkat Keasaman Larutan Menggunakan Ekstrak Kunyit dan Kol Merah',
    materi_pokok: 'Klasifikasi Materi: Asam, Basa & Garam',
    jumlah_hadir: 3,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 8, nama: 'Fakhri Ramadhan Al-Farisi', nilai_kinerja: 89, nilai_laporan: 91, nilai_akhir: 90, status: 'Hadir' },
      { student_id: 9, nama: 'Khansa Humaira Zahid', nilai_kinerja: 94, nilai_laporan: 92, nilai_akhir: 93, status: 'Hadir' },
      { student_id: 10, nama: 'Bilal Habibi Siregar', nilai_kinerja: 87, nilai_laporan: 88, nilai_akhir: 88, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Plat tetes porselen dan pipet tetes dibersihkan tuntas setelah reaksi warna selesai.',
    guru_id: 4,
    nama_guru: 'Farkhatul Amaliya, S. Pd',
    created_at: '2026-09-22 08:30:00',
  },
  {
    id: 9,
    tanggal_kegiatan: '2026-09-29',
    laboratorium: 'FISIKA',
    kelas_id: 1,
    judul_percobaan: 'Penentuan Percepatan Gravitasi Bumi Lokal melalui Periode Ayunan Sederhana',
    materi_pokok: 'Getaran Harmonis Sederhana & Gravitasi',
    jumlah_hadir: 5,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 1, nama: 'Ahmad Fathan Al-Ghifari', nilai_kinerja: 90, nilai_laporan: 91, nilai_akhir: 91, status: 'Hadir' },
      { student_id: 2, nama: 'Aisyah Putri Azzahra', nilai_kinerja: 95, nilai_laporan: 96, nilai_akhir: 96, status: 'Hadir' },
      { student_id: 3, nama: 'Fadhil Muhammad Rayyan', nilai_kinerja: 87, nilai_laporan: 89, nilai_akhir: 88, status: 'Hadir' },
      { student_id: 4, nama: 'Nabila Khairunnisa', nilai_kinerja: 93, nilai_laporan: 92, nilai_akhir: 93, status: 'Hadir' },
      { student_id: 5, nama: 'Zaidan Hafizh Ar-Rasyid', nilai_kinerja: 88, nilai_laporan: 87, nilai_akhir: 88, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Didapatkan nilai percepatan g = 9.78 m/s² dengan galat relatif kurang dari 1.2%.',
    guru_id: 2,
    nama_guru: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
    created_at: '2026-09-29 11:00:00',
  },
  {
    id: 10,
    tanggal_kegiatan: '2026-10-12',
    laboratorium: 'SMP_TERPADU',
    kelas_id: 3,
    judul_percobaan: 'Uji Kandungan Nutrisi Glukosa, Protein, dan Lemak pada Berbagai Sampel Bahan Makanan',
    materi_pokok: 'Sistem Pencernaan & Nutrisi Makanan',
    jumlah_hadir: 3,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 8, nama: 'Fakhri Ramadhan Al-Farisi', nilai_kinerja: 89, nilai_laporan: 88, nilai_akhir: 89, status: 'Hadir' },
      { student_id: 9, nama: 'Khansa Humaira Zahid', nilai_kinerja: 93, nilai_laporan: 92, nilai_akhir: 93, status: 'Hadir' },
      { student_id: 10, nama: 'Bilal Habibi Siregar', nilai_kinerja: 86, nilai_laporan: 85, nilai_akhir: 86, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Pengujian reagen Benedict, Biuret, dan Lugol berjalan aman dengan penangas air.',
    guru_id: 4,
    nama_guru: 'Farkhatul Amaliya, S. Pd',
    created_at: '2026-10-12 11:00:00',
  },
  {
    id: 11,
    tanggal_kegiatan: '2026-10-15',
    laboratorium: 'BIOLOGI',
    kelas_id: 1,
    judul_percobaan: 'Pengamatan Struktur Sel Epidermis Bawang Merah (Allium cepa) dengan Mikroskop Cahaya Monokuler',
    materi_pokok: 'Struktur Sel Tumbuhan & Sitologi',
    jumlah_hadir: 4,
    jumlah_absen: 1,
    nama_absen: 'Zaidan Hafizh Ar-Rasyid (Izin)',
    rekap_nilai_json: JSON.stringify([
      { student_id: 1, nama: 'Ahmad Fathan Al-Ghifari', nilai_kinerja: 90, nilai_laporan: 91, nilai_akhir: 91, status: 'Hadir' },
      { student_id: 2, nama: 'Aisyah Putri Azzahra', nilai_kinerja: 95, nilai_laporan: 96, nilai_akhir: 96, status: 'Hadir' },
      { student_id: 3, nama: 'Fadhil Muhammad Rayyan', nilai_kinerja: 87, nilai_laporan: 89, nilai_akhir: 88, status: 'Hadir' },
      { student_id: 4, nama: 'Nabila Khairunnisa', nilai_kinerja: 92, nilai_laporan: 93, nilai_akhir: 93, status: 'Hadir' },
      { student_id: 5, nama: 'Zaidan Hafizh Ar-Rasyid', nilai_kinerja: 0, nilai_laporan: 0, nilai_akhir: 0, status: 'Izin' },
    ]),
    catatan_kejadian: 'Preparat basah berhasil diamati pada perbesaran 100x dan 400x. Kaca objek telah dibersihkan alkohol 70%.',
    guru_id: 3,
    nama_guru: 'Siti Aminatuh Juhriah, M. Si., Gr.',
    created_at: '2026-10-15 09:00:00',
  },
  {
    id: 12,
    tanggal_kegiatan: '2026-10-18',
    laboratorium: 'FISIKA',
    kelas_id: 1,
    judul_percobaan: 'Pengukuran Presisi Panjang dan Diameter Benda Menggunakan Jangka Sorong dan Mikrometer Sekrup',
    materi_pokok: 'Besaran, Satuan & Angka Penting',
    jumlah_hadir: 5,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 1, nama: 'Ahmad Fathan Al-Ghifari', nilai_kinerja: 86, nilai_laporan: 88, nilai_akhir: 87, status: 'Hadir' },
      { student_id: 2, nama: 'Aisyah Putri Azzahra', nilai_kinerja: 94, nilai_laporan: 95, nilai_akhir: 95, status: 'Hadir' },
      { student_id: 3, nama: 'Fadhil Muhammad Rayyan', nilai_kinerja: 88, nilai_laporan: 86, nilai_akhir: 87, status: 'Hadir' },
      { student_id: 4, nama: 'Nabila Khairunnisa', nilai_kinerja: 91, nilai_laporan: 90, nilai_akhir: 91, status: 'Hadir' },
      { student_id: 5, nama: 'Zaidan Hafizh Ar-Rasyid', nilai_kinerja: 85, nilai_laporan: 87, nilai_akhir: 86, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Seluruh jangka sorong dan mikrometer sekrup telah dikalibrasi titik nol dan tersimpan aman.',
    guru_id: 2,
    nama_guru: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
    created_at: '2026-10-18 10:15:00',
  },
  {
    id: 13,
    tanggal_kegiatan: '2026-10-21',
    laboratorium: 'KIMIA',
    kelas_id: 1,
    judul_percobaan: 'Titrasi Asam-Basa Menentukan Konsentrasi Larutan HCl dengan Standar NaOH 0.1 M',
    materi_pokok: 'Larutan Asam Basa & Stoikiometri Larutan',
    jumlah_hadir: 5,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 1, nama: 'Ahmad Fathan Al-Ghifari', nilai_kinerja: 88, nilai_laporan: 90, nilai_akhir: 89, status: 'Hadir' },
      { student_id: 2, nama: 'Aisyah Putri Azzahra', nilai_kinerja: 92, nilai_laporan: 94, nilai_akhir: 93, status: 'Hadir' },
      { student_id: 3, nama: 'Fadhil Muhammad Rayyan', nilai_kinerja: 85, nilai_laporan: 88, nilai_akhir: 87, status: 'Hadir' },
      { student_id: 4, nama: 'Nabila Khairunnisa', nilai_kinerja: 90, nilai_laporan: 92, nilai_akhir: 91, status: 'Hadir' },
      { student_id: 5, nama: 'Zaidan Hafizh Ar-Rasyid', nilai_kinerja: 87, nilai_laporan: 89, nilai_akhir: 88, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Praktikum berjalan tertib, seluruh buret dan labu Erlenmeyer telah dibersihkan serta disimpan ke rak B-02.',
    guru_id: 1,
    nama_guru: 'Ilham Nurkholis Majid, S. Pd., Gr.',
    created_at: '2026-10-21 08:30:00',
  },
  {
    id: 14,
    tanggal_kegiatan: '2026-11-03',
    laboratorium: 'KIMIA',
    kelas_id: 2,
    judul_percobaan: 'Kinetika Kimia: Investigasi Faktor Konsentrasi dan Suhu terhadap Laju Reaksi Na2S2O3',
    materi_pokok: 'Laju Reaksi & Teori Tumbukan',
    jumlah_hadir: 2,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 6, nama: 'Muhammad Rayhan Pratama', nilai_kinerja: 91, nilai_laporan: 93, nilai_akhir: 92, status: 'Hadir' },
      { student_id: 7, nama: 'Zahra Nurul Izzah', nilai_kinerja: 94, nilai_laporan: 95, nilai_akhir: 95, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Reaksi pembentukan endapan belerang diukur dengan stopwatch digital. Hasil tercatat rapi.',
    guru_id: 1,
    nama_guru: 'Ilham Nurkholis Majid, S. Pd., Gr.',
    created_at: '2026-11-03 09:00:00',
  },
  {
    id: 15,
    tanggal_kegiatan: '2026-11-10',
    laboratorium: 'BIOLOGI',
    kelas_id: 2,
    judul_percobaan: 'Fotosintesis Percobaan Ingenhousz Membuktikan Pelepasan Gas Oksigen pada Hydrilla verticillata',
    materi_pokok: 'Metabolisme Tumbuhan & Fotosintesis',
    jumlah_hadir: 2,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 6, nama: 'Muhammad Rayhan Pratama', nilai_kinerja: 92, nilai_laporan: 90, nilai_akhir: 91, status: 'Hadir' },
      { student_id: 7, nama: 'Zahra Nurul Izzah', nilai_kinerja: 96, nilai_laporan: 95, nilai_akhir: 96, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Penambahan NaHCO3 mempercepat laju pelepasan gelembung gas secara signifikan.',
    guru_id: 3,
    nama_guru: 'Siti Aminatuh Juhriah, M. Si., Gr.',
    created_at: '2026-11-10 10:15:00',
  },
  {
    id: 16,
    tanggal_kegiatan: '2026-11-17',
    laboratorium: 'SMP_TERPADU',
    kelas_id: 4,
    judul_percobaan: 'Pemisahan Campuran Sederhana Menggunakan Metode Filtrasi Kertas Saring dan Evaporasi Garam',
    materi_pokok: 'Metode Pemisahan Campuran Kimia Terpadu',
    jumlah_hadir: 2,
    jumlah_absen: 0,
    nama_absen: '',
    rekap_nilai_json: JSON.stringify([
      { student_id: 11, nama: 'Salma Salsabila Putri', nilai_kinerja: 92, nilai_laporan: 93, nilai_akhir: 93, status: 'Hadir' },
      { student_id: 12, nama: 'Umar Abdullah As-Syahid', nilai_kinerja: 89, nilai_laporan: 90, nilai_akhir: 90, status: 'Hadir' },
    ]),
    catatan_kejadian: 'Kristal garam putih terbentuk sempurna setelah pemanasan cawan penguap di atas kasa asbes.',
    guru_id: 4,
    nama_guru: 'Farkhatul Amaliya, S. Pd',
    created_at: '2026-11-17 08:45:00',
  },
];

// ==============================================================================
// TOAST NOTIFICATIONS (NON-INTRUSIVE USER FEEDBACK & ACL ALERTS)
// ==============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // in milliseconds, default 4500
  timestamp?: number;
}

