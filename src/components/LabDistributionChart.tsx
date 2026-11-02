import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useInventory } from '../context/InventoryContext';
import { LabId, ItemCategory, LAB_DEFINITIONS } from '../types/inventory';
import { calculatePhysicalPackagingCount } from '../utils/excelImportParser';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Atom,
  FlaskConical,
  Dna,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  SlidersHorizontal,
  GraduationCap,
} from 'lucide-react';

interface LabDistributionChartProps {
  onSelectLabFilter?: (labId: LabId | 'ALL') => void;
}

const CATEGORIES: ItemCategory[] = [
  'Alat Ukur & Neraca',
  'Alat Gelas & Keramik',
  'Bahan Kimia & Reagen',
  'Instrumen Optik',
  'Model & Preparat Biologi',
  'Kit Praktikum Terpadu',
  'Perkakas & Keselamatan Kerja',
];

// Short category labels for responsive chart axes
const CATEGORY_SHORT_LABELS: Record<ItemCategory, string> = {
  'Alat Ukur & Neraca': 'Ukur & Neraca',
  'Alat Gelas & Keramik': 'Gelas & Keramik',
  'Bahan Kimia & Reagen': 'Bahan Kimia',
  'Instrumen Optik': 'Optik',
  'Model & Preparat Biologi': 'Preparat & Model',
  'Kit Praktikum Terpadu': 'Kit Terpadu',
  'Perkakas & Keselamatan Kerja': 'K3 & Perkakas',
};

