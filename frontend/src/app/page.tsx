"use client";

import React from "react";
import { useGetDashboardOverviewQuery } from "@/lib/api/dashboardApi";
import { useListApplicationsQuery } from "@/lib/api/applicationsApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Users, Building2, Monitor, Shield, Calendar, Activity } from "lucide-react";

export default function Dashboard() {
  const { data: dashboardResponse, isLoading: isDashboardLoading } = useGetDashboardOverviewQuery();
  const { data: appsResponse, isLoading: isAppsLoading } = useListApplicationsQuery();

  const metrics = dashboardResponse?.data;
  const apps = appsResponse?.data || [];

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
      {/* Top Banner Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight">Planet Cinema Platform</h1>
          <p className="text-sm text-text-muted">
            Pusat Kendali Operasional dan Manajemen Hak Akses Terpusat.
          </p>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      {isDashboardLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="text-left">
                <CardTitle className="text-sm font-semibold">Total Pengguna</CardTitle>
                <CardDescription className="text-[10px]">Aktif vs Kunci</CardDescription>
              </div>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent className="text-left">
              <p className="text-2xl font-bold">{metrics?.totalUsers ?? 0}</p>
              <p className="text-[10px] text-text-muted mt-1">
                <span className="text-success font-semibold">{metrics?.activeUsers ?? 0} Aktif</span> • {metrics?.disabledUsers ?? 0} Dikunci
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="text-left">
                <CardTitle className="text-sm font-semibold">Organisasi / Tenant</CardTitle>
                <CardDescription className="text-[10px]">Bioskop Terdaftar</CardDescription>
              </div>
              <Building2 className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent className="text-left">
              <p className="text-2xl font-bold">{metrics?.totalOrgs ?? 0}</p>
              <p className="text-[10px] text-success mt-1">✓ Konfigurasi tenant aktif</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="text-left">
                <CardTitle className="text-sm font-semibold">Aplikasi Ekosistem</CardTitle>
                <CardDescription className="text-[10px]">Modul Terintegrasi</CardDescription>
              </div>
              <Monitor className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent className="text-left">
              <p className="text-2xl font-bold">{metrics?.totalApps ?? 0}</p>
              <p className="text-[10px] text-text-muted mt-1">
                PLATFORM, TICKETING, CONCESSION
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="text-left">
                <CardTitle className="text-sm font-semibold">Pemetaan Akses</CardTitle>
                <CardDescription className="text-[10px]">Hak Akses Aktif</CardDescription>
              </div>
              <Shield className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent className="text-left">
              <p className="text-2xl font-bold">{metrics?.totalAccesses ?? 0}</p>
              <p className="text-[10px] text-success mt-1">✓ Izin otentikasi dipetakan</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Grid: Registered Applications & Recent Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications list (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-left">
            Status Integrasi Sub-Aplikasi
          </h2>
          <Card>
            {isAppsLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : apps.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-muted">
                Tidak ada data aplikasi terdaftar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-secondary border-b border-border">
                      <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Aplikasi</th>
                      <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Kode</th>
                      <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Assigned Users</th>
                      <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {apps.map((app) => (
                      <tr key={app.id} className="hover:bg-surface-secondary/40 transition-colors">
                        <td className="px-6 py-4 text-text-primary font-medium">
                          <span className="font-semibold text-text-primary">{app.name}</span>
                        </td>
                        <td className="px-6 py-4 text-text-primary font-medium">
                          <Badge variant="default" className="font-mono bg-surface-secondary text-[10px]">
                            {app.code}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-text-primary font-medium pl-6">
                          {app.assignedUsersCount ?? 0}
                        </td>
                        <td className="px-6 py-4 text-text-primary font-medium">
                          <Badge variant="success">ONLINE</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Audits list (1/3 width) */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-left flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-primary" />
            Aktivitas Keamanan Terbaru
          </h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              {isDashboardLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !metrics?.recentLogs || metrics.recentLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-muted">
                  Belum ada aktivitas administratif tercatat.
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {metrics.recentLogs.map((log, logIdx) => (
                      <li key={log.id}>
                        <div className="relative pb-8">
                          {logIdx !== metrics.recentLogs.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center ring-8 ring-surface">
                                <Calendar className="h-4 w-4 text-text-secondary" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1.5 text-left">
                              <p className="text-xs text-text-primary font-semibold">
                                {log.user?.name || "System"}{" "}
                                <span className="font-normal text-text-muted">melakukan</span>{" "}
                                <Badge variant="default" className={`text-[9px] py-0 px-1.5 ${getActionBadgeColor(log.action)}`}>
                                  {log.action}
                                </Badge>
                              </p>
                              <div className="text-[10px] text-text-muted mt-0.5">
                                {new Date(log.createdAt).toLocaleString("id-ID")}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
