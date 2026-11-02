import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useInventory } from '../context/InventoryContext';
import { PrintReportHeader, PrintSignaturesERaport } from './PrintReportHeader';
import {
  LabId,
  LAB_DEFINITIONS,
  LabStudent,
  LabClass,
  LabActivityRecord,
  StudentScoreEntry,
  SchoolUnit,
} from '../types/inventory';
import {
  matchId,
  safeParseScores,
  getSchoolUnit,
  getSemesterFromDate,
  getGradePredicate,
  getOfficialGuruMapel,
  getOfficialKepalaLab,
} from '../utils/helpers';
import {
  BookOpenCheck,
  FileSpreadsheet,
  FileDown,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Sparkles,
  Layers,
  GraduationCap,
  Calendar,
  Building2,
  Info,
  ChevronRight,
  TrendingUp,
  Award,
  Users,
  Eye,
  ArrowRight,
} from 'lucide-react';

interface ExperimentColumn {
  activityId: number;
  index: number; // 1, 2, 3...
  judul: string;
  materi: string;
  tanggal: string;
  laboratorium: LabId;
  namaGuru: string;
}

interface StudentRecapRow {
  student: LabStudent;
  scoresByExpId: Record<
    number,
    {
      kinerja: number;
      laporan: number;
      akhir: number;
      status: string;
      hasRecord: boolean;
    }
  >;
  avgKinerja: number;
  avgLaporan: number;
  nilaiAkhir: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  keterangan: 'Tuntas' | 'Belum Tuntas';
  badgeClass: string;
  totalHadir: number;
  totalSesi: number;
}

