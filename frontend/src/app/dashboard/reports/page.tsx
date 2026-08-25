"use client";

import React, { useState, useMemo } from "react";
import { 
  useGetDashboardReportQuery, 
  useLogReportExportMutation 
} from "@/lib/api/dashboardApi";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { RevenueContributionChart } from "@/components/analytics/RevenueContributionChart";
import { TransactionVolumeChart } from "@/components/analytics/TransactionVolumeChart";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShoppingBag, 
  Ticket, 
  DollarSign, 
  AlertTriangle,
  Download,
  Eye,
  CheckCircle2,
  Loader2
} from "lucide-react";
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

export default function ReportsPage() {
  const [rangeType, setRangeType] = useState<string>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [compare, setCompare] = useState<boolean>(true);
  const [exporting, setExporting] = useState<string | null>(null); // "PDF" | "XLSX" | "CSV" | null
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

  const { data: response, isLoading, isError, refetch } = useGetDashboardReportQuery(
    { startDate, endDate, compare },
    { skip: rangeType === "custom" && (!customStart || !customEnd) }
  );

  const [logExport] = useLogReportExportMutation();

  const data = response?.data;

  // Map daily data back to Phase 7F format for visualizer charts compatibility
  const mappedDaily = useMemo(() => {
    if (!data || !data.dailyTrend) return [];
    return data.dailyTrend.map((d) => ({
      date: d.date,
      revenue: { total: d.totalRevenue, ticketing: d.ticketingRevenue, concession: d.concessionRevenue },
      transactions: { total: d.totalTransactions, ticketing: d.ticketingTransactions, concession: d.concessionTransactions },
      volume: { tickets: d.ticketsSold, concessionItems: d.concessionItemsSold }
    }));
  }, [data]);

  // Format Helpers
  const formatRupiah = (val: number | null) => {
    if (val === null) return "N/A";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatNumber = (val: number | null) => {
    if (val === null) return "N/A";
    return val.toLocaleString("id-ID");
  };

  // CSV Generator Helper (with escaping)
  const escapeCSVValue = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Trigger Client CSV Export
  const handleExportCSV = async () => {
    if (!data) return;
    setExporting("CSV");
    setExportStatus(null);
    try {
      let csvContent = "";
      
      // Title & Summary Block
      csvContent += `Planet Cinema Executive Summary Report\n`;
      csvContent += `Period,${data.period.startDate} to ${data.period.endDate}\n`;
      csvContent += `Generated At,${data.generatedAt}\n\n`;

      csvContent += `Metric,Value,Period Change\n`;
      csvContent += `Total Revenue,${escapeCSVValue(data.summary.totalRevenue)},${escapeCSVValue(data.summary.revenueChange)}%\n`;
      csvContent += `Ticketing Revenue,${escapeCSVValue(data.summary.ticketingRevenue)},N/A\n`;
      csvContent += `Concession Revenue,${escapeCSVValue(data.summary.concessionRevenue)},N/A\n`;
      csvContent += `Total Transactions,${escapeCSVValue(data.summary.totalTransactions)},${escapeCSVValue(data.summary.transactionChange)}%\n`;
      csvContent += `Tickets Sold,${escapeCSVValue(data.summary.ticketsSold)},N/A\n`;
      csvContent += `Concession Items Sold,${escapeCSVValue(data.summary.concessionItemsSold)},N/A\n`;
      csvContent += `Average Transaction Value,${escapeCSVValue(data.summary.averageTransactionValue)},N/A\n\n`;

      // Daily Details
      csvContent += `Daily Trend Records\n`;
      csvContent += `Date,Total Revenue,Ticketing Revenue,Concession Revenue,Total Transactions,Ticketing Transactions,Concession Transactions\n`;
      data.dailyTrend.forEach((d) => {
        csvContent += `${escapeCSVValue(d.date)},${escapeCSVValue(d.totalRevenue)},${escapeCSVValue(d.ticketingRevenue)},${escapeCSVValue(d.concessionRevenue)},${escapeCSVValue(d.totalTransactions)},${escapeCSVValue(d.ticketingTransactions)},${escapeCSVValue(d.concessionTransactions)}\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Planet_Cinema_Report_${data.period.startDate}_to_${data.period.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Call API purely to record audit log
      await logExport({
        format: "CSV",
        startDate: data.period.startDate,
        endDate: data.period.endDate,
      }).unwrap();

      setExportStatus({ type: "CSV", success: true, message: "CSV Report downloaded successfully" });
    } catch (err) {
      console.error(err);
      setExportStatus({ type: "CSV", success: false, message: "Unable to generate report. Please try again." });
    } finally {
      setExporting(null);
    }
  };

  // Trigger Client XLSX Export
  const handleExportXLSX = async () => {
    if (!data) return;
    setExporting("XLSX");
    setExportStatus(null);
    try {
      const wb = utils.book_new();

      // Sheet 1: Executive Summary
      const summaryRows = [
        ["Planet Cinema Executive Report"],
        ["Period", `${data.period.startDate} to ${data.period.endDate}`],
        ["Generated At", data.generatedAt],
        [],
        ["Metric", "Value", "Period Change"],
        ["Total Revenue", data.summary.totalRevenue, data.summary.revenueChange ? `${data.summary.revenueChange}%` : "0%"],
        ["Ticketing Revenue", data.summary.ticketingRevenue, ""],
        ["Concession Revenue", data.summary.concessionRevenue, ""],
        ["Total Transactions", data.summary.totalTransactions, data.summary.transactionChange ? `${data.summary.transactionChange}%` : "0%"],
        ["Tickets Sold", data.summary.ticketsSold, ""],
        ["Items Sold", data.summary.concessionItemsSold, ""],
        ["Average Transaction Value", data.summary.averageTransactionValue, ""],
      ];
      const wsSummary = utils.aoa_to_sheet(summaryRows);
      utils.book_append_sheet(wb, wsSummary, "Executive Summary");

      // Sheet 2: Daily Performance
      const dailyRows = [
        ["Date", "Total Revenue", "Ticketing Revenue", "Concession Revenue", "Total Transactions", "Ticketing Transactions", "Concession Transactions"],
      ];
      data.dailyTrend.forEach((d) => {
        dailyRows.push([
          d.date,
          (d.totalRevenue ?? 0).toString(),
          (d.ticketingRevenue ?? 0).toString(),
          (d.concessionRevenue ?? 0).toString(),
          (d.totalTransactions ?? 0).toString(),
          (d.ticketingTransactions ?? 0).toString(),
          (d.concessionTransactions ?? 0).toString(),
        ]);
      });
      const wsDaily = utils.aoa_to_sheet(dailyRows);
      utils.book_append_sheet(wb, wsDaily, "Daily Performance");

      // Sheet 3: Revenue Contribution
      const contributionRows = [
        ["Application Channel", "Revenue", "Percentage Contribution"],
        ["Ticketing", data.contribution.ticketing.revenue, `${data.contribution.ticketing.percentage}%`],
        ["Concession", data.contribution.concession.revenue, `${data.contribution.concession.percentage}%`],
      ];
      const wsContrib = utils.aoa_to_sheet(contributionRows);
      utils.book_append_sheet(wb, wsContrib, "Revenue Contribution");

      // Sheet 4: Data Sources
      const sourceRows = [
        ["Source Gateway", "Status"],
        ["Platform", "AVAILABLE"],
        ["Ticketing Gateway", data.dataSources.ticketing],
        ["Concession Gateway", data.dataSources.concession],
      ];
      const wsSources = utils.aoa_to_sheet(sourceRows);
      utils.book_append_sheet(wb, wsSources, "Data Sources");

      // Create blob & trigger download
      const wbout = write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Planet_Cinema_Report_${data.period.startDate}_to_${data.period.endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Call API purely to record audit log
      await logExport({
        format: "XLSX",
        startDate: data.period.startDate,
        endDate: data.period.endDate,
      }).unwrap();

      setExportStatus({ type: "XLSX", success: true, message: "Excel Report downloaded successfully" });
    } catch (err) {
      console.error(err);
      setExportStatus({ type: "XLSX", success: false, message: "Unable to generate report. Please try again." });
    } finally {
      setExporting(null);
    }
  };

  // Trigger Client PDF Export
  const handleExportPDF = async () => {
    if (!data) return;
    setExporting("PDF");
    setExportStatus(null);
    try {
      const doc = new jsPDF() as unknown as ExtendedjsPDF;

      // Style config
      doc.setFont("Helvetica");

      // Title & Header
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39); // Slate-900
      doc.text("PLANET CINEMA", 14, 20);
      
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text("Executive Performance Report", 14, 27);

      // Metadata Box
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Period: ${data.period.startDate} to ${data.period.endDate}`, 14, 37);
      doc.text(`Generated: ${data.generatedAt}`, 14, 42);
      doc.text(`Sources: Platform: AVAILABLE | Ticketing: ${data.dataSources.ticketing} | Concession: ${data.dataSources.concession}`, 14, 47);

      // Line separator
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 52, 196, 52);

      // Summary Table (KPIs)
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text("Executive KPI Summary", 14, 60);

      const summaryTableData = [
        ["Total Revenue", formatRupiah(data.summary.totalRevenue), data.summary.revenueChange ? `${data.summary.revenueChange}%` : "0%"],
        ["Ticketing Revenue", formatRupiah(data.summary.ticketingRevenue), "N/A"],
        ["Concession Revenue", formatRupiah(data.summary.concessionRevenue), "N/A"],
        ["Total Transactions", formatNumber(data.summary.totalTransactions), data.summary.transactionChange ? `${data.summary.transactionChange}%` : "0%"],
        ["Tickets Sold", formatNumber(data.summary.ticketsSold), "N/A"],
        ["Concession Items Sold", formatNumber(data.summary.concessionItemsSold), "N/A"],
        ["Average Transaction Value", formatRupiah(data.summary.averageTransactionValue), "N/A"],
      ];

      doc.autoTable({
        startY: 65,
        head: [["Metric Key", "Performance Value", "Period Delta"]],
        body: summaryTableData,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
        styles: { fontSize: 9 },
      });

      // Daily Trend Breakdown (Next Page or below)
      const nextY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.text("Daily Performance Trend", 14, nextY);

      const dailyTableData = data.dailyTrend.map((d) => [
        d.date,
        formatRupiah(d.totalRevenue),
        formatRupiah(d.ticketingRevenue),
        formatRupiah(d.concessionRevenue),
        formatNumber(d.totalTransactions),
        formatNumber(d.ticketsSold),
      ]);

      doc.autoTable({
        startY: nextY + 5,
        head: [["Date", "Total Revenue", "Ticketing", "Concession", "Transactions", "Tickets"]],
        body: dailyTableData,
        theme: "grid",
        headStyles: { fillColor: [51, 65, 85] }, // Slate-700
        styles: { fontSize: 8 },
      });

      doc.save(`Planet_Cinema_Report_${data.period.startDate}_to_${data.period.endDate}.pdf`);

      // Call API purely to record audit log
      await logExport({
        format: "PDF",
        startDate: data.period.startDate,
        endDate: data.period.endDate,
      }).unwrap();

      setExportStatus({ type: "PDF", success: true, message: "PDF Report downloaded successfully" });
    } catch (err) {
      console.error(err);
      setExportStatus({ type: "PDF", success: false, message: "Unable to generate report. Please try again." });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100">Executive Report Center</h1>
          <p className="text-sm text-slate-400">Generate consolidated business performance reviews for management</p>
        </div>

        {/* Date Selector controls */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-1.5 border border-slate-800 rounded-lg">
          {["today", "yesterday", "7d", "30d", "month", "custom"].map((type) => (
            <button
              key={type}
              onClick={() => {
                setRangeType(type);
                setExportStatus(null);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition capitalize ${
                rangeType === type ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {type === "7d" ? "7 Days" : type === "30d" ? "30 Days" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Custom range date-picker inputs */}
      {rangeType === "custom" && (
        <div className="flex flex-wrap items-center gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setExportStatus(null);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setExportStatus(null);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 ml-4">
            <input
              type="checkbox"
              id="compareToggle"
              checked={compare}
              onChange={(e) => {
                setCompare(e.target.checked);
                setExportStatus(null);
              }}
              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="compareToggle" className="text-xs text-slate-300 font-medium cursor-pointer select-none">
              Compare to previous period
            </label>
          </div>
        </div>
      )}

      {/* Export status banner */}
      {exportStatus && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          exportStatus.success 
            ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400" 
            : "bg-rose-950/20 border-rose-900/50 text-rose-400"
        }`}>
          {exportStatus.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-xs font-semibold">{exportStatus.message}</span>
        </div>
      )}

      {/* Offline indicators warnings */}
      {data && (data.dataSources.ticketing === "UNAVAILABLE" || data.dataSources.concession === "UNAVAILABLE") && (
        <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-900/60 p-4 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-400">Partial Downstream Outage</h4>
            <p className="text-xs text-amber-500 mt-0.5">
              Downstream transaction telemetry source is currently offline. Generation lists show partial analytics matching online gateways.
            </p>
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      {data && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Showing preview for currently selected period: <strong>{data.period.startDate} to {data.period.endDate}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 transition text-xs font-bold rounded-lg cursor-pointer"
            >
              {exporting === "CSV" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Export CSV
            </button>
            <button
              onClick={handleExportXLSX}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 transition text-xs font-bold rounded-lg cursor-pointer"
            >
              {exporting === "XLSX" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition text-xs font-bold rounded-lg cursor-pointer"
            >
              {exporting === "PDF" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Export PDF
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-5 h-28 animate-pulse flex flex-col justify-between">
              <div className="w-1/3 h-4 bg-slate-800 rounded"></div>
              <div className="w-2/3 h-7 bg-slate-800 rounded"></div>
              <div className="w-1/2 h-3 bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-rose-950/20 border border-rose-900/50 p-8 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-100">Unable to generate report</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            The platform dashboard service is temporarily unavailable or returned a server validation error.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 transition text-xs font-semibold rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main KPI Stats Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Revenue */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold">Total Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-black tracking-tight text-slate-100">
                {formatRupiah(data.summary.totalRevenue)}
              </div>
              {compare && data.summary.revenueChange !== null && (
                <div className={`flex items-center gap-1 text-xs mt-1.5 font-bold ${
                  data.summary.revenueChange >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {data.summary.revenueChange >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {data.summary.revenueChange >= 0 ? "+" : ""}
                  {data.summary.revenueChange}%
                  <span className="text-slate-500 font-normal">vs prev period</span>
                </div>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold">Transactions</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-black tracking-tight text-slate-100">
                {formatNumber(data.summary.totalTransactions)}
              </div>
              {compare && data.summary.transactionChange !== null && (
                <div className={`flex items-center gap-1 text-xs mt-1.5 font-bold ${
                  data.summary.transactionChange >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {data.summary.transactionChange >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {data.summary.transactionChange >= 0 ? "+" : ""}
                  {data.summary.transactionChange}%
                  <span className="text-slate-500 font-normal">vs prev period</span>
                </div>
              )}
            </div>
          </div>

          {/* Tickets Sold */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold">Tickets Sold</span>
              <Ticket className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-black tracking-tight text-slate-100">
                {formatNumber(data.summary.ticketsSold)}
              </div>
            </div>
          </div>

          {/* Avg Transaction Value */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold">Avg Ticket / Order Value</span>
              <ShoppingBag className="w-4 h-4 text-pink-500" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg font-black tracking-tight text-slate-100">
                {formatRupiah(data.summary.averageTransactionValue)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive visualizer previews */}
      {data && data.summary.totalRevenue !== 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueTrendChart data={mappedDaily} />
          </div>
          <div>
            <RevenueContributionChart 
              ticketingRevenue={data.summary.ticketingRevenue || 0} 
              concessionRevenue={data.summary.concessionRevenue || 0} 
            />
          </div>
          <div className="lg:col-span-3">
            <TransactionVolumeChart data={mappedDaily} />
          </div>
        </div>
      )}

      {/* Detailed records table */}
      {data && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Daily Performance Records</h3>
              <p className="text-xs text-slate-400 font-medium">Consolidated daily breakdown of sales and volume variables</p>
            </div>
            <span className="text-xs text-slate-500 font-bold">{data.dailyTrend.length} Days</span>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/30">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Ticketing</th>
                  <th className="py-3 px-4 text-right">Concession</th>
                  <th className="py-3 px-4 text-right">Transactions</th>
                  <th className="py-3 px-4 text-right">Tickets</th>
                  <th className="py-3 px-4 text-right">F&B Items</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyTrend.map((d) => (
                  <tr key={d.date} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors text-slate-300">
                    <td className="py-3 px-4 font-mono font-medium">{d.date}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400">{formatRupiah(d.totalRevenue)}</td>
                    <td className="py-3 px-4 text-right">{formatRupiah(d.ticketingRevenue)}</td>
                    <td className="py-3 px-4 text-right">{formatRupiah(d.concessionRevenue)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatNumber(d.totalTransactions)}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(d.ticketsSold)}</td>
                    <td className="py-3 px-4 text-right">{formatNumber(d.concessionItemsSold)}</td>
                  </tr>
                ))}
                {data.dailyTrend.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500 italic">No daily performance trend rows located.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
