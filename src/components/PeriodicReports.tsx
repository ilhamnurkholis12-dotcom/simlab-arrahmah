import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useInventory } from '../context/InventoryContext';
import {
  InventoryItem,
  LAB_DEFINITIONS,
  LabId,
  LabActivityRecord,
  StudentScoreEntry,
} from '../types/inventory';
import { EditKopModal } from './EditKopModal';
import {
  getOfficialLabPJ,
  getOfficialKepalaLab,
  getOfficialKepalaSekolah,
} from '../utils/helpers';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FileText,
  SlidersHorizontal,
  Loader2,
  BookOpen,
  Boxes,
  Users,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const PeriodicReports: React.FC = () => {
  const {
    items,
    transactions,
    currentUser,
    settings,
    kopConfig,
    showToast,
    labActivities,
    classes,
  } = useInventory();

  const [isEditKopOpen, setIsEditKopOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Active Report Category Switcher: Inventaris Stok vs Jurnal Praktikum Guru
  const [activeReportCategory, setActiveReportCategory] = useState<
    'INVENTORY' | 'PRACTICUM_JOURNAL'
  >('INVENTORY');

  // ==========================================
  // INVENTORY REPORT FILTERS & STATE
  // ==========================================
  const [reportType, setReportType] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [selectedMonth, setSelectedMonth] = useState<number>(3); // 1 = Januari, 3 = Maret
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [reportLabFilter, setReportLabFilter] = useState<LabId | 'ALL'>('ALL');

  // ==========================================
  // PRACTICUM JOURNAL FILTERS & STATE
  // ==========================================
  const [journalPeriodType, setJournalPeriodType] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [journalMonth, setJournalMonth] = useState<number>(3);
  const [journalLabFilter, setJournalLabFilter] = useState<LabId | 'ALL'>('ALL');
  const [journalClassFilter, setJournalClassFilter] = useState<number | 'ALL'>('ALL');

  // Resolusi 3 TTD Pengesahan Resmi (Disesuaikan per Lab & Kepala Sekolah Narendra)
  const currentEffectiveLab =
    activeReportCategory === 'INVENTORY' ? reportLabFilter : journalLabFilter;

  const officialSigners = useMemo(() => {
    const pj = getOfficialLabPJ(currentEffectiveLab, {
      pjNama: kopConfig.pjNama,
      pjNip: kopConfig.pjNip,
      pjTitle: kopConfig.pjTitle,
      pjInstansi: kopConfig.pjInstansi,
    });
    const kepalaLab = getOfficialKepalaLab(kopConfig.kepalaLabNama, kopConfig.kepalaLabNip);
    const kepalaSekolah = getOfficialKepalaSekolah(
      kopConfig.kepalaSekolahNama,
      kopConfig.kepalaSekolahNip
    );
    return { pj, kepalaLab, kepalaSekolah };
  }, [currentEffectiveLab, kopConfig]);

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

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
      setTimeout(() => resolve(null), 3500); // 3.5s safety timeout
      img.src = url;
    });
  };

  // ==========================================
  // INVENTORY PERIOD DATA COMPUTATION
  // ==========================================
  const periodData = useMemo(() => {
    let startPrefix = '';
    let endPrefix = '';
    let periodTitle = '';

    if (reportType === 'MONTHLY') {
      const monthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
      startPrefix = `${selectedYear}-${monthStr}-01`;
      endPrefix = `${selectedYear}-${monthStr}-31`;
      periodTitle = `Bulan ${monthNames[selectedMonth - 1]} ${selectedYear}`;
    } else {
      startPrefix = `${selectedYear}-01-01`;
      endPrefix = `${selectedYear}-12-31`;
      periodTitle = `Tahun Ajaran 2025/2026 (Tahunan)`;
    }

    const relevantTransactions = transactions.filter((tx) => {
      const isDateInRange = tx.date >= startPrefix && tx.date <= endPrefix;
      if (!isDateInRange) return false;

      if (reportLabFilter !== 'ALL') {
        if (tx.targetLab !== reportLabFilter && tx.fromLab !== reportLabFilter) {
          return false;
        }
      }
      return true;
    });

    let periodTotalIn = 0;
    let periodTotalOut = 0;

    const itemPeriodMap: Record<string, { inQty: number; outQty: number }> = {};
    relevantTransactions.forEach((tx) => {
      if (!itemPeriodMap[tx.itemId]) {
        itemPeriodMap[tx.itemId] = { inQty: 0, outQty: 0 };
      }
      if (tx.type === 'IN') {
        itemPeriodMap[tx.itemId].inQty += tx.quantity;
        periodTotalIn += tx.quantity;
      } else if (tx.type === 'OUT') {
        itemPeriodMap[tx.itemId].outQty += tx.quantity;
        periodTotalOut += tx.quantity;
      }
    });

    const targetItems = items.filter((item) => {
      if (reportLabFilter === 'ALL') return true;
      return item.primaryLab === reportLabFilter || (item.distribution[reportLabFilter] || 0) > 0;
    });

    const reportRows = targetItems.map((item) => {
      const periodIn = itemPeriodMap[item.id]?.inQty || 0;
      const periodOut = itemPeriodMap[item.id]?.outQty || 0;
      const labStock =
        reportLabFilter === 'ALL'
          ? item.currentTotalStock
          : item.distribution[reportLabFilter] || 0;

      return {
        item,
        periodIn,
        periodOut,
        labStock,
      };
    });

    const grandPhysicalUnits = reportRows.reduce((acc, r) => acc + r.labStock, 0);
    const goodConditionCount = reportRows.reduce((acc, r) => acc + r.item.conditionGood, 0);
    const damageCount = reportRows.reduce(
      (acc, r) => acc + r.item.conditionLightDamage + r.item.conditionHeavyDamage,
      0
    );

    return {
      periodTitle,
      reportRows,
      periodTotalIn,
      periodTotalOut,
      netChange: periodTotalIn - periodTotalOut,
      grandPhysicalUnits,
      goodConditionCount,
      damageCount,
      totalCatalogCount: reportRows.length,
      generatedDate: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
  }, [items, transactions, reportType, selectedMonth, selectedYear, reportLabFilter]);

  // ==========================================
  // PRACTICUM JOURNAL DATA COMPUTATION
  // ==========================================
  const journalData = useMemo(() => {
    let startPrefix = '';
    let endPrefix = '';
    let periodTitle = '';

    if (journalPeriodType === 'MONTHLY') {
      const monthStr = journalMonth < 10 ? `0${journalMonth}` : `${journalMonth}`;
      startPrefix = `2026-${monthStr}-01`;
      endPrefix = `2026-${monthStr}-31`;
      periodTitle = `Bulan ${monthNames[journalMonth - 1]} 2026`;
    } else {
      startPrefix = '2026-01-01';
      endPrefix = '2026-12-31';
      periodTitle = `Tahun Ajaran 2025/2026 (Semester Genap)`;
    }

    // Filter activities by date, lab, and class
    const filteredActivities = labActivities
      .filter((act) => {
        const isDateInRange =
          act.tanggal_kegiatan >= startPrefix && act.tanggal_kegiatan <= endPrefix;
        if (!isDateInRange) return false;

        if (journalLabFilter !== 'ALL' && act.laboratorium !== journalLabFilter) {
          return false;
        }

        if (journalClassFilter !== 'ALL' && act.kelas_id !== Number(journalClassFilter)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.tanggal_kegiatan.localeCompare(b.tanggal_kegiatan));

    let totalSessions = filteredActivities.length;
    let totalHadirSum = 0;
    let totalAbsenSum = 0;
    let grandKinerjaSum = 0;
    let grandLaporanSum = 0;
    let grandAkhirSum = 0;
    let studentGradedCount = 0;

    const sessionRows = filteredActivities.map((act) => {
      const matchedClass = classes.find((c) => c.id === act.kelas_id);
      let entries: StudentScoreEntry[] = [];
      try {
        entries = JSON.parse(act.rekap_nilai_json);
      } catch {
        entries = [];
      }

      let sessionHadir = 0;
      let sessionAbsen = 0;
      let sumKinerja = 0;
      let sumLaporan = 0;
      let sumAkhir = 0;

      if (Array.isArray(entries) && entries.length > 0) {
        entries.forEach((e) => {
          if (e.status === 'Hadir') sessionHadir++;
          else sessionAbsen++;

          sumKinerja += e.nilai_kinerja || 0;
          sumLaporan += e.nilai_laporan || 0;
          sumAkhir += e.nilai_akhir || 0;
        });

        studentGradedCount += entries.length;
        grandKinerjaSum += sumKinerja;
        grandLaporanSum += sumLaporan;
        grandAkhirSum += sumAkhir;
      } else {
        sessionHadir = act.jumlah_hadir || 0;
        sessionAbsen = act.jumlah_absen || 0;
      }

      totalHadirSum += sessionHadir;
      totalAbsenSum += sessionAbsen;

      const avgKinerja =
        entries.length > 0 ? Number((sumKinerja / entries.length).toFixed(1)) : 85.0;
      const avgLaporan =
        entries.length > 0 ? Number((sumLaporan / entries.length).toFixed(1)) : 85.0;
      const avgAkhir =
        entries.length > 0 ? Number((sumAkhir / entries.length).toFixed(1)) : 85.0;

      return {
        activity: act,
        className: matchedClass?.nama_kelas || `Kelas #${act.kelas_id}`,
        classYear: matchedClass?.tahun_ajaran || '2025/2026',
        hadir: sessionHadir,
        absen: sessionAbsen,
        totalSiswa: sessionHadir + sessionAbsen,
        avgKinerja,
        avgLaporan,
        avgAkhir,
        guru: act.nama_guru || 'Guru Pengampu Lab',
        entriesCount: entries.length,
      };
    });

    const totalStudentsServed = totalHadirSum + totalAbsenSum;
    const overallAttendanceRate =
      totalStudentsServed > 0 ? Math.round((totalHadirSum / totalStudentsServed) * 100) : 100;

    const overallAvgKinerja =
      studentGradedCount > 0
        ? Number((grandKinerjaSum / studentGradedCount).toFixed(1))
        : sessionRows.length > 0
        ? Number(
            (sessionRows.reduce((a, b) => a + b.avgKinerja, 0) / sessionRows.length).toFixed(1)
          )
        : 0;

    const overallAvgLaporan =
      studentGradedCount > 0
        ? Number((grandLaporanSum / studentGradedCount).toFixed(1))
        : sessionRows.length > 0
        ? Number(
            (sessionRows.reduce((a, b) => a + b.avgLaporan, 0) / sessionRows.length).toFixed(1)
          )
        : 0;

    const overallAvgAkhir =
      studentGradedCount > 0
        ? Number((grandAkhirSum / studentGradedCount).toFixed(1))
        : sessionRows.length > 0
        ? Number((sessionRows.reduce((a, b) => a + b.avgAkhir, 0) / sessionRows.length).toFixed(1))
        : 0;

    const selectedClassName =
      journalClassFilter === 'ALL'
        ? 'Seluruh Rombel (SMP & SMA)'
        : classes.find((c) => c.id === Number(journalClassFilter))?.nama_kelas || 'Kelas Terpilih';

    const selectedLabName =
      journalLabFilter === 'ALL'
        ? 'Seluruh Laboratorium IPA Terpadu'
        : LAB_DEFINITIONS[journalLabFilter].name;

    return {
      periodTitle,
      sessionRows,
      totalSessions,
      totalHadirSum,
      totalAbsenSum,
      totalStudentsServed,
      overallAttendanceRate,
      overallAvgKinerja,
      overallAvgLaporan,
      overallAvgAkhir,
      selectedClassName,
      selectedLabName,
      generatedDate: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
  }, [labActivities, classes, journalPeriodType, journalMonth, journalLabFilter, journalClassFilter]);

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // ==========================================
  // INVENTORY CSV EXPORT
  // ==========================================
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Kode Barang',
      'Nama Barang',
      'Kategori',
      'Laboratorium',
      'Satuan',
      'Stok Masuk Periode',
      'Stok Keluar Periode',
      'Total Stok Terkini',
      'Batas Minimum',
      'Kondisi Baik',
      'Kondisi Rusak',
      'Lokasi Penyimpanan',
    ];

    const rows = periodData.reportRows.map((r, i) => [
      i + 1,
      `"${r.item.code}"`,
      `"${r.item.name}"`,
      `"${r.item.category}"`,
      `"${r.item.primaryLab}"`,
      `"${r.item.unit}"`,
      r.periodIn,
      r.periodOut,
      r.labStock,
      r.item.minStockAlert,
      r.item.conditionGood,
      r.item.conditionLightDamage + r.item.conditionHeavyDamage,
      `"${r.item.storageRack}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_Stok_Lab_IPA_${reportType}_${selectedYear}_${
        reportType === 'MONTHLY' ? selectedMonth : 'Tahunan'
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // PRACTICUM JOURNAL CSV EXPORT
  // ==========================================
  const handleExportJournalCSV = () => {
    const headers = [
      'No',
      'Tanggal Kegiatan',
      'Laboratorium / Mapel',
      'Kelas / Rombel',
      'Judul Percobaan',
      'Materi Pokok',
      'Guru Pengampu',
      'Jumlah Hadir',
      'Jumlah Absen',
      'Rata-rata Nilai Kinerja',
      'Rata-rata Nilai Laporan',
      'Nilai Akhir Rata-rata',
      'Catatan Kejadian',
    ];

    const rows = journalData.sessionRows.map((r, i) => [
      i + 1,
      `"${r.activity.tanggal_kegiatan}"`,
      `"${LAB_DEFINITIONS[r.activity.laboratorium]?.shortName || r.activity.laboratorium}"`,
      `"${r.className}"`,
      `"${r.activity.judul_percobaan.replace(/"/g, '""')}"`,
      `"${(r.activity.materi_pokok || '-').replace(/"/g, '""')}"`,
      `"${r.guru}"`,
      r.hadir,
      r.absen,
      r.avgKinerja,
      r.avgLaporan,
      r.avgAkhir,
      `"${(r.activity.catatan_kejadian || '-').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Buku_Jurnal_Praktikum_${journalPeriodType}_${journalData.periodTitle.replace(
        /\s+/g,
        '_'
      )}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // 1. INVENTORY RECAP PDF GENERATION (jsPDF)
  // ==========================================
  const handleDownloadPDF = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. School Letterhead (Kop Surat) - Load Official Logo
      const logoSource =
        kopConfig.logoUrl || settings.logo_url || '/src/assets/images/arcss_logo_official.svg';
      const logoDataUrl = await loadLogoAsDataUrl(logoSource);

      if (logoDataUrl) {
        try {
          const format = logoDataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
          doc.addImage(logoDataUrl, format, 14, 9, 20, 20);
        } catch (err) {
          console.warn('Gagal menambahkan logo ke PDF:', err);
        }
      }

      // Document Code / Form Reference on Top Right
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(
        `FORM: LAB-ARC/${settings.tahun_ajaran || '2025/2026'}`,
        pageWidth - 14,
        13,
        { align: 'right' }
      );

      // School & Foundation Headers
      const yayasanText = (kopConfig.namaYayasan || 'YAYASAN BAYTU RAHMAH MADANIA').toUpperCase();
      const sekolahText = (
        kopConfig.namaSekolah ||
        settings.nama_sekolah ||
        'SMP dan SMA IT Ar-Rahmah Cendekia'
      ).toUpperCase();
      const unitText = (
        kopConfig.unitLaboratorium ||
        'Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia'
      ).toUpperCase();
      const alamatText =
        kopConfig.alamat ||
        'Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114';

      doc.setTextColor(6, 78, 59); // Deep Emerald
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(yayasanText, pageWidth / 2, 13, { align: 'center' });

      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFontSize(12.5);
      doc.text(sekolahText, pageWidth / 2, 18.5, { align: 'center' });

      doc.setTextColor(6, 78, 59);
      doc.setFontSize(10);
      doc.text(unitText, pageWidth / 2, 24, { align: 'center' });

      doc.setTextColor(100, 116, 139); // Slate 500
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(alamatText, pageWidth / 2, 29, { align: 'center' });

      // Double divider line matching official Indonesian school letterhead print styles
      doc.setDrawColor(6, 78, 59); // Primary Emerald Rule
      doc.setLineWidth(0.7);
      doc.line(14, 32.5, pageWidth - 14, 32.5);
      doc.setDrawColor(203, 213, 225); // Slate 300 Accent Rule
      doc.setLineWidth(0.3);
      doc.line(14, 33.6, pageWidth - 14, 33.6);

      // 2. Document Title & Period Metadata
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(
        'BERITA ACARA REKAPITULASI STOK INVENTARIS LABORATORIUM',
        pageWidth / 2,
        40,
        { align: 'center' }
      );

      const labName =
        reportLabFilter === 'ALL'
          ? 'Seluruh Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia'
          : LAB_DEFINITIONS[reportLabFilter].name;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Periode: ${periodData.periodTitle}   |   Cakupan: ${labName}   |   Tanggal Cetak: ${periodData.generatedDate}`,
        pageWidth / 2,
        45,
        { align: 'center' }
      );

      // 3. Executive Summary KPI Strip
      autoTable(doc, {
        startY: 48,
        theme: 'plain',
        styles: {
          fontSize: 7.5,
          cellPadding: 2.2,
          fillColor: [248, 250, 252],
          textColor: [30, 41, 59],
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          halign: 'center',
          valign: 'middle',
        },
        head: [
          [
            'TOTAL KATALOG SKU',
            'TOTAL FISIK UNIT',
            'MUTASI MASUK / KELUAR',
            'STATUS KELAIKAN FISIK',
            'STATUS VALIDASI',
          ],
        ],
        headStyles: {
          fontSize: 7,
          fontStyle: 'bold',
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          halign: 'center',
        },
        body: [
          [
            `${periodData.totalCatalogCount} Jenis Barang`,
            `${periodData.grandPhysicalUnits.toLocaleString('id-ID')} Total Unit`,
            `+${periodData.periodTotalIn} Masuk / -${periodData.periodTotalOut} Keluar`,
            `${periodData.goodConditionCount} Baik  |  ${periodData.damageCount} Rusak`,
            'Terverifikasi 100% Sesuai Fisik',
          ],
        ],
        margin: { left: 14, right: 14 },
      });

      // 4. Main Stock Opname Detail Table
      const tableData = periodData.reportRows.map((r, idx) => [
        idx + 1,
        r.item.code,
        `${r.item.name}\n${r.item.brandOrSpec || '-'}`,
        r.item.primaryLab === 'ALL'
          ? 'Semua'
          : LAB_DEFINITIONS[r.item.primaryLab]?.shortName || r.item.primaryLab,
        r.item.unit,
        r.periodIn > 0 ? `+${r.periodIn}` : '-',
        r.periodOut > 0 ? `-${r.periodOut}` : '-',
        r.labStock,
        r.item.minStockAlert,
        `Baik: ${r.item.conditionGood}${
          r.item.conditionLightDamage + r.item.conditionHeavyDamage > 0
            ? `\nRusak: ${r.item.conditionLightDamage + r.item.conditionHeavyDamage}`
            : ''
        }`,
        r.item.storageRack || '-',
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 3.5,
        head: [
          [
            'No',
            'Kode',
            'Nama Barang & Spesifikasi',
            'Lab Utama',
            'Satuan',
            'Masuk',
            'Keluar',
            'Stok Terkini',
            'Batas Min',
            'Kondisi Fisik',
            'Lokasi Rak',
          ],
        ],
        body: tableData,
        theme: 'grid',
        showHead: 'everyPage',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
          overflow: 'linebreak',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [6, 78, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 9 },
          1: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
          2: { cellWidth: 60 },
          3: { halign: 'center', cellWidth: 22 },
          4: { halign: 'center', cellWidth: 14 },
          5: { halign: 'right', cellWidth: 15, textColor: [16, 120, 60], fontStyle: 'bold' },
          6: { halign: 'right', cellWidth: 15, textColor: [180, 80, 20], fontStyle: 'bold' },
          7: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
          8: { halign: 'center', cellWidth: 18 },
          9: { cellWidth: 34 },
          10: { cellWidth: 38 },
        },
        foot: [
          [
            {
              content: 'TOTAL KESELURUHAN UNIT:',
              colSpan: 5,
              styles: { halign: 'right', fontStyle: 'bold' },
            },
            {
              content: `+${periodData.periodTotalIn}`,
              styles: { halign: 'right', fontStyle: 'bold', textColor: [16, 120, 60] },
            },
            {
              content: `-${periodData.periodTotalOut}`,
              styles: { halign: 'right', fontStyle: 'bold', textColor: [180, 80, 20] },
            },
            {
              content: `${periodData.grandPhysicalUnits} Unit`,
              styles: { halign: 'right', fontStyle: 'bold', fillColor: [226, 232, 240] },
            },
            {
              content: 'Status: 100% Terverifikasi Fisik',
              colSpan: 3,
              styles: { halign: 'center', fontStyle: 'italic' },
            },
          ],
        ],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
        },
        margin: { left: 14, right: 14 },
      });

      // 5. Official Signatures (3-Column Layout: PJ Lab, Kepala Lab, Kepala Sekolah)
      let finalY = (doc as any).lastAutoTable.finalY + 8;

      if (finalY + 42 > pageHeight - 12) {
        doc.addPage();
        finalY = 20;
      }

      const kotaPenetapan = kopConfig.kotaPenetapan?.trim() || 'Kota Tangerang';
      const tglPenetapan = kopConfig.tanggalPenetapan?.trim() || periodData.generatedDate;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Ditetapkan di: ${kotaPenetapan}, Tanggal: ${tglPenetapan}`,
        pageWidth - 14,
        finalY,
        { align: 'right' }
      );

      finalY += 6;
      const colWidth = (pageWidth - 28) / 3;
      const { pj: pjInfo, kepalaLab: kepalaLabInfo, kepalaSekolah: kepalaSekolahInfo } =
        officialSigners;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.text(pjInfo.jabatan, 14 + colWidth * 0.5, finalY, { align: 'center' });
      doc.text(kepalaLabInfo.jabatan, 14 + colWidth * 1.5, finalY, { align: 'center' });
      doc.text(kepalaSekolahInfo.jabatan, 14 + colWidth * 2.5, finalY, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(pjInfo.instansi, 14 + colWidth * 0.5, finalY + 4, { align: 'center' });
      doc.text(kepalaLabInfo.instansi, 14 + colWidth * 1.5, finalY + 4, { align: 'center' });
      doc.text(kepalaSekolahInfo.instansi, 14 + colWidth * 2.5, finalY + 4, { align: 'center' });

      const signY = finalY + 23;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(pjInfo.nama, 14 + colWidth * 0.5, signY, { align: 'center' });
      doc.text(kepalaLabInfo.nama, 14 + colWidth * 1.5, signY, { align: 'center' });
      doc.text(kepalaSekolahInfo.nama, 14 + colWidth * 2.5, signY, { align: 'center' });

      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.2);
      const nameWidths = [
        doc.getTextWidth(pjInfo.nama),
        doc.getTextWidth(kepalaLabInfo.nama),
        doc.getTextWidth(kepalaSekolahInfo.nama),
      ];
      doc.line(
        14 + colWidth * 0.5 - nameWidths[0] / 2,
        signY + 0.8,
        14 + colWidth * 0.5 + nameWidths[0] / 2,
        signY + 0.8
      );
      doc.line(
        14 + colWidth * 1.5 - nameWidths[1] / 2,
        signY + 0.8,
        14 + colWidth * 1.5 + nameWidths[1] / 2,
        signY + 0.8
      );
      doc.line(
        14 + colWidth * 2.5 - nameWidths[2] / 2,
        signY + 0.8,
        14 + colWidth * 2.5 + nameWidths[2] / 2,
        signY + 0.8
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(pjInfo.nip, 14 + colWidth * 0.5, signY + 4.5, { align: 'center' });
      doc.text(kepalaLabInfo.nip, 14 + colWidth * 1.5, signY + 4.5, { align: 'center' });
      doc.text(kepalaSekolahInfo.nip, 14 + colWidth * 2.5, signY + 4.5, { align: 'center' });

      // 6. Running Footer on all pages
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `SIMLAB IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia Kota Tangerang © 2026  ·  Halaman ${i} dari ${pageCount}  ·  Dokumen Resmi Terverifikasi`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
      }

      const filename = `Laporan_Stok_Lab_IPA_${reportType}_${selectedYear}_${
        reportType === 'MONTHLY' ? selectedMonth : 'Tahunan'
      }.pdf`;
      doc.save(filename);

      showToast({
        type: 'success',
        title: 'PDF Rekap Inventaris Berhasil Dibuat',
        message: `Dokumen "${filename}" berhasil digenerate dan diunduh.`,
      });
    } catch (err) {
      console.error('Gagal membuat dokumen PDF:', err);
      showToast({
        type: 'error',
        title: 'Gagal Mengunduh PDF',
        message: 'Terjadi kesalahan saat memproses dokumen PDF.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ==========================================
  // 2. PRACTICUM JOURNAL PDF GENERATION (jsPDF)
  // ==========================================
  const handleDownloadPracticumJournalPDF = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. School Letterhead (Kop Surat Resmi)
      const logoSource =
        kopConfig.logoUrl || settings.logo_url || '/src/assets/images/arcss_logo_official.svg';
      const logoDataUrl = await loadLogoAsDataUrl(logoSource);

      if (logoDataUrl) {
        try {
          const format = logoDataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
          doc.addImage(logoDataUrl, format, 14, 9, 20, 20);
        } catch (err) {
          console.warn('Gagal menambahkan logo ke PDF:', err);
        }
      }

      // Document Code / Form Reference on Top Right
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `FORM: JRNL-ARC/${settings.tahun_ajaran || '2025/2026'}`,
        pageWidth - 14,
        13,
        { align: 'right' }
      );

      // School & Foundation Headers
      const yayasanText = (kopConfig.namaYayasan || 'YAYASAN BAYTU RAHMAH MADANIA').toUpperCase();
      const sekolahText = (
        kopConfig.namaSekolah ||
        settings.nama_sekolah ||
        'SMP dan SMA IT Ar-Rahmah Cendekia'
      ).toUpperCase();
      const unitText = (
        kopConfig.unitLaboratorium ||
        'Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia'
      ).toUpperCase();
      const alamatText =
        kopConfig.alamat ||
        'Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114';

      doc.setTextColor(6, 78, 59); // Emerald
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(yayasanText, pageWidth / 2, 13, { align: 'center' });

      doc.setTextColor(15, 23, 42); // Slate 900
      doc.setFontSize(12.5);
      doc.text(sekolahText, pageWidth / 2, 18.5, { align: 'center' });

      doc.setTextColor(6, 78, 59);
      doc.setFontSize(10);
      doc.text(unitText, pageWidth / 2, 24, { align: 'center' });

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(alamatText, pageWidth / 2, 29, { align: 'center' });

      // Double divider line
      doc.setDrawColor(6, 78, 59);
      doc.setLineWidth(0.7);
      doc.line(14, 32.5, pageWidth - 14, 32.5);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(14, 33.6, pageWidth - 14, 33.6);

      // 2. Document Title & Period Metadata
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(
        'BUKU REKAPITULASI JURNAL & AGENDA KEGIATAN PRAKTIKUM LABORATORIUM',
        pageWidth / 2,
        40,
        { align: 'center' }
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Periode: ${journalData.periodTitle}   |   Cakupan: ${journalData.selectedLabName}   |   Kelas: ${journalData.selectedClassName}   |   Tanggal Cetak: ${journalData.generatedDate}`,
        pageWidth / 2,
        45,
        { align: 'center' }
      );

      // 3. Executive KPI Strip for Practicum
      autoTable(doc, {
        startY: 48,
        theme: 'plain',
        styles: {
          fontSize: 7.5,
          cellPadding: 2.2,
          fillColor: [248, 250, 252],
          textColor: [30, 41, 59],
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          halign: 'center',
          valign: 'middle',
        },
        head: [
          [
            'TOTAL SESI PRAKTIKUM',
            'TOTAL KEHADIRAN SISWA',
            'RATA-RATA NILAI KINERJA',
            'RATA-RATA NILAI LAPORAN',
            'NILAI AKHIR RATA-RATA',
            'STATUS KENDALI MUTU',
          ],
        ],
        headStyles: {
          fontSize: 7,
          fontStyle: 'bold',
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          halign: 'center',
        },
        body: [
          [
            `${journalData.totalSessions} Sesi Terlaksana`,
            `${journalData.totalHadirSum} Hadir (${journalData.overallAttendanceRate}%)`,
            `${journalData.overallAvgKinerja} / 100`,
            `${journalData.overallAvgLaporan} / 100`,
            `${journalData.overallAvgAkhir} / 100`,
            'Terverifikasi & Sesuai Silabus Kurikulum',
          ],
        ],
        margin: { left: 14, right: 14 },
      });

      // 4. Main Practicum Journal Table
      const tableData = journalData.sessionRows.map((r, idx) => [
        idx + 1,
        r.activity.tanggal_kegiatan,
        LAB_DEFINITIONS[r.activity.laboratorium]?.shortName || r.activity.laboratorium,
        r.className,
        `${r.activity.judul_percobaan}\n${r.activity.materi_pokok ? `Materi: ${r.activity.materi_pokok}` : ''}`,
        r.guru,
        `Hadir: ${r.hadir}\nAbsen: ${r.absen}`,
        r.avgKinerja,
        r.avgLaporan,
        r.avgAkhir,
        r.activity.catatan_kejadian || 'Praktikum lancar & tertib',
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 3.5,
        head: [
          [
            'No',
            'Tanggal',
            'Lab / Mapel',
            'Kelas',
            'Judul Percobaan & Materi Pokok',
            'Guru Pengampu',
            'Kehadiran',
            'Kinerja',
            'Laporan',
            'Nilai Akhir',
            'Catatan Kejadian / Alat',
          ],
        ],
        body: tableData.length > 0 ? tableData : [['-', '-', '-', '-', 'Belum ada agenda praktikum pada periode ini', '-', '-', '-', '-', '-', '-']],
        theme: 'grid',
        showHead: 'everyPage',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
          overflow: 'linebreak',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [6, 78, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'center', cellWidth: 20 },
          2: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 16 },
          4: { cellWidth: 62 },
          5: { cellWidth: 32 },
          6: { halign: 'center', cellWidth: 22 },
          7: { halign: 'center', cellWidth: 16 },
          8: { halign: 'center', cellWidth: 16 },
          9: { halign: 'center', cellWidth: 18, fontStyle: 'bold', textColor: [6, 78, 59] },
          10: { cellWidth: 37 },
        },
        foot: [
          [
            {
              content: 'REKAPITULASI RATA-RATA TOTAL:',
              colSpan: 6,
              styles: { halign: 'right', fontStyle: 'bold' },
            },
            {
              content: `${journalData.totalHadirSum} Hadir`,
              styles: { halign: 'center', fontStyle: 'bold', textColor: [16, 120, 60] },
            },
            {
              content: `${journalData.overallAvgKinerja}`,
              styles: { halign: 'center', fontStyle: 'bold' },
            },
            {
              content: `${journalData.overallAvgLaporan}`,
              styles: { halign: 'center', fontStyle: 'bold' },
            },
            {
              content: `${journalData.overallAvgAkhir}`,
              styles: { halign: 'center', fontStyle: 'bold', fillColor: [226, 232, 240], textColor: [6, 78, 59] },
            },
            {
              content: `Kehadiran: ${journalData.overallAttendanceRate}%`,
              styles: { halign: 'center', fontStyle: 'italic' },
            },
          ],
        ],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
        },
        margin: { left: 14, right: 14 },
      });

      // 5. Official Signatures (3 Kolom: Guru Pengampu / PJ Lab, Kepala Lab, Kepala Sekolah)
      let finalY = (doc as any).lastAutoTable.finalY + 8;

      if (finalY + 42 > pageHeight - 12) {
        doc.addPage();
        finalY = 20;
      }

      const kotaPenetapan = kopConfig.kotaPenetapan?.trim() || 'Kota Tangerang';
      const tglPenetapan = kopConfig.tanggalPenetapan?.trim() || journalData.generatedDate;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Ditetapkan di: ${kotaPenetapan}, Tanggal: ${tglPenetapan}`,
        pageWidth - 14,
        finalY,
        { align: 'right' }
      );

      finalY += 6;
      const colWidth = (pageWidth - 28) / 3;
      const { pj: pjInfo, kepalaLab: kepalaLabInfo, kepalaSekolah: kepalaSekolahInfo } =
        officialSigners;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.text(pjInfo.jabatan, 14 + colWidth * 0.5, finalY, { align: 'center' });
      doc.text(kepalaLabInfo.jabatan, 14 + colWidth * 1.5, finalY, { align: 'center' });
      doc.text(kepalaSekolahInfo.jabatan, 14 + colWidth * 2.5, finalY, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(pjInfo.instansi, 14 + colWidth * 0.5, finalY + 4, { align: 'center' });
      doc.text(kepalaLabInfo.instansi, 14 + colWidth * 1.5, finalY + 4, { align: 'center' });
      doc.text(kepalaSekolahInfo.instansi, 14 + colWidth * 2.5, finalY + 4, { align: 'center' });

      const signY = finalY + 23;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(pjInfo.nama, 14 + colWidth * 0.5, signY, { align: 'center' });
      doc.text(kepalaLabInfo.nama, 14 + colWidth * 1.5, signY, { align: 'center' });
      doc.text(kepalaSekolahInfo.nama, 14 + colWidth * 2.5, signY, { align: 'center' });

      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.2);
      const nameWidths = [
        doc.getTextWidth(pjInfo.nama),
        doc.getTextWidth(kepalaLabInfo.nama),
        doc.getTextWidth(kepalaSekolahInfo.nama),
      ];
      doc.line(
        14 + colWidth * 0.5 - nameWidths[0] / 2,
        signY + 0.8,
        14 + colWidth * 0.5 + nameWidths[0] / 2,
        signY + 0.8
      );
      doc.line(
        14 + colWidth * 1.5 - nameWidths[1] / 2,
        signY + 0.8,
        14 + colWidth * 1.5 + nameWidths[1] / 2,
        signY + 0.8
      );
      doc.line(
        14 + colWidth * 2.5 - nameWidths[2] / 2,
        signY + 0.8,
        14 + colWidth * 2.5 + nameWidths[2] / 2,
        signY + 0.8
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(pjInfo.nip, 14 + colWidth * 0.5, signY + 4.5, { align: 'center' });
      doc.text(kepalaLabInfo.nip, 14 + colWidth * 1.5, signY + 4.5, { align: 'center' });
      doc.text(kepalaSekolahInfo.nip, 14 + colWidth * 2.5, signY + 4.5, { align: 'center' });

      // 6. Running Footer on all pages
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `SIMLAB IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia Kota Tangerang © 2026  ·  Halaman ${i} dari ${pageCount}  ·  Buku Jurnal Praktikum Resmi`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
      }

      const filename = `Buku_Jurnal_Praktikum_${journalPeriodType}_${journalData.periodTitle.replace(
        /\s+/g,
        '_'
      )}.pdf`;
      doc.save(filename);

      showToast({
        type: 'success',
        title: 'PDF Jurnal Praktikum Berhasil Dibuat',
        message: `Dokumen "${filename}" berhasil digenerate dan diunduh.`,
      });
    } catch (err) {
      console.error('Gagal membuat dokumen PDF jurnal:', err);
      showToast({
        type: 'error',
        title: 'Gagal Mengunduh PDF',
        message: 'Terjadi kesalahan saat memproses PDF buku jurnal praktikum.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Toolbar (hidden on print) */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
        {/* Top Header & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-800" />
              <span>Sistem Cetak Dokumen Legal & Laporan Berkala SIMLAB 2026</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Penyusunan Berita Acara Rekapitulasi Stok Inventaris & Buku Jurnal Agenda Praktikum Guru
              dengan KOP resmi dan tanda tangan legal
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditKopOpen(true)}
              className="min-h-[42px] px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
              title="Edit KOP Berita Acara, Alamat Resmi, Kota & Pejabat Pengesah Laporan"
            >
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Edit KOP & TTD</span>
            </button>

            {/* Tombol Unduh PDF Dinamis Sesuai Tab Aktif */}
            <button
              onClick={
                activeReportCategory === 'INVENTORY'
                  ? handleDownloadPDF
                  : handleDownloadPracticumJournalPDF
              }
              disabled={isExportingPdf}
              className="min-h-[42px] px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-emerald-700 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
              title="Unduh laporan langsung dalam format PDF dokumen resmi menggunakan jsPDF & AutoTable"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>
                    Unduh PDF{' '}
                    {activeReportCategory === 'INVENTORY' ? 'Inventaris' : 'Jurnal'}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="min-h-[42px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
              title="Cetak langsung ke printer atau format PDF peramban via media query print"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan</span>
            </button>

            <button
              onClick={
                activeReportCategory === 'INVENTORY' ? handleExportCSV : handleExportJournalCSV
              }
              className="min-h-[42px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-xs border border-slate-200 cursor-pointer"
              title="Ekspor tabel ini dalam format CSV spreadsheet"
            >
              <Download className="w-4 h-4" />
              <span>Unduh CSV</span>
            </button>
          </div>
        </div>

        {/* Category Switcher Tabs */}
        <div className="flex border-b border-slate-200 pt-2 gap-2">
          <button
            onClick={() => setActiveReportCategory('INVENTORY')}
            className={`flex items-center gap-2 pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeReportCategory === 'INVENTORY'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>📦 Rekapitulasi Stok & Mutasi Inventaris</span>
          </button>
          <button
            onClick={() => setActiveReportCategory('PRACTICUM_JOURNAL')}
            className={`flex items-center gap-2 pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeReportCategory === 'PRACTICUM_JOURNAL'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>🧪 Buku Jurnal & Agenda Praktikum Guru</span>
          </button>
        </div>

        {/* Filter Controls for INVENTORY Report */}
        {activeReportCategory === 'INVENTORY' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Jenis Periode Laporan
              </label>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
                <button
                  onClick={() => setReportType('MONTHLY')}
                  className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${
                    reportType === 'MONTHLY'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Bulanan (Per Bulan)
                </button>
                <button
                  onClick={() => setReportType('ANNUAL')}
                  className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${
                    reportType === 'ANNUAL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Tahunan (2025/2026)
                </button>
              </div>
            </div>

            {reportType === 'MONTHLY' ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Pilih Bulan (2026)
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  {monthNames.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m} 2026
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Tahun Buku
                </label>
                <input
                  type="text"
                  disabled
                  value="2025/2026 (Tahunan)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Cakupan Laboratorium
              </label>
              <select
                value={reportLabFilter}
                onChange={(e) => setReportLabFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="ALL">Seluruh Laboratorium IPA Terpadu</option>
                <option value="FISIKA">Laboratorium Fisika (SMA)</option>
                <option value="KIMIA">Laboratorium Kimia (SMA)</option>
                <option value="BIOLOGI">Laboratorium Biologi (SMA)</option>
                <option value="SMP_TERPADU">Laboratorium IPA Terpadu (SMP)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-emerald-800">Periode Aktif:</span>{' '}
                {periodData.periodTitle}
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls for PRACTICUM JOURNAL Report */}
        {activeReportCategory === 'PRACTICUM_JOURNAL' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Rentang Waktu Jurnal
              </label>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
                <button
                  onClick={() => setJournalPeriodType('MONTHLY')}
                  className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${
                    journalPeriodType === 'MONTHLY'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Bulanan
                </button>
                <button
                  onClick={() => setJournalPeriodType('ANNUAL')}
                  className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${
                    journalPeriodType === 'ANNUAL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Semester Genap / Tahunan
                </button>
              </div>
            </div>

            {journalPeriodType === 'MONTHLY' ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Pilih Bulan Jurnal
                </label>
                <select
                  value={journalMonth}
                  onChange={(e) => setJournalMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  {monthNames.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m} 2026
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Pilih Kelas / Rombel
                </label>
                <select
                  value={journalClassFilter}
                  onChange={(e) =>
                    setJournalClassFilter(
                      e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="ALL">Seluruh Kelas (SMP & SMA)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_kelas} ({c.tahun_ajaran})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Laboratorium / Mapel
              </label>
              <select
                value={journalLabFilter}
                onChange={(e) => setJournalLabFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="ALL">Seluruh Mapel Laboratorium</option>
                <option value="FISIKA">Praktikum Fisika (SMA)</option>
                <option value="KIMIA">Praktikum Kimia (SMA)</option>
                <option value="BIOLOGI">Praktikum Biologi (SMA)</option>
                <option value="SMP_TERPADU">Praktikum IPA Terpadu (SMP)</option>
              </select>
            </div>

            {journalPeriodType === 'MONTHLY' ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Filter Rombel / Kelas
                </label>
                <select
                  value={journalClassFilter}
                  onChange={(e) =>
                    setJournalClassFilter(
                      e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="ALL">Semua Rombel</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col justify-end">
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-emerald-800">Total Sesi:</span>{' '}
                  {journalData.totalSessions} Kegiatan Terlaksana
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: PRINTABLE PAPER CANVAS FOR INVENTORY STOCK RECAP       */}
      {/* ============================================================== */}
      {activeReportCategory === 'INVENTORY' && (
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none text-slate-900">
          {/* Official Kop Surat SMP dan SMA IT Ar-Rahmah Cendekia */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <img
                src={kopConfig.logoUrl || '/src/assets/images/arcss_logo_official.svg'}
                alt="Logo Instansi KOP Laporan"
                referrerPolicy="no-referrer"
                className="w-20 h-20 object-contain p-1 rounded-xl border border-slate-200 bg-white"
              />
              <div className="text-center flex-1 px-2">
                <div className="text-xs uppercase tracking-widest font-bold text-emerald-800">
                  {kopConfig.namaYayasan || 'YAYASAN BAYTU RAHMAH MADANIA'}
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 uppercase">
                  {kopConfig.namaSekolah || settings.nama_sekolah}
                </h1>
                <div className="text-sm font-semibold text-slate-800 tracking-wide uppercase">
                  {kopConfig.unitLaboratorium ||
                    'Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia'}
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {kopConfig.alamat ||
                    'Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114'}
                </p>
              </div>
              <div className="w-20 hidden sm:block text-right text-[10px] text-slate-400 font-mono">
                FORM: LAB-ARC/{settings.tahun_ajaran}
              </div>
            </div>
          </div>

          {/* Report Document Title */}
          <div className="text-center mb-6">
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 underline underline-offset-4">
              BERITA ACARA REKAPITULASI STOK INVENTARIS LABORATORIUM
            </h2>
            <p className="text-xs font-semibold text-slate-700 mt-1">
              Periode: {periodData.periodTitle} · Cakupan:{' '}
              {reportLabFilter === 'ALL'
                ? 'Seluruh Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia'
                : LAB_DEFINITIONS[reportLabFilter].name}
            </p>
          </div>

          {/* Executive Summary Metrics Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Total Katalog SKU
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {periodData.totalCatalogCount} Jenis
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Total Fisik Unit
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {periodData.grandPhysicalUnits.toLocaleString('id-ID')} Unit
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Mutasi Masuk / Keluar
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                <span className="text-emerald-700">+{periodData.periodTotalIn}</span> /{' '}
                <span className="text-amber-700">-{periodData.periodTotalOut}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Status Kelaikan Alat
              </div>
              <div className="text-lg font-bold font-mono text-emerald-800 tabular-nums">
                {periodData.goodConditionCount} Baik ({periodData.damageCount} Rusak)
              </div>
            </div>
          </div>

          {/* Stock Opname Detail Table */}
          <div className="overflow-x-auto mb-8">
            <table className="print-table w-full text-left border-collapse text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[11px] border-b border-slate-300">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Kode</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Nama Barang & Spesifikasi</th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-300">Satuan</th>
                  <th className="py-2.5 px-2 text-right border-r border-slate-300">Masuk</th>
                  <th className="py-2.5 px-2 text-right border-r border-slate-300">Keluar</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-300 font-bold bg-slate-200">
                    Stok Terkini
                  </th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-300">Batas Min</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Kondisi Fisik</th>
                  <th className="py-2.5 px-3">Lokasi / Rak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {periodData.reportRows.map((r, idx) => {
                  const isUnderMin = r.labStock <= r.item.minStockAlert;

                  return (
                    <tr key={r.item.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center font-mono text-slate-500 border-r border-slate-200 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                        {r.item.code}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{r.item.name}</div>
                        <div className="text-[10px] text-slate-500">{r.item.brandOrSpec}</div>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-600 border-r border-slate-200">
                        {r.item.unit}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-800 border-r border-slate-200 tabular-nums">
                        {r.periodIn > 0 ? `+${r.periodIn}` : '-'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-amber-800 border-r border-slate-200 tabular-nums">
                        {r.periodOut > 0 ? `-${r.periodOut}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50 border-r border-slate-200 tabular-nums">
                        {r.labStock}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200 tabular-nums">
                        <span className={isUnderMin ? 'text-amber-800 font-bold' : ''}>
                          {r.item.minStockAlert}
                        </span>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-[11px]">
                        <span>Baik: {r.item.conditionGood}</span>
                        {(r.item.conditionLightDamage > 0 || r.item.conditionHeavyDamage > 0) && (
                          <span className="text-amber-800 block text-[10px]">
                            Rusak: {r.item.conditionLightDamage + r.item.conditionHeavyDamage}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-600">
                        {r.item.storageRack}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <td colSpan={4} className="py-2.5 px-3 text-right uppercase border-r border-slate-300">
                    Total Rekapitulasi:
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-emerald-800 border-r border-slate-300 tabular-nums">
                    +{periodData.periodTotalIn}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-amber-800 border-r border-slate-300 tabular-nums">
                    -{periodData.periodTotalOut}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 bg-slate-200 border-r border-slate-300 tabular-nums">
                    {periodData.grandPhysicalUnits} Unit
                  </td>
                  <td colSpan={3} className="py-2.5 px-3 text-xs text-slate-600">
                    Status: 100% Terverifikasi
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Signature Verification Blocks */}
          <div className="pt-8 border-t border-slate-200 text-xs">
            <div className="text-right text-slate-600 mb-6 font-medium">
              Ditetapkan di: <strong>{kopConfig.kotaPenetapan?.trim() || 'Kota Tangerang'}</strong>, Tanggal:{' '}
              {kopConfig.tanggalPenetapan?.trim() || periodData.generatedDate}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-slate-700">
                    {officialSigners.pj.jabatan}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {officialSigners.pj.instansi}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {officialSigners.pj.nama}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {officialSigners.pj.nip}
                  </p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-slate-700">
                    {officialSigners.kepalaLab.jabatan}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {officialSigners.kepalaLab.instansi}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {officialSigners.kepalaLab.nama}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {officialSigners.kepalaLab.nip}
                  </p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-slate-700">
                    {officialSigners.kepalaSekolah.jabatan}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {officialSigners.kepalaSekolah.instansi}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {officialSigners.kepalaSekolah.nama}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {officialSigners.kepalaSekolah.nip}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: PRINTABLE PAPER CANVAS FOR PRACTICUM JOURNAL RECAP     */}
      {/* ============================================================== */}
      {activeReportCategory === 'PRACTICUM_JOURNAL' && (
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none text-slate-900">
          {/* Official Kop Surat */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <img
                src={kopConfig.logoUrl || '/src/assets/images/arcss_logo_official.svg'}
                alt="Logo Instansi KOP Jurnal"
                referrerPolicy="no-referrer"
                className="w-20 h-20 object-contain p-1 rounded-xl border border-slate-200 bg-white"
              />
              <div className="text-center flex-1 px-2">
                <div className="text-xs uppercase tracking-widest font-bold text-emerald-800">
                  {kopConfig.namaYayasan || 'YAYASAN BAYTU RAHMAH MADANIA'}
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 uppercase">
                  {kopConfig.namaSekolah || settings.nama_sekolah}
                </h1>
                <div className="text-sm font-semibold text-slate-800 tracking-wide uppercase">
                  {kopConfig.unitLaboratorium ||
                    'Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia'}
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {kopConfig.alamat ||
                    'Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114'}
                </p>
              </div>
              <div className="w-20 hidden sm:block text-right text-[10px] text-slate-400 font-mono">
                FORM: JRNL-ARC/{settings.tahun_ajaran}
              </div>
            </div>
          </div>

          {/* Report Document Title */}
          <div className="text-center mb-6">
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 underline underline-offset-4">
              BUKU REKAPITULASI JURNAL & AGENDA KEGIATAN PRAKTIKUM GURU
            </h2>
            <p className="text-xs font-semibold text-slate-700 mt-1">
              Periode: {journalData.periodTitle} · Cakupan: {journalData.selectedLabName} · Kelas:{' '}
              {journalData.selectedClassName}
            </p>
          </div>

          {/* Executive Summary Metrics Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Total Sesi Terlaksana
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {journalData.totalSessions} Sesi
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Total Presensi Hadir
              </div>
              <div className="text-lg font-bold font-mono text-emerald-800 tabular-nums">
                {journalData.totalHadirSum} Siswa ({journalData.overallAttendanceRate}%)
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Rata-rata Kinerja & Laporan
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {journalData.overallAvgKinerja} / {journalData.overallAvgLaporan}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Nilai Akhir Rata-rata
              </div>
              <div className="text-lg font-bold font-mono text-emerald-800 tabular-nums">
                {journalData.overallAvgAkhir} / 100
              </div>
            </div>
          </div>

          {/* Practicum Sessions Detail Table */}
          <div className="overflow-x-auto mb-8">
            <table className="print-table w-full text-left border-collapse text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[11px] border-b border-slate-300">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">No</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Tanggal</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Lab / Mapel</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Kelas</th>
                  <th className="py-2.5 px-4 border-r border-slate-300">
                    Judul Percobaan & Materi Pokok
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Guru Pengampu</th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-300">Presensi</th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-300">Kinerja</th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-300">Laporan</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-300 font-bold bg-slate-200">
                    Nilai Akhir
                  </th>
                  <th className="py-2.5 px-3">Catatan / Kelaikan Alat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {journalData.sessionRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-slate-400 italic">
                      Tidak ada catatan agenda praktikum pada filter periode ini.
                    </td>
                  </tr>
                ) : (
                  journalData.sessionRows.map((r, idx) => (
                    <tr key={r.activity.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center font-mono text-slate-500 border-r border-slate-200 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200 whitespace-nowrap">
                        {r.activity.tanggal_kegiatan}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                        {LAB_DEFINITIONS[r.activity.laboratorium]?.shortName ||
                          r.activity.laboratorium}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-slate-700 font-medium">
                        {r.className}
                      </td>
                      <td className="py-2 px-4 border-r border-slate-200">
                        <div className="font-bold text-slate-900">
                          {r.activity.judul_percobaan}
                        </div>
                        {r.activity.materi_pokok && (
                          <div className="text-[10px] text-slate-500">
                            Materi: {r.activity.materi_pokok}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                        {r.guru}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 text-[11px]">
                        <span className="text-emerald-700 font-bold">{r.hadir} Hadir</span>
                        {r.absen > 0 && (
                          <span className="text-amber-700 block text-[10px]">
                            {r.absen} Absen
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200 tabular-nums">
                        {r.avgKinerja}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200 tabular-nums">
                        {r.avgLaporan}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-800 bg-slate-50 border-r border-slate-200 tabular-nums">
                        {r.avgAkhir}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-600">
                        {r.activity.catatan_kejadian || 'Tertib & lancar'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {journalData.sessionRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td
                      colSpan={6}
                      className="py-2.5 px-3 text-right uppercase border-r border-slate-300"
                    >
                      Rata-Rata Keseluruhan:
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-emerald-800 border-r border-slate-300 tabular-nums">
                      {journalData.totalHadirSum} Hadir
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-800 border-r border-slate-300 tabular-nums">
                      {journalData.overallAvgKinerja}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-800 border-r border-slate-300 tabular-nums">
                      {journalData.overallAvgLaporan}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-800 bg-slate-200 border-r border-slate-300 tabular-nums">
                      {journalData.overallAvgAkhir}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">
                      Tingkat Kehadiran: {journalData.overallAttendanceRate}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Official Signatures for Practicum Journal */}
          <div className="pt-8 border-t border-slate-200 text-xs">
            <div className="text-right text-slate-600 mb-6 font-medium">
              Ditetapkan di: <strong>{kopConfig.kotaPenetapan?.trim() || 'Kota Tangerang'}</strong>, Tanggal:{' '}
              {kopConfig.tanggalPenetapan?.trim() || journalData.generatedDate}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-slate-700">
                    {officialSigners.pj.jabatan}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {officialSigners.pj.instansi}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {officialSigners.pj.nama}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {officialSigners.pj.nip}
                  </p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-slate-700">
                    {officialSigners.kepalaLab.jabatan}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {officialSigners.kepalaLab.instansi}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {officialSigners.kepalaLab.nama}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {officialSigners.kepalaLab.nip}
                  </p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="font-semibold text-slate-700">
                    {officialSigners.kepalaSekolah.jabatan}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {officialSigners.kepalaSekolah.instansi}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {officialSigners.kepalaSekolah.nama}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {officialSigners.kepalaSekolah.nip}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit KOP & Tanda Tangan */}
      <EditKopModal isOpen={isEditKopOpen} onClose={() => setIsEditKopOpen(false)} />
    </div>
  );
};
