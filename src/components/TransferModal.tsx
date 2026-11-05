import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, LAB_DEFINITIONS, LabId } from '../types/inventory';
import { X, ArrowRightLeft, AlertCircle } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem?: InventoryItem | null;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
}) => {
  const { items, transferStock, currentUser, showToast } = useInventory();

  const [itemId, setItemId] = useState<string>('');
  const [fromLab, setFromLab] = useState<LabId>('BIOLOGI');
  const [toLab, setToLab] = useState<LabId>('SMP_TERPADU');
  const [quantity, setQuantity] = useState<number>(1);
  const [picName, setPicName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (selectedItem) {
        setItemId(selectedItem.id);
        // Default source lab to one with positive stock
        const labsWithStock = (Object.keys(LAB_DEFINITIONS) as LabId[]).filter(
          (l) => (selectedItem.distribution[l] || 0) > 0
        );
        if (labsWithStock.length > 0) {
          setFromLab(labsWithStock[0]);
          const target = labsWithStock[0] === 'SMP_TERPADU' ? 'BIOLOGI' : 'SMP_TERPADU';
          setToLab(target);
        }
      } else if (items.length > 0) {
        setItemId(items[0].id);
      }
      setQuantity(1);
      setPicName(currentUser?.name || '');
      setNotes('Sinkronisasi distribusi alat praktikum antar laboratorium');
      setErrorMsg('');
    }
  }, [isOpen, selectedItem, items, currentUser]);

  if (!isOpen) return null;

  const currentActiveItem = items.find((i) => i.id === itemId);
  const availableInFromLab = currentActiveItem ? currentActiveItem.distribution[fromLab] || 0 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSubmitting) return;

    if (!itemId) {
      const msg = 'Pilih barang yang akan ditransfer.';
      setErrorMsg(msg);
      showToast({ type: 'warning', title: 'Data Belum Lengkap', message: msg });
      return;
    }
    if (fromLab === toLab) {
      const msg = 'Laboratorium asal dan tujuan tidak boleh sama.';
      setErrorMsg(msg);
      showToast({ type: 'warning', title: 'Laboratorium Identik', message: msg });
      return;
    }
    if (quantity <= 0) {
      const msg = 'Kuantitas transfer harus lebih dari 0.';
      setErrorMsg(msg);
      showToast({ type: 'warning', title: 'Kuantitas Tidak Valid', message: msg });
      return;
    }
    if (availableInFromLab < quantity) {
      const msg = `Stok tersedia di ${LAB_DEFINITIONS[fromLab].shortName} hanya ${availableInFromLab} ${currentActiveItem?.unit}.`;
      setErrorMsg(msg);
      showToast({ type: 'error', title: 'Stok Tidak Cukup', message: msg });
      return;
    }

    setIsSubmitting(true);

    const res = transferStock(
      itemId,
      fromLab,
      toLab,
      quantity,
      picName.trim() || (currentUser?.name ?? 'Petugas Lab'),
      notes.trim()
    );

    if (res.success) {
      onClose();
    } else {
      setIsSubmitting(false);
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-sky-100 bg-sky-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Transfer & Mutasi Antar Laboratorium
              </h2>
              <p className="text-xs text-slate-500">
                Sinkronisasi alokasi barang antara SMA (Fisika, Kimia, Biologi) dan SMP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Item Selector */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Pilih Barang yang Ditransfer</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-700"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.code}] {it.name} (Total: {it.currentTotalStock} {it.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Origin and Destination Lab */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Laboratorium Asal (Sumber)
              </label>
              <select
                value={fromLab}
                onChange={(e) => setFromLab(e.target.value as LabId)}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
              >
                {(Object.keys(LAB_DEFINITIONS) as LabId[]).map((labId) => {
                  const qty = currentActiveItem?.distribution[labId] || 0;
                  return (
                    <option key={labId} value={labId}>
                      {LAB_DEFINITIONS[labId].shortName} ({qty} {currentActiveItem?.unit})
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Tersedia:{' '}
                <strong className="font-mono text-slate-800">
                  {availableInFromLab} {currentActiveItem?.unit}
                </strong>
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Laboratorium Tujuan (Penerima)
              </label>
              <select
                value={toLab}
                onChange={(e) => setToLab(e.target.value as LabId)}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
              >
                {(Object.keys(LAB_DEFINITIONS) as LabId[]).map((labId) => {
                  const qty = currentActiveItem?.distribution[labId] || 0;
                  return (
                    <option key={labId} value={labId} disabled={labId === fromLab}>
                      {LAB_DEFINITIONS[labId].shortName} ({qty} {currentActiveItem?.unit})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Kuantitas yang Dipindahkan ({currentActiveItem?.unit || 'Unit'})
            </label>
            <input
              type="number"
              min="1"
              max={availableInFromLab}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700"
              required
            />
          </div>

          {/* PIC */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Petugas / Penanggung Jawab Transfer
            </label>
            <input
              type="text"
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
              placeholder="Nama laboran atau guru yang mengurus"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Alasan Transfer / Catatan Berita Acara
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Alokasi praktikum mikrobiologi kelas VII SMP IT..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 bg-sky-800 hover:bg-sky-900 disabled:bg-sky-700/60 text-white font-bold rounded-lg transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Memproses Transfer...' : 'Proses Transfer Antar Lab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
