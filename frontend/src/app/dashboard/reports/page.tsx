"use client";

import React, { useState, useMemo } from "react";
import { 
  useGetDashboardReportQuery, 
  useGetMoviesReportQuery,
  useGetSchedulesReportQuery,
  useGetProductsReportQuery,
  useLogReportExportMutation 
} from "@/lib/api/dashboardApi";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { RevenueContributionChart } from "@/components/analytics/RevenueContributionChart";
import { MovieRevenueRankingChart } from "@/components/analytics/MovieRevenueRankingChart";
import { ShowtimeOccupancyChart } from "@/components/analytics/ShowtimeOccupancyChart";
import { ProductRevenueRankingChart } from "@/components/analytics/ProductRevenueRankingChart";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShoppingBag, 
  Ticket, 
  DollarSign, 
  AlertTriangle,
  Download,
  CheckCircle2,
  Loader2,
  Film,
  Calendar,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { utils, write } from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface AutoTableOptions {
  startY?: number;
  head: string[][];
  body: (string | number | null)[][];
  theme?: string;
  headStyles?: { fillColor: number[] };
  styles?: { fontSize: number };
}

type ExtendedjsPDF = jsPDF & { 
  autoTable: (options: AutoTableOptions) => void; 
  lastAutoTable: { finalY: number };
};

type ReportTab = "executive" | "movies" | "showtimes" | "products";

interface DepartmentalMetaSummary {
  totalItems?: number;
  totalRevenue?: number | null;
  totalTicketsSold?: number | null;
  totalSeats?: number;
  averageOccupancyRate?: number | null;
  totalQuantitySold?: number | null;
}

interface DepartmentalMetaPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DepartmentalMetaWrapper {
  summary?: DepartmentalMetaSummary;
  pagination?: DepartmentalMetaPagination;
  period?: { startDate: string; endDate: string };
  source?: "AVAILABLE" | "UNAVAILABLE";
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("executive");
  const [rangeType, setRangeType] = useState<string>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const compare = true;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<{ type: string; success: boolean; message: string } | null>(null);

