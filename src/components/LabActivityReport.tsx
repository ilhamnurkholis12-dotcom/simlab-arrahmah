import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useInventory } from '../context/InventoryContext';
import {
  LabId,
  LAB_DEFINITIONS,
  StudentScoreEntry,
  StudentAttendanceStatus,
  LabActivityRecord,
  LabStudent,
  LabClass,
} from '../types/inventory';
import { safeParseScores, matchId, getSchoolUnit } from '../utils/helpers';
import { LabTimelineD3 } from './LabTimelineD3';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  BookOpen,
  Printer,
  CheckCircle2,
  AlertCircle,
  Save,
  Calendar,
  Check,
  Sparkles,
  History,
  Building2,
  GraduationCap,
  ClipboardList,
  Search,
  RotateCcw,
  Eye,
  FileCheck2,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Plus,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  UserPlus,
  Users,
  X,
  FileDown,
  Shield,
  Database,
  Wrench,
  CheckCheck,
  BarChart3,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  PieChart,
  Percent,
  Activity,
} from 'lucide-react';

interface LabSessionDraft {
  classId: number;
  tanggal: string;
  judul: string;
  materi: string;
  catatan: string;
  scores: Record<
    number,
    {
      status: StudentAttendanceStatus;
      nilai_kinerja: number;
      nilai_laporan: number;
      catatan?: string;
    }
  >;
  activeActivityId: number | null; // null = sesi baru; number = menginspeksi rekaman tersimpan
}

