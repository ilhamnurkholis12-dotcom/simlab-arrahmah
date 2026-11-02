import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { LAB_DEFINITIONS, LabId } from '../types/inventory';
import {
  getOfficialLabPJ,
  getOfficialGuruMapel,
  getOfficialKepalaLab,
  getOfficialKepalaSekolah,
} from '../utils/helpers';

interface PrintReportHeaderProps {
  title: string;
  subtitle?: string;
  selectedLab?: LabId | 'ALL';
  extraMetadata?: { label: string; value: string | number }[];
}

export const PrintReportHeader: React.FC<PrintReportHeaderProps> = ({
  title,
  subtitle,
  selectedLab = 'ALL',
  extraMetadata = [],
}) => {
  const { settings, currentUser, kopConfig } = useInventory();
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const labLabel =
    selectedLab === 'ALL'
      ? 'Seluruh Laboratorium IPA (Master)'
      : LAB_DEFINITIONS[selectedLab]?.name || selectedLab;

  return (
    <div className="print-only mb-6 text-black">
      {/* Kop Surat Resmi */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900 gap-4">
        <div className="w-16 h-16 shrink-0 flex items-center justify-center">
          <img
            src={kopConfig.logoUrl || settings.logo_url || '/src/assets/images/arcss_logo_official.svg'}
            alt="Logo Sekolah"
            className="w-14 h-14 object-contain"
          />
        </div>

        <div className="flex-1 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-700">
            {kopConfig.namaYayasan || 'YAYASAN BAYTU RAHMAH MADANIA'}
          </div>
          <div className="text-base font-extrabold tracking-tight uppercase text-slate-900 leading-tight">
            {kopConfig.namaSekolah || settings.nama_sekolah || 'SMP dan SMA IT Ar-Rahmah Cendekia'}
          </div>
          <div className="text-xs font-bold text-emerald-900 uppercase">
            {kopConfig.unitLaboratorium || 'Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia'}
          </div>
          <div className="text-[8.5px] text-slate-600 mt-0.5 leading-snug">
            {kopConfig.alamat ||
              'Gedung B Unit Laboratorium IPA Terpadu SMP dan SMA IT Ar-Rahmah Cendekia, Jl. Raya Merdeka No.338, RT.003/RW.002, Cimone Jaya, Kec. Karawaci, Kota Tangerang, Banten 15114'}
            <span className="block text-[8px] text-slate-400 mt-0.5">
              Sistem Terpusat: {settings.nama_sistem || 'SIMLAB AR-RAHMAH CENDEKIA'}
            </span>
          </div>
        </div>

        <div className="w-16 h-16 shrink-0 flex flex-col items-center justify-center text-center border border-slate-300 rounded p-1 text-[8px] leading-tight">
          <span className="font-bold text-slate-800">TA</span>
          <span className="font-mono font-bold text-[9px] text-emerald-800">
            {settings.tahun_ajaran || '2025/2026'}
          </span>
          <span className="text-[7px] text-slate-500 mt-0.5">TERAKREDITASI</span>
        </div>
      </div>

      {/* Garis Ganda Kop Surat */}
      <div className="border-b border-slate-900 mt-0.5 mb-4" />

      {/* Judul Dokumen Laporan */}
      <div className="text-center mb-4">
        <h1 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[10px] text-slate-600 font-medium mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Ringkasan Parameter / Metadata Laporan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 rounded border border-slate-300 text-[9px] mb-4">
        <div>
          <span className="text-slate-500 block">Unit Laboratorium:</span>
          <span className="font-bold text-slate-900">{labLabel}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Tanggal Cetak:</span>
          <span className="font-bold text-slate-900">{currentDate}, {currentTime} WIB</span>
        </div>
        <div>
          <span className="text-slate-500 block">Operator / Petugas:</span>
          <span className="font-bold text-slate-900">
            {currentUser?.name || 'Administrator Lab'} ({currentUser?.roleTitle || 'Petugas'})
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Status Dokumen:</span>
          <span className="font-bold text-emerald-800 uppercase">Resmi Terverifikasi</span>
        </div>

        {extraMetadata.map((meta, idx) => (
          <div key={idx} className="col-span-1">
            <span className="text-slate-500 block">{meta.label}:</span>
            <span className="font-bold text-slate-900">{meta.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PrintSignaturesProps {
  selectedLab?: LabId | 'ALL';
}

/**
 * 1. Tanda Tangan Resmi Dokumen Inventaris Laboratorium (3 Kolom: PJ Lab, Kepala Lab, Kepala Sekolah)
 * - PJ Lab dinamis: Fisika -> Oktaviawan Arif, Biologi -> Siti Aminatuh, SMP -> Farkhatul Amaliya, Kimia -> Ilham Nurkholis
 * - Kepala Lab: Ilham Nurkholis Majid, S. Pd., Gr.
 * - Kepala Sekolah SMA IT Ar-Rahmah: Narendra Ichiputra Hariyanto, M. Pd.
 */
export const PrintSignatures: React.FC<PrintSignaturesProps> = ({ selectedLab = 'ALL' }) => {
  const { kopConfig } = useInventory();
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const displayDate = kopConfig.tanggalPenetapan?.trim() || currentDate;
  const displayCity = kopConfig.kotaPenetapan?.trim() || 'Kota Tangerang';

  // Penanggung Jawab Lab masing-masing bagian (bukan pak Oktaviawan semua)
  const pjInfo = getOfficialLabPJ(selectedLab, {
    pjNama: kopConfig.pjNama,
    pjNip: kopConfig.pjNip,
    pjTitle: kopConfig.pjTitle,
    pjInstansi: kopConfig.pjInstansi,
  });

  const kepalaLabInfo = getOfficialKepalaLab(kopConfig.kepalaLabNama, kopConfig.kepalaLabNip);
  const kepalaSekolahInfo = getOfficialKepalaSekolah(kopConfig.kepalaSekolahNama, kopConfig.kepalaSekolahNip);

  return (
    <div className="print-only print-avoid-break mt-8 pt-4 text-black text-[9px]">
      <div className="text-right text-[9px] text-slate-600 mb-4 font-medium">
        Ditetapkan di {displayCity}, pada tanggal {displayDate}
      </div>

      <div className="grid grid-cols-3 gap-6 text-center">
        {/* Kolom 1: Penanggung Jawab Laboratorium Bagian */}
        <div className="flex flex-col justify-between h-28">
          <div>
            <div className="font-bold text-slate-900">{pjInfo.jabatan}</div>
            <div className="text-[8px] text-slate-600">{pjInfo.instansi}</div>
          </div>
          <div>
            <div className="font-bold underline text-slate-900">{pjInfo.nama}</div>
            <div className="text-[7.5px] text-slate-500 font-mono">{pjInfo.nip}</div>
          </div>
        </div>

        {/* Kolom 2: Kepala Laboratorium IPA Terpadu */}
        <div className="flex flex-col justify-between h-28">
          <div>
            <div className="font-bold text-slate-900">{kepalaLabInfo.jabatan}</div>
            <div className="text-[8px] text-slate-600">{kepalaLabInfo.instansi}</div>
          </div>
          <div>
            <div className="font-bold underline text-slate-900">{kepalaLabInfo.nama}</div>
            <div className="text-[7.5px] text-slate-500 font-mono">{kepalaLabInfo.nip}</div>
          </div>
        </div>

        {/* Kolom 3: Kepala Sekolah SMA IT Ar-Rahmah */}
        <div className="flex flex-col justify-between h-28">
          <div>
            <div className="font-bold text-slate-900">{kepalaSekolahInfo.jabatan}</div>
            <div className="text-[8px] text-slate-600">{kepalaSekolahInfo.instansi}</div>
          </div>
          <div>
            <div className="font-bold underline text-slate-900">{kepalaSekolahInfo.nama}</div>
            <div className="text-[7.5px] text-slate-500 font-mono">{kepalaSekolahInfo.nip}</div>
          </div>
        </div>
      </div>

      <div className="text-center text-[7.5px] text-slate-400 mt-6 pt-2 border-t border-slate-200">
        Dicetak otomatis melalui SIMLAB AR-RAHMAH CENDEKIA · Dokumen Sah Inventaris Laboratorium Sekolah
      </div>
    </div>
  );
};

interface PrintSignaturesERaportProps {
  selectedLab?: LabId | 'ALL';
  activeUnit?: 'SMP' | 'SMA';
  guruName?: string;
  guruNip?: string;
}

/**
 * 2. Tanda Tangan Resmi Dokumen E-Raport (CUKUP 2 Kolom: Guru Mapel & Kepala Lab IPA Terpadu)
 * - Tanpa Penanggung Jawab Lab ataupun Kepala Sekolah
 * - Guru Mapel: Fisika (Oktaviawan Arif), Biologi (Siti Aminatuh), SMP (Farkhatul Amaliya), Kimia (Ilham Nurkholis)
 * - Kepala Lab: Ilham Nurkholis Majid, S. Pd., Gr.
 */
export const PrintSignaturesERaport: React.FC<PrintSignaturesERaportProps> = ({
  selectedLab = 'ALL',
  activeUnit = 'SMA',
  guruName,
  guruNip,
}) => {
  const { kopConfig, currentUser } = useInventory();
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const displayDate = kopConfig.tanggalPenetapan?.trim() || currentDate;
  const displayCity = kopConfig.kotaPenetapan?.trim() || 'Kota Tangerang';

  // Check explicitly if signer represents a teacher of IPA Terpadu (SMP)
  const isIPASmpTeacher =
    currentUser?.role === 'GURU_IPA_SMP' ||
    currentUser?.assignedLab === 'SMP_TERPADU' ||
    selectedLab === 'SMP_TERPADU' ||
    activeUnit === 'SMP';

  const officialGuru = getOfficialGuruMapel(
    selectedLab,
    activeUnit,
    guruName || currentUser?.name,
    isIPASmpTeacher ? '-' : (guruNip || currentUser?.nip)
  );

  // Force '-' for IPA Terpadu (SMP) teacher, maintain NIP for SMA subject teachers
  const teacherNipDisplay = isIPASmpTeacher
    ? 'NIP: -'
    : officialGuru.nip;

  const officialKepalaLab = getOfficialKepalaLab(
    kopConfig.kepalaLabNama,
    kopConfig.kepalaLabNip,
    'NIP'
  );

  return (
    <div className="print-only print-avoid-break mt-8 pt-4 text-black text-[9.5px]">
      <div className="text-right text-[9px] text-slate-600 mb-4 font-medium">
        Ditetapkan di {displayCity}, pada tanggal {displayDate}
      </div>

      <div className="grid grid-cols-2 gap-12 text-center max-w-2xl mx-auto">
        {/* Kolom 1 (Kiri): Guru Mata Pelajaran */}
        <div className="flex flex-col justify-between h-28">
          <div>
            <div className="font-bold text-slate-900">{officialGuru.jabatan}</div>
            <div className="text-[8px] text-slate-600">{officialGuru.instansi}</div>
          </div>
          <div>
            <div className="font-bold underline text-slate-900">{officialGuru.nama}</div>
            <div className="text-[8px] text-slate-500 font-mono">{teacherNipDisplay}</div>
          </div>
        </div>

        {/* Kolom 2 (Kanan): Mengetahui, Kepala Laboratorium IPA Terpadu */}
        <div className="flex flex-col justify-between h-28">
          <div>
            <div className="font-bold text-slate-900">{officialKepalaLab.jabatan}</div>
            <div className="text-[8px] text-slate-600">{officialKepalaLab.instansi}</div>
          </div>
          <div>
            <div className="font-bold underline text-slate-900">{officialKepalaLab.nama}</div>
            <div className="text-[8px] text-slate-500 font-mono">{officialKepalaLab.nip}</div>
          </div>
        </div>
      </div>

      <div className="text-center text-[7.5px] text-slate-400 mt-6 pt-2 border-t border-slate-200">
        Dicetak otomatis melalui SIMLAB AR-RAHMAH CENDEKIA · Dokumen Sah Penilaian E-Raport Praktikum Sains
      </div>
    </div>
  );
};
