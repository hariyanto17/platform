"use client";

import React, { useState } from "react";
import { useListApplicationsQuery, useUpdateApplicationStatusMutation, useLaunchApplicationMutation } from "@/lib/api/applicationsApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Tv2, Users, Building2, Play, Eye, Settings } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import Link from "next/link";

export default function ApplicationsCatalogPage() {
  const { toast } = useToast();
  const { data: appsResponse, isLoading, refetch } = useListApplicationsQuery();
  const apps = appsResponse?.data || [];

  const [updateAppStatus, { isLoading: isUpdating }] = useUpdateApplicationStatusMutation();
  const [launchApp, { isLoading: isLaunching }] = useLaunchApplicationMutation();

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetAppCode, setTargetAppCode] = useState("");
  const [targetStatus, setTargetStatus] = useState<"ACTIVE" | "DISABLED">("ACTIVE");
  const [targetLaunchEnabled, setTargetLaunchEnabled] = useState(true);

  const handleToggleStatus = async () => {
    try {
      await updateAppStatus({
        code: targetAppCode,
        status: targetStatus,
        launchEnabled: targetLaunchEnabled,
      }).unwrap();
      setIsStatusModalOpen(false);
      refetch();
      toast.success(`Kebijakan aplikasi ${targetAppCode} berhasil diperbarui.`);
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal memperbarui status aplikasi";
      toast.error(errorMsg || "Gagal memperbarui status aplikasi");
    }
  };

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
        toast.info(`Meluncurkan sesi SSO untuk aplikasi ${code}...`);
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`${appUrl}/sso/callback?code=${launchCode}`);
      } else {
        toast.error(`URL tujuan aplikasi ${code} tidak ditemukan.`);
      }
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal meluncurkan aplikasi. Periksa hak akses dan pemetaan organisasi Anda.";
      toast.error(errorMsg || "Gagal meluncurkan aplikasi.");
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Integrasi & Aplikasi Terdaftar</h1>
        <p className="text-sm text-text-secondary mt-1">
          Monitor and configure registered client applications, global authorization availability, and quick launch profiles.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-sm font-medium text-text-muted">Memuat katalog aplikasi...</div>
      ) : apps.length === 0 ? (
        <div className="p-12 text-center text-sm font-medium text-text-muted">Tidak ada aplikasi dikonfigurasi.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Card key={app.code} className="bg-surface-card border border-border flex flex-col justify-between">
              <div>
                <CardHeader className="flex flex-row items-start gap-4 border-b border-border pb-4">
                  <div className="p-3 rounded-lg bg-surface border border-border">
                    <Tv2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-xs font-mono font-bold text-text-secondary bg-surface border border-border px-2 py-0.5 rounded">
                      {app.code}
                    </span>
                    <h3 className="font-bold text-base text-text-primary mt-2">{app.name}</h3>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 text-left">
                  <p className="text-sm text-text-secondary leading-relaxed min-h-[40px]">
                    {app.description || "Tidak ada deskripsi ditambahkan."}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={app.status === "ACTIVE" ? "success" : "destructive"}>
                      System: {app.status}
                    </Badge>
                    <Badge variant={app.launchEnabled ? "primary" : "destructive"}>
                      Launch: {app.launchEnabled ? "ENABLED" : "DISABLED"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-left">
                    <div>
                      <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                        <Users size={12} /> Anggota
                      </span>
                      <span className="text-sm font-bold text-text-primary mt-1 block">{app.userCount} Orang</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                        <Building2 size={12} /> Organisasi
                      </span>
                      <span className="text-sm font-bold text-text-primary mt-1 block">{app.organizationCount} Mapped</span>
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 border-t border-border bg-surface/50 grid grid-cols-3 gap-2">
                <Link href={`/applications/${app.code}`} className="col-span-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    <Eye className="w-3.5 h-3.5 shrink-0" /> Detail
                  </Button>
                </Link>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setTargetAppCode(app.code);
                    setTargetStatus(app.status);
                    setTargetLaunchEnabled(app.launchEnabled);
                    setIsStatusModalOpen(true);
                  }}
                  className="col-span-1"
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" /> Status
                </Button>

                <Button
                  disabled={app.status !== "ACTIVE" || !app.launchEnabled || isLaunching}
                  onClick={() => handleLaunch(app.code)}
                  size="sm"
                  className="col-span-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" /> Launch
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* STATUS & POLICY CONFIGURATION DIALOG */}
      <Dialog
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`Konfigurasi Kebijakan Aplikasi: ${targetAppCode}`}
        description="Update status ketersediaan sistem dan hak peluncuran cepat (SSO)."
      >
        <div className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Status Sistem Aplikasi</label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as "ACTIVE" | "DISABLED")}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-semibold text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="ACTIVE">ACTIVE (Aplikasi beroperasi penuh)</option>
              <option value="DISABLED">DISABLED (Nonaktifkan dan blokir seluruh akses downstream)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Izin SSO Quick Launch</label>
            <select
              value={targetLaunchEnabled ? "true" : "false"}
              onChange={(e) => setTargetLaunchEnabled(e.target.value === "true")}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-semibold text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="true">ENABLED (Izinkan tombol quick launch)</option>
              <option value="false">DISABLED (Blokir tombol quick launch secara terpusat)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleToggleStatus} disabled={isUpdating} className="font-semibold">
              Simpan Kebijakan
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
