"use client";

import React, { useState } from "react";
import { useListAuditLogsQuery } from "@/lib/api/auditLogsApi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Calendar } from "lucide-react";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: auditResponse, isLoading, isFetching } = useListAuditLogsQuery({ page, limit });

  const logs = auditResponse?.data || [];
  const meta = auditResponse?.meta;

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("GRANT")) {
      return "bg-primary-soft text-primary border-primary/20";
    }
    if (action.includes("DISABLE") || action.includes("REVOKE") || action.includes("DELETE")) {
      return "bg-error-soft text-error border-error/20";
    }
    return "bg-surface-secondary text-text-secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Audit Logs</h1>
        <p className="text-sm text-text-muted">
          Catatan riwayat perubahan hak akses dan aktivitas administratif sistem secara realtime.
        </p>
      </div>

      <Card>
        {isLoading || isFetching ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="Tidak Ada Catatan Log Aktivitas"
            description="Belum ada aktivitas administratif tercatat saat ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border">
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Waktu</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Aktor (Operator)</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Aktivitas</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Tipe Objek</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">ID Objek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="px-6 py-4 text-text-primary font-medium whitespace-nowrap font-mono text-xs text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-text-muted" />
                        {new Date(log.createdAt).toLocaleString("id-ID", { hour12: false })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <div className="font-semibold text-text-primary">
                        {log.user?.name || "System"}
                      </div>
                      <div className="text-xs text-text-muted">
                        {log.user?.email || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <Badge variant="default" className={`font-mono text-[10px] py-0.5 px-2 ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">{log.entity}</td>
                    <td className="px-6 py-4 text-text-primary font-medium font-mono text-xs text-text-muted truncate max-w-[150px]">
                      {log.entityId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {meta && meta.totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between gap-4">
                <Button
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  Sebelumnya
                </Button>
                <span className="text-sm text-text-muted">
                  Halaman {page} dari {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page === meta.totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, meta.totalPages))}
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