export const LabActivityReport: React.FC = () => {
  const {
    currentUser,
    kopConfig,
    classes,
    students,
    labActivities,
    addLabActivity,
    updateLabActivity,
    deleteLabActivity,
    canEditLab,
    showToast,
    resetLabActivitiesByCluster,
    wipeOutAllLabActivities,
    addLabClass,
    addLabStudent,
    importStudentsFromExcel,
    updateLabStudent,
    deleteLabStudent,
  } = useInventory();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'timeline'>('entry');

  // Active Selected Laboratory (Mapel Workspace)
  const [selectedLab, setSelectedLab] = useState<LabId>(() => {
    if (currentUser?.assignedLab && currentUser.assignedLab !== 'ALL') {
      return currentUser.assignedLab;
    }
    return 'KIMIA';
  });

  // Access Control Checks (ACL)
  const isKepalaLab = useMemo(() => {
    return (
      currentUser?.role === 'KEPALA_LAB' ||
      currentUser?.email?.toLowerCase().trim() === 'ilham.majid@cendekia.sch.id' ||
      currentUser?.email?.toLowerCase().trim() === 'ilham.nurkholis114@guru.sma.belajar.id' ||
      currentUser?.assignedLab === 'ALL'
    );
  }, [currentUser]);

  const hasWriteAccess = useMemo(() => {
    return canEditLab ? canEditLab(selectedLab) : false;
  }, [canEditLab, selectedLab]);

  // Selected Class ID
  const [selectedClassId, setSelectedClassId] = useState<number>(() => {
    return classes[0]?.id || 1;
  });

  // Isolated Drafts for each Laboratory (strictly isolates state between KIMIA, FISIKA, BIOLOGI, and SMP_TERPADU)
  const [draftsByLab, setDraftsByLab] = useState<Record<LabId, LabSessionDraft>>(() => {
    const today = new Date().toISOString().split('T')[0];
    const initialClassId = classes[0]?.id || 1;

    const makeEmptyDraft = (lab: LabId): LabSessionDraft => ({
      classId: initialClassId,
      tanggal: today,
      judul: '',
      materi: '',
      catatan: '',
      scores: {},
      activeActivityId: null,
    });

    return {
      FISIKA: makeEmptyDraft('FISIKA'),
      KIMIA: makeEmptyDraft('KIMIA'),
      BIOLOGI: makeEmptyDraft('BIOLOGI'),
      SMP_TERPADU: makeEmptyDraft('SMP_TERPADU'),
    };
  });

  // Notification Toast
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search filter inside History
  const [historySearch, setHistorySearch] = useState('');

  // --- Modals for KEPALA_LAB Administration ---
  // Modal 1: Tambah Kelas Baru
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassYear, setNewClassYear] = useState('2025/2026');

  // Modal 2: Kelola / Tambah & Import Siswa
  const [isManageStudentsModalOpen, setIsManageStudentsModalOpen] = useState(false);
  const [manageStudentsTab, setManageStudentsTab] = useState<'manual' | 'excel'>('manual');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNisn, setNewStudentNisn] = useState('');
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParsedStudents, setExcelParsedStudents] = useState<Array<{ nama_siswa: string; nisn?: string }>>([]);
  const [excelErrorMsg, setExcelErrorMsg] = useState<string | null>(null);

  // Modal 3: Edit Identitas Siswa Manual
  const [editingStudent, setEditingStudent] = useState<LabStudent | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentNisn, setEditStudentNisn] = useState('');

  // Modal 4: Konfirmasi Reset Klaster / Wipe Out
  const [confirmResetModal, setConfirmResetModal] = useState<{
    isOpen: boolean;
    type: 'cluster' | 'wipeout';
    title: string;
    message: string;
    targetCount: number;
  } | null>(null);

  // Modal 5: Konfirmasi Hapus Rekam Jurnal Praktikum Tunggal
  const [activityToDelete, setActivityToDelete] = useState<LabActivityRecord | null>(null);

  // Current active draft for the chosen laboratory
  const currentDraft = draftsByLab[selectedLab];

  // Selected Class Info
  const currentClass = useMemo(() => {
    return (
      classes.find((c) => c.id === Number(selectedClassId)) || {
        id: selectedClassId,
        nama_kelas: 'Kelas XII MIPA 1',
        tahun_ajaran: '2025/2026',
      }
    );
  }, [classes, selectedClassId]);

  // Students in the active class
  const classStudents = useMemo(() => {
    return students.filter((s) => s.kelas_id === Number(selectedClassId));
  }, [students, selectedClassId]);

  // All activities STRICTLY belonging to the selected laboratory
  const activitiesForCurrentLab = useMemo(() => {
    return labActivities.filter((rec) => rec.laboratorium === selectedLab);
  }, [labActivities, selectedLab]);

  // Activities strictly for the selected laboratory AND selected class
  const classActivitiesForCurrentLab = useMemo(() => {
    return activitiesForCurrentLab.filter((rec) => rec.kelas_id === Number(selectedClassId));
  }, [activitiesForCurrentLab, selectedClassId]);

  // --- Visualisasi Distribusi Presensi Siswa Antar Mata Pelajaran (Recharts) ---
  const [chartClassFilter, setChartClassFilter] = useState<number | 'ALL'>('ALL');
  const [chartMetricMode, setChartMetricMode] = useState<'counts' | 'rate'>('counts');
  const [isChartCardOpen, setIsChartCardOpen] = useState(true);

  // Perhitungan distribusi presensi per mata pelajaran
  const attendanceDistributionData = useMemo(() => {
    const labKeys: LabId[] = ['FISIKA', 'KIMIA', 'BIOLOGI', 'SMP_TERPADU'];

    const filteredActs = labActivities.filter((act) => {
      if (chartClassFilter === 'ALL') return true;
      return act.kelas_id === Number(chartClassFilter);
    });

    return labKeys.map((labKey) => {
      const actsForLab = filteredActs.filter((a) => a.laboratorium === labKey);
      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let alpa = 0;

      actsForLab.forEach((act) => {
        try {
          const parsed: StudentScoreEntry[] = JSON.parse(act.rekap_nilai_json);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((s) => {
              if (s.status === 'Hadir') hadir += 1;
              else if (s.status === 'Izin') izin += 1;
              else if (s.status === 'Sakit') sakit += 1;
              else if (s.status === 'Alpa') alpa += 1;
              else hadir += 1;
            });
          } else {
            hadir += act.jumlah_hadir || 0;
            alpa += act.jumlah_absen || 0;
          }
        } catch {
          hadir += act.jumlah_hadir || 0;
          alpa += act.jumlah_absen || 0;
        }
      });

      const totalStudents = hadir + izin + sakit + alpa;
      const attendanceRate = totalStudents > 0 ? Number(((hadir / totalStudents) * 100).toFixed(1)) : 0;

      return {
        labKey,
        name: LAB_DEFINITIONS[labKey]?.shortName || labKey,
        fullName: LAB_DEFINITIONS[labKey]?.name || labKey,
        totalSessions: actsForLab.length,
        Hadir: hadir,
        Izin: izin,
        Sakit: sakit,
        Alpa: alpa,
        Total: totalStudents,
        Persentase: attendanceRate,
      };
    });
  }, [labActivities, chartClassFilter]);

  // Statistik agregat presensi seluruh mata pelajaran
  const overallAttendanceStats = useMemo(() => {
    const totalHadir = attendanceDistributionData.reduce((acc, d) => acc + d.Hadir, 0);
    const totalIzin = attendanceDistributionData.reduce((acc, d) => acc + d.Izin, 0);
    const totalSakit = attendanceDistributionData.reduce((acc, d) => acc + d.Sakit, 0);
    const totalAlpa = attendanceDistributionData.reduce((acc, d) => acc + d.Alpa, 0);
    const totalStudents = totalHadir + totalIzin + totalSakit + totalAlpa;
    const avgRate = totalStudents > 0 ? Number(((totalHadir / totalStudents) * 100).toFixed(1)) : 0;
    const totalSessions = attendanceDistributionData.reduce((acc, d) => acc + d.totalSessions, 0);

    return {
      totalHadir,
      totalIzin,
      totalSakit,
      totalAlpa,
      totalStudents,
      avgRate,
      totalSessions,
    };
  }, [attendanceDistributionData]);

  // When selectedLab or selectedClassId changes, ensure student score slots exist in currentDraft.scores
  useEffect(() => {
    setDraftsByLab((prev) => {
      const draft = prev[selectedLab];
      const nextScores = { ...draft.scores };
      let updated = false;

      classStudents.forEach((st) => {
        if (!nextScores[st.id]) {
          nextScores[st.id] = {
            status: 'Hadir',
            nilai_kinerja: 85,
            nilai_laporan: 85,
            catatan: '',
          };
          updated = true;
        }
      });

      if (updated || draft.classId !== Number(selectedClassId)) {
        return {
          ...prev,
          [selectedLab]: {
            ...draft,
            classId: Number(selectedClassId),
            scores: nextScores,
          },
        };
      }
      return prev;
    });
  }, [selectedLab, selectedClassId, classStudents]);

  // Update field inside the active lab draft
  const updateDraft = (patch: Partial<LabSessionDraft>) => {
    setDraftsByLab((prev) => ({
      ...prev,
      [selectedLab]: {
        ...prev[selectedLab],
        ...patch,
      },
    }));
  };

  // Update a single student's score in the active lab draft
  const handleScoreChange = (
    studentId: number,
    field: 'status' | 'nilai_kinerja' | 'nilai_laporan' | 'catatan',
    val: any
  ) => {
    setDraftsByLab((prev) => {
      const draft = prev[selectedLab];
      const currentEntry = draft.scores[studentId] || {
        status: 'Hadir',
        nilai_kinerja: 85,
        nilai_laporan: 85,
        catatan: '',
      };

      const updatedEntry = {
        ...currentEntry,
        [field]:
          field === 'nilai_kinerja' || field === 'nilai_laporan' ? Number(val) || 0 : val,
      };

      return {
        ...prev,
        [selectedLab]: {
          ...draft,
          scores: {
            ...draft.scores,
            [studentId]: updatedEntry,
          },
        },
      };
    });
  };

  // Helper batch actions for active lab
  const handleSetAllHadir = () => {
    setDraftsByLab((prev) => {
      const draft = prev[selectedLab];
      const nextScores = { ...draft.scores };
      classStudents.forEach((st) => {
        nextScores[st.id] = {
          ...(nextScores[st.id] || { nilai_kinerja: 85, nilai_laporan: 85, catatan: '' }),
          status: 'Hadir',
        };
      });
      return {
        ...prev,
        [selectedLab]: { ...draft, scores: nextScores },
      };
    });
  };

  const handleSetBatchScores = (kinerja: number, laporan: number) => {
    setDraftsByLab((prev) => {
      const draft = prev[selectedLab];
      const nextScores = { ...draft.scores };
      classStudents.forEach((st) => {
        nextScores[st.id] = {
          ...(nextScores[st.id] || { status: 'Hadir', catatan: '' }),
          nilai_kinerja: kinerja,
          nilai_laporan: laporan,
        };
      });
      return {
        ...prev,
        [selectedLab]: { ...draft, scores: nextScores },
      };
    });
  };

  // Load a saved activity into the form for inspecting/updating
  const handleLoadActivityIntoForm = (rec: LabActivityRecord) => {
    let parsedScores: StudentScoreEntry[] = [];
    try {
      parsedScores = JSON.parse(rec.rekap_nilai_json);
    } catch {
      parsedScores = [];
    }

    const scoresMap: Record<
      number,
      { status: StudentAttendanceStatus; nilai_kinerja: number; nilai_laporan: number; catatan?: string }
    > = {};

    parsedScores.forEach((ps) => {
      scoresMap[ps.student_id] = {
        status: ps.status,
        nilai_kinerja: ps.nilai_kinerja,
        nilai_laporan: ps.nilai_laporan,
        catatan: ps.catatan || '',
      };
    });

    // Ensure all current class students exist in scoresMap
    classStudents.forEach((st) => {
      if (!scoresMap[st.id]) {
        scoresMap[st.id] = {
          status: 'Hadir',
          nilai_kinerja: 85,
          nilai_laporan: 85,
          catatan: '',
        };
      }
    });

    setSelectedLab(rec.laboratorium);
    setSelectedClassId(rec.kelas_id);

    setDraftsByLab((prev) => ({
      ...prev,
      [rec.laboratorium]: {
        classId: rec.kelas_id,
        tanggal: rec.tanggal_kegiatan,
        judul: rec.judul_percobaan,
        materi: rec.materi_pokok || '',
        catatan: rec.catatan_kejadian || '',
        scores: scoresMap,
        activeActivityId: rec.id,
      },
    }));

    setActiveTab('entry');
    const msg = `Arsip praktikum [${LAB_DEFINITIONS[rec.laboratorium]?.shortName}] "${rec.judul_percobaan}" berhasil dimuat ke formulir.`;
    setNotification({
      type: 'success',
      message: msg,
    });
    showToast({
      type: 'info',
      title: 'Arsip Jurnal Dimuat',
      message: msg,
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Reset to empty new session for active lab
  const handleResetToNewSession = () => {
    const today = new Date().toISOString().split('T')[0];
    const initialScores: Record<
      number,
      { status: StudentAttendanceStatus; nilai_kinerja: number; nilai_laporan: number; catatan?: string }
    > = {};

    classStudents.forEach((st) => {
      initialScores[st.id] = {
        status: 'Hadir',
        nilai_kinerja: 85,
        nilai_laporan: 85,
        catatan: '',
      };
    });

    updateDraft({
      tanggal: today,
      judul: '',
      materi: '',
      catatan: '',
      scores: initialScores,
      activeActivityId: null,
    });

    const msg = `Formulir praktikum ${LAB_DEFINITIONS[selectedLab]?.name} di-reset untuk sesi baru.`;
    setNotification({
      type: 'success',
      message: msg,
    });
    showToast({
      type: 'info',
      title: 'Sesi Baru Disiapkan',
      message: msg,
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Realtime Statistics for the Current Class & Lab Session
  const sessionStats = useMemo(() => {
    const total = classStudents.length;
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;
    let sumKinerja = 0;
    let sumLaporan = 0;
    let sumAkhir = 0;

    classStudents.forEach((st) => {
      const entry = currentDraft.scores[st.id] || {
        status: 'Hadir',
        nilai_kinerja: 85,
        nilai_laporan: 85,
      };
      if (entry.status === 'Hadir') hadir += 1;
      else if (entry.status === 'Izin') izin += 1;
      else if (entry.status === 'Sakit') sakit += 1;
      else alfa += 1;

      const akhir = Math.round((entry.nilai_kinerja + entry.nilai_laporan) / 2);
      sumKinerja += entry.nilai_kinerja;
      sumLaporan += entry.nilai_laporan;
      sumAkhir += akhir;
    });

    const avgKinerja = total > 0 ? Number((sumKinerja / total).toFixed(1)) : 0;
    const avgLaporan = total > 0 ? Number((sumLaporan / total).toFixed(1)) : 0;
    const avgAkhir = total > 0 ? Number((sumAkhir / total).toFixed(1)) : 0;

    return {
      total,
      hadir,
      izin,
      sakit,
      alfa,
      tidakHadir: total - hadir,
      avgKinerja,
      avgLaporan,
      avgAkhir,
    };
  }, [classStudents, currentDraft.scores]);

  // Subject-specific historical averages for this class & lab
  const subjectClassCumulativeStats = useMemo(() => {
    let totalActivities = classActivitiesForCurrentLab.length;
    let totalStudentScoreCount = 0;
    let totalScoreSum = 0;

    classActivitiesForCurrentLab.forEach((act) => {
      try {
        const parsed: StudentScoreEntry[] = JSON.parse(act.rekap_nilai_json);
        if (Array.isArray(parsed)) {
          parsed.forEach((s) => {
            if (s.nilai_akhir > 0) {
              totalScoreSum += s.nilai_akhir;
              totalStudentScoreCount += 1;
            }
          });
        }
      } catch {
        // ignore
      }
    });

    const overallAverage =
      totalStudentScoreCount > 0
        ? Number((totalScoreSum / totalStudentScoreCount).toFixed(1))
        : 0;

    return {
      totalActivities,
      overallAverage,
    };
  }, [classActivitiesForCurrentLab]);

  // Convert current form values to StudentScoreEntry array
  const buildScoreEntries = (): StudentScoreEntry[] => {
    return classStudents.map((st) => {
      const entry = currentDraft.scores[st.id] || {
        status: 'Hadir',
        nilai_kinerja: 85,
        nilai_laporan: 85,
        catatan: '',
      };
      const akhir = Math.round((entry.nilai_kinerja + entry.nilai_laporan) / 2);
      return {
        student_id: st.id,
        nama: st.nama_siswa,
        nilai_kinerja: entry.nilai_kinerja,
        nilai_laporan: entry.nilai_laporan,
        nilai_akhir: akhir,
        status: entry.status,
        catatan: entry.catatan || '',
      };
    });
  };

  // Helper to load logo image URL/SVG into a PNG data URL for crisp vector-like PDF rendering
  const loadLogoAsDataUrl = async (url: string): Promise<string | null> => {
    if (!url) return null;
    if (
      url.startsWith('data:image/png') ||
      url.startsWith('data:image/jpeg') ||
      url.startsWith('data:image/jpg')
    ) {
      return url;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const targetWidth = img.naturalWidth || 200;
          const targetHeight = img.naturalHeight || 200;
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          console.warn('Gagal memproses gambar logo ke canvas:', err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 3500);
      img.src = url;
    });
  };

  // Generate PDF Document Core Function
  const generateBeritaAcaraPDF = async (data: {
    tanggal: string;
    laboratorium: LabId;
    className: string;
    classYear: string;
    judul: string;
    materi: string;
    catatan: string;
    namaGuru: string;
    nipGuru: string;
    entries: StudentScoreEntry[];
  }) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. KOP SURAT RESMI
    const yayasanText = (kopConfig.namaYayasan || 'YAYASAN BAYTU RAHMAH MADANIA').toUpperCase();
    const sekolahText = (kopConfig.namaSekolah || 'SMP dan SMA IT Ar-Rahmah Cendekia').toUpperCase();
    const unitText = (kopConfig.unitLaboratorium || 'Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia').toUpperCase();
    const alamatText =
      kopConfig.alamat ||
      'Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114';

    // Logo Instansi (Pojok Kiri)
    const logoSource = kopConfig.logoUrl || '/src/assets/images/arcss_logo_official.svg';
    const logoDataUrl = await loadLogoAsDataUrl(logoSource);
    if (logoDataUrl) {
      try {
        const isPng = !logoDataUrl.includes('image/jpeg');
        doc.addImage(logoDataUrl, isPng ? 'PNG' : 'JPEG', 14, 10, 20, 20);
      } catch (err) {
        console.warn('Gagal memuat logo ke PDF:', err);
      }
    }

    doc.setTextColor(6, 78, 59); // Deep Emerald
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(yayasanText, pageWidth / 2, 13, { align: 'center' });

    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFontSize(13);
    doc.text(sekolahText, pageWidth / 2, 19, { align: 'center' });

    doc.setTextColor(6, 78, 59);
    doc.setFontSize(10.5);
    doc.text(unitText, pageWidth / 2, 25, { align: 'center' });

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(alamatText, pageWidth / 2, 30, { align: 'center' });

    // Double divider line KOP
    doc.setDrawColor(6, 78, 59);
    doc.setLineWidth(0.7);
    doc.line(14, 33, pageWidth - 14, 33);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, 34.2, pageWidth - 14, 34.2);

    // 2. JUDUL DOKUMEN BERITA ACARA
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(
      'BERITA ACARA & BUKU KENDALI PELAKSANAAN PRAKTIKUM GURU',
      pageWidth / 2,
      40,
      { align: 'center' }
    );

    const labName = LAB_DEFINITIONS[data.laboratorium]?.name || data.laboratorium;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    // Metadata 2 Kolom Informasi Praktikum
    const leftX = 14;
    const midX = pageWidth / 2 + 5;
    let metaY = 46;

    doc.setFont('helvetica', 'bold');
    doc.text('Laboratorium / Mapel', leftX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${labName}`, leftX + 32, metaY);

    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal Kegiatan', midX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${data.tanggal}`, midX + 32, metaY);

    metaY += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Kelas / Rombel', leftX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${data.className} (TA ${data.classYear})`, leftX + 32, metaY);

    doc.setFont('helvetica', 'bold');
    doc.text('Guru Pengampu', midX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${data.namaGuru} (${data.nipGuru})`, midX + 32, metaY);

    metaY += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Materi Pokok', leftX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${data.materi || '-'}`, leftX + 32, metaY);

    doc.setFont('helvetica', 'bold');
    doc.text('Judul Percobaan', midX, metaY);
    doc.setFont('helvetica', 'normal');
    const splitJudul = doc.splitTextToSize(`: ${data.judul || '-'}`, pageWidth - midX - 34);
    doc.text(splitJudul, midX + 32, metaY);

    // Hitung Rata-rata dan rekap kehadiran
    const totalSiswa = data.entries.length;
    let totalHadir = 0;
    let sumKinerja = 0;
    let sumLaporan = 0;
    let sumAkhir = 0;

    data.entries.forEach((e) => {
      if (e.status === 'Hadir') totalHadir += 1;
      sumKinerja += e.nilai_kinerja || 0;
      sumLaporan += e.nilai_laporan || 0;
      sumAkhir += e.nilai_akhir || 0;
    });

    const avgK = totalSiswa > 0 ? (sumKinerja / totalSiswa).toFixed(1) : '0';
    const avgL = totalSiswa > 0 ? (sumLaporan / totalSiswa).toFixed(1) : '0';
    const avgA = totalSiswa > 0 ? (sumAkhir / totalSiswa).toFixed(1) : '0';

    // 3. TABEL AUTO TABLE RINCIAN NILAI SISWA
    const tableBody = data.entries.map((item, idx) => {
      const predikat =
        item.nilai_akhir >= 90
          ? 'Sangat Baik (A)'
          : item.nilai_akhir >= 80
          ? 'Baik (B)'
          : item.nilai_akhir >= 70
          ? 'Cukup (C)'
          : 'Perlu Bimbingan (D)';

      return [
        idx + 1,
        `SIS-${String(item.student_id).padStart(3, '0')}`,
        item.nama,
        item.status,
        item.nilai_kinerja,
        item.nilai_laporan,
        item.nilai_akhir,
        predikat,
      ];
    });

    const startTableY = metaY + 6;

    autoTable(doc, {
      startY: startTableY,
      theme: 'grid',
      head: [
        [
          'No',
          'NIS/ID',
          'Nama Lengkap Siswa',
          'Status Kehadiran',
          'Nilai Kinerja (Proses)',
          'Nilai Laporan',
          'Nilai Akhir',
          'Keterangan / Predikat',
        ],
      ],
      body: tableBody,
      foot: [
        [
          {
            content: `RATA-RATA KELAS (${LAB_DEFINITIONS[data.laboratorium]?.shortName || data.laboratorium}):`,
            colSpan: 3,
            styles: { halign: 'right', fontStyle: 'bold' },
          },
          {
            content: `Hadir: ${totalHadir} | Absen: ${totalSiswa - totalHadir}`,
            styles: { halign: 'center', fontStyle: 'bold' },
          },
          {
            content: `${avgK}`,
            styles: { halign: 'center', fontStyle: 'bold', textColor: [6, 78, 59] },
          },
          {
            content: `${avgL}`,
            styles: { halign: 'center', fontStyle: 'bold', textColor: [6, 78, 59] },
          },
          {
            content: `${avgA}`,
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fillColor: [226, 232, 240],
              textColor: [15, 23, 42],
            },
          },
          {
            content: `Tingkat Kehadiran: ${
              totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0
            }%`,
            styles: { halign: 'center', fontStyle: 'bold' },
          },
        ],
      ],
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [6, 78, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        2: { cellWidth: 70 },
        3: { halign: 'center', cellWidth: 30 },
        4: { halign: 'center', cellWidth: 35 },
        5: { halign: 'center', cellWidth: 35 },
        6: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
        7: { cellWidth: 44, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    // 4. CATATAN KEJADIAN PRAKTIKUM
    let finalY = (doc as any).lastAutoTable.finalY + 4;

    if (data.catatan) {
      if (finalY + 20 > pageHeight - 40) {
        doc.addPage();
        finalY = 15;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('Catatan Kejadian / Kondisi Alat & Reagen:', 14, finalY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const splitCatatan = doc.splitTextToSize(data.catatan, pageWidth - 28);
      doc.text(splitCatatan, 14, finalY + 4);
      finalY += 4 + splitCatatan.length * 3.5;
    }

    // 5. TANDA TANGAN TIGA KOLOM TERKUNCI RESMI
    if (finalY + 35 > pageHeight) {
      doc.addPage();
      finalY = 18;
    } else {
      finalY += 4;
    }

    const kotaPenetapan = kopConfig.kotaPenetapan?.trim() || 'Kota Tangerang';
    const tglFormatted = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Ditetapkan di: ${kotaPenetapan}, Tanggal: ${tglFormatted}`,
      pageWidth - 14,
      finalY,
      { align: 'right' }
    );

    finalY += 5;
    const colWidth = (pageWidth - 28) / 3;

    // Pejabat Pengesah Tiga Kolom Terkunci
    const pejabat1Title = 'Guru Pengampu Praktikum';
    const pejabat1Instansi = 'SMP dan SMA IT Ar-Rahmah Cendekia';
    const pejabat1Nama = data.namaGuru || 'Guru Pengampu Praktikum';
    const pejabat1Nip = data.nipGuru ? `NIP: ${data.nipGuru}` : 'NIP. -';

    const pejabat2Title = 'Kepala Laboratorium IPA Terpadu';
    const pejabat2Instansi = 'SMP dan SMA IT Ar-Rahmah Cendekia';
    const pejabat2Nama = 'Ilham Nurkholis Majid, S. Pd., Gr.';
    const pejabat2Nip = 'NIP: 2025.14.02.03';

    const pejabat3Title = 'Mengetahui, Kepala Sekolah';
    const pejabat3Instansi = 'SMP dan SMA IT Ar-Rahmah Cendekia';
    const pejabat3Nama = 'Narendra Ichiputra Hariyanto, S. Si., S. Pd., M. Biomed.';
    const pejabat3Nip = 'NIP: 0925.0214.01';

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.text(pejabat1Title, 14 + colWidth * 0.5, finalY, { align: 'center' });
    doc.text(pejabat2Title, 14 + colWidth * 1.5, finalY, { align: 'center' });
    doc.text(pejabat3Title, 14 + colWidth * 2.5, finalY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(pejabat1Instansi, 14 + colWidth * 0.5, finalY + 4, { align: 'center' });
    doc.text(pejabat2Instansi, 14 + colWidth * 1.5, finalY + 4, { align: 'center' });
    doc.text(pejabat3Instansi, 14 + colWidth * 2.5, finalY + 4, { align: 'center' });

    const signY = finalY + 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(pejabat1Nama, 14 + colWidth * 0.5, signY, { align: 'center' });
    doc.text(pejabat2Nama, 14 + colWidth * 1.5, signY, { align: 'center' });
    doc.text(pejabat3Nama, 14 + colWidth * 2.5, signY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(pejabat1Nip, 14 + colWidth * 0.5, signY + 4, { align: 'center' });
    doc.text(pejabat2Nip, 14 + colWidth * 1.5, signY + 4, { align: 'center' });
    doc.text(pejabat3Nip, 14 + colWidth * 2.5, signY + 4, { align: 'center' });

    // Download Clean File
    const cleanFileName = `Berita_Acara_Praktikum_${data.laboratorium}_${data.className.replace(
      /\s+/g,
      '_'
    )}_${data.tanggal}.pdf`;
    doc.save(cleanFileName);
  };

  // Handle Form Submission
  const handleSubmit = (andPrint: boolean = false) => {
    // Security Access Control List (ACL) Guard
    if (!hasWriteAccess) {
      if (andPrint) {
        // Allow printing PDF in Read-Only mode without mutating database
        const entries = buildScoreEntries();
        const namaGuru = currentUser?.name || 'Guru Pengampu Praktikum';
        const nipGuru = currentUser?.nip || currentUser?.schoolIdNumber || '-';
        generateBeritaAcaraPDF({
          tanggal: currentDraft.tanggal,
          laboratorium: selectedLab,
          className: currentClass.nama_kelas,
          classYear: currentClass.tahun_ajaran,
          judul: currentDraft.judul.trim() || `Praktikum ${LAB_DEFINITIONS[selectedLab].shortName}`,
          materi: currentDraft.materi.trim(),
          catatan: currentDraft.catatan.trim(),
          namaGuru,
          nipGuru,
          entries,
        });
        const msg = `Dokumen Berita Acara PDF [${LAB_DEFINITIONS[selectedLab].shortName}] berhasil di-generate (Mode Read-Only).`;
        setNotification({
          type: 'success',
          message: msg,
        });
        showToast({
          type: 'info',
          title: 'Berita Acara Dicetak',
          message: msg,
        });
        setTimeout(() => setNotification(null), 3500);
        return;
      }

      const accessDeniedMsg = 'Akses Ditolak: Anda tidak memiliki otoritas untuk mengubah data laboratorium ini.';
      setNotification({
        type: 'error',
        message: accessDeniedMsg,
      });
      showToast({
        type: 'error',
        title: 'Akses Ditolak (Sistem Keamanan ACL)',
        message: accessDeniedMsg,
        duration: 5000,
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    if (!currentDraft.judul.trim()) {
      const emptyMsg = 'Mohon isi Judul Percobaan praktikum terlebih dahulu.';
      setNotification({
        type: 'error',
        message: emptyMsg,
      });
      showToast({
        type: 'warning',
        title: 'Data Belum Lengkap',
        message: emptyMsg,
      });
      return;
    }

    const entries = buildScoreEntries();
    const namaGuru = currentUser?.name || 'Guru Laboran Resmi';
    const nipGuru = currentUser?.nip || currentUser?.schoolIdNumber || '-';

    const result = addLabActivity({
      tanggal_kegiatan: currentDraft.tanggal,
      laboratorium: selectedLab,
      kelas_id: Number(selectedClassId),
      judul_percobaan: currentDraft.judul.trim(),
      materi_pokok: currentDraft.materi.trim(),
      catatan_kejadian: currentDraft.catatan.trim(),
      guru_id: currentUser?.id ? Number(currentUser.id) || 1 : 1,
      nama_guru: namaGuru,
      student_scores: entries,
    });

    if (result.success) {
      const successFeedback = andPrint
        ? `Berita acara [${LAB_DEFINITIONS[selectedLab].shortName}] berhasil disimpan & dokumen PDF sedang diunduh.`
        : `Jurnal kegiatan praktikum [${LAB_DEFINITIONS[selectedLab].shortName}] berhasil disimpan ke database.`;

      setNotification({
        type: 'success',
        message: successFeedback,
      });

      if (andPrint) {
        generateBeritaAcaraPDF({
          tanggal: currentDraft.tanggal,
          laboratorium: selectedLab,
          className: currentClass.nama_kelas,
          classYear: currentClass.tahun_ajaran,
          judul: currentDraft.judul.trim(),
          materi: currentDraft.materi.trim(),
          catatan: currentDraft.catatan.trim(),
          namaGuru,
          nipGuru,
          entries,
        });
      }
    } else {
      setNotification({
        type: 'error',
        message: result.message,
      });
    }

    setTimeout(() => setNotification(null), 4000);
  };

  // Re-print past activity directly from record
  const handlePrintPastActivity = (record: LabActivityRecord) => {
    const matchedClass = classes.find((c) => c.id === record.kelas_id);
    let parsedEntries: StudentScoreEntry[] = [];
    try {
      parsedEntries = JSON.parse(record.rekap_nilai_json);
    } catch {
      parsedEntries = [];
    }

    generateBeritaAcaraPDF({
      tanggal: record.tanggal_kegiatan,
      laboratorium: record.laboratorium,
      className: matchedClass?.nama_kelas || `Kelas #${record.kelas_id}`,
      classYear: matchedClass?.tahun_ajaran || '2025/2026',
      judul: record.judul_percobaan,
      materi: record.materi_pokok || '',
      catatan: record.catatan_kejadian || '',
      namaGuru: record.nama_guru || currentUser?.name || 'Guru Pengampu',
      nipGuru: currentUser?.nip || currentUser?.schoolIdNumber || '-',
      entries: parsedEntries,
    });

    showToast({
      type: 'info',
      title: 'Mencetak Berita Acara PDF',
      message: `Mengunduh Berita Acara "${record.judul_percobaan}" (${LAB_DEFINITIONS[record.laboratorium]?.shortName}).`,
    });
  };

  // --- Handlers for KEPALA_LAB Administration ---

  // 1. Tambah Kelas Baru
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      showToast({ type: 'warning', title: 'Data Kurang', message: 'Nama kelas wajib diisi.' });
      return;
    }
    const res = addLabClass(newClassName.trim(), newClassYear.trim() || '2025/2026');
    if (res.success && res.newClass) {
      setSelectedClassId(res.newClass.id);
      setIsAddClassModalOpen(false);
      setNewClassName('');
    }
  };

  // 2. Tambah Siswa Manual
  const handleAddStudentManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      showToast({ type: 'warning', title: 'Data Kurang', message: 'Nama siswa wajib diisi.' });
      return;
    }
    const res = addLabStudent(Number(selectedClassId), newStudentName.trim(), newStudentNisn.trim() || undefined);
    if (res.success) {
      setNewStudentName('');
      setNewStudentNisn('');
    }
  };

  // 3. Upload & Parse File Excel
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
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) {
          setExcelErrorMsg('Lembar kerja Excel tidak ditemukan.');
          setExcelParsedStudents([]);
          return;
        }
        const worksheet = workbook.Sheets[firstSheet];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setExcelErrorMsg('File kosong atau lembar kerja tidak berisi baris data siswa.');
          setExcelParsedStudents([]);
          return;
        }

        const list: Array<{ nama_siswa: string; nisn?: string }> = [];

        rawJson.forEach((row) => {
          let nama = '';
          let nisn = '';

          Object.keys(row).forEach((col) => {
            const cleanCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');
            const val = String(row[col]).trim();

            if (!nama && (cleanCol.includes('nama') || cleanCol.includes('siswa') || cleanCol.includes('name'))) {
              nama = val;
            } else if (!nisn && (cleanCol.includes('nisn') || cleanCol.includes('nis') || cleanCol.includes('induk'))) {
              nisn = val;
            }
          });

          // Fallback jika header tidak standar: gunakan kolom pertama untuk nama & kedua untuk nisn
          if (!nama) {
            const cols = Object.keys(row);
            if (cols.length > 0 && String(row[cols[0]]).trim()) {
              nama = String(row[cols[0]]).trim();
              if (cols.length > 1 && !nisn) {
                nisn = String(row[cols[1]]).trim();
              }
            }
          }

          if (nama) {
            list.push({ nama_siswa: nama, nisn: nisn || undefined });
          }
        });

        if (list.length === 0) {
          setExcelErrorMsg('Tidak dapat mendeteksi kolom "Nama" atau "NISN". Silakan pastikan file memiliki baris header dengan nama kolom tersebut.');
          setExcelParsedStudents([]);
        } else {
          setExcelParsedStudents(list);
        }
      } catch (err: any) {
        console.error('Gagal membaca Excel:', err);
        setExcelErrorMsg('Terjadi kesalahan saat memproses file Excel: ' + (err.message || 'Format file tidak didukung'));
        setExcelParsedStudents([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 4. Eksekusi Komit Import Excel
  const handleCommitExcelImport = () => {
    if (excelParsedStudents.length === 0) {
      showToast({ type: 'warning', title: 'Belum Ada Data', message: 'Silakan upload file Excel dengan data siswa yang valid terlebih dahulu.' });
      return;
    }
    const res = importStudentsFromExcel(Number(selectedClassId), excelParsedStudents);
    if (res.success) {
      setExcelParsedStudents([]);
      setExcelFileName('');
      setIsManageStudentsModalOpen(false);
    }
  };

  // 5. Download Template Excel Siswa
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nama Lengkap Siswa', 'NISN'],
      ['Ahmad Fauzi', '0081234567'],
      ['Siti Aisyah', '0089876543'],
      ['Muhammad Rizki', '0075544332'],
      ['Fatimah Az-Zahra', '0091122334'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, `Template_Import_Siswa_${currentClass.nama_kelas.replace(/\s+/g, '_')}.xlsx`);
    showToast({
      type: 'info',
      title: 'Template Diunduh',
      message: 'File Template_Import_Siswa.xlsx berhasil diunduh.',
    });
  };

  // 6. Edit Siswa Manual
  const handleOpenEditStudent = (st: LabStudent) => {
    setEditingStudent(st);
    setEditStudentName(st.nama_siswa);
    setEditStudentNisn(st.nisn || '');
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editStudentName.trim()) {
      showToast({ type: 'warning', title: 'Data Kurang', message: 'Nama siswa tidak boleh kosong.' });
      return;
    }
    const res = updateLabStudent(editingStudent.id, {
      nama_siswa: editStudentName.trim(),
      nisn: editStudentNisn.trim() || undefined,
    });
    if (res.success) {
      setEditingStudent(null);
    }
  };

  // 7. Reset Klaster Praktikum & Wipe Out All
  const handleTriggerResetCluster = () => {
    const count = classActivitiesForCurrentLab.length;
    if (count === 0) {
      showToast({
        type: 'info',
        title: 'Tidak Ada Data',
        message: `Belum ada riwayat jurnal praktikum ${LAB_DEFINITIONS[selectedLab].shortName} untuk kelas ${currentClass.nama_kelas}.`,
      });
      return;
    }
    setConfirmResetModal({
      isOpen: true,
      type: 'cluster',
      title: `Reset Klaster Jurnal: ${LAB_DEFINITIONS[selectedLab].shortName}`,
      message: `Apakah Anda yakin ingin menghapus bersih ${count} rekaman jurnal praktikum khusus mata pelajaran ${LAB_DEFINITIONS[selectedLab].name} untuk kelas ${currentClass.nama_kelas}? Tindakan ini tidak dapat dibatalkan.`,
      targetCount: count,
    });
  };

  const handleTriggerWipeOutAll = () => {
    const totalCount = labActivities.length;
    if (totalCount === 0) {
      showToast({
        type: 'info',
        title: 'Database Kosong',
        message: 'Tidak ada data jurnal praktikum yang tersimpan di sistem.',
      });
      return;
    }
    setConfirmResetModal({
      isOpen: true,
      type: 'wipeout',
      title: 'Wipe Out All: Hapus Semua Riwayat Praktikum',
      message: `PERINGATAN TINGKAT TINGGI: Anda akan menghapus TOTAL ${totalCount} riwayat jurnal praktikum dan rekap nilai di SEMUA laboratorium (Fisika, Kimia, Biologi, SMP Terpadu) secara global. Seluruh data riwayat akan dikosongkan. Lanjutkan?`,
      targetCount: totalCount,
    });
  };

  const handleExecuteConfirmedReset = () => {
    if (!confirmResetModal) return;
    if (confirmResetModal.type === 'cluster') {
      resetLabActivitiesByCluster(selectedLab, Number(selectedClassId));
    } else {
      wipeOutAllLabActivities();
    }
    setConfirmResetModal(null);
  };

  const handleConfirmDeleteActivity = () => {
    if (!activityToDelete) return;
    const targetId = activityToDelete.id;
    const res = deleteLabActivity(targetId);
    if (res.success) {
      if (currentDraft.activeActivityId === targetId) {
        handleResetToNewSession();
      }
      setActivityToDelete(null);
    }
  };

  // Filtered History list strictly for the selected lab
  const filteredLabHistory = useMemo(() => {
    return activitiesForCurrentLab.filter((rec) => {
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      return (
        rec.judul_percobaan.toLowerCase().includes(q) ||
        (rec.materi_pokok && rec.materi_pokok.toLowerCase().includes(q)) ||
        (rec.nama_guru && rec.nama_guru.toLowerCase().includes(q))
      );
    });
  }, [activitiesForCurrentLab, historySearch]);

  const labList: LabId[] = ['FISIKA', 'KIMIA', 'BIOLOGI', 'SMP_TERPADU'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-white/95 backdrop-blur-xs p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80">
              <BookOpen className="w-3.5 h-3.5 text-teal-700" />
              Buku Kendali & Jurnal Praktikum Guru
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Ruang Kerja Praktikum: {LAB_DEFINITIONS[selectedLab].name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
            Entri rekapan jurnal, absensi siswa, dan rekap penilaian proses/laporan terpisah secara
            ketat untuk mata pelajaran <strong>{LAB_DEFINITIONS[selectedLab].shortName}</strong>.
            Data praktikum tidak bercampur dengan laboratorium lain.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('entry')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'entry'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-emerald-700" />
            <span>Formulir Jurnal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'history'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-emerald-700" />
            <span>Riwayat Berita Acara ({activitiesForCurrentLab.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'timeline'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-emerald-900 hover:bg-slate-200/60'
            }`}
          >
            <Activity className={`w-4 h-4 ${activeTab === 'timeline' ? 'text-emerald-300' : 'text-emerald-700'}`} />
            <span>Timeline Frekuensi Lab (D3.js)</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                activeTab === 'timeline' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {labActivities.length}
            </span>
          </button>
        </div>
      </div>

      {/* 4 PROMINENT WORKSPACE SELECTOR TABS (ATURAN 1: ISOLASI KETAT ANTAR MAPEL) */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            Pilih Ruang Kerja Laboratorium / Mata Pelajaran:
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Ruang: {LAB_DEFINITIONS[selectedLab].roomLocation}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {labList.map((labKey) => {
            const isCurrent = selectedLab === labKey;
            const count = labActivities.filter((a) => a.laboratorium === labKey).length;
            const info = LAB_DEFINITIONS[labKey];
            const hasAccess = canEditLab ? canEditLab(labKey) : false;

            return (
              <button
                key={labKey}
                type="button"
                onClick={() => setSelectedLab(labKey)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[92px] ${
                  isCurrent
                    ? 'bg-emerald-950 text-white border-emerald-950 shadow-md ring-2 ring-emerald-600/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1 w-full">
                  <span
                    className={`text-xs font-extrabold uppercase tracking-tight ${
                      isCurrent ? 'text-emerald-300' : 'text-slate-900'
                    }`}
                  >
                    {info.shortName}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isCurrent
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count} Jurnal
                  </span>
                </div>
                <div className="mt-1">
                  <p
                    className={`text-[11px] truncate leading-tight ${
                      isCurrent ? 'text-emerald-100/90' : 'text-slate-500'
                    }`}
                  >
                    PJ: {info.leadPerson}
                  </p>
                </div>

                {/* ACL Authority Badge */}
                <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between">
                  {hasAccess ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isCurrent
                          ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/60'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{isKepalaLab ? 'Akses Penuh' : 'Pengampu (Akses Penuh)'}</span>
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isCurrent
                          ? 'bg-amber-950/80 text-amber-200 border border-amber-700/50'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <Lock className="w-2.5 h-2.5 text-amber-600" />
                      <span>Melihat Saja (Read-Only)</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PANEL ADMINISTRASI KHUSUS KEPALA LAB (ADMIN EXCLUSIVE CONTROL) */}
      {isKepalaLab && (
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-emerald-800/40 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Otoritas Kepala Lab (Admin)
                </span>
                <span className="text-[11px] text-slate-300">
                  {currentUser?.name || 'Ust. Ilham Nurkholis Majid'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                Panel Administrasi & Pengelolaan Praktikum
              </h3>
              <p className="text-xs text-slate-300">
                Kelola rombel &amp; siswa, import data via Excel, atau bersihkan arsip riwayat praktikum secara terisolasi maupun global.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tambah Kelas / Rombel */}
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kelas</span>
              </button>

              {/* Kelola / Import Siswa */}
              <button
                type="button"
                onClick={() => {
                  setManageStudentsTab('manual');
                  setIsManageStudentsModalOpen(true);
                }}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Kelola Siswa ({classStudents.length})</span>
              </button>

              {/* Import Excel Direct Trigger */}
              <button
                type="button"
                onClick={() => {
                  setManageStudentsTab('excel');
                  setIsManageStudentsModalOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span>Import Siswa (Excel)</span>
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-700 hidden sm:block mx-1" />

              {/* Reset Klaster */}
              <button
                type="button"
                onClick={handleTriggerResetCluster}
                className="px-3.5 py-2 bg-amber-600/80 hover:bg-amber-600 text-white border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title={`Hapus riwayat praktikum ${LAB_DEFINITIONS[selectedLab].shortName} pada kelas ${currentClass.nama_kelas}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Klaster ({classActivitiesForCurrentLab.length})</span>
              </button>

              {/* Wipe Out All */}
              <button
                type="button"
                onClick={handleTriggerWipeOutAll}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Hapus total seluruh riwayat praktikum di semua laboratorium secara global"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe Out All ({labActivities.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs sm:text-sm font-semibold transition-all shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
              : 'bg-red-50 text-red-950 border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ====================================================================== */}
      {/* GRAFIK DISTRIBUSI PRESENSI PRAKTIKUM ANTAR MAPEL / LAB (RECHARTS)      */}
      {/* ====================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Distribusi Presensi Praktikum Antar Mata Pelajaran
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Recharts Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Komparasi data kehadiran siswa (Hadir, Izin, Sakit, Alpa) di seluruh laboratorium sains
              </p>
            </div>
          </div>

          {/* Controls Bar: Filter Rombel, Mode Switcher, & Collapse Toggle */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {/* Filter Rombel / Kelas */}
            <select
              value={chartClassFilter}
              onChange={(e) =>
                setChartClassFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 shadow-2xs"
            >
              <option value="ALL">Semua Rombel (Gabungan)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama_kelas}
                </option>
              ))}
            </select>

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartMetricMode('counts')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartMetricMode === 'counts'
                    ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jumlah Siswa
              </button>
              <button
                type="button"
                onClick={() => setChartMetricMode('rate')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartMetricMode === 'rate'
                    ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                % Kehadiran
              </button>
            </div>

            {/* Direct jump to D3 Timeline */}
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Buka Timeline Interaktif Frekuensi Lab D3.js (Zoom & Pan)"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-700" />
              <span>Timeline D3.js</span>
            </button>

            {/* Collapse / Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsChartCardOpen(!isChartCardOpen)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors border border-slate-200"
              title={isChartCardOpen ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}
            >
              {isChartCardOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Card Body */}
        {isChartCardOpen && (
          <div className="p-4 sm:p-5 space-y-5">
            {/* KPI Metric Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Rata-rata Kehadiran
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-mono text-emerald-700">
                    {overallAttendanceStats.avgRate}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({overallAttendanceStats.totalSessions} sesi)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Total Kehadiran
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-mono text-emerald-800">
                    {overallAttendanceStats.totalHadir}
                  </span>
                  <span className="text-[10px] text-emerald-600">Siswa Hadir</span>
                </div>
              </div>

              <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl">
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                  Izin &amp; Sakit
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-mono text-sky-800">
                    {overallAttendanceStats.totalIzin + overallAttendanceStats.totalSakit}
                  </span>
                  <span className="text-[10px] text-sky-600">
                    ({overallAttendanceStats.totalIzin} Izin, {overallAttendanceStats.totalSakit} Sakit)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Alpa / Tanpa Keterangan
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-mono text-rose-800">
                    {overallAttendanceStats.totalAlpa}
                  </span>
                  <span className="text-[10px] text-rose-600">Siswa Absen</span>
                </div>
              </div>
            </div>

            {/* Recharts Canvas */}
            <div className="w-full h-72 pt-1">
              <ResponsiveContainer width="100%" height="100%">
                {chartMetricMode === 'counts' ? (
                  <BarChart
                    data={attendanceDistributionData}
                    margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[210px]">
                              <div className="font-bold border-b border-slate-700 pb-1.5 flex items-center justify-between">
                                <span className="text-emerald-400">{data.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {data.totalSessions} Sesi
                                </span>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Hadir:
                                  </span>
                                  <span className="font-mono font-bold text-white">
                                    {data.Hadir} siswa
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                                    Izin:
                                  </span>
                                  <span className="font-mono font-bold text-white">
                                    {data.Izin} siswa
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    Sakit:
                                  </span>
                                  <span className="font-mono font-bold text-white">
                                    {data.Sakit} siswa
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                    Alpa:
                                  </span>
                                  <span className="font-mono font-bold text-white">
                                    {data.Alpa} siswa
                                  </span>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-700 flex items-center justify-between font-bold">
                                <span className="text-slate-300">Tingkat Kehadiran:</span>
                                <span className="text-emerald-400 font-mono text-sm">
                                  {data.Persentase}%
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
                    <Bar dataKey="Hadir" stackId="presensi" fill="#059669" name="Hadir" />
                    <Bar dataKey="Izin" stackId="presensi" fill="#0284c7" name="Izin" />
                    <Bar dataKey="Sakit" stackId="presensi" fill="#d97706" name="Sakit" />
                    <Bar
                      dataKey="Alpa"
                      stackId="presensi"
                      fill="#e11d48"
                      name="Alpa"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <BarChart
                    data={attendanceDistributionData}
                    margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[180px]">
                              <div className="font-bold border-b border-slate-700 pb-1 text-emerald-400">
                                {data.fullName}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-300">Kehadiran:</span>
                                <span className="font-mono font-bold text-emerald-400 text-sm">
                                  {data.Persentase}%
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {data.Hadir} hadir dari {data.Total} total siswa
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Persentase" name="Tingkat Kehadiran (%)" radius={[6, 6, 0, 0]}>
                      {attendanceDistributionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.Persentase >= 90
                              ? '#059669'
                              : entry.Persentase >= 80
                              ? '#0284c7'
                              : entry.Persentase >= 70
                              ? '#d97706'
                              : '#e11d48'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Micro Details per Subject Footnote */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
              {attendanceDistributionData.map((d) => (
                <div
                  key={d.labKey}
                  className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                >
                  <span className="font-bold text-slate-700">{d.name}</span>
                  <span
                    className={`font-mono font-bold ${
                      d.Persentase >= 85 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {d.Persentase}% ({d.Hadir}/{d.Total})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: FORMULIR INPUT JURNAL & PENILAIAN SISWA KHUSUS MAPEL */}
      {activeTab === 'entry' && (
        <div className="space-y-6">
          {/* Read-Only Alert Banner when current user lacks write authority for this laboratory */}
          {!hasWriteAccess && (
            <div className="bg-amber-50 border-2 border-amber-300 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-amber-950 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-200/80 rounded-xl text-amber-900 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5 text-amber-800" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-amber-950">
                      Mode Melihat Saja (Read-Only) — Laboratorium {LAB_DEFINITIONS[selectedLab].name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-amber-200 text-amber-900 border border-amber-300">
                      Terkunci
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-900/90 max-w-3xl leading-relaxed">
                    Anda saat ini login sebagai <strong>{currentUser?.name || 'Guru'}</strong> (
                    {currentUser?.role === 'KEPALA_LAB'
                      ? 'Kepala Laboratorium'
                      : currentUser?.assignedLab
                      ? `Guru Pengampu Lab ${currentUser.assignedLab}`
                      : 'Staff Resmi'}
                    ). Sesuai kebijakan Access Control List (ACL), hak penginputan dan pengubahan data hanya
                    dimiliki oleh Guru Pengampu Laboratorium {LAB_DEFINITIONS[selectedLab].shortName} (
                    <em>{LAB_DEFINITIONS[selectedLab].leadPerson}</em>) atau Kepala Lab. 
                    Anda dapat meninjau data jurnal, kehadiran, rekapitulasi nilai siswa, dan mencetak dokumen Berita Acara PDF resmi.
                  </p>
                </div>
              </div>
              <div className="shrink-0 self-end md:self-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-200/90 px-3.5 py-2 rounded-xl border border-amber-300">
                  <Lock className="w-3.5 h-3.5 text-amber-800" />
                  <span>Kunci Otoritas Aktif</span>
                </span>
              </div>
            </div>
          )}

          {/* Card 1: Pengaturan Sesi & Identitas Jurnal */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  1. Sesi Praktikum & Rombel: {LAB_DEFINITIONS[selectedLab].name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {currentDraft.activeActivityId ? (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
                    <span>Sedang menginspeksi arsip praktikum</span>
                    <button
                      type="button"
                      onClick={handleResetToNewSession}
                      className="text-amber-800 hover:text-amber-950 underline font-bold ml-1 flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Buat Sesi Baru</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                    Mode Entri Baru
                  </span>
                )}
              </div>
            </div>

            {/* Quick Sesi Praktikum Selector for this Class & Lab */}
            {classActivitiesForCurrentLab.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Pilih Sesi Praktikum {LAB_DEFINITIONS[selectedLab].shortName} untuk Kelas Ini:</span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    Tersedia {classActivitiesForCurrentLab.length} rekaman di kelas ini
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {hasWriteAccess && (
                    <button
                      type="button"
                      onClick={handleResetToNewSession}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        currentDraft.activeActivityId === null
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      + Catat Sesi Praktikum Baru
                    </button>
                  )}
                  {classActivitiesForCurrentLab.map((rec) => (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => handleLoadActivityIntoForm(rec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all truncate max-w-xs ${
                        currentDraft.activeActivityId === rec.id
                          ? 'bg-emerald-800 text-white border-emerald-800 font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                      title={rec.judul_percobaan}
                    >
                      {rec.tanggal_kegiatan} · {rec.judul_percobaan}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid Baris 1: Kelas, Tanggal, dan Guru */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dropdown Pemilih Kelas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Pilih Rombongan Belajar (Kelas) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      {classStudents.length} Siswa Terdaftar
                    </span>
                    {isKepalaLab && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsAddClassModalOpen(true)}
                          className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-bold flex items-center gap-0.5 transition-colors"
                          title="Tambah Rombel Baru"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Kelas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setManageStudentsTab('excel');
                            setIsManageStudentsModalOpen(true);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 font-bold flex items-center gap-0.5 transition-colors"
                          title="Import Siswa via Excel"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>Import</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all shadow-xs"
                >
                  {classes.map((cls) => {
                    const unit = getSchoolUnit(cls.nama_kelas, cls.unit);
                    return (
                      <option key={cls.id} value={cls.id}>
                        {cls.nama_kelas} ({unit} IT - TA {cls.tahun_ajaran})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Tanggal Kegiatan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tanggal Pelaksanaan Kegiatan *</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={!hasWriteAccess}
                  value={currentDraft.tanggal}
                  onChange={(e) => updateDraft({ tanggal: e.target.value })}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all shadow-xs ${
                    !hasWriteAccess
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 focus:border-emerald-600 focus:bg-white text-slate-900'
                  }`}
                />
              </div>

              {/* Guru Pengampu Mapel */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Guru Pengampu Praktikum
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${currentUser?.name || 'Guru Laboran'} (${currentUser?.nip || currentUser?.schoolIdNumber || 'NIP Terverifikasi'})`}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {/* Grid Baris 2: Judul Percobaan & Materi Pokok Khusus Mapel Ini */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Judul Percobaan Praktikum ({LAB_DEFINITIONS[selectedLab].shortName}) *
                </label>
                <input
                  type="text"
                  required
                  readOnly={!hasWriteAccess}
                  disabled={!hasWriteAccess}
                  value={currentDraft.judul}
                  onChange={(e) => updateDraft({ judul: e.target.value })}
                  placeholder={`Contoh praktikum ${LAB_DEFINITIONS[selectedLab].shortName}...`}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all shadow-xs ${
                    !hasWriteAccess
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 focus:border-emerald-600 focus:bg-white text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Materi Pokok / Sub-Bab Pembelajaran
                </label>
                <input
                  type="text"
                  readOnly={!hasWriteAccess}
                  disabled={!hasWriteAccess}
                  value={currentDraft.materi}
                  onChange={(e) => updateDraft({ materi: e.target.value })}
                  placeholder="Materi kurikulum yang bersangkutan..."
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs sm:text-sm font-medium outline-none transition-all shadow-xs ${
                    !hasWriteAccess
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 focus:border-emerald-600 focus:bg-white text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Catatan Kejadian & Kondisi Lab */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                Catatan Kejadian di Lab & Kondisi Peralatan / Reagen
              </label>
              <textarea
                rows={2}
                readOnly={!hasWriteAccess}
                disabled={!hasWriteAccess}
                value={currentDraft.catatan}
                onChange={(e) => updateDraft({ catatan: e.target.value })}
                placeholder={
                  hasWriteAccess
                    ? 'Catat jika ada alat pecah/rusak, kekurangan bahan reagen, atau kendala keselamatan kerja selama praktikum berlangsung...'
                    : 'Catatan kejadian di laboratorium (Read-Only)'
                }
                className={`w-full px-3.5 py-2 border rounded-xl text-xs sm:text-sm leading-relaxed outline-none transition-all shadow-xs ${
                  !hasWriteAccess
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-300 focus:border-emerald-600 focus:bg-white text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Card 2: Tabel Entry Siswa Dinamis (ATURAN 2: NILAI & SISWA SPESIFIK MAPEL) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header Box & Quick Batch Actions */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    2. Entri Kehadiran & Nilai Praktikum: {LAB_DEFINITIONS[selectedLab].shortName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rombel <strong>{currentClass.nama_kelas}</strong>. Kolom nilai proses dan laporan ini
                  murni diisolasi untuk praktikum {LAB_DEFINITIONS[selectedLab].name}.
                </p>
              </div>

              {/* Quick Batch Controls / Locked Notice */}
              {hasWriteAccess ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetAllHadir}
                    className="min-h-[34px] px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Set Semua Hadir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBatchScores(85, 85)}
                    className="min-h-[34px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Nilai Standar (85/85)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBatchScores(92, 94)}
                    className="min-h-[34px] px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Nilai Sangat Baik (92/94)
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Input Nilai Terkunci (Mode Melihat Saja)</span>
                </div>
              )}
            </div>

            {/* Quick Metrics Summary Ribbon (Khusus Mapel Terpilih) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 border-b border-slate-200 bg-white text-xs">
              <div className="p-3 text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Total Siswa ({currentClass.nama_kelas})
                </span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {sessionStats.total} Orang
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] text-emerald-700 font-semibold uppercase block">
                  Kehadiran Sesi {LAB_DEFINITIONS[selectedLab].shortName}
                </span>
                <span className="text-base font-bold font-mono text-emerald-700">
                  {sessionStats.hadir} Hadir ({sessionStats.tidakHadir} Absen)
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] text-sky-700 font-semibold uppercase block">
                  Rata-rata Proses {LAB_DEFINITIONS[selectedLab].shortName}
                </span>
                <span className="text-base font-bold font-mono text-sky-800">
                  {sessionStats.avgKinerja}
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] text-purple-700 font-semibold uppercase block">
                  Rata-rata Nilai Akhir {LAB_DEFINITIONS[selectedLab].shortName}
                </span>
                <span className="text-base font-bold font-mono text-purple-900">
                  {sessionStats.avgAkhir}
                </span>
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-4">Nama Lengkap Siswa</th>
                    <th className="py-3 px-4 text-center w-64">Absensi Praktikum</th>
                    <th className="py-3 px-3 text-center w-36">
                      Nilai Proses {LAB_DEFINITIONS[selectedLab].shortName}
                    </th>
                    <th className="py-3 px-3 text-center w-36">
                      Nilai Laporan {LAB_DEFINITIONS[selectedLab].shortName}
                    </th>
                    <th className="py-3 px-3 text-center w-28">Nilai Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        Belum ada data siswa untuk kelas ini.
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((st, idx) => {
                      const entry = currentDraft.scores[st.id] || {
                        status: 'Hadir',
                        nilai_kinerja: 85,
                        nilai_laporan: 85,
                      };
                      const akhir = Math.round((entry.nilai_kinerja + entry.nilai_laporan) / 2);

                      return (
                        <tr
                          key={st.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            entry.status !== 'Hadir' ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={
                                      st.status === 'pindah' || st.status === 'keluar'
                                        ? 'line-through text-slate-500'
                                        : ''
                                    }
                                  >
                                    {st.nama_siswa}
                                  </span>
                                  {st.status === 'pindah' && (
                                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      Pindah
                                    </span>
                                  )}
                                  {st.status === 'keluar' && (
                                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                      Keluar
                                    </span>
                                  )}
                                  {isKepalaLab && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditStudent(st)}
                                      className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                                      title="Edit Identitas Siswa (Khusus Kepala Lab)"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-700" />
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    NISN: {st.nisn ? st.nisn : `SIS-${String(st.id).padStart(3, '0')}`}
                                  </span>
                                  {st.status_keterangan && (
                                    <span className="text-[9.5px] text-amber-700 italic truncate max-w-xs" title={st.status_keterangan}>
                                      ({st.status_keterangan})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {/* Attendance Radio Button Group */}
                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                              {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as StudentAttendanceStatus[]).map(
                                (stat) => (
                                  <label
                                    key={stat}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 ${
                                      !hasWriteAccess ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'
                                    } ${
                                      entry.status === stat
                                        ? stat === 'Hadir'
                                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                          : stat === 'Izin'
                                          ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                                          : stat === 'Sakit'
                                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                          : 'bg-red-600 text-white border-red-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      disabled={!hasWriteAccess}
                                      name={`status-${st.id}-${selectedLab}`}
                                      checked={entry.status === stat}
                                      onChange={() =>
                                        hasWriteAccess && handleScoreChange(st.id, 'status', stat)
                                      }
                                      className="hidden"
                                    />
                                    <span>{stat}</span>
                                  </label>
                                )
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              readOnly={!hasWriteAccess}
                              disabled={!hasWriteAccess}
                              value={entry.nilai_kinerja}
                              onChange={(e) =>
                                hasWriteAccess &&
                                handleScoreChange(st.id, 'nilai_kinerja', e.target.value)
                              }
                              className={`w-20 px-2 py-1.5 text-center font-mono font-bold rounded-lg text-xs outline-none ${
                                !hasWriteAccess
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                                  : 'bg-slate-50 text-slate-900 border border-slate-300 focus:bg-white focus:border-emerald-600'
                              }`}
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              readOnly={!hasWriteAccess}
                              disabled={!hasWriteAccess}
                              value={entry.nilai_laporan}
                              onChange={(e) =>
                                hasWriteAccess &&
                                handleScoreChange(st.id, 'nilai_laporan', e.target.value)
                              }
                              className={`w-20 px-2 py-1.5 text-center font-mono font-bold rounded-lg text-xs outline-none ${
                                !hasWriteAccess
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                                  : 'bg-slate-50 text-slate-900 border border-slate-300 focus:bg-white focus:border-emerald-600'
                              }`}
                            />
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-extrabold text-sm text-slate-900 bg-slate-50/50">
                            {akhir}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Table Footer: Rata-Rata Kelas Khusus Mapel */}
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={3} className="py-3 px-4 text-right tracking-wider uppercase">
                      RATA-RATA KELAS ({LAB_DEFINITIONS[selectedLab].shortName}):
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-800 text-sm">
                      {sessionStats.avgKinerja}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-800 text-sm">
                      {sessionStats.avgLaporan}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-900 text-sm bg-emerald-100/60">
                      {sessionStats.avgAkhir}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Actions Bar (ATURAN 3 & ACL: SINKRONISASI BERITA ACARA PDF) */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 text-center sm:text-left">
                Dokumen Berita Acara murni mengunci modul <strong>{LAB_DEFINITIONS[selectedLab].name}</strong>,
                Kepala Lab (Ilham Nurkholis Majid, S. Pd., Gr. - NIP: 2025.14.02.03), dan Kepala Sekolah (Narendra
                Ichiputra Hariyanto, S. Si., S. Pd., M. Biomed. - NIP: 0925.0214.01).
                {!hasWriteAccess && (
                  <span className="block text-amber-800 font-semibold mt-1">
                    * Akses Read-Only: Formulir dan penyimpanan dinonaktifkan karena Anda bukan pengampu modul ini. Anda tetap dapat mencetak dokumen Berita Acara PDF resmi.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {currentDraft.activeActivityId !== null && hasWriteAccess && (
                  <button
                    type="button"
                    onClick={() => {
                      const activeRec = labActivities.find((a) => a.id === currentDraft.activeActivityId);
                      if (activeRec) setActivityToDelete(activeRec);
                    }}
                    className="flex-1 sm:flex-initial min-h-[46px] px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Hapus Sesi Praktikum Ini dari Database"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Hapus Sesi</span>
                  </button>
                )}
                {hasWriteAccess && (
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    className="flex-1 sm:flex-initial min-h-[46px] px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan ke Jurnal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="flex-1 sm:flex-initial min-h-[46px] px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Berita Acara (PDF)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Tabel Riwayat Jurnal Terisolasi Khusus Mapel Terpilih (ATURAN 1) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Riwayat Jurnal Praktikum Khusus Laboratorium {LAB_DEFINITIONS[selectedLab].shortName} ({activitiesForCurrentLab.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Terisolasi
                </span>
                {isKepalaLab && (
                  <button
                    type="button"
                    onClick={handleTriggerResetCluster}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    title={`Reset Klaster ${LAB_DEFINITIONS[selectedLab].shortName} untuk ${currentClass.nama_kelas}`}
                  >
                    <RotateCcw className="w-3 h-3 text-amber-700" />
                    <span>Reset Klaster ({classActivitiesForCurrentLab.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {activitiesForCurrentLab.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada rekaman jurnal praktikum untuk laboratorium {LAB_DEFINITIONS[selectedLab].name}.
                </div>
              ) : (
                activitiesForCurrentLab.map((rec) => {
                  const matchedClass = classes.find((c) => matchId(c.id, rec.kelas_id));
                  const parsedScores = safeParseScores(rec.rekap_nilai_json);

                  const avgScore =
                    parsedScores.length > 0
                      ? (
                          parsedScores.reduce((acc, s) => acc + (s.nilai_akhir || 0), 0) /
                          parsedScores.length
                        ).toFixed(1)
                      : '-';

                  return (
                    <div
                      key={rec.id}
                      id={`activity-row-${rec.id}`}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              LAB_DEFINITIONS[rec.laboratorium]?.badgeBg ||
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {LAB_DEFINITIONS[rec.laboratorium]?.shortName}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {matchedClass?.nama_kelas || `Kelas #${rec.kelas_id}`}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500 font-mono">
                            {rec.tanggal_kegiatan}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {rec.judul_percobaan}
                        </h4>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                          <span>Materi: {rec.materi_pokok || '-'}</span>
                          <span className="text-slate-300">·</span>
                          <span>Guru: {rec.nama_guru}</span>
                          <span className="text-slate-300">·</span>
                          <span>
                            Kehadiran: <strong>{rec.jumlah_hadir}</strong> Hadir (
                            {rec.jumlah_absen} Absen)
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            Rata-Rata Nilai: <strong>{avgScore}</strong>
                          </span>
                        </div>
                        {rec.catatan_kejadian && (
                          <p className="text-[11px] text-slate-600 bg-slate-100 p-2 rounded-lg italic">
                            Catatan: &ldquo;{rec.catatan_kejadian}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadActivityIntoForm(rec)}
                          className="min-h-[38px] px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>{canEditLab(rec.laboratorium) ? 'Buka di Form' : 'Tinjau Data (Read-Only)'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintPastActivity(rec)}
                          className="min-h-[38px] px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Berita Acara (PDF)</span>
                        </button>
                        {canEditLab(rec.laboratorium) ? (
                          <button
                            type="button"
                            onClick={() => setActivityToDelete(rec)}
                            className="min-h-[38px] p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                            title="Hapus Jurnal Praktikum Ini"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="min-h-[38px] p-2 bg-slate-50 text-slate-300 rounded-xl border border-slate-200 cursor-not-allowed opacity-60"
                            title="Akses khusus pengampu lab / Kepala Lab"
                          >
                            <Lock className="w-4 h-4 text-slate-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: RIWAYAT BERITA ACARA KHUSUS MAPEL TERPILIH (ATURAN 1) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Header & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder={`Cari jurnal ${LAB_DEFINITIONS[selectedLab].shortName}...`}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-600">Ruang Kerja Aktif:</span>
              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900">
                {LAB_DEFINITIONS[selectedLab].name}
              </span>
              {isKepalaLab && (
                <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                  <button
                    type="button"
                    onClick={handleTriggerResetCluster}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    title={`Reset klaster ${LAB_DEFINITIONS[selectedLab].shortName} pada kelas ${currentClass.nama_kelas}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Reset Klaster ({classActivitiesForCurrentLab.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTriggerWipeOutAll}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Hapus total seluruh riwayat praktikum global"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-700" />
                    <span>Wipe Out All</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Records List (Only selected lab) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>
                Menampilkan daftar jurnal praktikum khusus{' '}
                <strong className="text-slate-900">{LAB_DEFINITIONS[selectedLab].name}</strong>
              </span>
              <span className="font-mono text-emerald-800 font-bold">
                {filteredLabHistory.length} Berita Acara Terverifikasi
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredLabHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Tidak ditemukan jurnal praktikum untuk laboratorium {LAB_DEFINITIONS[selectedLab].name}.
                </div>
              ) : (
                filteredLabHistory.map((rec) => {
                  const matchedClass = classes.find((c) => matchId(c.id, rec.kelas_id));
                  const parsedScores = safeParseScores(rec.rekap_nilai_json);

                  const avgScore =
                    parsedScores.length > 0
                      ? (
                          parsedScores.reduce((acc, s) => acc + (s.nilai_akhir || 0), 0) /
                          parsedScores.length
                        ).toFixed(1)
                      : '-';

                  return (
                    <div
                      key={rec.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              LAB_DEFINITIONS[rec.laboratorium]?.badgeBg ||
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {LAB_DEFINITIONS[rec.laboratorium]?.shortName}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {matchedClass?.nama_kelas || `Kelas #${rec.kelas_id}`}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500 font-mono">
                            {rec.tanggal_kegiatan}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {rec.judul_percobaan}
                        </h4>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                          <span>Materi: {rec.materi_pokok || '-'}</span>
                          <span className="text-slate-300">·</span>
                          <span>Guru: {rec.nama_guru}</span>
                          <span className="text-slate-300">·</span>
                          <span>
                            Kehadiran: <strong>{rec.jumlah_hadir}</strong> Hadir (
                            {rec.jumlah_absen} Absen)
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            Rata-Rata Nilai: <strong>{avgScore}</strong>
                          </span>
                        </div>
                        {rec.catatan_kejadian && (
                          <p className="text-[11px] text-slate-600 bg-slate-100 p-2 rounded-lg italic">
                            Catatan: &ldquo;{rec.catatan_kejadian}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadActivityIntoForm(rec)}
                          className="min-h-[40px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>{canEditLab(rec.laboratorium) ? 'Buka di Form' : 'Tinjau Data (Read-Only)'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintPastActivity(rec)}
                          className="min-h-[40px] px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Berita Acara (PDF)</span>
                        </button>
                        {canEditLab(rec.laboratorium) ? (
                          <button
                            type="button"
                            onClick={() => setActivityToDelete(rec)}
                            className="min-h-[40px] p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                            title="Hapus Jurnal Praktikum Ini"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="min-h-[40px] p-2 bg-slate-50 text-slate-300 rounded-xl border border-slate-200 cursor-not-allowed opacity-60"
                            title="Akses khusus pengampu lab / Kepala Lab"
                          >
                            <Lock className="w-4 h-4 text-slate-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: TIMELINE INTERAKTIF FREKUENSI PEMAKAIAN LAB (D3.JS DENGAN ZOOM & PAN) */}
      {activeTab === 'timeline' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <LabTimelineD3
            activities={labActivities}
            selectedLab={selectedLab}
            onSelectLab={setSelectedLab}
            onSelectActivity={(rec) => {
              handleLoadActivityIntoForm(rec);
              setActiveTab('entry');
              showToast({
                type: 'info',
                title: 'Sesi Praktikum Terpilih',
                message: `Memuat sesi "${rec.judul_percobaan}" (${LAB_DEFINITIONS[rec.laboratorium]?.shortName}) ke formulir jurnal.`,
              });
            }}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: TAMBAH KELAS / ROMBEL BARU (KHUSUS KEPALA LAB)  */}
      {/* ======================================================== */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Tambah Rombongan Belajar (Kelas) Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Nama Kelas / Rombel *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas X MIPA 3, Kelas VII-B SMP"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  placeholder="2025/2026"
                  value={newClassYear}
                  onChange={(e) => setNewClassYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Kelas Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: KELOLA & IMPORT SISWA (MANUAL & EXCEL)           */}
      {/* ======================================================== */}
      {isManageStudentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Kelola Daftar Siswa: {currentClass.nama_kelas}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tahun Ajaran {currentClass.tahun_ajaran} · Total {classStudents.length} siswa terdaftar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageStudentsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setManageStudentsTab('manual')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  manageStudentsTab === 'manual'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Input Manual &amp; Daftar Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => setManageStudentsTab('excel')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  manageStudentsTab === 'excel'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Import Siswa (Excel / XLSX)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {manageStudentsTab === 'manual' ? (
                <div className="space-y-5">
                  {/* Form Tambah Siswa Manual */}
                  <form
                    onSubmit={handleAddStudentManual}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Tambah Siswa Satu per Satu</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Nama Lengkap Siswa *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nama lengkap siswa..."
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:border-emerald-600 shadow-2xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Nomor NISN (Opsional)
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: 0081234567"
                          value={newStudentNisn}
                          onChange={(e) => setNewStudentNisn(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-emerald-600 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambahkan Siswa</span>
                      </button>
                    </div>
                  </form>

                  {/* Daftar Siswa yang sudah terdaftar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Daftar Siswa di {currentClass.nama_kelas} ({classStudents.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Gunakan tombol edit di tabel utama untuk mengubah identitas
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {classStudents.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          Belum ada siswa yang didaftarkan pada kelas ini.
                        </div>
                      ) : (
                        classStudents.map((st, idx) => (
                          <div
                            key={st.id}
                            className="p-2.5 px-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-slate-400 w-5 text-center">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-semibold text-slate-900">
                                  {st.nama_siswa}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 ml-2">
                                  NISN: {st.nisn || `SIS-${String(st.id).padStart(3, '0')}`}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isKepalaLab ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStudent(st)}
                                    className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                    title="Edit Identitas Siswa (Khusus Kepala Lab)"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const res = deleteLabStudent(st.id);
                                      if (res.success) {
                                        showToast({
                                          type: 'success',
                                          title: 'Siswa Dihapus',
                                          message: `Siswa "${st.nama_siswa}" telah dihapus dari kelas.`,
                                        });
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                    title="Hapus Siswa dari Kelas (Khusus Kepala Lab)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                                  title="Akses Khusus Admin (Kepala Lab): Akun selain Admin tidak dapat mengakses fitur hapus siswa"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>Read-Only</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Danger Zone: Pembersihan Riwayat Praktikum Khusus Kepala Lab */}
                  {isKepalaLab && (
                    <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-3 text-red-950">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-bold text-red-900">
                            Pembersihan Riwayat Praktikum (Khusus KEPALA_LAB)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-red-200 text-red-900 border border-red-300">
                          Akses Terbatas
                        </span>
                      </div>
                      <p className="text-[11px] text-red-800 leading-relaxed">
                        Hapus riwayat praktikum khusus kelas <strong>{currentClass.nama_kelas}</strong> pada laboratorium <strong>{LAB_DEFINITIONS[selectedLab].shortName}</strong>, atau kosongkan seluruh data praktikum secara global di semua laboratorium.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleTriggerResetCluster}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                          title={`Hapus riwayat praktikum ${LAB_DEFINITIONS[selectedLab].shortName} pada kelas ${currentClass.nama_kelas}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Klaster ({classActivitiesForCurrentLab.length} Jurnal)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleTriggerWipeOutAll}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                          title="Hapus total seluruh riwayat praktikum secara global"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Wipe Out All ({labActivities.length} Jurnal)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: IMPORT EXCEL (XLSX) */
                <div className="space-y-4">
                  <div className="p-4 bg-sky-50/80 border border-sky-200 rounded-xl space-y-2 text-sky-950 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold flex items-center gap-1.5 text-sky-900">
                        <FileSpreadsheet className="w-4 h-4 text-sky-700" />
                        <span>Petunjuk Import Siswa Otomatis (Excel)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-900 border border-sky-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <FileDown className="w-3.5 h-3.5 text-sky-700" />
                        <span>Unduh Format Template</span>
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-sky-800">
                      Sistem akan otomatis membaca file Excel (<strong>.xlsx</strong> / <strong>.xls</strong> / <strong>.csv</strong>)
                      dan memetakan kolom bernama <strong>&quot;Nama&quot;</strong> (atau &quot;Nama Siswa&quot;) dan{' '}
                      <strong>&quot;NISN&quot;</strong> (atau &quot;NIS&quot;) menjadi data siswa di kelas <strong>{currentClass.nama_kelas}</strong>.
                    </p>
                  </div>

                  {/* Upload Box */}
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-2xl p-6 text-center transition-all bg-slate-50/60 flex flex-col items-center justify-center gap-2 relative">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200">
                      <Upload className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {excelFileName ? (
                        <span className="text-emerald-800 font-mono">{excelFileName}</span>
                      ) : (
                        <span>Pilih atau seret file Excel ke sini</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Mendukung format .xlsx, .xls, dan .csv
                    </p>
                  </div>

                  {/* Error Notification */}
                  {excelErrorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{excelErrorMsg}</span>
                    </div>
                  )}

                  {/* Parsed Preview Table */}
                  {excelParsedStudents.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            Terdeteksi {excelParsedStudents.length} siswa siap di-import:
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Pratinjau data (maks. 5 baris pertama):
                        </span>
                      </div>

                      <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/30">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-emerald-100/70 text-emerald-950 font-bold border-b border-emerald-200 text-[11px]">
                              <th className="py-2 px-3 w-10 text-center">No</th>
                              <th className="py-2 px-3">Nama Lengkap Siswa</th>
                              <th className="py-2 px-3">NISN</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-100 text-slate-800">
                            {excelParsedStudents.slice(0, 5).map((row, i) => (
                              <tr key={i} className="hover:bg-emerald-50/50">
                                <td className="py-1.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                                  {i + 1}
                                </td>
                                <td className="py-1.5 px-3 font-semibold">{row.nama_siswa}</td>
                                <td className="py-1.5 px-3 font-mono text-slate-600">
                                  {row.nisn || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {excelParsedStudents.length > 5 && (
                          <div className="p-2 text-center text-[10px] text-slate-500 italic bg-white/60 border-t border-emerald-100">
                            ... dan {excelParsedStudents.length - 5} siswa lainnya
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleCommitExcelImport}
                        className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>
                          Simpan &amp; Import {excelParsedStudents.length} Siswa ke {currentClass.nama_kelas}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {isKepalaLab ? (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Otoritas Kepala Lab:
                  </span>
                  <button
                    type="button"
                    onClick={handleTriggerResetCluster}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    title={`Hapus riwayat praktikum ${LAB_DEFINITIONS[selectedLab].shortName} pada kelas ${currentClass.nama_kelas}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Reset Klaster ({classActivitiesForCurrentLab.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTriggerWipeOutAll}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    title="Hapus seluruh riwayat praktikum global di semua laboratorium"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-700" />
                    <span>Wipe Out All ({labActivities.length})</span>
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsManageStudentsModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDIT IDENTITAS SISWA MANUAL (KHUSUS KEPALA LAB) */}
      {/* ======================================================== */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Ubah Identitas Siswa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs sm:text-sm font-semibold outline-none transition-all shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Nomor NISN
                </label>
                <input
                  type="text"
                  value={editStudentNisn}
                  onChange={(e) => setEditStudentNisn(e.target.value)}
                  placeholder="Contoh: 0081234567"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs sm:text-sm font-mono outline-none transition-all shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: KONFIRMASI RESET KLASTER / WIPE OUT ALL         */}
      {/* ======================================================== */}
      {confirmResetModal && confirmResetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {confirmResetModal.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {confirmResetModal.message}
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-900">
              {confirmResetModal.targetCount} Data Rekaman Jurnal Akan Dihapus Bersih
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetModal(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedReset}
                className="px-5 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {confirmResetModal.type === 'cluster'
                    ? 'Ya, Reset Klaster Ini'
                    : 'Ya, Wipe Out Seluruh Database'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: KONFIRMASI HAPUS REKAM JURNAL PRAKTIKUM         */}
      {/* ======================================================== */}
      {activityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start gap-4 bg-rose-50/50">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Jurnal Praktikum?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Apakah Anda yakin ingin menghapus rekam jurnal praktikum ini dari database?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">ID #{activityToDelete.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    {LAB_DEFINITIONS[activityToDelete.laboratorium]?.shortName || activityToDelete.laboratorium}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm leading-snug">
                  {activityToDelete.judul_percobaan}
                </div>
                <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-2 pt-1">
                  <span>Tanggal: <strong>{activityToDelete.tanggal_kegiatan}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>Guru: <strong>{activityToDelete.nama_guru}</strong></span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Penghapusan ini akan menghapus riwayat presensi dan nilai praktikum sesi ini secara sinkron dan permanen dari localStorage.
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteActivity}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Jurnal Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
