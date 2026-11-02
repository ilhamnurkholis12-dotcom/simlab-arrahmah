import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, LAB_DEFINITIONS } from '../types/inventory';
import {
  AlertTriangle,
  X,
  PlusCircle,
  Settings2,
  Check,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface LowStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickRestock: (item: InventoryItem) => void;
}

export const LowStockModal: React.FC<LowStockModalProps> = ({
  isOpen,
  onClose,
  onQuickRestock,
}) => {
  const { items, lowStockItems, updateMinStockThreshold } = useInventory();
  const [activeTab, setActiveTab] = useState<'alerts' | 'allThresholds'>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempThreshold, setTempThreshold] = useState<number>(0);

  if (!isOpen) return null;

  const handleStartEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setTempThreshold(item.minStockAlert);
  };

  const handleSaveThreshold = (id: string) => {
    updateMinStockThreshold(id, tempThreshold);
    setEditingId(null);
  };

  const filteredAllItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pusat Notifikasi & Ambang Batas Stok Minimum
              </h2>
              <p className="text-xs text-slate-500">
                Monitoring otomatis barang laboratorium IPA yang mencapai atau di bawah batas aman
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-100 bg-slate-50/60">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'border-amber-600 text-amber-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Peringatan Kritis ({lowStockItems.length})
          </button>
          <button
            onClick={() => setActiveTab('allThresholds')}
            className={`min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'allThresholds'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Pengaturan Ambang Batas Semua Barang
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'alerts' ? (
            <div>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">Semua Stok Barang Berada di Batas Aman</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Tidak ada barang laboratorium yang berada pada atau di bawah ambang batas minimum.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-amber-900 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Ditemukan <strong className="font-mono">{lowStockItems.length}</strong> barang
                      dengan stok fisik mencapai atau di bawah batas minimum. Segera lakukan pengadaan
                      atau redistribusi antar laboratorium.
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {lowStockItems.map((item) => {
                      const isEditing = editingId === item.id;
                      const isZero = item.currentTotalStock <= 0;

                      return (
                        <div
                          key={item.id}
                          className="p-3 sm:p-4 bg-white hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-slate-500">
                                {item.code}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="text-xs font-medium text-emerald-800">
                                {item.primaryLab === 'ALL'
                                  ? 'Bersama Seluruh Lab'
                                  : LAB_DEFINITIONS[item.primaryLab].shortName}
                              </span>
                              {isZero && (
                                <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                  HABIS TOTAL
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>Lokasi: {item.storageRack}</span>
                              <span aria-hidden="true">·</span>
                              <span>Kategori: {item.category}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                            {/* Stock vs Min */}
                            <div className="text-right">
                              <div className="text-xs text-slate-400">Stok Saat Ini / Min</div>
                              <div className="font-mono text-sm font-bold tabular-nums">
                                <span className={isZero ? 'text-red-700' : 'text-amber-700'}>
                                  {item.currentTotalStock}
                                </span>
                                <span className="text-slate-300 mx-1">/</span>
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      value={tempThreshold}
                                      onChange={(e) => setTempThreshold(parseInt(e.target.value) || 0)}
                                      className="w-14 px-1 py-0.5 border border-amber-400 rounded text-center text-xs font-mono font-bold"
                                    />
                                    <button
                                      onClick={() => handleSaveThreshold(item.id)}
                                      className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    onClick={() => handleStartEdit(item)}
                                    className="cursor-pointer hover:underline text-slate-700"
                                    title="Klik untuk ubah ambang batas minimum"
                                  >
                                    {item.minStockAlert} {item.unit}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(item)}
                                title="Ubah Ambang Batas Minimum"
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                              >
                                <Settings2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  onClose();
                                  onQuickRestock(item);
                                }}
                                className="min-h-[40px] px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                              >
                                <PlusCircle className="w-4 h-4" />
                                <span>+ Catat Masuk</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search Bar for All Items */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama barang atau kode untuk atur ambang batas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                {filteredAllItems.map((item) => {
                  const isEditing = editingId === item.id;
                  const isUnder = item.currentTotalStock <= item.minStockAlert;

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{item.code}</span>
                          <span aria-hidden="true">·</span>
                          <span>Stok Fisik: {item.currentTotalStock} {item.unit}</span>
                          {isUnder && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-700 font-bold">Stok Kritis</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400">Batas Min:</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={tempThreshold}
                              onChange={(e) => setTempThreshold(parseInt(e.target.value) || 0)}
                              className="w-16 px-1.5 py-1 border border-emerald-500 rounded text-center font-mono font-bold"
                            />
                            <button
                              onClick={() => handleSaveThreshold(item.id)}
                              className="p-1.5 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <span>{item.minStockAlert} {item.unit}</span>
                            <Settings2 className="w-3 h-3 text-slate-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Ambang batas disimpan otomatis pada sistem inventaris 2026</span>
          <button
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors"
          >
            Tutup Panel
          </button>
        </div>
      </div>
    </div>
  );
};
