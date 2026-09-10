"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  useGetDashboardAlertsQuery,
  useGetDashboardAlertSummaryQuery,
  useAcknowledgeDashboardAlertMutation,
  useResolveDashboardAlertMutation,
  ExecutiveAlert
} from "@/lib/api/dashboardApi";
import {
  AlertTriangle,
  CheckCircle2,
  Activity,
  User,
  Shield,
  FileText,
  Search,
  RefreshCw,
  Eye,
  Loader2,
  Calendar,
  Building,
  Tv
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import * as d3 from "d3";

export default function AlertsPage() {
  // Filter States
  const [status, setStatus] = useState<string>("OPEN");
  const [severity, setSeverity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  // Selected Alert for Details Drawer
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Queries
  const { 
    data: alertsResponse, 
    isLoading: alertsLoading, 
    isError: alertsError, 
    refetch: refetchAlerts 
  } = useGetDashboardAlertsQuery({
    page,
    limit,
    status: status || undefined,
    severity: severity || undefined,
    category: category || undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const {
    data: summaryResponse,
    isLoading: summaryLoading,
    refetch: refetchSummary
  } = useGetDashboardAlertSummaryQuery();

  const [acknowledgeAlert, { isLoading: ackLoading }] = useAcknowledgeDashboardAlertMutation();
  const [resolveAlert, { isLoading: resolveLoading }] = useResolveDashboardAlertMutation();

  const alerts = useMemo(() => alertsResponse?.data || [], [alertsResponse]);
  const pagination = alertsResponse?.meta;
  const summary = summaryResponse?.data;

  // Refetch Action
  const handleRefresh = () => {
    refetchAlerts();
    refetchSummary();
  };

  // Find selected alert full detail
  const selectedAlert = useMemo(() => {
    if (!selectedAlertId) return null;
    return alerts.find(a => a.id === selectedAlertId);
  }, [selectedAlertId, alerts]);

  // Recommended action determinism helper
  const getActionRecommendation = (alert: ExecutiveAlert) => {
    if (alert.fingerprint.includes("TICKETING:UNAVAILABLE")) {
      return "Check Ticketing backend availability and internal API connectivity.";
    }
    if (alert.fingerprint.includes("CONCESSION:UNAVAILABLE")) {
      return "Check Concession backend availability and internal API connectivity.";
    }
    if (alert.category === "BUSINESS") {
      return "Open Executive Analytics and compare the affected period.";
    }
    if (alert.fingerprint.includes("USER_DISABLED") || alert.fingerprint.includes("ROLE_CHANGED")) {
      return "Review the affected user's access configuration.";
    }
    if (alert.fingerprint.includes("ORGANIZATION_DISABLED")) {
      return "Review the organization config status in Platform settings.";
    }
    if (alert.fingerprint.includes("APPLICATION_DISABLED")) {
      return "Review the application availability and permission configurations.";
    }
    return "Review incident parameters and affected context.";
  };

  // Handle mutations
  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id).unwrap();
      refetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id).unwrap();
      refetchSummary();
    } catch (err) {
      console.error(err);
    }
  };

  // Determine system statuses based on active system alerts
  const systemsStatus = useMemo(() => {
    const activeAlerts = alerts.filter(a => a.status !== "RESOLVED");
    const ticketingDown = activeAlerts.some(a => a.fingerprint === "SYSTEM:TICKETING:UNAVAILABLE");
    const concessionDown = activeAlerts.some(a => a.fingerprint === "SYSTEM:CONCESSION:UNAVAILABLE");
    return {
      platform: "Healthy",
      ticketing: ticketingDown ? "Offline" : "Online",
      concession: concessionDown ? "Offline" : "Online",
    };
  }, [alerts]);

  // D3 Chart Ref & D3 Render logic
  const d3Container = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!summary || !d3Container.current) return;

    // Clear previous SVG contents
    d3.select(d3Container.current).selectAll("*").remove();

    const chartData = [
      { name: "CRITICAL", value: summary.critical || 0, color: "#ef4444" },
      { name: "HIGH", value: summary.high || 0, color: "#f97316" },
      { name: "MEDIUM", value: summary.medium || 0, color: "#eab308" },
      { name: "LOW", value: summary.low || 0, color: "#3b82f6" },
      { name: "INFO", value: summary.info || 0, color: "#6b7280" }
    ];

    const margin = { top: 20, right: 30, bottom: 40, left: 90 };
    const width = 450 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const svg = d3.select(d3Container.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.value) || 5])
      .range([0, width]);

    const y = d3.scaleBand()
      .range([0, height])
      .domain(chartData.map(d => d.name))
      .padding(.2);

    svg.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .attr("color", "#94a3b8")
      .selectAll("text")
      .style("font-size", "10px")
      .style("font-weight", "bold");

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-height))
      .attr("color", "#334155")
      .selectAll("text")
      .style("font-size", "9px")
      .attr("color", "#64748b");

    svg.selectAll("rect")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("x", x(0))
      .attr("y", d => y(d.name) || 0)
      .attr("width", d => x(d.value))
      .attr("height", y.bandwidth())
      .attr("fill", d => d.color)
      .attr("rx", 3);

  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
            Executive Alert & Monitoring Center
          </h1>
          <p className="text-sm text-slate-400">Monitor cinema infrastructure health and administrative access policies</p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition text-xs font-bold rounded-lg cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Sweep
        </button>
      </div>

      {/* System Status and D3 charts widgets row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Systems Health Check status card */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Downstream Gateways</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Platform Core</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {systemsStatus.platform}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Ticketing API Gateway</span>
                <span className={`flex items-center gap-1.5 text-xs font-bold ${
                  systemsStatus.ticketing === "Online" ? "text-emerald-400" : "text-rose-500"
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    systemsStatus.ticketing === "Online" ? "bg-emerald-500" : "bg-rose-500"
                  }`}></span>
                  {systemsStatus.ticketing}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Concession API Gateway</span>
                <span className={`flex items-center gap-1.5 text-xs font-bold ${
                  systemsStatus.concession === "Online" ? "text-emerald-400" : "text-rose-500"
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    systemsStatus.concession === "Online" ? "bg-emerald-500" : "bg-rose-500"
                  }`}></span>
                  {systemsStatus.concession}
                </span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-4 font-semibold italic">
            Automated sweeps poll API links and record latency logs.
          </div>
        </div>

        {/* D3 chart visualization */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-sm lg:col-span-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Severity Distribution</h3>
          {summaryLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <svg ref={d3Container} className="mx-auto md:mx-0"></svg>
              {summary && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-semibold text-slate-300 mx-auto md:mx-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
                    <span>Critical: {summary.critical}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-orange-500"></span>
                    <span>High: {summary.high}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-yellow-500"></span>
                    <span>Medium: {summary.medium}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500"></span>
                    <span>Low: {summary.low}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-gray-500"></span>
                    <span>Info: {summary.info}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Resolved: {summary.resolved}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Primary KPI overview counts */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Active Open Alerts</span>
            <div className="text-xl font-black text-slate-100 mt-1">{summary.open}</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Acknowledged</span>
            <div className="text-xl font-black text-slate-100 mt-1">{summary.acknowledged}</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Critical Outages</span>
            <div className="text-xl font-black text-rose-500 mt-1">{summary.critical}</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total System Events</span>
            <div className="text-xl font-black text-slate-100 mt-1">{summary.total}</div>
          </div>
        </div>
      )}

      {/* Main Alerts Filters and Table list */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status filters */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
              {["OPEN", "ACKNOWLEDGED", "RESOLVED"].map(st => (
                <button
                  key={st}
                  onClick={() => { setStatus(st); setPage(1); }}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition ${
                    status === st ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Severity filter */}
            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>

            {/* Category filter */}
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="SYSTEM">System</option>
              <option value="BUSINESS">Business</option>
              <option value="SECURITY">Security</option>
              <option value="OPERATIONAL">Operational</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search alert title/desc..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 w-full text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Date Filters optional */}
        <div className="flex flex-wrap items-center gap-4 text-xs mb-4">
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-medium">Dari:</span>
            <DatePicker
              value={startDate}
              onChange={(val) => { setStartDate(val); setPage(1); }}
              size="sm"
              placeholder="Mulai..."
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-medium">Sampai:</span>
            <DatePicker
              value={endDate}
              onChange={(val) => { setEndDate(val); setPage(1); }}
              size="sm"
              placeholder="Sampai..."
              className="w-36"
            />
          </div>
        </div>

        {/* Alerts Grid list */}
        {alertsLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : alertsError ? (
          <div className="py-10 text-center text-rose-500 font-semibold text-xs">
            Failed to query Platform Executive Alert center records. Please refresh retry.
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-slate-950/20 border border-slate-900/50 rounded-xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-slate-200 font-bold text-sm">All Systems Healthy</h4>
            <p className="text-xs text-slate-500">No active alerts match current monitoring sweep filters.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {alerts.map((alert) => {
              let categoryIcon = <Activity className="w-4 h-4" />;
              if (alert.category === "SECURITY") categoryIcon = <Shield className="w-4 h-4" />;
              if (alert.category === "BUSINESS") categoryIcon = <FileText className="w-4 h-4" />;
              if (alert.category === "OPERATIONAL") categoryIcon = <User className="w-4 h-4" />;

              let severityColor = "bg-slate-800/80 border-slate-700 text-slate-300";
              if (alert.severity === "CRITICAL") severityColor = "bg-rose-950/20 border-rose-900/50 text-rose-400";
              if (alert.severity === "HIGH") severityColor = "bg-orange-950/20 border-orange-900/50 text-orange-400";
              if (alert.severity === "MEDIUM") severityColor = "bg-yellow-950/20 border-yellow-900/50 text-yellow-400";
              if (alert.severity === "LOW") severityColor = "bg-blue-950/20 border-blue-900/50 text-blue-400";

              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlertId(alert.id)}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl hover:bg-slate-800/20 transition-all cursor-pointer ${severityColor}`}
                >
                  <div className="flex items-start gap-3.5">
                    <span className="mt-0.5 shrink-0 bg-slate-950/40 p-2 rounded-lg">{categoryIcon}</span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs font-black text-slate-100">{alert.title}</h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-950/60 px-2 py-0.5 rounded-full text-slate-400">
                          {alert.category}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          alert.status === "OPEN" ? "bg-rose-600/30 text-rose-400" :
                          alert.status === "ACKNOWLEDGED" ? "bg-amber-600/30 text-amber-400" :
                          "bg-emerald-600/30 text-emerald-400"
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">{alert.description}</p>
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 pt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Detected: {new Date(alert.detectedAt).toLocaleString("id-ID", { hour12: false })}
                        {alert.resolvedAt && (
                          <span className="text-emerald-500">• Resolved: {new Date(alert.resolvedAt).toLocaleString("id-ID", { hour12: false })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 md:mt-0 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlertId(alert.id);
                      }}
                      className="p-1.5 bg-slate-950/50 hover:bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
                      title="Inspect Alert details drawer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {alert.status === "OPEN" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcknowledge(alert.id);
                        }}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wide rounded-lg transition"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status !== "RESOLVED" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(alert.id);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wide rounded-lg transition"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination buttons */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-5 mt-5">
            <span className="text-xs text-slate-400">Page {page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 disabled:opacity-50 text-xs rounded text-slate-200"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 disabled:opacity-50 text-xs rounded text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details drawer dialog modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 shadow-2xl overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            {/* Title Drawer */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  selectedAlert.severity === "CRITICAL" ? "bg-rose-950 text-rose-400" :
                  selectedAlert.severity === "HIGH" ? "bg-orange-950 text-orange-400" :
                  "bg-yellow-950 text-yellow-400"
                }`}>
                  {selectedAlert.severity} Severity
                </span>
                <h2 className="text-base font-black text-slate-100 mt-2">{selectedAlert.title}</h2>
              </div>
              <button
                onClick={() => setSelectedAlertId(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 bg-slate-950/50 hover:bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Alert attributes list */}
            <div className="space-y-4 text-xs font-semibold text-slate-300">
              <div className="grid grid-cols-2 border-b border-slate-800/50 pb-2.5">
                <span className="text-slate-500">Category:</span>
                <span className="text-right text-slate-200 capitalize">{selectedAlert.category.toLowerCase()}</span>
              </div>
              <div className="grid grid-cols-2 border-b border-slate-800/50 pb-2.5">
                <span className="text-slate-500">Source Service:</span>
                <span className="text-right text-slate-200">{selectedAlert.source}</span>
              </div>
              <div className="grid grid-cols-2 border-b border-slate-800/50 pb-2.5">
                <span className="text-slate-500">Current status:</span>
                <span className="text-right text-slate-200">{selectedAlert.status}</span>
              </div>
              <div className="grid grid-cols-2 border-b border-slate-800/50 pb-2.5">
                <span className="text-slate-500">Detected:</span>
                <span className="text-right text-slate-400 font-mono text-[10px]">
                  {new Date(selectedAlert.detectedAt).toLocaleString("id-ID", { hour12: false })}
                </span>
              </div>
            </div>

            {/* Impact description block */}
            <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-xl space-y-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Incident Details</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">{selectedAlert.description}</p>
            </div>

            {/* Deterministic Recommended action */}
            <div className="bg-indigo-950/20 border border-indigo-900/30 p-4 rounded-xl space-y-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">Recommended action</h4>
              <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                {getActionRecommendation(selectedAlert)}
              </p>
            </div>

            {/* Quick action shortcuts */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">Quick Incident Shortcuts</h4>
              <div className="grid grid-cols-2 gap-3.5">
                <Link
                  href="/dashboard/analytics"
                  className="flex items-center gap-1.5 justify-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold rounded-lg border border-slate-700 text-center"
                >
                  <Activity className="w-3.5 h-3.5" />
                  View Analytics
                </Link>
                <Link
                  href="/applications"
                  className="flex items-center gap-1.5 justify-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold rounded-lg border border-slate-700 text-center"
                >
                  <Tv className="w-3.5 h-3.5" />
                  Applications List
                </Link>
                <Link
                  href="/organizations"
                  className="flex items-center gap-1.5 justify-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold rounded-lg border border-slate-700 text-center"
                >
                  <Building className="w-3.5 h-3.5" />
                  Organizations
                </Link>
                <Link
                  href="/users"
                  className="flex items-center gap-1.5 justify-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold rounded-lg border border-slate-700 text-center"
                >
                  <User className="w-3.5 h-3.5" />
                  View Users
                </Link>
              </div>
            </div>

            {/* Resolve or Acknowledge Drawer Actions */}
            <div className="flex items-center gap-3 pt-6 border-t border-slate-800">
              {selectedAlert.status === "OPEN" && (
                <button
                  disabled={ackLoading}
                  onClick={() => handleAcknowledge(selectedAlert.id)}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase rounded-lg transition disabled:opacity-50 cursor-pointer text-center"
                >
                  {ackLoading ? "Updating..." : "Acknowledge"}
                </button>
              )}
              {selectedAlert.status !== "RESOLVED" && (
                <button
                  disabled={resolveLoading}
                  onClick={() => handleResolve(selectedAlert.id)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-lg transition disabled:opacity-50 cursor-pointer text-center"
                >
                  {resolveLoading ? "Resolving..." : "Resolve Incident"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
