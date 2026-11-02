// ==============================================================================
// SIMLAB AR-RAHMAH CENDEKIA - CORE UTILITY HELPERS (LIGHTWEIGHT & OPTIMIZED)
// ==============================================================================

import { StudentScoreEntry, LabId } from '../types/inventory';

/**
 * Robust ID Matcher: Compares numeric or string IDs reliably without type mismatch bugs
 */
export const matchId = (a: any, b: any): boolean => {
  if (a === undefined || b === undefined || a === null || b === null) return false;
  if (String(a).trim() === String(b).trim()) return true;
  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB) && numA === numB) return true;
  return false;
};

/**
 * Safe JSON Parser for Student Practical Scores (memoization helper)
 */
export const safeParseScores = (scoresJson?: string | null): StudentScoreEntry[] => {
  if (!scoresJson || typeof scoresJson !== 'string' || scoresJson.trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(scoresJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Efficient expiry calculation helper avoiding repetitive new Date() calls in render loops
 */
export const getExpiryStatus = (
  expiredDate?: string,
  nowTimestamp: number = Date.now()
): { isExpired: boolean; daysRemaining: number; isExpiringSoon: boolean } => {
  if (!expiredDate) {
    return { isExpired: false, daysRemaining: Infinity, isExpiringSoon: false };
  }
  const expTime = new Date(expiredDate).getTime();
  if (isNaN(expTime)) {
    return { isExpired: false, daysRemaining: Infinity, isExpiringSoon: false };
  }
  const diffDays = Math.ceil((expTime - nowTimestamp) / (1000 * 60 * 60 * 24));
  return {
    isExpired: diffDays <= 0,
    daysRemaining: diffDays,
    isExpiringSoon: diffDays > 0 && diffDays <= 90,
  };
};

/**
 * Smooth UI Navigation & Highlight Helper
 */
export const highlightAndScrollTo = (elementId: string, delayMs = 220): void => {
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-teal-500', 'bg-teal-50/70', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-teal-500', 'bg-teal-50/70');
      }, 2200);
    }
  }, delayMs);
};

/**
 * Determine School Unit (SMP vs SMA) from class name or explicit unit field
 */
export const getSchoolUnit = (namaKelas?: string, explicitUnit?: 'SMP' | 'SMA'): 'SMP' | 'SMA' => {
  if (explicitUnit === 'SMP' || explicitUnit === 'SMA') return explicitUnit;
  if (!namaKelas) return 'SMA';
  const upper = namaKelas.toUpperCase();
  if (upper.includes('SMP') || upper.includes('VII') || upper.includes('VIII') || upper.includes('IX')) {
    return 'SMP';
  }
  return 'SMA';
};

/**
 * Determine Academic Semester from Date String (YYYY-MM-DD)
 * Semester Ganjil: Bulan Juli s.d. Desember (7 - 12)
 * Semester Genap: Bulan Januari s.d. Juni (1 - 6)
 */
export const getSemesterFromDate = (dateStr?: string): 'Ganjil' | 'Genap' => {
  if (!dateStr) return 'Ganjil';
  try {
    const month = new Date(dateStr).getMonth() + 1;
    if (month >= 7 && month <= 12) return 'Ganjil';
    return 'Genap';
  } catch {
    return 'Ganjil';
  }
};

/**
 * E-Raport Predicate & Standardized Competency Evaluation
 * KKM Nasional Standar Sains: 75
 * A: 90 - 100 (Sangat Baik / Terpuji)
 * B: 80 - 89.9 (Baik)
 * C: 75 - 79.9 (Cukup)
 * D: < 75 (Perlu Bimbingan / Belum Tuntas)
 */