// Brand colors aligned with SIMLAB styling
const LAB_COLORS: Record<string, { main: string; hover: string; bg: string; text: string; border: string }> = {
  FISIKA: {
    main: '#0284c7', // sky-600
    hover: '#0369a1',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
  },
  KIMIA: {
    main: '#d97706', // amber-600
    hover: '#b45309',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  BIOLOGI: {
    main: '#059669', // emerald-600
    hover: '#047857',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  SMP_TERPADU: {
    main: '#6366f1', // indigo-500
    hover: '#4f46e5',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
};

export const LabDistributionChart: React.FC<LabDistributionChartProps> = ({
  onSelectLabFilter,
}) => {
  const { items } = useInventory();

  // Controls state
  const [activeView, setActiveView] = useState<'category-bar' | 'lab-pie' | 'condition-bar'>('category-bar');
  const [metricMode, setMetricMode] = useState<'units' | 'items'>('units'); // physical units vs catalog item count
  const [isStacked, setIsStacked] = useState(false);
  const [includeSmp, setIncludeSmp] = useState(false);
  const [hoveredLab, setHoveredLab] = useState<string | null>(null);

  // Labs to display
  const activeLabs: LabId[] = useMemo(() => {
    return includeSmp
      ? ['FISIKA', 'KIMIA', 'BIOLOGI', 'SMP_TERPADU']
      : ['FISIKA', 'KIMIA', 'BIOLOGI'];
  }, [includeSmp]);

  // Aggregated data per laboratory
  const labSummary = useMemo(() => {
    const summary: Record<
      LabId,
      {
        totalUnits: number;
        totalItems: number;
        goodUnits: number;
        lightDamageUnits: number;
        heavyDamageUnits: number;
        topCategory: { name: string; count: number };
        categoryBreakdown: Record<ItemCategory, { units: number; items: number }>;
      }
    > = {
      FISIKA: {
        totalUnits: 0,
        totalItems: 0,
        goodUnits: 0,
        lightDamageUnits: 0,
        heavyDamageUnits: 0,
        topCategory: { name: '-', count: 0 },
        categoryBreakdown: {} as any,
      },
      KIMIA: {
        totalUnits: 0,
        totalItems: 0,
        goodUnits: 0,
        lightDamageUnits: 0,
        heavyDamageUnits: 0,
        topCategory: { name: '-', count: 0 },
        categoryBreakdown: {} as any,
      },
      BIOLOGI: {
        totalUnits: 0,
        totalItems: 0,
        goodUnits: 0,
        lightDamageUnits: 0,
        heavyDamageUnits: 0,
        topCategory: { name: '-', count: 0 },
        categoryBreakdown: {} as any,
      },
      SMP_TERPADU: {
        totalUnits: 0,
        totalItems: 0,
        goodUnits: 0,
        lightDamageUnits: 0,
        heavyDamageUnits: 0,
        topCategory: { name: '-', count: 0 },
        categoryBreakdown: {} as any,
      },
    };

    // Initialize category breakdown
    (Object.keys(summary) as LabId[]).forEach((lab) => {
      CATEGORIES.forEach((cat) => {
        summary[lab].categoryBreakdown[cat] = { units: 0, items: 0 };
      });
    });

    items.forEach((item) => {
      const allLabs: LabId[] = ['FISIKA', 'KIMIA', 'BIOLOGI', 'SMP_TERPADU'];

      allLabs.forEach((lab) => {
        const units = calculatePhysicalPackagingCount(item, lab);
        const hasStock = units > 0 || (item.distribution?.[lab] || 0) > 0;
        const isPrimary = item.primaryLab === lab;

        if (units > 0 || isPrimary) {
          summary[lab].totalUnits += units;
          if (hasStock || isPrimary) {
            summary[lab].totalItems += 1;
          }

          if (summary[lab].categoryBreakdown[item.category]) {
            summary[lab].categoryBreakdown[item.category].units += units;
            if (hasStock || isPrimary) {
              summary[lab].categoryBreakdown[item.category].items += 1;
            }
          }

          // Estimate condition in this lab proportionally
          if (item.currentTotalStock > 0 && units > 0) {
            const ratioGood = item.conditionGood / item.currentTotalStock;
            const ratioLight = item.conditionLightDamage / item.currentTotalStock;
            const ratioHeavy = item.conditionHeavyDamage / item.currentTotalStock;

            summary[lab].goodUnits += Math.round(units * ratioGood);
            summary[lab].lightDamageUnits += Math.round(units * ratioLight);
            summary[lab].heavyDamageUnits += Math.round(units * ratioHeavy);
          }
        }
      });
    });

    // Determine top category per lab
    (Object.keys(summary) as LabId[]).forEach((lab) => {
      let maxCat = '-';
      let maxVal = -1;
      CATEGORIES.forEach((cat) => {
        const val = summary[lab].categoryBreakdown[cat]?.units || 0;
        if (val > maxVal) {
          maxVal = val;
          maxCat = cat;
        }
      });
      summary[lab].topCategory = { name: maxCat, count: maxVal };
    });

    return summary;
  }, [items]);

  // Overall totals across selected labs
  const overallMetrics = useMemo(() => {
    let unitsSum = 0;
    let itemsSum = 0;
    activeLabs.forEach((lab) => {
      unitsSum += labSummary[lab].totalUnits;
      itemsSum += labSummary[lab].totalItems;
    });
    return {
      totalUnits: unitsSum,
      totalItems: itemsSum,
    };
  }, [activeLabs, labSummary]);

  // 1. Data for Category Bar Chart
  const categoryChartData = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const entry: Record<string, any> = {
        category: cat,
        shortCategory: CATEGORY_SHORT_LABELS[cat] || cat,
      };

      let catTotal = 0;
      activeLabs.forEach((lab) => {
        const val =
          metricMode === 'units'
            ? labSummary[lab].categoryBreakdown[cat]?.units || 0
            : labSummary[lab].categoryBreakdown[cat]?.items || 0;
        entry[lab] = val;
        catTotal += val;
      });

      entry.total = catTotal;
      return entry;
    });
  }, [activeLabs, labSummary, metricMode]);

  // 2. Data for Lab Pie/Donut Chart
  const pieChartData = useMemo(() => {
    return activeLabs.map((lab) => {
      const val =
        metricMode === 'units'
          ? labSummary[lab].totalUnits
          : labSummary[lab].totalItems;
      const total = metricMode === 'units' ? overallMetrics.totalUnits : overallMetrics.totalItems;
      const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0';

      return {
        labId: lab,
        name: LAB_DEFINITIONS[lab]?.shortName || lab,
        fullName: LAB_DEFINITIONS[lab]?.name || lab,
        value: val,
        percentage: Number(percent),
        color: LAB_COLORS[lab]?.main || '#0ea5e9',
        good: labSummary[lab].goodUnits,
        lightDamage: labSummary[lab].lightDamageUnits,
        heavyDamage: labSummary[lab].heavyDamageUnits,
      };
    });
  }, [activeLabs, labSummary, metricMode, overallMetrics]);

  // 3. Data for Condition Bar Chart
  const conditionChartData = useMemo(() => {
    return activeLabs.map((lab) => {
      const s = labSummary[lab];
      return {
        labId: lab,
        name: LAB_DEFINITIONS[lab]?.shortName || lab,
        fullName: LAB_DEFINITIONS[lab]?.name || lab,
        'Kondisi Baik': s.goodUnits,
        'Rusak Ringan': s.lightDamageUnits,
        'Rusak Berat': s.heavyDamageUnits,
        total: s.totalUnits,
      };
    });
  }, [activeLabs, labSummary]);

  // Custom Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const totalInRow = data?.total || 0;

      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-2 backdrop-blur-md min-w-[210px]">
          <div className="font-bold text-white border-b border-slate-700 pb-1.5 flex items-center justify-between">
            <span className="text-teal-300">{data?.category || label}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Total: {totalInRow} {metricMode === 'units' ? 'Unit' : 'Item'}
            </span>
          </div>
          <div className="space-y-1.5 pt-0.5">
            {payload.map((entry: any) => {
              const labKey = entry.dataKey as LabId;
              const labDef = LAB_DEFINITIONS[labKey];
              const labVal = entry.value || 0;
              const pct = totalInRow > 0 ? Math.round((labVal / totalInRow) * 100) : 0;

              return (
                <div key={labKey} className="flex items-center justify-between gap-3 text-slate-200">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium">{labDef?.shortName || labKey}</span>
                  </div>
                  <div className="font-mono text-right">
                    <span className="font-bold text-white">{labVal}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-1.5 backdrop-blur-md min-w-[200px]">
          <div className="font-bold text-white border-b border-slate-700 pb-1.5 flex items-center justify-between">
            <span style={{ color: data.color }}>{data.fullName}</span>
            <span className="font-mono font-bold text-amber-300">{data.percentage}%</span>
          </div>
          <div className="flex justify-between text-slate-300 pt-1">
            <span>{metricMode === 'units' ? 'Total Stok Fisik:' : 'Katalog Judul Barang:'}</span>
            <span className="font-bold text-white font-mono">
              {data.value} {metricMode === 'units' ? 'Unit' : 'Item'}
            </span>
          </div>
          {metricMode === 'units' && (
            <div className="pt-1.5 border-t border-slate-800 text-[11px] space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span className="text-emerald-400">Baik:</span>
                <span className="font-mono text-white">{data.good} unit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400">Rusak Ringan:</span>
                <span className="font-mono text-white">{data.lightDamage} unit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400">Rusak Berat:</span>
                <span className="font-mono text-white">{data.heavyDamage} unit</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Condition Chart
  const CustomConditionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-2 backdrop-blur-md min-w-[210px]">
          <div className="font-bold text-teal-300 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>{data?.fullName || label}</span>
            <span className="font-mono text-[10px] text-slate-400">Total: {data?.total} Unit</span>
          </div>
          <div className="space-y-1.5">
            {payload.map((entry: any) => {
              const val = entry.value || 0;
              const pct = data?.total > 0 ? Math.round((val / data.total) * 100) : 0;
              return (
                <div key={entry.name} className="flex items-center justify-between gap-3 text-slate-200">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                  <div className="font-mono">
                    <span className="font-bold text-white">{val}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/95 backdrop-blur-xs p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10.5px] font-bold uppercase tracking-wider">
              <BarChart3 className="w-3 h-3 text-teal-600" />
              <span>Visualisasi Data Recharts</span>
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">· Realtime Inventory</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <span>Distribusi Barang per Kategori Laboratorium</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Perbandingan proporsi barang, kategori inventaris, dan kondisi alat antara{' '}
            <strong className="text-sky-700 font-semibold">Laboratorium Fisika</strong>,{' '}
            <strong className="text-amber-700 font-semibold">Kimia</strong>, dan{' '}
            <strong className="text-emerald-700 font-semibold">Biologi</strong>.
          </p>
        </div>

        {/* View Switchers & Mode Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart View Tabs */}
          <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setActiveView('category-bar')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeView === 'category-bar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Batang Komparasi Kategori"
            >
              <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
              <span>Kategori</span>
            </button>
            <button
              onClick={() => setActiveView('lab-pie')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeView === 'lab-pie'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Diagram Lingkaran Proporsi Lab"
            >
              <PieChartIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Proporsi Lab</span>
            </button>
            <button
              onClick={() => setActiveView('condition-bar')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeView === 'condition-bar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Kondisi Fisik Alat"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kondisi Alat</span>
            </button>
          </div>

          {/* Metric Selector: Units vs Items */}
          <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setMetricMode('units')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                metricMode === 'units'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Hitung berdasarkan jumlah unit fisik (pcs, botol, set)"
            >
              Unit Fisik
            </button>
            <button
              onClick={() => setMetricMode('items')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                metricMode === 'items'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Hitung berdasarkan ragam judul barang di katalog"
            >
              Judul Item
            </button>
          </div>

          {/* Sub options: Stack toggle for bar chart */}
          {activeView === 'category-bar' && (
            <button
              onClick={() => setIsStacked(!isStacked)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1 ${
                isStacked
                  ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Alihkan mode grafik antara berdampingan atau tertumpuk (stacked)"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{isStacked ? 'Tertumpuk' : 'Berdampingan'}</span>
            </button>
          )}

          {/* Optional SMP toggle */}
          <button
            onClick={() => setIncludeSmp(!includeSmp)}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1 ${
              includeSmp
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Sertakan Laboratorium IPA Terpadu SMP dalam perbandingan"
          >
            <GraduationCap className="w-3 h-3 text-indigo-500" />
            <span>+ IPA SMP</span>
          </button>
        </div>
      </div>

      {/* 2. Top Laboratory KPI Cards (Fisika, Kimia, Biologi) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {/* Fisika */}
        <div
          onMouseEnter={() => setHoveredLab('FISIKA')}
          onMouseLeave={() => setHoveredLab(null)}
          onClick={() => onSelectLabFilter && onSelectLabFilter('FISIKA')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            hoveredLab === 'FISIKA'
              ? 'border-sky-400 bg-sky-50/80 shadow-md -translate-y-0.5'
              : 'border-sky-200/80 bg-sky-50/40 hover:bg-sky-50/70 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-2xs">
                <Atom className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-sky-900">Lab Fisika</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              {overallMetrics.totalUnits > 0
                ? `${((labSummary.FISIKA.totalUnits / overallMetrics.totalUnits) * 100).toFixed(1)}%`
                : '0%'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {metricMode === 'units' ? labSummary.FISIKA.totalUnits : labSummary.FISIKA.totalItems}
              </span>
              <span className="text-xs font-semibold text-slate-500 ml-1.5">
                {metricMode === 'units' ? 'Unit Fisik' : 'Judul Item'}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
          </div>

          <div className="mt-2.5 pt-2 border-t border-sky-200/60 flex items-center justify-between text-[11px] text-slate-600">
            <span className="truncate max-w-[150px]" title={`Dominan: ${labSummary.FISIKA.topCategory.name}`}>
              Dominan: <strong className="text-sky-800 font-semibold">{labSummary.FISIKA.topCategory.name}</strong>
            </span>
            <span className="font-mono text-emerald-700 font-bold shrink-0">
              {labSummary.FISIKA.goodUnits} Baik
            </span>
          </div>
        </div>

        {/* Kimia */}
        <div
          onMouseEnter={() => setHoveredLab('KIMIA')}
          onMouseLeave={() => setHoveredLab(null)}
          onClick={() => onSelectLabFilter && onSelectLabFilter('KIMIA')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            hoveredLab === 'KIMIA'
              ? 'border-amber-400 bg-amber-50/80 shadow-md -translate-y-0.5'
              : 'border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
                <FlaskConical className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-amber-900">Lab Kimia</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {overallMetrics.totalUnits > 0
                ? `${((labSummary.KIMIA.totalUnits / overallMetrics.totalUnits) * 100).toFixed(1)}%`
                : '0%'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {metricMode === 'units' ? labSummary.KIMIA.totalUnits : labSummary.KIMIA.totalItems}
              </span>
              <span className="text-xs font-semibold text-slate-500 ml-1.5">
                {metricMode === 'units' ? 'Unit Fisik' : 'Judul Item'}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
          </div>

          <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-slate-600">
            <span className="truncate max-w-[150px]" title={`Dominan: ${labSummary.KIMIA.topCategory.name}`}>
              Dominan: <strong className="text-amber-800 font-semibold">{labSummary.KIMIA.topCategory.name}</strong>
            </span>
            <span className="font-mono text-emerald-700 font-bold shrink-0">
              {labSummary.KIMIA.goodUnits} Baik
            </span>
          </div>
        </div>

        {/* Biologi */}
        <div
          onMouseEnter={() => setHoveredLab('BIOLOGI')}
          onMouseLeave={() => setHoveredLab(null)}
          onClick={() => onSelectLabFilter && onSelectLabFilter('BIOLOGI')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            hoveredLab === 'BIOLOGI'
              ? 'border-emerald-400 bg-emerald-50/80 shadow-md -translate-y-0.5'
              : 'border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50/70 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                <Dna className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-emerald-900">Lab Biologi</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {overallMetrics.totalUnits > 0
                ? `${((labSummary.BIOLOGI.totalUnits / overallMetrics.totalUnits) * 100).toFixed(1)}%`
                : '0%'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {metricMode === 'units' ? labSummary.BIOLOGI.totalUnits : labSummary.BIOLOGI.totalItems}
              </span>
              <span className="text-xs font-semibold text-slate-500 ml-1.5">
                {metricMode === 'units' ? 'Unit Fisik' : 'Judul Item'}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
          </div>

          <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-slate-600">
            <span className="truncate max-w-[150px]" title={`Dominan: ${labSummary.BIOLOGI.topCategory.name}`}>
              Dominan: <strong className="text-emerald-800 font-semibold">{labSummary.BIOLOGI.topCategory.name}</strong>
            </span>
            <span className="font-mono text-emerald-700 font-bold shrink-0">
              {labSummary.BIOLOGI.goodUnits} Baik
            </span>
          </div>
        </div>

        {/* Optional 4th card: SMP Terpadu or Summary */}
        {includeSmp ? (
          <div
            onMouseEnter={() => setHoveredLab('SMP_TERPADU')}
            onMouseLeave={() => setHoveredLab(null)}
            onClick={() => onSelectLabFilter && onSelectLabFilter('SMP_TERPADU')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              hoveredLab === 'SMP_TERPADU'
                ? 'border-indigo-400 bg-indigo-50/80 shadow-md -translate-y-0.5'
                : 'border-indigo-200/80 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-2xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold text-indigo-900">IPA SMP Terpadu</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                {overallMetrics.totalUnits > 0
                  ? `${((labSummary.SMP_TERPADU.totalUnits / overallMetrics.totalUnits) * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {metricMode === 'units'
                    ? labSummary.SMP_TERPADU.totalUnits
                    : labSummary.SMP_TERPADU.totalItems}
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-1.5">
                  {metricMode === 'units' ? 'Unit Fisik' : 'Judul Item'}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
            </div>

            <div className="mt-2.5 pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[11px] text-slate-600">
              <span className="truncate max-w-[150px]">
                Dominan: <strong className="text-indigo-800 font-semibold">{labSummary.SMP_TERPADU.topCategory.name}</strong>
              </span>
              <span className="font-mono text-emerald-700 font-bold shrink-0">
                {labSummary.SMP_TERPADU.goodUnits} Baik
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Total Akumulasi SMA</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold">
                Fis + Kim + Bio
              </span>
            </div>
            <div className="my-2">
              <div className="text-2xl font-black text-slate-900 font-mono">
                {metricMode === 'units' ? overallMetrics.totalUnits : overallMetrics.totalItems}
              </div>
              <p className="text-[11px] text-slate-500">
                {metricMode === 'units' ? 'Total unit fisik barang aktif' : 'Total jenis katalog barang'}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
              <span>Status Terkalibrasi</span>
              <span className="font-bold text-teal-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Siap Praktikum
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Chart Display Area */}
      <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200/70">
        {/* VIEW 1: Category Bar Chart */}
        {activeView === 'category-bar' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>Grafik Komparasi Stok per Kategori</span>
                <span className="text-slate-400 font-normal">
                  ({metricMode === 'units' ? 'Satuan: Unit Kemasan/Pcs' : 'Satuan: Judul Item'})
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#0284c7]" /> Fisika
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#d97706]" /> Kimia
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#059669]" /> Biologi
                </span>
                {includeSmp && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#6366f1]" /> SMP
                  </span>
                )}
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  margin={{ top: 20, right: 15, left: -10, bottom: 45 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="shortCategory"
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
                  />

                  <Bar
                    dataKey="FISIKA"
                    name="Lab Fisika"
                    fill={LAB_COLORS.FISIKA.main}
                    stackId={isStacked ? 'labStack' : undefined}
                    radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                  <Bar
                    dataKey="KIMIA"
                    name="Lab Kimia"
                    fill={LAB_COLORS.KIMIA.main}
                    stackId={isStacked ? 'labStack' : undefined}
                    radius={isStacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                  <Bar
                    dataKey="BIOLOGI"
                    name="Lab Biologi"
                    fill={LAB_COLORS.BIOLOGI.main}
                    stackId={isStacked ? 'labStack' : undefined}
                    radius={isStacked ? (includeSmp ? [0, 0, 0, 0] : [6, 6, 0, 0]) : [6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                  {includeSmp && (
                    <Bar
                      dataKey="SMP_TERPADU"
                      name="IPA SMP Terpadu"
                      fill={LAB_COLORS.SMP_TERPADU.main}
                      stackId={isStacked ? 'labStack' : undefined}
                      radius={isStacked ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                      maxBarSize={45}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 2: Lab Pie / Donut Chart */}
        {activeView === 'lab-pie' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 h-[320px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={118}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {pieChartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.labId}`}
                        fill={entry.color}
                        className="cursor-pointer transition-transform hover:opacity-90"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total {metricMode === 'units' ? 'Stok' : 'Katalog'}
                </span>
                <span className="text-2xl font-black font-mono text-slate-800">
                  {metricMode === 'units' ? overallMetrics.totalUnits : overallMetrics.totalItems}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {metricMode === 'units' ? 'Unit Fisik' : 'Barang'}
                </span>
              </div>
            </div>

            {/* Side Detail Breakdown Table */}
            <div className="lg:col-span-6 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between pb-2 border-b border-slate-200">
                <span>Rincian Porsi & Kondisi per Laboratorium</span>
                <span className="font-mono text-slate-500 text-[11px]">
                  {metricMode === 'units' ? 'Hitungan Unit' : 'Hitungan Judul'}
                </span>
              </div>

              <div className="space-y-2.5">
                {pieChartData.map((lab) => (
                  <div
                    key={lab.labId}
                    onClick={() => onSelectLabFilter && onSelectLabFilter(lab.labId as LabId)}
                    className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs"
                        style={{ backgroundColor: lab.color }}
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {lab.fullName}
                        </div>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                          <span className="text-emerald-700">{lab.good} Baik</span>
                          <span>•</span>
                          <span className="text-amber-700">{lab.lightDamage} R. Ringan</span>
                          <span>•</span>
                          <span className="text-rose-700">{lab.heavyDamage} R. Berat</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-black text-slate-900">
                        {lab.value}{' '}
                        <span className="text-[10.5px] font-normal text-slate-500">
                          {metricMode === 'units' ? 'Unit' : 'Item'}
                        </span>
                      </div>
                      <span
                        className="inline-block text-[10.5px] font-mono font-bold px-1.5 py-0.2 rounded-md"
                        style={{
                          backgroundColor: `${lab.color}15`,
                          color: lab.color,
                        }}
                      >
                        {lab.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Condition Status Bar Chart */}
        {activeView === 'condition-bar' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>Kelaikan dan Kondisi Fisik Alat per Laboratorium</span>
                <span className="text-slate-400 font-normal">(Satuan: Unit Fisik)</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500" /> Kondisi Baik
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-amber-500" /> Rusak Ringan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-rose-500" /> Rusak Berat
                </span>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={conditionChartData}
                  margin={{ top: 20, right: 15, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomConditionTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
                  />

                  <Bar
                    dataKey="Kondisi Baik"
                    name="Kondisi Baik"
                    fill="#10b981"
                    stackId="condStack"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={55}
                  />
                  <Bar
                    dataKey="Rusak Ringan"
                    name="Rusak Ringan"
                    fill="#f59e0b"
                    stackId="condStack"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={55}
                  />
                  <Bar
                    dataKey="Rusak Berat"
                    name="Rusak Berat"
                    fill="#ef4444"
                    stackId="condStack"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={55}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 4. Insightful Footer Note */}
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            Data disinkronkan langsung dari kartu stok inventaris 2026. Klik kartu laboratorium di atas untuk memfilter tabel inventaris.
          </span>
        </div>
        {onSelectLabFilter && (
          <button
            onClick={() => onSelectLabFilter('ALL')}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 self-end sm:self-auto shrink-0 hover:underline"
          >
            <span>Buka Semua Barang di Tabel</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
