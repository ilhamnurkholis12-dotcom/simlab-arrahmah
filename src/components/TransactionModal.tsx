import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, LAB_DEFINITIONS, LabId, TransactionType } from '../types/inventory';
import { X, ArrowDownLeft, ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem?: InventoryItem | null;
  defaultType?: TransactionType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  defaultType = 'IN',
}) => {
  const { items, addTransaction, currentUser, showToast } = useInventory();

  const [itemId, setItemId] = useState<string>('');
  const [type, setType] = useState<TransactionType>(defaultType);
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState<string>('2026-03-15');
  const [targetLab, setTargetLab] = useState<LabId>('FISIKA');
  const [purpose, setPurpose] = useState<string>('');
  const [picName, setPicName] = useState<string>('');
  const [studentClassOrBatch, setStudentClassOrBatch] = useState<string>('');
  const [conditionStatus, setConditionStatus] = useState<'Baik' | 'Rusak Ringan' | 'Rusak Berat'>('Baik');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (selectedItem) {
        setItemId(selectedItem.id);
        const lab = selectedItem.primaryLab === 'ALL' ? 'FISIKA' : selectedItem.primaryLab;
        setTargetLab(lab);
      } else if (items.length > 0) {
        setItemId(items[0].id);
      }
      setType(defaultType);
      setQuantity(1);
      setDate(new Date().toISOString().split('T')[0]);
      setPicName(currentUser?.name || '');
      setPurpose(defaultType === 'IN' ? 'Pengadaan Sekolah TA 2026' : 'Praktikum Siswa');
      setErrorMsg('');
    }
  }, [isOpen, selectedItem, defaultType, items, currentUser]);

  if (!isOpen) return null;

  const currentActiveItem = items.find((i) => i.id === itemId);
  const availableStockInTargetLab = currentActiveItem
    ? currentActiveItem.distribution[targetLab] || 0
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSubmitting) return;

    if (!itemId) {
      const msg = 'Pilih barang terlebih dahulu.';
      setErrorMsg(msg);
      showToast({ type: 'warning', title: 'Data Belum Lengkap', message: msg });
      return;
    }
    if (quantity <= 0) {
      const msg = 'Kuantitas harus lebih dari 0.';
      setErrorMsg(msg);
      showToast({ type: 'warning', title: 'Kuantitas Tidak Valid', message: msg });
      return;
    }

    setIsSubmitting(true);

    const result = addTransaction({
      itemId,
      type,
      quantity,
      date,
      targetLab,
      purpose: purpose.trim() || (type === 'IN' ? 'Penerimaan Stok' : 'Pemakaian Praktikum'),
      picName: picName.trim() || (currentUser?.name ?? 'Petugas Lab'),
      studentClassOrBatch: studentClassOrBatch.trim(),
      conditionStatus,
      notes: notes.trim(),
    });

    if (result.success) {
      onClose();
    } else {
      setIsSubmitting(false);
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between p-4 sm:p-5 border-b ${
            type === 'IN'
              ? 'bg-emerald-50/70 border-emerald-100'
              : 'bg-amber-50/70 border-amber-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                type === 'IN'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {type === 'IN' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {type === 'IN' ? 'Catat Barang Masuk (IN)' : 'Catat Barang Keluar (OUT)'}
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan mutasi inventaris dan sinkronisasi otomatis stok
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

          {/* Type Toggle */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Jenis Transaksi</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  type === 'IN'
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Barang Masuk (IN)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  type === 'OUT'
                    ? 'bg-amber-700 text-white border-amber-700'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Barang Keluar (OUT)</span>
              </button>
            </div>
          </div>

          {/* Item Selector */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Pilih Barang</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-700"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.code}] {item.name} (Stok Total: {item.currentTotalStock} {item.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Laboratory Selection */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              {type === 'IN' ? 'Disimpan ke Laboratorium' : 'Diambil dari Laboratorium'}
            </label>
            <select
              value={targetLab}
              onChange={(e) => setTargetLab(e.target.value as LabId)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-700"
            >
              {(Object.keys(LAB_DEFINITIONS) as LabId[]).map((labId) => {
                const lab = LAB_DEFINITIONS[labId];
                const currentQty = currentActiveItem?.distribution[labId] || 0;
                return (
                  <option key={labId} value={labId}>
                    {lab.name} (Stok Saat Ini: {currentQty} {currentActiveItem?.unit})
                  </option>
                );
              })}
            </select>
            {type === 'OUT' && (
              <p className="text-[11px] text-slate-500 mt-1">
                Tersedia di ruangan {LAB_DEFINITIONS[targetLab].shortName}:{' '}
                <strong className="font-mono text-slate-800">
                  {availableStockInTargetLab} {currentActiveItem?.unit}
                </strong>
              </p>
            )}
          </div>

          {/* Quantity & Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Jumlah ({currentActiveItem?.unit || 'Unit'})
              </label>
              <input
                type="number"
                min="1"
                max={type === 'OUT' ? availableStockInTargetLab : 9999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700"
                required
              />
            </div>
          </div>

          {/* Purpose / Activity */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Keperluan / Alasan Mutasi
            </label>
            <input
              type="text"
              placeholder={
                type === 'IN'
                  ? 'Contoh: Pengadaan Baru Yayasan, Pengembalian Praktikum'
                  : 'Contoh: Praktikum Titrasi, Uji Amilum, Dipinjam'
              }
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700"
              required
            />
          </div>

          {/* PIC and Class */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Penanggung Jawab (PIC)
              </label>
              <input
                type="text"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Nama Guru / Laboran"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Kelas / Rombel / Sumber
              </label>
              <input
                type="text"
                value={studentClassOrBatch}
                onChange={(e) => setStudentClassOrBatch(e.target.value)}
                placeholder="Misal: Kelas XI MIPA 1 / BOS"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* Condition Status */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Kondisi Barang</label>
            <select
              value={conditionStatus}
              onChange={(e) => setConditionStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
            >
              <option value="Baik">Kondisi Baik (Prima)</option>
              <option value="Rusak Ringan">Rusak Ringan (Bisa Diperbaiki)</option>
              <option value="Rusak Berat">Rusak Berat (Usul Afkir)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan nomor seri, kalibrasi, wadah atau rincian..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {/* Footer Submit */}
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
              className={`min-h-[44px] px-5 py-2 text-white font-bold rounded-lg transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                type === 'IN'
                  ? 'bg-emerald-800 hover:bg-emerald-900'
                  : 'bg-amber-700 hover:bg-amber-800'
              }`}
            >
              {isSubmitting ? 'Menyimpan...' : `Simpan Transaksi ${type === 'IN' ? 'Masuk' : 'Keluar'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
