"use client";

import React, { useState, useEffect } from "react";
import {
  useGetDashboardOverviewQuery,
  useGetDashboardOperationsQuery,
  useGetDashboardActivityQuery,
  useGetDashboardTransactionsQuery,
  DashboardTransaction
} from "@/lib/api/dashboardApi";
import { useLaunchApplicationMutation } from "@/lib/api/applicationsApi";
import { useGetMeQuery } from "@/lib/api/authApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Table, Column } from "@/components/ui/Table";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/providers/ToastProvider";
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
  Play,
  TrendingUp,
  Ticket,
  UtensilsCrossed,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import Link from "next/link";

export default function UnifiedExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "transactions">("overview");

  // Date selection for operations
  const [selectedDate, setSelectedDate] = useState(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const localDate = new Date(local.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  });

  // Transactions filters
  const [txPage, setTxPage] = useState(1);
  const [txStatus, setTxStatus] = useState<string>("");
  const [txApp, setTxApp] = useState<string>("");
  const [txSearch, setTxSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Transaction detail modal
  const [selectedTx, setSelectedTx] = useState<DashboardTransaction | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(txSearch);
      setTxPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [txSearch]);

  const {
    data: dashboardResponse,
    isLoading: isDashboardLoading,
    isFetching: isDashboardFetching,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useGetDashboardOverviewQuery(undefined, {
    refetchOnFocus: true,
  });

  const {
    data: opsResponse,
    isLoading: isOpsLoading,
    isFetching: isOpsFetching,
    refetch: refetchOps,
  } = useGetDashboardOperationsQuery(selectedDate, {
    refetchOnFocus: true,
  });

  const {
    data: activityResponse,
    isLoading: isActivityLoading,
    isFetching: isActivityFetching,
    refetch: refetchActivity,
  } = useGetDashboardActivityQuery(undefined, {
    refetchOnFocus: true,
    skip: activeTab !== "activity",
  });

  const {
    data: txResponse,
    isLoading: isTxLoading,
    isFetching: isTxFetching,
    refetch: refetchTx,
  } = useGetDashboardTransactionsQuery(
    {
      page: txPage,
      limit: 10,
      date: selectedDate,
      status: txStatus || undefined,
      application: txApp || undefined,
      search: debouncedSearch || undefined,
    },
    {
      refetchOnFocus: true,
      skip: activeTab !== "transactions",
    }
  );

  const { toast } = useToast();
  const { data: meResponse } = useGetMeQuery();
  const me = meResponse?.data;

  const [launchApp, { isLoading: isLaunching }] = useLaunchApplicationMutation();

  const metrics = dashboardResponse?.data;
  const ops = opsResponse?.data;
  const activityData = activityResponse?.data;
  const txData = txResponse?.data;

  const handleLaunch = async (code: string) => {
    // Check if user has explicit access in me context
    const hasAccess = Boolean(
      me?.applications?.some((app) => app.code === code) ||
      me?.access?.some((acc) => acc.applicationCode === code)
    );

    if (!hasAccess) {
      toast.warning(
        `Akun Anda (${me?.email || "User"}) belum memiliki izin akses ke aplikasi ${code}. Silakan berikan izin di menu Pengguna / Izin Akses atau gunakan akun dengan role ${code}.`,
        `Akses ${code} Dibatasi`
      );
      return;
    }

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
        toast.info(`Membuka dan menyambungkan sesi SSO ke ${code}...`, "Meluncurkan Aplikasi");
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `${appUrl}/sso/callback?code=${launchCode}`;
      } else {
        toast.error(`URL aplikasi untuk ${code} belum terkonfigurasi.`, "Konfigurasi Hilang");
      }
    } catch (err: unknown) {
      console.error(err);
      const errorObj = err as { data?: { message?: string }; message?: string };
      const errorMsg = errorObj.data?.message || errorObj.message || "Gagal meluncurkan aplikasi. Periksa status aplikasi dan hak akses Anda.";
      toast.error(errorMsg, `Gagal Meluncurkan ${code}`);
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

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeOnly = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  const handleRefreshAll = () => {
    refetchDashboard();
    refetchOps();
    if (activeTab === "activity") refetchActivity();
    if (activeTab === "transactions") refetchTx();
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "PLATFORM":
        return <Badge variant="primary">PLATFORM</Badge>;
      case "TICKETING":
        return <Badge variant="success">TICKETING</Badge>;
      case "CONCESSION":
        return <Badge variant="warning">CONCESSION</Badge>;
      default:
        return <Badge variant="default">{source}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const isPaid = status === "PAID" || status === "COMPLETED";
    return (
      <Badge variant={isPaid ? "success" : "destructive"}>
        {status}
      </Badge>
    );
  };

  if (dashboardError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-surface-secondary/40 rounded-xl border border-border">
        <AlertTriangle className="w-12 h-12 text-error mb-4" />
        <h3 className="text-lg font-bold text-text-primary mb-2">Gagal Memuat Data Dashboard</h3>
        <p className="text-sm text-text-muted max-w-sm mb-5">
          Terjadi kesalahan saat berkomunikasi dengan server otentikasi pusat. Silakan periksa koneksi Anda dan coba lagi.
        </p>
        <Button onClick={handleRefreshAll} variant="primary" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 shrink-0" /> Coba Lagi
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

  // Transactions columns configuration
  const txColumns: Column<DashboardTransaction>[] = [
    {
      key: "transactionNumber",
      header: "Referensi",
      render: (item) => <span className="font-semibold">{item.transactionNumber}</span>,
    },
    {
      key: "source",
      header: "Sumber",
      render: (item) => getSourceBadge(item.source),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: "amount",
      header: "Jumlah",
      render: (item) => <span className="font-bold">{formatRupiah(item.amount)}</span>,
    },
    {
      key: "itemCount",
      header: "Total Item/Tiket",
      render: (item) => <span>{item.itemCount} unit</span>,
    },
    {
      key: "timestamp",
      header: "Waktu",
      render: (item) => <span>{formatTimeOnly(item.timestamp)}</span>,
    },
    {
      key: "actions",
      header: "Aksi",
      render: (item) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedTx(item)}>
          <Info className="w-3.5 h-3.5 shrink-0" /> Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Platform Cinema Hub</h1>
          <p className="text-sm text-text-muted">
            Executive control plane and centralized cinema business operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Business Date:</span>
            <DatePicker
              value={selectedDate}
              onChange={(val) => {
                if (val) {
                  setSelectedDate(val);
                  setTxPage(1);
                }
              }}
              size="sm"
              className="w-44"
            />
          </div>
          <Button
            onClick={handleRefreshAll}
            variant="secondary"
            size="sm"
            disabled={isDashboardLoading || isDashboardFetching || isOpsLoading || isOpsFetching || isActivityFetching || isTxFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isDashboardFetching || isOpsFetching || isActivityFetching || isTxFetching ? "animate-spin" : ""}`} />
            Perbarui
          </Button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          Kinerja Operasional
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "activity" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          Log & Aktivitas Terpadu
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "transactions" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          Transaksi Hari Ini
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OPERATIONS OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Operations Performance summary widgets */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-left flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Kinerja Bisnis Hari Ini ({formatDateLabel(selectedDate)})
            </h2>

            {isOpsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-3">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Card className="bg-gradient-to-br from-primary-soft/40 to-surface-secondary border border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="text-left">
                      <CardTitle className="text-sm font-bold text-primary">Kombinasi Total Pendapatan</CardTitle>
                      <CardDescription className="text-[10px]">Tiketing + Konsesi (Terbayar)</CardDescription>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="text-left">
                    <p className="text-3xl font-extrabold text-primary">{formatRupiah(ops?.summary?.totalRevenue ?? 0)}</p>
                    <p className="text-[10px] text-text-muted mt-1.5 font-medium">
                      {ops?.summary?.totalTransactions ?? 0} total transaksi gabungan
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="text-left">
                      <CardTitle className="text-sm font-bold">Pendapatan Tiketing</CardTitle>
                      <CardDescription className="text-[10px]">Pajak & Layanan Termasuk</CardDescription>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-success-soft flex items-center justify-center">
                      <Ticket className="w-4 h-4 text-success" />
                    </div>
                  </CardHeader>
                  <CardContent className="text-left">
                    {ops?.ticketing?.status === "UNAVAILABLE" ? (
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-error">Unavailable</p>
                        <p className="text-[10px] text-error font-medium">Sistem Tiketing tidak terjangkau</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold text-text-primary">{formatRupiah(ops?.ticketing?.revenue ?? 0)}</p>
                        <p className="text-[10px] text-success mt-1.5 font-semibold">
                          ✓ {ops?.ticketing?.ticketsSold ?? 0} tiket terjual dari {ops?.ticketing?.transactions ?? 0} transaksi
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="text-left">
                      <CardTitle className="text-sm font-bold">Pendapatan Konsesi</CardTitle>
                      <CardDescription className="text-[10px]">Makanan, Minuman & Merchandise</CardDescription>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-warning-soft flex items-center justify-center">
                      <UtensilsCrossed className="w-4 h-4 text-warning" />
                    </div>
                  </CardHeader>
                  <CardContent className="text-left">
                    {ops?.concession?.status === "UNAVAILABLE" ? (
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-error">Unavailable</p>
                        <p className="text-[10px] text-error font-medium">Sistem Konsesi tidak terjangkau</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold text-text-primary">{formatRupiah(ops?.concession?.revenue ?? 0)}</p>
                        <p className="text-[10px] text-warning-soft mt-1.5 font-semibold">
                          ✓ {ops?.concession?.itemsSold ?? 0} produk terjual dari {ops?.concession?.transactions ?? 0} transaksi
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticketing launch widget */}
            <Card className="flex flex-col">
              <CardHeader className="border-b border-border pb-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    <span className="font-bold text-base">Kasir & Penjualan Tiket (Ticketing)</span>
                  </div>
                  <Badge variant={ops?.ticketing?.status === "CONNECTED" ? "success" : "destructive"}>
                    {ops?.ticketing?.status === "CONNECTED" ? "CONNECTED" : "UNAVAILABLE"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-between text-left min-h-[160px]">
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-r border-border/50 pr-4">
                      <p className="text-xs text-text-muted">Total Penjualan Tiket</p>
                      <p className="text-xl font-bold mt-1">
                        {ops?.ticketing?.status === "CONNECTED" ? `${ops.ticketing.ticketsSold} Tiket` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Total Transaksi</p>
                      <p className="text-xl font-bold mt-1">
                        {ops?.ticketing?.status === "CONNECTED" ? `${ops.ticketing.transactions} Transaksi` : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-border/50 pt-3 flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Rata-rata per Transaksi:</span>
                    <span className="font-bold text-text-primary">
                      {ops?.ticketing?.status === "CONNECTED" ? formatRupiah(ops.ticketing.averageTransaction) : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Status Izin Akun:</span>
                    {me?.access?.some((a) => a.applicationCode === "TICKETING") || me?.applications?.some((a) => a.code === "TICKETING") ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        ● Akses Diberikan
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        ○ Belum Ditugaskan
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => handleLaunch("TICKETING")}
                    disabled={isLaunching || ops?.ticketing?.status !== "CONNECTED"}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                    Buka Aplikasi Tiketing (SSO)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Concession launch widget */}
            <Card className="flex flex-col">
              <CardHeader className="border-b border-border pb-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-primary" />
                    <span className="font-bold text-base">Makanan & Minuman (Concession)</span>
                  </div>
                  <Badge variant={ops?.concession?.status === "CONNECTED" ? "success" : "destructive"}>
                    {ops?.concession?.status === "CONNECTED" ? "CONNECTED" : "UNAVAILABLE"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-between text-left min-h-[160px]">
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-r border-border/50 pr-4">
                      <p className="text-xs text-text-muted">Item Terjual (F&B)</p>
                      <p className="text-xl font-bold mt-1">
                        {ops?.concession?.status === "CONNECTED" ? `${ops.concession.itemsSold} Item` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Total Transaksi</p>
                      <p className="text-xl font-bold mt-1">
                        {ops?.concession?.status === "CONNECTED" ? `${ops.concession.transactions} Transaksi` : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-border/50 pt-3 flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Rata-rata per Transaksi:</span>
                    <span className="font-bold text-text-primary">
                      {ops?.concession?.status === "CONNECTED" ? formatRupiah(ops.concession.averageTransaction) : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Status Izin Akun:</span>
                    {me?.access?.some((a) => a.applicationCode === "CONCESSION") || me?.applications?.some((a) => a.code === "CONCESSION") ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        ● Akses Diberikan
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        ○ Belum Ditugaskan
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => handleLaunch("CONCESSION")}
                    disabled={isLaunching || ops?.concession?.status !== "CONNECTED"}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                    Buka Aplikasi Konsesi (SSO)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Administrative Controls Grid */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider text-left flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Pusat Kontrol Administratif & Keamanan
            </h2>
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
          </div>

          {/* Quick actions & Ecosystem Configuration panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6 text-left">
              {/* Ecosystem Configuration */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Konfigurasi Ekosistem</h2>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs font-semibold text-text-secondary border-b border-border/60 pb-2">
                      <span>Total Organisasi:</span>
                      <span className="font-bold text-text-primary">
                        {metrics?.totalOrgs ?? 0} ({metrics?.activeOrgs ?? 0} Aktif)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold text-text-secondary border-b border-border/60 pb-2">
                      <span>Total Aplikasi:</span>
                      <span className="font-bold text-text-primary">
                        {metrics?.totalApps ?? 0} ({metrics?.activeApps ?? 0} Aktif)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link href="/organizations" className="col-span-1">
                        <Button variant="secondary" className="w-full text-center py-1 text-[11px] font-bold">
                          Manage Orgs
                        </Button>
                      </Link>
                      <Link href="/applications" className="col-span-1">
                        <Button variant="secondary" className="w-full text-center py-1 text-[11px] font-bold">
                          Manage Apps
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Aksi Cepat */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Aksi Cepat</h2>
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
            </div>

            {/* Platform administrative log entries */}
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
                    </div>
                  ) : !metrics?.recentLogs || metrics.recentLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-text-muted">
                      Belum ada aktivitas administratif tercatat.
                    </div>
                  ) : (
                    <div className="flow-root text-left">
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
      )}

      {/* TAB 2: CHRONOLOGICAL ECOSYSTEM ACTIVITIES TIMELINE */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary text-left">
              Log Aktivitas Ekosistem Terpadu
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-medium">
                Concession:
                <Badge variant={activityData?.concessionStatus === "CONNECTED" ? "success" : "destructive"}>
                  {activityData?.concessionStatus === "CONNECTED" ? "ONLINE" : "OFFLINE"}
                </Badge>
              </span>
              <span className="flex items-center gap-1 font-medium">
                Ticketing:
                <Badge variant={activityData?.ticketingStatus === "CONNECTED" ? "success" : "destructive"}>
                  {activityData?.ticketingStatus === "CONNECTED" ? "ONLINE" : "OFFLINE"}
                </Badge>
              </span>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              {isActivityLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !activityData?.activities || activityData.activities.length === 0 ? (
                <div className="py-12 text-center text-sm text-text-muted">
                  Tidak ada aktivitas ekosistem tercatat saat ini.
                </div>
              ) : (
                <div className="flow-root text-left">
                  <ul className="-mb-8">
                    {activityData.activities.map((act, idx) => (
                      <li key={act.id}>
                        <div className="relative pb-8">
                          {idx !== activityData.activities.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center ring-8 ring-surface">
                                <Calendar className="h-4 w-4 text-text-secondary" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  {getSourceBadge(act.source)}
                                  <p className="text-sm font-semibold text-text-primary">{act.title}</p>
                                </div>
                                <p className="text-xs text-text-muted mt-1">
                                  {act.description}
                                </p>
                              </div>
                              <div className="text-xs text-text-muted sm:text-right shrink-0">
                                {new Date(act.timestamp).toLocaleString("id-ID")}
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
      )}

      {/* TAB 3: UNIFIED TRANSACTIONS GRID */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          {/* Filters and search control panel */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-surface-secondary/40 p-4 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari referensi transaksi..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full bg-surface border border-border rounded pl-9 pr-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <select
                value={txApp}
                onChange={(e) => {
                  setTxApp(e.target.value);
                  setTxPage(1);
                }}
                className="bg-surface border border-border rounded px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="">Semua Aplikasi</option>
                <option value="TICKETING">TICKETING Only</option>
                <option value="CONCESSION">CONCESSION Only</option>
              </select>

              <select
                value={txStatus}
                onChange={(e) => {
                  setTxStatus(e.target.value);
                  setTxPage(1);
                }}
                className="bg-surface border border-border rounded px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="">Semua Status</option>
                <option value="PAID">PAID / COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-medium">
                Concession:
                <Badge variant={txData?.concessionStatus === "CONNECTED" ? "success" : "destructive"}>
                  {txData?.concessionStatus === "CONNECTED" ? "ONLINE" : "OFFLINE"}
                </Badge>
              </span>
              <span className="flex items-center gap-1 font-medium">
                Ticketing:
                <Badge variant={txData?.ticketingStatus === "CONNECTED" ? "success" : "destructive"}>
                  {txData?.ticketingStatus === "CONNECTED" ? "ONLINE" : "OFFLINE"}
                </Badge>
              </span>
            </div>
          </div>

          {/* Combined transactions table */}
          <Table
            columns={txColumns}
            data={txData?.transactions || []}
            isLoading={isTxLoading}
            emptyMessage="Tidak ada transaksi yang cocok dengan filter pencarian."
          />

          {/* Pagination bar */}
          {txData?.pagination && txData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-text-muted">
                Menampilkan halaman {txData.pagination.page} dari {txData.pagination.totalPages} ({txData.pagination.total} transaksi)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={txPage === 1 || isTxFetching}
                  onClick={() => setTxPage((prev) => Math.max(1, prev - 1))}
                  className="p-1 px-3 flex items-center gap-1.5 text-xs font-semibold"
                >
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  disabled={txPage === txData.pagination.totalPages || isTxFetching}
                  onClick={() => setTxPage((prev) => Math.min(txData.pagination.totalPages, prev + 1))}
                  className="p-1 px-3 flex items-center gap-1.5 text-xs font-semibold"
                >
                  Berikutnya <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRANSACTION DETAILS OVERLAY DIALOG */}
      <Dialog
        isOpen={selectedTx !== null}
        onClose={() => setSelectedTx(null)}
        title="Detail Transaksi Terintegrasi"
        description="Informasi audit log operasional sub-sistem retail."
      >
        {selectedTx && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-text-muted">Sumber Sistem</p>
                <div className="mt-1">{getSourceBadge(selectedTx.source)}</div>
              </div>
              <div>
                <p className="text-xs text-text-muted">No. Referensi</p>
                <p className="font-bold text-text-primary mt-1">{selectedTx.transactionNumber}</p>
              </div>
              <div className="border-t border-border/40 pt-3">
                <p className="text-xs text-text-muted">Status</p>
                <div className="mt-1">{getStatusBadge(selectedTx.status)}</div>
              </div>
              <div className="border-t border-border/40 pt-3">
                <p className="text-xs text-text-muted">Total Nilai</p>
                <p className="font-extrabold text-primary mt-1">{formatRupiah(selectedTx.amount)}</p>
              </div>
              <div className="border-t border-border/40 pt-3 col-span-2">
                <p className="text-xs text-text-muted">Waktu Transaksi</p>
                <p className="font-medium mt-1">{new Date(selectedTx.timestamp).toLocaleString("id-ID")}</p>
              </div>
              {selectedTx.customerName && (
                <div className="border-t border-border/40 pt-3">
                  <p className="text-xs text-text-muted">Pelanggan</p>
                  <p className="font-medium mt-1">{selectedTx.customerName}</p>
                </div>
              )}
              <div className="border-t border-border/40 pt-3">
                <p className="text-xs text-text-muted">Kasir / Operator</p>
                <p className="font-medium mt-1">{selectedTx.cashierName || "N/A"}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex flex-col gap-2">
              <Button
                onClick={() => {
                  handleLaunch(selectedTx.source);
                  setSelectedTx(null);
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Luncurkan Aplikasi & Kelola Transaksi
              </Button>
              <Button variant="secondary" onClick={() => setSelectedTx(null)} className="w-full">
                Tutup Detail
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
