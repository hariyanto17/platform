"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useGetApplicationByCodeQuery, useUpdateApplicationStatusMutation } from "@/lib/api/applicationsApi";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Table, Column } from "@/components/ui/Table";
import { Tv2, ShieldAlert, Shield, ArrowLeft, Settings, Eye, Building2, Key } from "lucide-react";
import Link from "next/link";

export default function ApplicationDetailPage() {
  const { code } = useParams() as { code: string };

  const { data: appResponse, isLoading, refetch } = useGetApplicationByCodeQuery(code, {
    refetchOnFocus: true,
  });
  const app = appResponse?.data;

  const [updateAppStatus, { isLoading: isUpdating }] = useUpdateApplicationStatusMutation();

  // Modals state
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<"ACTIVE" | "DISABLED" | "">("");
  const [targetLaunchEnabled, setTargetLaunchEnabled] = useState(true);

  if (isLoading) {
    return <div className="p-12 text-center text-sm font-medium text-text-muted">Memuat rincian aplikasi...</div>;
  }

  if (!app) {
    return <div className="p-12 text-center text-sm font-medium text-text-muted">Aplikasi tidak ditemukan.</div>;
  }

  const handleOpenPolicyModal = () => {
    setTargetStatus(app.status);
    setTargetLaunchEnabled(app.launchEnabled);
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicy = async () => {
    try {
      await updateAppStatus({
        code,
        status: targetStatus || undefined,
        launchEnabled: targetLaunchEnabled,
      }).unwrap();
      setIsPolicyModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal memperbarui kebijakan aplikasi";
      alert(errorMsg);
    }
  };

  const roleColumns: Column<{ id: string; code: string; name: string }>[] = [
    {
      key: "code",
      header: "Kode Peran",
      render: (role) => (
        <span className="font-mono font-bold text-xs bg-surface border border-border px-2 py-1 rounded text-text-primary">
          {role.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Nama Peran",
      render: (role) => <span className="font-semibold text-sm text-text-primary">{role.name}</span>,
    },
    {
      key: "id",
      header: "ID Peran",
      render: (role) => <span className="font-mono text-xs text-text-muted">{role.id}</span>,
    },
  ];

  const orgColumns: Column<{ id: string; name: string; code: string; status: string }>[] = [
    {
      key: "name",
      header: "Nama Organisasi",
      render: (org) => <span className="font-bold text-sm text-text-primary">{org.name}</span>,
    },
    {
      key: "code",
      header: "Kode",
      render: (org) => (
        <span className="font-mono font-semibold text-xs bg-surface border border-border px-2 py-0.5 rounded text-text-secondary">
          {org.code}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status Pemetaan",
      render: (org) => (
        <Badge variant={org.status === "ACTIVE" ? "success" : "destructive"}>
          {org.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (org) => (
        <div className="flex justify-end">
          <Link href={`/organizations/${org.id}`}>
            <Button variant="secondary" className="font-semibold text-xs py-1 px-3 flex items-center gap-1">
              <Eye size={12} /> Kelola Pemetaan
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
        <Link href="/applications">
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
              <Tv2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-xs font-mono font-bold text-text-secondary bg-surface border border-border px-2 py-0.5 rounded">
                {app.code}
              </span>
              <h2 className="text-xl font-bold text-text-primary mt-2">{app.name}</h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1.5">
                <Badge variant={app.status === "ACTIVE" ? "success" : "destructive"}>
                  System: {app.status}
                </Badge>
                <Badge variant={app.launchEnabled ? "primary" : "destructive"}>
                  SSO Launch: {app.launchEnabled ? "ENABLED" : "DISABLED"}
                </Badge>
              </div>
              <Button
                variant="secondary"
                onClick={handleOpenPolicyModal}
                className="font-semibold text-xs py-1 px-3 flex items-center gap-1 mt-1"
              >
                <Settings size={12} /> Ubah Kebijakan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="sm:col-span-2">
              <span className="text-xs font-bold text-text-secondary block font-sans">Deskripsi Integrasi</span>
              <p className="text-sm text-text-primary mt-1 leading-relaxed">
                {app.description || "Tidak ada deskripsi ditambahkan."}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold text-text-secondary block">Didaftarkan Pada</span>
              <span className="text-sm font-semibold text-text-primary mt-1 block">
                {new Date(app.createdAt).toLocaleDateString("id-ID", {
                  dateStyle: "medium",
                })}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-text-secondary block">Pembaruan Terakhir</span>
              <span className="text-sm font-semibold text-text-primary mt-1 block">
                {new Date(app.updatedAt).toLocaleDateString("id-ID", {
                  dateStyle: "medium",
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* STATUS BRIEF */}
        <Card className="bg-surface-card border border-border">
          <CardHeader className="border-b border-border pb-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <ShieldAlert size={16} className="text-primary" /> Status Fail-Closed
            </h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              {app.status === "ACTIVE" && app.launchEnabled ? (
                <Shield className="h-5 w-5 text-emerald-500" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-rose-500" />
              )}
              <div className="text-left">
                <span className="text-xs font-bold text-text-primary block">
                  {app.status === "ACTIVE" && app.launchEnabled ? "Sistem Aktif & Terlindungi" : "Sistem Dinonaktifkan"}
                </span>
                <span className="text-xs text-text-secondary mt-0.5 leading-relaxed block">
                  {app.status === "ACTIVE" && app.launchEnabled
                    ? "Downstream application SSO launches and context sync requests are fully operational."
                    : "SSO launches and credentials updates are strictly forbidden globally."}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SYSTEM ROLES */}
      <Card className="bg-surface-card border border-border">
        <CardHeader className="border-b border-border pb-4 text-left">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Key size={18} className="text-primary" /> Peran Hak Akses (Roles)
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          <Table columns={roleColumns} data={app.roles} />
        </CardContent>
      </Card>

      {/* ORGANIZATIONS MAPPED */}
      <Card className="bg-surface-card border border-border">
        <CardHeader className="border-b border-border pb-4 text-left">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Building2 size={18} className="text-primary" /> Ketersediaan Organisasi (Mapped Entities)
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          {app.organizations.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-text-muted">
              Tidak ada organisasi yang memiliki akses pemetaan ke aplikasi ini.
            </div>
          ) : (
            <Table columns={orgColumns} data={app.organizations} />
          )}
        </CardContent>
      </Card>

      {/* POLICY CONFIGURATION DIALOG */}
      <Dialog
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title={`Ubah Kebijakan Aplikasi: ${app.code}`}
        description="Perbarui status operasional global dan status ketersediaan SSO launch."
      >
        <div className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Status Ketersediaan Operasional</label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as "ACTIVE" | "DISABLED" | "")}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-semibold text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="ACTIVE">ACTIVE (Tersedia penuh)</option>
              <option value="DISABLED">DISABLED (Nonaktifkan dan blokir login downstream)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Izin SSO Quick Launch</label>
            <select
              value={targetLaunchEnabled ? "true" : "false"}
              onChange={(e) => setTargetLaunchEnabled(e.target.value === "true")}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-semibold text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="true">ENABLED (Izinkan peluncuran SSO)</option>
              <option value="false">DISABLED (Nonaktifkan peluncuran SSO)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsPolicyModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSavePolicy} disabled={isUpdating} className="font-semibold">
              Simpan Kebijakan
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
