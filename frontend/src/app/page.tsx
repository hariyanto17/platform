"use client";

import React, { useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Badge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import { Dialog } from "../components/ui/Dialog";
import { Users, LayoutGrid, MonitorPlay, ShoppingBag } from "lucide-react";

export default function Dashboard() {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [demoInput, setDemoInput] = useState("");
  const [demoInputError, setDemoInputError] = useState("");
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Mock table data
  const mockApplications = [
    {
      id: 1,
      name: "Kasir Ticket (Ticketing)",
      status: "active",
      version: "v2.1.0",
      host: "http://192.168.1.50:3000",
      lastSync: "Baru saja"
    },
    {
      id: 2,
      name: "Concession POS (Consession)",
      status: "active",
      version: "v1.8.5",
      host: "http://192.168.1.62:3000",
      lastSync: "3 menit yang lalu"
    },
    {
      id: 3,
      name: "Self-Service Kiosk",
      status: "warning",
      version: "v1.2.0",
      host: "http://192.168.1.75:3000",
      lastSync: "1 jam yang lalu"
    },
    {
      id: 4,
      name: "Admin Reports Engine",
      status: "destructive",
      version: "v0.9.1",
      host: "http://192.168.1.100:8000",
      lastSync: "24 jam yang lalu"
    }
  ];

  const columns = [
    { key: "name", header: "Nama Aplikasi" },
    {
      key: "status",
      header: "Status",
      render: (item: typeof mockApplications[0]) => {
        const variants: Record<string, "success" | "warning" | "destructive"> = {
          active: "success",
          warning: "warning",
          destructive: "destructive"
        };
        const labels: Record<string, string> = {
          active: "Aktif",
          warning: "Menunggu",
          destructive: "Terputus"
        };
        return <Badge variant={variants[item.status] || "default"}>{labels[item.status] || item.status}</Badge>;
      }
    },
    { key: "version", header: "Versi" },
    { key: "host", header: "IP Host Address" },
    { key: "lastSync", header: "Sinkronisasi Terakhir" }
  ];

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoInput.trim()) {
      setDemoInputError("Input demo wajib diisi!");
    } else {
      setDemoInputError("");
      alert(`Berhasil mengirim: ${demoInput}`);
      setDemoInput("");
    }
  };

  const handleReloadTable = () => {
    setIsTableLoading(true);
    setTimeout(() => {
      setIsTableLoading(false);
    }, 1000);
  };

  return (
    <PageContainer>
      {/* Top Banner header block */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
        <div className="text-left">
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Platform Overview</h2>
          <p className="text-xs text-text-muted">
            Selamat datang di Dashboard Admin Centralized Planet Cinema.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReloadTable}>
            Muat Ulang Status
          </Button>
          <Button variant="primary" onClick={() => setIsTestModalOpen(true)}>
            Hubungkan Aplikasi
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-left">
              <CardTitle className="text-sm font-semibold">Total Pengguna</CardTitle>
              <CardDescription className="text-[10px]">Seluruh platform</CardDescription>
            </div>
            <Users className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent className="text-left">
            <p className="text-2xl font-bold">24</p>
            <p className="text-[10px] text-success mt-1">✓ Semua sesi terverifikasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-left">
              <CardTitle className="text-sm font-semibold">Aplikasi Terkoneksi</CardTitle>
              <CardDescription className="text-[10px]">Modul aktif</CardDescription>
            </div>
            <LayoutGrid className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent className="text-left">
            <p className="text-2xl font-bold">2 / 4</p>
            <p className="text-[10px] text-warning mt-1">⚠ 2 aplikasi membutuhkan atensi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-left">
              <CardTitle className="text-sm font-semibold">Ticketing Status</CardTitle>
              <CardDescription className="text-[10px]">Loket tiket kasir</CardDescription>
            </div>
            <MonitorPlay className="w-5 h-5 text-success" />
          </CardHeader>
          <CardContent className="text-left">
            <p className="text-lg font-bold text-success">ONLINE</p>
            <p className="text-[10px] text-text-muted mt-2">Commit hash: 4adab9f</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="text-left">
              <CardTitle className="text-sm font-semibold">Consession Status</CardTitle>
              <CardDescription className="text-[10px]">F&B retail counter</CardDescription>
            </div>
            <ShoppingBag className="w-5 h-5 text-success" />
          </CardHeader>
          <CardContent className="text-left">
            <p className="text-lg font-bold text-success">ONLINE</p>
            <p className="text-[10px] text-text-muted mt-2">Commit hash: 2917797</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Application List Table & UI Playground Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table layout (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider text-left">
              Daftar Sub-Aplikasi Terdaftar
            </h3>
          </div>
          <Table columns={columns} data={mockApplications} isLoading={isTableLoading} />
        </div>

        {/* UI Component Playground (1/3 width) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider text-left">
            UI Design System Playground
          </h3>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sandbox Pengujian</CardTitle>
              <CardDescription className="text-xs">
                Uji coba visual state, border-radius, focus state, & accessibility dialog.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Badges Test */}
              <div className="flex flex-col gap-1.5 text-left">
                <span className="text-xs font-semibold text-text-secondary select-none">Variasi Badge Status</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="destructive">Danger</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
              </div>

              {/* Form submit demo */}
              <form onSubmit={handleTestSubmit} className="space-y-3.5 pt-2 border-t border-border/50">
                <Input
                  label="Demo Input Teks"
                  required
                  placeholder="Ketik sesuatu di sini..."
                  value={demoInput}
                  onChange={(e) => {
                    setDemoInput(e.target.value);
                    if (e.target.value.trim()) setDemoInputError("");
                  }}
                  error={demoInputError}
                  helperText="Input ini memiliki penanganan error dan visual state ring focus."
                />

                <Select
                  label="Aplikasi Sasaran"
                  placeholder="Pilih aplikasi..."
                  defaultValue="ticketing"
                >
                  <option value="ticketing">Loket Tiket Kasir</option>
                  <option value="consession">Concession POS</option>
                  <option value="kiosk">Self-Service Kiosk</option>
                </Select>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" type="button" onClick={() => setDemoInput("Auto-filled")}>
                    Isi Otomatis
                  </Button>
                  <Button variant="primary" type="submit">
                    Simpan Perubahan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* dialog modal test */}
      <Dialog
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Daftarkan Aplikasi Baru"
        description="Tambahkan parameter integrasi sub-aplikasi baru ke dalam platform central."
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); alert("Aplikasi terdaftar (Mock)."); setIsTestModalOpen(false); }} className="space-y-4">
          <Input label="Nama Aplikasi" required placeholder="Contoh: Customer Facing App" />
          <Input label="IP Host / URL" required placeholder="http://192.168.1.x:3000" />
          <Select label="Tipe Lisensi" defaultValue="corporate">
            <option value="corporate">Corporate Enterprise</option>
            <option value="retail">Single Outlet POS</option>
          </Select>
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
            <Button variant="ghost" type="button" onClick={() => setIsTestModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit">
              Konfirmasi Registrasi
            </Button>
          </div>
        </form>
      </Dialog>
    </PageContainer>
  );
}