export const getGradePredicate = (
  score: number
): {
  predicate: 'A' | 'B' | 'C' | 'D';
  keterangan: 'Tuntas' | 'Belum Tuntas';
  deskripsi: string;
  badgeClass: string;
} => {
  if (isNaN(score) || score <= 0) {
    return {
      predicate: 'D',
      keterangan: 'Belum Tuntas',
      deskripsi: 'Belum ada penilaian tuntas',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }
  if (score >= 90) {
    return {
      predicate: 'A',
      keterangan: 'Tuntas',
      deskripsi: 'Sangat terampil dan teliti dalam prosedur sains',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  }
  if (score >= 80) {
    return {
      predicate: 'B',
      keterangan: 'Tuntas',
      deskripsi: 'Terampil dan mandiri melaksanakan praktikum',
      badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
    };
  }
  if (score >= 75) {
    return {
      predicate: 'C',
      keterangan: 'Tuntas',
      deskripsi: 'Cukup terampil, perlu peningkatan ketelitian',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }
  return {
    predicate: 'D',
    keterangan: 'Belum Tuntas',
    deskripsi: 'Perlu bimbingan intensif dan remedial laboratorium',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
  };
};

export interface OfficialSigner {
  nama: string;
  nip: string;
  jabatan: string;
  instansi: string;
}

/**
 * 1. Resolves Penanggung Jawab Laboratorium (PJ Lab) based on specific Lab ID.
 * - FISIKA: Oktaviawan Arif Sudarsono, M. Pd., Gr.
 * - BIOLOGI: Siti Aminatuh Juhriah, M. Si., Gr.
 * - SMP_TERPADU: Farkhatul Amaliya, S. Pd
 * - KIMIA: Ilham Nurkholis Majid, S. Pd., Gr.
 * - ALL: Oktaviawan Arif Sudarsono, M. Pd., Gr. (Koordinator PJ)
 */
export const getOfficialLabPJ = (
  labId: LabId | 'ALL',
  customOverrides?: { pjNama?: string; pjNip?: string; pjTitle?: string; pjInstansi?: string }
): OfficialSigner => {
  switch (labId) {
    case 'FISIKA':
      return {
        nama: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
        nip: 'NIPY. 2026.ARC.0412',
        jabatan: 'Penanggung Jawab Lab Fisika (SMA)',
        instansi: 'SMA IT Ar-Rahmah Cendekia',
      };
    case 'BIOLOGI':
      return {
        nama: 'Siti Aminatuh Juhriah, M. Si., Gr.',
        nip: 'NIPY. 2026.ARC.0414',
        jabatan: 'Penanggung Jawab Lab Biologi (SMA)',
        instansi: 'SMA IT Ar-Rahmah Cendekia',
      };
    case 'SMP_TERPADU':
      return {
        nama: 'Farkhatul Amaliya, S. Pd',
        nip: 'NIPY. 2026.ARC.0415',
        jabatan: 'Penanggung Jawab Lab IPA Terpadu (SMP)',
        instansi: 'SMP IT Ar-Rahmah Cendekia',
      };
    case 'KIMIA':
      return {
        nama: 'Ilham Nurkholis Majid, S. Pd., Gr.',
        nip: 'NIPY. 2026.ARC.0101',
        jabatan: 'Penanggung Jawab Lab Kimia (SMA)',
        instansi: 'SMA IT Ar-Rahmah Cendekia',
      };
    case 'ALL':
    default:
      return {
        nama: customOverrides?.pjNama?.trim() || 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
        nip: customOverrides?.pjNip?.trim() || 'NIPY. 2026.ARC.0412',
        jabatan: customOverrides?.pjTitle?.trim() || 'Penanggung Jawab Laboratorium',
        instansi: customOverrides?.pjInstansi?.trim() || 'SMP dan SMA IT Ar-Rahmah Cendekia',
      };
  }
};

/**
 * 2. Resolves Guru Mata Pelajaran for E-Raport (CUKUP 2 TTD: Guru Mapel & Kepala Lab).
 * - Format NIP sesuai NIP akun laboran masing-masing:
 *   * FISIKA: Oktaviawan Arif Sudarsono, M. Pd., Gr. -> NIP: 2025.14.02.08
 *   * BIOLOGI: Siti Aminatuh Juhriah, M. Si., Gr. -> NIP: 2025.14.02.10
 *   * KIMIA: Ilham Nurkholis Majid, S. Pd., Gr. -> NIP: 2025.14.02.03
 *   * IPA SMP: Farkhatul Amaliya, S. Pd (Belum memiliki NIP) -> NIP: -
 */
export const getOfficialGuruMapel = (
  labId: LabId | 'ALL',
  unit?: 'SMP' | 'SMA' | string,
  currentUserName?: string,
  currentUserNip?: string
): OfficialSigner => {
  const isSmp = labId === 'SMP_TERPADU' || unit === 'SMP';

  if (isSmp) {
    return {
      nama: 'Farkhatul Amaliya, S. Pd',
      nip: 'NIP: -', // Guru IPA (SMP) belum memiliki NIP ditulis "-"
      jabatan: 'Guru Mata Pelajaran IPA Terpadu',
      instansi: 'SMP IT Ar-Rahmah Cendekia',
    };
  }

  if (labId === 'FISIKA') {
    return {
      nama: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
      nip: 'NIP: 2025.14.02.08',
      jabatan: 'Guru Mata Pelajaran Fisika',
      instansi: 'SMA IT Ar-Rahmah Cendekia',
    };
  }

  if (labId === 'BIOLOGI') {
    return {
      nama: 'Siti Aminatuh Juhriah, M. Si., Gr.',
      nip: 'NIP: 2025.14.02.10',
      jabatan: 'Guru Mata Pelajaran Biologi',
      instansi: 'SMA IT Ar-Rahmah Cendekia',
    };
  }

  if (labId === 'KIMIA') {
    return {
      nama: 'Ilham Nurkholis Majid, S. Pd., Gr.',
      nip: 'NIP: 2025.14.02.03',
      jabatan: 'Guru Mata Pelajaran Kimia',
      instansi: 'SMA IT Ar-Rahmah Cendekia',
    };
  }

  if (currentUserName && currentUserName !== 'Administrator Lab') {
    return {
      nama: currentUserName,
      nip:
        currentUserNip && currentUserNip !== '-'
          ? currentUserNip.startsWith('NIP')
            ? currentUserNip
            : `NIP: ${currentUserNip}`
          : 'NIP: -',
      jabatan: 'Guru Pengampu Praktikum Sains SMA',
      instansi: 'SMA IT Ar-Rahmah Cendekia',
    };
  }

  return {
    nama: 'Oktaviawan Arif Sudarsono, M. Pd., Gr.',
    nip: 'NIP: 2025.14.02.08',
    jabatan: 'Guru Pengampu Praktikum Sains SMA',
    instansi: 'SMA IT Ar-Rahmah Cendekia',
  };
};

/**
 * 3. Resolves Kepala Laboratorium IPA Terpadu
 * - Untuk E-Raport menggunakan NIP: 2025.14.02.03 (sesuai NIP akun laboran beliau)
 * - Untuk Dokumen Inventaris dapat menggunakan format NIPY jika diperlukan
 */
export const getOfficialKepalaLab = (
  customNama?: string,
  customNip?: string,
  format: 'NIP' | 'NIPY' = 'NIP'
): OfficialSigner => {
  let finalNip = format === 'NIP' ? 'NIP: 2025.14.02.03' : 'NIPY. 2026.ARC.0101';
  if (customNip && customNip.trim()) {
    if (format === 'NIP' && customNip.includes('2026.ARC.0101')) {
      finalNip = 'NIP: 2025.14.02.03';
    } else {
      finalNip = customNip.trim();
    }
  }
  return {
    nama: customNama?.trim() || 'Ilham Nurkholis Majid, S. Pd., Gr.',
    nip: finalNip,
    jabatan: 'Kepala Laboratorium IPA Terpadu',
    instansi: 'SMP dan SMA IT Ar-Rahmah Cendekia',
  };
};

/**
 * 4. Resolves Kepala Sekolah SMA IT Ar-Rahmah (Narendra Ichiputra Hariyanto)
 */
export const getOfficialKepalaSekolah = (customNama?: string, customNip?: string): OfficialSigner => ({
  nama: customNama?.trim() || 'Narendra Ichiputra Hariyanto, M. Pd.',
  nip: customNip?.trim() || 'NIPY. 2026.ARC.0002',
  jabatan: 'Mengetahui, Kepala Sekolah SMA IT Ar-Rahmah',
  instansi: 'SMA IT Ar-Rahmah Cendekia',
});

