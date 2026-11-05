import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '../context/InventoryContext';
import {
  LabStudent,
  LabClass,
  SchoolUnit,
  StudentStatus,
  ParsedExcelStudent,
} from '../types/inventory';
import {
  isValidNisn,
  generateFallbackNisn,
  normalizeGender,
} from '../services/googleAppsScriptService';
import {
  GraduationCap,
  Users,
  UserPlus,
  Plus,
  Upload,
  FileSpreadsheet,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileDown,
  Building2,
  Calendar,
  Layers,
  BookOpen,
  Shield,
  ShieldAlert,
  Info,
  Check,
  Lock,
  Download,
  Sparkles,
} from 'lucide-react';

import { matchId, safeParseScores, getSchoolUnit } from '../utils/helpers';

export const StudentClassRecords: React.FC = () => {
  const {
    currentUser,
    classes,
    students,
    labActivities,
    addLabClass,
    deleteLabClass,
    addLabStudent,
    importStudentsFromExcel,
    importMultiClassStudents,
    updateLabStudent,
    deleteLabStudent,
    isAdmin,
    isGuru,
    isHeadOfLab,
    canManageUsers,
    showToast,
  } = useInventory();

  // Role-Based Access Control (RBAC):
  // HANYA AKUN ADMIN (Kepala Lab) yang berwenang menambah/menghapus kelas, menambah/menghapus siswa, import data, dan pengaturan sistem.
  // Akun Laboran & Guru dibatasi sebagai READ-ONLY pada data siswa dan rombel.
  const isActualAdmin = Boolean(
    isAdmin ||
    isHeadOfLab ||
    currentUser?.role === 'KEPALA_LAB' ||
    (currentUser as any)?.role === 'admin' ||
    canManageUsers ||
    (currentUser?.email || '').toLowerCase().trim() === 'ilham.nurkholis114@guru.sma.belajar.id'
  );

  // Selected Class ID
  const [selectedClassId, setSelectedClassId] = useState<number | string>(() => {
    return classes.length > 0 ? classes[0].id : 1;
  });

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Confirmation Modal State (In-App Dialog, Bypass window.confirm sandbox block)
  interface DeleteConfirmModalState {
    isOpen: boolean;
    type: 'STUDENT' | 'CLASS';
    student?: LabStudent;
    cls?: LabClass;
    studentCount?: number;
    activitiesCount?: number;
  }
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmModalState | null>(null);

  // Unit filter state ('ALL' | 'SMP' | 'SMA')
  const [unitFilter, setUnitFilter] = useState<'ALL' | SchoolUnit>('ALL');

  // Modals state
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassYear, setNewClassYear] = useState('2025/2026');
  const [newClassUnit, setNewClassUnit] = useState<SchoolUnit>('SMA');

  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNisn, setNewStudentNisn] = useState('');

  // Excel Import state (Multi-Sheet / Multi-Rombel supported)
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParsedStudents, setExcelParsedStudents] = useState<ParsedExcelStudent[]>([]);
  const [excelErrorMsg, setExcelErrorMsg] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'AUTO_MULTI' | 'SINGLE_ACTIVE'>('AUTO_MULTI');
  const [isImporting, setIsImporting] = useState(false);

  // Edit Student state (including StudentStatus: aktif / pindah / keluar)
  const [editingStudent, setEditingStudent] = useState<LabStudent | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentNisn, setEditStudentNisn] = useState('');
  const [editStudentStatus, setEditStudentStatus] = useState<StudentStatus>('aktif');
  const [editStudentKeterangan, setEditStudentKeterangan] = useState('');

  // Filtered classes by selected SchoolUnit
  const filteredClasses = useMemo(() => {
    if (unitFilter === 'ALL') return classes;
    return classes.filter((c) => getSchoolUnit(c.nama_kelas, c.unit) === unitFilter);
  }, [classes, unitFilter]);

  // Active Class details
  const activeClass = useMemo(() => {
    return (
      classes.find((c) => matchId(c.id, selectedClassId)) ||
      filteredClasses[0] ||
      classes[0] || { id: 1, nama_kelas: 'Semua Kelas', tahun_ajaran: '2025/2026' }
    );
  }, [classes, filteredClasses, selectedClassId]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return students.filter((s) => matchId(s.kelas_id, selectedClassId));
  }, [students, selectedClassId]);

  // Filtered students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase().trim();
    return classStudents.filter(
      (s) =>
        s.nama_siswa.toLowerCase().includes(q) ||
        (s.nisn && s.nisn.toLowerCase().includes(q))
    );
  }, [classStudents, searchQuery]);

  // Attendance stats for students (Memoized lookup table for Anti-Lag O(1) retrieval)
  const attendanceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    const classActivities = labActivities.filter((act) => matchId(act.kelas_id, selectedClassId));
    classActivities.forEach((act) => {
      const scores = safeParseScores(act.rekap_nilai_json);
      scores.forEach((sc) => {
        const sId = (sc as any).student_id ?? (sc as any).siswa_id;
        const status = String(sc.status || '').toLowerCase();
        if (sId !== undefined && (status === 'hadir' || status === 'terlambat')) {
          const key = String(sId);
          map.set(key, (map.get(key) || 0) + 1);
        }
      });
    });
    return map;
  }, [labActivities, selectedClassId]);

  const getStudentAttendanceCount = (studentId: number | string) => {
    return attendanceCountMap.get(String(studentId)) || 0;
  };

  // 1. Submit Add Class (Hanya Kewenangan Admin / Kepala Lab)
  const handleAddClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Akses Khusus Admin)',
        message: 'Fitur tambah rombel/kelas baru hanya kewenangan Admin (Kepala Lab).',
      });
      return;
    }
    if (!newClassName.trim()) {
      showToast({ type: 'warning', title: 'Data Kurang', message: 'Nama kelas wajib diisi.' });
      return;
    }
    const res = addLabClass(newClassName.trim(), newClassYear.trim() || '2025/2026', newClassUnit);
    if (res.success && res.newClass) {
      setSelectedClassId(res.newClass.id);
      setIsAddClassModalOpen(false);
      setNewClassName('');
    }
  };

  // 2. Buka Modal Konfirmasi Hapus 1 Kelas Secara Keseluruhan (Hanya Kewenangan Admin / Kepala Lab)
  const handleDeleteActiveClass = () => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Akses Khusus Admin)',
        message: 'Fitur hapus rombel/kelas hanya kewenangan Admin (Kepala Lab).',
      });
      return;
    }
    if (classes.length <= 1) {
      showToast({
        type: 'warning',
        title: 'Perhatian',
        message: 'Tidak dapat menghapus. Sistem harus memiliki minimal 1 kelas terdaftar.',
      });
      return;
    }

    const countInClass = classStudents.length;
    const countActivities = labActivities.filter((act) => matchId(act.kelas_id, activeClass.id)).length;
    setDeleteConfirm({
      isOpen: true,
      type: 'CLASS',
      cls: activeClass,
      studentCount: countInClass,
      activitiesCount: countActivities,
    });
  };

  // 3. Submit Add Student Manual (Hanya Admin / Kepala Lab)
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Akses Khusus Admin)',
        message: 'Hanya Admin (Kepala Lab) yang berwenang menambah data siswa. Akun Laboran dan Guru bersifat Read-Only.',
      });
      return;
    }
    if (!newStudentName.trim()) {
      showToast({ type: 'warning', title: 'Data Kurang', message: 'Nama siswa wajib diisi.' });
      return;
    }
    const res = addLabStudent(Number(selectedClassId), newStudentName.trim(), newStudentNisn.trim() || undefined);
    if (res.success) {
      setNewStudentName('');
      setNewStudentNisn('');
      setIsAddStudentModalOpen(false);
    }
  };

  // 4. Download Format Template Standar Excel (6 Kolom Konsisten dengan Google Sheets)
  const handleDownloadStandardStudentTemplate = () => {
    const templateHeaders = [
      'NISN',
      'Nama_Lengkap_Santri',
      'Tingkat_Sekolah',
      'Kelas_Rombel',
      'Jenis_Kelamin',
      'Status_Keaktifan',
    ];

    const sampleRows = [
      {
        NISN: '0075849301',
        Nama_Lengkap_Santri: 'Ahmad Fathan Al-Ghifari',
        Tingkat_Sekolah: 'SMA',
        Kelas_Rombel: 'XII MIPA 1 (SMA)',
        Jenis_Kelamin: 'Laki-laki',
        Status_Keaktifan: 'Aktif',
      },
      {
        NISN: '0079384722',
        Nama_Lengkap_Santri: 'Aisyah Putri Azzahra',
        Tingkat_Sekolah: 'SMA',
        Kelas_Rombel: 'XII MIPA 1 (SMA)',
        Jenis_Kelamin: 'Perempuan',
        Status_Keaktifan: 'Aktif',
      },
      {
        NISN: '-', // Jika NISN kosong/- di Excel, sistem otomatis men-generate ID Unik otomatis
        Nama_Lengkap_Santri: 'Fakhri Ramadhan Al-Farisi',
        Tingkat_Sekolah: 'SMP',
        Kelas_Rombel: 'VIII-A (SMP Terpadu)',
        Jenis_Kelamin: 'Laki-laki',
        Status_Keaktifan: 'Aktif',
      },
      {
        NISN: '', // Jika kosong, juga otomatis aman digenerate tanpa tabrakan baris di Google Sheets
        Nama_Lengkap_Santri: 'Khansa Humaira Zahid',
        Tingkat_Sekolah: 'SMP',
        Kelas_Rombel: 'VIII-A (SMP Terpadu)',
        Jenis_Kelamin: 'Perempuan',
        Status_Keaktifan: 'Aktif',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: templateHeaders });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Siswa');
    XLSX.writeFile(wb, 'Format_Import_Santri_SIMLAB.xlsx');
  };

  // 5. Handle Excel File Change (Validasi NISN, Pembersihan Kolom & Pemisahan Kelas/Rombel)
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setExcelErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setExcelErrorMsg('Lembar kerja Excel tidak ditemukan.');
          setExcelParsedStudents([]);
          return;
        }

        const aggregatedList: ParsedExcelStudent[] = [];
        let globalRowCounter = 1;

        // Parse through ALL sheets in the Excel workbook
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) return;

          const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          if (!rawJson || rawJson.length === 0) return;

          // Determine if sheetName itself represents a class name
          const cleanSheetName = sheetName.trim();
          const isGenericSheet =
            /^sheet\s*\d*$/i.test(cleanSheetName) ||
            /^lembar\s*\d*$/i.test(cleanSheetName) ||
            /^data_siswa$/i.test(cleanSheetName) ||
            /^siswa$/i.test(cleanSheetName);

          rawJson.forEach((row) => {
            let rawNama = '';
            let rawNisn = '';
            let rawKelas = '';
            let rawTingkat = '';
            let rawGender = '';
            let rawStatus = '';
            let tahun = '2025/2026';

            Object.keys(row).forEach((col) => {
              const cleanCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');
              const val = String(row[col]).trim();

              // Deteksi Kolom: Nama_Lengkap_Santri
              if (
                !rawNama &&
                (cleanCol.includes('namalengkap') ||
                  cleanCol.includes('namasantri') ||
                  cleanCol.includes('namasiswa') ||
                  cleanCol.includes('nama') ||
                  cleanCol.includes('santri') ||
                  cleanCol.includes('pesertadidik') ||
                  cleanCol.includes('murid'))
              ) {
                rawNama = val;
              }
              // Deteksi Kolom: NISN
              else if (
                !rawNisn &&
                (cleanCol.includes('nisn') ||
                  cleanCol.includes('noinduk') ||
                  cleanCol.includes('nomorinduk') ||
                  cleanCol.includes('nis') ||
                  cleanCol.includes('nik') ||
                  cleanCol.includes('idsiswa'))
              ) {
                rawNisn = val;
              }
              // Deteksi Kolom: Kelas_Rombel
              else if (
                !rawKelas &&
                (cleanCol.includes('kelasrombel') ||
                  cleanCol.includes('rombel') ||
                  cleanCol.includes('kelas') ||
                  cleanCol.includes('subkelas') ||
                  cleanCol.includes('kelompok') ||
                  cleanCol.includes('class'))
              ) {
                rawKelas = val;
              }
              // Deteksi Kolom: Tingkat_Sekolah (SMP / SMA)
              else if (
                !rawTingkat &&
                (cleanCol.includes('tingkatsekolah') ||
                  cleanCol.includes('tingkat') ||
                  cleanCol.includes('jenjang') ||
                  cleanCol.includes('unit') ||
                  cleanCol.includes('sekolah'))
              ) {
                rawTingkat = val;
              }
              // Deteksi Kolom: Jenis_Kelamin
              else if (
                !rawGender &&
                (cleanCol.includes('jeniskelamin') ||
                  cleanCol.includes('kelamin') ||
                  cleanCol.includes('gender') ||
                  cleanCol.includes('sex') ||
                  cleanCol === 'jk' ||
                  cleanCol === 'lp')
              ) {
                rawGender = val;
              }
              // Deteksi Kolom: Status_Keaktifan
              else if (
                !rawStatus &&
                (cleanCol.includes('statuskeaktifan') ||
                  cleanCol.includes('keaktifan') ||
                  cleanCol.includes('status'))
              ) {
                rawStatus = val;
              }
              // Deteksi Tahun Ajaran
              else if (cleanCol.includes('tahun') || cleanCol.includes('ajaran')) {
                tahun = val || '2025/2026';
              }
            });

            // Fallback for headerless row (misal file tanpa baris header)
            if (!rawNama) {
              const cols = Object.keys(row);
              if (cols.length > 0 && String(row[cols[0]]).trim()) {
                const firstVal = String(row[cols[0]]).trim();
                if (firstVal.toLowerCase() !== 'no' && firstVal.toLowerCase() !== 'nomor') {
                  rawNama = firstVal;
                } else if (cols.length > 1 && String(row[cols[1]]).trim()) {
                  rawNama = String(row[cols[1]]).trim();
                  if (cols.length > 2 && !rawNisn) rawNisn = String(row[cols[2]]).trim();
                }
              }
            }

            const cleanNamaLower = rawNama.toLowerCase().trim();
            if (
              rawNama &&
              cleanNamaLower !== 'nama' &&
              cleanNamaLower !== 'nama siswa' &&
              cleanNamaLower !== 'nama lengkap santri' &&
              cleanNamaLower !== 'nama santri' &&
              cleanNamaLower !== 'nama_lengkap_santri'
            ) {
              // 1. Parsing & Normalisasi Kelas / Rombel (Memisahkan daftar santri ke rombel yang sesuai)
              let finalClassName = activeClass.nama_kelas;
              if (rawKelas && rawKelas.length > 0 && rawKelas !== '-') {
                finalClassName = rawKelas.trim();
              } else if (!isGenericSheet && cleanSheetName.length > 0) {
                finalClassName = cleanSheetName;
              }

              // 2. Validasi & Fallback NISN Unik (Cegah penimpaan entitas di Google Sheets)
              let finalNisn = '';
              let isFallback = false;
              if (isValidNisn(rawNisn)) {
                finalNisn = rawNisn.trim();
              } else {
                finalNisn = generateFallbackNisn(globalRowCounter++);
                isFallback = true;
              }

              // 3. Tingkat Sekolah (SMP vs SMA)
              const inferredUnit: SchoolUnit = rawTingkat.toUpperCase().includes('SMP')
                ? 'SMP'
                : rawTingkat.toUpperCase().includes('SMA')
                ? 'SMA'
                : getSchoolUnit(finalClassName);

              // 4. Jenis Kelamin
              const finalGender = normalizeGender(rawGender);

              // 5. Status Keaktifan
              const finalStatus = rawStatus.toLowerCase().includes('pindah')
                ? 'Pindah'
                : rawStatus.toLowerCase().includes('keluar')
                ? 'Keluar'
                : 'Aktif';

              aggregatedList.push({
                nama_siswa: rawNama.trim(),
                nisn: finalNisn,
                nama_kelas: finalClassName,
                tingkat_sekolah: inferredUnit,
                jenis_kelamin: finalGender,
                status_keaktifan: finalStatus,
                tahun_ajaran: tahun || activeClass.tahun_ajaran || '2025/2026',
                isNisnFallback: isFallback,
              });
            }
          });
        });

        if (aggregatedList.length === 0) {
          setExcelErrorMsg('Sistem tidak menemukan kolom Nama Siswa yang valid pada seluruh sheet file Excel.');
          setExcelParsedStudents([]);
        } else {
          setExcelParsedStudents(aggregatedList);
          setExcelErrorMsg(null);
        }
      } catch (err: any) {
        setExcelErrorMsg('Gagal membaca file Excel: ' + (err.message || 'Format tidak valid'));
        setExcelParsedStudents([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Grouping summary of parsed students by Class Name
  const parsedClassesSummary = useMemo(() => {
    const map = new Map<string, number>();
    excelParsedStudents.forEach((st) => {
      const cls = st.nama_kelas || activeClass.nama_kelas;
      map.set(cls, (map.get(cls) || 0) + 1);
    });
    return Array.from(map.entries()).map(([nama_kelas, count]) => ({
      nama_kelas,
      count,
      existsInDb: classes.some((c) => c.nama_kelas.toLowerCase().trim() === nama_kelas.toLowerCase().trim()),
    }));
  }, [excelParsedStudents, classes, activeClass]);

  // Count fallback NISNs generated
  const fallbackNisnCount = useMemo(() => {
    return excelParsedStudents.filter((s) => s.isNisnFallback).length;
  }, [excelParsedStudents]);

  // 6. Confirm Excel Import (Hanya Admin / Kepala Lab) dengan Anti Double-Submit
  const handleConfirmExcelImport = () => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Akses Khusus Admin)',
        message: 'Hanya Admin (Kepala Lab) yang berwenang mengimpor data siswa. Akun Laboran dan Guru bersifat Read-Only.',
      });
      return;
    }
    if (excelParsedStudents.length === 0 || isImporting) return;

    setIsImporting(true);
    try {
      if (importMode === 'AUTO_MULTI') {
        const res = importMultiClassStudents(excelParsedStudents);
        if (res.success) {
          setIsExcelImportModalOpen(false);
          setExcelParsedStudents([]);
          setExcelFileName('');
        } else {
          setExcelErrorMsg(res.message);
        }
      } else {
        // Single Class Mode: forces all into active class
        const singleList = excelParsedStudents.map((s) => ({
          nama_siswa: s.nama_siswa,
          nisn: s.nisn,
          gender: s.jenis_kelamin,
          status: s.status_keaktifan,
        }));
        const res = importStudentsFromExcel(Number(selectedClassId), singleList);
        if (res.success) {
          setIsExcelImportModalOpen(false);
          setExcelParsedStudents([]);
          setExcelFileName('');
        } else {
          setExcelErrorMsg(res.message);
        }
      }
    } finally {
      setIsImporting(false);
    }
  };

  // 6. Open Edit Student Modal (Hanya Admin / Kepala Lab)
  const handleOpenEditStudent = (s: LabStudent) => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Akses Khusus Admin)',
        message: 'Hanya Admin (Kepala Lab) yang berwenang mengubah data siswa.',
      });
      return;
    }
    setEditingStudent(s);
    setEditStudentName(s.nama_siswa);
    setEditStudentNisn(s.nisn || '');
    setEditStudentStatus(s.status || 'aktif');
    setEditStudentKeterangan(s.status_keterangan || '');
  };

  // 7. Save Edit Student (Hanya Admin / Kepala Lab)
  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isActualAdmin) return;
    if (!editingStudent) return;
    if (!editStudentName.trim()) {
      showToast({ type: 'warning', title: 'Data Kurang', message: 'Nama siswa wajib diisi.' });
      return;
    }
    const res = updateLabStudent(editingStudent.id, {
      nama_siswa: editStudentName.trim(),
      nisn: editStudentNisn.trim() || undefined,
      status: editStudentStatus,
      status_keterangan: editStudentKeterangan.trim() || undefined,
    });
    if (res.success) {
      setEditingStudent(null);
    }
  };

  // 8. Buka Modal Konfirmasi Hapus Siswa Manual (Hanya Admin / Kepala Lab)
  const handleDeleteStudent = (s: LabStudent) => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Khusus Admin / Kepala Lab)',
        message: 'Selain akun Admin (Kepala Lab), akun lainnya tidak dapat mengakses fitur hapus siswa di dalam kelas.',
      });
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      type: 'STUDENT',
      student: s,
    });
  };

  // 8b. Eksekusi Hapus yang Terkonfirmasi (Siswa atau 1 Kelas Penuh)
  const handleConfirmDeleteAction = () => {
    if (!isActualAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Khusus Admin / Kepala Lab)',
        message: 'Selain akun Admin (Kepala Lab), akun lainnya tidak dapat mengakses fitur hapus siswa di dalam kelas.',
      });
      setDeleteConfirm(null);
      return;
    }
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'STUDENT' && deleteConfirm.student) {
      const targetId = deleteConfirm.student.id;
      const res = deleteLabStudent(targetId);
      if (res.success) {
        if (editingStudent && matchId(editingStudent.id, targetId)) {
          setEditingStudent(null);
        }
        setDeleteConfirm(null);
      } else {
        showToast({ type: 'error', title: 'Gagal Menghapus', message: res.message });
      }
    } else if (deleteConfirm.type === 'CLASS' && deleteConfirm.cls) {
      const targetClassId = deleteConfirm.cls.id;
      const res = deleteLabClass(targetClassId);
      if (res.success) {
        // Alihkan seleksi kelas secara aman ke rombel tersisa
        const remaining = classes.filter((c) => !matchId(c.id, targetClassId));
        if (remaining.length > 0) {
          setSelectedClassId(remaining[0].id);
        }
        setSearchQuery('');
        setEditingStudent(null);
        setDeleteConfirm(null);
      } else {
        showToast({ type: 'error', title: 'Gagal Menghapus', message: res.message });
      }
    }
  };

  // 9. Export Student List to Excel
  const handleExportRosterExcel = () => {
    if (classStudents.length === 0) {
      showToast({ type: 'warning', title: 'Data Kosong', message: 'Belum ada siswa di kelas ini.' });
      return;
    }

    const data = classStudents.map((s, idx) => ({
      No: idx + 1,
      NISN: s.nisn || '-',
      'Nama Siswa': s.nama_siswa,
      Kelas: activeClass.nama_kelas,
      'Tahun Ajaran': activeClass.tahun_ajaran,
      'Total Sesi Praktikum': getStudentAttendanceCount(s.id),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Siswa ${activeClass.nama_kelas}`.substring(0, 31));
    XLSX.writeFile(wb, `Daftar_Siswa_${activeClass.nama_kelas.replace(/\s+/g, '_')}_2026.xlsx`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-white/95 backdrop-blur-xs p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-[11px] font-bold text-teal-800 uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5 text-teal-700" />
              <span>Direktori Siswa & Rombel Kelas</span>
              <span aria-hidden="true" className="text-teal-400">·</span>
              <span>Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia</span>
            </div>

            {/* Role indicator badge */}
            {isActualAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Admin / Kepala Lab (Otoritas Penuh: Hapus & Kelola Siswa)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>{currentUser?.roleTitle || 'Akun Non-Admin'} (Mode Read-Only — Hapus Siswa Khusus Admin)</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Data Siswa & Rombongan Belajar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            {isActualAdmin
              ? 'Kelola master rombel kelas, tambah/hapus siswa, import data via Excel multi-halaman, dan kontrol data santri (Kewenangan Khusus Kepala Lab).'
              : 'Daftar rekapitulasi santri per kelas dalam mode Read-Only. Selain akun Admin (Kepala Lab), akun lainnya tidak dapat mengakses fitur hapus siswa di dalam kelas.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportRosterExcel}
            className="min-h-[42px] px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            title="Unduh roster siswa kelas aktif ke format Excel"
          >
            <FileDown className="w-4 h-4 text-slate-600" />
            <span>Unduh Excel</span>
          </button>

          {/* Action Buttons: Tambah/Import Siswa & Buat Kelas HANYA untuk Admin (Kepala Lab) */}
          {isActualAdmin ? (
            <>
              <button
                onClick={() => setIsAddClassModalOpen(true)}
                className="min-h-[42px] px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                title="Buat rombel / kelas baru di sistem (Khusus Admin / Kepala Lab)"
              >
                <Building2 className="w-4 h-4 text-teal-700" />
                <span>+ Buat Kelas Baru</span>
              </button>

              <button
                onClick={() => {
                  setExcelParsedStudents([]);
                  setExcelFileName('');
                  setExcelErrorMsg(null);
                  setImportMode('AUTO_MULTI');
                  setIsExcelImportModalOpen(true);
                }}
                className="min-h-[42px] px-3.5 py-2 bg-teal-50 hover:bg-teal-100/90 text-teal-900 border border-teal-200/90 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                title="Import data siswa dari Excel (mendukung multi-sheet dan multi-rombel)"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                <span>Import Siswa (Excel Multi-Rombel)</span>
              </button>

              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                className="min-h-[42px] px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-teal-400" />
                <span>+ Tambah Siswa</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs rounded-xl shadow-2xs font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Akses Khusus Admin / Kepala Lab</span>
              <span className="text-[10.5px] text-amber-700 font-normal">
                (Laboran & Guru: Mode Read-Only)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Kelas Terdaftar
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {classes.length} <span className="text-xs font-sans font-normal text-slate-500">rombel</span>
          </div>
          <div className="text-[11px] text-teal-700 font-semibold mt-1">SMP & SMA IT</div>
        </div>

        <div className="bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Seluruh Siswa
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {students.length} <span className="text-xs font-sans font-normal text-slate-500">santri</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tersimpan di database</div>
        </div>

        <div className="bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
            Siswa di Kelas Aktif
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-teal-800 mt-1 tabular-nums">
            {classStudents.length} <span className="text-xs font-sans font-normal text-teal-600">orang</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">{activeClass.nama_kelas}</div>
        </div>

        <div className="bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Sesi Praktikum
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {labActivities.filter((a) => Number(a.kelas_id) === Number(selectedClassId)).length}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">sesi</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Jurnal kelas ini</div>
        </div>
      </div>

      {/* Class Selector Bar & Search Bar & Class Delete Button */}
      <div className="bg-white/95 backdrop-blur-xs p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        {/* Unit Tabs Filter (SMP IT vs SMA IT) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Unit Sekolah:
            </span>
            <button
              type="button"
              onClick={() => {
                setUnitFilter('ALL');
                if (classes.length > 0 && !classes.some(c => matchId(c.id, selectedClassId))) {
                  setSelectedClassId(classes[0].id);
                }
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                unitFilter === 'ALL'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Unit ({classes.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setUnitFilter('SMP');
                const smp = classes.filter(c => getSchoolUnit(c.nama_kelas, c.unit) === 'SMP');
                if (smp.length > 0 && !smp.some(c => matchId(c.id, selectedClassId))) {
                  setSelectedClassId(smp[0].id);
                }
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                unitFilter === 'SMP'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              SMP IT (IPA Terpadu)
            </button>
            <button
              type="button"
              onClick={() => {
                setUnitFilter('SMA');
                const sma = classes.filter(c => getSchoolUnit(c.nama_kelas, c.unit) === 'SMA');
                if (sma.length > 0 && !sma.some(c => matchId(c.id, selectedClassId))) {
                  setSelectedClassId(sma[0].id);
                }
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                unitFilter === 'SMA'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              SMA IT (Kimia/Fisika/Biologi)
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Rombel Terpilih:{' '}
            <span className="font-bold text-teal-800">{activeClass.nama_kelas}</span>{' '}
            <span className="text-[11px] font-semibold text-slate-500">
              ({getSchoolUnit(activeClass.nama_kelas, activeClass.unit)} IT)
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Class Select Dropdown / Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Pilih Kelas:
            </span>
            {filteredClasses.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Tidak ada kelas untuk unit ini.</span>
            ) : (
              filteredClasses.map((cls) => {
                const isSelected = matchId(cls.id, selectedClassId);
                const countInClass = students.filter((s) => matchId(s.kelas_id, cls.id)).length;
                const unit = getSchoolUnit(cls.nama_kelas, cls.unit);
                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                    }`}
                  >
                    <span>{cls.nama_kelas}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                        isSelected ? 'bg-slate-700 text-teal-300' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {unit}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-teal-500 text-slate-950 font-extrabold' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {countInClass}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Delete Active Class Button (HANYA Kewenangan Admin / Kepala Lab) */}
          {isActualAdmin ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDeleteActiveClass}
                className="min-h-[38px] px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                title={`Hapus kelas ${activeClass.nama_kelas} dan seluruh siswa di dalamnya (Kewenangan Khusus Admin / Kepala Lab)`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Hapus Kelas Ini</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200/80 rounded-xl text-slate-500 text-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Akses Khusus Admin / Kepala Lab</span>
            </div>
          )}
        </div>

        {/* Search Input Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Cari nama siswa atau NISN di ${activeClass.nama_kelas}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Menampilkan <span className="font-bold text-slate-800">{filteredStudents.length}</span> dari{' '}
            <span className="font-bold text-slate-800">{classStudents.length}</span> santri
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white/95 backdrop-blur-xs rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery ? 'Siswa Tidak Ditemukan' : 'Belum Ada Siswa di Kelas Ini'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ada data siswa yang cocok dengan kata kunci "${searchQuery}".`
                : `Tambahkan santri satu per satu atau gunakan fitur Import Siswa (Excel Multi-Rombel) untuk kelas ${activeClass.nama_kelas}.`}
            </p>
            {isActualAdmin && !searchQuery && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsAddStudentModalOpen(true)}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
                >
                  + Tambah Siswa Manual
                </button>
                <button
                  onClick={() => {
                    setExcelParsedStudents([]);
                    setExcelFileName('');
                    setExcelErrorMsg(null);
                    setImportMode('AUTO_MULTI');
                    setIsExcelImportModalOpen(true);
                  }}
                  className="px-4 py-2 bg-teal-50 text-teal-900 border border-teal-200 text-xs font-bold rounded-xl hover:bg-teal-100 transition-colors"
                >
                  Import via Excel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">NISN / Identitas</th>
                  <th className="py-3.5 px-4">Nama Lengkap Siswa</th>
                  <th className="py-3.5 px-4">Status Santri</th>
                  <th className="py-3.5 px-4">Kelas & Angkatan</th>
                  <th className="py-3.5 px-4 text-center">Kehadiran Praktikum</th>
                  {isActualAdmin ? (
                    <th className="py-3.5 px-4 text-center w-28">Aksi</th>
                  ) : (
                    <th className="py-3.5 px-4 text-center w-32 text-slate-400 font-semibold text-[10.5px]">
                      Otoritas Akses
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s, idx) => {
                  const attendanceCount = getStudentAttendanceCount(s.id);
                  const isInactive = s.status === 'pindah' || s.status === 'keluar';
                  return (
                    <tr
                      key={s.id}
                      id={`student-row-${s.id}`}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isInactive ? 'bg-slate-50/40 text-slate-500' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {s.nisn || 'Belum diisi'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div
                          className={`font-bold text-sm transition-colors ${
                            isInactive
                              ? 'text-slate-500 line-through'
                              : 'text-slate-900 group-hover:text-teal-900'
                          }`}
                        >
                          {s.nama_siswa}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {s.status === 'pindah' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                              <span>Pindah Sekolah</span>
                            </span>
                            {s.status_keterangan && (
                              <div className="text-[10px] text-slate-500 italic max-w-xs truncate" title={s.status_keterangan}>
                                {s.status_keterangan}
                              </div>
                            )}
                          </div>
                        ) : s.status === 'keluar' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300">
                              <span>Keluar / Nonaktif</span>
                            </span>
                            {s.status_keterangan && (
                              <div className="text-[10px] text-slate-500 italic max-w-xs truncate" title={s.status_keterangan}>
                                {s.status_keterangan}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span>Aktif</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-semibold text-slate-800">{activeClass.nama_kelas}</span>{' '}
                        <span className="text-slate-400">({activeClass.tahun_ajaran})</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200/80">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" />
                          <span>{attendanceCount} sesi</span>
                        </span>
                      </td>
                      {isActualAdmin ? (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditStudent(s)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-800 hover:bg-teal-50 transition-colors"
                              title="Edit Nama / NISN Siswa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(s)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 active:scale-90 transition-all cursor-pointer"
                              title={`Hapus siswa "${s.nama_siswa}" dari kelas ini (Admin / Kepala Lab)`}
                              aria-label={`Hapus siswa ${s.nama_siswa}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      ) : (
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                            title="Akses Khusus Admin / Kepala Lab - Laboran & Guru berstatus Read-Only"
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Read-Only</span>
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Buat Kelas Baru (Admin Only) */}
      {isAddClassModalOpen && isActualAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">Tambah Kelas / Rombel Baru</h3>
              </div>
              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClassSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Unit Sekolah <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNewClassUnit('SMA')}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      newClassUnit === 'SMA'
                        ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    SMA IT (Fisika/Kimia/Bio)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClassUnit('SMP')}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      newClassUnit === 'SMP'
                        ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    SMP IT (IPA Terpadu)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Kelas / Rombel <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={newClassUnit === 'SMP' ? 'Contoh: Kelas VII A' : 'Contoh: Kelas XI MIPA 1'}
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tahun Ajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="2025/2026"
                  value={newClassYear}
                  onChange={(e) => setNewClassYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Tambah Siswa Manual (Admin Only) */}
      {isAddStudentModalOpen && isActualAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Tambah Siswa ke {activeClass.nama_kelas}
                </h3>
              </div>
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Farhan Al-Ayyubi"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor Induk Siswa Nasional (NISN)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 0081234567 (Opsional)"
                  value={newStudentNisn}
                  onChange={(e) => setNewStudentNisn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Tambahkan ke Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Import Siswa Excel Multi-Halaman / Multi-Rombel (Admin Only) */}
      {isExcelImportModalOpen && isActualAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Import Siswa Excel (Multi-Halaman & Multi-Rombel)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Otomatis membaca sheet terpisah atau kolom 'Kelas/Rombel' dan memetakan siswa ke kelasnya masing-masing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExcelImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Header Info & Template Download */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                <span className="text-xs font-bold text-slate-700">Unggah File Excel Santri:</span>
                <button
                  type="button"
                  onClick={handleDownloadStandardStudentTemplate}
                  className="text-xs text-teal-800 hover:text-teal-900 font-bold inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Unduh format template Excel standar 6 kolom untuk SIMLAB"
                >
                  <Download className="w-3.5 h-3.5 text-teal-700" />
                  <span>Unduh Format Standar (6 Kolom)</span>
                </button>
              </div>

              {/* File Upload Area */}
              <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileChange}
                  className="hidden"
                  id="modal-excel-student-input"
                />
                <label
                  htmlFor="modal-excel-student-input"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-teal-700" />
                  <span className="text-xs font-bold text-slate-800">
                    {excelFileName ? excelFileName : 'Pilih File Excel (.xlsx / .xls / .csv)'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Mendukung multi-sheet dan pemisahan otomatis berdasarkan kolom 'Kelas_Rombel'
                  </span>
                </label>
              </div>

              {excelErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{excelErrorMsg}</span>
                </div>
              )}

              {/* Fallback NISN Alert Banner */}
              {excelParsedStudents.length > 0 && fallbackNisnCount > 0 && (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs rounded-2xl flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-amber-950">Proteksi ID Unik NISN Aktif: </span>
                    Ditemukan <strong>{fallbackNisnCount} santri</strong> dengan kolom NISN kosong atau bertanda strip (-). Sistem otomatis membuatkan ID unik khusus (contoh: <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono text-[10.5px]">NISN-TIMESTAMP-RANDOM</code>) agar data santri tidak tertukar atau menimpa satu sama lain di Google Sheets.
                  </div>
                </div>
              )}

              {/* Mode Selection if data parsed */}
              {excelParsedStudents.length > 0 && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">Pilih Metode Pemetaan Kelas:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                        importMode === 'AUTO_MULTI'
                          ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}>
                        <input
                          type="radio"
                          name="import_mode"
                          checked={importMode === 'AUTO_MULTI'}
                          onChange={() => setImportMode('AUTO_MULTI')}
                          className="mt-0.5 text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="text-xs font-bold">Auto Multi-Rombel (Direkomendasikan)</div>
                          <div className="text-[10.5px] font-normal text-slate-500 mt-0.5">
                            Otomatis memisahkan siswa ke filter kelas masing-masing berdasarkan sheet atau kolom 'Kelas_Rombel'. Rombel baru dibuat otomatis.
                          </div>
                        </div>
                      </label>

                      <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                        importMode === 'SINGLE_ACTIVE'
                          ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}>
                        <input
                          type="radio"
                          name="import_mode"
                          checked={importMode === 'SINGLE_ACTIVE'}
                          onChange={() => setImportMode('SINGLE_ACTIVE')}
                          className="mt-0.5 text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="text-xs font-bold">Gabungkan ke {activeClass.nama_kelas}</div>
                          <div className="text-[10.5px] font-normal text-slate-500 mt-0.5">
                            Paksa seluruh {excelParsedStudents.length} santri masuk ke kelas aktif yang sedang dipilih di layar saat ini.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Class distribution cards */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Rombel & Kelas Terdeteksi:</span>
                      <span className="text-teal-800 font-bold bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 text-[11px]">
                        {excelParsedStudents.length} Santri · {parsedClassesSummary.length} Rombel
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                      {parsedClassesSummary.map((cls, idx) => (
                        <span
                          key={idx}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                            cls.existsInDb
                              ? 'bg-white border-slate-200 text-slate-800'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <span>{cls.nama_kelas}</span>
                          <span className="font-bold font-mono text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                            {cls.count} santri
                          </span>
                          {!cls.existsInDb && (
                            <span className="text-[9px] bg-amber-500 text-white font-bold px-1 rounded">Rombel Baru</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Student list preview (6 Standard Columns) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Pratinjau Pemetaan Kolom (6 Field Standar):</span>
                      <span className="text-[11px] font-normal text-slate-400">
                        Menampilkan {Math.min(10, excelParsedStudents.length)} dari {excelParsedStudents.length} santri
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-2.5 w-8 text-center">No</th>
                            <th className="py-2 px-2.5">NISN</th>
                            <th className="py-2 px-2.5">Nama Lengkap Santri</th>
                            <th className="py-2 px-2.5">Tingkat</th>
                            <th className="py-2 px-2.5">Kelas / Rombel</th>
                            <th className="py-2 px-2.5">Gender</th>
                            <th className="py-2 px-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {excelParsedStudents.slice(0, 10).map((st, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px]">{i + 1}</td>
                              <td className="py-2 px-2.5 font-mono">
                                <span className={`px-1.5 py-0.5 rounded text-[10.5px] ${
                                  st.isNisnFallback
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {st.nisn}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 font-bold text-slate-800">{st.nama_siswa}</td>
                              <td className="py-2 px-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  st.tingkat_sekolah === 'SMP'
                                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                    : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                }`}>
                                  {st.tingkat_sekolah || 'SMA'}
                                </span>
                              </td>
                              <td className="py-2 px-2.5">
                                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-semibold text-[10.5px]">
                                  {importMode === 'AUTO_MULTI' ? st.nama_kelas : activeClass.nama_kelas}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-slate-600">{st.jenis_kelamin || 'Laki-laki'}</td>
                              <td className="py-2 px-2.5">
                                <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {st.status_keaktifan || 'Aktif'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {excelParsedStudents.length > 10 && (
                        <div className="p-2 text-center text-slate-400 text-[11px] bg-slate-50 border-t border-slate-100 font-medium">
                          ... dan {excelParsedStudents.length - 10} santri lainnya siap diimpor ke sistem
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => setIsExcelImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExcelImport}
                  disabled={excelParsedStudents.length === 0 || isImporting}
                  className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isImporting
                      ? 'Menyimpan ke Database...'
                      : `Impor ${excelParsedStudents.length > 0 ? `(${excelParsedStudents.length} Santri)` : 'Sekarang'}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Edit Siswa Manual (Admin Only) */}
      {editingStudent && isActualAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">Ubah Identitas Siswa</h3>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor Induk Siswa Nasional (NISN)
                </label>
                <input
                  type="text"
                  value={editStudentNisn}
                  onChange={(e) => setEditStudentNisn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status Keaktifan Santri <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditStudentStatus('aktif')}
                    className={`py-2 px-2 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      editStudentStatus === 'aktif'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStudentStatus('pindah')}
                    className={`py-2 px-2 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      editStudentStatus === 'pindah'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Pindah Sekolah
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStudentStatus('keluar')}
                    className={`py-2 px-2 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      editStudentStatus === 'keluar'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Keluar / DO
                  </button>
                </div>
              </div>

              {editStudentStatus !== 'aktif' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Keterangan Status (Alasan / Tanggal Surat / Sekolah Tujuan)
                  </label>
                  <input
                    type="text"
                    value={editStudentKeterangan}
                    onChange={(e) => setEditStudentKeterangan(e.target.value)}
                    placeholder="Contoh: Pindah ke SMA Negeri 1 Bandung per Jan 2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    Status ini otomatis tersinkronisasi ke seluruh modul presensi dan rekap nilai E-Raport.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Dialog Konfirmasi Hapus In-App (Bypass pemblokiran window.confirm di iframe/sandbox) */}
      {deleteConfirm && deleteConfirm.isOpen && isActualAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-rose-50/90 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {deleteConfirm.type === 'STUDENT' ? 'Hapus Siswa dari Kelas' : 'Hapus 1 Kelas Secara Penuh'}
                  </h3>
                  <p className="text-[11px] text-rose-600 font-semibold">Tindakan ini permanen & tidak dapat dibatalkan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {deleteConfirm.type === 'STUDENT' && deleteConfirm.student && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Apakah Anda yakin ingin menghapus data siswa ini secara manual dari daftar kelas{' '}
                    <span className="font-bold text-slate-800">{activeClass.nama_kelas}</span>?
                  </p>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="text-sm font-bold text-slate-900">{deleteConfirm.student.nama_siswa}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>NISN:</span>
                      <span className="font-mono font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {deleteConfirm.student.nisn || 'Belum diisi'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>Data santri/siswa ini akan langsung dihapus dari rekam database dan rekap kehadiran.</span>
                  </div>
                </div>
              )}

              {deleteConfirm.type === 'CLASS' && deleteConfirm.cls && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                      Otoritas Kepala Lab (Admin)
                    </span>
                    <span className="text-xs text-slate-500">Tindakan Permanen</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Apakah Anda yakin ingin menghapus rombel/kelas ini secara keseluruhan beserta seluruh dependensinya?
                  </p>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Nama Kelas / Rombel:</span>
                      <span className="text-sm font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        {deleteConfirm.cls.nama_kelas}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Tahun Ajaran:</span>
                      <span className="font-medium text-slate-700">{deleteConfirm.cls.tahun_ajaran}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/80">
                      <span className="font-bold text-rose-700">Jumlah Siswa Ikut Terhapus:</span>
                      <span className="font-mono font-bold text-xs bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-md border border-rose-200">
                        {deleteConfirm.studentCount ?? 0} Siswa
                      </span>
                    </div>
                    {(deleteConfirm.activitiesCount ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-rose-600">Sesi Jurnal Terkait Ikut Dihapus:</span>
                        <span className="font-mono font-bold text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                          {deleteConfirm.activitiesCount} Sesi
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong>Cascade Deletion & Data Cleanup:</strong> Menghapus kelas ini akan secara serentak menghapus seluruh {deleteConfirm.studentCount ?? 0} siswa dan membersihkan seluruh sesi jurnal praktikum yang terkait dari database.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAction}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {deleteConfirm.type === 'STUDENT' ? 'Ya, Hapus Siswa' : 'Ya, Hapus Kelas & Siswa'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
