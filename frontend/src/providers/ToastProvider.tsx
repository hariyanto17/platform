"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    custom: (toast: Omit<ToastItem, "id">) => void;
  };
  showToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4500 }: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const toast = {
    success: (message: string, title?: string, duration?: number) =>
      showToast({ type: "success", title, message, duration }),
    error: (message: string, title?: string, duration?: number) =>
      showToast({ type: "error", title, message, duration }),
    warning: (message: string, title?: string, duration?: number) =>
      showToast({ type: "warning", title, message, duration }),
    info: (message: string, title?: string, duration?: number) =>
      showToast({ type: "info", title, message, duration }),
    custom: (item: Omit<ToastItem, "id">) => showToast(item),
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />,
  };

  const borders = {
    success: "border-emerald-500/30 bg-slate-900/95 shadow-emerald-950/40 text-slate-100",
    error: "border-rose-500/40 bg-slate-900/95 shadow-rose-950/40 text-slate-100",
    warning: "border-amber-500/40 bg-slate-900/95 shadow-amber-950/40 text-slate-100",
    info: "border-sky-500/40 bg-slate-900/95 shadow-sky-950/40 text-slate-100",
  };

  const defaultTitles: Record<ToastType, string> = {
    success: "Berhasil",
    error: "Terjadi Kesalahan",
    warning: "Peringatan",
    info: "Informasi",
  };

  return (
    <ToastContext.Provider value={{ toast, showToast, dismissToast }}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="assertive"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-top-4 ${borders[t.type]}`}
          >
            {icons[t.type]}
            <div className="flex-1 text-left min-w-0 pr-1">
              <h4 className="text-sm font-bold text-slate-100 leading-tight">
                {t.title || defaultTitles[t.type]}
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words font-normal">
                {t.message}
              </p>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Tutup notifikasi"
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
