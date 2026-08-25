"use client";

import React from "react";
import { useGetDashboardOverviewQuery } from "@/lib/api/dashboardApi";
import { useLaunchApplicationMutation } from "@/lib/api/applicationsApi";
import { useGetMeQuery } from "@/lib/api/authApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import {
  Users,
  Building2,
  Monitor,
  Shield,
  Calendar,
  Activity,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Play
} from "lucide-react";
import Link from "next/link";

export default function UnifiedExecutiveDashboard() {
  const {
    data: dashboardResponse,
    isLoading: isDashboardLoading,
    isFetching: isDashboardFetching,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useGetDashboardOverviewQuery(undefined, {
    refetchOnFocus: true,
  });

  const { data: meResponse } = useGetMeQuery();
  const me = meResponse?.data;

  const [launchApp, { isLoading: isLaunching }] = useLaunchApplicationMutation();

  const metrics = dashboardResponse?.data;

  const handleLaunch = async (code: string) => {
    try {
      const res = await launchApp(code).unwrap();
      const launchCode = res.data.code;

      let appUrl = "";
      if (code === "CONCESSION") {
        appUrl = process.env.NEXT_PUBLIC_CONCESSION_APP_URL || "http://localhost:3050";
      } else if (code === "TICKETING") {
        appUrl = process.env.NEXT_PUBLIC_TICKETING_APP_URL || "http://localhost:3011";
      }

      if (appUrl) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination, react-hooks/immutability
        window.location.href = `${appUrl}/sso/callback?code=${launchCode}`;
      }
    } catch (err) {
      console.error(err);
      alert("Gagal meluncurkan aplikasi. Silakan coba lagi.");
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("GRANT")) {
      return "bg-primary-soft text-primary border-primary/20";
    }
    if (action.includes("DISABLE") || action.includes("REVOKE") || action.includes("DELETE")) {
      return "bg-error-soft text-error border-error/20";
    }
    return "bg-surface-secondary text-text-secondary";
  };

  if (dashboardError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-surface-secondary/40 rounded-xl border border-border">
        <AlertTriangle className="w-12 h-12 text-error mb-4" />
        <h3 className="text-lg font-bold text-text-primary mb-2">Gagal Memuat Data Dashboard</h3>
        <p className="text-sm text-text-muted max-w-sm mb-5">
          Terjadi kesalahan saat berkomunikasi dengan server otentikasi pusat. Silakan periksa koneksi Anda dan coba lagi.
        </p>
        <Button onClick={() => refetchDashboard()} variant="primary" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </Button>
      </div>
    );
  }

  // Determine authorized pages to show in Quick Actions
  const platformAccess = me?.access?.find((a) => a.applicationCode === "PLATFORM");
  const permissions = platformAccess?.permissions || [];
  const hasPermission = (perm: string) => permissions.includes(perm);

  const quickActions = [
    { name: "Manage Users", href: "/users", permission: "platform.users.view" },
    { name: "Applications Setup", href: "/applications", permission: "platform.applications.view" },
    { name: "Organizations", href: "/organizations", permission: "platform.organizations.view" },
    { name: "System Settings", href: "/settings", permission: "platform.settings.view" },
    { name: "Security Audit Logs", href: "/audit-logs", permission: "platform.audit_logs.view" },
  ].filter((act) => !act.permission || hasPermission(act.permission));

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Eksekutif</h1>
          <p className="text-sm text-text-muted">
            Overview status integrasi ekosistem, performa tenant, dan log keamanan terpusat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetchDashboard()}
            variant="secondary"
            disabled={isDashboardLoading || isDashboardFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isDashboardFetching ? "animate-spin" : ""}`} />
            Perbarui Data
          </Button>
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
                <CardDescription className="text-[10px]">Aktif vs Dikunci</CardDescription>
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
                <CardTitle className="text-sm font-semibold">Aplikasi Terintegrasi</CardTitle>
                <CardDescription className="text-[10px]">Sub-Sistem Terkoneksi</CardDescription>
              </div>
              <Monitor className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent className="text-left">
              <p className="text-2xl font-bold">{metrics?.totalApps ?? 0}</p>
              <p className="text-[10px] text-text-muted mt-1">
                Authoritative Control Plane
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="text-left">
                <CardTitle className="text-sm font-semibold">Pemetaan Akses</CardTitle>
                <CardDescription className="text-[10px]">Total Hak Akses Aktif</CardDescription>
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

      {/* Ecosystem Connected Applications Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-left">
          Status & Akses Aplikasi Ekosistem
        </h2>
        {isDashboardLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !metrics?.applications || metrics.applications.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted bg-surface-secondary/30 rounded-lg border border-border border-dashed">
            Tidak ada sub-aplikasi yang terkonfigurasi.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {metrics.applications.map((app) => {
              const hasLaunchAccess = me?.applications?.some((a) => a.code === app.code) || false;
              const isPlatformApp = app.code === "PLATFORM";

              return (
                <Card key={app.code} className="hover:border-primary/30 transition-all duration-200">
                  <CardHeader className="pb-3 text-left">
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="font-mono bg-surface-secondary text-[10px] text-text-secondary">
                        {app.code}
                      </Badge>
                      <Badge variant={app.status === "ACTIVE" ? "success" : "destructive"}>
                        {app.status === "ACTIVE" ? "ONLINE" : "OFFLINE"}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold mt-2">{app.name}</CardTitle>
                    <CardDescription className="text-xs text-text-muted mt-1 min-h-[32px] line-clamp-2">
                      {app.description || "Tidak ada deskripsi terkonfigurasi."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 text-left space-y-4">
                    <div className="flex items-center justify-between text-xs border-t border-b border-border/50 py-2.5">
                      <span className="text-text-secondary">Pengguna Terdaftar:</span>
                      <span className="font-bold text-text-primary">{app.userCount} Pengguna</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {isPlatformApp ? (
                        <div className="text-xs text-text-muted select-none italic">
                          Aplikasi Kontrol Saat Ini
                        </div>
                      ) : hasLaunchAccess ? (
                        <Button
                          onClick={() => handleLaunch(app.code)}
                          disabled={isLaunching || app.status !== "ACTIVE"}
                          className="w-full flex items-center justify-center gap-2"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Launch App
                        </Button>
                      ) : (
                        <div className="text-xs text-error font-medium">
                          Anda Tidak Memiliki Akses
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: Quick Actions & Recent Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions (1/3 width) */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-left">
            Aksi Cepat
          </h2>
          <Card>
            <CardContent className="p-4 flex flex-col gap-2.5">
              {quickActions.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-muted select-none">
                  Tidak ada aksi administratif yang tersedia.
                </div>
              ) : (
                quickActions.map((action) => (
                  <Link
                    key={action.name}
                    href={action.href}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/80 hover:bg-surface-secondary/40 hover:border-primary/20 transition-all group"
                  >
                    <span className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                      {action.name}
                    </span>
                    <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Audits list (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-left flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-primary" />
            Log Aktivitas & Audit Keamanan Terkini
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
                <div className="py-8 text-center text-xs text-text-muted">
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
                            <div className="flex-1 min-w-0 pt-1.5 text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <p className="text-xs text-text-primary font-semibold">
                                  {log.user?.name || "System"}{" "}
                                  <span className="font-normal text-text-muted">melakukan</span>{" "}
                                  <Badge variant="default" className={`text-[9px] py-0 px-1.5 ${getActionBadgeColor(log.action)}`}>
                                    {log.action}
                                  </Badge>
                                </p>
                                <p className="text-[10px] text-text-muted mt-0.5">
                                  Entitas: {log.entity} • ID: {log.entityId}
                                </p>
                              </div>
                              <div className="text-[10px] text-text-muted sm:text-right shrink-0">
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
