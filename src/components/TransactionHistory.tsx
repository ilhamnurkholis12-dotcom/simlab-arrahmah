import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { StockTransaction, LAB_DEFINITIONS, LabId, TransactionType } from '../types/inventory';
import {
  Search,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Plus,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { PrintReportHeader, PrintSignatures } from './PrintReportHeader';

interface TransactionHistoryProps {
  onOpenNewTransaction: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  onOpenNewTransaction,
}) => {
  const { transactions, settings } = useInventory();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [labFilter, setLabFilter] = useState<LabId | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = tx.itemName.toLowerCase().includes(query);
        const matchCode = tx.itemCode.toLowerCase().includes(query);
        const matchPic = tx.picName.toLowerCase().includes(query);
        const matchPurpose = tx.purpose.toLowerCase().includes(query);
        const matchBatch = (tx.studentClassOrBatch || '').toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchPic && !matchPurpose && !matchBatch) {
          return false;
        }
      }

      // 2. Type
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
        return false;
      }

      // 3. Lab
      if (labFilter !== 'ALL') {
        if (tx.targetLab !== labFilter && tx.fromLab !== labFilter) {
          return false;
        }
      }

      // 4. Date range
      if (startDate) {
        if (tx.date < startDate) return false;
      }
      if (endDate) {
        if (tx.date > endDate) return false;
      }

      return true;
    });
  }, [transactions, searchQuery, typeFilter, labFilter, startDate, endDate]);

  const totalInQty = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'IN')
      .reduce((sum, t) => sum + t.quantity, 0);
  }, [filteredTransactions]);

  const totalOutQty = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'OUT')
      .reduce((sum, t) => sum + t.quantity, 0);
  }, [filteredTransactions]);

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'IN':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>MASUK (IN)</span>
          </span>
        );
      case 'OUT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>KELUAR (OUT)</span>
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>TRANSFER LAB</span>
          </span>
        );
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setLabFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    typeFilter !== 'ALL' ||
    labFilter !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  return (
    <div className="space-y-4">
      {/* Official Printable Report Header */}
      <PrintReportHeader
        title="Buku Rekapitulasi Mutasi Keluar & Masuk Laboratorium"
        subtitle={`Pencatatan Riwayat Pemakaian Alat Praktikum, Mutasi Stok Masuk & Transfer Antar Laboratorium TA ${settings.tahun_ajaran || '2025/2026'}`}
        selectedLab={labFilter}
        extraMetadata={[
          { label: 'Total Mutasi', value: `${filteredTransactions.length} transaksi` },
          { label: 'Total Barang Masuk (+)', value: `${totalInQty} unit` },
          { label: 'Total Barang Keluar (-)', value: `${totalOutQty} unit` },
          {
            label: 'Filter Jenis',
            value:
              typeFilter === 'ALL'
                ? 'Semua Jenis'
                : typeFilter === 'IN'
                ? 'Barang Masuk (IN)'
                : typeFilter === 'OUT'
                ? 'Barang Keluar (OUT)'
                : 'Transfer Antar Lab',
          },
        ]}
      />

      {/* Header Bar (hidden on print) */}
      <div className="no-print bg-white/95 backdrop-blur-xs p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Buku Mutasi Keluar & Masuk Laboratorium 2026
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia · Pencatatan mutasi realtime
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => window.print()}
              className="min-h-[40px] px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shadow-2xs"
              title="Cetak laporan riwayat mutasi keluar/masuk ke format PDF atau printer fisik"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Laporan</span>
            </button>
            <button
              onClick={onOpenNewTransaction}
              className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shadow-xs hover:shadow-md"
            >
              <Plus className="w-4 h-4 text-teal-400" />
              <span>+ Catat Keluar / Masuk</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama barang, PIC, tujuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Jenis Mutasi</option>
              <option value="IN">Hanya Barang Masuk (IN)</option>
              <option value="OUT">Hanya Barang Keluar (OUT)</option>
              <option value="TRANSFER">Hanya Transfer Antar Lab</option>
            </select>
          </div>

          {/* Laboratory Filter */}
          <div>
            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Seluruh Laboratorium IPA Terpadu</option>
              <option value="FISIKA">Laboratorium Fisika (SMA)</option>
              <option value="KIMIA">Laboratorium Kimia (SMA)</option>
              <option value="BIOLOGI">Laboratorium Biologi (SMA)</option>
              <option value="SMP_TERPADU">Laboratorium IPA Terpadu (SMP)</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              title="Dari Tanggal"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
              title="Sampai Tanggal"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Menemukan <strong>{filteredTransactions.length}</strong> catatan transaksi.
            </span>
            <button
              onClick={resetFilters}
              className="text-emerald-800 font-semibold hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs print-clean">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">Tidak ada data transaksi mutasi</p>
            <p className="text-xs text-slate-400 mt-1">
              Belum ada mutasi yang cocok dengan rentang tanggal atau filter yang dipilih.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table (hidden on mobile, force visible on print) */}
            <div className="hidden lg:block overflow-x-auto print-show-block">
              <table className="w-full text-left border-collapse text-xs print-table">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase font-semibold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-3">Jenis Mutasi</th>
                    <th className="py-3 px-4">Nama Barang & Kode</th>
                    <th className="py-3 px-3 text-right">Kuantitas</th>
                    <th className="py-3 px-4">Laboratorium Terkait</th>
                    <th className="py-3 px-4">Keperluan & Kelas/Kegiatan</th>
                    <th className="py-3 px-4">Penanggung Jawab (PIC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx, idx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{getTypeBadge(tx.type)}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tx.itemName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{tx.itemCode}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm tabular-nums whitespace-nowrap">
                        <span
                          className={
                            tx.type === 'IN'
                              ? 'text-emerald-700'
                              : tx.type === 'OUT'
                              ? 'text-amber-700'
                              : 'text-sky-700'
                          }
                        >
                          {tx.type === 'IN' ? `+${tx.quantity}` : tx.type === 'OUT' ? `-${tx.quantity}` : `${tx.quantity}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {tx.type === 'TRANSFER' && tx.fromLab ? (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-700">
                              {LAB_DEFINITIONS[tx.fromLab].shortName}
                            </span>
                            <span className="text-slate-400 mx-1">➔</span>
                            <span className="font-semibold text-emerald-800">
                              {LAB_DEFINITIONS[tx.targetLab].shortName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-800">
                            {LAB_DEFINITIONS[tx.targetLab]?.shortName || tx.targetLab}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{tx.purpose}</div>
                        {tx.studentClassOrBatch && (
                          <div className="text-[11px] text-slate-500">{tx.studentClassOrBatch}</div>
                        )}
                        {tx.notes && (
                          <div className="text-[11px] text-slate-400 italic">Catatan: {tx.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{tx.picName}</span>
                          {tx.userId && (
                            <span
                              className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded"
                              title={`Akun Pengguna Terdaftar: ${tx.userId}`}
                            >
                              PIC Resmi
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (hidden on print) */}
            <div className="no-print lg:hidden divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 space-y-2 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(tx.type)}
                      <span className="text-xs font-mono text-slate-500">{tx.date}</span>
                    </div>
                    <div className="font-mono font-bold text-sm tabular-nums">
                      <span
                        className={
                          tx.type === 'IN'
                            ? 'text-emerald-700'
                            : tx.type === 'OUT'
                            ? 'text-amber-700'
                            : 'text-sky-700'
                        }
                      >
                        {tx.type === 'IN'
                          ? `+${tx.quantity}`
                          : tx.type === 'OUT'
                          ? `-${tx.quantity}`
                          : `${tx.quantity}`} unit
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{tx.itemName}</h4>
                    <p className="text-xs text-slate-500 font-mono">{tx.itemCode}</p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lab:</span>
                      <span className="font-semibold text-slate-800">
                        {tx.type === 'TRANSFER' && tx.fromLab
                          ? `${LAB_DEFINITIONS[tx.fromLab].shortName} ➔ ${LAB_DEFINITIONS[tx.targetLab].shortName}`
                          : LAB_DEFINITIONS[tx.targetLab]?.shortName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Keperluan:</span>
                      <span className="text-slate-800 text-right truncate max-w-[200px]">
                        {tx.purpose} {tx.studentClassOrBatch ? `(${tx.studentClassOrBatch})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PJ / Guru:</span>
                      <span className="font-medium text-slate-700">{tx.picName}</span>
                    </div>
                    {tx.notes && (
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        Catatan: {tx.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Official Signatures for Printed Report */}
      <PrintSignatures selectedLab={labFilter} />
    </div>
  );
};
