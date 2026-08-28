"use client";

import React, { useState, useMemo } from "react";
import {
  Gauge,
  Building2,
  Boxes,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Activity,
  Layers,
  Sparkles,
  Search,
  Filter,
  Plus,
  RotateCcw,
  Sliders,
  TrendingUp,
  Clock,
  Zap,
  Info,
  Server,
} from "lucide-react";
import {
  useGetOrganizationQuotasQuery,
  useCheckQuotaMutation,
  useRecordUsageMutation,
  useSetTenantQuotaOverrideMutation,
  useRemoveTenantQuotaOverrideMutation,
  EffectiveQuotaDetail,
  QuotaCheckResult,
} from "@/lib/api/quotasApi";
import { useListOrganizationsQuery, OrganizationItem } from "@/lib/api/organizationsApi";
import { useGetMeQuery } from "@/lib/api/authApi";

export default function QuotasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // User & Tenant selection
  const { data: meRes } = useGetMeQuery();
  const userOrgId = meRes?.data?.organizationId || "";
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const { data: orgsRes } = useListOrganizationsQuery({ page: 1, limit: 100 });
  const organizations: OrganizationItem[] = (
    Array.isArray(orgsRes?.data)
      ? orgsRes.data
      : (orgsRes?.data as any)?.items || []
  );

  const activeOrgId = selectedOrgId || organizations[0]?.id || userOrgId;

  // Quotas Query
  const {
    data: quotaRes,
    isLoading: quotaLoading,
    refetch,
  } = useGetOrganizationQuotasQuery(
    { organizationId: activeOrgId },
    { skip: !activeOrgId }
  );

  // Mutations
  const [checkQuota, { isLoading: checking }] = useCheckQuotaMutation();
  const [recordUsage, { isLoading: recordingUsage }] = useRecordUsageMutation();
  const [setOverride, { isLoading: savingOverride }] = useSetTenantQuotaOverrideMutation();
  const [removeOverride, { isLoading: removingOverride }] = useRemoveTenantQuotaOverrideMutation();

  // Interactive Live Evaluator State
  const [evalResource, setEvalResource] = useState<string>("");
  const [evalAmount, setEvalAmount] = useState<number>(1);
  const [evalResult, setEvalResult] = useState<QuotaCheckResult | null>(null);

  // Modal States: Override
  const [overrideModalResource, setOverrideModalResource] = useState<EffectiveQuotaDetail | null>(null);
  const [overrideQuantity, setOverrideQuantity] = useState<number | string>(10);
  const [overrideIsUnlimited, setOverrideIsUnlimited] = useState<boolean>(false);
  const [overrideMode, setOverrideMode] = useState<"ADD" | "REPLACE">("ADD");
  const [overrideNotes, setOverrideNotes] = useState<string>("");

  // Modal States: Usage Recording
  const [usageModalResource, setUsageModalResource] = useState<EffectiveQuotaDetail | null>(null);
  const [usageQuantity, setUsageQuantity] = useState<number>(1);
  const [usageMode, setUsageMode] = useState<"INCREMENT" | "SET">("INCREMENT");

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Permissions
  const platformAccess = meRes?.data?.access?.find((a) => a.applicationCode === "PLATFORM");
  const permissions = platformAccess?.permissions || [];
  const canManage =
    permissions.includes("platform.quotas.manage") ||
    permissions.includes("platform.organizations.manage");
  const canRecordUsage =
    permissions.includes("platform.quotas.usage.manage") ||
    permissions.includes("platform.quotas.manage");

  const resolved = quotaRes?.data;
  const quotaList = resolved?.quotaList || [];

  // Filtered List
  const filteredQuotas = useMemo(() => {
    return quotaList.filter((q) => {
      const matchesSearch =
        q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.resourceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === "ALL" || q.limitType === typeFilter;
      const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [quotaList, searchTerm, typeFilter, statusFilter]);

  // Live Evaluator Submit
  const handleLiveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalResource || !activeOrgId) return;
    try {
      const res = await checkQuota({
        organizationId: activeOrgId,
        resourceCode: evalResource,
        requestedAmount: Number(evalAmount),
      }).unwrap();
      setEvalResult(res.data);
    } catch (err: any) {
      alert(err?.data?.message || "Failed to evaluate quota check");
    }
  };

  // Override Form Submit
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalResource || !activeOrgId) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      await setOverride({
        organizationId: activeOrgId,
        body: {
          resourceCode: overrideModalResource.resourceCode,
          quantity: overrideIsUnlimited ? null : Number(overrideQuantity),
          isUnlimited: overrideIsUnlimited,
          overrideMode,
          notes: overrideNotes,
        },
      }).unwrap();

      setActionSuccess(`Custom quota override configured for '${overrideModalResource.name}'`);
      setOverrideModalResource(null);
    } catch (err: any) {
      setActionError(err?.data?.message || "Failed to configure quota override");
    }
  };

  // Usage Form Submit
  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageModalResource || !activeOrgId) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      await recordUsage({
        organizationId: activeOrgId,
        resourceCode: usageModalResource.resourceCode,
        quantity: Number(usageQuantity),
        mode: usageMode,
      }).unwrap();

      setActionSuccess(`Usage updated for '${usageModalResource.name}'`);
      setUsageModalResource(null);
    } catch (err: any) {
      setActionError(err?.data?.message || "Failed to record usage");
    }
  };

  // Remove Override Handler
  const handleRemoveOverride = async (resourceCode: string) => {
    if (!activeOrgId) return;
    if (confirm(`Remove custom quota override and restore catalog defaults for '${resourceCode}'?`)) {
      try {
        await removeOverride({
          organizationId: activeOrgId,
          resourceCode,
        }).unwrap();
        setActionSuccess(`Override removed for '${resourceCode}'`);
      } catch (err: any) {
        alert(err?.data?.message || "Failed to remove quota override");
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Gauge className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Quota & Usage Metering Engine
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Deterministic quantitative resource allocation authority (ADR-010) resolving base Plan, active Add-ons, and Enterprise custom overrides.
          </p>
        </div>

        {/* Organization Selector */}
        <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-lg shadow-xs">
          <Building2 className="w-4 h-4 text-text-muted" />
          <span className="text-xs font-semibold text-text-muted">Tenant:</span>
          <select
            value={activeOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setActionError(null);
              setActionSuccess(null);
              setEvalResult(null);
            }}
            className="bg-transparent text-sm font-bold text-text-primary focus:outline-none cursor-pointer"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Alerts */}
      {actionError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold text-sm cursor-pointer">&times;</button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-sm cursor-pointer">&times;</button>
        </div>
      )}

      {/* Contract & Resolution Context Banner */}
      <div className="p-4 rounded-xl border border-border bg-surface-secondary/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider font-semibold">Active Commercial Contract</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-bold text-text-primary">
                {resolved?.planCode || "NO_ACTIVE_PLAN"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  resolved?.subscriptionStatus === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : resolved?.subscriptionStatus === "TRIAL"
                    ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}
              >
                {resolved?.subscriptionStatus || "UNSUBSCRIBED"}
              </span>
              <span className="text-xs text-text-muted font-mono ml-2">
                Period: {resolved?.period}
              </span>
            </div>
          </div>
        </div>

        {/* Formula */}
        <div className="text-xs font-mono bg-surface border border-border/80 px-3.5 py-2 rounded-lg text-text-secondary">
          <span className="text-primary font-bold">ADR-010 Formula:</span> Quota(Plan) + Σ Quota(Add-ons) + Quota(Custom)
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Quotas</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-text-primary">{resolved?.totalResources || 0}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Tracked capacity resources</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Near Limit</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{resolved?.nearLimitCount || 0}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">&gt; 85% capacity consumed</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Hard Violations</span>
            <Ban className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">{resolved?.hardLimitViolationsCount || 0}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Enforceable limits blocked</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Overages</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{resolved?.totalOverageCount || 0}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Soft / Fair-use overruns</div>
        </div>
      </div>

      {/* Live Quota Evaluation Bar */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Live Quota Check Engine</h3>
            <p className="text-xs text-text-secondary">Simulate resource allocation evaluation before checkout or device activation.</p>
          </div>
        </div>

        <form onSubmit={handleLiveEvaluation} className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={evalResource}
            onChange={(e) => setEvalResource(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary focus:outline-none focus:border-primary cursor-pointer"
            required
          >
            <option value="">-- Select Resource --</option>
            {quotaList.map((q) => (
              <option key={q.resourceCode} value={q.resourceCode}>
                {q.name} ({q.resourceCode})
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            value={evalAmount}
            onChange={(e) => setEvalAmount(Number(e.target.value))}
            placeholder="Amount"
            className="w-20 px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
            required
          />

          <button
            type="submit"
            disabled={checking || !evalResource}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            {checking ? "Checking..." : "Evaluate"}
          </button>
        </form>
      </div>

      {/* Evaluation Result Banner */}
      {evalResult && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            evalResult.status === "ALLOWED"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
              : evalResult.status === "ALLOWED_WITH_OVERAGE"
              ? "bg-blue-500/10 border-blue-500/30 text-blue-700"
              : "bg-red-500/10 border-red-500/30 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {evalResult.allowed ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <Ban className="w-5 h-5 shrink-0" />
            )}
            <div>
              <span className="font-bold">
                Evaluation Result: {evalResult.status}
              </span>
              <span className="ml-2 font-mono">
                (Current: {evalResult.currentUsage}, Requested: +{evalResult.requestedAmount}, Limit: {evalResult.isUnlimited ? "UNLIMITED" : evalResult.effectiveLimit})
              </span>
              {evalResult.reason && <p className="mt-0.5 font-sans">{evalResult.reason}</p>}
            </div>
          </div>
          <button
            onClick={() => setEvalResult(null)}
            className="font-bold text-sm cursor-pointer opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {["ALL", "HARD_LIMIT", "SOFT_LIMIT", "FAIR_USE"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                typeFilter === t
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:bg-surface-secondary border border-border"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search quota resource..."
              className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Quota Resources Table */}
      <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-secondary border-b border-border text-xs font-bold text-text-muted uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Resource & Classification</th>
                <th className="px-5 py-3">Limit Type</th>
                <th className="px-5 py-3">Allocated Quota</th>
                <th className="px-5 py-3">Current Usage</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Grant Sources</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotaLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-text-muted">
                    Resolving tenant quota limits & telemetry...
                  </td>
                </tr>
              ) : filteredQuotas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-text-muted">
                    No quota definitions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredQuotas.map((q) => {
                  const percent = q.percentageUsed ?? 0;
                  const hasCustom = q.sources.some((s) => s.type === "CUSTOM");

                  return (
                    <tr key={q.resourceCode} className="hover:bg-surface-secondary/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-text-primary">{q.name}</div>
                        <div className="text-xs font-mono text-text-muted">{q.resourceCode}</div>
                        {q.description && (
                          <div className="text-[11px] text-text-secondary mt-0.5 max-w-xs line-clamp-1">
                            {q.description}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            q.limitType === "HARD_LIMIT"
                              ? "bg-red-500/10 text-red-600 border border-red-500/20"
                              : q.limitType === "SOFT_LIMIT"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-teal-500/10 text-teal-600 border border-teal-500/20"
                          }`}
                        >
                          {q.limitType}
                        </span>
                        <div className="text-[10px] text-text-muted mt-0.5 uppercase font-mono">
                          {q.measurementType} • {q.unit}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {q.isUnlimited ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            UNLIMITED
                          </span>
                        ) : (
                          <div>
                            <span className="text-base font-bold text-text-primary">
                              {q.allocated?.toLocaleString()}
                            </span>
                            <span className="text-xs text-text-muted ml-1">{q.unit}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 min-w-44">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-text-primary">
                            {q.used.toLocaleString()} {q.unit}
                          </span>
                          {!q.isUnlimited && (
                            <span className="text-text-muted font-mono">{percent}%</span>
                          )}
                        </div>
                        {!q.isUnlimited && (
                          <div className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden border border-border">
                            <div
                              className={`h-full transition-all duration-300 ${
                                q.status === "OVERAGE"
                                  ? "bg-red-500"
                                  : q.status === "LIMIT_REACHED"
                                  ? "bg-amber-500"
                                  : percent >= 85
                                  ? "bg-amber-400"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                        )}
                        {q.overage > 0 && (
                          <div className="text-[10px] text-red-600 font-bold mt-0.5">
                            Overage: +{q.overage} {q.unit}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            q.status === "HEALTHY"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : q.status === "NEAR_LIMIT"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : q.status === "LIMIT_REACHED"
                              ? "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                              : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {q.sources.map((s, idx) => (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                s.type === "PLAN"
                                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                  : s.type === "ADD_ON"
                                  ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {s.type}: {s.isUnlimited ? "∞" : s.quantity}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {canRecordUsage && (
                          <button
                            onClick={() => {
                              setUsageModalResource(q);
                              setUsageQuantity(1);
                              setUsageMode("INCREMENT");
                            }}
                            className="px-2 py-1 bg-surface-secondary hover:bg-surface border border-border rounded text-xs font-semibold text-text-secondary transition cursor-pointer"
                            title="Adjust or record usage metric"
                          >
                            Usage
                          </button>
                        )}

                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setOverrideModalResource(q);
                                setOverrideQuantity(q.allocated ?? 10);
                                setOverrideIsUnlimited(q.isUnlimited);
                                setOverrideMode("ADD");
                                setOverrideNotes("");
                              }}
                              className="px-2 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded text-xs font-bold text-primary transition cursor-pointer"
                            >
                              Override
                            </button>

                            {hasCustom && (
                              <button
                                onClick={() => handleRemoveOverride(q.resourceCode)}
                                disabled={removingOverride}
                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-xs font-bold text-red-600 transition cursor-pointer"
                                title="Remove custom override"
                              >
                                Restore
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: CONFIGURE QUOTA OVERRIDE */}
      {/* ==================================================================== */}
      {overrideModalResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-secondary">
              <h2 className="text-base font-bold text-text-primary">Configure Quota Override</h2>
              <button
                onClick={() => setOverrideModalResource(null)}
                className="text-text-muted hover:text-text-primary text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Target Resource</label>
                <div className="p-2.5 bg-surface-secondary border border-border rounded-lg text-sm font-mono text-text-primary">
                  {overrideModalResource.name} ({overrideModalResource.resourceCode})
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isUnlimitedCheck"
                  checked={overrideIsUnlimited}
                  onChange={(e) => setOverrideIsUnlimited(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <label htmlFor="isUnlimitedCheck" className="text-sm font-semibold text-text-primary cursor-pointer">
                  Grant Unlimited Quota (∞)
                </label>
              </div>

              {!overrideIsUnlimited && (
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Allocation Quantity ({overrideModalResource.unit})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={overrideQuantity}
                    onChange={(e) => setOverrideQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Override Mode</label>
                <select
                  value={overrideMode}
                  onChange={(e) => setOverrideMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="ADD">ADD (Add on top of active commercial Plan/Add-on quota)</option>
                  <option value="REPLACE">REPLACE (Strictly replace commercial quota)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Business Notes / Reason</label>
                <textarea
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g. VIP contract expansion..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalResource(null)}
                  className="px-4 py-2 bg-surface-secondary hover:bg-surface border border-border text-text-secondary rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOverride}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {savingOverride ? "Saving..." : "Save Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: RECORD USAGE / TELEMETRY */}
      {/* ==================================================================== */}
      {usageModalResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-secondary">
              <h2 className="text-base font-bold text-text-primary">Record / Adjust Usage Telemetry</h2>
              <button
                onClick={() => setUsageModalResource(null)}
                className="text-text-muted hover:text-text-primary text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUsageSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Resource</label>
                <div className="p-2.5 bg-surface-secondary border border-border rounded-lg text-sm font-mono text-text-primary">
                  {usageModalResource.name} ({usageModalResource.resourceCode})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Operation Mode</label>
                <select
                  value={usageMode}
                  onChange={(e) => setUsageMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="INCREMENT">INCREMENT (Add amount to current usage)</option>
                  <option value="SET">SET (Overwrite total usage with new value)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Quantity ({usageModalResource.unit})
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={usageQuantity}
                  onChange={(e) => setUsageQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUsageModalResource(null)}
                  className="px-4 py-2 bg-surface-secondary hover:bg-surface border border-border text-text-secondary rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingUsage}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {recordingUsage ? "Recording..." : "Confirm Usage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
