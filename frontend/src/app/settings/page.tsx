"use client";

import React, { useState, useMemo } from "react";
import { useGetSettingsQuery, AppSetting } from "@/lib/api/settingsApi";
import { useListAuditLogsQuery } from "@/lib/api/auditLogsApi";
import {
  Settings,
  Search,
  Cpu,
  History,
  Loader2,
  RefreshCw,
  Sliders
} from "lucide-react";
import Link from "next/link";
import SettingsCategoryChart from "@/components/settings/SettingsCategoryChart";
import SettingsTimelineChart from "@/components/settings/SettingsTimelineChart";

export default function SettingsCenterDashboard() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState("");
  const limit = 10;

  // Retrieve settings
  const {
    data: settingsResponse,
    isLoading: settingsLoading,
    refetch: refetchSettings
  } = useGetSettingsQuery({
    page,
    limit,
    search: search || undefined,
    category: category || undefined,
    scope: scope || undefined,
  });

  // Retrieve audit logs for timeline visualizer
  const { data: auditResponse, isLoading: auditLoading } = useListAuditLogsQuery({
    page: 1,
    limit: 50,
  });

  const rawSettings = settingsResponse?.data;
  const settings: AppSetting[] = useMemo(() => (rawSettings as AppSetting[]) || [], [rawSettings]);
  const pagination = settingsResponse?.meta;

  const rawAudits = auditResponse?.data;
  const auditLogs = useMemo(() => rawAudits || [], [rawAudits]);

  // Categorize for D3 distribution
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    settings.forEach((s: AppSetting) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return Object.keys(counts).map(cat => ({
      category: cat,
      count: counts[cat],
    }));
  }, [settings]);

  // Aggregate audit log timeline daily distribution data
  const timelineChartData = useMemo(() => {
    const dailyCounts: Record<string, number> = {};
    const configAudits = auditLogs.filter(log => log.action.includes("SETTING") || log.action === "SETTINGS_UPDATED");
    
    configAudits.forEach(log => {
      const dateStr = log.createdAt.split("T")[0];
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
    });

    const dates = Object.keys(dailyCounts).sort();
    if (dates.length === 0) {
      return [];
    }
    return dates.map(d => ({
      date: new Date(d),
      count: dailyCounts[d],
    }));
  }, [auditLogs]);

  const handleRefresh = () => {
    refetchSettings();
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
            <Sliders className="w-7 h-7 text-indigo-500" />
            Governance & Configuration Control Center
          </h1>
          <p className="text-sm text-slate-400">Centrally govern global system settings, overrides, and security policies</p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition text-xs font-bold rounded-lg cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Configuration List
        </button>
      </div>

      {/* KPI Overviews Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Settings</span>
            <span className="text-2xl font-black text-slate-100">{pagination?.total || settings.length}</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Feature Flags</span>
            <span className="text-2xl font-black text-slate-100">
              {settings.filter(s => s.category === "FEATURE" && s.value === "true").length}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Recent System Audits</span>
            <span className="text-2xl font-black text-slate-100">{auditLogs.length}</span>
          </div>
        </div>
      </div>

      {/* Visualization Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl">
          <h3 className="text-xs uppercase tracking-wider font-black text-slate-400 mb-3">Categories Distribution</h3>
          {settingsLoading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : categoryChartData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-500">No category data loaded.</div>
          ) : (
            <SettingsCategoryChart data={categoryChartData} />
          )}
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl">
          <h3 className="text-xs uppercase tracking-wider font-black text-slate-400 mb-3">Audit Modification Timeline</h3>
          {auditLoading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : (
            <SettingsTimelineChart data={timelineChartData} />
          )}
        </div>
      </div>

      {/* Settings Grid List */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
        {/* Controls and filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category select filter */}
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="GENERAL">General</option>
              <option value="SECURITY">Security</option>
              <option value="SESSION">Sessions</option>
              <option value="APPLICATION">Applications</option>
              <option value="FEATURE">Feature flags</option>
              <option value="GOVERNANCE">Governance</option>
            </select>

            {/* Scope select filter */}
            <select
              value={scope}
              onChange={(e) => { setScope(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Scopes</option>
              <option value="GLOBAL">Global Defaults</option>
              <option value="APPLICATION">Applications Overrides</option>
              <option value="ORGANIZATION">Organizations Overrides</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search settings..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 w-full text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Configurations Table Grid */}
        {settingsLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : settings.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs font-semibold">
            No configurations keys found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3 px-4">Config Key</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Effective Value</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Configure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {settings.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/10 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">{s.key}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded text-indigo-400 border border-slate-800">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-400 text-[10px]">
                      {s.scope} {s.scopeId ? `(${s.scopeId})` : ""}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {s.isSensitive ? (
                        <span className="text-slate-500 tracking-wider">••••••••</span>
                      ) : (
                        s.value
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 truncate max-w-xs">{s.description || "N/A"}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/settings/${s.key}`}
                        className="px-3 py-1 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition rounded text-[10px] font-black text-indigo-400 uppercase tracking-wider"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-5 mt-5">
            <span className="text-xs text-slate-400">Page {page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 disabled:opacity-50 text-xs rounded text-slate-200 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 disabled:opacity-50 text-xs rounded text-slate-200 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
