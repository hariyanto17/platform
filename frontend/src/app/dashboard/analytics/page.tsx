"use client";

import React, { useState, useMemo } from "react";
import { 
  useGetDashboardAnalyticsQuery
} from "@/lib/api/dashboardApi";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { TransactionVolumeChart } from "@/components/analytics/TransactionVolumeChart";
import { RevenueContributionChart } from "@/components/analytics/RevenueContributionChart";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Activity, 
  ShoppingBag, 
  Ticket, 
  DollarSign, 
  AlertTriangle 
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";

export default function AnalyticsPage() {
  const [rangeType, setRangeType] = useState<string>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [compare, setCompare] = useState<boolean>(true);

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

  const { data: response, isLoading, isError, refetch } = useGetDashboardAnalyticsQuery(
    { startDate, endDate, compare },
    { skip: rangeType === "custom" && (!customStart || !customEnd) }
  );

  const data = response?.data;

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

  // Compile Top Days
  const topDays = useMemo(() => {
    if (!data || !data.daily) return [];
    return [...data.daily]
      .filter((d) => d.revenue.total !== null)
      .sort((a, b) => (b.revenue.total || 0) - (a.revenue.total || 0))
      .slice(0, 3);
  }, [data]);

  // Compute Deterministic Insights
  const insights = useMemo(() => {
    if (!data) return [];
    const list: string[] = [];

    const summary = data.summary;
    const ticketing = data.applications.ticketing;
    const concession = data.applications.concession;

    if (summary.revenueChange !== null) {
      if (summary.revenueChange > 0) {
        list.push(`Total revenue increased by ${summary.revenueChange}% compared to the previous period.`);
      } else if (summary.revenueChange < 0) {
        list.push(`Total revenue decreased by ${Math.abs(summary.revenueChange)}% compared to the previous period.`);
      }
    }

    if (ticketing.revenue !== null && concession.revenue !== null) {
      if (ticketing.revenue > concession.revenue) {
        const share = Math.round((ticketing.revenue / (ticketing.revenue + concession.revenue)) * 100);
        list.push(`Ticketing was the main revenue channel, contributing ${share}% of total earnings.`);
      } else if (concession.revenue > ticketing.revenue) {
        const share = Math.round((concession.revenue / (ticketing.revenue + concession.revenue)) * 100);
        list.push(`Concession was the primary channel, contributing ${share}% of total earnings.`);
      }
    }

    if (summary.transactionsChange !== null && summary.transactionsChange > 0) {
      list.push(`Transaction volume saw a positive growth trend of +${summary.transactionsChange}% this period.`);
    }

    if (topDays.length > 0 && topDays[0].revenue.total !== null) {
      const topDate = new Date(topDays[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      list.push(`Peak sales performance occurred on ${topDate} with a total revenue of ${formatRupiah(topDays[0].revenue.total)}.`);
    }

    return list;
  }, [data, topDays]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100">Executive Analytics</h1>
          <p className="text-sm text-slate-400">Cross-application financial intelligence & operations insights</p>
        </div>

        {/* Date Selector controls */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-1.5 border border-slate-800 rounded-lg">
          <button
            onClick={() => setRangeType("today")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              rangeType === "today" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setRangeType("yesterday")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              rangeType === "yesterday" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => setRangeType("7d")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              rangeType === "7d" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setRangeType("30d")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              rangeType === "30d" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setRangeType("month")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              rangeType === "month" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setRangeType("custom")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              rangeType === "custom" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Custom range date-picker inputs */}
      {rangeType === "custom" && (
        <div className="flex flex-wrap items-center gap-4 bg-surface-secondary/60 border border-border p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Tanggal Mulai:</span>
            <DatePicker
              value={customStart}
              onChange={(val) => setCustomStart(val)}
              size="sm"
              placeholder="Pilih tanggal mulai..."
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Tanggal Akhir:</span>
            <DatePicker
              value={customEnd}
              onChange={(val) => setCustomEnd(val)}
              size="sm"
              placeholder="Pilih tanggal akhir..."
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2 ml-2">
            <input
              type="checkbox"
              id="compareToggle"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="compareToggle" className="text-xs text-slate-300 font-medium cursor-pointer select-none">
              Compare to previous period
            </label>
          </div>
        </div>
      )}

      {/* Offline indicators warnings */}
      {data && (data.sources.ticketing === "UNAVAILABLE" || data.sources.concession === "UNAVAILABLE") && (
        <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-900/60 p-4 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-400">Partial Offline Telemetry</h4>
            <p className="text-xs text-amber-500 mt-0.5">
              Downstream transaction telemetry source is currently unavailable. Combined statistics show only available channel datasets.
            </p>
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
          <h3 className="text-base font-bold text-slate-100">Unable to load analytics</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            The platform dashboard service is temporarily unavailable or returned a server exception.
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
                {formatRupiah(data.summary.revenue)}
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
                {formatNumber(data.summary.transactions)}
              </div>
              {compare && data.summary.transactionsChange !== null && (
                <div className={`flex items-center gap-1 text-xs mt-1.5 font-bold ${
                  data.summary.transactionsChange >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {data.summary.transactionsChange >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {data.summary.transactionsChange >= 0 ? "+" : ""}
                  {data.summary.transactionsChange}%
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
              {compare && data.summary.ticketsSoldChange !== null && (
                <div className={`flex items-center gap-1 text-xs mt-1.5 font-bold ${
                  data.summary.ticketsSoldChange >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {data.summary.ticketsSoldChange >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {data.summary.ticketsSoldChange >= 0 ? "+" : ""}
                  {data.summary.ticketsSoldChange}%
                  <span className="text-slate-500 font-normal">vs prev period</span>
                </div>
              )}
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
              {compare && data.summary.averageTransactionValueChange !== null && (
                <div className={`flex items-center gap-1 text-xs mt-1.5 font-bold ${
                  data.summary.averageTransactionValueChange >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {data.summary.averageTransactionValueChange >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {data.summary.averageTransactionValueChange >= 0 ? "+" : ""}
                  {data.summary.averageTransactionValueChange}%
                  <span className="text-slate-500 font-normal">vs prev period</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty dataset warning */}
      {data && data.summary.revenue === 0 && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-200">No transaction data available</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            There are no ticketing or concession transactions recorded for the selected dates.
          </p>
        </div>
      )}

      {/* Charts Grid */}
      {data && data.summary.revenue !== 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueTrendChart data={data.daily} />
          </div>
          <div>
            <RevenueContributionChart 
              ticketingRevenue={data.applications.ticketing.revenue || 0} 
              concessionRevenue={data.applications.concession.revenue || 0} 
            />
          </div>
          <div className="lg:col-span-3">
            <TransactionVolumeChart data={data.daily} />
          </div>
        </div>
      )}

      {/* Bottom Insights & Top Days Row */}
      {data && data.summary.revenue !== 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Insights card */}
          <div className="md:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Executive Business Insights
            </h3>
            <ul className="space-y-3 text-xs text-slate-300">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5"></span>
                  <span>{insight}</span>
                </li>
              ))}
              {insights.length === 0 && (
                <li className="text-slate-500 italic">Not enough historical baseline to compute insights.</li>
              )}
            </ul>
          </div>

          {/* Top Performance & Sources */}
          <div className="flex flex-col gap-6">
            {/* Top performing days */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm flex-1">
              <h3 className="text-sm font-bold text-slate-100 mb-3">Top Revenue Days</h3>
              <div className="space-y-2">
                {topDays.map((d, idx) => (
                  <div key={d.date} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-400">
                      {idx + 1}. {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="font-bold text-slate-200">{formatRupiah(d.revenue.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sources indicator */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-100 mb-3">Data Sources Health</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className={`w-2 h-2 rounded-full ${
                      data.sources.ticketing === "AVAILABLE" ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                    }`}></span>
                    Ticketing Gateway
                  </span>
                  <span className={`font-semibold ${
                    data.sources.ticketing === "AVAILABLE" ? "text-emerald-500" : "text-rose-500 font-bold"
                  }`}>{data.sources.ticketing}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className={`w-2 h-2 rounded-full ${
                      data.sources.concession === "AVAILABLE" ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                    }`}></span>
                    Concession Gateway
                  </span>
                  <span className={`font-semibold ${
                    data.sources.concession === "AVAILABLE" ? "text-emerald-500" : "text-rose-500 font-bold"
                  }`}>{data.sources.concession}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
