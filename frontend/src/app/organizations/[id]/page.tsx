"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  useGetOrganizationByIdQuery,
  useUpdateOrganizationMutation,
  useMapApplicationMutation,
  useUnmapApplicationMutation
} from "@/lib/api/organizationsApi";
import { useListApplicationsQuery } from "@/lib/api/applicationsApi";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Table, Column } from "@/components/ui/Table";
import {
  Building2,
  Lock,
  Unlock,
  Tv2,
  Users,
  Settings,
  Link as LinkIcon,
  Unlink,
  ArrowLeft,
  Eye
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/providers/ToastProvider";

export default function OrganizationDetailPage() {
  const { toast } = useToast();
  const { id } = useParams() as { id: string };

  const { data: orgResponse, isLoading, refetch } = useGetOrganizationByIdQuery(id, {
    refetchOnFocus: true,
  });
  const org = orgResponse?.data;

  const { data: appsResponse } = useListApplicationsQuery();
  const allApps = appsResponse?.data || [];

  const [updateOrgStatus, { isLoading: isUpdatingStatus }] = useUpdateOrganizationMutation();
  const [mapApp, { isLoading: isMapping }] = useMapApplicationMutation();
  const [unmapApp, { isLoading: isUnmapping }] = useUnmapApplicationMutation();

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [targetMapAppCode, setTargetMapAppCode] = useState("");
  const [mapAppAction, setMapAppAction] = useState<"MAP" | "UNMAP">("MAP");

  if (isLoading) {
    return <div className="p-12 text-center text-sm font-medium text-text-muted">Memuat rincian organisasi...</div>;
  }

  if (!org) {
    return <div className="p-12 text-center text-sm font-medium text-text-muted">Organisasi tidak ditemukan.</div>;
  }

  const handleToggleOrgStatus = async () => {
    const targetStatus = org.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await updateOrgStatus({ id, status: targetStatus }).unwrap();
      setIsStatusModalOpen(false);
      refetch();
      toast.success(`Status organisasi berhasil diubah menjadi ${targetStatus}.`);
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal mengubah status organisasi";
      toast.error(errorMsg || "Gagal mengubah status organisasi");
    }
  };

  const handleMapAction = async () => {
    try {
      if (mapAppAction === "MAP") {
        await mapApp({ organizationId: id, applicationCode: targetMapAppCode }).unwrap();
        toast.success(`Aplikasi ${targetMapAppCode} berhasil dipetakan ke organisasi.`);
      } else {
        await unmapApp({ organizationId: id, applicationCode: targetMapAppCode }).unwrap();
        toast.success(`Pemetaan aplikasi ${targetMapAppCode} berhasil dicabut.`);
      }
      setIsMapModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal memproses pemetaan aplikasi";
      toast.error(errorMsg || "Gagal memproses pemetaan aplikasi");
    }
  };

  // Check availability mapping
  const isAppMapped = (code: string) => {
    return org.applications.some((app) => app.code === code);
  };

  const columns: Column<{ id: string; name: string; email: string; status: string }>[] = [
    {
      key: "name",
      header: "Nama Pengguna",
      render: (user) => (
        <div className="flex flex-col text-left">
          <span className="font-bold text-sm text-text-primary">{user.name}</span>
          <span className="text-xs font-semibold text-text-muted mt-0.5">{user.id}</span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (user) => <span className="font-semibold text-sm text-text-secondary">{user.email}</span>,
    },
    {
      key: "status",
      header: "Status Akun",
      render: (user) => (
        <Badge variant={user.status === "ACTIVE" ? "success" : "destructive"}>
          {user.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (user) => (
        <div className="flex justify-end">
          <Link href={`/users/${user.id}`}>
            <Button variant="secondary" className="font-semibold text-xs py-1 px-3 flex items-center gap-1">
              <Eye size={12} /> Kelola Akses
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* BACK NAVIGATION */}
      <div className="flex items-center gap-4">
        <Link href="/organizations">
          <Button variant="secondary" className="flex items-center gap-1 font-semibold py-1 px-3 text-xs">
            <ArrowLeft size={16} /> Kembali
          </Button>
        </Link>
      </div>

      {/* OVERVIEW PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-surface-card border border-border">
          <CardHeader className="flex flex-row items-center gap-4 border-b border-border pb-4">
            <div className="p-3 rounded-lg bg-surface border border-border">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-xl font-bold text-text-primary">{org.name}</h2>
              <p className="text-xs font-semibold text-text-muted mt-1">ID Organisasi: {org.id}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={org.status === "ACTIVE" ? "success" : "destructive"}>
                {org.status}
              </Badge>
              <Button
                variant={org.status === "ACTIVE" ? "danger" : "primary"}
                onClick={() => setIsStatusModalOpen(true)}
                className="font-semibold text-xs py-1.5 px-3.5"
              >
                {org.status === "ACTIVE" ? "Disable Org" : "Enable Org"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div>
              <span className="text-xs font-bold text-text-secondary block">Kode Entitas</span>
              <span className="text-sm font-mono font-bold text-text-primary mt-1 block">{org.code}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-text-secondary block">Didaftarkan Pada</span>
              <span className="text-sm font-semibold text-text-primary mt-1 block">
                {new Date(org.createdAt).toLocaleDateString("id-ID", {
                  dateStyle: "medium",
                })}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-text-secondary block">Jumlah Pengguna Terkait</span>
              <span className="text-sm font-bold text-text-primary mt-1 block">{org.userCount} Orang</span>
            </div>
            <div>
              <span className="text-xs font-bold text-text-secondary block">Jumlah Pemetaan Aplikasi</span>
              <span className="text-sm font-bold text-text-primary mt-1 block">{org.applications.length} Aplikasi</span>
            </div>
          </CardContent>
        </Card>

        {/* STATUS BRIEF */}
        <Card className="bg-surface-card border border-border">
          <CardHeader className="border-b border-border pb-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Settings size={16} className="text-primary" /> Status Otorisasi
            </h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              {org.status === "ACTIVE" ? (
                <Unlock className="h-5 w-5 text-emerald-500" />
              ) : (
                <Lock className="h-5 w-5 text-rose-500" />
              )}
              <div className="text-left">
                <span className="text-xs font-bold text-text-primary block">
                  {org.status === "ACTIVE" ? "Login Diizinkan" : "Login Diblokir"}
                </span>
                <span className="text-xs text-text-secondary mt-0.5 leading-relaxed block">
                  {org.status === "ACTIVE"
                    ? "Seluruh anggota dapat melakukan autentikasi ke Platform."
                    : "Seluruh anggota diblokir dari autentikasi / SSO secara terpusat."}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* APPLICATIONS AVAILABILITY MANAGEMENT */}
      <Card className="bg-surface-card border border-border">
        <CardHeader className="border-b border-border pb-4 text-left">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Tv2 size={18} className="text-primary" /> Kebijakan Pemetaan & Ketersediaan Aplikasi
          </h3>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Tentukan ketersediaan aplikasi sub-sistem cinema per organisasi. Nonaktifkan pemetaan aplikasi akan memblokir peluncuran secara instan untuk organisasi ini.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allApps
              .filter((app) => app.code !== "PLATFORM")
              .map((app) => {
                const mapped = isAppMapped(app.code);
                return (
                  <div
                    key={app.code}
                    className="border border-border rounded-xl p-4 bg-surface flex items-center justify-between"
                  >
                    <div className="text-left space-y-1">
                      <span className="font-bold text-sm text-text-primary">{app.name}</span>
                      <span className="text-xs font-semibold font-mono text-text-secondary block">
                        {app.code}
                      </span>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant={mapped ? "success" : "destructive"} className="text-[10px]">
                          {mapped ? "MAPPED / AVAILABLE" : "UNMAPPED / BLOCKED"}
                        </Badge>
                        {app.status === "DISABLED" && (
                          <Badge variant="destructive" className="text-[10px]">
                            GLOBALLY DISABLED
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={mapped ? "danger" : "primary"}
                      size="sm"
                      onClick={() => {
                        setTargetMapAppCode(app.code);
                        setMapAppAction(mapped ? "UNMAP" : "MAP");
                        setIsMapModalOpen(true);
                      }}
                      className="gap-1.5 shrink-0"
                    >
                      {mapped ? (
                        <>
                          <Unlink className="w-3.5 h-3.5 shrink-0" /> Hapus Pemetaan
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-3.5 h-3.5 shrink-0" /> Daftarkan Pemetaan
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* ASSOCIATED USERS */}
      <Card className="bg-surface-card border border-border">
        <CardHeader className="border-b border-border pb-4 text-left">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Users size={18} className="text-primary" /> Anggota / Pengguna Organisasi
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          {org.users.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-text-muted">
              Belum ada pengguna terdaftar pada organisasi ini.
            </div>
          ) : (
            <Table columns={columns} data={org.users} />
          )}
        </CardContent>
      </Card>

      {/* CONFIRMATION: ENABLE/DISABLE ORG STATUS */}
      <Dialog
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={org.status === "ACTIVE" ? "Disable Organization?" : "Enable Organization?"}
        description="Konfirmasi pembaruan kebijakan status organisasi secara terpusat."
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-text-secondary leading-relaxed">
            {org.status === "ACTIVE"
              ? "Menonaktifkan organisasi ini akan menangguhkan seluruh aktivitas login, sesi, dan SSO untuk semua anggota yang bernaung di bawahnya secara langsung."
              : "Mengaktifkan kembali organisasi akan memulihkan status autentikasi/SSO anggotanya."}
          </p>
          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant={org.status === "ACTIVE" ? "danger" : "primary"}
              onClick={handleToggleOrgStatus}
              disabled={isUpdatingStatus}
              className="font-semibold"
            >
              Ya, Ubah Status
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CONFIRMATION: MAP/UNMAP APPLICATION */}
      <Dialog
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title={mapAppAction === "MAP" ? "Map Application availability?" : "Remove Application Mapping?"}
        description="Perubahan pemetaan kebijakan sub-sistem cinema per entitas bisnis."
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-text-secondary leading-relaxed">
            {mapAppAction === "MAP"
              ? `Apakah Anda yakin ingin mendaftarkan pemetaan aplikasi ${targetMapAppCode} untuk organisasi ini? Ini akan mengaktifkan SSO dan akses otorisasi.`
              : `Disabling application ${targetMapAppCode} for the organization will prevent users from launching/accessing it, but will not delete their existing application access assignments.`}
          </p>
          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsMapModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant={mapAppAction === "MAP" ? "primary" : "danger"}
              onClick={handleMapAction}
              disabled={isMapping || isUnmapping}
              className="font-semibold"
            >
              Ya, Simpan Perubahan
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
