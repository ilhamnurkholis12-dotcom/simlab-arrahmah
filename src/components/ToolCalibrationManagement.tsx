import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  CalibrationRecord,
  CalibrationResult,
  CalibrationStatus,
  LabId,
  LAB_DEFINITIONS,
  InventoryItem,
} from '../types/inventory';
import {
  Gauge,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Plus,
  Search,
  Filter,
  Printer,
  ShieldCheck,
  FileCheck,
  Award,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Sliders,
  Check,
  X,
  Sparkles,
  QrCode,
  ArrowRight,
  Atom,
  FlaskConical,
  Dna,
  GraduationCap,
} from 'lucide-react';
import { PrintReportHeader } from './PrintReportHeader';

export const ToolCalibrationManagement: React.FC = () => {
  const {
    calibrations,
    dueCalibrations,
    overdueCalibrationsCount,
    dueSoonCalibrationsCount,
    addCalibrationRecord,
    updateCalibrationRecord,
    deleteCalibrationRecord,
    performCalibrationTest,
    items,
    currentUser,
    settings,
    canEditLab,
    isAdmin,
  } = useInventory();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLab, setSelectedLab] = useState<LabId | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<CalibrationRecord | null>(null);

  // Form State for Add / Edit
  const [formItemId, setFormItemId] = useState('');
  const [formItemCode, setFormItemCode] = useState('');
  const [formItemName, setFormItemName] = useState('');
  const [formLab, setFormLab] = useState<LabId>('FISIKA');
  const [formInstrumentType, setFormInstrumentType] = useState('Neraca Digital / Analitik');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formBrandOrModel, setFormBrandOrModel] = useState('');
  const [formLocationRack, setFormLocationRack] = useState('');
  const [formLastDate, setFormLastDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formIntervalMonths, setFormIntervalMonths] = useState<number>(6);
  const [formNextDueDate, setFormNextDueDate] = useState('');
  const [formCalibratedBy, setFormCalibratedBy] = useState(() => currentUser?.name || 'Laboran');
  const [formCertificateNumber, setFormCertificateNumber] = useState('');
  const [formResult, setFormResult] = useState<CalibrationResult>('LULUS');
  const [formMeasuredDeviation, setFormMeasuredDeviation] = useState('');
  const [formStandardReference, setFormStandardReference] = useState('');
  const [formActionTaken, setFormActionTaken] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Fast Test Form State
  const [testDate, setTestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [testIntervalMonths, setTestIntervalMonths] = useState<number>(6);
  const [testCalibratedBy, setTestCalibratedBy] = useState(() => currentUser?.name || 'Laboran');
  const [testCertificateNumber, setTestCertificateNumber] = useState('');
  const [testResult, setTestResult] = useState<CalibrationResult>('LULUS');
  const [testMeasuredDeviation, setTestMeasuredDeviation] = useState('');
  const [testStandardReference, setTestStandardReference] = useState('');
  const [testActionTaken, setTestActionTaken] = useState('');
  const [testNotes, setTestNotes] = useState('');

  // Auto-fill next due date when last date or interval changes in Add form
  React.useEffect(() => {
    try {
      if (formLastDate && formIntervalMonths) {
        const d = new Date(formLastDate);
        d.setMonth(d.getMonth() + Number(formIntervalMonths));
        setFormNextDueDate(d.toISOString().split('T')[0]);
      }
    } catch {
      // ignore
    }
  }, [formLastDate, formIntervalMonths]);

  // Handle Item selection in Add form
  const handleSelectItem = (itemId: string) => {
    setFormItemId(itemId);
    const found = items.find((it) => it.id === itemId);
    if (found) {
      setFormItemCode(found.code);
      setFormItemName(found.name);
      setFormLab(found.primaryLab === 'ALL' ? 'FISIKA' : found.primaryLab);
      setFormBrandOrModel(found.brandOrSpec || '');
      setFormLocationRack(found.storageRack || '');

      // Suggest instrument type based on name or category
      const lower = found.name.toLowerCase();
      if (lower.includes('neraca') || lower.includes('timbangan')) {
        setFormInstrumentType('Neraca Presisi & Timbangan Digital');
        setFormStandardReference('Anak Timbangan Standar Stainless E2 (1g - 200g)');
      } else if (lower.includes('ph')) {
        setFormInstrumentType('Sensor pH Digital Elektroda Kaca');
        setFormStandardReference('Larutan Buffer Standar pH 4.01, 7.01, 10.01');
      } else if (lower.includes('suhu') || lower.includes('termometer')) {
        setFormInstrumentType('Sensor Pirometer & Termometer Digital');
        setFormStandardReference('Termometer Standar Log Terkalibrasi BSML');
      } else if (lower.includes('multitester') || lower.includes('voltmeter') || lower.includes('multimeter')) {
        setFormInstrumentType('Multimeter Digital True RMS');
        setFormStandardReference('Sumber Tegangan Referensi DC Kalibrator Fluke');
      } else if (lower.includes('mikroskop')) {
        setFormInstrumentType('Mikroskop Presisi Optik');
        setFormStandardReference('Mikrometer Okuler & Stage Micrometer 0.01 mm');
      } else if (lower.includes('sorong') || lower.includes('mikrometer')) {
        setFormInstrumentType('Alat Ukur Panjang Presisi Vernier / Digital');
        setFormStandardReference('Balok Ukur Gauge Block Grade 1 Mitutoyo');
      } else {
        setFormInstrumentType('Instrumen Laboratorium Presisi');
      }
    }
  };

  // Open modal for new calibration record
  const handleOpenAddModal = () => {
    setFormItemId('');
    setFormItemCode('');
    setFormItemName('');
    setFormLab('FISIKA');
    setFormInstrumentType('Neraca Digital / Analitik');
    setFormSerialNumber(`SN-${Date.now().toString().slice(-6)}`);
    setFormBrandOrModel('');
    setFormLocationRack('');
    setFormLastDate(new Date().toISOString().split('T')[0]);
    setFormIntervalMonths(6);
    setFormCalibratedBy(currentUser?.name || 'Laboran');
    setFormCertificateNumber(`ARC-CAL/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
    setFormResult('LULUS');
    setFormMeasuredDeviation('Deviasi 0.00 (Toleransi Standar Sesuai)');
    setFormStandardReference('Anak Timbangan Standar E2 / Acuan Laboratorium');
    setFormActionTaken('Zero-tare calibration & pembersihan sensor');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Submit Add form
  const handleSaveAddModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemName.trim()) return;

    addCalibrationRecord({
      itemId: formItemId || `item-custom-${Date.now()}`,
      itemCode: formItemCode || `CAL-${Date.now().toString().slice(-4)}`,
      itemName: formItemName.trim(),
      lab: formLab,
      instrumentType: formInstrumentType.trim(),
      serialNumber: formSerialNumber.trim() || 'SN-ARC-GENERIC',
      brandOrModel: formBrandOrModel.trim() || '-',
      locationRack: formLocationRack.trim() || `Ruang Lab ${formLab}`,
      lastCalibrationDate: formLastDate,
      calibrationIntervalMonths: Number(formIntervalMonths) || 6,
      nextCalibrationDueDate: formNextDueDate,
      calibratedBy: formCalibratedBy.trim(),
      certificateNumber: formCertificateNumber.trim() || undefined,
      result: formResult,
      measuredDeviation: formMeasuredDeviation.trim() || undefined,
      standardReference: formStandardReference.trim() || undefined,
      actionTaken: formActionTaken.trim() || undefined,
      notes: formNotes.trim() || undefined,
    });

    setIsAddModalOpen(false);
  };

  // Open Fast Test Modal
  const handleOpenTestModal = (rec: CalibrationRecord) => {
    setActiveRecord(rec);
    setTestDate(new Date().toISOString().split('T')[0]);
    setTestIntervalMonths(rec.calibrationIntervalMonths || 6);
    setTestCalibratedBy(currentUser?.name || rec.calibratedBy || 'Laboran');
    setTestCertificateNumber(
      `ARC-CAL/${LAB_DEFINITIONS[rec.lab]?.shortName?.substring(0, 3).toUpperCase() || 'LAB'}/${new Date().getFullYear()}/${Math.floor(
        100 + Math.random() * 900
      )}`
    );
    setTestResult('LULUS');
    setTestMeasuredDeviation('Deviasi 0.00 (Akurasi Presisi Terpenuhi)');
    setTestStandardReference(rec.standardReference || 'Standar Acuan Terkalibrasi');
    setTestActionTaken('Zero-point tare adjustment & pembersihan instrumen');
    setTestNotes('');
    setIsTestModalOpen(true);
  };

  // Submit Fast Test Modal
  const handleSaveTestModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;

    performCalibrationTest(activeRecord.id, {
      lastCalibrationDate: testDate,
      calibrationIntervalMonths: Number(testIntervalMonths) || 6,
      calibratedBy: testCalibratedBy.trim(),
      certificateNumber: testCertificateNumber.trim() || undefined,
      result: testResult,
      measuredDeviation: testMeasuredDeviation.trim() || undefined,
      standardReference: testStandardReference.trim() || undefined,
      actionTaken: testActionTaken.trim() || undefined,
      notes: testNotes.trim() || undefined,
    });

    setIsTestModalOpen(false);
  };

  // Open Detail / Certificate Modal
  const handleOpenDetailModal = (rec: CalibrationRecord) => {
    setActiveRecord(rec);
    setIsDetailModalOpen(true);
  };

  // Delete calibration record
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Hapus data kalibrasi alat "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteCalibrationRecord(id);
    }
  };

  // Filtered Calibration records
  const filteredCalibrations = useMemo(() => {
    return calibrations.filter((rec) => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchName = rec.itemName.toLowerCase().includes(query);
        const matchCode = rec.itemCode.toLowerCase().includes(query);
        const matchSerial = rec.serialNumber.toLowerCase().includes(query);
        const matchType = rec.instrumentType.toLowerCase().includes(query);
        const matchBrand = rec.brandOrModel.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchSerial && !matchType && !matchBrand) {
          return false;
        }
      }

      // Lab match
      if (selectedLab !== 'ALL' && rec.lab !== selectedLab) {
        return false;
      }

      // Status match
      if (selectedStatus === 'DUE_SOON_OR_OVERDUE') {
        return rec.status === 'KADALUARSA' || rec.status === 'MENDEKATI_JATUH_TEMPO' || rec.status === 'PERLU_PERBAIKAN';
      }
      if (selectedStatus === 'TERKALIBRASI' && rec.status !== 'TERKALIBRASI') {
        return false;
      }
      if (selectedStatus === 'KADALUARSA' && rec.status !== 'KADALUARSA') {
        return false;
      }
      if (selectedStatus === 'MENDEKATI_JATUH_TEMPO' && rec.status !== 'MENDEKATI_JATUH_TEMPO') {
        return false;
      }
      if (selectedStatus === 'PERLU_PERBAIKAN' && rec.status !== 'PERLU_PERBAIKAN') {
        return false;
      }

      return true;
    });
  }, [calibrations, searchQuery, selectedLab, selectedStatus]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = calibrations.length;
    let terkalibrasi = 0;
    let mendekati = 0;
    let kadaluarsa = 0;
    let perluPerbaikan = 0;

    calibrations.forEach((c) => {
      if (c.status === 'TERKALIBRASI') terkalibrasi++;
      else if (c.status === 'MENDEKATI_JATUH_TEMPO') mendekati++;
      else if (c.status === 'KADALUARSA') kadaluarsa++;
      else if (c.status === 'PERLU_PERBAIKAN') perluPerbaikan++;
    });

    const percentValid = total > 0 ? Math.round((terkalibrasi / total) * 100) : 0;

    return {
      total,
      terkalibrasi,
      mendekati,
      kadaluarsa,
      perluPerbaikan,
      percentValid,
    };
  }, [calibrations]);

  // Helper calculation for days remaining
  const getDaysRemainingInfo = (dueDateStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);
      const diffMs = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          text: `Lewat ${Math.abs(diffDays)} hari`,
          days: diffDays,
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
          dotColor: 'bg-rose-600',
        };
      }
      if (diffDays === 0) {
        return {
          text: 'Jatuh tempo HARI INI',
          days: diffDays,
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
          dotColor: 'bg-rose-600',
        };
      }
      if (diffDays <= 30) {
        return {
          text: `Sisa ${diffDays} hari lagi`,
          days: diffDays,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
          dotColor: 'bg-amber-500',
        };
      }
      return {
        text: `Sisa ${diffDays} hari`,
        days: diffDays,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dotColor: 'bg-emerald-500',
      };
    } catch {
      return {
        text: '-',
        days: 0,
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        dotColor: 'bg-slate-400',
      };
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Official Print Header */}
      <PrintReportHeader
        title="Daftar Jadwal & Sertifikasi Kalibrasi Alat Presisi Laboratorium"
        subtitle={`Jadwal Verifikasi Deviasi, Zero-Tare, dan Sertifikasi Akurasi Instrumen Sensitif Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia TA ${
          settings.tahun_ajaran || '2025/2026'
        }`}
        selectedLab={selectedLab}
        extraMetadata={[
          { label: 'Total Alat Sensitif', value: `${stats.total} Instrumen` },
          { label: 'Tingkat Akurasi Terjamin', value: `${stats.percentValid}% Valid` },
          { label: 'Perlu Kalibrasi Segera', value: `${stats.kadaluarsa + stats.mendekati} Alat` },
        ]}
      />

      {/* 1. Header Banner & Actions */}
      <div className="no-print bg-white/95 backdrop-blur-xs p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10.5px] font-bold uppercase tracking-wider">
              <Gauge className="w-3.5 h-3.5 text-teal-700" />
              <span>Standar Akurasi & Metrologi Laboratorium</span>
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              · ISO & Kurikulum Merdeka
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Kalibrasi & Akurasi Alat Laboratorium</span>
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Pencatatan riwayat berkala, jadwal kalibrasi, pengujian deviasi, penyesuaian zero-tare, dan verifikasi sertifikasi instrumen sensitif (timbangan digital, pH meter, sensor pirometer, dan multitester).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat Alat & Kalibrasi</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition-all flex items-center gap-1.5 shadow-2xs"
            title="Cetak Jadwal & Laporan Kalibrasi Resmi"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak Jadwal</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Alat Terdaftar */}
        <div className="bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Instrumen Presisi</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {stats.total}
            </span>
            <span className="text-xs font-semibold text-slate-500 ml-1.5">Alat Terdata</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span>Standar Kelaikan:</span>
            <span className="font-bold text-teal-700 font-mono">{stats.percentValid}% Valid</span>
          </div>
        </div>

        {/* Terkalibrasi Valid */}
        <div className="bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Terkalibrasi Valid</span>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              {stats.terkalibrasi}
            </span>
            <span className="text-xs font-semibold text-slate-500 ml-1.5">Instrumen</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-800 flex items-center justify-between border-t border-emerald-100 pt-1.5">
            <span>Akurasi Praktikum:</span>
            <span className="font-bold font-mono">Teruji Stabil</span>
          </div>
        </div>

        {/* Mendekati Jatuh Tempo */}
        <div className="bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Jatuh Tempo Segera</span>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
              {stats.mendekati}
            </span>
            <span className="text-xs font-semibold text-slate-500 ml-1.5">≤ 30 Hari</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-800 flex items-center justify-between border-t border-amber-100 pt-1.5">
            <span>Status Kalender:</span>
            <span className="font-bold font-mono">Persiapkan Uji</span>
          </div>
        </div>

        {/* Kadaluarsa / Butuh Uji Ulang */}
        <div className="bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-rose-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900">Lewat Jadwal / Kadaluarsa</span>
            <div className="p-2 bg-rose-100 text-rose-800 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-black text-rose-700 font-mono">
              {stats.kadaluarsa + stats.perluPerbaikan}
            </span>
            <span className="text-xs font-semibold text-slate-500 ml-1.5">Perlu Tindakan</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-800 flex items-center justify-between border-t border-rose-100 pt-1.5">
            <span>Deviasi Potensial:</span>
            <span className="font-bold font-mono">Lakukan Re-Kalibrasi</span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="no-print bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama alat, kode, no. seri, atau jenis instrumen..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lab Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Seluruh Laboratorium</option>
              <option value="FISIKA">Fisika (SMA)</option>
              <option value="KIMIA">Kimia (SMA)</option>
              <option value="BIOLOGI">Biologi (SMA)</option>
              <option value="SMP_TERPADU">IPA Terpadu (SMP)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Semua Status Kalibrasi</option>
              <option value="DUE_SOON_OR_OVERDUE">⚠️ Perlu Tindakan Segera</option>
              <option value="TERKALIBRASI">✅ Terkalibrasi Valid</option>
              <option value="KADALUARSA">🔴 Kadaluarsa (Terlambat)</option>
              <option value="MENDEKATI_JATUH_TEMPO">🟡 Jatuh Tempo ≤ 30 Hari</option>
              <option value="PERLU_PERBAIKAN">🛠️ Perlu Servis / Perbaikan</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Calibration Data Table */}
      <div className="bg-white/95 backdrop-blur-xs rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Nama Alat & Kode</th>
                <th className="py-3 px-3">Jenis & No. Seri</th>
                <th className="py-3 px-3">Lab & Lokasi</th>
                <th className="py-3 px-3">Uji Terakhir & Teknisi</th>
                <th className="py-3 px-3">Jadwal Jatuh Tempo</th>
                <th className="py-3 px-3">Hasil & Deviasi</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="no-print py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalibrations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">Tidak ada data kalibrasi yang sesuai filter.</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Silakan sesuaikan kata kunci pencarian atau tambah rekam kalibrasi baru.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCalibrations.map((rec) => {
                  const labDef = LAB_DEFINITIONS[rec.lab];
                  const remaining = getDaysRemainingInfo(rec.nextCalibrationDueDate);

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Nama Alat & Kode */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-teal-900 flex items-center gap-1.5">
                          <span>{rec.itemName}</span>
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="font-semibold text-slate-500">{rec.itemCode}</span>
                          {rec.certificateNumber && (
                            <>
                              <span>·</span>
                              <span className="text-teal-700 font-medium">Sertifikat: {rec.certificateNumber}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Jenis & No Seri */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-800">{rec.instrumentType}</div>
                        <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                          SN: {rec.serialNumber} {rec.brandOrModel && `· ${rec.brandOrModel}`}
                        </div>
                      </td>

                      {/* Lab & Lokasi */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                            labDef?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {labDef?.shortName || rec.lab}
                        </span>
                        <div className="text-[10.5px] text-slate-500 mt-0.5 truncate max-w-[130px]" title={rec.locationRack}>
                          {rec.locationRack}
                        </div>
                      </td>

                      {/* Uji Terakhir & Teknisi */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-mono text-slate-800 font-semibold">{rec.lastCalibrationDate}</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5 truncate max-w-[140px]" title={rec.calibratedBy}>
                          Oleh: {rec.calibratedBy}
                        </div>
                      </td>

                      {/* Jadwal Jatuh Tempo & Countdown */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{rec.nextCalibrationDueDate}</div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${remaining.badgeColor}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${remaining.dotColor}`} />
                            <span>{remaining.text}</span>
                          </span>
                        </div>
                      </td>

                      {/* Hasil & Deviasi */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {rec.result === 'LULUS' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                              LULUS
                            </span>
                          ) : rec.result === 'LULUS_BERSYARAT' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                              LULUS BERSYARAT
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px]">
                              GAGAL
                            </span>
                          )}
                        </div>
                        {rec.measuredDeviation && (
                          <div className="text-[10.5px] text-slate-500 mt-1 font-mono truncate max-w-[160px]" title={rec.measuredDeviation}>
                            {rec.measuredDeviation}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {rec.status === 'TERKALIBRASI' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10.5px] font-extrabold shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Valid</span>
                          </span>
                        ) : rec.status === 'MENDEKATI_JATUH_TEMPO' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10.5px] font-extrabold shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Segera Uji</span>
                          </span>
                        ) : rec.status === 'KADALUARSA' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-[10.5px] font-extrabold shadow-2xs animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Kadaluarsa</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-300 text-[10.5px] font-extrabold shadow-2xs">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span>Perlu Servis</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="no-print py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenTestModal(rec)}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1"
                            title="Lakukan pengujian dan perbarui tanggal kalibrasi instrumen"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Uji Ulang</span>
                          </button>
                          <button
                            onClick={() => handleOpenDetailModal(rec)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                            title="Lihat Detail & Sertifikat Kalibrasi"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(rec.id, rec.itemName)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                              title="Hapus rekam kalibrasi ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info note */}
        <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Kalibrasi berkala menjamin presisi instrumen dan kesesuaian data praktikum siswa dengan standar ilmiah kurikulum.
            </span>
          </div>
          <span className="font-mono text-slate-600 text-[11px] shrink-0 font-medium">
            Total {filteredCalibrations.length} dari {calibrations.length} instrumen terdaftar
          </span>
        </div>
      </div>

      {/* 5. MODAL: CATAT ALAT & KALIBRASI BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Catat Kalibrasi Instrumen Baru</h3>
                  <p className="text-xs text-slate-300">
                    Daftarkan alat sensitif dan jadwalkan kalibrasi berkala laboratorium
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveAddModal} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Item Autocomplete Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Alat dari Katalog Inventaris (Otomatis Mengisi Data):
                </label>
                <select
                  value={formItemId}
                  onChange={(e) => handleSelectItem(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Pilih atau Isi Manual di Bawah --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.code}] {it.name} ({it.primaryLab})
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Alat / Instrumen <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formItemName}
                    onChange={(e) => setFormItemName(e.target.value)}
                    placeholder="Contoh: Neraca Ohaus 311 Gram"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Inventaris
                  </label>
                  <input
                    type="text"
                    value={formItemCode}
                    onChange={(e) => setFormItemCode(e.target.value)}
                    placeholder="Contoh: FIS-26-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Laboratorium Penanggung Jawab
                  </label>
                  <select
                    value={formLab}
                    onChange={(e) => setFormLab(e.target.value as LabId)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-bold"
                  >
                    <option value="FISIKA">Laboratorium Fisika (SMA)</option>
                    <option value="KIMIA">Laboratorium Kimia (SMA)</option>
                    <option value="BIOLOGI">Laboratorium Biologi (SMA)</option>
                    <option value="SMP_TERPADU">Laboratorium IPA Terpadu (SMP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Instrumen Presisi
                  </label>
                  <input
                    type="text"
                    value={formInstrumentType}
                    onChange={(e) => setFormInstrumentType(e.target.value)}
                    placeholder="Contoh: Neraca Digital / Sensor pH"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Seri (Serial Number)
                  </label>
                  <input
                    type="text"
                    value={formSerialNumber}
                    onChange={(e) => setFormSerialNumber(e.target.value)}
                    placeholder="Contoh: SN-OHAUS-311-9821"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Merek & Spesifikasi Model
                  </label>
                  <input
                    type="text"
                    value={formBrandOrModel}
                    onChange={(e) => setFormBrandOrModel(e.target.value)}
                    placeholder="Contoh: Ohaus Corp USA 0.01 g"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi Rak Penyimpanan
                  </label>
                  <input
                    type="text"
                    value={formLocationRack}
                    onChange={(e) => setFormLocationRack(e.target.value)}
                    placeholder="Contoh: Lemari Fisika A1 - Rak 1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teknisi / Laboran Penguji
                  </label>
                  <input
                    type="text"
                    value={formCalibratedBy}
                    onChange={(e) => setFormCalibratedBy(e.target.value)}
                    placeholder="Nama Laboran atau Vendor Kalibrasi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Kalibrasi Terakhir <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formLastDate}
                    onChange={(e) => setFormLastDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Interval Kalibrasi Berkala
                  </label>
                  <select
                    value={formIntervalMonths}
                    onChange={(e) => setFormIntervalMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={3}>Setiap 3 Bulan (Sensor Kimia / pH)</option>
                    <option value={6}>Setiap 6 Bulan (Standar Timbangan & Pirometer)</option>
                    <option value={12}>Setiap 12 Bulan (Mikroskop & Catu Daya)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jadwal Jatuh Tempo Berikutnya
                  </label>
                  <input
                    type="date"
                    required
                    value={formNextDueDate}
                    onChange={(e) => setFormNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-950 font-bold font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hasil Pengujian Deviasi
                  </label>
                  <select
                    value={formResult}
                    onChange={(e) => setFormResult(e.target.value as CalibrationResult)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="LULUS">LULUS (Deviasi dalam batas aman toleransi)</option>
                    <option value="LULUS_BERSYARAT">LULUS BERSYARAT (Deviasi minor terpantau)</option>
                    <option value="GAGAL">GAGAL (Deviasi di luar toleransi / butuh servis)</option>
                  </select>
                </div>
              </div>

              {/* Deviasi & Standar Acuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nilai Deviasi Terukur & Toleransi
                  </label>
                  <input
                    type="text"
                    value={formMeasuredDeviation}
                    onChange={(e) => setFormMeasuredDeviation(e.target.value)}
                    placeholder="Contoh: Deviasi +0.005 g (Maks ±0.01 g)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standar Acuan Uji (Standard Reference)
                  </label>
                  <input
                    type="text"
                    value={formStandardReference}
                    onChange={(e) => setFormStandardReference(e.target.value)}
                    placeholder="Contoh: Anak Timbangan Stainless E2 100g"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Tindakan Koreksi & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tindakan Koreksi / Perawatan
                  </label>
                  <input
                    type="text"
                    value={formActionTaken}
                    onChange={(e) => setFormActionTaken(e.target.value)}
                    placeholder="Contoh: Zero-tare adjustment & pembersihan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Sertifikat / Berita Acara
                  </label>
                  <input
                    type="text"
                    value={formCertificateNumber}
                    onChange={(e) => setFormCertificateNumber(e.target.value)}
                    placeholder="Contoh: ARC-CAL/FIS/2026/044"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan kondisi pisau penumpu, respon elektroda, kebersihan optik, dsb..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-xs"
                >
                  Simpan Rekam Kalibrasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: UJI ULANG / FAST CALIBRATION TEST */}
      {isTestModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Uji Kalibrasi Ulang Berkala</h3>
                  <p className="text-xs text-teal-200">{activeRecord.itemName} ({activeRecord.itemCode})</p>
                </div>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Test Form */}
            <form onSubmit={handleSaveTestModal} className="p-5 sm:p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Seri:</span>
                  <span className="font-mono font-bold text-slate-800">{activeRecord.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Merek / Spesifikasi:</span>
                  <span className="font-medium text-slate-800">{activeRecord.brandOrModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lokasi Lab:</span>
                  <span className="font-bold text-teal-700">
                    {LAB_DEFINITIONS[activeRecord.lab]?.name} ({activeRecord.locationRack})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pengujian Hari Ini <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Masa Berlaku Interval
                  </label>
                  <select
                    value={testIntervalMonths}
                    onChange={(e) => setTestIntervalMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={3}>3 Bulan (Sensor pH / Reagen)</option>
                    <option value={6}>6 Bulan (Timbangan / Sensor Termal)</option>
                    <option value={12}>12 Bulan (Mikroskop / Power Supply)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hasil Pengujian Akurasi
                  </label>
                  <select
                    value={testResult}
                    onChange={(e) => setTestResult(e.target.value as CalibrationResult)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="LULUS">LULUS (Akurasi Terpenuhi & Layak Praktikum)</option>
                    <option value="LULUS_BERSYARAT">LULUS BERSYARAT (Deviasi minor terkontrol)</option>
                    <option value="GAGAL">GAGAL (Perlu Servis / Penggantian)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teknisi / Laboran Penguji
                  </label>
                  <input
                    type="text"
                    required
                    value={testCalibratedBy}
                    onChange={(e) => setTestCalibratedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hasil Deviasi Terukur
                </label>
                <input
                  type="text"
                  value={testMeasuredDeviation}
                  onChange={(e) => setTestMeasuredDeviation(e.target.value)}
                  placeholder="Contoh: Deviasi +0.001 g pada beban uji 100g"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tindakan Penyesuaian / Perawatan
                </label>
                <input
                  type="text"
                  value={testActionTaken}
                  onChange={(e) => setTestActionTaken(e.target.value)}
                  placeholder="Contoh: Zero-tare adjustment, pembersihan probe kawat, pelumasan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Uji
                </label>
                <textarea
                  rows={2}
                  value={testNotes}
                  onChange={(e) => setTestNotes(e.target.value)}
                  placeholder="Kondisi fisik alat setelah uji coba kalibrasi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Hasil Uji Kalibrasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: DETAIL & SERTIFIKAT / STIKER KALIBRASI RESMI */}
      {isDetailModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">Sertifikat & Stiker Kalibrasi Digital</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sticker / Card View */}
            <div className="p-6 space-y-6">
              {/* Calibration Physical Sticker Simulation */}
              <div className="p-5 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-dashed border-teal-500/80 rounded-2xl shadow-inner relative overflow-hidden">
                {/* Top Badge */}
                <div className="flex items-center justify-between border-b border-teal-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-teal-900">
                      CALIBRATED & VERIFIED
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-500">
                    ID: {activeRecord.id}
                  </span>
                </div>

                <div className="my-4 space-y-2">
                  <div className="text-base font-extrabold text-slate-900 leading-tight">
                    {activeRecord.itemName}
                  </div>
                  <div className="text-xs font-mono text-slate-600 flex items-center gap-2">
                    <span>SN: <strong>{activeRecord.serialNumber}</strong></span>
                    <span>·</span>
                    <span>Kode: <strong>{activeRecord.itemCode}</strong></span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Lokasi: <strong>{LAB_DEFINITIONS[activeRecord.lab]?.name}</strong> ({activeRecord.locationRack})
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-teal-200/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Tanggal Kalibrasi</span>
                    <span className="font-mono font-extrabold text-slate-900">{activeRecord.lastCalibrationDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Jatuh Tempo Berikutnya</span>
                    <span className="font-mono font-extrabold text-teal-800">{activeRecord.nextCalibrationDueDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Teknisi Penguji</span>
                    <span className="font-semibold text-slate-800 truncate block">{activeRecord.calibratedBy}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Hasil Akurasi</span>
                    <span className="font-bold text-emerald-700">{activeRecord.result}</span>
                  </div>
                </div>

                {activeRecord.measuredDeviation && (
                  <div className="mt-3 p-2 bg-white/80 rounded-xl border border-teal-100 text-[11px] text-slate-600 font-mono">
                    <strong>Catatan Deviasi:</strong> {activeRecord.measuredDeviation}
                  </div>
                )}
              </div>

              {/* Additional Context Details */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Standar Acuan (Standard Reference):</span>
                  <span className="font-medium text-slate-800">{activeRecord.standardReference || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tindakan Penyesuaian:</span>
                  <span className="font-medium text-slate-800">{activeRecord.actionTaken || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Sertifikat / Berita Acara:</span>
                  <span className="font-mono font-bold text-teal-800">{activeRecord.certificateNumber || '-'}</span>
                </div>
                {activeRecord.notes && (
                  <div className="py-1">
                    <span className="text-slate-500 block mb-0.5">Catatan Khusus:</span>
                    <p className="p-2.5 bg-slate-50 rounded-xl text-slate-700 leading-relaxed">
                      {activeRecord.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Stiker Kalibrasi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
