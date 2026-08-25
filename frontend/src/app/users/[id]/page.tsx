"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  useGetUserQuery,
  useUpdateUserStatusMutation,
  useGrantApplicationAccessMutation,
  useChangeApplicationRoleMutation,
  useRevokeApplicationAccessMutation
} from "@/lib/api/usersApi";
import { useLaunchApplicationMutation } from "@/lib/api/applicationsApi";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  User,
  Shield,
  Building,
  Mail,
  Lock,
  Unlock,
  Trash2,
  Play,
  ArrowLeft,
  Plus
} from "lucide-react";
import Link from "next/link";

export default function UserDetailPage() {
  const { id } = useParams() as { id: string };

  const { data: userResponse, isLoading, refetch } = useGetUserQuery(id, {
    refetchOnFocus: true,
  });
  const user = userResponse?.data;

  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateUserStatusMutation();
  const [grantAccess, { isLoading: isGranting }] = useGrantApplicationAccessMutation();
  const [changeRole, { isLoading: isSavingRole }] = useChangeApplicationRoleMutation();
  const [revokeAccess, { isLoading: isRevoking }] = useRevokeApplicationAccessMutation();
  const [launchApp, { isLoading: isLaunching }] = useLaunchApplicationMutation();

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [selectedAppCode, setSelectedAppCode] = useState<"CONCESSION" | "TICKETING">("CONCESSION");
  const [selectedRole, setSelectedRole] = useState("");

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [targetAppCode, setTargetAppCode] = useState("");
  const [targetRole, setTargetRole] = useState("");

  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeAppCode, setRevokeAppCode] = useState("");

  const handleToggleStatus = async () => {
    if (!user) return;
    const targetStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await updateStatus({ id, status: targetStatus }).unwrap();
      setIsStatusModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal mengubah status pengguna";
      alert(errorMsg);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedRole) {
      alert("Silakan pilih role");
      return;
    }
    try {
      await grantAccess({
        userId: id,
        applicationCode: selectedAppCode,
        role: selectedRole,
      }).unwrap();
      setIsGrantModalOpen(false);
      setSelectedRole("");
      refetch();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal memberikan akses aplikasi";
      alert(errorMsg);
    }
  };

  const handleSaveRole = async () => {
    try {
      await changeRole({
        userId: id,
        applicationCode: targetAppCode,
        role: targetRole,
      }).unwrap();
      setIsRoleModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal mengubah role aplikasi";
      alert(errorMsg);
    }
  };

  const handleRevokeAccess = async () => {
    try {
      await revokeAccess({
        userId: id,
        applicationCode: revokeAppCode,
      }).unwrap();
      setIsRevokeModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string } }).data?.message
        : "Gagal mencabut akses aplikasi";
      alert(errorMsg);
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
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`${appUrl}/sso/callback?code=${launchCode}`);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal meluncurkan aplikasi.");
    }
  };

  // Roles mapper dependent on application selection
  const getRolesForApp = (app: string) => {
    if (app === "CONCESSION") {
      return [
        { code: "CONCESSION_ADMINISTRATOR", name: "Concession Administrator" },
        { code: "CONCESSION_CASHIER", name: "Concession Cashier" },
      ];
    }
    return [
      { code: "TICKETING_ADMINISTRATOR", name: "Ticketing Administrator" },
      { code: "TICKETING_CASHIER", name: "Ticketing Cashier" },
    ];
  };

  if (isLoading) {
    return (
      <div className="space-y-6 text-left">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-bold text-text-primary">User Tidak Ditemukan</h3>
        <p className="text-sm text-text-muted mt-2">Detail profil pengguna tidak dapat dimuat.</p>
        <Link href="/users">
          <Button variant="secondary" className="mt-4">
            Kembali ke Daftar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Navigation button */}
      <div>
        <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition font-semibold">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Manajemen Pengguna
        </Link>
      </div>

      {/* User profile details header card */}
      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary-soft/40 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="text-left space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-text-primary">{user.name}</h1>
                  <Badge variant={user.status === "ACTIVE" ? "success" : "destructive"}>
                    {user.status}
                  </Badge>
                </div>
                <p className="text-sm text-text-muted flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </p>
                <p className="text-xs text-text-muted flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Organisasi: {user.organization?.name || "N/A"}
                </p>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-center">
              <Button
                variant={user.status === "ACTIVE" ? "danger" : "primary"}
                onClick={() => setIsStatusModalOpen(true)}
                className="flex items-center gap-1.5 text-xs px-4"
              >
                {user.status === "ACTIVE" ? (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Disable Akun
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" /> Enable Akun
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned applications layout */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Hak Akses Aplikasi Terintegrasi
          </h2>
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedAppCode("CONCESSION");
              setSelectedRole(getRolesForApp("CONCESSION")[0].code);
              setIsGrantModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs py-1 px-3 font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Berikan Akses
          </Button>
        </div>

        {user.applications && user.applications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {user.applications.map((app) => (
              <Card key={app.code} className="flex flex-col justify-between border border-border">
                <CardHeader className="border-b border-border pb-3 bg-surface-secondary/30">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-base tracking-tight">{app.name}</span>
                    <Badge variant={app.code === "CONCESSION" ? "warning" : "success"}>
                      {app.code}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 flex-1 flex flex-col justify-between min-h-[170px]">
                  <div className="space-y-4 py-2">
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">Role Otoritatif</p>
                      <p className="font-bold text-text-primary text-sm mt-0.5">{app.role}</p>
                    </div>

                    <div className="border-t border-border/40 pt-3">
                      <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Aksi & Konfigurasi</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={app.role}
                          onChange={(e) => {
                            setTargetAppCode(app.code);
                            setTargetRole(e.target.value);
                            setIsRoleModalOpen(true);
                          }}
                          className="bg-surface border border-border rounded px-2.5 py-1 text-xs font-semibold text-text-primary focus:outline-none focus:border-primary flex-1"
                        >
                          {getRolesForApp(app.code).map((r) => (
                            <option key={r.code} value={r.code}>{r.name}</option>
                          ))}
                        </select>
                        <Button
                          variant="danger"
                          onClick={() => {
                            setRevokeAppCode(app.code);
                            setIsRevokeModalOpen(true);
                          }}
                          className="p-1 px-2.5 flex items-center justify-center hover:bg-error-soft text-error hover:text-white transition duration-150 border border-error/20"
                          title="Cabut Akses"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/40">
                    <Button
                      onClick={() => handleLaunch(app.code)}
                      disabled={isLaunching || user.status === "DISABLED"}
                      className="w-full flex items-center justify-center gap-2 text-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Luncurkan Aplikasi (SSO)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-12 border border-dashed border-border rounded-xl text-center text-sm text-text-muted">
            Belum ada hak akses aplikasi yang diberikan untuk pengguna ini.
          </div>
        )}
      </div>

      {/* CONFIRMATION: ENABLE/DISABLE USER STATUS */}
      <Dialog
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={user.status === "ACTIVE" ? "Disable User?" : "Enable User?"}
        description="Verifikasi perubahan status akun pengguna secara terpusat."
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            {user.status === "ACTIVE" ? (
              "Akun yang dinonaktifkan akan kehilangan akses ke Platform Cinema dan seluruh sub-aplikasi yang terintegrasi (Ticketing/Concession) secara instan."
            ) : (
              "Mengaktifkan kembali akun pengguna ini akan memulihkan seluruh hak akses aplikasi yang telah dipetakan sebelumnya."
            )}
          </p>
          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant={user.status === "ACTIVE" ? "danger" : "primary"}
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus}
            >
              Ya, Ubah Status
            </Button>
          </div>
        </div>
      </Dialog>

      {/* GRANT APPLICATION ACCESS MODAL */}
      <Dialog
        isOpen={isGrantModalOpen}
        onClose={() => setIsGrantModalOpen(false)}
        title="Berikan Akses Aplikasi"
        description="Mendaftarkan hak akses baru untuk pengguna ke sub-sistem cinema."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Aplikasi</label>
            <select
              value={selectedAppCode}
              onChange={(e) => {
                const app = e.target.value as "CONCESSION" | "TICKETING";
                setSelectedAppCode(app);
                setSelectedRole(getRolesForApp(app)[0].code);
              }}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="CONCESSION">CONCESSION (Makanan & Minuman)</option>
              <option value="TICKETING">TICKETING (Kasir Tiket)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary block mb-1">Role Aplikasi</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="">Pilih Role...</option>
              {getRolesForApp(selectedAppCode).map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsGrantModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleGrantAccess} disabled={isGranting}>
              Berikan Akses
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CONFIRMATION: CHANGE APPLICATION ROLE */}
      <Dialog
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Ubah Role Aplikasi?"
        description="Konfirmasi perubahan hak akses peran pengguna."
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Apakah Anda yakin ingin mengubah tingkat otorisasi peran pengguna pada aplikasi <strong>{targetAppCode}</strong> menjadi <strong>{targetRole}</strong>?
          </p>
          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsRoleModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveRole} disabled={isSavingRole}>
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CONFIRMATION: REVOKE APPLICATION ACCESS */}
      <Dialog
        isOpen={isRevokeModalOpen}
        onClose={() => setIsRevokeModalOpen(false)}
        title="Cabut Akses Aplikasi?"
        description="Penghapusan pemetaan otorisasi pengguna."
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            Pengguna <strong>{user.name}</strong> tidak akan bisa mengakses aplikasi <strong>{revokeAppCode}</strong> lagi. 
            <br />
            <span className="text-xs text-text-muted mt-2 block">
              *Catatan: Seluruh riwayat transaksi kasir, log penjualan, dan data retail yang terkait TIDAK AKAN dihapus.
            </span>
          </p>
          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsRevokeModalOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleRevokeAccess} disabled={isRevoking}>
              Ya, Cabut Akses
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
