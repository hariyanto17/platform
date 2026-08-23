"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Sun, Moon, Monitor, User, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";

export interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const themeRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Simple Breadcrumbs Builder
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    if (paths.length === 0) return [{ name: "Dashboard", href: "/", isLast: true }];

    return paths.map((path, idx) => {
      const href = `/${paths.slice(0, idx + 1).join("/")}`;
      const name = path.charAt(0).toUpperCase() + path.slice(1);
      return { name, href, isLast: idx === paths.length - 1 };
    });
  };

  const breadcrumbs = getBreadcrumbs();
  const activeTitle = breadcrumbs[breadcrumbs.length - 1]?.name || "Dashboard";

  const getThemeIcon = (t: typeof theme) => {
    switch (t) {
      case "light":
        return <Sun className="w-4 h-4 text-amber-500" />;
      case "dark":
        return <Moon className="w-4 h-4 text-indigo-400" />;
      default:
        return <Monitor className="w-4 h-4 text-text-secondary" />;
    }
  };

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* Left side: title / breadcrumbs & mobile toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          aria-label="Buka menu navigasi"
          className="md:hidden p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col text-left">
          {/* Breadcrumb pathing */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted mb-0.5 select-none">
            <span>Planet Cinema</span>
            {breadcrumbs.map((bc) => (
              <React.Fragment key={bc.href}>
                <span>/</span>
                <span className={bc.isLast ? "text-text-secondary font-medium" : ""}>
                  {bc.name}
                </span>
              </React.Fragment>
            ))}
          </nav>
          <h1 className="text-sm font-bold text-text-primary md:text-base leading-none">
            {activeTitle}
          </h1>
        </div>
      </div>

      {/* Right side: theme toggle & profile info */}
      <div className="flex items-center gap-3">
        {/* Theme Dropdown */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            aria-label="Ubah tema"
            className="flex items-center justify-center p-2 rounded-lg bg-surface-secondary hover:bg-surface border border-border text-text-primary transition cursor-pointer"
          >
            {resolvedTheme === "dark" ? (
              <Moon className="w-4.5 h-4.5 text-primary" />
            ) : (
              <Sun className="w-4.5 h-4.5 text-primary" />
            )}
          </button>

          {isThemeOpen && (
            <div className="absolute right-0 mt-2 w-32 rounded-lg bg-surface border border-border shadow-xl z-50 p-1 flex flex-col gap-0.5">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t);
                    setIsThemeOpen(false);
                  }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-semibold rounded-md transition capitalize cursor-pointer ${
                    theme === t
                      ? "bg-primary-soft text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
                  }`}
                >
                  {getThemeIcon(t)}
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface-secondary hover:bg-surface transition text-left cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-primary/20">
              A
            </div>
            <div className="hidden sm:block text-xs">
              <p className="font-semibold text-text-primary leading-none mb-0.5">Admin</p>
              <p className="text-[10px] text-text-muted leading-none">Super Administrator</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg bg-surface border border-border shadow-xl z-50 p-1.5 flex flex-col gap-1">
              <div className="px-2.5 py-2 border-b border-border/50 text-left">
                <p className="text-xs font-bold text-text-primary">Administrator</p>
                <p className="text-[10px] text-text-muted truncate">admin@planetcinema.co.id</p>
              </div>
              <button
                disabled
                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-secondary rounded-md transition opacity-60 cursor-not-allowed text-left"
              >
                <User className="w-4 h-4" />
                Profil Saya
              </button>
              <button
                onClick={() => {
                  alert("[Mock Action] Logout triggers API clearing. (Phase 1 Mock UI)");
                  setIsProfileOpen(false);
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs text-error hover:bg-error-soft/60 rounded-md transition text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Keluar Sesi
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
