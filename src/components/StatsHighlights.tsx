import React, { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { LAB_DEFINITIONS, LabId } from '../types/inventory';
import { calculatePhysicalPackagingCount, isNettoUnit } from '../utils/excelImportParser';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Atom,
  FlaskConical,
  Dna,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Wrench,
  Ban,
  MapPin,
} from 'lucide-react';

interface StatsHighlightsProps {
  onSelectLabFilter: (labId: LabId | 'ALL') => void;
  onOpenLowStockModal: () => void;
}

export const StatsHighlights: React.FC<StatsHighlightsProps> = ({
  onSelectLabFilter,
  onOpenLowStockModal,
}) => {
  const { items, lowStockItems } = useInventory();

  // Memoized Combined Pass: 1 single pass over items instead of 10 separate reduce passes (Anti-Lag Optimization)
  const {
    totalItemTypes,
    grandTotalUnits,
    totalInUnits,
    totalOutUnits,
    totalGood,
    totalLightDamage,
    totalHeavyDamage,
    labTotals,
  } = useMemo(() => {
    let grandUnits = 0;
    let inUnits = 0;
    let outUnits = 0;
    let good = 0;
    let lightDamage = 0;
    let heavyDamage = 0;
    let fisikaUnits = 0;
    let kimiaUnits = 0;
    let biologiUnits = 0;
    let smpUnits = 0;

    items.forEach((curr) => {
      const totalPkg = calculatePhysicalPackagingCount(curr);
      grandUnits += totalPkg;

      if (isNettoUnit(curr.unit) || (curr.category === 'Bahan Kimia & Reagen' && curr.totalIn >= 30)) {
        inUnits += curr.totalIn > 0 ? 1 : 0;
      } else {
        inUnits += curr.totalIn;
      }

      if (isNettoUnit(curr.unit) || (curr.category === 'Bahan Kimia & Reagen' && curr.totalOut >= 30)) {
        outUnits += curr.totalOut > 0 ? 1 : 0;
      } else {
        outUnits += curr.totalOut;
      }

      if (curr.currentTotalStock > 0) {
        const ratioGood = curr.conditionGood / curr.currentTotalStock;
        const ratioLight = curr.conditionLightDamage / curr.currentTotalStock;
        const ratioHeavy = curr.conditionHeavyDamage / curr.currentTotalStock;
        good += Math.round(totalPkg * ratioGood);
        lightDamage += Math.round(totalPkg * ratioLight);
        heavyDamage += Math.round(totalPkg * ratioHeavy);
      }

      fisikaUnits += calculatePhysicalPackagingCount(curr, 'FISIKA');
      kimiaUnits += calculatePhysicalPackagingCount(curr, 'KIMIA');
      biologiUnits += calculatePhysicalPackagingCount(curr, 'BIOLOGI');
      smpUnits += calculatePhysicalPackagingCount(curr, 'SMP_TERPADU');
    });

    return {
      totalItemTypes: items.length,
      grandTotalUnits: grandUnits,
      totalInUnits: inUnits,
      totalOutUnits: outUnits,
      totalGood: good,
      totalLightDamage: lightDamage,
      totalHeavyDamage: heavyDamage,
      labTotals: {
        FISIKA: fisikaUnits,
        KIMIA: kimiaUnits,
        BIOLOGI: biologiUnits,
        SMP_TERPADU: smpUnits,
      },
    };
  }, [items]);

  const getLabVisuals = (id: LabId) => {
    switch (id) {
      case 'FISIKA':
        return {
          icon: <Atom className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />,
          badgeStyle: 'bg-sky-50 text-sky-700 border border-sky-200/80 ring-4 ring-sky-50/50 group-hover:bg-sky-600 group-hover:text-white group-hover:ring-sky-100',
          accentBorder: 'hover:border-sky-400/80 hover:shadow-sky-100',
          barColor: 'from-sky-500 to-sky-600',
          room: 'Gedung B Lt. 2 . R. Physics Lab',
          levelLabel: 'SMA IT · Fisika',
        };
      case 'KIMIA':
        return {
          icon: <FlaskConical className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-12" />,
          badgeStyle: 'bg-amber-50 text-amber-700 border border-amber-200/80 ring-4 ring-amber-50/50 group-hover:bg-amber-600 group-hover:text-white group-hover:ring-amber-100',
          accentBorder: 'hover:border-amber-400/80 hover:shadow-amber-100',
          barColor: 'from-amber-500 to-amber-600',
          room: 'Gedung B Lt. 1 . R. Chemistry Lab',
          levelLabel: 'SMA IT · Kimia',
        };
      case 'BIOLOGI':
        return {
          icon: <Dna className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />,
          badgeStyle: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 ring-4 ring-emerald-50/50 group-hover:bg-emerald-600 group-hover:text-white group-hover:ring-emerald-100',
          accentBorder: 'hover:border-emerald-400/80 hover:shadow-emerald-100',
          barColor: 'from-emerald-500 to-teal-600',
          room: 'Gedung B Lt. 1 . R. Biology Lab',
          levelLabel: 'SMA IT · Biologi',
        };
      case 'SMP_TERPADU':
        return {
          icon: <GraduationCap className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />,
          badgeStyle: 'bg-teal-50 text-teal-700 border border-teal-200/80 ring-4 ring-teal-50/50 group-hover:bg-teal-600 group-hover:text-white group-hover:ring-teal-100',
          accentBorder: 'hover:border-teal-400/80 hover:shadow-teal-100',
          barColor: 'from-teal-500 to-emerald-600',
          room: 'Gedung B Lt. 1 & 2 . R. Science Lab',
          levelLabel: 'SMP IT · IPA Terpadu',
        };
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Unit Fisik */}
        <div className="bg-white/90 backdrop-blur-xs p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Fisik Unit (Item Count)
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Boxes className="w-4 h-4 text-slate-800" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tabular-nums tracking-tight">
              {grandTotalUnits.toLocaleString('id-ID')}
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{totalItemTypes} Katalog SKU</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Kemasan & Alat Terpadu</span>
            </div>
          </div>
        </div>

        {/* Card 2: Mutasi Masuk */}
        <div className="bg-white/90 backdrop-blur-xs p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Barang Masuk (IN)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-700 tabular-nums tracking-tight">
              +{totalInUnits.toLocaleString('id-ID')}
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-emerald-800">Pengadaan & Hibah</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Tercatat TA 2026</span>
            </div>
          </div>
        </div>

        {/* Card 3: Mutasi Keluar */}
        <div className="bg-white/90 backdrop-blur-xs p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Barang Keluar (OUT)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-700 tabular-nums tracking-tight">
              -{totalOutUnits.toLocaleString('id-ID')}
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-amber-800">Praktikum Siswa</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Bahan Habis Pakai</span>
            </div>
          </div>
        </div>

        {/* Card 4: Peringatan Stok Minimum */}
        <button
          onClick={onOpenLowStockModal}
          className={`text-left p-5 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between shadow-xs hover:shadow-md ${
            lowStockItems.length > 0
              ? 'bg-gradient-to-br from-amber-50/90 to-amber-100/40 border-amber-300/80 hover:border-amber-400'
              : 'bg-white/90 backdrop-blur-xs border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Peringatan Stok
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
                lowStockItems.length > 0
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight ${
                lowStockItems.length > 0 ? 'text-amber-800' : 'text-slate-900'
              }`}
            >
              {lowStockItems.length}{' '}
              <span className="text-sm font-sans font-medium text-slate-600">Barang</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-900 font-bold">
              <span>{lowStockItems.length > 0 ? 'Ambang Batas Kritis' : 'Semua Stok Aman'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </button>
      </div>

      {/* Synchronized Multi-Lab Breakdown Grid */}
      <div className="bg-white/95 backdrop-blur-xs p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Ruang Laboratorium IPA Terpadu
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Distribusi fisik inventaris terintegrasi pada seluruh laboratorium SMP dan SMA IT Ar-Rahmah Cendekia
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 self-start md:self-auto">
            <span className="text-slate-500">Total Terkonsolidasi (Item Count):</span>
            <span className="font-mono font-bold text-teal-800 text-sm tabular-nums">
              {grandTotalUnits.toLocaleString('id-ID')} Unit / Botol
            </span>
          </div>
        </div>

        {/* 4 Laboratory Cards with Distinct Custom Icons & Hover Transitions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-6">
          {(Object.keys(LAB_DEFINITIONS) as LabId[]).map((labId) => {
            const lab = LAB_DEFINITIONS[labId];
            const unitsInThisLab = labTotals[labId];
            const percentage = grandTotalUnits > 0 ? Math.round((unitsInThisLab / grandTotalUnits) * 100) : 0;
            const visuals = getLabVisuals(labId);

            return (
              <div
                key={labId}
                onClick={() => onSelectLabFilter(labId)}
                className={`group cursor-pointer p-5 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between ${visuals.accentBorder}`}
              >
                <div>
                  {/* Top Bar: Icon + Percentage Tag */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${visuals.badgeStyle}`}>
                      {visuals.icon}
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-lg tabular-nums">
                      {percentage}%
                    </span>
                  </div>

                  {/* Level and Title */}
                  <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                    {visuals.levelLabel}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1 group-hover:text-teal-900 transition-colors">
                    {lab.name}
                  </h3>

                  {/* Room Location */}
                  <div
                    className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 min-w-0"
                    title={`Lokasi Ruangan: ${visuals.room}`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{visuals.room}</span>
                  </div>

                  {/* Units Count */}
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold font-mono text-slate-900 tabular-nums">
                      {unitsInThisLab.toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs font-medium text-slate-500">unit / kemasan</span>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${visuals.barColor} transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>

                {/* Footer: PIC and CTA */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 text-[11px] truncate max-w-[130px] font-medium" title={lab.leadPerson}>
                    {lab.leadPerson.split(',')[0]}
                  </span>
                  <span className="font-bold text-teal-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Lihat Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Condition & Health State Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Kondisi Baik */}
        <div className="bg-white/95 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kondisi Baik (Layak Praktikum)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
              {totalGood.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-sans font-semibold text-emerald-700">
                ({grandTotalUnits > 0 ? Math.round((totalGood / grandTotalUnits) * 100) : 100}%)
              </span>
            </div>
          </div>
        </div>

        {/* Rusak Ringan */}
        <div className="bg-white/95 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Rusak Ringan (Perlu Servis)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
              {totalLightDamage.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">unit</span>
            </div>
          </div>
        </div>

        {/* Rusak Berat */}
        <div className="bg-white/95 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Rusak Berat (Usul Afkir)
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
              {totalHeavyDamage.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">unit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
