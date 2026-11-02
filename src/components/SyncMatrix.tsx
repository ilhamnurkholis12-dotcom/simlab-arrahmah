import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, LAB_DEFINITIONS, LabId } from '../types/inventory';
import {
  ArrowRightLeft,
  CheckCircle2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  SendHorizontal,
  Printer,
} from 'lucide-react';
import { PrintReportHeader, PrintSignatures } from './PrintReportHeader';

interface SyncMatrixProps {
  onOpenTransfer: (item: InventoryItem) => void;
}

export const SyncMatrix: React.FC<SyncMatrixProps> = ({ onOpenTransfer }) => {
  const { items, settings } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === 'ALL' || item.category === filterCategory;
    return matchSearch && matchCat;
  });

  // Calculate totals per lab column
  const totalFisika = items.reduce((acc, curr) => acc + (curr.distribution.FISIKA || 0), 0);
  const totalKimia = items.reduce((acc, curr) => acc + (curr.distribution.KIMIA || 0), 0);
  const totalBiologi = items.reduce((acc, curr) => acc + (curr.distribution.BIOLOGI || 0), 0);
  const totalSmp = items.reduce((acc, curr) => acc + (curr.distribution.SMP_TERPADU || 0), 0);
  const grandTotal = totalFisika + totalKimia + totalBiologi + totalSmp;

  return (
    <div className="space-y-6">
      {/* Official Printable Report Header */}
      <PrintReportHeader
        title="Matriks Alokasi & Rekapitulasi Sinkronisasi Multi-Laboratorium"
        subtitle={`Konsolidasi Sebaran Stok Alat Praktikum Fisika, Kimia, Biologi & SMP Terpadu TA ${settings.tahun_ajaran || '2025/2026'}`}
        selectedLab="ALL"
        extraMetadata={[
          { label: 'Total Unit Terdistribusi', value: `${grandTotal.toLocaleString('id-ID')} unit` },
          { label: 'Filter Kategori', value: filterCategory === 'ALL' ? 'Semua Kategori' : filterCategory },
        ]}
      />

      {/* Top Banner Explaining Multi-Lab Synchronization (hidden on print) */}
      <div className="no-print bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Sinkronisasi Otomatis Multi-Laboratorium Realtime</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Matriks Alokasi & Rekapitulasi Sinkron Fisika, Kimia, Biologi & SMP Terpadu
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Setiap perubahan mutasi barang (stok masuk, pemakaian praktikum, atau mutasi antar lab)
              secara otomatis terkonsolidasi pada Total Rekapitulasi Master Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <div className="text-right">
              <div className="text-[11px] text-teal-300 font-semibold">Total Fisik Gabungan</div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
                {grandTotal.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-300 font-medium">Unit Terdistribusi 100%</div>
            </div>
          </div>
        </div>

        {/* 4 Laboratory Pillars Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-teal-400 uppercase font-bold">Lab Fisika (SMA)</div>
            <div className="text-lg sm:text-xl font-bold font-mono mt-0.5 tabular-nums">
              {totalFisika.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-400">
                ({grandTotal > 0 ? Math.round((totalFisika / grandTotal) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-amber-400 uppercase font-bold">Lab Kimia (SMA)</div>
            <div className="text-lg sm:text-xl font-bold font-mono mt-0.5 tabular-nums">
              {totalKimia.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-400">
                ({grandTotal > 0 ? Math.round((totalKimia / grandTotal) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-emerald-400 uppercase font-bold">Lab Biologi (SMA)</div>
            <div className="text-lg sm:text-xl font-bold font-mono mt-0.5 tabular-nums">
              {totalBiologi.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-400">
                ({grandTotal > 0 ? Math.round((totalBiologi / grandTotal) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-teal-300 uppercase font-bold">IPA SMP Terpadu</div>
            <div className="text-lg sm:text-xl font-bold font-mono mt-0.5 tabular-nums">
              {totalSmp.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-slate-400">
                ({grandTotal > 0 ? Math.round((totalSmp / grandTotal) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (hidden on print) */}
      <div className="no-print bg-white/95 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari barang untuk melihat sebaran tiap lab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="Alat Ukur & Neraca">Alat Ukur & Neraca</option>
            <option value="Alat Gelas & Keramik">Alat Gelas & Keramik</option>
            <option value="Bahan Kimia & Reagen">Bahan Kimia & Reagen</option>
            <option value="Instrumen Optik">Instrumen Optik</option>
            <option value="Model & Preparat Biologi">Model & Preparat Biologi</option>
            <option value="Kit Praktikum Terpadu">Kit Praktikum Terpadu</option>
            <option value="Perkakas & Keselamatan Kerja">Perkakas & Keselamatan Kerja</option>
          </select>

          <button
            onClick={() => window.print()}
            className="min-h-[38px] px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shadow-2xs"
            title="Cetak laporan matriks sinkronisasi ke format PDF atau printer fisik"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white/95 backdrop-blur-xs rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm print-clean">
        <div className="overflow-x-auto print-show-block">
          <table className="w-full text-left border-collapse text-xs print-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Barang & Satuan</th>
                <th className="py-3.5 px-3 text-right bg-sky-50/60 text-sky-950 border-l border-sky-100 font-bold">
                  Fisika (SMA)
                </th>
                <th className="py-3.5 px-3 text-right bg-amber-50/60 text-amber-950 border-l border-amber-100 font-bold">
                  Kimia (SMA)
                </th>
                <th className="py-3.5 px-3 text-right bg-emerald-50/60 text-emerald-950 border-l border-emerald-100 font-bold">
                  Biologi (SMA)
                </th>
                <th className="py-3.5 px-3 text-right bg-teal-50/60 text-teal-950 border-l border-teal-100 font-bold">
                  IPA SMP Terpadu
                </th>
                <th className="py-3.5 px-4 text-right bg-slate-100/80 text-slate-900 font-extrabold border-l border-slate-200">
                  TOTAL REKAP (TERPADU)
                </th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="no-print py-3 px-4 text-center">Mutasi Antar Lab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item, index) => {
                const sumDist =
                  (item.distribution.FISIKA || 0) +
                  (item.distribution.KIMIA || 0) +
                  (item.distribution.BIOLOGI || 0) +
                  (item.distribution.SMP_TERPADU || 0);

                const isPerfectSync = sumDist === item.currentTotalStock;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400 tabular-nums">
                      {index + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-600">{item.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-600 font-medium">Satuan: {item.unit}</span>
                      </div>
                    </td>

                    {/* Fisika SMA */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums border-l border-slate-100 font-semibold text-sky-950">
                      {item.distribution.FISIKA > 0 ? (
                        <span>
                          {item.distribution.FISIKA}{' '}
                          <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Kimia SMA */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums border-l border-slate-100 font-semibold text-amber-950">
                      {item.distribution.KIMIA > 0 ? (
                        <span>
                          {item.distribution.KIMIA}{' '}
                          <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Biologi SMA */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums border-l border-slate-100 font-semibold text-emerald-950">
                      {item.distribution.BIOLOGI > 0 ? (
                        <span>
                          {item.distribution.BIOLOGI}{' '}
                          <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* IPA SMP */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums border-l border-slate-100 font-semibold text-indigo-950">
                      {item.distribution.SMP_TERPADU > 0 ? (
                        <span>
                          {item.distribution.SMP_TERPADU}{' '}
                          <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Total Gabungan Otomatis */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-sm tabular-nums border-l border-slate-200 bg-slate-50/60 text-slate-900">
                      {item.currentTotalStock}{' '}
                      <span className="text-xs font-sans font-normal text-slate-500">
                        {item.unit}
                      </span>
                    </td>

                    {/* Synchronization Status */}
                    <td className="py-3 px-3 text-center">
                      {isPerfectSync ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sinkron</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <span>Selisih ({item.currentTotalStock - sumDist})</span>
                        </span>
                      )}
                    </td>

                    {/* Transfer Button (hidden on print) */}
                    <td className="no-print py-3 px-4 text-center">
                      <button
                        onClick={() => onOpenTransfer(item)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg font-semibold text-xs inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Transfer Lab</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900">
                <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                  TOTAL KESELURUHAN UNIT FISIK:
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-sky-950">
                  {totalFisika}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-950">
                  {totalKimia}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-950">
                  {totalBiologi}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-indigo-950">
                  {totalSmp}
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm tabular-nums text-emerald-950 bg-slate-200/80">
                  {grandTotal} Unit
                </td>
                <td className="py-3 px-4 text-center text-xs text-emerald-800">
                  100% Sinkron
                </td>
                <td className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Official Signatures for Printed Report */}
      <PrintSignatures selectedLab="ALL" />
    </div>
  );
};