  // Compute dates based on range selection
  const { startDate, endDate } = useMemo(() => {
    const todayObj = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    if (rangeType === "today") {
      return { startDate: formatDate(todayObj), endDate: formatDate(todayObj) };
    }
    if (rangeType === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: formatDate(yesterday), endDate: formatDate(yesterday) };
    }
    if (rangeType === "7d") {
      const prev = new Date();
      prev.setDate(prev.getDate() - 6);
      return { startDate: formatDate(prev), endDate: formatDate(todayObj) };
    }
    if (rangeType === "30d") {
      const prev = new Date();
      prev.setDate(prev.getDate() - 29);
      return { startDate: formatDate(prev), endDate: formatDate(todayObj) };
    }
    if (rangeType === "month") {
      const startOfMonth = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1);
      return { startDate: formatDate(startOfMonth), endDate: formatDate(todayObj) };
    }
    // Custom
    const prevCustom = new Date(todayObj.getTime() - 6 * 24 * 3600 * 1000);
    return {
      startDate: customStart || formatDate(prevCustom),
      endDate: customEnd || formatDate(todayObj),
    };
  }, [rangeType, customStart, customEnd]);

  // Executive Query
  const { 
    data: execResponse, 
    isLoading: execLoading, 
  } = useGetDashboardReportQuery(
    { startDate, endDate, compare },
    { skip: rangeType === "custom" && (!customStart || !customEnd) }
  );

  // Movies Query
  const { 
    data: moviesResponse, 
    isLoading: moviesLoading, 
  } = useGetMoviesReportQuery(
    { startDate, endDate, search: searchQuery, page, limit },
    { skip: activeTab !== "movies" || (rangeType === "custom" && (!customStart || !customEnd)) }
  );

  // Schedules Query
  const { 
    data: schedulesResponse, 
    isLoading: schedulesLoading, 
  } = useGetSchedulesReportQuery(
    { startDate, endDate, search: searchQuery, page, limit },
    { skip: activeTab !== "showtimes" || (rangeType === "custom" && (!customStart || !customEnd)) }
  );

  // Products Query
  const { 
    data: productsResponse, 
    isLoading: productsLoading, 
  } = useGetProductsReportQuery(
    { startDate, endDate, search: searchQuery, page, limit },
    { skip: activeTab !== "products" || (rangeType === "custom" && (!customStart || !customEnd)) }
  );

  const [logExport] = useLogReportExportMutation();

  const execData = execResponse?.data;
  const moviesData = moviesResponse?.data || [];
  const moviesMeta = (moviesResponse?.meta || {}) as DepartmentalMetaWrapper;
  const schedulesData = schedulesResponse?.data || [];
  const schedulesMeta = (schedulesResponse?.meta || {}) as DepartmentalMetaWrapper;
  const productsData = productsResponse?.data || [];
  const productsMeta = (productsResponse?.meta || {}) as DepartmentalMetaWrapper;

  // Map daily data back to Phase 7F format for visualizer charts compatibility
  const mappedDaily = useMemo(() => {
    if (!execData || !execData.dailyTrend) return [];
    return execData.dailyTrend.map((d) => ({
      date: d.date,
      revenue: { total: d.totalRevenue, ticketing: d.ticketingRevenue, concession: d.concessionRevenue },
      transactions: { total: d.totalTransactions, ticketing: d.ticketingTransactions, concession: d.concessionTransactions },
      volume: { tickets: d.ticketsSold, concessionItems: d.concessionItemsSold }
    }));
  }, [execData]);

  // Format Helpers
  const formatRupiah = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "N/A";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "N/A";
    return val.toLocaleString("id-ID");
  };

  const escapeCSVValue = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Trigger Unified CSV Export
  const handleExportCSV = async () => {
    setExporting("CSV");
    setExportStatus(null);
    try {
      let csvContent = "";
      
      if (activeTab === "executive" && execData) {
        csvContent += `Planet Cinema Executive Summary Report\n`;
        csvContent += `Period,${execData.period.startDate} to ${execData.period.endDate}\n`;
        csvContent += `Generated At,${execData.generatedAt}\n\n`;

        csvContent += `Metric,Value,Period Change\n`;
        csvContent += `Total Revenue,${escapeCSVValue(execData.summary.totalRevenue)},${escapeCSVValue(execData.summary.revenueChange)}%\n`;
        csvContent += `Ticketing Revenue,${escapeCSVValue(execData.summary.ticketingRevenue)},N/A\n`;
        csvContent += `Concession Revenue,${escapeCSVValue(execData.summary.concessionRevenue)},N/A\n`;
        csvContent += `Total Transactions,${escapeCSVValue(execData.summary.totalTransactions)},${escapeCSVValue(execData.summary.transactionChange)}%\n`;
        csvContent += `Tickets Sold,${escapeCSVValue(execData.summary.ticketsSold)},N/A\n`;
        csvContent += `Concession Items Sold,${escapeCSVValue(execData.summary.concessionItemsSold)},N/A\n`;
        csvContent += `Average Transaction Value,${escapeCSVValue(execData.summary.averageTransactionValue)},N/A\n\n`;

        csvContent += `Daily Trend Records\n`;
        csvContent += `Date,Total Revenue,Ticketing Revenue,Concession Revenue,Total Transactions,Ticketing Transactions,Concession Transactions\n`;
        execData.dailyTrend.forEach((d) => {
          csvContent += `${escapeCSVValue(d.date)},${escapeCSVValue(d.totalRevenue)},${escapeCSVValue(d.ticketingRevenue)},${escapeCSVValue(d.concessionRevenue)},${escapeCSVValue(d.totalTransactions)},${escapeCSVValue(d.ticketingTransactions)},${escapeCSVValue(d.concessionTransactions)}\n`;
        });
      } else if (activeTab === "movies") {
        csvContent += `Planet Cinema Movie Performance Report\n`;
        csvContent += `Period,${startDate} to ${endDate}\n\n`;
        csvContent += `Movie Title,Duration,Tickets Sold,Active Tickets,Used Tickets,Gross Revenue,Refund Amount,Net Revenue,Avg Ticket Price,Revenue Share (%)\n`;
        moviesData.forEach((m) => {
          csvContent += `${escapeCSVValue(m.movieTitle)},${escapeCSVValue(m.durationMinutes)} mins,${escapeCSVValue(m.ticketsSold)},${escapeCSVValue(m.ticketsActive)},${escapeCSVValue(m.ticketsUsed)},${escapeCSVValue(m.grossRevenue)},${escapeCSVValue(m.refundAmount)},${escapeCSVValue(m.netRevenue)},${escapeCSVValue(m.averageTicketPrice)},${escapeCSVValue(m.revenueShare)}%\n`;
        });
      } else if (activeTab === "showtimes") {
        csvContent += `Planet Cinema Showtime & Occupancy Report\n`;
        csvContent += `Period,${startDate} to ${endDate}\n\n`;
        csvContent += `Movie Title,Studio,Show Date,Start Time,Capacity,Sold Seats,Used Seats,Available Seats,Occupancy Rate (%),Revenue\n`;
        schedulesData.forEach((s) => {
          csvContent += `${escapeCSVValue(s.movieTitle)},${escapeCSVValue(s.studioName)},${escapeCSVValue(s.showDate)},${escapeCSVValue(s.startTime)},${escapeCSVValue(s.totalSeats)},${escapeCSVValue(s.soldSeats)},${escapeCSVValue(s.usedSeats)},${escapeCSVValue(s.availableSeats)},${escapeCSVValue(s.occupancyRate)}%,${escapeCSVValue(s.revenue)}\n`;
        });
      } else if (activeTab === "products") {
        csvContent += `Planet Cinema Concession Product Sales Ranking\n`;
        csvContent += `Period,${startDate} to ${endDate}\n\n`;
        csvContent += `Product Name,Category,Quantity Sold,Gross Revenue,Discount,Tax,Net Revenue,Avg Selling Price,Revenue Share (%)\n`;
        productsData.forEach((p) => {
          csvContent += `${escapeCSVValue(p.productName)},${escapeCSVValue(p.categoryName)},${escapeCSVValue(p.quantitySold)},${escapeCSVValue(p.grossRevenue)},${escapeCSVValue(p.discountAmount)},${escapeCSVValue(p.taxAmount)},${escapeCSVValue(p.netRevenue)},${escapeCSVValue(p.averageSellingPrice)},${escapeCSVValue(p.revenueShare)}%\n`;
        });
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Planet_Cinema_${activeTab.toUpperCase()}_Report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await logExport({
        format: "CSV",
        startDate,
        endDate,
      }).unwrap();

      setExportStatus({ type: "CSV", success: true, message: `${activeTab.toUpperCase()} CSV report downloaded successfully` });
    } catch (err) {
      console.error(err);
      setExportStatus({ type: "CSV", success: false, message: "Unable to generate report. Please try again." });
    } finally {
      setExporting(null);
    }
  };

  // Trigger Unified XLSX Export
  const handleExportXLSX = async () => {
    setExporting("XLSX");
    setExportStatus(null);
    try {
      const wb = utils.book_new();

      if (activeTab === "executive" && execData) {
        const summaryRows = [
          ["Planet Cinema Executive Report"],
          ["Period", `${execData.period.startDate} to ${execData.period.endDate}`],
          ["Generated At", execData.generatedAt],
          [],
          ["Metric", "Value", "Period Change"],
          ["Total Revenue", execData.summary.totalRevenue, execData.summary.revenueChange ? `${execData.summary.revenueChange}%` : "0%"],
          ["Ticketing Revenue", execData.summary.ticketingRevenue, "-"],
          ["Concession Revenue", execData.summary.concessionRevenue, "-"],
          ["Total Transactions", execData.summary.totalTransactions, execData.summary.transactionChange ? `${execData.summary.transactionChange}%` : "0%"],
          ["Tickets Sold", execData.summary.ticketsSold, "-"],
          ["Concession Items Sold", execData.summary.concessionItemsSold, "-"],
          ["Average Transaction Value", execData.summary.averageTransactionValue, "-"],
        ];
        const wsSummary = utils.aoa_to_sheet(summaryRows);
        utils.book_append_sheet(wb, wsSummary, "Executive Summary");

        const dailyRows = [
          ["Daily Trend Breakdown"],
          ["Date", "Total Revenue", "Ticketing Revenue", "Concession Revenue", "Total Transactions", "Ticketing Transactions", "Concession Transactions", "Tickets Sold", "Items Sold"],
          ...execData.dailyTrend.map((d) => [
            d.date,
            d.totalRevenue,
            d.ticketingRevenue,
            d.concessionRevenue,
            d.totalTransactions,
            d.ticketingTransactions,
            d.concessionTransactions,
            d.ticketsSold,
            d.concessionItemsSold,
          ]),
        ];
        const wsDaily = utils.aoa_to_sheet(dailyRows);
        utils.book_append_sheet(wb, wsDaily, "Daily Trend");
      } else if (activeTab === "movies") {
        const movieRows = [
          ["Planet Cinema Movie Box Office Report"],
          ["Period", `${startDate} to ${endDate}`],
          [],
          ["Movie Title", "Duration (min)", "Tickets Sold", "Active Tickets", "Used Tickets", "Gross Revenue", "Refund Amount", "Net Revenue", "Avg Ticket Price", "Revenue Share (%)"],
          ...moviesData.map((m) => [
            m.movieTitle,
            m.durationMinutes || "N/A",
            m.ticketsSold,
            m.ticketsActive,
            m.ticketsUsed,
            m.grossRevenue,
            m.refundAmount,
            m.netRevenue,
            m.averageTicketPrice,
            `${m.revenueShare}%`,
          ]),
        ];
        const wsMovies = utils.aoa_to_sheet(movieRows);
        utils.book_append_sheet(wb, wsMovies, "Movies");
      } else if (activeTab === "showtimes") {
        const showtimeRows = [
          ["Planet Cinema Showtime Occupancy Report"],
          ["Period", `${startDate} to ${endDate}`],
          [],
          ["Movie Title", "Studio", "Show Date", "Start Time", "Capacity", "Sold Seats", "Used Seats", "Available Seats", "Occupancy (%)", "Revenue"],
          ...schedulesData.map((s) => [
            s.movieTitle,
            s.studioName,
            s.showDate,
            s.startTime,
            s.totalSeats,
            s.soldSeats,
            s.usedSeats,
            s.availableSeats,
            s.occupancyRate !== null ? `${s.occupancyRate}%` : "N/A",
            s.revenue,
          ]),
        ];
        const wsSchedules = utils.aoa_to_sheet(showtimeRows);
        utils.book_append_sheet(wb, wsSchedules, "Showtimes");
      } else if (activeTab === "products") {
        const productRows = [
          ["Planet Cinema Concession Product Sales Ranking"],
          ["Period", `${startDate} to ${endDate}`],
          [],
          ["Product Name", "Category", "Quantity Sold", "Gross Revenue", "Discount Amount", "Tax Amount", "Net Revenue", "Avg Selling Price", "Revenue Share (%)"],
          ...productsData.map((p) => [
            p.productName,
            p.categoryName,
            p.quantitySold,
            p.grossRevenue,
            p.discountAmount,
            p.taxAmount,
            p.netRevenue,
            p.averageSellingPrice,
            `${p.revenueShare}%`,
          ]),
        ];
        const wsProducts = utils.aoa_to_sheet(productRows);
        utils.book_append_sheet(wb, wsProducts, "Products");
      }

      const excelBuffer = write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Planet_Cinema_${activeTab.toUpperCase()}_Report_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await logExport({
        format: "XLSX",
        startDate,
        endDate,
      }).unwrap();

      setExportStatus({ type: "XLSX", success: true, message: `${activeTab.toUpperCase()} Excel report downloaded successfully` });
    } catch (err) {
      console.error(err);
      setExportStatus({ type: "XLSX", success: false, message: "Unable to generate report. Please try again." });
    } finally {
      setExporting(null);
    }
  };

  // Trigger Unified PDF Export
  const handleExportPDF = async () => {
    setExporting("PDF");
    setExportStatus(null);
    try {
      const doc = new jsPDF() as ExtendedjsPDF;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, "F");
      doc.setTextColor(248, 250, 252);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("PLANET CINEMA MANAGEMENT", 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${activeTab.toUpperCase()} PERFORMANCE REPORT — ${startDate} to ${endDate}`, 14, 23);

      let currentY = 40;

      if (activeTab === "executive" && execData) {
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("1. Executive Summary", 14, currentY);

        const summaryTableBody = [
          ["Total Revenue", formatRupiah(execData.summary.totalRevenue), execData.summary.revenueChange ? `${execData.summary.revenueChange}%` : "0%"],
          ["Ticketing Revenue", formatRupiah(execData.summary.ticketingRevenue), "-"],
          ["Concession Revenue", formatRupiah(execData.summary.concessionRevenue), "-"],
          ["Total Transactions", formatNumber(execData.summary.totalTransactions), execData.summary.transactionChange ? `${execData.summary.transactionChange}%` : "0%"],
          ["Tickets Sold", formatNumber(execData.summary.ticketsSold), "-"],
          ["Concession Items Sold", formatNumber(execData.summary.concessionItemsSold), "-"],
          ["Average Transaction Value", formatRupiah(execData.summary.averageTransactionValue), "-"],
        ];

        doc.autoTable({
          startY: currentY + 4,
          head: [["Metric", "Value", "Period Change"]],
          body: summaryTableBody,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
        });

        currentY = doc.lastAutoTable.finalY + 12;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("2. Daily Performance Breakdown", 14, currentY);

        const dailyTableBody = execData.dailyTrend.map((d) => [
          d.date,
          formatRupiah(d.totalRevenue),
          formatRupiah(d.ticketingRevenue),
          formatRupiah(d.concessionRevenue),
          formatNumber(d.totalTransactions),
          formatNumber(d.ticketsSold),
        ]);

        doc.autoTable({
          startY: currentY + 4,
          head: [["Date", "Total Rev", "Ticketing", "Concession", "Trans", "Tickets"]],
          body: dailyTableBody,
          theme: "grid",
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 8 },
        });
      } else if (activeTab === "movies") {
        doc.autoTable({
          startY: currentY,
          head: [["Movie Title", "Duration", "Sold", "Gross Rev", "Refund", "Net Rev", "Share"]],
          body: moviesData.map((m) => [
            m.movieTitle,
            `${m.durationMinutes || "-"} m`,
            formatNumber(m.ticketsSold),
            formatRupiah(m.grossRevenue),
            formatRupiah(m.refundAmount),
            formatRupiah(m.netRevenue),
            `${m.revenueShare}%`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
        });
      } else if (activeTab === "showtimes") {
        doc.autoTable({
          startY: currentY,
          head: [["Movie", "Studio", "Date", "Capacity", "Sold", "Occupancy", "Revenue"]],
          body: schedulesData.map((s) => [
            s.movieTitle,
            s.studioName,
            s.showDate,
            s.totalSeats,
            s.soldSeats,
            s.occupancyRate !== null ? `${s.occupancyRate}%` : "N/A",
            formatRupiah(s.revenue),
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
        });
      } else if (activeTab === "products") {
        doc.autoTable({
          startY: currentY,
          head: [["Product Name", "Category", "Sold", "Gross", "Discount", "Net Revenue", "Share"]],
          body: productsData.map((p) => [
            p.productName,
            p.categoryName,
            formatNumber(p.quantitySold),
            formatRupiah(p.grossRevenue),
            formatRupiah(p.discountAmount),
            formatRupiah(p.netRevenue),
            `${p.revenueShare}%`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [236, 72, 153] },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`Planet_Cinema_${activeTab.toUpperCase()}_Report_${startDate}_to_${endDate}.pdf`);

      await logExport({
        format: "PDF",
        startDate,
        endDate,
      }).unwrap();

      setExportStatus({ type: "PDF", success: true, message: `${activeTab.toUpperCase()} PDF report downloaded successfully` });
    } catch (err) {
      console.error(err);
      setExportStatus({ type: "PDF", success: false, message: "Unable to generate report. Please try again." });
    } finally {
      setExporting(null);
    }
  };

  const currentLoading = 
    activeTab === "executive" ? execLoading :
    activeTab === "movies" ? moviesLoading :
    activeTab === "showtimes" ? schedulesLoading : productsLoading;

  return (
    <div className="flex-1 space-y-6 min-w-0 bg-slate-950 text-slate-100 rounded-2xl p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-500" />
            Centralized Reports Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardized governance, box office performance, occupancy, and product rankings
          </p>
        </div>

        {/* Global Range Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "month", label: "This Month" },
              { id: "custom", label: "Custom" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setRangeType(tab.id);
                  setExportStatus(null);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  rangeType === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {rangeType === "custom" && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1.5">
              <DatePicker
                value={customStart}
                onChange={(val) => {
                  setCustomStart(val);
                  setExportStatus(null);
                }}
                placeholder="Start Date"
                className="w-36 text-xs"
              />
              <span className="text-xs text-slate-500">to</span>
              <DatePicker
                value={customEnd}
                onChange={(val) => {
                  setCustomEnd(val);
                  setExportStatus(null);
                }}
                placeholder="End Date"
                className="w-36 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 space-x-1">
        {[
          { id: "executive" as ReportTab, label: "Executive Summary", icon: Activity },
          { id: "movies" as ReportTab, label: "Movies & Box Office", icon: Film },
          { id: "showtimes" as ReportTab, label: "Showtimes & Occupancy", icon: Calendar },
          { id: "products" as ReportTab, label: "Concession Products", icon: ShoppingBag },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
                setPage(1);
                setExportStatus(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                isActive
                  ? "border-blue-500 text-blue-400 bg-blue-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Outage / Partial State Warning Banner */}
      {execData?.dataSources && (execData.dataSources.ticketing === "UNAVAILABLE" || execData.dataSources.concession === "UNAVAILABLE") && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Partial Telemetry Alert:</strong> One or more downstream operational databases ({execData.dataSources.ticketing === "UNAVAILABLE" ? "Ticketing" : "Concession"}) are offline. Displaying available datasets.
          </span>
        </div>
      )}

      {/* Action Toolbar: Search & Unified Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder={
              activeTab === "movies" ? "Search movie title..." :
              activeTab === "showtimes" ? "Search movie or studio..." :
              activeTab === "products" ? "Search product or category..." : "Filter records..."
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            disabled={activeTab === "executive"}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!!exporting || currentLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition disabled:opacity-50"
          >
            {exporting === "CSV" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export CSV
          </button>
          <button
            onClick={handleExportXLSX}
            disabled={!!exporting || currentLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg border border-emerald-500/30 transition disabled:opacity-50"
          >
            {exporting === "XLSX" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!!exporting || currentLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg border border-rose-500/30 transition disabled:opacity-50"
          >
            {exporting === "PDF" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Export Status Toast Banner */}
      {exportStatus && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${exportStatus.success ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border border-rose-500/30 text-rose-300"}`}>
          {exportStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{exportStatus.message}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {currentLoading && (
        <div className="flex flex-col items-center justify-center p-16 bg-slate-900/40 border border-slate-800 rounded-xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-300">Retrieving reporting telemetry...</p>
          <p className="text-xs text-slate-500 mt-1">Aggregating from operational systems</p>
        </div>
      )}

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {!currentLoading && activeTab === "executive" && execData && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium text-slate-400">Total Net Revenue</p>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-2">{formatRupiah(execData.summary.totalRevenue)}</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {execData.summary.revenueChange !== null && (
                  <span className={`font-semibold flex items-center ${execData.summary.revenueChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {execData.summary.revenueChange >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                    {Math.abs(execData.summary.revenueChange)}%
                  </span>
                )}
                <span className="text-slate-500">vs prev period</span>
              </div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium text-slate-400">Total Transactions</p>
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-2">{formatNumber(execData.summary.totalTransactions)}</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {execData.summary.transactionChange !== null && (
                  <span className={`font-semibold flex items-center ${execData.summary.transactionChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {execData.summary.transactionChange >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                    {Math.abs(execData.summary.transactionChange)}%
                  </span>
                )}
                <span className="text-slate-500">transactions</span>
              </div>
            </div>

            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium text-slate-400">Tickets Sold</p>
                <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
                  <Ticket className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-2">{formatNumber(execData.summary.ticketsSold)}</p>
              <p className="text-xs text-slate-500 mt-2">Ticketing Admissions</p>
            </div>

            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium text-slate-400">Concession Items Sold</p>
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white mt-2">{formatNumber(execData.summary.concessionItemsSold)}</p>
              <p className="text-xs text-slate-500 mt-2">F&B Units Sold</p>
            </div>
          </div>

          {/* D3 Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RevenueTrendChart data={mappedDaily} />
            </div>
            <div>
              <RevenueContributionChart
                ticketingRevenue={execData.contribution.ticketing.revenue}
                concessionRevenue={execData.contribution.concession.revenue}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOVIES & BOX OFFICE */}
      {!currentLoading && activeTab === "movies" && (
        <div className="space-y-6">
          {/* KPI Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Total Box Office Revenue</p>
              <p className="text-2xl font-black text-white mt-2">{formatRupiah(moviesMeta?.summary?.totalRevenue)}</p>
              <p className="text-xs text-slate-500 mt-1">From active/used tickets</p>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Total Tickets Sold</p>
              <p className="text-2xl font-black text-white mt-2">{formatNumber(moviesMeta?.summary?.totalTicketsSold)}</p>
              <p className="text-xs text-slate-500 mt-1">Across all schedules</p>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Total Movies Screened</p>
              <p className="text-2xl font-black text-white mt-2">{formatNumber(moviesMeta?.summary?.totalItems)}</p>
              <p className="text-xs text-slate-500 mt-1">In selected interval</p>
            </div>
          </div>

          {/* D3 Movie Ranking Visualization */}
          <MovieRevenueRankingChart movies={moviesData} />

          {/* Data Table */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Movie Performance Ledger</h3>
              <span className="text-xs text-slate-400">Showing {moviesData.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Movie Title</th>
                    <th className="px-4 py-3 font-semibold text-center">Duration</th>
                    <th className="px-4 py-3 font-semibold text-right">Tickets Sold</th>
                    <th className="px-4 py-3 font-semibold text-right">Active</th>
                    <th className="px-4 py-3 font-semibold text-right">Used</th>
                    <th className="px-4 py-3 font-semibold text-right">Gross Revenue</th>
                    <th className="px-4 py-3 font-semibold text-right">Refund</th>
                    <th className="px-4 py-3 font-semibold text-right">Net Revenue</th>
                    <th className="px-4 py-3 font-semibold text-right">Avg Ticket</th>
                    <th className="px-4 py-3 font-semibold text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {moviesData.map((m) => (
                    <tr key={m.movieId} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-bold text-slate-200">{m.movieTitle}</td>
                      <td className="px-4 py-3 text-center text-slate-400">{m.durationMinutes ? `${m.durationMinutes} m` : "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-sky-400">{formatNumber(m.ticketsSold)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{formatNumber(m.ticketsActive)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{formatNumber(m.ticketsUsed)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{formatRupiah(m.grossRevenue)}</td>
                      <td className="px-4 py-3 text-right text-rose-400">{m.refundAmount > 0 ? formatRupiah(m.refundAmount) : "-"}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatRupiah(m.netRevenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatRupiah(m.averageTicketPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-400">{m.revenueShare}%</td>
                    </tr>
                  ))}
                  {moviesData.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                        No movie data found for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {moviesMeta.pagination && moviesMeta.pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                <span>Page {moviesMeta.pagination.page} of {moviesMeta.pagination.totalPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={moviesMeta.pagination.page <= 1}
                    className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (moviesMeta.pagination) {
                        const maxP = moviesMeta.pagination.totalPages;
                        setPage((p) => Math.min(maxP, p + 1));
                      }
                    }}
                    disabled={moviesMeta.pagination.page >= moviesMeta.pagination.totalPages}
                    className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SHOWTIMES & OCCUPANCY */}
      {!currentLoading && activeTab === "showtimes" && (
        <div className="space-y-6">
          {/* KPI Header */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Average Occupancy</p>
              <p className="text-2xl font-black text-white mt-2">
                {schedulesMeta?.summary?.averageOccupancyRate !== null ? `${schedulesMeta?.summary?.averageOccupancyRate}%` : "N/A"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Seat utilization rate</p>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Total Seats Capacity</p>
              <p className="text-2xl font-black text-white mt-2">{formatNumber(schedulesMeta?.summary?.totalSeats)}</p>
              <p className="text-xs text-slate-500 mt-1">Available across studios</p>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Total Seats Sold</p>
              <p className="text-2xl font-black text-white mt-2">{formatNumber(schedulesMeta?.summary?.totalTicketsSold)}</p>
              <p className="text-xs text-slate-500 mt-1">Confirmed tickets</p>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Total Revenue</p>
              <p className="text-2xl font-black text-white mt-2">{formatRupiah(schedulesMeta?.summary?.totalRevenue)}</p>
              <p className="text-xs text-slate-500 mt-1">From scheduled showtimes</p>
            </div>
          </div>

          {/* D3 Showtime Occupancy Visualization */}
          <ShowtimeOccupancyChart schedules={schedulesData} />

          {/* Data Table */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Showtime Occupancy Ledger</h3>
              <span className="text-xs text-slate-400">Showing {schedulesData.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Movie</th>
                    <th className="px-4 py-3 font-semibold">Studio</th>
                    <th className="px-4 py-3 font-semibold">Date & Time</th>
                    <th className="px-4 py-3 font-semibold text-right">Capacity</th>
                    <th className="px-4 py-3 font-semibold text-right">Sold</th>
                    <th className="px-4 py-3 font-semibold text-right">Used</th>
                    <th className="px-4 py-3 font-semibold text-right">Available</th>
                    <th className="px-4 py-3 font-semibold text-right">Occupancy (%)</th>
                    <th className="px-4 py-3 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {schedulesData.map((s) => (
                    <tr key={s.showtimeId} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-bold text-slate-200">{s.movieTitle}</td>
                      <td className="px-4 py-3 text-slate-300">
                        <span className="px-2 py-0.5 bg-slate-800 rounded font-mono text-[11px] mr-1.5">{s.studioCode}</span>
                        {s.studioName}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {s.showDate} {new Date(s.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{s.totalSeats}</td>
                      <td className="px-4 py-3 text-right font-semibold text-sky-400">{s.soldSeats}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{s.usedSeats}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{s.availableSeats}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        {s.occupancyRate !== null ? (
                          <span className={s.occupancyRate >= 80 ? "text-emerald-400" : s.occupancyRate >= 40 ? "text-blue-400" : "text-amber-400"}>
                            {s.occupancyRate}%
                          </span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatRupiah(s.revenue)}</td>
                    </tr>
                  ))}
                  {schedulesData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        No showtime data found for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {schedulesMeta.pagination && schedulesMeta.pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                <span>Page {schedulesMeta.pagination.page} of {schedulesMeta.pagination.totalPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={schedulesMeta.pagination.page <= 1}
                    className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (schedulesMeta.pagination) {
                        const maxP = schedulesMeta.pagination.totalPages;
                        setPage((p) => Math.min(maxP, p + 1));
                      }
                    }}
                    disabled={schedulesMeta.pagination.page >= schedulesMeta.pagination.totalPages}
                    className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CONCESSION PRODUCTS */}
      {!currentLoading && activeTab === "products" && (
        <div className="space-y-6">
          {/* KPI Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Total Concession Net Revenue</p>
              <p className="text-2xl font-black text-white mt-2">{formatRupiah(productsMeta.summary?.totalRevenue)}</p>
              <p className="text-xs text-slate-500 mt-1">Paid F&B orders</p>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Total Items Sold</p>
              <p className="text-2xl font-black text-white mt-2">{formatNumber(productsMeta.summary?.totalQuantitySold)}</p>
              <p className="text-xs text-slate-500 mt-1">Units dispensed</p>
            </div>
            <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <p className="text-xs font-medium text-slate-400">Unique Products Sold</p>
              <p className="text-2xl font-black text-white mt-2">{formatNumber(productsMeta.summary?.totalItems)}</p>
              <p className="text-xs text-slate-500 mt-1">In selected interval</p>
            </div>
          </div>

          {/* D3 Product Ranking Visualization */}
          <ProductRevenueRankingChart products={productsData} />

          {/* Data Table */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Concession Product Sales Ranking</h3>
              <span className="text-xs text-slate-400">Showing {productsData.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Product Name</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold text-right">Quantity Sold</th>
                    <th className="px-4 py-3 font-semibold text-right">Gross Revenue</th>
                    <th className="px-4 py-3 font-semibold text-right">Discount</th>
                    <th className="px-4 py-3 font-semibold text-right">Tax</th>
                    <th className="px-4 py-3 font-semibold text-right">Net Revenue</th>
                    <th className="px-4 py-3 font-semibold text-right">Avg Selling Price</th>
                    <th className="px-4 py-3 font-semibold text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {productsData.map((p) => (
                    <tr key={p.productId} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-bold text-slate-200">{p.productName}</td>
                      <td className="px-4 py-3 text-slate-400">
                        <span className="px-2 py-0.5 bg-slate-800/80 rounded text-[11px] text-pink-300 font-medium">
                          {p.categoryName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-pink-400">{formatNumber(p.quantitySold)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{formatRupiah(p.grossRevenue)}</td>
                      <td className="px-4 py-3 text-right text-rose-400">{p.discountAmount > 0 ? formatRupiah(p.discountAmount) : "-"}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{formatRupiah(p.taxAmount)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatRupiah(p.netRevenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatRupiah(p.averageSellingPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-pink-400">{p.revenueShare}%</td>
                    </tr>
                  ))}
                  {productsData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        No product sales found for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {productsMeta.pagination && productsMeta.pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                <span>Page {productsMeta.pagination.page} of {productsMeta.pagination.totalPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={productsMeta.pagination.page <= 1}
                    className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (productsMeta.pagination) {
                        const maxP = productsMeta.pagination.totalPages;
                        setPage((p) => Math.min(maxP, p + 1));
                      }
                    }}
                    disabled={productsMeta.pagination.page >= productsMeta.pagination.totalPages}
                    className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
