"use client";

import React, { useState } from "react";
import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
} from "@/lib/api/usersApi";
import { useListOrganizationsQuery } from "@/lib/api/organizationsApi";
import { useListApplicationsQuery } from "@/lib/api/applicationsApi";
import { useListRolesQuery } from "@/lib/api/rolesApi";
import { useGrantAccessMutation, useRevokeAccessMutation } from "@/lib/api/accessApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, UserPlus, Key, Shield, Ban, CheckCircle } from "lucide-react";
import { UserContext } from "@/types/auth";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  // API Queries
  const { data: usersResponse, isLoading, isFetching } = useListUsersQuery({ page, limit, search });
  const { data: orgsResponse } = useListOrganizationsQuery();
  const { data: appsResponse } = useListApplicationsQuery();
  const { data: rolesResponse } = useListRolesQuery();

  // Mutations
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [grantAccess] = useGrantAccessMutation();
  const [revokeAccess] = useRevokeAccessMutation();

  // Modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<UserContext | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formOrgId, setFormOrgId] = useState("");
  const [formError, setFormError] = useState("");
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Access control modal states
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessAppCode, setAccessAppCode] = useState("");
  const [accessRoleId, setAccessRoleId] = useState("");
  const [accessError, setAccessError] = useState("");

  const handleOpenCreateModal = () => {
    setUserModalMode("create");
    setSelectedUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormOrgId(orgsResponse?.data?.[0]?.id || "");
    setFormError("");
    setIsUserModalOpen(true);
  };

  const handleOpenEditModal = (user: UserContext) => {
    setUserModalMode("edit");
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setFormOrgId(user.organizationId);
    setFormError("");
    setIsUserModalOpen(true);
  };

  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsFormSubmitting(true);

    try {
      if (userModalMode === "create") {
        await createUser({
          name: formName,
          email: formEmail,
          password: formPassword,
          organizationId: formOrgId,
        }).unwrap();
      } else if (selectedUser) {
        await updateUser({
          id: selectedUser.id,
          name: formName,
          email: formEmail,
        }).unwrap();
      }
      setIsUserModalOpen(false);
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string } };
      setFormError(errObj.data?.message || "Gagal menyimpan data user.");
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserContext) => {
    const targetStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await updateUserStatus({ id: user.id, status: targetStatus }).unwrap();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string } };
      alert(errObj.data?.message || "Gagal memperbarui status user.");
    }
  };

  const handleOpenAccessModal = (user: UserContext) => {
    setSelectedUser(user);
    setAccessAppCode(appsResponse?.data?.[0]?.code || "");
    setAccessRoleId("");
    setAccessError("");
    setIsAccessModalOpen(true);
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessError("");
    if (!selectedUser || !accessAppCode || !accessRoleId) return;

    try {
      await grantAccess({
        userId: selectedUser.id,
        applicationCode: accessAppCode,
        roleId: accessRoleId,
      }).unwrap();
      setAccessRoleId("");
      // Refresh selectedUser local reference to reflect in UI modal
      const updatedUserAccesses = [...(selectedUser.access || [])];
      setSelectedUser({
        ...selectedUser,
        access: updatedUserAccesses,
      });
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string } };
      setAccessError(errObj.data?.message || "Gagal menambahkan akses aplikasi.");
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    if (!confirm("Apakah Anda yakin ingin mencabut akses ini?")) return;
    try {
      await revokeAccess(accessId).unwrap();
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string } };
      alert(errObj.data?.message || "Gagal mencabut akses.");
    }
  };

  const users = usersResponse?.data || [];
  const meta = usersResponse?.meta;

  const filteredRoles = rolesResponse?.data?.filter(
    (r) => r.applicationCode === accessAppCode
  ) || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen User</h1>
          <p className="text-sm text-text-muted">
            Kelola data akun administrator, kasir, dan konfigurasi hak akses aplikasi.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} variant="primary" className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Tambah User
        </Button>
      </div>

      {/* Filter and Search */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-text-muted" />
            <Input
              placeholder="Cari user berdasarkan nama atau email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="text-xs text-text-muted">
            Total Data: {meta?.total || 0}
          </div>
        </CardContent>
      </Card>

      {/* Main Table Content */}
      <Card>
        {isLoading || isFetching ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="Tidak Ada User Ditemukan"
            description="Silakan periksa kata kunci pencarian Anda atau tambahkan user baru."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-secondary border-b border-border">
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">User</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Organisasi</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Akses Aplikasi</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase">Status</th>
                  <th className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <div className="font-semibold text-text-primary">{user.name}</div>
                      <div className="text-xs text-text-muted">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">{user.organization?.name || "-"}</td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      <div className="flex flex-wrap gap-1.5">
                        {user.access && user.access.length > 0 ? (
                          user.access.map((acc, idx) => (
                            <Badge key={idx} variant="default" className="text-[10px] py-0.5 px-2 bg-surface-secondary">
                              {acc.applicationCode}: {acc.role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-text-muted italic">Tidak ada akses</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      {user.status === "ACTIVE" ? (
                        <Badge variant="success" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" />
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <Ban className="w-3 h-3" />
                          Kunci
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleOpenEditModal(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          className="flex items-center gap-1"
                          onClick={() => handleOpenAccessModal(user)}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Akses
                        </Button>
                        <Button
                          variant={user.status === "ACTIVE" ? "danger" : "primary"}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === "ACTIVE" ? "Kunci" : "Aktifkan"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {meta && meta.totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between gap-4">
                <Button
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  Sebelumnya
                </Button>
                <span className="text-sm text-text-muted">
                  Halaman {page} dari {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page === meta.totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, meta.totalPages))}
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* User Create/Edit Dialog Modal */}
      <Dialog
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={userModalMode === "create" ? "Tambah Akun User Baru" : "Edit Profil User"}
      >
        <form onSubmit={handleUserFormSubmit} className="space-y-4 my-2">
          {formError && (
            <div className="p-3 bg-error-soft text-error text-xs font-semibold rounded-lg border border-error/20">
              {formError}
            </div>
          )}

          <Input
            label="Nama Lengkap"
            required
            placeholder="Masukkan nama lengkap"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <Input
            label="Alamat Email"
            type="email"
            required
            placeholder="nama@planetcinema.co.id"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />

          {userModalMode === "create" && (
            <Input
              label="Password"
              type="password"
              required
              placeholder="Buat password login"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
            />
          )}

          {userModalMode === "create" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Organisasi</label>
              <Select
                value={formOrgId}
                onChange={(e) => setFormOrgId(e.target.value)}
              >
                {orgsResponse?.data?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2 border-t border-border/50">
            <Button type="button" variant="ghost" onClick={() => setIsUserModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isFormSubmitting}>
              Simpan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Access Control Manager Modal */}
      <Dialog
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        title={`Kelola Akses Aplikasi - ${selectedUser?.name}`}
      >
        <div className="space-y-6 my-2">
          {/* List Active Accesses */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
              Akses Aktif Saat Ini
            </h3>
            {selectedUser?.access && selectedUser.access.length > 0 ? (
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-surface-secondary">
                {selectedUser.access.map((acc) => (
                  <div key={acc.id || acc.applicationCode} className="flex items-center justify-between p-3">
                    <div>
                      <span className="font-semibold text-sm text-text-primary mr-2">
                        {acc.applicationCode}
                      </span>
                      <Badge variant="default" className="text-[10px]">
                        {acc.role?.name || "No Role"}
                      </Badge>
                    </div>
                    <Button
                      variant="danger"
                      onClick={() => handleRevokeAccess(acc.id)}
                    >
                      Cabut Akses
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-text-muted border border-dashed border-border rounded-lg">
                User ini belum memiliki hak akses aplikasi apapun.
              </div>
            )}
          </div>

          {/* Grant New Access Form */}
          <form onSubmit={handleGrantAccess} className="space-y-4 border-t border-border pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              Tambah Akses Aplikasi Baru
            </h3>

            {accessError && (
              <div className="p-3 bg-error-soft text-error text-xs font-semibold rounded-lg border border-error/20">
                {accessError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Pilih Aplikasi</label>
                <Select
                  value={accessAppCode}
                  onChange={(e) => {
                    setAccessAppCode(e.target.value);
                    setAccessRoleId("");
                  }}
                >
                  {appsResponse?.data?.map((app) => (
                    <option key={app.id} value={app.code}>
                      {app.name} ({app.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Pilih Role</label>
                <Select
                  value={accessRoleId}
                  onChange={(e) => setAccessRoleId(e.target.value)}
                >
                  <option value="">-- Pilih Hak Akses --</option>
                  {filteredRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" disabled={!accessRoleId}>
                Berikan Akses
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
