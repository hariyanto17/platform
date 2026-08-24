"use client";

import React from "react";
import { useListApplicationsQuery, useLaunchApplicationMutation } from "@/lib/api/applicationsApi";
import { useGetMeQuery } from "@/lib/api/authApi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Monitor, CheckCircle, HelpCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function ApplicationsPage() {
  const { data: appsResponse, isLoading } = useListApplicationsQuery();
  const apps = appsResponse?.data || [];

  const [launchApp, { isLoading: isLaunching }] = useLaunchApplicationMutation();
  const { data: meResponse } = useGetMeQuery();
  const me = meResponse?.data;

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

  const getHealthStatusText = (code: string) => {
    if (code === "PLATFORM") {
      return { label: "Aktif", variant: "success" as const };
    }
    return { label: "Not Configured", variant: "warning" as const };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrasi Aplikasi</h1>
        <p className="text-sm text-text-muted">
          Peta ekosistem sub-aplikasi terintegrasi dan status sinkronisasi operational.
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
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {apps.map((app) => {
                  const health = getHealthStatusText(app.code);
                  const hasLaunchAccess = me?.applications?.some((a) => a.code === app.code) || false;

                  return (
                    <tr key={app.id} className="hover:bg-surface-secondary/40 transition-colors">
                      <td className="px-6 py-4 text-text-primary font-medium">
                        <div className="flex items-center gap-2.5">
                          <Monitor className="w-5 h-5 text-primary" />
                          <span className="font-semibold text-text-primary">{app.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-primary font-medium">
                        <Badge variant="default" className="font-mono bg-surface-secondary text-[10px]">
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
                        <Badge variant={health.variant} className="flex items-center gap-1 w-fit">
                          {health.variant === "success" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <HelpCircle className="w-3 h-3" />
                          )}
                          {health.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-text-primary font-medium text-right">
                        <div className="flex items-center justify-end gap-2">
                          {app.code !== "PLATFORM" && hasLaunchAccess && (
                            <Button
                              variant="primary"
                              onClick={() => handleLaunch(app.code)}
                              disabled={isLaunching}
                              className="flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Buka (SSO)
                            </Button>
                          )}
                          <Link href={`/applications/${app.code}`}>
                            <Button variant="secondary">
                              Detail
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
