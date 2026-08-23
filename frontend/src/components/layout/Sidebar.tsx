"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Tv2,
  Settings,
  History,
  ChevronLeft,
  ChevronRight,
  Film
} from "lucide-react";

export interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile
}) => {
  const pathname = usePathname();

  const navigationGroups = [
    {
      label: "Overview",
      items: [
        { name: "Dashboard", href: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
      ],
    },
    {
      label: "Management",
      items: [
        { name: "Users", href: "/users", icon: <Users className="w-5 h-5" /> },
        { name: "Organizations", href: "/organizations", icon: <Building2 className="w-5 h-5" /> },
        { name: "Applications", href: "/applications", icon: <Tv2 className="w-5 h-5" /> },
      ],
    },
    {
      label: "System",
      items: [
        { name: "Settings", href: "/settings", icon: <Settings className="w-5 h-5" /> },
        { name: "Audit Logs", href: "/audit-logs", icon: <History className="w-5 h-5" /> },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar-bg text-text-primary">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-primary text-white select-none">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Film className="w-6 h-6 shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-base tracking-wide whitespace-nowrap">
              Planet Cinema
            </span>
          )}
        </div>
        
        {/* Collapse Button for desktop */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 rounded-md hover:bg-white/10 text-white shrink-0 cursor-pointer"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            {!isCollapsed && (
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-3 select-none text-left">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition duration-150 cursor-pointer ${
                      isActive
                        ? "bg-sidebar-active-bg text-sidebar-active-text"
                        : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                    } ${isCollapsed ? "justify-center" : "text-left"}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block border-r border-border h-screen sticky top-0 z-20 transition-all duration-200 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 bg-black/55 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-350 ease-out bg-sidebar-bg ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
