import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, ItemCategory, LAB_DEFINITIONS, LabId } from '../types/inventory';
import { X, Plus, AlertCircle, Save, Trash2 } from 'lucide-react';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: InventoryItem | null;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  editingItem,
}) => {
  const { addItem, updateItem, deleteItem, showToast } = useInventory();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Alat Ukur & Neraca');
  const [primaryLab, setPrimaryLab] = useState<LabId | 'ALL'>('FISIKA');
  const [unit, setUnit] = useState('Unit');
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [storageRack, setStorageRack] = useState('');
  const [brandOrSpec, setBrandOrSpec] = useState('');
  const [expiredDate, setExpiredDate] = useState('');
  const [calibrationStatus, setCalibrationStatus] = useState<'Bagus' | 'Rusak' | 'Perlu Kalibrasi'>('Bagus');
  const [notes, setNotes] = useState('');

  // Sub-lab distribution
  const [distFisika, setDistFisika] = useState<number>(0);
  const [distKimia, setDistKimia] = useState<number>(0);
  const [distBiologi, setDistBiologi] = useState<number>(0);
  const [distSmp, setDistSmp] = useState<number>(0);

  // Condition counts
  const [condGood, setCondGood] = useState<number>(0);
  const [condLight, setCondLight] = useState<number>(0);
  const [condHeavy, setCondHeavy] = useState<number>(0);

  const [errorMsg, setErrorMsg] = useState('');

  const totalCalculated = distFisika + distKimia + distBiologi + distSmp;

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setCode(editingItem.code);
        setName(editingItem.name);
        setCategory(editingItem.category);
        setPrimaryLab(editingItem.primaryLab);
        setUnit(editingItem.unit);
        setMinStockAlert(editingItem.minStockAlert);
        setStorageRack(editingItem.storageRack);
        setBrandOrSpec(editingItem.brandOrSpec);
        setExpiredDate(editingItem.expiredDate || '');
        setCalibrationStatus(editingItem.calibrationStatus || 'Bagus');
        setNotes(editingItem.notes || '');

        setDistFisika(editingItem.distribution.FISIKA || 0);
        setDistKimia(editingItem.distribution.KIMIA || 0);
        setDistBiologi(editingItem.distribution.BIOLOGI || 0);
        setDistSmp(editingItem.distribution.SMP_TERPADU || 0);

        setCondGood(editingItem.conditionGood);
        setCondLight(editingItem.conditionLightDamage);
        setCondHeavy(editingItem.conditionHeavyDamage);
      } else {
        const randNum = Math.floor(100 + Math.random() * 900);
        setCode(`IPA-26-${randNum}`);
        setName('');
        setCategory('Alat Ukur & Neraca');
        setPrimaryLab('FISIKA');
        setUnit('Unit');
        setMinStockAlert(5);
        setStorageRack('Lemari Utama Rak 1');
        setBrandOrSpec('');
        setExpiredDate('');
        setCalibrationStatus('Bagus');
        setNotes('');

        setDistFisika(5);
        setDistKimia(0);
        setDistBiologi(0);
        setDistSmp(0);

        setCondGood(5);
        setCondLight(0);
        setCondHeavy(0);
      }
      setErrorMsg('');
    }
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!code.trim() || !name.trim()) {
      setErrorMsg('Kode inventaris dan nama barang wajib diisi.');
      return;
    }

    const distribution = {
      FISIKA: distFisika,
      KIMIA: distKimia,
      BIOLOGI: distBiologi,
      SMP_TERPADU: distSmp,
    };

    if (editingItem) {
      updateItem(editingItem.id, {
        code: code.trim(),
        name: name.trim(),
        category,
        primaryLab,
        unit: unit.trim(),
        minStockAlert: Math.max(0, minStockAlert),
        distribution,
        storageRack: storageRack.trim(),
        brandOrSpec: brandOrSpec.trim(),
        expiredDate: expiredDate ? expiredDate.trim() : undefined,
        calibrationStatus,
        notes: notes.trim(),
        conditionGood: condGood,
        conditionLightDamage: condLight,
        conditionHeavyDamage: condHeavy,
      });
    } else {
      addItem({
        code: code.trim(),
        name: name.trim(),
        category,
        primaryLab,
        unit: unit.trim(),
        initialStock2026: totalCalculated,
        minStockAlert: Math.max(0, minStockAlert),
        conditionGood: condGood || totalCalculated,
        conditionLightDamage: condLight,
        conditionHeavyDamage: condHeavy,
        distribution,
        storageRack: storageRack.trim() || 'Gudang Inventaris IPA',
        brandOrSpec: brandOrSpec.trim() || 'Standar Praktikum Sekolah',
        expiredDate: expiredDate ? expiredDate.trim() : undefined,
        calibrationStatus,
        notes: notes.trim(),
      });
      showToast({
        type: 'success',
        title: 'Barang Inventaris Ditambahkan',
        message: `Item "${name.trim()}" (${code.trim()}) berhasil didaftarkan ke inventaris.`,
      });
    }

    if (editingItem) {
      showToast({
        type: 'success',
        title: 'Data Barang Diperbarui',
        message: `Data inventaris "${name.trim()}" (${code.trim()}) berhasil diperbarui.`,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {editingItem ? 'Edit Data Barang Inventaris' : 'Tambah Barang Inventaris Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              SMP dan SMA IT Ar-Rahmah Cendekia Tahun 2026
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
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

          {/* Row 1: Kode & Nama */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Kode Inventaris</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="FIS-26-001"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700 uppercase"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">Nama Barang Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Mikroskop Binokuler XSZ-107BN"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-700"
                required
              />
            </div>
          </div>

          {/* Row 2: Kategori & Primary Lab */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Kategori Barang</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="Alat Ukur & Neraca">Alat Ukur & Neraca</option>
                <option value="Alat Gelas & Keramik">Alat Gelas & Keramik</option>
                <option value="Bahan Kimia & Reagen">Bahan Kimia & Reagen</option>
                <option value="Instrumen Optik">Instrumen Optik</option>
                <option value="Model & Preparat Biologi">Model & Preparat Biologi</option>
                <option value="Kit Praktikum Terpadu">Kit Praktikum Terpadu</option>
                <option value="Perkakas & Keselamatan Kerja">Perkakas & Keselamatan Kerja</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Laboratorium Utama</label>
              <select
                value={primaryLab}
                onChange={(e) => setPrimaryLab(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">Bersama / Seluruh Laboratorium</option>
                <option value="FISIKA">Laboratorium Fisika (SMA)</option>
                <option value="KIMIA">Laboratorium Kimia (SMA)</option>
                <option value="BIOLOGI">Laboratorium Biologi (SMA)</option>
                <option value="SMP_TERPADU">Laboratorium IPA Terpadu (SMP)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Satuan, Ambang Batas Minimum, Lokasi Rak */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Satuan</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unit, Pcs, Set, Botol"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-amber-800 mb-1">
                Ambang Batas Minimum (Alert)
              </label>
              <input
                type="number"
                min="0"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-amber-300 bg-amber-50/50 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Lokasi Rak / Lemari</label>
              <input
                type="text"
                value={storageRack}
                onChange={(e) => setStorageRack(e.target.value)}
                placeholder="Lemari A1 - Rak 2"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Status Kondisi & Tanggal Kadaluarsa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Status Kondisi / Kalibrasi Alat
              </label>
              <select
                value={calibrationStatus}
                onChange={(e) => setCalibrationStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-teal-600"
              >
                <option value="Bagus">Bagus (Siap Pakai & Presisi)</option>
                <option value="Perlu Kalibrasi">Perlu Kalibrasi / Tera Titik Nol</option>
                <option value="Rusak">Rusak / Tidak Layak Pakai</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Indikator kelayakan alat praktikum sains santri.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Tanggal Kadaluarsa (Expired Date)</span>
                {category === 'Bahan Kimia & Reagen' && (
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                    Bahan Kimia
                  </span>
                )}
              </label>
              <input
                type="date"
                value={expiredDate}
                onChange={(e) => setExpiredDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Khususnya untuk Bahan Kimia & Reagen cair/padat.
              </p>
            </div>
          </div>

          {/* Sub-Lab Distribution Section (Multi-lab sync) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Alokasi Jumlah Barang di Tiap Laboratorium
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">
                Total Gabungan: {totalCalculated} {unit}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Masukkan kuantitas fisik yang ditempatkan di masing-masing laboratorium.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-sky-800">Fisika (SMA)</label>
                <input
                  type="number"
                  min="0"
                  value={distFisika}
                  onChange={(e) => setDistFisika(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-amber-800">Kimia (SMA)</label>
                <input
                  type="number"
                  min="0"
                  value={distKimia}
                  onChange={(e) => setDistKimia(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-emerald-800">Biologi (SMA)</label>
                <input
                  type="number"
                  min="0"
                  value={distBiologi}
                  onChange={(e) => setDistBiologi(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-indigo-800">IPA Terpadu (SMP)</label>
                <input
                  type="number"
                  min="0"
                  value={distSmp}
                  onChange={(e) => setDistSmp(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white"
                />
              </div>
            </div>
          </div>

          {/* Condition Breakdown */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Kondisi Baik</label>
              <input
                type="number"
                min="0"
                value={condGood}
                onChange={(e) => setCondGood(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Rusak Ringan</label>
              <input
                type="number"
                min="0"
                value={condLight}
                onChange={(e) => setCondLight(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Rusak Berat</label>
              <input
                type="number"
                min="0"
                value={condHeavy}
                onChange={(e) => setCondHeavy(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Brand, Specs & Notes */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Merk / Spesifikasi Teknis</label>
            <input
              type="text"
              value={brandOrSpec}
              onChange={(e) => setBrandOrSpec(e.target.value)}
              placeholder="Contoh: Pudak Scientific, Ketelitian 0.01g, Garansi 1 Tahun"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan pengadaan, penggunaan khusus, atau instruksi K3..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            {editingItem ? (
              <div>
                {isConfirmingDelete ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                    <span className="text-[11px] font-bold text-rose-800 px-1">Yakin hapus?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteItem(editingItem.id);
                        showToast({
                          type: 'success',
                          title: 'Barang Dihapus',
                          message: `Barang "${editingItem.name}" (${editingItem.code}) berhasil dihapus.`,
                          duration: 4000,
                        });
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
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="min-h-[40px] px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-rose-200"
                    title="Hapus barang ini dari inventaris"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Barang</span>
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{editingItem ? 'Simpan Perubahan' : 'Tambahkan ke Inventaris'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
