"use client";

import React from "react";
import { useListApplicationsQuery } from "@/lib/api/applicationsApi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Monitor, CheckCircle } from "lucide-react";

export default function ApplicationsPage() {
  const { data: appsResponse, isLoading } = useListApplicationsQuery();
  const apps = appsResponse?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daftar Aplikasi</h1>
        <p className="text-sm text-text-muted">
          Integrasi dan status sistem di dalam ekosistem Planet Cinema.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : apps.length === 0 ? (
          <EmptyState
            title="Tidak Ada Aplikasi Terdaftar"
            description="Tidak ada sistem integrasi yang dikonfigurasi saat ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border">
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Aplikasi</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Kode</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Deskripsi</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Assigned Users</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <div className="flex items-center gap-2.5">
                        <Monitor className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-text-primary">{app.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <Badge variant="default" className="font-mono bg-surface-secondary">
                        {app.code}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium max-w-md text-text-secondary truncate">
                      {app.description || "-"}
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium pl-6">
                      {app.assignedUsersCount ?? 0}
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <Badge variant="success" className="flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" />
                        Aktif
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
