"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DatePickerProps {
  mode?: "date" | "time" | "datetime";
  value?: string | null;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
  size?: "sm" | "md";
  className?: string;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const WEEK_DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export const DatePicker: React.FC<DatePickerProps> = ({
  mode = "date",
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  size = "md",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Position coordinates state
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Initial value parser helpers
  const parseInitialState = useCallback(() => {
    let d: Date | null = null;
    let h = 12;
    let m = 0;
    const now = new Date();
    let yr = now.getFullYear();
    let mo = now.getMonth();

    if (value) {
      if (mode === "time") {
        const [hour, min] = value.split(":").map(Number);
        if (!isNaN(hour) && !isNaN(min)) {
          h = hour;
          m = min;
        }
      } else if (mode === "date") {
        const parts = value.split("-").map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          d = new Date(parts[0], parts[1] - 1, parts[2]);
          yr = d.getFullYear();
          mo = d.getMonth();
        } else {
          const parsed = new Date(value);
          if (!isNaN(parsed.getTime())) {
            d = parsed;
            yr = d.getFullYear();
            mo = d.getMonth();
          }
        }
      } else {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          d = parsed;
          h = d.getHours();
          m = d.getMinutes();
          yr = d.getFullYear();
          mo = d.getMonth();
        }
      }
    }

    return { selectedDate: d, selectedHours: h, selectedMinutes: m, currentYear: yr, currentMonth: mo };
  }, [value, mode]);

  const initial = parseInitialState();
  const [currentYear, setCurrentYear] = useState(initial.currentYear);
  const [currentMonth, setCurrentMonth] = useState(initial.currentMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(initial.selectedDate);
  const [selectedHours, setSelectedHours] = useState(initial.selectedHours);
  const [selectedMinutes, setSelectedMinutes] = useState(initial.selectedMinutes);

  // Position calculation logic
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = mode === "datetime" ? 440 : 310;
      const popoverHeight = mode === "datetime" ? 360 : 320;

      let left = rect.left;
      // Adjust horizontally to stay within viewport
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) left = 16;

      // Adjust vertically (open upwards if not enough bottom space)
      let top = rect.bottom + 8;
      if (top + popoverHeight > window.innerHeight && rect.top > popoverHeight) {
        top = rect.top - popoverHeight - 8;
      }

      setCoords({ top, left, width: rect.width });
    }
  }, [mode]);

  // Click outside to close & resize listener
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  // Calendar navigation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y: number) => y - 1);
    } else {
      setCurrentMonth((m: number) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y: number) => y + 1);
    } else {
      setCurrentMonth((m: number) => m + 1);
    }
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(currentYear, currentMonth, day);
    setSelectedDate(selected);

    if (mode === "date") {
      const yStr = selected.getFullYear();
      const mStr = String(selected.getMonth() + 1).padStart(2, "0");
      const dStr = String(selected.getDate()).padStart(2, "0");
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());

    if (mode === "date") {
      const yStr = today.getFullYear();
      const mStr = String(today.getMonth() + 1).padStart(2, "0");
      const dStr = String(today.getDate()).padStart(2, "0");
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
    }
  };

  const handleSetYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setSelectedDate(yest);
    setCurrentYear(yest.getFullYear());
    setCurrentMonth(yest.getMonth());

    if (mode === "date") {
      const yStr = yest.getFullYear();
      const mStr = String(yest.getMonth() + 1).padStart(2, "0");
      const dStr = String(yest.getDate()).padStart(2, "0");
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
    }
  };

  const handleConfirmDateTime = () => {
    if (mode === "time") {
      const hStr = String(selectedHours).padStart(2, "0");
      const mStr = String(selectedMinutes).padStart(2, "0");
      onChange(`${hStr}:${mStr}`);
    } else if (mode === "datetime") {
      if (!selectedDate) {
        onChange("");
      } else {
        const yStr = selectedDate.getFullYear();
        const mStr = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const dStr = String(selectedDate.getDate()).padStart(2, "0");
        const hStr = String(selectedHours).padStart(2, "0");
        const minStr = String(selectedMinutes).padStart(2, "0");
        onChange(`${yStr}-${mStr}-${dStr}T${hStr}:${minStr}`);
      }
    }
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange("");
    setSelectedDate(null);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder || (mode === "time" ? "Pilih waktu" : mode === "date" ? "Pilih tanggal" : "Pilih tanggal & waktu");

    if (mode === "time") return value;

    if (mode === "date") {
      const parts = value.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      }
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }

    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()} ${hours}:${minutes}`;
  };

  const isDaySelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  const isDateDisabled = (day: number) => {
    const dateToCheck = new Date(currentYear, currentMonth, day);
    if (minDate) {
      const checkMin = typeof minDate === "string" ? new Date(minDate) : minDate;
      checkMin.setHours(0, 0, 0, 0);
      if (dateToCheck < checkMin) return true;
    }
    if (maxDate) {
      const checkMax = typeof maxDate === "string" ? new Date(maxDate) : maxDate;
      checkMax.setHours(23, 59, 59, 999);
      if (dateToCheck > checkMax) return true;
    }
    return false;
  };

  const renderPopover = () => {
    if (!isOpen || !mounted) return null;

    const popoverWidthClass = mode === "datetime" ? "w-[440px]" : "w-[300px]";

    return createPortal(
      <div
        ref={popoverRef}
        style={{
          position: "absolute",
          top: `${coords.top}px`,
          left: `${coords.left}px`,
        }}
        className={`z-[9999] p-3.5 bg-surface border border-border/80 shadow-2xl rounded-xl select-none text-text-primary backdrop-blur-md transition-all animate-in fade-in zoom-in-95 ${popoverWidthClass}`}
      >
        {/* Calendar Picker */}
        {(mode === "date" || mode === "datetime") && (
          <div className="space-y-3">
            {/* Header: Month Year + Quick controls */}
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <span className="font-bold text-xs text-text-primary tracking-wide">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Bulan sebelumnya"
                  className="p-1 rounded-md hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Bulan berikutnya"
                  className="p-1 rounded-md hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-surface-secondary hover:bg-primary-soft text-text-secondary hover:text-primary transition cursor-pointer border border-border/50"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-surface-secondary hover:bg-primary-soft text-text-secondary hover:text-primary transition cursor-pointer border border-border/50"
              >
                Kemarin
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => handleClear()}
                  className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded bg-error-soft text-error hover:bg-error/20 transition cursor-pointer border border-error/20"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Day name headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="py-0.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const isSel = isDaySelected(day);
                const isTod = isToday(day);
                const isDis = isDateDisabled(day);

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    disabled={isDis}
                    onClick={() => handleDateSelect(day)}
                    className={`h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      isSel
                        ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
                        : isTod
                        ? "bg-surface-secondary text-primary font-bold border border-primary/40 hover:bg-primary-soft"
                        : "text-text-primary hover:bg-surface-secondary"
                    } disabled:opacity-25 disabled:cursor-not-allowed`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Time Selector */}
        {(mode === "time" || mode === "datetime") && (
          <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" /> Waktu:
            </span>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Pilih Jam"
                value={selectedHours}
                onChange={(e) => setSelectedHours(Number(e.target.value))}
                className="bg-surface-secondary border border-border rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:border-primary"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={`hour-${i}`} value={i}>
                    {String(i).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <span className="text-xs text-text-muted font-bold">:</span>
              <select
                aria-label="Pilih Menit"
                value={selectedMinutes}
                onChange={(e) => setSelectedMinutes(Number(e.target.value))}
                className="bg-surface-secondary border border-border rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:border-primary"
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={`min-${i}`} value={i}>
                    {String(i).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Action Controls for datetime/time */}
        {mode !== "date" && (
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
            <button
              type="button"
              onClick={() => handleClear()}
              className="text-xs font-semibold text-text-muted hover:text-error transition cursor-pointer"
            >
              Hapus
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border text-text-secondary hover:bg-surface-secondary transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDateTime}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white transition cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>
        )}
      </div>,
      document.body
    );
  };

  const sizeClasses = size === "sm" ? "px-2.5 py-1.5 text-xs h-8" : "px-3 py-2 text-xs md:text-sm h-9.5";

  return (
    <div className={`flex flex-col gap-1 text-left ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 bg-surface border rounded-lg text-left transition duration-150 cursor-pointer ${sizeClasses} ${
            error
              ? "border-error focus:ring-error/20"
              : isOpen
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-border-strong focus:border-primary"
          } ${
            value ? "text-text-primary font-medium" : "text-text-muted"
          } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            {mode === "time" ? (
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
            <span className="truncate">{getDisplayValue()}</span>
          </div>

          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === "Enter" && handleClear()}
              aria-label="Hapus tanggal"
              className="p-0.5 rounded hover:bg-surface-secondary text-text-muted hover:text-text-primary transition shrink-0 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </div>

      {error && <span className="text-xs text-error mt-0.5">{error}</span>}

      {renderPopover()}
    </div>
  );
};
