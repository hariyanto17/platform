"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Building2,
  Boxes,
  KeyRound,
  Ban,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Search,
  Filter,
  Layers,
  Sparkles,
  HelpCircle,
  Puzzle,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import {
  useGetOrganizationEntitlementsQuery,
  useGrantCustomEntitlementMutation,
  useRevokeEntitlementMutation,
  useRemoveOverrideMutation,
  EffectiveFeatureDetail,
} from "@/lib/api/entitlementsApi";
import { useListOrganizationsQuery, OrganizationItem } from "@/lib/api/organizationsApi";
import { useGetFeaturesQuery, useGetModulesQuery } from "@/lib/api/catalogApi";
import { useGetMeQuery } from "@/lib/api/authApi";

export default function EntitlementsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Query orgs & catalog
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

  // Entitlements Query
  const {
    data: entRes,
    isLoading: entLoading,
    refetch: refetchEntitlements,
  } = useGetOrganizationEntitlementsQuery(activeOrgId, {
    skip: !activeOrgId,
  });

  const { data: featuresRes } = useGetFeaturesQuery();
  const { data: modulesRes } = useGetModulesQuery();

  // Mutations
  const [grantCustom, { isLoading: granting }] = useGrantCustomEntitlementMutation();
  const [revokeFeature, { isLoading: revoking }] = useRevokeEntitlementMutation();
  const [removeOverride, { isLoading: removingOverride }] = useRemoveOverrideMutation();

  // Modal States
  const [grantModalFeature, setGrantModalFeature] = useState<string | null>(null);
  const [grantNotes, setGrantNotes] = useState("");
  const [grantUntil, setGrantUntil] = useState("");

  const [revokeModalFeature, setRevokeModalFeature] = useState<string | null>(null);
  const [revokeNotes, setRevokeNotes] = useState("");

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Permissions
  const platformAccess = meRes?.data?.access?.find((a) => a.applicationCode === "PLATFORM");
  const permissions = platformAccess?.permissions || [];
  const canManage =
    permissions.includes("platform.entitlements.manage") ||
    permissions.includes("platform.organizations.manage") ||
    permissions.includes("platform.settings.update");

  const catalogFeatures = featuresRes?.data || [];
  const catalogModules = modulesRes?.data || [];
  const resolved = entRes?.data;

  // Build unified feature capability list
  const capabilityList = useMemo(() => {
    const detailMap = resolved?.featureDetails || {};

    return catalogFeatures.map((feat) => {
      const detail = detailMap[feat.key];
      const isEffective = detail ? detail.active : false;
      const isRevoked = detail ? detail.isRevoked : false;
      const sources = detail ? detail.sources : [];
      const missingDeps = detail ? detail.missingDependencies || [] : [];

      let computedStatus: "EFFECTIVE" | "REVOKED" | "MISSING_DEP" | "NOT_GRANTED" = "NOT_GRANTED";
      if (isRevoked) {
        computedStatus = "REVOKED";
      } else if (missingDeps.length > 0) {
        computedStatus = "MISSING_DEP";
      } else if (isEffective) {
        computedStatus = "EFFECTIVE";
      }

      const hasCustomOverride = sources.some((s) => s.type === "CUSTOM") || isRevoked;

      return {
        ...feat,
        isEffective,
        isRevoked,
        sources,
        missingDeps,
        computedStatus,
        hasCustomOverride,
      };
    });
  }, [catalogFeatures, resolved]);

  // Filtered Capabilities
  const filteredCapabilities = useMemo(() => {
    return capabilityList.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.moduleCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesModule = selectedModule === "ALL" || item.moduleCode === selectedModule;

      let matchesStatus = true;
      if (statusFilter === "EFFECTIVE") matchesStatus = item.computedStatus === "EFFECTIVE";
      if (statusFilter === "REVOKED") matchesStatus = item.computedStatus === "REVOKED";
      if (statusFilter === "MISSING_DEP") matchesStatus = item.computedStatus === "MISSING_DEP";
      if (statusFilter === "NOT_GRANTED") matchesStatus = item.computedStatus === "NOT_GRANTED";
      if (statusFilter === "CUSTOM") matchesStatus = item.hasCustomOverride;

      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [capabilityList, searchTerm, selectedModule, statusFilter]);

  // Summary Metrics
  const effectiveCount = resolved?.totalEffective || 0;
  const revokedCount = resolved?.totalRevoked || 0;
  const customCount = capabilityList.filter((c) => c.hasCustomOverride).length;
  const missingDepCount = capabilityList.filter((c) => c.computedStatus === "MISSING_DEP").length;

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalFeature || !activeOrgId) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      await grantCustom({
        organizationId: activeOrgId,
        body: {
          featureKey: grantModalFeature,
          effectiveUntil: grantUntil ? new Date(grantUntil).toISOString() : null,
          notes: grantNotes,
        },
      }).unwrap();

      setActionSuccess(`Custom grant added for '${grantModalFeature}'`);
      setGrantModalFeature(null);
      setGrantNotes("");
      setGrantUntil("");
    } catch (err: any) {
      setActionError(err?.data?.message || "Failed to grant custom entitlement");
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeModalFeature || !activeOrgId) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      await revokeFeature({
        organizationId: activeOrgId,
        body: {
          featureKey: revokeModalFeature,
          notes: revokeNotes,
        },
      }).unwrap();

      setActionSuccess(`Explicit revocation applied for '${revokeModalFeature}'`);
      setRevokeModalFeature(null);
      setRevokeNotes("");
    } catch (err: any) {
      setActionError(err?.data?.message || "Failed to revoke feature entitlement");
    }
  };

  const handleRestoreOverride = async (featureKey: string) => {
    if (!activeOrgId) return;
    if (confirm(`Restore default catalog inherited access for '${featureKey}'?`)) {
      try {
        await removeOverride({
          organizationId: activeOrgId,
          featureKey,
        }).unwrap();
        setActionSuccess(`Override removed for '${featureKey}'`);
      } catch (err: any) {
        alert(err?.data?.message || "Failed to restore inherited access");
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Effective Entitlement Authority
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Deterministic feature entitlement resolution engine calculating active tenant capabilities from Plan, Add-ons, Verticals & Custom Overrides.
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
            <AlertCircle className="w-4 h-4 shrink-0" />
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

      {/* Entitlement Context Banner */}
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
            </div>
          </div>
        </div>

        {/* Quick Resolution Formula Explanation */}
        <div className="text-xs font-mono bg-surface border border-border/80 px-3.5 py-2 rounded-lg text-text-secondary">
          <span className="text-primary font-bold">Resolution Formula:</span> (Plan ∪ Add-ons ∪ Verticals ∪ Custom) ∖ Revoked
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Effective Features</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{effectiveCount}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Active runtime capabilities</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Explicit Revocations</span>
            <Ban className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">{revokedCount}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Negative overrides applied</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Tenant Overrides</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{customCount}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Custom grants & exceptions</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Missing Dependencies</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{missingDepCount}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Blocked capabilities</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        {/* Module Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedModule("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              selectedModule === "ALL"
                ? "bg-primary text-white shadow-xs"
                : "bg-surface text-text-secondary hover:bg-surface-secondary border border-border"
            }`}
          >
            All Modules
          </button>
          {catalogModules.map((m) => (
            <button
              key={m.code}
              onClick={() => setSelectedModule(m.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedModule === m.code
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:bg-surface-secondary border border-border"
              }`}
            >
              {m.name} ({m.code})
            </button>
          ))}
        </div>

        {/* Status Filter & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {["ALL", "EFFECTIVE", "REVOKED", "MISSING_DEP", "NOT_GRANTED", "CUSTOM"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-text-primary text-surface"
                    : "bg-surface text-text-muted hover:text-text-primary border border-border"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search feature key or name..."
              className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Feature Capability Matrix Table */}
      <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-secondary border-b border-border text-xs font-bold text-text-muted uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Feature Capability</th>
                <th className="px-5 py-3">Module</th>
                <th className="px-5 py-3">Effective Status</th>
                <th className="px-5 py-3">Grant Sources & Traceability</th>
                <th className="px-5 py-3">Dependencies</th>
                {canManage && <th className="px-5 py-3 text-right">Overrides</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-text-muted">
                    Resolving effective entitlements...
                  </td>
                </tr>
              ) : filteredCapabilities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-text-muted">
                    No features match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCapabilities.map((feat) => {
                  return (
                    <tr key={feat.key} className="hover:bg-surface-secondary/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text-primary">{feat.name}</span>
                          {feat.isCore && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                              CORE
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-text-muted mt-0.5">{feat.key}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-surface-secondary text-text-secondary border border-border">
                          {feat.moduleCode}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {feat.computedStatus === "EFFECTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            EFFECTIVE
                          </span>
                        ) : feat.computedStatus === "REVOKED" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                            <Ban className="w-3.5 h-3.5" />
                            REVOKED
                          </span>
                        ) : feat.computedStatus === "MISSING_DEP" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            BLOCKED (MISSING DEP)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-secondary text-text-muted border border-border">
                            NOT GRANTED
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {feat.sources.length > 0 ? (
                            feat.sources.map((src, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  src.type === "PLAN"
                                    ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                    : src.type === "ADD_ON"
                                    ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                                    : src.type === "VERTICAL"
                                    ? "bg-teal-500/10 text-teal-600 border border-teal-500/20"
                                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                }`}
                              >
                                {src.type}: {src.code}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-text-muted italic">None</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {feat.missingDeps.length > 0 ? (
                          <div className="text-xs text-amber-600 font-mono">
                            Requires: {feat.missingDeps.join(", ")}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">Satisfied</span>
                        )}
                      </td>

                      {canManage && (
                        <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {feat.hasCustomOverride ? (
                            <button
                              onClick={() => handleRestoreOverride(feat.key)}
                              disabled={removingOverride}
                              className="px-2 py-1 bg-surface-secondary hover:bg-surface border border-border rounded text-xs font-semibold text-text-secondary transition cursor-pointer"
                              title="Remove custom grant/revocation override"
                            >
                              Restore Inherited
                            </button>
                          ) : feat.isEffective ? (
                            <button
                              onClick={() => {
                                setRevokeModalFeature(feat.key);
                                setRevokeNotes("");
                              }}
                              className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-xs font-bold text-red-600 transition cursor-pointer"
                            >
                              Revoke
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setGrantModalFeature(feat.key);
                                setGrantNotes("");
                                setGrantUntil("");
                              }}
                              className="px-2 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded text-xs font-bold text-primary transition cursor-pointer"
                            >
                              Grant Custom
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: CUSTOM GRANT */}
      {/* ==================================================================== */}
      {grantModalFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-secondary">
              <h2 className="text-base font-bold text-text-primary">Grant Custom Feature Access</h2>
              <button
                onClick={() => setGrantModalFeature(null)}
                className="text-text-muted hover:text-text-primary text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleGrantSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Target Feature</label>
                <div className="p-2.5 bg-surface-secondary border border-border rounded-lg text-sm font-mono text-text-primary">
                  {grantModalFeature}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={grantUntil}
                  onChange={(e) => setGrantUntil(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Notes / Business Justification</label>
                <textarea
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                  placeholder="e.g. VIP enterprise pilot waiver..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGrantModalFeature(null)}
                  className="px-4 py-2 bg-surface-secondary hover:bg-surface border border-border text-text-secondary rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {granting ? "Granting..." : "Confirm Grant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: EXPLICIT REVOCATION */}
      {/* ==================================================================== */}
      {revokeModalFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-secondary">
              <h2 className="text-base font-bold text-red-600">Explicitly Revoke Feature Access</h2>
              <button
                onClick={() => setRevokeModalFeature(null)}
                className="text-text-muted hover:text-text-primary text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRevokeSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600">
                Warning: Explicit revocation overrides any commercial Plan or Add-on grant for this tenant.
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">Target Feature</label>
                <div className="p-2.5 bg-surface-secondary border border-border rounded-lg text-sm font-mono text-text-primary">
                  {revokeModalFeature}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Revocation Reason</label>
                <textarea
                  value={revokeNotes}
                  onChange={(e) => setRevokeNotes(e.target.value)}
                  placeholder="e.g. Account compliance restriction..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevokeModalFeature(null)}
                  className="px-4 py-2 bg-surface-secondary hover:bg-surface border border-border text-text-secondary rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revoking}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {revoking ? "Revoking..." : "Confirm Revocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
