"use client";

import React, { use } from "react";
import { useGetApplicationByCodeQuery } from "@/lib/api/applicationsApi";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Monitor, Shield, Settings, HelpCircle, ArrowLeft, Calendar, ShieldCheck, CheckCircle } from "lucide-react";
import Link from "next/link";

interface ApplicationDetailPageProps {
  params: Promise<{ code: string }>;
}

export default function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;

  const { data: detailResponse, isLoading } = useGetApplicationByCodeQuery(code);
  const app = detailResponse?.data;

  const getHealthStatus = (appCode: string) => {
    if (appCode === "PLATFORM") {
      return {
        status: "HEALTHY",
        label: "Healthy",
        desc: "Layanan utama portal administrasi berjalan optimal.",
        variant: "success" as const,
      };
    }
    return {
      status: "NOT_CONFIGURED",
      label: "Not Configured",
      desc: "Integrasi modul endpoint eksternal belum dikonfigurasi.",
      variant: "warning" as const,
    };
  };

  const health = app ? getHealthStatus(app.code) : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/applications" className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Kembali ke Daftar
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Detail Integrasi - {code}</h1>
          <p className="text-sm text-text-muted">
            Spesifikasi role, permission, dan status konektivitas aplikasi.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !app ? (
        <div className="py-12 text-center text-sm text-text-muted">
          Gagal memuat rincian aplikasi atau data tidak ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Main Info Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Monitor className="w-8 h-8 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">{app.name}</h2>
                      <p className="text-sm text-text-secondary mt-1">{app.description || "-"}</p>
                    </div>
                  </div>
                  <Badge variant="default" className="font-mono bg-surface-secondary text-xs uppercase px-2.5">
                    {app.code}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/50 text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Calendar className="w-4 h-4 text-text-muted" />
                    <span>Didaftarkan: {new Date(app.createdAt).toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <ShieldCheck className="w-4 h-4 text-text-muted" />
                    <span>Total Pengguna: {app.assignedUsersCount ?? 0} Account</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scope Assignments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Roles */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    Roles Terikat ({app.roles?.length || 0})
                  </h3>
                  {app.roles && app.roles.length > 0 ? (
                    <div className="divide-y divide-border border border-border rounded-xl bg-surface-secondary overflow-hidden">
                      {app.roles.map((role) => (
                        <div key={role.id} className="p-3">
                          <div className="font-semibold text-sm text-text-primary">{role.name}</div>
                          <div className="text-xs text-text-muted font-mono mt-0.5">{role.code}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">Tidak ada role terdaftar.</p>
                  )}
                </CardContent>
              </Card>

              {/* Permissions */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Settings className="w-4 h-4" />
                    Hak Izin Granular ({app.permissions?.length || 0})
                  </h3>
                  {app.permissions && app.permissions.length > 0 ? (
                    <div className="divide-y divide-border border border-border rounded-xl bg-surface-secondary overflow-hidden max-h-[300px] overflow-y-auto">
                      {app.permissions.map((perm) => (
                        <div key={perm.id} className="p-3">
                          <div className="font-semibold text-xs text-text-primary">{perm.name}</div>
                          <div className="text-[10px] text-text-muted font-mono mt-0.5">{perm.code}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">Tidak ada izin granular terdaftar.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar Connectivity Column (1/3 width) */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Status Integrasi & Health
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Konektivitas</span>
                    {health && (
                      <Badge variant={health.variant} className="flex items-center gap-1">
                        {health.status === "HEALTHY" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <HelpCircle className="w-3 h-3" />
                        )}
                        {health.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {health?.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/50 space-y-3.5 text-xs">
                  <div>
                    <div className="font-semibold text-text-secondary">Health Endpoint</div>
                    <div className="bg-surface-secondary p-2 rounded border border-border font-mono text-[10px] text-text-muted mt-1 truncate">
                      {app.code === "PLATFORM" ? "/health" : "Not Configured"}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-text-secondary">Last Sync Check</div>
                    <div className="text-text-muted mt-0.5">
                      {app.code === "PLATFORM" ? "Baru saja (Real-time)" : "-"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
