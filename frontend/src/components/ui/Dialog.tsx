"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md"
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle escape to close & background click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (overlayRef.current === e.target) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? "dialog-desc" : undefined}
    >
      <div
        ref={containerRef}
        className={`w-full ${sizes[size]} bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col transition-all duration-300 transform scale-100 animate-in zoom-in-95`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-surface">
          <div className="flex flex-col gap-0.5 text-left">
            <h2 id="dialog-title" className="text-base font-bold text-text-primary">
              {title}
            </h2>
            {description && (
              <p id="dialog-desc" className="text-xs text-text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-left max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
