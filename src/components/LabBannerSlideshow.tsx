import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  DEFAULT_LAB_BANNERS,
  LabBannerItem,
  normalizeMediaUrl,
  getFallbackBannerImage,
  FALLBACK_LAB_IMAGES,
} from '../data/labBanners';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  MapPin,
  Sparkles,
  Video,
  Image as ImageIcon,
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  X,
  Check,
  ExternalLink,
  AlertTriangle,
  Info,
  ShieldCheck,
} from 'lucide-react';

const STORAGE_KEY_BANNERS = 'simlab_custom_banners_v1';

export const LabBannerSlideshow: React.FC = () => {
  const { showToast, currentUser, isHeadOfLab, slides, updateSlides } = useInventory();
  const isAdmin = currentUser?.role === 'KEPALA_LAB' || isHeadOfLab;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<LabBannerItem | null>(null);
  const [formError, setFormError] = useState('');
  const [previewError, setPreviewError] = useState(false);

  // Auto-play interval (5.5 seconds)
  useEffect(() => {
    if (!isPlaying || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [isPlaying, slides.length, currentIndex]);

  // Persist slides to context and Google Sheets when modified (automatically normalized)
  const handleSaveSlides = (updated: LabBannerItem[]) => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (ACL)',
        message: 'Hanya Kepala Laboratorium (Admin) yang berwenang mengubah foto & video banner dashboard.',
      });
      return;
    }

    updateSlides(updated);
  };

  const handleResetToDefault = () => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Akses Ditolak (ACL)',
        message: 'Hanya Kepala Laboratorium (Admin) yang berwenang mereset foto & video banner dashboard.',
      });
      return;
    }

    updateSlides(DEFAULT_LAB_BANNERS);
    setCurrentIndex(0);
    localStorage.removeItem(STORAGE_KEY_BANNERS);
    setIsEditorOpen(false);
    showToast({
      type: 'info',
      title: 'Banner Direset',
      message: 'Semua slide banner telah dikembalikan ke template laboratorium bawaan.',
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <div className="no-print space-y-2">
      {/* Top Bar Indicator with Settings Button (Khusus Admin) */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <span>Galeri & Dokumentasi Laboratorium IPA Terpadu</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
              SMP & SMA IT Ar-Rahmah Cendekia
            </span>
          </h2>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setPreviewError(false);
                setIsEditorOpen(true);
              }}
              className="px-2.5 py-1 text-slate-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 border border-slate-200/80 shadow-2xs"
              title="Kelola & Ganti Link Foto/Video Banner (Khusus Admin)"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kelola Banner (Admin)</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Slideshow Frame */}
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-md group bg-slate-900 border border-slate-200/60"
        onMouseEnter={() => setIsPlaying(false)}
        onMouseLeave={() => setIsPlaying(true)}
      >
        {/* Render Image or Video with the exact required Tailwind CSS class */}
        {currentSlide.type === 'video' ? (
          <video
            key={`${currentSlide.id}-${currentSlide.url}`}
            src={normalizeMediaUrl(currentSlide.url)}
            poster={
              currentSlide.posterUrl
                ? normalizeMediaUrl(currentSlide.posterUrl)
                : getFallbackBannerImage(currentSlide)
            }
            autoPlay
            muted={isMuted}
            loop
            playsInline
            className="w-full h-64 md:h-80 object-cover rounded-2xl"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.failed) {
                target.dataset.failed = 'true';
                // Fallback to sample video if custom video link fails
                target.src =
                  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
              }
            }}
          />
        ) : (
          <img
            key={`${currentSlide.id}-${currentSlide.url}`}
            src={normalizeMediaUrl(currentSlide.url)}
            alt={currentSlide.title}
            className="w-full h-64 md:h-80 object-cover rounded-2xl transition-opacity duration-500"
            onError={(e) => {
              // Robust Fallback Handler: Menampilkan gambar laboratorium sains modern jika link pengguna gagal/error
              const target = e.currentTarget;
              const fallbackUrl = getFallbackBannerImage(currentSlide);
              if (target.src !== fallbackUrl) {
                target.src = fallbackUrl;
              }
            }}
          />
        )}

        {/* Cinematic Gradient Overlays to keep text and controls high-contrast & legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/20 rounded-2xl pointer-events-none" />

        {/* Top Badges Strip */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-between gap-2 pointer-events-auto">
          {/* Location Badge */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-teal-300 border border-teal-500/30 text-[10.5px] font-bold shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>{currentSlide.labLocation}</span>
            </span>

            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/20 backdrop-blur-md text-teal-200 border border-teal-400/30 text-[10px] font-semibold">
              <Sparkles className="w-3 h-3 text-teal-300" />
              <span>{currentSlide.badge}</span>
            </span>
          </div>

          {/* Media Type & Autoplay Indicator */}
          <div className="flex items-center gap-1.5">
            {currentSlide.type === 'video' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="p-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-200 hover:text-white border border-slate-700/80 shadow-xs transition-colors"
                title={isMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
              }}
              className="p-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-200 hover:text-white border border-slate-700/80 shadow-xs transition-colors"
              title={isPlaying ? 'Jeda Slideshow' : 'Putar Slideshow'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-300 border border-slate-700/80 text-[10px] font-mono font-semibold">
              {currentSlide.type === 'video' ? (
                <>
                  <Video className="w-3 h-3 text-emerald-400" />
                  <span>Video 16:9</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3 h-3 text-teal-400" />
                  <span>Foto 16:9</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Previous Button */}
        <button
          onClick={handlePrev}
          className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-105 shadow-md"
          title="Slide Sebelumnya"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next Button */}
        <button
          onClick={handleNext}
          className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-105 shadow-md"
          title="Slide Selanjutnya"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom Information & Caption Area */}
        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-5 right-3 sm:right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pointer-events-auto">
          <div className="max-w-2xl space-y-1 text-white">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 font-mono">
                {currentSlide.categoryTag}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-[10px] font-medium text-slate-300">
                Dokumentasi Resmi SIMLAB
              </span>
            </div>
            <h3 className="text-sm sm:text-lg md:text-xl font-bold leading-tight drop-shadow-sm">
              {currentSlide.title}
            </h3>
            <p className="text-xs sm:text-xs text-slate-200/90 line-clamp-2 leading-relaxed drop-shadow-xs max-w-xl">
              {currentSlide.subtitle}
            </p>
          </div>

          {/* Dots Indicator & Counter */}
          <div className="flex items-center gap-2 sm:self-end shrink-0">
            <span className="text-[10.5px] font-mono font-bold text-white/90 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20">
              {String(currentIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>

            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-full border border-white/20">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 transition-all rounded-full ${
                    idx === currentIndex
                      ? 'w-6 bg-teal-400'
                      : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                  title={`Pindah ke slide ${idx + 1}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Modal for Customizing Slides (Khusus Admin) */}
      {isEditorOpen && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-teal-700" />
                  <span>Pengaturan Banner Slideshow & Video Dashboard</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mendukung link Google Drive otomatis diubah ke Direct Link, serta foto/video landscape (16:9).
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingSlide(null);
                  setFormError('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Slides List & Edit Form */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {editingSlide ? (
                /* Edit Slide Form */
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="font-bold text-slate-800 text-sm">
                      {slides.some((s) => s.id === editingSlide.id)
                        ? 'Edit Slide Banner'
                        : 'Tambah Slide Banner Baru'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlide(null);
                        setFormError('');
                      }}
                      className="text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tipe Media
                      </label>
                      <select
                        value={editingSlide.type}
                        onChange={(e) =>
                          setEditingSlide({
                            ...editingSlide,
                            type: e.target.value as 'image' | 'video',
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                      >
                        <option value="image">Gambar Landscape (JPG/PNG/Google Drive)</option>
                        <option value="video">Video Landscape (MP4/WebM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Badge / Label Singkat
                      </label>
                      <input
                        type="text"
                        value={editingSlide.badge}
                        onChange={(e) =>
                          setEditingSlide({ ...editingSlide, badge: e.target.value })
                        }
                        placeholder="Contoh: Lab Fisika (SMA)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">
                        URL Media (Link Foto / Google Drive / Video 16:9) *
                      </label>
                      {editingSlide.url && editingSlide.url.includes('lh3.googleusercontent.com/d/') && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Google Drive Direct Embed Aktif</span>
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      value={editingSlide.url}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const normalized = normalizeMediaUrl(raw);
                        setEditingSlide({ ...editingSlide, url: normalized });
                        setPreviewError(false);
                      }}
                      placeholder="Tempelkan link Google Drive (https://drive.google.com/file/d/...) atau URL gambar"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                    />

                    {/* Google Drive Notice Box */}
                    <div className="mt-1.5 p-2.5 rounded-xl bg-teal-50/80 border border-teal-200/80 text-[11px] text-teal-950 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-teal-900">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Mendukung Format Direct Embed Google Drive Otomatis:</span>
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        Anda dapat menempelkan link Google Drive biasa (misal:{' '}
                        <code className="bg-white px-1 py-0.5 rounded border border-teal-200 font-mono text-[10px]">
                          drive.google.com/file/d/ID/view
                        </code>
                        ), sistem akan otomatis mengubahnya menjadi format direct link{' '}
                        <code className="bg-white px-1 py-0.5 rounded border border-teal-200 font-mono text-[10px] font-bold text-teal-800">
                          https://lh3.googleusercontent.com/d/FILE_ID
                        </code>
                        .
                      </p>
                      <p className="text-amber-800 font-medium text-[10.5px]">
                        * Catatan: Pastikan izin berbagi file di Google Drive sudah diatur ke{' '}
                        <strong>"Siapa saja yang memiliki link"</strong> (Anyone with link) agar foto dapat tampil.
                      </p>
                    </div>
                  </div>

                  {/* Pratinjau Gambar Langsung (Live Preview Box) */}
                  {editingSlide.url && editingSlide.type === 'image' && (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-semibold text-slate-700 block">
                        Pratinjau Gambar (16:9):
                      </span>
                      <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                        <img
                          src={normalizeMediaUrl(editingSlide.url)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            setPreviewError(true);
                            (e.currentTarget as HTMLImageElement).src =
                              getFallbackBannerImage(editingSlide);
                          }}
                        />
                        {previewError && (
                          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center text-white">
                            <AlertTriangle className="w-5 h-5 text-amber-400 mb-1" />
                            <span className="font-bold text-xs">Link Tidak Dapat Dimuat Langsung</span>
                            <span className="text-[10px] text-slate-300 mt-0.5">
                              Sistem otomatis menggunakan foto fallback laboratorium Unsplash yang rapi.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {editingSlide.type === 'video' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        URL Poster Thumbnail (Opsional)
                      </label>
                      <input
                        type="url"
                        value={editingSlide.posterUrl || ''}
                        onChange={(e) =>
                          setEditingSlide({
                            ...editingSlide,
                            posterUrl: normalizeMediaUrl(e.target.value),
                          })
                        }
                        placeholder="https://... (URL gambar poster sebelum video dimainkan)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Judul Banner *
                    </label>
                    <input
                      type="text"
                      value={editingSlide.title}
                      onChange={(e) =>
                        setEditingSlide({ ...editingSlide, title: e.target.value })
                      }
                      placeholder="Contoh: Laboratorium Kimia SMA IT Ar-Rahmah Cendekia"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Deskripsi / Subtitle
                    </label>
                    <textarea
                      rows={2}
                      value={editingSlide.subtitle}
                      onChange={(e) =>
                        setEditingSlide({ ...editingSlide, subtitle: e.target.value })
                      }
                      placeholder="Keterangan singkat kegiatan atau fasilitas laboratorium..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Lokasi Ruangan
                      </label>
                      <input
                        type="text"
                        value={editingSlide.labLocation}
                        onChange={(e) =>
                          setEditingSlide({
                            ...editingSlide,
                            labLocation: e.target.value,
                          })
                        }
                        placeholder="Contoh: Gedung B Lt. 1 . R. Chemistry Lab"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Kategori Tag
                      </label>
                      <input
                        type="text"
                        value={editingSlide.categoryTag}
                        onChange={(e) =>
                          setEditingSlide({
                            ...editingSlide,
                            categoryTag: e.target.value,
                          })
                        }
                        placeholder="Contoh: Reagen Kimia / Praktikum SMA"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Save button for current editing slide */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlide(null);
                        setFormError('');
                        setPreviewError(false);
                      }}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-700 font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingSlide.url.trim() || !editingSlide.title.trim()) {
                          setFormError('URL Media dan Judul Banner wajib diisi!');
                          showToast({
                            type: 'warning',
                            title: 'Data Belum Lengkap',
                            message: 'URL Media dan Judul Banner wajib diisi.',
                          });
                          return;
                        }
                        setFormError('');
                        const normalizedSlide: LabBannerItem = {
                          ...editingSlide,
                          url: normalizeMediaUrl(editingSlide.url),
                          posterUrl: editingSlide.posterUrl
                            ? normalizeMediaUrl(editingSlide.posterUrl)
                            : editingSlide.posterUrl,
                        };
                        const exists = slides.some((s) => s.id === normalizedSlide.id);
                        let updated: LabBannerItem[];
                        if (exists) {
                          updated = slides.map((s) =>
                            s.id === normalizedSlide.id ? normalizedSlide : s
                          );
                        } else {
                          updated = [...slides, normalizedSlide];
                        }
                        handleSaveSlides(updated);
                        setEditingSlide(null);
                        setPreviewError(false);
                        showToast({
                          type: 'success',
                          title: 'Slide Banner Disimpan',
                          message: `Banner "${normalizedSlide.title}" berhasil diperbarui.`,
                        });
                      }}
                      className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Slide Ini</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Slides List */
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-bold text-slate-800">
                      Daftar Slide Aktif ({slides.length} item)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewError(false);
                        setEditingSlide({
                          id: `banner-${Date.now()}`,
                          type: 'image',
                          url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1600&q=80',
                          title: 'Foto Baru Laboratorium',
                          subtitle: 'Deskripsi kegiatan sains atau fasilitas laboratorium.',
                          badge: 'Lab Baru',
                          labLocation: 'Gedung B . Kompleks Laboratorium',
                          categoryTag: 'Dokumentasi',
                        });
                      }}
                      className="px-3 py-1.5 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 rounded-xl font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Slide</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                    {slides.map((s, idx) => (
                      <div
                        key={s.id}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-slate-200 relative">
                            {s.type === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-teal-400">
                                <Video className="w-4 h-4" />
                              </div>
                            ) : (
                              <img
                                src={normalizeMediaUrl(s.url)}
                                alt={s.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    getFallbackBannerImage(s);
                                }}
                              />
                            )}
                            <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono bg-black/70 text-white px-1 rounded">
                              {idx + 1}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 truncate">
                              {s.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              {s.badge} · {s.labLocation}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewError(false);
                              setEditingSlide(s);
                            }}
                            className="px-2.5 py-1 text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg font-semibold"
                          >
                            Edit
                          </button>
                          {slides.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = slides.filter((it) => it.id !== s.id);
                                handleSaveSlides(next);
                                if (currentIndex >= next.length) {
                                  setCurrentIndex(0);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                              title="Hapus Slide"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 bg-teal-50/80 border border-teal-200/70 rounded-2xl text-[11px] text-teal-950 leading-relaxed space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-teal-900">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Dukungan Foto Google Drive & Fallback Sains Modern:</span>
                    </p>
                    <p className="text-slate-700">
                      1. <strong>Google Drive:</strong> Anda cukup menyalin tautan berbagi Google Drive foto kegiatan atau gedung laboratorium. Sistem otomatis mengubahnya ke direct embed link <code className="bg-white px-1 py-0.5 rounded border border-teal-200 font-mono text-[10px]">https://lh3.googleusercontent.com/d/FILE_ID</code>.
                    </p>
                    <p className="text-slate-700">
                      2. <strong>Fallback Otomatis:</strong> Apabila link foto eksternal rusak, terhapus, atau izin belum dibuka, sistem secara otomatis menampilkan foto laboratorium sains modern dari Unsplash (sesuai tema lab Fisika, Kimia, Biologi, atau SMP) tanpa ada ruang kosong/blank.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Kembalikan semua slide ke foto laboratorium bawaan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Template Bawaan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingSlide(null);
                  setFormError('');
                  setPreviewError(false);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Tutup & Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