export const ERaportRecap: React.FC = () => {
  const {
    currentUser,
    kopConfig,
    classes,
    students,
    labActivities,
    settings,
    isAdmin,
    isHeadOfLab,
    canManageUsers,
    showToast,
  } = useInventory();

  // Role-Based Access Control (RBAC):
  // Halaman Rekap E-Raport bersifat READ-ONLY (Terkunci) bagi Guru & Laboran.
  // Nilai bersumber murni dari rekap jurnal harian.
  // HANYA Admin (Kepala Lab) yang berwenang membuka kunci atau melakukan override administrasi.
  const isActualAdmin = Boolean(
    isAdmin ||
    isHeadOfLab ||
    currentUser?.role === 'KEPALA_LAB' ||
    (currentUser as any)?.role === 'admin' ||
    canManageUsers ||
    (currentUser?.email || '').toLowerCase().trim() === 'ilham.nurkholis114@guru.sma.belajar.id'
  );

  // Filters State
  const [unitFilter, setUnitFilter] = useState<'ALL' | SchoolUnit>('ALL');
  const [selectedLab, setSelectedLab] = useState<LabId | 'ALL'>('ALL');
  const [semesterFilter, setSemesterFilter] = useState<'ALL' | 'Ganjil' | 'Genap'>('ALL');
  const [academicYear, setAcademicYear] = useState<string>(settings.tahun_ajaran || '2025/2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  // Available classes filtered by selected unit
  const unitClasses = useMemo(() => {
    return classes.filter((cls) => {
      const clsUnit = cls.unit || getSchoolUnit(cls.nama_kelas);
      if (unitFilter === 'ALL') return true;
      return clsUnit === unitFilter;
    });
  }, [classes, unitFilter]);

  // Selected Class ID
  const [selectedClassId, setSelectedClassId] = useState<number | string>(() => {
    return classes[0]?.id || 1;
  });

  // Ensure selectedClassId stays valid when unitFilter changes
  const activeClass: LabClass = useMemo(() => {
    const found = unitClasses.find((c) => matchId(c.id, selectedClassId));
    if (found) return found;
    return unitClasses[0] || classes[0] || { id: 1, nama_kelas: 'XII MIPA 1 (SMA)', tahun_ajaran: '2025/2026', unit: 'SMA' };
  }, [unitClasses, classes, selectedClassId]);

  const activeUnit = activeClass.unit || getSchoolUnit(activeClass.nama_kelas);

  // Filtered Subject/Laboratory options depending on unit:
  // Unit SMP -> HANYA SMP_TERPADU (IPA Terpadu)
  // Unit SMA -> KIMIA, FISIKA, BIOLOGI
  const availableLabs = useMemo<Array<{ id: LabId | 'ALL'; label: string; badge: string }>>(() => {
    if (activeUnit === 'SMP') {
      return [
        { id: 'SMP_TERPADU', label: 'IPA Terpadu (SMP)', badge: 'Kurikulum Merdeka SMP' },
      ];
    }
    return [
      { id: 'ALL', label: 'Semua Mapel SMA (Gabungan)', badge: 'Sains Terpadu SMA' },
      { id: 'KIMIA', label: 'Kimia', badge: 'Laboratorium Kimia' },
      { id: 'FISIKA', label: 'Fisika', badge: 'Laboratorium Fisika' },
      { id: 'BIOLOGI', label: 'Biologi', badge: 'Laboratorium Biologi' },
    ];
  }, [activeUnit]);

  // Auto-align selectedLab if invalid for active unit
  const effectiveLab: LabId | 'ALL' = useMemo(() => {
    if (activeUnit === 'SMP') {
      return 'SMP_TERPADU';
    }
    if (selectedLab === 'SMP_TERPADU') {
      return 'ALL';
    }
    return selectedLab;
  }, [activeUnit, selectedLab]);

  // Students belonging to activeClass (including active, pindah, keluar)
  const classStudents = useMemo(() => {
    return students.filter((s) => matchId(s.kelas_id, activeClass.id));
  }, [students, activeClass.id]);

  // Filtered Activities for active class & filters
  const relevantActivities = useMemo<LabActivityRecord[]>(() => {
    return labActivities
      .filter((act) => {
        // 1. Class filter
        if (!matchId(act.kelas_id, activeClass.id)) return false;

        // 2. Lab filter
        if (effectiveLab !== 'ALL' && act.laboratorium !== effectiveLab) return false;

        // 3. Semester filter
        if (semesterFilter !== 'ALL') {
          const sem = getSemesterFromDate(act.tanggal_kegiatan);
          if (sem !== semesterFilter) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(a.tanggal_kegiatan).getTime() - new Date(b.tanggal_kegiatan).getTime());
  }, [labActivities, activeClass.id, effectiveLab, semesterFilter]);

  // Dynamic Experiment Columns (CRITICAL REQUIREMENT: JUDUL PERCOBAAN DITAMPILKAN OTOMATIS DARI INPUT JURNAL GURU)
  const experimentColumns = useMemo<ExperimentColumn[]>(() => {
    return relevantActivities.map((act, idx) => ({
      activityId: act.id,
      index: idx + 1,
      judul: act.judul_percobaan || `Praktikum Sesi #${idx + 1}`,
      materi: act.materi_pokok || '-',
      tanggal: act.tanggal_kegiatan,
      laboratorium: act.laboratorium,
      namaGuru: act.nama_guru || 'Guru Pengampu',
    }));
  }, [relevantActivities]);

  // Compute Matrix Rows for each student in the class
  const matrixRows = useMemo<StudentRecapRow[]>(() => {
    return classStudents.map((st) => {
      const scoresByExpId: Record<
        number,
        { kinerja: number; laporan: number; akhir: number; status: string; hasRecord: boolean }
      > = {};

      let sumKinerja = 0;
      let countKinerja = 0;
      let sumLaporan = 0;
      let countLaporan = 0;
      let totalHadir = 0;

      relevantActivities.forEach((act) => {
        const scores: StudentScoreEntry[] = safeParseScores(act.rekap_nilai_json);
        const match = scores.find((sc) => matchId((sc as any).student_id ?? (sc as any).siswa_id, st.id));

        if (match) {
          const isAttended =
            match.status === 'Hadir' ||
            match.status === ('HADIR' as any) ||
            match.status === ('TERLAMBAT' as any);

          if (isAttended) {
            totalHadir += 1;
            sumKinerja += match.nilai_kinerja || 0;
            countKinerja += 1;
            sumLaporan += match.nilai_laporan || 0;
            countLaporan += 1;
          }

          scoresByExpId[act.id] = {
            kinerja: match.nilai_kinerja || 0,
            laporan: match.nilai_laporan || 0,
            akhir: match.nilai_akhir || Math.round(((match.nilai_kinerja || 0) + (match.nilai_laporan || 0)) / 2),
            status: match.status || 'Hadir',
            hasRecord: true,
          };
        } else {
          scoresByExpId[act.id] = {
            kinerja: 0,
            laporan: 0,
            akhir: 0,
            status: 'Belum Dinilai',
            hasRecord: false,
          };
        }
      });

      const avgKinerja = countKinerja > 0 ? Number((sumKinerja / countKinerja).toFixed(1)) : 0;
      const avgLaporan = countLaporan > 0 ? Number((sumLaporan / countLaporan).toFixed(1)) : 0;
      const nilaiAkhir =
        countKinerja > 0 || countLaporan > 0
          ? Math.round((avgKinerja + avgLaporan) / 2)
          : 0;

      const evalResult = getGradePredicate(nilaiAkhir);

      return {
        student: st,
        scoresByExpId,
        avgKinerja,
        avgLaporan,
        nilaiAkhir,
        predikat: evalResult.predicate,
        keterangan: evalResult.keterangan,
        badgeClass: evalResult.badgeClass,
        totalHadir,
        totalSesi: relevantActivities.length,
      };
    });
  }, [classStudents, relevantActivities]);

  // Filtered rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return matrixRows;
    const q = searchQuery.toLowerCase().trim();
    return matrixRows.filter(
      (r) =>
        r.student.nama_siswa.toLowerCase().includes(q) ||
        (r.student.nisn && r.student.nisn.toLowerCase().includes(q))
    );
  }, [matrixRows, searchQuery]);

  // Summary statistics for the class
  const classStats = useMemo(() => {
    // Only calculate active students in class average to prevent skewing from moved students
    const activeRows = matrixRows.filter((r) => !r.student.status || r.student.status === 'aktif');
    const validScores = activeRows.filter((r) => r.nilaiAkhir > 0);

    const avgAkhir =
      validScores.length > 0
        ? Number((validScores.reduce((sum, r) => sum + r.nilaiAkhir, 0) / validScores.length).toFixed(1))
        : 0;

    const tuntasCount = validScores.filter((r) => r.nilaiAkhir >= 75).length;
    const tuntasRate = validScores.length > 0 ? Math.round((tuntasCount / validScores.length) * 100) : 0;

    const movedStudentsCount = matrixRows.filter(
      (r) => r.student.status === 'pindah' || r.student.status === 'keluar'
    ).length;

    return {
      totalSiswa: matrixRows.length,
      activeSiswa: activeRows.length,
      movedSiswa: movedStudentsCount,
      totalPercobaan: experimentColumns.length,
      avgAkhir,
      tuntasRate,
      tuntasCount,
    };
  }, [matrixRows, experimentColumns.length]);

  // Explicit check if current user or context represents a teacher of IPA Terpadu (SMP)
  const isIPASmpTeacher = useMemo(() => {
    return (
      currentUser?.role === 'GURU_IPA_SMP' ||
      currentUser?.assignedLab === 'SMP_TERPADU' ||
      effectiveLab === 'SMP_TERPADU' ||
      activeUnit === 'SMP' ||
      Boolean(currentUser?.roleTitle && currentUser.roleTitle.toLowerCase().includes('smp'))
    );
  }, [currentUser?.role, currentUser?.assignedLab, currentUser?.roleTitle, effectiveLab, activeUnit]);

  // Resolusi data guru pengampu praktikum dengan pengecekan eksplisit NIP:
  // - Guru IPA Terpadu (SMP): dipaksa '-' (belum memiliki NIP)
  // - Guru Mapel SMA: mempertahankan NIP resmi (Fisika: 2025.14.02.08, Kimia: 2025.14.02.03, Biologi: 2025.14.02.10)
  const officialGuruMapelInfo = useMemo(() => {
    const base = getOfficialGuruMapel(
      effectiveLab,
      activeUnit,
      currentUser?.name,
      currentUser?.nip
    );

    if (isIPASmpTeacher) {
      return {
        ...base,
        nip: 'NIP: -',
      };
    }

    if (effectiveLab === 'FISIKA') {
      return { ...base, nip: 'NIP: 2025.14.02.08' };
    }
    if (effectiveLab === 'BIOLOGI') {
      return { ...base, nip: 'NIP: 2025.14.02.10' };
    }
    if (effectiveLab === 'KIMIA') {
      return { ...base, nip: 'NIP: 2025.14.02.03' };
    }

    return base;
  }, [effectiveLab, activeUnit, currentUser?.name, currentUser?.nip, isIPASmpTeacher]);

  // Export to Excel (.xlsx) Standardized E-Raport Matrix
  const handleExportExcel = () => {
    if (matrixRows.length === 0) {
      showToast({ type: 'warning', title: 'Data Kosong', message: 'Tidak ada data siswa untuk diexport.' });
      return;
    }

    try {
      const headersRow1 = [
        'No',
        'NISN',
        'Nama Lengkap Siswa',
        'Status',
        ...experimentColumns.flatMap((col) => [
          `Percobaan ${col.index}: ${col.judul} (Praktik)`,
          `Percobaan ${col.index}: ${col.judul} (Laporan)`,
          `Percobaan ${col.index}: Rerata`,
        ]),
        'Rata-rata Praktik (RP)',
        'Rata-rata Laporan (RL)',
        'Nilai Akhir Praktikum (NA)',
        'Predikat',
        'Keterangan',
      ];

      const dataRows = filteredRows.map((row, idx) => {
        const studentStatus = row.student.status === 'pindah' ? 'Pindah' : row.student.status === 'keluar' ? 'Keluar' : 'Aktif';
        const expData: (string | number)[] = experimentColumns.flatMap((col): (string | number)[] => {
          const rec = row.scoresByExpId[col.activityId];
          if (!rec || !rec.hasRecord) return ['-', '-', '-'];
          return [rec.kinerja, rec.laporan, rec.akhir];
        });

        return [
          idx + 1,
          row.student.nisn || '-',
          row.student.nama_siswa,
          studentStatus,
          ...expData,
          row.avgKinerja,
          row.avgLaporan,
          row.nilaiAkhir,
          row.predikat,
          row.keterangan,
        ];
      });

      const wsData = [
        ['REKAPITULASI NILAI E-RAPORT PRAKTIKUM SAINS'],
        [`SMP DAN SMA IT AR-RAHMAH CENDEKIA - TA ${academicYear}`],
        [
          `Unit: ${activeUnit} | Kelas: ${activeClass.nama_kelas} | Mapel: ${
            effectiveLab === 'ALL' ? 'Semua Mapel SMA' : LAB_DEFINITIONS[effectiveLab]?.name
          } | Semester: ${semesterFilter}`,
        ],
        [],
        headersRow1,
        ...dataRows,
        [],
        ['Pejabat Pengesah:', '', ''],
        [officialGuruMapelInfo.jabatan, '', 'Kepala Laboratorium IPA Terpadu'],
        [officialGuruMapelInfo.nama, '', 'Ilham Nurkholis Majid, S. Pd., Gr.'],
        [isIPASmpTeacher ? 'NIP: -' : officialGuruMapelInfo.nip, '', 'NIP: 2025.14.02.03'],
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap E-Raport');

      const fileName = `Rekap_E-Raport_${activeUnit}_${activeClass.nama_kelas.replace(/\s+/g, '_')}_${semesterFilter}_${academicYear.replace('/', '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast({
        type: 'success',
        title: 'Export Excel Berhasil',
        message: `File ${fileName} berhasil diunduh.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Export Gagal',
        message: `Gagal mengunduh Excel: ${err?.message || 'Kesalahan sistem'}`,
      });
    }
  };

  // Export to PDF (Layout Dokumen Resmi Sekolah: KOP, Matriks Nilai Lengkap, Tanda Tangan 3 Kolom)
  const handleExportPDF = () => {
    if (matrixRows.length === 0) {
      showToast({ type: 'warning', title: 'Data Kosong', message: 'Tidak ada data siswa untuk dicetak ke PDF.' });
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. KOP SURAT RESMI SEKOLAH
      const yayasanText = (kopConfig?.namaYayasan || 'YAYASAN BAYTU RAHMAH MADANIA').toUpperCase();
      const sekolahText = (kopConfig?.namaSekolah || settings.nama_sekolah || 'SMP dan SMA IT Ar-Rahmah Cendekia').toUpperCase();
      const unitText = (kopConfig?.unitLaboratorium || 'Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia').toUpperCase();
      const alamatText =
        kopConfig?.alamat ||
        'Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114';

      // Logo Instansi jika ada data URL
      if (kopConfig?.logoUrl && kopConfig.logoUrl.startsWith('data:image/')) {
        try {
          const isPng = kopConfig.logoUrl.includes('image/png');
          doc.addImage(kopConfig.logoUrl, isPng ? 'PNG' : 'JPEG', 14, 8, 20, 20);
        } catch (err) {
          console.warn('Gagal memuat logo ke PDF:', err);
        }
      }

      doc.setTextColor(6, 78, 59); // Deep Emerald
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(yayasanText, pageWidth / 2, 11, { align: 'center' });

      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFontSize(13);
      doc.text(sekolahText, pageWidth / 2, 17, { align: 'center' });

      doc.setTextColor(6, 78, 59);
      doc.setFontSize(10);
      doc.text(unitText, pageWidth / 2, 22.5, { align: 'center' });

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(alamatText, pageWidth / 2, 27, { align: 'center' });

      // Garis ganda pembatas KOP
      doc.setDrawColor(6, 78, 59);
      doc.setLineWidth(0.7);
      doc.line(14, 30, pageWidth - 14, 30);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(14, 31.2, pageWidth - 14, 31.2);

      // 2. JUDUL DOKUMEN & SUBTITLE
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('REKAPITULASI MATRIKS NILAI E-RAPORT PRAKTIKUM SAINS', pageWidth / 2, 36.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Penilaian Hasil Kinerja Praktikum & Laporan Siswa · Standar KKM Sekolah 75.00`,
        pageWidth / 2,
        40.5,
        { align: 'center' }
      );

      // 3. PARAMETER METADATA (2 Kolom)
      const leftX = 14;
      const midX = pageWidth / 2 + 10;
      let metaY = 45;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('Unit Sekolah / Jenjang', leftX, metaY);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${activeUnit} IT (${activeUnit === 'SMP' ? 'IPA Terpadu' : 'SMA IT'})`, leftX + 38, metaY);

      doc.setFont('helvetica', 'bold');
      doc.text('Semester & Tahun Ajaran', midX, metaY);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${semesterFilter === 'ALL' ? 'Semua (Ganjil & Genap)' : semesterFilter} · TA ${academicYear}`, midX + 42, metaY);

      metaY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.text('Kelas / Rombel', leftX, metaY);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${activeClass.nama_kelas}`, leftX + 38, metaY);

      doc.setFont('helvetica', 'bold');
      doc.text('Mata Pelajaran / Lab', midX, metaY);
      doc.setFont('helvetica', 'normal');
      const labName = effectiveLab === 'ALL' ? 'Semua Mapel Sains (Kimia, Fisika, Biologi)' : LAB_DEFINITIONS[effectiveLab]?.name || effectiveLab;
      doc.text(`: ${labName}`, midX + 42, metaY);

      metaY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.text('Jumlah Santri', leftX, metaY);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${classStats.totalSiswa} Siswa (${classStats.activeSiswa} Aktif, ${classStats.movedSiswa} Pindah/Keluar)`, leftX + 38, metaY);

      doc.setFont('helvetica', 'bold');
      doc.text('Ketercapaian KKM', midX, metaY);
      doc.setFont('helvetica', 'normal');
      doc.text(`: ${classStats.tuntasRate}% Tuntas (Rerata Kelas: ${classStats.avgAkhir > 0 ? classStats.avgAkhir : '-'})`, midX + 42, metaY);

      // 4. SUSUN DUA LEVEL HEADER AUTOTABLE
      const headRow1: any[] = [
        { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NISN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Nama Lengkap Siswa', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
        { content: 'Status', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      ];

      experimentColumns.forEach((col) => {
        headRow1.push({
          content: `Perc. ${col.index}: ${col.judul}`,
          colSpan: 3,
          styles: { halign: 'center', valign: 'middle' },
        });
      });

      headRow1.push({
        content: 'Rekapitulasi Nilai Akhir',
        colSpan: 5,
        styles: { halign: 'center', valign: 'middle' },
      });

      const headRow2: any[] = [];
      experimentColumns.forEach(() => {
        headRow2.push(
          { content: 'Praktik', styles: { halign: 'center' } },
          { content: 'Laporan', styles: { halign: 'center' } },
          { content: 'Rerata', styles: { halign: 'center' } }
        );
      });

      headRow2.push(
        { content: 'RP', styles: { halign: 'center' } },
        { content: 'RL', styles: { halign: 'center' } },
        { content: 'NA', styles: { halign: 'center' } },
        { content: 'Pred', styles: { halign: 'center' } },
        { content: 'Ket.', styles: { halign: 'center' } }
      );

      // 5. ISI BARIS TABEL (BODY ROWS)
      const bodyRows = filteredRows.map((row, idx) => {
        const isMoved = row.student.status === 'pindah' || row.student.status === 'keluar';
        const statusLabel = row.student.status === 'pindah' ? 'Pindah' : row.student.status === 'keluar' ? 'Keluar' : 'Aktif';

        const expCells: (string | number)[] = [];
        experimentColumns.forEach((col) => {
          const rec = row.scoresByExpId[col.activityId];
          if (rec && rec.hasRecord) {
            expCells.push(rec.kinerja, rec.laporan, rec.akhir);
          } else {
            expCells.push('-', '-', '-');
          }
        });

        const studentDisplayName = isMoved
          ? `${row.student.nama_siswa} [${statusLabel}]`
          : row.student.nama_siswa;

        return [
          idx + 1,
          row.student.nisn || '-',
          studentDisplayName,
          statusLabel,
          ...expCells,
          row.avgKinerja > 0 ? row.avgKinerja : '-',
          row.avgLaporan > 0 ? row.avgLaporan : '-',
          row.nilaiAkhir > 0 ? row.nilaiAkhir : '-',
          row.nilaiAkhir > 0 ? row.predikat : '-',
          row.nilaiAkhir > 0 ? row.keterangan : 'Belum Lengkap',
        ];
      });

      // 6. FOOTER TABEL (FOOT CELLS: RATA-RATA KELAS SANTRI AKTIF)
      const footCells: any[] = [
        {
          content: 'RATA-RATA ROMBEL (SANTRI AKTIF):',
          colSpan: 4,
          styles: { halign: 'right', fontStyle: 'bold' },
        },
      ];

      experimentColumns.forEach((col) => {
        const activeScores = matrixRows
          .filter((r) => (!r.student.status || r.student.status === 'aktif') && r.scoresByExpId[col.activityId]?.hasRecord)
          .map((r) => r.scoresByExpId[col.activityId].akhir);

        const avgExp =
          activeScores.length > 0
            ? Number((activeScores.reduce((a, b) => a + b, 0) / activeScores.length).toFixed(1))
            : 0;

        footCells.push({
          content: avgExp > 0 ? String(avgExp) : '-',
          colSpan: 3,
          styles: { halign: 'center', fontStyle: 'bold', textColor: [6, 78, 59] },
        });
      });

      footCells.push(
        {
          content: 'Rerata NA:',
          colSpan: 2,
          styles: { halign: 'center', fontStyle: 'bold' },
        },
        {
          content: classStats.avgAkhir > 0 ? String(classStats.avgAkhir) : '-',
          styles: { halign: 'center', fontStyle: 'bold', fillColor: [226, 232, 240], textColor: [15, 23, 42] },
        },
        {
          content: `Ketuntasan: ${classStats.tuntasRate}%`,
          colSpan: 2,
          styles: { halign: 'center', fontStyle: 'bold', textColor: [6, 78, 59] },
        }
      );

      // Jalankan AutoTable
      autoTable(doc, {
        startY: metaY + 4,
        theme: 'grid',
        head: [headRow1, headRow2],
        body: bodyRows,
        foot: [footCells],
        styles: {
          fontSize: 6.5,
          cellPadding: 1.2,
          textColor: [15, 23, 42],
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [6, 78, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 6.5,
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 6.5,
        },
        margin: { left: 14, right: 14 },
      });

      // 7. PENANDATANGAN RESMI E-RAPORT (CUKUP 2 KOLOM: GURU MAPEL & KEPALA LAB IPA TERPADU)
      let finalY = (doc as any).lastAutoTable.finalY + 6;
      if (finalY + 38 > pageHeight) {
        doc.addPage();
        finalY = 16;
      }

      const kotaPenetapan = kopConfig?.kotaPenetapan?.trim() || 'Kota Tangerang';
      const tglFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`* KKM Praktikum: 75.00 · Siswa pindah/keluar dikecualikan dari perhitungan rata-rata rombel.`, 14, finalY);
      doc.text(`Ditetapkan di: ${kotaPenetapan}, Tanggal: ${tglFormatted}`, pageWidth - 14, finalY, { align: 'right' });

      finalY += 6;
      const colWidth = (pageWidth - 28) / 2;

      // Resolusi Data Guru Mapel & Kepala Lab IPA Terpadu
      const guruMapelInfo = officialGuruMapelInfo;
      const kepalaLabInfo = getOfficialKepalaLab(
        kopConfig?.kepalaLabNama,
        kopConfig?.kepalaLabNip,
        'NIP'
      );

      // Explicit check if user/signer is a teacher of IPA Terpadu (SMP)
      const isTeacherIPASmp =
        isIPASmpTeacher ||
        currentUser?.role === 'GURU_IPA_SMP' ||
        currentUser?.assignedLab === 'SMP_TERPADU' ||
        effectiveLab === 'SMP_TERPADU' ||
        activeUnit === 'SMP' ||
        guruMapelInfo.nama.toLowerCase().includes('farkhatul') ||
        guruMapelInfo.jabatan.toLowerCase().includes('ipa terpadu') ||
        guruMapelInfo.jabatan.toLowerCase().includes('smp');

      // Force display of '-' for IPA Terpadu (SMP) teacher, maintain NIP for SMA subject teachers (Fisika, Kimia, Biologi)
      let teacherNipDisplay = 'NIP: -';
      if (isTeacherIPASmp) {
        teacherNipDisplay = 'NIP: -';
      } else if (effectiveLab === 'FISIKA' || guruMapelInfo.jabatan.toLowerCase().includes('fisika')) {
        teacherNipDisplay = 'NIP: 2025.14.02.08';
      } else if (effectiveLab === 'BIOLOGI' || guruMapelInfo.jabatan.toLowerCase().includes('biologi')) {
        teacherNipDisplay = 'NIP: 2025.14.02.10';
      } else if (effectiveLab === 'KIMIA' || guruMapelInfo.jabatan.toLowerCase().includes('kimia')) {
        teacherNipDisplay = 'NIP: 2025.14.02.03';
      } else if (currentUser?.nip && currentUser.nip !== '-' && currentUser.role !== 'GURU_IPA_SMP') {
        teacherNipDisplay = currentUser.nip.startsWith('NIP') ? currentUser.nip : `NIP: ${currentUser.nip}`;
      } else {
        teacherNipDisplay = guruMapelInfo.nip && guruMapelInfo.nip !== 'NIP: -' ? guruMapelInfo.nip : 'NIP: 2025.14.02.08';
      }

      // Kolom 1 (Kiri): Guru Mata Pelajaran Sesuai Lab / Unit
      const p1X = 14 + colWidth / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${guruMapelInfo.jabatan},`, p1X, finalY, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(guruMapelInfo.instansi, p1X, finalY + 4, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(guruMapelInfo.nama, p1X, finalY + 23, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(teacherNipDisplay, p1X, finalY + 27, { align: 'center' });

      // Kolom 2 (Kanan): Mengetahui, Kepala Laboratorium IPA Terpadu
      const p2X = 14 + colWidth + colWidth / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Mengetahui, Kepala Laboratorium IPA Terpadu,', p2X, finalY, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kepalaLabInfo.instansi, p2X, finalY + 4, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(kepalaLabInfo.nama, p2X, finalY + 23, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(kepalaLabInfo.nip, p2X, finalY + 27, { align: 'center' });

      // Simpan file PDF
      const pdfFileName = `Rekap_Nilai_E-Raport_${activeUnit}_${activeClass.nama_kelas.replace(/\s+/g, '_')}_${semesterFilter}_TA${academicYear.replace('/', '-')}.pdf`;
      doc.save(pdfFileName);

      showToast({
        type: 'success',
        title: 'Cetak ke PDF Berhasil',
        message: `Dokumen resmi ${pdfFileName} berhasil diunduh dengan layout KOP sekolah dan tanda tangan Kepala Lab.`,
      });
    } catch (err: any) {
      console.error('Gagal cetak ke PDF:', err);
      showToast({
        type: 'error',
        title: 'Gagal Cetak PDF',
        message: `Terjadi kesalahan saat memproses PDF: ${err?.message || 'Kesalahan sistem'}`,
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Printable Report Header for Browser Print */}
      <PrintReportHeader
        title="REKAPITULASI MATRIKS NILAI E-RAPORT PRAKTIKUM SAINS"
        subtitle={`Matriks Nilai Rapor Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia - Tahun Ajaran ${academicYear}`}
        selectedLab={effectiveLab === 'ALL' ? 'ALL' : effectiveLab}
        extraMetadata={[
          { label: 'Unit Sekolah', value: `${activeUnit} IT` },
          { label: 'Kelas / Rombel', value: activeClass.nama_kelas },
          { label: 'Semester', value: semesterFilter === 'ALL' ? 'Semua (Ganjil & Genap)' : semesterFilter },
          { label: 'Tahun Ajaran', value: academicYear },
          { label: 'Standar KKM', value: '75.00' },
          { label: 'Rata-Rata Kelas', value: classStats.avgAkhir > 0 ? String(classStats.avgAkhir) : '-' },
          { label: 'Tingkat Ketuntasan', value: `${classStats.tuntasRate}% (${classStats.tuntasCount} Santri Tuntas)` },
        ]}
      />

      {/* ====================================================================== */}
      {/* 1. TOP BANNER HEADER & ROLE-BASED ACCESS CONTROL BADGE                 */}
      {/* ====================================================================== */}
      <div className="no-print bg-white/95 backdrop-blur-xs p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-[11px] font-bold text-teal-800 uppercase tracking-wider">
              <BookOpenCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>Rekap Nilai E-Raport Praktikum</span>
              <span aria-hidden="true" className="text-teal-400">·</span>
              <span>Laboratorium IPA Terpadu SMP & SMA IT Ar-Rahmah Cendekia</span>
            </div>

            {/* Read-Only vs Admin Lock Indicator */}
            {isActualAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Otoritas Kepala Lab (Admin Penuh)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Mode Terkunci (Read-Only) — Terintegrasi Jurnal Harian</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Rekap Nilai E-Raport Praktikum Sains
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
            Matriks rekapitulasi penilaian rapor laboratorium (Praktik/Kinerja dan Laporan) terintegrasi
            secara langsung dan otomatis dari pengisian jurnal harian guru pengampu. Setiap kolom percobaan
            menampilkan <strong>judul percobaan asli</strong> yang diinput saat kegiatan laboratorium berlangsung.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Tombol Cetak ke PDF (Format Dokumen Resmi Sekolah: KOP, Header, Tanda Tangan Kepala Lab) */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="min-h-[42px] px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer"
            title="Cetak Dokumen Rekap Nilai Resmi ke File PDF dengan Header KOP & Tanda Tangan"
          >
            <FileDown className="w-4 h-4 text-teal-200" />
            <span>Cetak ke PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="min-h-[42px] px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/90 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="Download Matriks Rekap Nilai ke Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Format Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[42px] px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            title="Cetak Langsung via Printer Browser"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Browser</span>
          </button>

          {isActualAdmin && (
            <button
              type="button"
              onClick={() => {
                setAdminUnlocked(!adminUnlocked);
                showToast({
                  type: 'info',
                  title: adminUnlocked ? 'Mode Terkunci Kembali' : 'Mode Admin Terbuka',
                  message: adminUnlocked
                    ? 'Tampilan rekap kembali ke mode inspeksi terkunci.'
                    : 'Akses khusus Admin Kepala Lab aktif untuk peninjauan mendalam.',
                });
              }}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                adminUnlocked
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
              title="Toggle status inspeksi admin"
            >
              {adminUnlocked ? <Unlock className="w-4 h-4 text-amber-700" /> : <Lock className="w-4 h-4 text-slate-500" />}
              <span>{adminUnlocked ? 'Admin: Terbuka' : 'Admin: Terkunci'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 2. FILTER STRIP (UNIT SMP vs SMA, KELAS, MAPEL, SEMESTER, TAHUN)       */}
      {/* ====================================================================== */}
      <div className="bg-white/95 backdrop-blur-xs p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Unit Tabs (SMP vs SMA) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">
              Unit Sekolah:
            </span>
            <button
              type="button"
              onClick={() => {
                setUnitFilter('ALL');
                setSelectedLab('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                unitFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Unit
            </button>
            <button
              type="button"
              onClick={() => {
                setUnitFilter('SMP');
                setSelectedLab('SMP_TERPADU');
                const firstSmp = classes.find((c) => (c.unit || getSchoolUnit(c.nama_kelas)) === 'SMP');
                if (firstSmp) setSelectedClassId(firstSmp.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                unitFilter === 'SMP'
                  ? 'bg-teal-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-teal-900'
              }`}
            >
              Unit SMP IT (IPA Terpadu)
            </button>
            <button
              type="button"
              onClick={() => {
                setUnitFilter('SMA');
                if (selectedLab === 'SMP_TERPADU') setSelectedLab('ALL');
                const firstSma = classes.find((c) => (c.unit || getSchoolUnit(c.nama_kelas)) === 'SMA');
                if (firstSma) setSelectedClassId(firstSma.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                unitFilter === 'SMA'
                  ? 'bg-indigo-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-indigo-900'
              }`}
            >
              Unit SMA IT (Kimia, Fisika, Biologi)
            </button>
          </div>

          {/* Semester & Tahun Ajaran */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500">Semester:</span>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">Semua Semester (1 & 2)</option>
                <option value="Ganjil">Semester 1 (Ganjil)</option>
                <option value="Genap">Semester 2 (Genap)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <span className="text-slate-500">Tahun Ajaran:</span>
              <span className="font-bold text-slate-900 font-mono">{academicYear}</span>
            </div>
          </div>
        </div>

        {/* Secondary Row: Class & Subject Selectors */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Pilih Kelas */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
              Pilih Rombongan Belajar (Kelas):
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-600 transition-all cursor-pointer"
            >
              {unitClasses.map((cls) => {
                const count = students.filter((s) => matchId(s.kelas_id, cls.id)).length;
                const unit = cls.unit || getSchoolUnit(cls.nama_kelas);
                return (
                  <option key={cls.id} value={cls.id}>
                    [{unit}] {cls.nama_kelas} — ({count} santri)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Pilih Mata Pelajaran / Lab */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
              Mata Pelajaran Praktikum:
            </label>
            <select
              value={effectiveLab}
              onChange={(e) => setSelectedLab(e.target.value as any)}
              disabled={activeUnit === 'SMP'}
              className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-600 transition-all cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {availableLabs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Search Student Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
              Cari Santri / NISN:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama santri..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 3. KPI SUMMARY STRIP                                                   */}
      {/* ====================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white/90 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Siswa Aktif</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {classStats.activeSiswa}
            <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
              santri ({classStats.movedSiswa > 0 ? `${classStats.movedSiswa} pindah` : 'lengkap'})
            </span>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Jumlah Percobaan Selesai</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-800 mt-1 tabular-nums">
            {classStats.totalPercobaan}
            <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">judul praktikum</span>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Rata-Rata Kelas (NA)</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-900 mt-1 tabular-nums">
            {classStats.avgAkhir > 0 ? classStats.avgAkhir : '-'}
            <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
              (Skala 100)
            </span>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Tingkat Ketuntasan (KKM ≥ 75)</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-teal-900 mt-1 tabular-nums">
            {classStats.tuntasRate}%
            <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
              ({classStats.tuntasCount} siswa tuntas)
            </span>
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 4. MATRIKS E-RAPORT TABLE WITH INTEGRATED EXPERIMENT TITLES             */}
      {/* ====================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header Details */}
        <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-100 text-teal-800 rounded-xl shrink-0">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Matriks Nilai Rapor Praktikum: {activeClass.nama_kelas}
              </h3>
              <p className="text-xs text-slate-500">
                Unit {activeUnit} · {effectiveLab === 'ALL' ? 'Gabungan Mapel SMA' : LAB_DEFINITIONS[effectiveLab]?.name} · {semesterFilter === 'ALL' ? 'Tahun Ajaran Penuh' : `Semester ${semesterFilter}`} ({academicYear})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">
              Total {filteredRows.length} Santri · {experimentColumns.length} Sesi Terintegrasi
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        {filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <BookOpenCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">Tidak ada data nilai praktikum untuk kriteria yang dipilih.</p>
            <p>Pastikan jurnal praktikum telah diinput di menu Jadwal & Jurnal untuk kelas ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Header Row 1: Group Headers */}
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th rowSpan={2} className="py-3.5 px-3 w-10 text-center border-r border-slate-200">
                    No
                  </th>
                  <th rowSpan={2} className="py-3.5 px-3 w-28 border-r border-slate-200">
                    NISN
                  </th>
                  <th rowSpan={2} className="py-3.5 px-4 min-w-[200px] border-r border-slate-200">
                    Nama Lengkap Santri
                  </th>
                  <th rowSpan={2} className="py-3.5 px-3 w-24 text-center border-r border-slate-200">
                    Status
                  </th>

                  {/* EXPERIMENT COLUMNS WITH LIVE EXPERIMENT TITLES */}
                  {experimentColumns.map((col) => (
                    <th
                      key={col.activityId}
                      colSpan={3}
                      className="py-2.5 px-3 text-center border-r border-slate-200 bg-teal-50/70"
                    >
                      <div className="flex flex-col items-center justify-center max-w-[240px] mx-auto space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-200/80 text-teal-900 border border-teal-300">
                          Percobaan {col.index}
                        </span>
                        {/* CRITICAL: AUTOMATIC TITLE EXTRACTION FROM JOURNAL RECORD */}
                        <span
                          className="font-bold text-slate-900 line-clamp-2 text-[11px] leading-tight text-center"
                          title={`${col.judul} (${col.tanggal}) - Guru: ${col.namaGuru}`}
                        >
                          {col.judul}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {col.tanggal} · {LAB_DEFINITIONS[col.laboratorium]?.shortName}
                        </span>
                      </div>
                    </th>
                  ))}

                  {/* Summary / Rapor Columns */}
                  <th colSpan={5} className="py-2.5 px-3 text-center bg-indigo-50/70 text-indigo-950">
                    Rekapitulasi Nilai Akhir Rapor (KKM = 75)
                  </th>
                </tr>

                {/* Header Row 2: Sub-columns */}
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] text-center">
                  {experimentColumns.map((col) => (
                    <React.Fragment key={`sub-${col.activityId}`}>
                      <th className="py-2 px-2.5 border-r border-slate-200 bg-white" title="Nilai Praktik / Kinerja">
                        Praktik
                      </th>
                      <th className="py-2 px-2.5 border-r border-slate-200 bg-white" title="Nilai Laporan Praktikum">
                        Laporan
                      </th>
                      <th className="py-2 px-2.5 border-r border-slate-200 bg-teal-50/50" title="Rerata Percobaan Ini">
                        Rerata
                      </th>
                    </React.Fragment>
                  ))}

                  {/* Final Calculation Sub-columns */}
                  <th className="py-2 px-3 border-r border-slate-200 bg-indigo-50/40" title="Rata-Rata Nilai Praktik / Kinerja">
                    RP
                  </th>
                  <th className="py-2 px-3 border-r border-slate-200 bg-indigo-50/40" title="Rata-Rata Nilai Laporan">
                    RL
                  </th>
                  <th className="py-2 px-3 border-r border-slate-200 bg-indigo-100 text-indigo-950 font-extrabold" title="Nilai Akhir Rapor = (RP + RL) / 2">
                    Nilai Akhir
                  </th>
                  <th className="py-2 px-2.5 border-r border-slate-200 bg-indigo-50/40">
                    Predikat
                  </th>
                  <th className="py-2 px-3 bg-indigo-50/40">
                    Keterangan
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => {
                  const isMoved = row.student.status === 'pindah' || row.student.status === 'keluar';
                  return (
                    <tr
                      key={row.student.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isMoved ? 'bg-amber-50/20 text-slate-400' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>

                      {/* NISN */}
                      <td className="py-3 px-3 font-mono text-slate-600 border-r border-slate-100 text-[11px]">
                        {row.student.nisn || '-'}
                      </td>

                      {/* Nama Siswa */}
                      <td className="py-3 px-4 font-bold text-slate-900 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={isMoved ? 'line-through text-slate-500' : 'text-slate-900'}>
                            {row.student.nama_siswa}
                          </span>
                          {row.student.status === 'pindah' && (
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Pindah
                            </span>
                          )}
                          {row.student.status === 'keluar' && (
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              Keluar
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center border-r border-slate-100">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.student.status === 'pindah'
                              ? 'bg-amber-100 text-amber-800'
                              : row.student.status === 'keluar'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {row.student.status === 'pindah' ? 'Pindah' : row.student.status === 'keluar' ? 'Keluar' : 'Aktif'}
                        </span>
                      </td>

                      {/* Dynamic Scores per Experiment */}
                      {experimentColumns.map((col) => {
                        const rec = row.scoresByExpId[col.activityId];
                        const hasScore = rec && rec.hasRecord;
                        return (
                          <React.Fragment key={`cell-${row.student.id}-${col.activityId}`}>
                            {/* Praktik */}
                            <td className="py-3 px-2.5 text-center font-mono border-r border-slate-100 tabular-nums">
                              {hasScore ? rec.kinerja : <span className="text-slate-300">-</span>}
                            </td>
                            {/* Laporan */}
                            <td className="py-3 px-2.5 text-center font-mono border-r border-slate-100 tabular-nums">
                              {hasScore ? rec.laporan : <span className="text-slate-300">-</span>}
                            </td>
                            {/* Rerata Sesi */}
                            <td className="py-3 px-2.5 text-center font-mono font-semibold border-r border-slate-100 bg-teal-50/20 tabular-nums text-teal-900">
                              {hasScore ? rec.akhir : <span className="text-slate-300">-</span>}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Summary Columns */}
                      <td className="py-3 px-3 text-center font-mono font-semibold border-r border-slate-100 text-slate-700 bg-indigo-50/20 tabular-nums">
                        {row.avgKinerja > 0 ? row.avgKinerja : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold border-r border-slate-100 text-slate-700 bg-indigo-50/20 tabular-nums">
                        {row.avgLaporan > 0 ? row.avgLaporan : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-extrabold border-r border-slate-100 text-indigo-950 bg-indigo-100/60 text-sm tabular-nums">
                        {row.nilaiAkhir > 0 ? row.nilaiAkhir : '-'}
                      </td>
                      <td className="py-3 px-2.5 text-center border-r border-slate-100 bg-indigo-50/20">
                        <span
                          className={`inline-block w-6 h-6 leading-6 rounded-md font-mono font-extrabold text-xs text-center border ${row.badgeClass}`}
                        >
                          {row.nilaiAkhir > 0 ? row.predikat : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center bg-indigo-50/20">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            row.nilaiAkhir >= 75
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {row.nilaiAkhir > 0 ? row.keterangan : 'Belum Lengkap'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Class Average */}
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800 text-[11px]">
                <tr>
                  <td colSpan={4} className="py-3.5 px-4 text-right uppercase tracking-wider border-r border-slate-200">
                    Rata-Rata Rombongan Belajar (Santri Aktif):
                  </td>
                  {experimentColumns.map((col) => {
                    const activeScores = matrixRows
                      .filter((r) => (!r.student.status || r.student.status === 'aktif') && r.scoresByExpId[col.activityId]?.hasRecord)
                      .map((r) => r.scoresByExpId[col.activityId].akhir);

                    const avgExp =
                      activeScores.length > 0
                        ? Number((activeScores.reduce((a, b) => a + b, 0) / activeScores.length).toFixed(1))
                        : 0;

                    return (
                      <React.Fragment key={`foot-${col.activityId}`}>
                        <td colSpan={3} className="py-3.5 px-2 text-center font-mono font-extrabold border-r border-slate-200 bg-teal-100/60 text-teal-950">
                          {avgExp > 0 ? avgExp : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td colSpan={2} className="py-3.5 px-3 text-center border-r border-slate-200 bg-indigo-100/50">
                    Rerata Kelas:
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-extrabold text-sm border-r border-slate-200 bg-indigo-200/70 text-indigo-950">
                    {classStats.avgAkhir > 0 ? classStats.avgAkhir : '-'}
                  </td>
                  <td colSpan={2} className="py-3.5 px-3 text-center bg-indigo-100/50 text-indigo-900 text-xs">
                    Ketuntasan: {classStats.tuntasRate}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Footer Notes & Legal Signatures */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1 text-center md:text-left">
            <p>
              * KKM Nilai Praktikum Standar Sekolah: <strong>75.00</strong>. Nilai Akhir (NA) diperoleh dari rata-rata Praktik (RP) dan Laporan (RL).
            </p>
            <p>
              * Siswa berstatus <em>Pindah / Keluar</em> ditandai dan dikecualikan dari perhitungan rerata kelas untuk menjaga validitas data rapor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-mono text-[11px] font-bold text-slate-700">
              Dokumen Sah Digital SIMLAB ARC
            </span>
          </div>
        </div>

        {/* On-screen Endorsement Box: 2 TTD Resmi Pengesahan E-Raport (Guru Mapel & Kepala Lab IPA Terpadu) */}
        <div className="p-6 bg-slate-50/80 border-t border-slate-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Pengesahan Resmi Matriks Nilai E-Raport (2 Otoritas Pengesah)
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Cukup Guru Mapel & Kepala Lab IPA Terpadu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center max-w-3xl mx-auto py-2">
            {/* Otoritas 1: Guru Mata Pelajaran */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between h-36">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {officialGuruMapelInfo.jabatan}
                </p>
                <p className="text-[11px] text-slate-500">
                  {officialGuruMapelInfo.instansi}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 underline">
                  {officialGuruMapelInfo.nama}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {isIPASmpTeacher ? 'NIP: -' : officialGuruMapelInfo.nip}
                </p>
              </div>
            </div>

            {/* Otoritas 2: Kepala Laboratorium IPA Terpadu */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between h-36">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Mengetahui, Kepala Laboratorium IPA Terpadu
                </p>
                <p className="text-[11px] text-slate-500">
                  {getOfficialKepalaLab(kopConfig?.kepalaLabNama, kopConfig?.kepalaLabNip, 'NIP').instansi}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 underline">
                  {getOfficialKepalaLab(kopConfig?.kepalaLabNama, kopConfig?.kepalaLabNip, 'NIP').nama}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {getOfficialKepalaLab(kopConfig?.kepalaLabNama, kopConfig?.kepalaLabNip, 'NIP').nip}
                </p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-center text-slate-500 mt-3 italic">
            * Sesuai regulasi penilaian sekolah: Lembar rekap nilai e-raport praktikum cukup disahkan oleh Guru Mapel dan Kepala Lab IPA Terpadu (tanpa Penanggung Jawab Lab ataupun Kepala Sekolah).
          </p>
        </div>
      </div>

      {/* Tanda Tangan Resmi Pengesahan Dokumen E-Raport (Tampil saat Cetak Kertas / Browser Print) */}
      <PrintSignaturesERaport
        selectedLab={effectiveLab === 'ALL' ? 'ALL' : effectiveLab}
        activeUnit={activeUnit}
        guruName={officialGuruMapelInfo.nama}
        guruNip={isIPASmpTeacher ? '-' : officialGuruMapelInfo.nip}
      />
    </div>
  );
};
