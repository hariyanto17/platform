"use client";

import React from "react";
import { useListRolesQuery } from "@/lib/api/rolesApi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function RolesPage() {
  const { data: rolesResponse, isLoading } = useListRolesQuery();
  const roles = rolesResponse?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Role Registry</h1>
        <p className="text-sm text-text-muted">
          Daftar peran administratif yang terikat pada aplikasi di ekosistem Planet Cinema.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : roles.length === 0 ? (
          <EmptyState
            title="Tidak Ada Role Ditemukan"
            description="Belum ada hak akses peran yang ditambahkan."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border">
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Role</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Kode Peran</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Asosiasi Aplikasi</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Granular Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="px-6 py-4 text-text-primary font-medium">
                      {role.name}
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <Badge variant="default" className="font-mono bg-surface-secondary">
                        {role.code}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <Badge variant="primary">
                        {role.applicationCode}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <div className="flex flex-wrap gap-1 max-w-xl">
                        {role.rolePermissions && role.rolePermissions.length > 0 ? (
                          role.rolePermissions.map((rp, idx) => (
                            <Badge key={idx} variant="default" className="text-[10px] py-0.5 px-2 bg-surface-secondary">
                              {rp.permission.code}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-text-muted italic">Tidak ada izin terikat</span>
                        )}
                      </div>
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
