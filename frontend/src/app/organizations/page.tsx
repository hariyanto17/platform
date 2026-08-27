"use client";

import React, { useState, useEffect } from "react";
import { useListOrganizationsQuery, useCreateOrganizationMutation, useUpdateOrganizationMutation, OrganizationItem } from "@/lib/api/organizationsApi";
import { Table, Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Search, Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/providers/ToastProvider";

interface PaginatedOrganizations {
  items: OrganizationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function OrganizationsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createStatus, setCreateStatus] = useState<"ACTIVE" | "DISABLED">("ACTIVE");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on search change
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: orgsResponse, isLoading, refetch } = useListOrganizationsQuery(
    {
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: status || undefined,
    },
    { refetchOnFocus: true }
  );

  const [createOrg, { isLoading: isCreating }] = useCreateOrganizationMutation();
  const [updateOrg, { isLoading: isUpdating }] = useUpdateOrganizationMutation();

  const orgsList = (orgsResponse?.data && "items" in orgsResponse.data
    ? (orgsResponse.data as PaginatedOrganizations).items
    : (Array.isArray(orgsResponse?.data) ? orgsResponse.data : [])) as OrganizationItem[];

  const pagination = orgsResponse?.data && "pagination" in orgsResponse.data
    ? (orgsResponse.data as PaginatedOrganizations).pagination
    : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createCode) {
      toast.warning("Nama dan Kode organisasi wajib diisi.");
      return;
    }
    try {
      await createOrg({
        name: createName,
        code: createCode,
        status: createStatus,
      }).unwrap();
      setIsCreateOpen(false);
      setCreateName("");
      setCreateCode("");
      setCreateStatus("ACTIVE");
      refetch();
      toast.success(`Organisasi ${createName} berhasil dibuat.`);
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal membuat organisasi";
      toast.error(errorMsg || "Gagal membuat organisasi");
    }
  };

  const handleToggleStatus = async (orgId: string, currentStatus: string) => {
    const targetStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";

    try {
      await updateOrg({ id: orgId, status: targetStatus }).unwrap();
      refetch();
      toast.success(`Status organisasi berhasil diubah menjadi ${targetStatus}.`);
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal mengubah status organisasi";
      toast.error(errorMsg || "Gagal mengubah status organisasi");
    }
  };

  const columns: Column<OrganizationItem>[] = [
    {
      key: "name",
      header: "Nama Organisasi",
      render: (org) => (
        <div className="flex flex-col text-left">
          <span className="font-bold text-sm text-text-primary">{org.name}</span>
          <span className="text-xs font-semibold text-text-muted mt-0.5">{org.id}</span>
        </div>
      ),
    },
    {
      key: "code",
      header: "Kode",
      render: (org) => (
        <span className="font-mono font-bold text-xs bg-surface border border-border px-2 py-1 rounded text-text-primary">
          {org.code}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (org) => (
        <Badge variant={org.status === "ACTIVE" ? "success" : "destructive"}>
          {org.status}
        </Badge>
      ),
    },
    {
      key: "userCount",
      header: "Pengguna",
      render: (org) => <span className="font-semibold text-sm text-text-primary">{org.userCount}</span>,
    },
    {
      key: "applicationCount",
      header: "Aplikasi Mapped",
      render: (org) => <span className="font-semibold text-sm text-text-primary">{org.applicationCount}</span>,
    },
    {
      key: "actions",
      header: "Aksi",
      render: (org) => (
        <div className="flex items-center gap-2 justify-end">
          <Link href={`/organizations/${org.id}`}>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Eye className="w-3.5 h-3.5 shrink-0" /> Detail
            </Button>
          </Link>
          <Button
            variant={org.status === "ACTIVE" ? "danger" : "primary"}
            size="sm"
            onClick={() => handleToggleStatus(org.id, org.status)}
            disabled={isUpdating}
          >
            {org.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Direktori Organisasi</h1>
          <p className="text-sm text-text-secondary mt-1">
            Centrally manage organizations, registered applications, and corporate visibility policies.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 font-semibold">
          <Plus className="w-4 h-4 shrink-0" /> Tambah Organisasi
        </Button>
      </div>

      {/* FILTERS PANEL */}
      <div className="bg-surface-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Cari nama atau kode organisasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-surface font-medium text-sm text-text-primary focus:border-primary"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm font-semibold text-text-primary focus:outline-none focus:border-primary"
        >
          <option value="">Semua Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DISABLED">DISABLED</option>
        </select>
      </div>

      {/* DIRECTORY TABLE */}
      <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm font-medium text-text-muted">Memuat data organisasi...</div>
        ) : orgsList.length === 0 ? (
          <div className="p-12 text-center text-sm font-medium text-text-muted">Tidak ada organisasi ditemukan.</div>
        ) : (
          <>
            <Table columns={columns} data={orgsList} />

            {/* PAGINATION PANEL */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-text-muted">
                  Menampilkan Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="py-1 px-3 text-xs"
                  >
                    <ChevronLeft size={16} />Prev
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="py-1 px-3 text-xs"
                  >
                    Next<ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CREATE DIALOG */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Tambah Organisasi"
        description="Mendaftarkan entitas bioskop atau unit kerja baru ke kontrol panel secara terpusat."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Nama Organisasi</label>
            <Input
              placeholder="e.g. Planet Cinema Makassar"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="bg-surface text-sm font-semibold text-text-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Kode Organisasi (Unique)</label>
            <Input
              placeholder="e.g. PC-MAKASSAR"
              value={createCode}
              onChange={(e) => setCreateCode(e.target.value)}
              className="bg-surface text-sm font-semibold text-text-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Status Awal</label>
            <select
              value={createStatus}
              onChange={(e) => setCreateStatus(e.target.value as "ACTIVE" | "DISABLED")}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-semibold text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="ACTIVE">ACTIVE (Langsung Aktif)</option>
              <option value="DISABLED">DISABLED (Nonaktif Sementara)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} type="button">
              Batal
            </Button>
            <Button type="submit" disabled={isCreating} className="font-semibold">
              Simpan Organisasi
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
