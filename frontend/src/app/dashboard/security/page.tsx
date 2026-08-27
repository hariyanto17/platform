"use client";

import React, { useState } from "react";
import {
  useGetSecurityOverviewQuery,
  useGetSecurityActivityQuery,
  useGetSecurityActivityDetailQuery
} from "@/lib/api/dashboardApi";
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  Loader2,
  ExternalLink
} from "lucide-react";
import SecurityActivityChart from "@/components/security/SecurityActivityChart";
import SecuritySeverityChart from "@/components/security/SecuritySeverityChart";
import { DatePicker } from "@/components/ui/DatePicker";

export default function SecurityCompliancePage() {
  // Filters state
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const limit = 10;

  // Selected Activity for Details Investigation Drawer
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Redux telemetry queries
  const {
    data: overviewResponse,
    isLoading: overviewLoading,
    refetch: refetchOverview
  } = useGetSecurityOverviewQuery();

  const {
    data: activityResponse,
    isLoading: activityLoading,
    isError: activityError,
    refetch: refetchActivity
  } = useGetSecurityActivityQuery({
    page,
    limit,
    severity: severity || undefined,
    category: category || undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const {
    data: detailResponse,
    isLoading: detailLoading
  } = useGetSecurityActivityDetailQuery(selectedActivityId || "", {
    skip: !selectedActivityId,
  });

  const overview = overviewResponse?.data;
  const activities = activityResponse?.data || [];
  const pagination = activityResponse?.meta;
  const detail = detailResponse?.data;

  const handleRefresh = () => {
    refetchOverview();
    refetchActivity();
  };

  return (
    <div className="space-y-6">
      {/* Top Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-500" />
            Centralized Security & Governance Compliance
          </h1>
          <p className="text-sm text-slate-400">Governance visibility, administrative audit logging records, and SSO integrity tracking</p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition text-xs font-bold rounded-lg cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sweep System Logs
        </button>
      </div>

      {/* Security Health Hero & D3 distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Health Hero */}
        {overview?.securityScore ? (
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Platform Security Health</span>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  overview.securityScore.status === "HEALTHY" ? "bg-emerald-950 text-emerald-400" :
                  overview.securityScore.status === "WARNING" ? "bg-amber-950 text-amber-400" :
                  "bg-rose-950 text-rose-400"
                }`}>
                  {overview.securityScore.status}
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tight text-slate-100">{overview.securityScore.value}</span>
                <span className="text-xs font-bold text-slate-500">/ 100</span>
              </div>

              {/* Factors list */}
              <div className="mt-6 space-y-3">
                {overview.securityScore.factors.map(f => (
                  <div key={f.key} className="flex items-start justify-between text-[11px] font-semibold border-b border-slate-800/40 pb-2">
                    <span className="text-slate-300">{f.label}</span>
                    <span className={`font-mono font-bold ${f.impact < 0 ? "text-rose-400" : "text-slate-500"}`}>
                      {f.impact === 0 ? "0" : f.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 mt-4 font-semibold italic mt-4">
              Scoring factors analyze authentication rate failures, disabled configurations, and active unresolved alerts.
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        )}

        {/* Dynamic D3 Trends Area Chart */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm">
          <h3 className="text-xs uppercase tracking-wider font-black text-slate-400 mb-3">Security Activity Trend</h3>
          {overviewLoading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : (
            <SecurityActivityChart data={overview?.activityTrend || []} />
          )}
        </div>

        {/* Severity Event Distribution horizontal chart */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm">
          <h3 className="text-xs uppercase tracking-wider font-black text-slate-400 mb-3">Logs Category Breakdown</h3>
          {overviewLoading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : (
            <SecuritySeverityChart data={overview?.eventDistribution || []} />
          )}
        </div>
      </div>

      {/* KPI statistics cards row */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Audit Logs</span>
            <div className="text-lg font-black text-slate-100">{overview.summary.totalEvents}</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Successful Logins</span>
            <div className="text-lg font-black text-slate-100">{overview.summary.successfulLogins}</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-400">Failed Logins</span>
            <div className="text-lg font-black text-rose-500">{overview.summary.failedLogins}</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">SSO launches</span>
            <div className="text-lg font-black text-slate-100">{overview.summary.ssoLaunches}</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-orange-400">Failed SSO</span>
            <div className="text-lg font-black text-orange-500">{overview.summary.failedSsoLaunches}</div>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Access Updates</span>
            <div className="text-lg font-black text-slate-100">{overview.summary.accessChanges}</div>
          </div>
        </div>
      )}

      {/* Main Events List */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        {/* Filters control bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Severity selection */}
            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>

            {/* Category selection */}
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="AUTHENTICATION">Authentication</option>
              <option value="AUTHORIZATION">Authorization</option>
              <option value="SSO">SSO Launches</option>
              <option value="USER_ACCESS">User Access</option>
              <option value="APPLICATION">Applications</option>
              <option value="ORGANIZATION">Organizations</option>
              <option value="ADMINISTRATION">Administration</option>
              <option value="SYSTEM">System</option>
            </select>

            {/* Date selections picker */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted font-medium">Dari:</span>
              <DatePicker
                value={startDate}
                onChange={(val) => { setStartDate(val); setPage(1); }}
                size="sm"
                placeholder="Mulai..."
                className="w-36"
              />
              <span className="text-text-muted font-medium ml-1">Sampai:</span>
              <DatePicker
                value={endDate}
                onChange={(val) => { setEndDate(val); setPage(1); }}
                size="sm"
                placeholder="Sampai..."
                className="w-36"
              />
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search audit action..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 w-full text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Activity Table list */}
        {activityLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : activityError ? (
          <div className="py-10 text-center text-rose-500 font-bold text-xs">
            Failed to query Security Activity log index records.
          </div>
        ) : activities.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs font-semibold">
            No security logs detected matching current audit criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Event/Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {activities.map((act) => {
                  let sevColor = "text-slate-400 bg-slate-950/40 border border-slate-800";
                  if (act.severity === "CRITICAL") sevColor = "text-rose-400 bg-rose-950/20 border border-rose-900/30";
                  if (act.severity === "HIGH") sevColor = "text-orange-400 bg-orange-950/20 border border-orange-900/30";
                  if (act.severity === "MEDIUM") sevColor = "text-yellow-400 bg-yellow-950/20 border border-yellow-900/30";
                  if (act.severity === "LOW") sevColor = "text-blue-400 bg-blue-950/20 border border-blue-900/30";

                  return (
                    <tr
                      key={act.id}
                      onClick={() => setSelectedActivityId(act.id)}
                      className="hover:bg-slate-800/20 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                        {new Date(act.timestamp).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${sevColor}`}>
                          {act.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">{act.eventType}</td>
                      <td className="py-3.5 px-4">{act.user?.email || "System"}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-bold uppercase text-[9px]">{act.category}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActivityId(act.id);
                          }}
                          className="p-1 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded transition text-slate-400 hover:text-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar controls */}
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

      {/* Investigation Correlation details overlay drawer */}
      {selectedActivityId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 shadow-2xl overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded text-indigo-400 border border-slate-800">
                  {detail?.category} Category
                </span>
                <h2 className="text-base font-black text-slate-100 mt-2">{detail?.eventType}</h2>
              </div>
              <button
                onClick={() => setSelectedActivityId(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 bg-slate-950/50 hover:bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : detail && (
              <div className="space-y-6 text-xs font-semibold">
                {/* Event attributes */}
                <div className="space-y-3 bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Severity Ranking:</span>
                    <span className="text-slate-200">{detail.severity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(detail.timestamp).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Actor Email:</span>
                    <span className="text-slate-200">{detail.actor?.email || "System"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IP Address:</span>
                    <span className="text-slate-400 font-mono">{detail.ipAddress}</span>
                  </div>
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">Event Description</h4>
                  <p className="text-slate-300 leading-relaxed bg-slate-950/30 p-3 rounded-lg border border-slate-800/60">
                    {detail.description}
                  </p>
                </div>

                {/* Payload Metadata parsed safety */}
                {detail.metadata && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">Sanitized Metadata Properties</h4>
                    <pre className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-[10px] text-indigo-300 overflow-x-auto font-mono">
                      {JSON.stringify(detail.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Related correlated security events time-bounded */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                    Time-Correlated Events (±15m Window)
                  </h4>
                  {detail.correlatedEvents.length === 0 ? (
                    <p className="text-slate-500 text-[11px] italic">No other related administrative logs found in correlation period.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.correlatedEvents.map(ce => (
                        <div key={ce.id} className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="text-slate-200 font-bold block">{ce.eventType}</span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {new Date(ce.timestamp).toLocaleTimeString("id-ID")}
                            </span>
                          </div>
                          <span className="text-[9px] uppercase font-black text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                            {ce.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Related active ExecutiveAlert integration */}
                {detail.relatedAlert && (
                  <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-rose-400">
                        Correlated Executive Outage Alert
                      </h4>
                    </div>
                    <p className="text-slate-200 text-xs font-bold leading-normal">{detail.relatedAlert.title}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-semibold">
                      <span>Status: {detail.relatedAlert.status}</span>
                      <a
                        href="/dashboard/alerts"
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold"
                      >
                        Navigate to Alerts Center
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
