import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useInventory } from '../context/InventoryContext';
import { LAB_DEFINITIONS, LabId, InventoryItem } from '../types/inventory';
import {
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Filter,
  Sparkles,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface MonthlyTrendsChartProps {
  defaultLab?: LabId | 'ALL';
}

interface ProcurementRecommendation {
  item: InventoryItem;
  currentStock: number;
  minStockAlert: number;
  monthlyBurnRate: number;
  stockLifespanDays: number;
  recommendedOrder: number;
  urgency: 'KRITIS' | 'WASPADA' | 'TERJADWAL';
  reason: string;
}

export const MonthlyTrendsChart: React.FC<MonthlyTrendsChartProps> = ({
  defaultLab = 'ALL',
}) => {
  const { transactions, items, showToast } = useInventory();
  const [selectedLab, setSelectedLab] = useState<LabId | 'ALL'>(defaultLab);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Forecasting feature states
  const [enableForecast, setEnableForecast] = useState<boolean>(true);
  const [forecastHorizon, setForecastHorizon] = useState<'nov-des' | 'q1-next'>('nov-des');
  const [isRecommendationOpen, setIsRecommendationOpen] = useState<boolean>(true);
  const [recommendationFilter, setRecommendationFilter] = useState<'ALL' | 'KRITIS' | 'CHEMICAL' | 'TOOLS'>('ALL');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const monthLabels = [
    { num: 1, name: 'Januari', short: 'Jan', isActual: true },
    { num: 2, name: 'Februari', short: 'Feb', isActual: true },
    { num: 3, name: 'Maret', short: 'Mar', isActual: true },
    { num: 4, name: 'April', short: 'Apr', isActual: true },
    { num: 5, name: 'Mei', short: 'Mei', isActual: true },
    { num: 6, name: 'Juni', short: 'Jun', isActual: true },
    { num: 7, name: 'Juli', short: 'Jul', isActual: true },
    { num: 8, name: 'Agustus', short: 'Agu', isActual: true },
    { num: 9, name: 'September', short: 'Sep', isActual: true },
    { num: 10, name: 'Oktober', short: 'Okt', isActual: true },
    { num: 11, name: 'November', short: 'Nov', isActual: false },
    { num: 12, name: 'Desember', short: 'Des', isActual: false },
  ];

  // Calculate monthly stats from actual transactions for historical months (Jan-Okt 2026)
  // and run Weighted Moving Average (WMA) + Trend Projection for Nov-Des 2026
  const monthlyData = useMemo(() => {
    // 1. Calculate actual numbers for Jan - Okt
    const rawData = monthLabels.map((m) => {
      const monthPrefix = `2026-${m.num < 10 ? `0${m.num}` : m.num}`;

      const txInMonth = transactions.filter((tx) => {
        const matchesDate = tx.date.startsWith(monthPrefix);
        if (!matchesDate) return false;
        if (selectedLab !== 'ALL') {
          return tx.targetLab === selectedLab || tx.fromLab === selectedLab;
        }
        return true;
      });

      let masuk = 0;
      let keluar = 0;

      txInMonth.forEach((tx) => {
        if (tx.type === 'IN') {
          masuk += tx.quantity;
        } else if (tx.type === 'OUT') {
          keluar += tx.quantity;
        }
      });

      return {
        monthName: m.name,
        monthShort: m.short,
        monthNum: m.num,
        isActual: m.isActual,
        masuk,
        keluar,
        netto: masuk - keluar,
        totalAktivitas: masuk + keluar,
        forecastMasuk: 0,
        forecastKeluar: 0,
      };
    });

    // 2. Compute Weighted Moving Average (WMA-3) & Trend Momentum from recent active months (Agu, Sep, Okt)
    const aguKeluar = rawData[7]?.keluar || 0;
    const sepKeluar = rawData[8]?.keluar || 0;
    const oktKeluar = rawData[9]?.keluar || 0;

    const aguMasuk = rawData[7]?.masuk || 0;
    const sepMasuk = rawData[8]?.masuk || 0;
    const oktMasuk = rawData[9]?.masuk || 0;

    // Weighted average: October weight 3, September weight 2, August weight 1
    const wmaKeluar = (oktKeluar * 3 + sepKeluar * 2 + aguKeluar * 1) / 6;
    const trendKeluarSlope = (oktKeluar - aguKeluar) / 2;

    const wmaMasuk = (oktMasuk * 3 + sepMasuk * 2 + aguMasuk * 1) / 6;

    // Projected consumption for November & December
    // Nov: peak practicum semester ganjil preparation for final assessment
    const projKeluarNov = Math.max(
      Math.round(wmaKeluar + trendKeluarSlope * 0.4),
      Math.round(wmaKeluar * 0.95),
      8
    );
    // Safety buffer replenishment recommended for Nov
    const projMasukNov = Math.max(Math.round(projKeluarNov * 1.2), Math.round(wmaMasuk * 1.1), 12);

    // Des: semester closing, stock count & buffer for semester genap 2027
    const projKeluarDes = Math.max(
      Math.round(wmaKeluar + trendKeluarSlope * 0.8),
      Math.round(wmaKeluar * 0.85),
      6
    );
    // Procurement recommended for semester genap restock in December
    const projMasukDes = Math.max(Math.round(projKeluarDes * 1.35), Math.round(wmaMasuk * 1.25), 18);

    // 3. Attach projection to November (10) and December (11)
    if (enableForecast) {
      // Nov
      rawData[10].forecastKeluar = projKeluarNov;
      rawData[10].forecastMasuk = projMasukNov;
      rawData[10].keluar = projKeluarNov; // For unified chart rendering
      rawData[10].masuk = projMasukNov;
      rawData[10].netto = projMasukNov - projKeluarNov;

      // Des
      rawData[11].forecastKeluar = projKeluarDes;
      rawData[11].forecastMasuk = projMasukDes;
      rawData[11].keluar = projKeluarDes;
      rawData[11].masuk = projMasukDes;
      rawData[11].netto = projMasukDes - projKeluarDes;
    }

    return rawData;
  }, [transactions, selectedLab, enableForecast]);

  // Aggregate insights (Memoized)
  const {
    totalMasukYear,
    totalKeluarYear,
    peakKeluarMonth,
    forecastNextMonthKeluar,
    forecastNextMonthMasuk,
  } = useMemo(() => {
    let masukSum = 0;
    let keluarSum = 0;
    let maxKeluar = -1;
    let peak = monthlyData[0];

    // Compute actual historical sum (Jan-Okt)
    monthlyData.forEach((d) => {
      if (d.isActual) {
        masukSum += d.masuk;
        keluarSum += d.keluar;
        if (d.keluar > maxKeluar) {
          maxKeluar = d.keluar;
          peak = d;
        }
      }
    });

    const novData = monthlyData[10];

    return {
      totalMasukYear: masukSum,
      totalKeluarYear: keluarSum,
      peakKeluarMonth: peak,
      forecastNextMonthKeluar: novData?.forecastKeluar || 0,
      forecastNextMonthMasuk: novData?.forecastMasuk || 0,
    };
  }, [monthlyData]);

  // Inventory Item-Level Forecasting & Procurement Recommendations
  const procurementRecommendations = useMemo(() => {
    const list: ProcurementRecommendation[] = [];

    items.forEach((item) => {
      // Lab filter check
      if (selectedLab !== 'ALL') {
        const itemInLab =
          item.primaryLab === selectedLab || (item.distribution?.[selectedLab] || 0) > 0;
        if (!itemInLab) return;
      }

      const currentStock =
        selectedLab === 'ALL'
          ? item.currentTotalStock
          : item.distribution?.[selectedLab] || 0;

      // Calculate recent burn rate based on historical outbound
      const relevantTxs = transactions.filter(
        (t) =>
          t.itemId === item.id &&
          t.type === 'OUT' &&
          (selectedLab === 'ALL' || t.targetLab === selectedLab || t.fromLab === selectedLab)
      );

      const actualOutUnits = relevantTxs.reduce((sum, t) => sum + t.quantity, 0);
      // Fallback burn rate: historical out over 10 months or scaled from item.totalOut
      const totalOutCount = actualOutUnits > 0 ? actualOutUnits : item.totalOut;
      const monthlyBurnRate = Math.max(0.1, Math.round((totalOutCount / 10) * 10) / 10);

      // Remaining stock lifespan in days
      const dailyBurnRate = monthlyBurnRate / 30;
      const stockLifespanDays =
        dailyBurnRate > 0
          ? Math.round(currentStock / dailyBurnRate)
          : currentStock === 0
          ? 0
          : 999;

      // Recommended restock formula:
      // Safety Stock = 2x Minimum Alert + 2 Bulan Konsumsi Rutin
      const safetyBuffer = Math.max(
        item.minStockAlert * 2,
        Math.ceil(monthlyBurnRate * 2.5),
        item.category === 'Bahan Kimia & Reagen' ? 3 : 4
      );

      const defectReplacement = item.conditionHeavyDamage || 0;
      const recommendedOrder = Math.max(
        0,
        Math.ceil(safetyBuffer - currentStock + defectReplacement)
      );

      // Urgency determination
      let urgency: 'KRITIS' | 'WASPADA' | 'TERJADWAL' = 'TERJADWAL';
      let reason = 'Pemenuhan stok pengaman laboratorium';

      if (currentStock <= item.minStockAlert || stockLifespanDays <= 30) {
        urgency = 'KRITIS';
        reason = `Stok kritis (${currentStock} ${item.unit}), estimasi habis dalam ~${stockLifespanDays} hari praktikum.`;
      } else if (stockLifespanDays <= 60 || currentStock <= item.minStockAlert * 1.5) {
        urgency = 'WASPADA';
        reason = `Mendekati ambang batas minimum. Konsumsi rata-rata ~${monthlyBurnRate} ${item.unit}/bulan.`;
      } else if (defectReplacement > 0) {
        urgency = 'WASPADA';
        reason = `Terdapat ${defectReplacement} unit rusak berat yang perlu diganti.`;
      }

      // Filter: only include items that genuinely need replenishment or attention
      if (recommendedOrder > 0 || currentStock <= item.minStockAlert * 1.5) {
        list.push({
          item,
          currentStock,
          minStockAlert: item.minStockAlert,
          monthlyBurnRate,
          stockLifespanDays,
          recommendedOrder: Math.max(recommendedOrder, 1),
          urgency,
          reason,
        });
      }
    });

    // Sort: KRITIS first, then WASPADA, then lowest days remaining
    return list.sort((a, b) => {
      const priorityOrder = { KRITIS: 0, WASPADA: 1, TERJADWAL: 2 };
      if (priorityOrder[a.urgency] !== priorityOrder[b.urgency]) {
        return priorityOrder[a.urgency] - priorityOrder[b.urgency];
      }
      return a.stockLifespanDays - b.stockLifespanDays;
    });
  }, [items, transactions, selectedLab]);

  // Filtered recommendations based on tab chip
  const filteredRecommendations = useMemo(() => {
    switch (recommendationFilter) {
      case 'KRITIS':
        return procurementRecommendations.filter((r) => r.urgency === 'KRITIS');
      case 'CHEMICAL':
        return procurementRecommendations.filter(
          (r) => r.item.category === 'Bahan Kimia & Reagen'
        );
      case 'TOOLS':
        return procurementRecommendations.filter(
          (r) => r.item.category !== 'Bahan Kimia & Reagen'
        );
      default:
        return procurementRecommendations;
    }
  }, [procurementRecommendations, recommendationFilter]);

  // Copy recommendation plan to clipboard
  const handleCopyRecommendations = () => {
    if (procurementRecommendations.length === 0) {
      showToast({
        type: 'info',
        title: 'Tidak Ada Rekomendasi',
        message: 'Semua stok dalam kondisi optimal dan aman.',
      });
      return;
    }

    const header = [
      'No',
      'Kode Barang',
      'Nama Barang',
      'Kategori',
      'Lab',
      'Stok Saat Ini',
      'Ambang Batas',
      'Laju Konsumsi/Bln',
      'Ketahanan (Hari)',
      'Rekomendasi PO',
      'Satuan',
      'Urgensi',
      'Catatan / Alasan',
    ].join('\t');

    const rows = procurementRecommendations.map((r, idx) => {
      return [
        idx + 1,
        r.item.code,
        r.item.name,
        r.item.category,
        LAB_DEFINITIONS[r.item.primaryLab as LabId]?.shortName || r.item.primaryLab,
        r.currentStock,
        r.minStockAlert,
        r.monthlyBurnRate,
        r.stockLifespanDays,
        r.recommendedOrder,
        r.item.unit,
        r.urgency,
        r.reason,
      ].join('\t');
    });

    const fullText = `RENCANA REKOMENDASI PENGADAAN INVENTARIS LAB 2026\nSistem Peramalan Otomatis SIMLAB SMA & SMP IT Ar-Rahmah Cendekia\nDicatat pada: ${new Date().toLocaleDateString(
      'id-ID'
    )}\n\n${header}\n${rows.join('\n')}`;

    navigator.clipboard
      .writeText(fullText)
      .then(() => {
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2500);
        showToast({
          type: 'success',
          title: 'Rekomendasi Berhasil Disalin',
          message: `${procurementRecommendations.length} data pengadaan siap ditempel (paste) ke Microsoft Excel atau Google Sheets.`,
        });
      })
      .catch(() => {
        showToast({
          type: 'error',
          title: 'Gagal Menyalin',
          message: 'Izin clipboard ditolak oleh peramban.',
        });
      });
  };

  // Custom clean tooltip matching design constitution
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isProjected = !data.isActual && enableForecast;

      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-2 backdrop-blur-md min-w-[220px]">
          <div className="font-bold border-b border-slate-700 pb-1.5 flex items-center justify-between">
            <span className={isProjected ? 'text-violet-300 font-bold' : 'text-emerald-300 font-bold'}>
              Bulan {data.monthName} 2026
            </span>
            {isProjected ? (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-violet-900/80 text-violet-200 border border-violet-500/40">
                ✨ Peramalan (WMA)
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400">Data Aktual</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-xs shrink-0 ${
                  isProjected ? 'bg-violet-400' : 'bg-emerald-500'
                }`}
              />
              <span>
                {isProjected ? 'Saran Pengadaan (Restock):' : 'Barang Masuk (Pengadaan):'}
              </span>
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                isProjected ? 'text-violet-300' : 'text-emerald-400'
              }`}
            >
              +{data.masuk} unit
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-xs shrink-0 ${
                  isProjected ? 'bg-amber-400' : 'bg-amber-500'
                }`}
              />
              <span>
                {isProjected ? 'Proyeksi Pemakaian Praktikum:' : 'Barang Keluar (Praktikum):'}
              </span>
            </span>
            <span className="font-mono font-bold text-amber-400 tabular-nums">
              -{data.keluar} unit
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">
              {isProjected ? 'Estimasi Saldo Netto:' : 'Selisih Netto:'}
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                data.netto >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {data.netto >= 0 ? `+${data.netto}` : data.netto} unit
            </span>
          </div>

          {isProjected && (
            <div className="pt-1 text-[10px] text-violet-300/80 italic">
              *Dihitung dari tren mutasi 3 bulan terakhir & buffer semester.
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/95 backdrop-blur-xs p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
      {/* Chart Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-teal-800 rounded-xl">
              <TrendingUp className="w-4 h-4 text-teal-700" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Tren Mutasi & Peramalan Kebutuhan Stok (Forecasting) 2026
            </h2>
            {enableForecast && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10.5px] font-bold">
                <Sparkles className="w-3 h-3 text-violet-600" />
                <span>Forecasting Aktif</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Monitoring historis mutasi masuk/keluar serta proyeksi cerdas kebutuhan pengadaan sarpras laboratorium masa depan.
          </p>
        </div>

        {/* Filter and View Toggles (hidden on print) */}
        <div className="no-print flex flex-wrap items-center gap-2">
          {/* Forecasting Toggle Switch */}
          <button
            onClick={() => setEnableForecast(!enableForecast)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs ${
              enableForecast
                ? 'bg-violet-600 text-white border-violet-700 shadow-violet-200 hover:bg-violet-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Aktifkan atau nonaktifkan fitur peramalan stok berbasis moving average"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{enableForecast ? 'Peramalan: Aktif' : 'Aktifkan Peramalan'}</span>
          </button>

          {/* Lab Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Seluruh Laboratorium IPA Terpadu</option>
              <option value="FISIKA">Fisika (SMA)</option>
              <option value="KIMIA">Kimia (SMA)</option>
              <option value="BIOLOGI">Biologi (SMA)</option>
              <option value="SMP_TERPADU">IPA Terpadu (SMP)</option>
            </select>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
                chartType === 'bar'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grafik Batang Komparasi"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Batang</span>
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
                chartType === 'area'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grafik Kurva Area Tren"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Area Tren</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip with Forecasting Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Realisasi Masuk (Jan-Okt)
          </span>
          <span className="font-mono text-base font-bold text-emerald-700 tabular-nums">
            +{totalMasukYear.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-normal text-slate-500">unit</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Realisasi Keluar (Praktikum)
          </span>
          <span className="font-mono text-base font-bold text-amber-700 tabular-nums">
            -{totalKeluarYear.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-normal text-slate-500">unit</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-violet-700 uppercase font-bold flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Prediksi Nov 2026</span>
          </span>
          <span className="font-mono text-base font-bold text-violet-800 tabular-nums">
            ~{forecastNextMonthKeluar}{' '}
            <span className="text-xs font-normal text-slate-500">unit keluar</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Saran Restock Nov-Des
          </span>
          <span className="font-mono text-base font-bold text-teal-700 tabular-nums">
            +{forecastNextMonthMasuk}{' '}
            <span className="text-xs font-normal text-slate-500">unit PO</span>
          </span>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="w-full h-72 sm:h-80 pt-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={monthlyData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="monthShort"
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => {
                  const isProj = enableForecast && (payload.value === 'Nov' || payload.value === 'Des');
                  return (
                    <text
                      x={x}
                      y={Number(y) + 12}
                      textAnchor="middle"
                      fill={isProj ? '#7c3aed' : '#64748b'}
                      fontSize={11}
                      fontWeight={isProj ? 700 : 500}
                    >
                      {payload.value}
                      {isProj ? '*' : ''}
                    </text>
                  );
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 15, fontSize: 11 }}
                formatter={(value) => (
                  <span className="font-semibold text-slate-700">
                    {value === 'masuk'
                      ? 'Barang Masuk / Saran Pengadaan'
                      : 'Barang Keluar / Proyeksi Praktikum'}
                  </span>
                )}
              />

              {/* Reference line separating actual data (Jan-Okt) and forecast (Nov-Des) */}
              {enableForecast && (
                <ReferenceLine
                  x="Okt"
                  stroke="#8b5cf6"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Batas Aktual / Peramalan →',
                    position: 'insideTopRight',
                    fill: '#7c3aed',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}

              <Bar
                dataKey="masuk"
                name="masuk"
                fill="#059669"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Bar
                dataKey="keluar"
                name="keluar"
                fill="#d97706"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          ) : (
            <AreaChart data={monthlyData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="monthShort"
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => {
                  const isProj = enableForecast && (payload.value === 'Nov' || payload.value === 'Des');
                  return (
                    <text
                      x={x}
                      y={Number(y) + 12}
                      textAnchor="middle"
                      fill={isProj ? '#7c3aed' : '#64748b'}
                      fontSize={11}
                      fontWeight={isProj ? 700 : 500}
                    >
                      {payload.value}
                      {isProj ? '*' : ''}
                    </text>
                  );
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 15, fontSize: 11 }}
                formatter={(value) => (
                  <span className="font-semibold text-slate-700">
                    {value === 'masuk'
                      ? 'Barang Masuk / Saran Pengadaan'
                      : 'Barang Keluar / Proyeksi Praktikum'}
                  </span>
                )}
              />

              {enableForecast && (
                <ReferenceLine
                  x="Okt"
                  stroke="#8b5cf6"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Batas Aktual / Peramalan →',
                    position: 'insideTopRight',
                    fill: '#7c3aed',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey="masuk"
                name="masuk"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorMasuk)"
              />
              <Area
                type="monotone"
                dataKey="keluar"
                name="keluar"
                stroke="#d97706"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorKeluar)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Explanatory Note on Chart */}
      {enableForecast && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-violet-50/60 p-2.5 rounded-xl border border-violet-100">
          <Info className="w-3.5 h-3.5 text-violet-600 shrink-0" />
          <span>
            <strong>Keterangan Tanda Bintang (*):</strong> Kolom <strong>Nov*</strong> dan{' '}
            <strong>Des*</strong> merupakan hasil peramalan statistik menggunakan model{' '}
            <em>Weighted Moving Average (WMA-3)</em> dan laju tren praktikum akhir semester untuk memitigasi risiko kelangkaan alat praktikum.
          </span>
        </div>
      )}

      {/* SECTION: PROCUREMENT RECOMMENDATIONS (Rekomendasi Pengadaan Barang Masa Depan) */}
      <div className="pt-2 border-t border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 text-amber-800 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Rekomendasi Pengadaan Barang Masa Depan</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {procurementRecommendations.length} Barang Perlu Perhatian
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Disusun otomatis berdasarkan ambang batas minimum, rasio kerusakan, dan proyeksi laju konsumsi bulanan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyRecommendations}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              title="Salin tabel rekomendasi dalam format TSV untuk Microsoft Excel / Google Sheets"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Salin ke Excel</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsRecommendationOpen(!isRecommendationOpen)}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              title={isRecommendationOpen ? 'Sembunyikan Tabel' : 'Tampilkan Tabel'}
            >
              {isRecommendationOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Table Content */}
        {isRecommendationOpen && (
          <div className="space-y-3 pt-2">
            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setRecommendationFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  recommendationFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Kebutuhan ({procurementRecommendations.length})
              </button>
              <button
                onClick={() => setRecommendationFilter('KRITIS')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  recommendationFilter === 'KRITIS'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-500" />
                <span>
                  Kritis / Habis ({procurementRecommendations.filter((r) => r.urgency === 'KRITIS').length})
                </span>
              </button>
              <button
                onClick={() => setRecommendationFilter('CHEMICAL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  recommendationFilter === 'CHEMICAL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Bahan Kimia & Reagen ({
                  procurementRecommendations.filter(
                    (r) => r.item.category === 'Bahan Kimia & Reagen'
                  ).length
                })
              </button>
              <button
                onClick={() => setRecommendationFilter('TOOLS')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  recommendationFilter === 'TOOLS'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                }`}
              >
                Alat & Perkakas Praktikum ({
                  procurementRecommendations.filter(
                    (r) => r.item.category !== 'Bahan Kimia & Reagen'
                  ).length
                })
              </button>
            </div>

            {/* Recommendations Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Kode & Nama Barang</th>
                    <th className="py-2.5 px-3">Lab</th>
                    <th className="py-2.5 px-3 text-center">Stok Saat Ini</th>
                    <th className="py-2.5 px-3 text-center">Laju Pakai</th>
                    <th className="py-2.5 px-3 text-center">Ketahanan</th>
                    <th className="py-2.5 px-3 text-center font-bold text-teal-800">Saran PO Restock</th>
                    <th className="py-2.5 px-3">Urgensi & Analisis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecommendations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                        <p className="font-semibold text-slate-600">Tidak ada barang yang memerlukan pengadaan pada filter ini.</p>
                        <p className="text-[11px] text-slate-400">Stok masih di atas ambang batas aman operasional.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecommendations.map((rec) => {
                      const labDef = LAB_DEFINITIONS[rec.item.primaryLab as LabId];

                      return (
                        <tr
                          key={rec.item.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{rec.item.name}</div>
                            <div className="text-[10.5px] font-mono text-slate-400">
                              {rec.item.code} · <span className="text-slate-500">{rec.item.category}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                                labDef?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {labDef?.shortName || rec.item.primaryLab}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span
                              className={`font-bold ${
                                rec.currentStock <= rec.minStockAlert
                                  ? 'text-rose-600'
                                  : 'text-slate-700'
                              }`}
                            >
                              {rec.currentStock}
                            </span>{' '}
                            <span className="text-[10px] text-slate-400">{rec.item.unit}</span>
                            <div className="text-[10px] text-slate-400">
                              Min: {rec.minStockAlert}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            ~{rec.monthlyBurnRate}{' '}
                            <span className="text-[10px] text-slate-400">/bln</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                            {rec.stockLifespanDays <= 30 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                <Clock className="w-2.5 h-2.5" /> ~{rec.stockLifespanDays} hari
                              </span>
                            ) : rec.stockLifespanDays <= 60 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                ~{Math.round(rec.stockLifespanDays / 30)} bulan
                              </span>
                            ) : (
                              <span className="text-emerald-700 text-[11px] font-semibold">
                                Aman (&gt;2 bln)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-black text-xs">
                              +{rec.recommendedOrder} {rec.item.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {rec.urgency === 'KRITIS' ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[9.5px]">
                                  KRITIS
                                </span>
                              ) : rec.urgency === 'WASPADA' ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[9.5px]">
                                  WASPADA
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[9.5px]">
                                  TERJADWAL
                                </span>
                              )}
                              <span className="text-[11px] text-slate-600 line-clamp-1" title={rec.reason}>
                                {rec.reason}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Procurement Planning Footer Insight */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>
                  Kebutuhan restock dihitung untuk mengamankan operasional praktikum selama 2–3 bulan ke depan termasuk antisipasi penggantian alat rusak.
                </span>
              </div>
              <span className="font-mono text-slate-700 text-[11px] font-semibold shrink-0">
                Total Estimasi Restock:{' '}
                <strong className="text-teal-700">
                  {procurementRecommendations.reduce((sum, r) => sum + r.recommendedOrder, 0)} unit
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
