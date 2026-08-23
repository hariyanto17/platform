"use client";

import React from "react";
import { useListPermissionsQuery } from "@/lib/api/rolesApi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PermissionsPage() {
  const { data: permissionsResponse, isLoading } = useListPermissionsQuery();
  const permissions = permissionsResponse?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daftar Hak Izin (Permissions)</h1>
        <p className="text-sm text-text-muted">
          Peta granularitas hak izin operasi sistem yang tersedia di seluruh platform.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : permissions.length === 0 ? (
          <EmptyState
            title="Tidak Ada Izin Ditemukan"
            description="Belum ada hak izin granular terdaftar."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border">
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Nama Hak Izin</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Kode Izin</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Asosiasi Aplikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="px-6 py-4 text-text-primary font-medium">
                      {perm.name}
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <Badge variant="default" className="font-mono bg-surface-secondary">
                        {perm.code}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <Badge variant="primary">
                        {perm.applicationCode}
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
