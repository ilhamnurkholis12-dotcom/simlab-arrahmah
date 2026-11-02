export interface LabBannerItem {
  id: string;
  type: 'image' | 'video';
  url: string; // URL gambar (JPG/PNG/WebP/Google Drive) atau URL video (MP4/WebM)
  posterUrl?: string; // Gambar thumbnail cadangan jika media berupa video
  title: string;
  subtitle: string;
  badge: string;
  labLocation: string; // Lokasi gedung resmi
  categoryTag: string;
}

/**
 * KOLEKSI GAMBAR FALLBACK TEMA LABORATORIUM SAINS MODERN (16:9 LANDSCAPE)
 * Digunakan secara otomatis apabila link foto kustom pengguna gagal dimuat / error.
 */
export const FALLBACK_LAB_IMAGES = {
  FISIKA:
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1600&q=80', // Instrumen optik & fisika eksperimental
  KIMIA:
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80', // Larutan kimia, tabung reaksi & reagen
  BIOLOGI:
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1600&q=80', // Mikroskop & observasi preparat biologi
  SMP_TERPADU:
    'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1600&q=80', // Praktikum inkuiri sains terpadu SMP
  DEFAULT:
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80', // Laboratorium sains canggih serbaguna
};

/**
 * Mengambil URL fallback bertema laboratorium berdasarkan lab atau kata kunci slide
 */
export const getFallbackBannerImage = (slide?: Partial<LabBannerItem>): string => {
  if (!slide) return FALLBACK_LAB_IMAGES.DEFAULT;
  const combined = `${slide.id || ''} ${slide.badge || ''} ${slide.title || ''} ${slide.labLocation || ''} ${slide.categoryTag || ''}`.toUpperCase();

  if (combined.includes('FISIKA')) return FALLBACK_LAB_IMAGES.FISIKA;
  if (combined.includes('KIMIA')) return FALLBACK_LAB_IMAGES.KIMIA;
  if (combined.includes('BIOLOGI')) return FALLBACK_LAB_IMAGES.BIOLOGI;
  if (combined.includes('SMP') || combined.includes('TERPADU')) return FALLBACK_LAB_IMAGES.SMP_TERPADU;

  return FALLBACK_LAB_IMAGES.DEFAULT;
};

/**
 * KONVERSI OTOMATIS LINK GOOGLE DRIVE KE DIRECT EMBED URL
 * Mengubah format tautan Google Drive menjadi:
 * https://lh3.googleusercontent.com/d/FILE_ID
 * 
 * Mendukung format input:
 * 1. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * 2. https://drive.google.com/file/d/FILE_ID/view
 * 3. https://drive.google.com/open?id=FILE_ID
 * 4. https://drive.google.com/uc?id=FILE_ID
 * 5. https://drive.google.com/uc?export=view&id=FILE_ID
 * 6. https://lh3.googleusercontent.com/d/FILE_ID (sudah direct)
 * 7. Raw File ID (33 karakter alphanumeric)
 */
export const normalizeMediaUrl = (inputUrl: string): string => {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();

  // 1. Sudah berformat lh3.googleusercontent.com/d/
  if (trimmed.includes('lh3.googleusercontent.com/d/')) {
    return trimmed;
  }

  // 2. Format: drive.google.com/file/d/{FILE_ID}/...
  const driveFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  // 3. Format query parameter: ?id={FILE_ID} atau &id={FILE_ID}
  const driveIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (
    driveIdMatch &&
    driveIdMatch[1] &&
    (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com'))
  ) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  // 4. Raw Google Drive file ID (25 hingga 50 karakter alfanumerik / strip / garis bawah)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return `https://lh3.googleusercontent.com/d/${trimmed}`;
  }

  return trimmed;
};

/**
 * STRUKTUR DATA ARRAY BANNER DOKUMENTASI GEDUNG & KEGIATAN LABORATORIUM
 * SMP & SMA IT AR-RAHMAH CENDEKIA
 * 
 * PANDUAN PENGGANTIAN LINK FOTO / VIDEO OLEH PENGGUNA:
 * Anda dapat langsung mengganti properti `url` di bawah ini dengan link foto asli gedung
 * (termasuk link Google Drive yang otomatis dikonversi ke format direct link `https://lh3.googleusercontent.com/d/FILE_ID`)
 * atau video dokumentasi praktikum santri SMP & SMA IT Ar-Rahmah Cendekia.
 */
export const DEFAULT_LAB_BANNERS: LabBannerItem[] = [
  {
    id: 'banner-fisika',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1600&q=80',
    title: 'Laboratorium Fisika & Eksperimen Optik',
    subtitle: 'Fasilitas praktikum mekanika, optika canggih, kelistrikan, dan gelombang bagi santri SMA IT Ar-Rahmah Cendekia.',
    badge: 'Lab Fisika (SMA)',
    labLocation: 'Gedung B Lt. 2 . R. Physics Lab',
    categoryTag: 'Instrumentasi Eksperimental',
  },
  {
    id: 'banner-kimia',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80',
    title: 'Laboratorium Kimia Terpadu & Reagen',
    subtitle: 'Ruang reaksi stoikiometri, titrasi asam basa, serta analisis larutan kimia dengan standar K3 keselamatan laboratorium lengkap.',
    badge: 'Lab Kimia (SMA)',
    labLocation: 'Gedung B Lt. 1 . R. Chemistry Lab',
    categoryTag: 'Reagen & Analisis Kimia',
  },
  {
    id: 'banner-biologi',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1600&q=80',
    title: 'Laboratorium Biologi & Pengamatan Mikroskopis',
    subtitle: 'Observasi sitologi sel, preparat jaringan basah, fisiologi hayati, dan pembedahan anatomi untuk eksplorasi biologi modern.',
    badge: 'Lab Biologi (SMA)',
    labLocation: 'Gedung B Lt. 1 . R. Biology Lab',
    categoryTag: 'Mikroskopi & Hayati',
  },
  {
    id: 'banner-smp',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1600&q=80',
    title: 'Laboratorium IPA Terpadu Santri SMP',
    subtitle: 'Wahana inkuiri sains terpadu, kit praktikum tematik, dan pembentukan karakter saintis muda muslim berakhlak mulia.',
    badge: 'Lab IPA Terpadu (SMP)',
    labLocation: 'Gedung B Lt. 1 & 2 . R. Science Lab',
    categoryTag: 'Inkuiri Sains SMP',
  },
  {
    id: 'banner-video-k3',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
    title: 'Klip Video Dokumentasi & Budaya Keselamatan Kerja Lab',
    subtitle: 'Video profil panduan SOP keselamatan kerja (K3), tata tertib penggunaan alat gelas, dan rekam suasana praktikum terpadu.',
    badge: 'Video Profil Laboratorium',
    labLocation: 'Gedung B Lt. 1 & 2 . Kompleks Laboratorium Sains',
    categoryTag: 'Dokumentasi & Video',
  },
];
