import React, { useEffect, useState, useRef } from 'react';
import { ToastMessage, ToastType } from '../types/inventory';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ToastItemComponent: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const duration = toast.duration ?? 4500;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const remainingRef = useRef(duration);
  const lastTimeRef = useRef<number>(Date.now());
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (duration <= 0) return;

    lastTimeRef.current = Date.now();
    const intervalTime = 50;

    const timer = setInterval(() => {
      if (isPaused) {
        lastTimeRef.current = Date.now();
        return;
      }

      const now = Date.now();
      const elapsed = now - lastTimeRef.current;
      lastTimeRef.current = now;

      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      const newProgress = Math.max(0, (remainingRef.current / duration) * 100);
      setProgress(newProgress);

      if (remainingRef.current <= 0) {
        clearInterval(timer);
        onDismissRef.current(toast.id);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [duration, isPaused, toast.id]);

  const configByType: Record<
    ToastType,
    {
      borderColor: string;
      accentBg: string;
      barColor: string;
      icon: React.ReactNode;
      badgeText: string;
      badgeClass: string;
      defaultTitle: string;
    }
  > = {
    success: {
      borderColor: 'border-emerald-200 shadow-emerald-900/10',
      accentBg: 'bg-emerald-100 text-emerald-800',
      barColor: 'bg-emerald-600',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
      badgeText: 'Berhasil',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      defaultTitle: 'Operasi Berhasil',
    },
    error: {
      borderColor: 'border-rose-200 shadow-rose-900/15',
      accentBg: 'bg-rose-100 text-rose-800',
      barColor: 'bg-rose-600',
      icon: <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />,
      badgeText: 'ACL Security',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
      defaultTitle: 'Akses Ditolak / Gagal',
    },
    warning: {
      borderColor: 'border-amber-200 shadow-amber-900/10',
      accentBg: 'bg-amber-100 text-amber-800',
      barColor: 'bg-amber-500',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
      badgeText: 'Peringatan',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      defaultTitle: 'Perhatian',
    },
    info: {
      borderColor: 'border-sky-200 shadow-sky-900/10',
      accentBg: 'bg-sky-100 text-sky-800',
      barColor: 'bg-sky-600',
      icon: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
      badgeText: 'Info SIMLAB',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      defaultTitle: 'Informasi Sistem',
    },
  };

  const currentConfig = configByType[toast.type] || configByType.info;
  const displayTitle = toast.title || currentConfig.defaultTitle;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative w-full bg-white/95 backdrop-blur-md rounded-2xl border ${currentConfig.borderColor} shadow-xl overflow-hidden transition-all duration-300 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-top-3`}
    >
      <div className="p-3.5 sm:p-4 flex items-start gap-3">
        {/* Icon Container */}
        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${currentConfig.accentBg}`}>
          {currentConfig.icon}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {displayTitle}
            </h4>
            <span
              className={`text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border shrink-0 ${currentConfig.badgeClass}`}
            >
              {currentConfig.badgeText}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium break-words">
            {toast.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Tutup notifikasi"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 -mr-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Countdown Progress Bar */}
      {duration > 0 && (
        <div className="w-full h-1 bg-slate-100 overflow-hidden">
          <div
            className={`h-full ${currentConfig.barColor} transition-all ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifikasi Sistem"
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[99999] flex flex-col gap-2.5 pointer-events-none max-w-sm sm:max-w-md w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
