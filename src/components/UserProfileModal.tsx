import React, { useState, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { UserAccount, LAB_DEFINITIONS } from '../types/inventory';
import {
  X,
  Camera,
  Upload,
  Trash2,
  Check,
  User,
  Mail,
  ShieldCheck,
  Phone,
  Building2,
  AlertCircle,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateCurrentUserPhoto, updateUserAccount, showToast } = useInventory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewPhoto, setPreviewPhoto] = useState<string | undefined>(currentUser?.avatarUrl);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (< 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 3MB.');
      return;
    }

    // Check type (jpg/png/webp)
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format file harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPreviewPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPreviewPhoto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong.');
      return;
    }

    // Save photo
    if (previewPhoto !== undefined) {
      updateCurrentUserPhoto(previewPhoto);
    }

    // Save personal info
    updateUserAccount(currentUser.id, {
      name: name.trim(),
      phone: phone.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-extrabold text-base">Profil Akun & Foto Pengguna</h3>
              <p className="text-xs text-slate-300">
                Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Photo Uploader */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <div className="relative group">
              {previewPhoto ? (
                <img
                  src={previewPhoto}
                  alt={currentUser.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-teal-500 shadow-md shadow-teal-950/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 text-teal-300 text-2xl font-black flex items-center justify-center border-2 border-teal-500/40 shadow-sm">
                  {currentUser.avatarInitials || 'ARC'}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-teal-300" />
                <span>Ganti Foto</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-teal-700" />
                <span>Pilih Foto (JPG/PNG)</span>
              </button>

              {previewPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 flex items-center gap-1 transition-colors"
                  title="Hapus foto profil dan gunakan inisial default"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              Maksimal 3MB. Format yang didukung: PNG, JPG, JPEG, WebP.
            </p>
          </div>

          {/* User Information */}
          <div className="space-y-3.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Lengkap & Gelar</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Resmi (Akun Login)</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Kontak / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="0812xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Otoritas / Peran</label>
                <div className="relative">
                  <ShieldCheck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-teal-600" />
                  <input
                    type="text"
                    value={currentUser.roleTitle}
                    disabled
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed font-medium truncate"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-[11px] text-teal-900 flex items-start gap-2">
              <Building2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Laboratorium IPA Terpadu</div>
                <div className="text-slate-600 text-[10.5px]">
                  Penugasan:{' '}
                  {currentUser.assignedLab === 'ALL'
                    ? 'Seluruh Laboratorium Terpadu'
                    : LAB_DEFINITIONS[currentUser.assignedLab]?.name || currentUser.assignedLab}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
