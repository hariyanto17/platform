"use client";

import React, { useState } from "react";
import { useListAuditLogsQuery } from "@/lib/api/auditLogsApi";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import {
  Calendar,
  Shield,
  Ticket,
  Layers,
  Search,
  RefreshCw,
  User as UserIcon,
  Activity,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [source, setSource] = useState<string>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const limit = 20;

  const {
    data: auditResponse,
    isLoading,
    isFetching,
    refetch,
  } = useListAuditLogsQuery({
    page,
    limit,
    source,
    search: activeSearch || undefined,
  });

  const logs = auditResponse?.data || [];
  const meta = auditResponse?.meta;

  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CHECKOUT") || act.includes("PAID") || act.includes("SUCCESS")) {
      return { variant: "success" as const, color: "bg-success-soft text-success border-success/30" };
    }
    if (act.includes("CREATE") || act.includes("GRANT") || act.includes("CONFIRM")) {
      return { variant: "primary" as const, color: "bg-primary-soft text-primary border-primary/30" };
    }
    if (act.includes("CANCEL") || act.includes("DISABLE") || act.includes("REVOKE") || act.includes("DELETE") || act.includes("FAIL")) {
      return { variant: "destructive" as const, color: "bg-error-soft text-error border-error/30" };
    }
    if (act.includes("LOGIN") || act.includes("VIEW") || act.includes("REPORT")) {
      return { variant: "info" as const, color: "bg-info-soft text-info border-info/30" };
    }
    return { variant: "default" as const, color: "bg-surface-secondary text-text-secondary border-border" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Audit Logs & Riwayat Aktivitas
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Pusat monitoring riwayat aktivitas administratif dan operasional terintegrasi dari Platform dan Kasir Tiket.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted">Total Seluruh Log</p>
              <p className="text-xl font-bold text-text-primary">
                {meta?.counts ? (meta.counts.platform + meta.counts.ticketing).toLocaleString() : (meta?.total || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted">Log Kasir Tiket</p>
              <p className="text-xl font-bold text-text-primary">
                {meta?.counts ? meta.counts.ticketing.toLocaleString() : (source === "TICKETING" ? meta?.total?.toLocaleString() : "-")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted">Log Platform Portal</p>
              <p className="text-xl font-bold text-text-primary">
                {meta?.counts ? meta.counts.platform.toLocaleString() : (source === "PLATFORM" ? meta?.total?.toLocaleString() : "-")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-3 rounded-xl border border-border">
        {/* Source Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleSourceChange("ALL")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              source === "ALL"
                ? "bg-primary text-white shadow-sm"
                : "bg-surface-secondary text-text-secondary hover:bg-surface border border-border"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Semua Aplikasi
          </button>

          <button
            onClick={() => handleSourceChange("TICKETING")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              source === "TICKETING"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-surface-secondary text-text-secondary hover:bg-surface border border-border"
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-amber-500" />
            Kasir Tiket (Ticketing)
            {meta?.counts && <span className="ml-1 opacity-80 text-[10px] font-mono">({meta.counts.ticketing})</span>}
          </button>

          <button
            onClick={() => handleSourceChange("PLATFORM")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              source === "PLATFORM"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface-secondary text-text-secondary hover:bg-surface border border-border"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            Platform
            {meta?.counts && <span className="ml-1 opacity-80 text-[10px] font-mono">({meta.counts.platform})</span>}
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari aktor, aksi, modul..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-surface-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            )}
          </div>
          <Button type="submit" size="sm" variant="secondary" className="text-xs px-3 py-1.5 cursor-pointer">
            Cari
          </Button>
        </form>
      </div>

      {/* Main Table Card */}
      <Card>
        {isLoading || isFetching ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="Tidak Ada Catatan Log Aktivitas"
            description={
              activeSearch
                ? `Tidak ditemukan log yang sesuai dengan kata kunci "${activeSearch}".`
                : "Belum ada aktivitas tercatat untuk filter aplikasi ini."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border">
                  <th className="px-5 py-3 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">
                    Waktu
                  </th>
                  <th className="px-5 py-3 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">
                    Aplikasi
                  </th>
                  <th className="px-5 py-3 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">
                    Aktor (Operator)
                  </th>
                  <th className="px-5 py-3 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">
                    Aktivitas
                  </th>
                  <th className="px-5 py-3 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">
                    Modul / Objek
                  </th>
                  <th className="px-5 py-3 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">
                    Detail / Objek ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const isTicketing = log.source === "TICKETING";

                  return (
                    <tr key={log.id} className="hover:bg-surface-secondary/40 transition-colors">
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 text-text-primary whitespace-nowrap font-mono text-xs text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span>
                            {new Date(log.createdAt).toLocaleString("id-ID", {
                              hour12: false,
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Application Source */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isTicketing ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Ticket className="w-3 h-3" />
                            KASIR TIKET
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Shield className="w-3 h-3" />
                            PLATFORM
                          </span>
                        )}
                      </td>

                      {/* Actor */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-surface-secondary border border-border flex items-center justify-center shrink-0">
                            <UserIcon className="w-3.5 h-3.5 text-text-muted" />
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary text-xs">
                              {log.user?.name || "System"}
                            </div>
                            <div className="text-[11px] text-text-muted truncate max-w-[170px]">
                              {log.user?.email || "-"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge
                          variant="default"
                          className={`font-mono text-[11px] py-0.5 px-2.5 ${badge.color}`}
                        >
                          {log.action}
                        </Badge>
                      </td>

                      {/* Module / Entity */}
                      <td className="px-5 py-3.5 text-xs text-text-primary font-medium whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-surface-secondary border border-border font-mono text-[11px]">
                          {log.module || log.entity}
                        </span>
                      </td>

                      {/* Description / EntityId */}
                      <td className="px-5 py-3.5 text-xs text-text-muted max-w-[240px]">
                        {log.description ? (
                          <div className="truncate text-text-secondary" title={log.description}>
                            {log.description}
                          </div>
                        ) : (
                          <div className="font-mono text-[11px] truncate text-text-muted" title={log.entityId}>
                            {log.entityId || "-"}
                          </div>
                        )}
                        {log.ipAddress && (
                          <div className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                            <Globe className="w-2.5 h-2.5" /> {log.ipAddress}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {meta && meta.totalPages > 1 && (
              <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-text-muted">
                  Menampilkan halaman <span className="font-bold text-text-primary">{page}</span> dari{" "}
                  <span className="font-bold text-text-primary">{meta.totalPages}</span> ({meta.total.toLocaleString()} total data)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1 || isFetching}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    className="flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Sebelumnya
                  </Button>

                  <div className="px-2 text-xs font-mono font-bold text-text-primary">
                    {page} / {meta.totalPages}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === meta.totalPages || isFetching}
                    onClick={() => setPage((prev) => Math.min(prev + 1, meta.totalPages))}
                    className="flex items-center gap-1 text-xs cursor-pointer"
                  >
                    Selanjutnya
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

