"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Spinner } from "../ui/Spinner";

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If loading session state, display global spinner page
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Spinner className="w-10 h-10 text-primary mb-3" />
        <span className="text-xs font-semibold text-text-secondary animate-pulse uppercase tracking-widest">
          Memulihkan Sesi...
        </span>
      </div>
    );
  }

  // Bypass AppShell layout for login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Safe Guard: If session validation failed, render nothing (AuthProvider handles redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isMobileOpen}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Actions */}
        <Header onMenuClick={() => setIsMobileOpen(!isMobileOpen)} />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-[1720px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
