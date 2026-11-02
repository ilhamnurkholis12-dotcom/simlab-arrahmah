import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, LAB_DEFINITIONS, LabId } from '../types/inventory';
import {
  X,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  Printer,
  Download,
  Settings2,
  Check,
  Building2,
  PackageCheck,
  History,
  Info,
  Trash2,
} from 'lucide-react';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onQuickTransaction: (item: InventoryItem, type: 'IN' | 'OUT') => void;
  onOpenTransfer: (item: InventoryItem) => void;
  onOpenEditItem: (item: InventoryItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onQuickTransaction,
  onOpenTransfer,
  onOpenEditItem,
}) => {
  const { transactions, updateMinStockThreshold, deleteItem, showToast } = useInventory();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [tempThreshold, setTempThreshold] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (item && isOpen) {
      setTempThreshold(item.minStockAlert);
      setIsEditingThreshold(false);

      // Generate QR Code data URL containing item code and name
      QRCode.toDataURL(
        JSON.stringify({
          app: 'SIMLAB_ARCSS_2026',
          code: item.code,
          id: item.id,
          name: item.name,
        }),
        {
          width: 250,
          margin: 1.5,
          color: {
            dark: '#064e3b', // Deep emerald
            light: '#ffffff',
          },
        }
      )
        .then((url) => {
          setQrDataUrl(url);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  // Filter all transactions for this specific item
  const itemTransactions = transactions.filter((tx) => tx.itemId === item.id);

  const isUnderMin = item.currentTotalStock <= item.minStockAlert;

  const handleSaveThreshold = () => {
    updateMinStockThreshold(item.id, tempThreshold);
    setIsEditingThreshold(false);
  };

  const handleDownloadQrSticker = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_LABEL_${item.code}_${item.name.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-800">
                  {item.code}
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {item.primaryLab === 'ALL'
                    ? 'Seluruh Lab'
                    : LAB_DEFINITIONS[item.primaryLab]?.shortName}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">{item.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Detail Spesifikasi vs Riwayat Mutasi */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('details')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-emerald-700 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Spesifikasi & QR Label</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-emerald-700 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Mutasi Keluar/Masuk ({itemTransactions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {activeTab === 'details' ? (
            <div className="space-y-5">
              {/* Top Card: QR Code & Quick Identity */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                {/* QR Code Canvas */}
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs shrink-0 text-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${item.code}`}
                      className="w-32 h-32 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                      Membuat QR...
                    </div>
                  )}
                  <button
                    onClick={handleDownloadQrSticker}
                    className="mt-1 text-[10px] font-semibold text-emerald-800 hover:underline flex items-center justify-center gap-1 w-full"
                  >
                    <Download className="w-3 h-3" />
                    <span>Unduh Stiker QR</span>
                  </button>
                </div>

                {/* Stock Stats Highlights */}
                <div className="flex-1 space-y-2 w-full">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Total Stok Fisik Terkini
                      </div>
                      <div
                        className={`text-xl font-bold font-mono tabular-nums ${
                          isUnderMin ? 'text-amber-800' : 'text-slate-900'
                        }`}
                      >
                        {item.currentTotalStock}{' '}
                        <span className="text-xs font-sans font-normal text-slate-500">
                          {item.unit}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                        <span>Batas Minimum (Alert)</span>
                        {!isEditingThreshold && (
                          <button
                            onClick={() => setIsEditingThreshold(true)}
                            className="text-emerald-800 hover:underline"
                            title="Ubah ambang batas"
                          >
                            <Settings2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {isEditingThreshold ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="number"
                            min="0"
                            value={tempThreshold}
                            onChange={(e) => setTempThreshold(parseInt(e.target.value) || 0)}
                            className="w-16 px-1.5 py-0.5 border border-emerald-500 rounded font-mono font-bold text-xs"
                          />
                          <button
                            onClick={handleSaveThreshold}
                            className="p-1 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setIsEditingThreshold(false)}
                            className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsEditingThreshold(true)}
                          className={`text-xl font-bold font-mono tabular-nums cursor-pointer hover:underline ${
                            isUnderMin ? 'text-amber-800' : 'text-slate-700'
                          }`}
                        >
                          {item.minStockAlert}{' '}
                          <span className="text-xs font-sans font-normal text-slate-500">
                            {item.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isUnderMin && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Peringatan: Stok barang mencapai atau di bawah ambang batas minimum!
                      </span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
                    <span>Stok Awal: {item.initialStock2026}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 font-semibold">Masuk: +{item.totalIn}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-700 font-semibold">Keluar: -{item.totalOut}</span>
                  </div>
                </div>
              </div>

              {/* Sub-Lab Distribution Strip */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  <span>Sebaran Stok Fisik di Masing-Masing Laboratorium</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold">Fisika (SMA)</div>
                    <div className="text-base font-bold font-mono text-sky-950 tabular-nums">
                      {item.distribution.FISIKA || 0} {item.unit}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold">Kimia (SMA)</div>
                    <div className="text-base font-bold font-mono text-amber-950 tabular-nums">
                      {item.distribution.KIMIA || 0} {item.unit}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold">Biologi (SMA)</div>
                    <div className="text-base font-bold font-mono text-emerald-950 tabular-nums">
                      {item.distribution.BIOLOGI || 0} {item.unit}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold">IPA SMP</div>
                    <div className="text-base font-bold font-mono text-indigo-950 tabular-nums">
                      {item.distribution.SMP_TERPADU || 0} {item.unit}
                    </div>
                  </div>
                </div>
              </div>

              {/* Specifications & Storage */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900">Rincian & Lokasi Penyimpanan</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kategori Barang:</span>
                    <span className="font-semibold text-slate-800">{item.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Lokasi Lemari / Rak:</span>
                    <span className="font-semibold text-slate-800">{item.storageRack}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Merk & Spesifikasi:</span>
                    <span className="font-semibold text-slate-800">
                      {item.brandOrSpec || 'Standar Alat Praktikum'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status Kelaikan / Kalibrasi:</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      {item.calibrationStatus === 'Perlu Kalibrasi' ? (
                        <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          Perlu Kalibrasi / Tera Titik Nol
                        </span>
                      ) : item.calibrationStatus === 'Rusak' ? (
                        <span className="text-rose-800 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                          Rusak / Tidak Layak Pakai
                        </span>
                      ) : (
                        <span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          Bagus (Siap Praktikum)
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tanggal Kadaluarsa (Exp):</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {item.expiredDate ? (
                        <span className="text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {item.expiredDate}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Tidak Dibatasi / Bukan Reagen</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kondisi Fisik:</span>
                    <span className="font-semibold text-slate-800">
                      Baik: {item.conditionGood} · Rusak Ringan: {item.conditionLightDamage} · Rusak
                      Berat: {item.conditionHeavyDamage}
                    </span>
                  </div>
                </div>
                {item.notes && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 italic">
                    Catatan: {item.notes}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Mutation History Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Daftar seluruh mutasi masuk, keluar, dan transfer antar laboratorium untuk barang ini
                </p>
                <button
                  onClick={() => onQuickTransaction(item, 'IN')}
                  className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-[11px] font-semibold"
                >
                  + Catat Mutasi
                </button>
              </div>

              {itemTransactions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                  <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-800">Belum ada mutasi tercatat</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Stok saat ini masih sesuai stok awal inventaris 2026.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {itemTransactions.map((tx) => (
                    <div key={tx.id} className="p-3 bg-white hover:bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              tx.type === 'IN'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : tx.type === 'OUT'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-sky-50 text-sky-800 border border-sky-200'
                            }`}
                          >
                            {tx.type === 'IN' ? 'MASUK' : tx.type === 'OUT' ? 'KELUAR' : 'TRANSFER'}
                          </span>
                          <span className="font-mono text-xs text-slate-500">{tx.date}</span>
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
                            {tx.type === 'IN' ? `+${tx.quantity}` : tx.type === 'OUT' ? `-${tx.quantity}` : `${tx.quantity}`} {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-slate-700 text-xs">
                        <span className="font-semibold">{tx.purpose}</span>
                        <span className="text-slate-500">{tx.picName}</span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Lab: {tx.targetLab}</span>
                        {tx.studentClassOrBatch && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{tx.studentClassOrBatch}</span>
                          </>
                        )}
                        {tx.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{tx.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onQuickTransaction(item, 'IN')}
              className="min-h-[40px] px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Masuk</span>
            </button>
            <button
              onClick={() => onQuickTransaction(item, 'OUT')}
              className="min-h-[40px] px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>- Keluar</span>
            </button>
            <button
              onClick={() => onOpenTransfer(item)}
              className="min-h-[40px] px-3 py-1.5 bg-sky-50 text-sky-800 hover:bg-sky-100 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Transfer</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {item && (
              <>
                {isConfirmingDelete ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-200">
                    <span className="text-[11px] font-bold text-rose-800 px-1">Hapus barang?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteItem(item.id);
                        showToast({
                          type: 'success',
                          title: 'Barang Dihapus',
                          message: `Barang "${item.name}" (${item.code}) berhasil dihapus.`,
                          duration: 4000,
                        });
                        setIsConfirmingDelete(false);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold transition-colors"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="min-h-[40px] px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
                    title="Hapus barang ini dari inventaris"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => onOpenEditItem(item)}
              className="min-h-[40px] px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors"
            >
              Edit Barang
            </button>
            <button
              onClick={onClose}
              className="min-h-[40px] px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
