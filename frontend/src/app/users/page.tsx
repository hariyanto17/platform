"use client";

import React, { useState, useEffect } from "react";
import { useGetUsersQuery, useCreateUserMutation, PaginatedUsersResponse } from "@/lib/api/usersApi";
import { useListOrganizationsQuery } from "@/lib/api/organizationsApi";
import { useListApplicationsQuery } from "@/lib/api/applicationsApi";
import { Table, Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Search,
  Plus,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";
import Link from "next/link";
import { UserContext } from "@/types/auth";

export default function UsersIndexPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [orgId, setOrgId] = useState("");
  const [appCode, setAppCode] = useState("");

  // Create user modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createOrgId, setCreateOrgId] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: usersResponse, isLoading, isFetching, refetch } = useGetUsersQuery({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    status: status || undefined,
    organizationId: orgId || undefined,
    application: appCode || undefined,
  });

  const { data: orgsResponse } = useListOrganizationsQuery();
  const orgsListOptions = Array.isArray(orgsResponse?.data) ? orgsResponse.data : [];
  const { data: appsResponse } = useListApplicationsQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();

  const usersList = usersResponse?.data && "items" in usersResponse.data
    ? (usersResponse.data as unknown as PaginatedUsersResponse).items
    : (Array.isArray(usersResponse?.data) ? usersResponse.data : []);

  const pagination = usersResponse?.data && "pagination" in usersResponse.data
    ? (usersResponse.data as unknown as PaginatedUsersResponse).pagination
    : null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createEmail || !createPassword || !createOrgId) {
      alert("Semua field wajib diisi");
      return;
    }
    try {
      await createUser({
        name: createName,
        email: createEmail,
        password: createPassword,
        organizationId: createOrgId,
        status: "ACTIVE",
      }).unwrap();
      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateOrgId("");
      refetch();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal membuat pengguna";
      alert(errorMsg);
    }
  };

  const getStatusBadge = (statusVal: string) => {
    return (
      <Badge variant={statusVal === "ACTIVE" ? "success" : "destructive"}>
        {statusVal}
      </Badge>
    );
  };

  const getApplicationBadge = (app: string) => {
    switch (app) {
      case "PLATFORM":
        return <Badge key={app} variant="primary" className="mr-1">PLATFORM</Badge>;
      case "TICKETING":
        return <Badge key={app} variant="success" className="mr-1">TICKETING</Badge>;
      case "CONCESSION":
        return <Badge key={app} variant="warning" className="mr-1">CONCESSION</Badge>;
      default:
        return <Badge key={app} variant="default" className="mr-1">{app}</Badge>;
    }
  };

  const columns: Column<UserContext>[] = [
    {
      key: "name",
      header: "Nama Lengkap",
      render: (item) => (
        <div className="text-left">
          <span className="font-semibold block text-text-primary">{item.name}</span>
          <span className="text-xs text-text-muted">{item.email}</span>
        </div>
      ),
    },
    {
      key: "organization",
      header: "Organisasi",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <Building2 className="w-3.5 h-3.5" />
          {item.organization?.name || "N/A"}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: "applications",
      header: "Akses Aplikasi",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.applications && item.applications.length > 0 ? (
            item.applications.map((app) => getApplicationBadge(app.code))
          ) : (
            <span className="text-xs text-text-muted italic">Tidak ada akses</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Tgl Terdaftar",
      render: (item) => (
        <span className="text-xs text-text-muted">
          {new Date(item.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (item) => (
        <Link href={`/users/${item.id}`}>
          <Button variant="ghost" className="p-1 px-3 text-xs flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Detail
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 text-left">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Manajemen Pengguna</h1>
          <p className="text-sm text-text-muted">
            Centrally view users, control application access, change roles, and enable/disable accounts.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
          <Plus className="w-4 h-4" /> Tambah Pengguna
        </Button>
      </div>

      {/* Filter and Search Panel */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-surface-secondary/40 p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded pl-9 pr-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-surface border border-border rounded px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>

          <select
            value={orgId}
            onChange={(e) => { setOrgId(e.target.value); setPage(1); }}
            className="bg-surface border border-border rounded px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-primary max-w-xs"
          >
            <option value="">Semua Organisasi</option>
            {orgsListOptions.map((org: { id: string; name: string }) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>

          <select
            value={appCode}
            onChange={(e) => { setAppCode(e.target.value); setPage(1); }}
            className="bg-surface border border-border rounded px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Semua Aplikasi</option>
            {appsResponse?.data?.map((app) => (
              <option key={app.code} value={app.code}>{app.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <Table
        columns={columns}
        data={usersList}
        isLoading={isLoading}
        emptyMessage="Tidak ada data pengguna terdaftar."
      />

      {/* Pagination controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-text-muted">
            Menampilkan halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} pengguna)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={page === 1 || isFetching}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="p-1 px-3 flex items-center gap-1.5 text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </Button>
            <Button
              variant="secondary"
              disabled={page === pagination.totalPages || isFetching}
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              className="p-1 px-3 flex items-center gap-1.5 text-xs font-semibold"
            >
              Berikutnya <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* CREATE NEW USER MODAL DIALOG */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Tambah Pengguna Baru"
        description="Mendaftarkan akun operator atau administrator baru di database pusat."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Nama Lengkap</label>
            <Input
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Contoh: Hari Yanto"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Alamat Email</label>
            <Input
              type="email"
              required
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="Contoh: hari@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Password</label>
            <Input
              type="password"
              required
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Password minimal 6 karakter"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Organisasi / Cabang</label>
            <select
              required
              value={createOrgId}
              onChange={(e) => setCreateOrgId(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="">Pilih Organisasi...</option>
              {orgsListOptions.map((org: { id: string; name: string }) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" disabled={isCreating}>
              Simpan Pengguna
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
