"use client";

import React, { useState } from "react";
import { useListOrganizationsQuery, useGetOrganizationByIdQuery } from "@/lib/api/organizationsApi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Building2, Users, Monitor, CheckCircle } from "lucide-react";

export default function OrganizationsPage() {
  const { data: orgsResponse, isLoading } = useListOrganizationsQuery();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const orgs = orgsResponse?.data || [];

  const handleOpenDetail = (id: string) => {
    setSelectedOrgId(id);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Organisasi</h1>
        <p className="text-sm text-text-muted">
          Peta struktur tenant dan outlet bioskop terintegrasi.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : orgs.length === 0 ? (
          <EmptyState
            title="Tidak Ada Organisasi Terdaftar"
            description="Belum ada organisasi atau outlet yang dikonfigurasi saat ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border">
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Nama Outlet / Tenant</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">ID Unik</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-text-primary">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium font-mono text-xs text-text-muted">
                      {org.id}
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium text-right">
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenDetail(org.id)}
                      >
                        Lihat Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Organization Detail Modal */}
      {selectedOrgId && (
        <OrgDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          id={selectedOrgId}
        />
      )}
    </div>
  );
}

interface OrgDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: string;
}

function OrgDetailModal({ isOpen, onClose, id }: OrgDetailModalProps) {
  const { data: detailResponse, isLoading } = useGetOrganizationByIdQuery(id);
  const org = detailResponse?.data;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={org ? `Detail Organisasi - ${org.name}` : "Memuat..."}>
      {isLoading ? (
        <div className="space-y-4 py-2">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !org ? (
        <div className="py-8 text-center text-sm text-text-muted">
          Gagal memuat detail organisasi.
        </div>
      ) : (
        <div className="space-y-6 py-2">
          {/* Tenant Info */}
          <div className="bg-surface-secondary p-4 rounded-xl border border-border flex items-start gap-3">
            <Building2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-text-primary">{org.name}</div>
              <div className="text-xs text-text-muted font-mono mt-1">Tenant ID: {org.id}</div>
            </div>
          </div>

          {/* Enabled Applications */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-text-muted" />
              Aplikasi Aktif
            </h3>
            {org.enabledApplications && org.enabledApplications.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {org.enabledApplications.map((app) => (
                  <Badge key={app.id} variant="primary" className="py-1 px-2.5">
                    {app.name} ({app.code})
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted italic bg-surface-secondary p-3 rounded-lg border border-border">
                Belum ada aplikasi yang terikat pada user organisasi ini.
              </div>
            )}
          </div>

          {/* Associated Users */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-text-muted" />
              Daftar Anggota User ({org.users?.length || 0})
            </h3>
            {org.users && org.users.length > 0 ? (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface-secondary">
                {org.users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-semibold text-sm text-text-primary">{u.name}</div>
                      <div className="text-xs text-text-muted">{u.email}</div>
                    </div>
                    {u.status === "ACTIVE" ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        Kunci
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted italic bg-surface-secondary p-3 rounded-lg border border-border">
                Belum ada user yang terdaftar dalam organisasi ini.
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
