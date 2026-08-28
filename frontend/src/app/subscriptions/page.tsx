"use client";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Building2,
  Layers,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Plus,
  Search,
  Filter,
  Eye,
  Settings,
  Trash2,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  Puzzle,
} from "lucide-react";
import {
  useGetSubscriptionsQuery,
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
  useAddSubscriptionItemMutation,
  useRemoveSubscriptionItemMutation,
  useGetPricesQuery,
  SubscriptionDetailData,
} from "@/lib/api/subscriptionsApi";
import { useListOrganizationsQuery, OrganizationItem } from "@/lib/api/organizationsApi";
import { useGetPlansQuery, useGetAddOnsQuery } from "@/lib/api/catalogApi";
import { useGetMeQuery } from "@/lib/api/authApi";

export default function SubscriptionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedSubForDetail, setSelectedSubForDetail] = useState<SubscriptionDetailData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Queries
  const { data: subsRes, isLoading: subsLoading } = useGetSubscriptionsQuery();
  const { data: orgsRes } = useListOrganizationsQuery({ page: 1, limit: 100 });
  const { data: plansRes } = useGetPlansQuery();
  const { data: addOnsRes } = useGetAddOnsQuery();
  const { data: pricesRes } = useGetPricesQuery();
  const { data: meRes } = useGetMeQuery();

  // Mutations
  const [createSubscription, { isLoading: creatingSub }] = useCreateSubscriptionMutation();
  const [updateSubscription, { isLoading: updatingSub }] = useUpdateSubscriptionMutation();
  const [addSubscriptionItem, { isLoading: addingItem }] = useAddSubscriptionItemMutation();
  const [removeSubscriptionItem, { isLoading: removingItem }] = useRemoveSubscriptionItemMutation();

  // Permissions
  const platformAccess = meRes?.data?.access?.find((a) => a.applicationCode === "PLATFORM");
  const permissions = platformAccess?.permissions || [];
  const canManage =
    permissions.includes("platform.subscriptions.manage") ||
    permissions.includes("platform.organizations.manage") ||
    permissions.includes("platform.settings.update");

  // Form State for Creation
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [startDateField, setStartDateField] = useState(new Date().toISOString().split("T")[0]);
  const [selectedAddOns, setSelectedAddOns] = useState<Array<{ addOnCode: string; quantity: number }>>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form State for Add Item Modal in Detail
  const [newAddOnCode, setNewAddOnCode] = useState("");
  const [newAddOnQty, setNewAddOnQty] = useState(1);

  const subscriptions = subsRes?.data || [];
  const organizations: OrganizationItem[] = (
    Array.isArray(orgsRes?.data)
      ? orgsRes.data
      : (orgsRes?.data as any)?.items || []
  );
  const plans = plansRes?.data || [];
  const addOns = addOnsRes?.data || [];
  const prices = pricesRes?.data;

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const orgName = sub.organization?.name || "";
      const planName = sub.plan?.name || sub.planCode;
      const matchesSearch =
        orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || sub.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchTerm, statusFilter]);

  // Pricing calculations for creation preview
  const activePlanPrice = useMemo(() => {
    if (!prices?.planPrices || !selectedPlanCode) return 0;
    const p = prices.planPrices.find(
      (pp) => pp.planCode === selectedPlanCode && pp.billingCycle === billingCycle && pp.isActive
    );
    return p ? Number(p.amount) : 0;
  }, [prices, selectedPlanCode, billingCycle]);

  const activeAddOnsTotal = useMemo(() => {
    if (!prices?.addOnPrices) return 0;
    let total = 0;
    for (const item of selectedAddOns) {
      const ap = prices.addOnPrices.find(
        (p) => p.addOnCode === item.addOnCode && p.billingCycle === billingCycle && p.isActive
      );
      if (ap) {
        total += Number(ap.amount) * item.quantity;
      }
    }
    return total;
  }, [prices, selectedAddOns, billingCycle]);

  const totalContractPrice = activePlanPrice + activeAddOnsTotal;

  const openCreateModal = () => {
    setFormError(null);
    setFormSuccess(null);
    setSelectedOrgId(organizations[0]?.id || "");
    setSelectedPlanCode(plans[0]?.code || "PLAN_STARTER");
    setBillingCycle("MONTHLY");
    setStartDateField(new Date().toISOString().split("T")[0]);
    setSelectedAddOns([]);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      await createSubscription({
        organizationId: selectedOrgId,
        planCode: selectedPlanCode,
        billingCycle,
        startedAt: new Date(startDateField).toISOString(),
        addOns: selectedAddOns,
      }).unwrap();

      setFormSuccess("Subscription contract established successfully!");
      setTimeout(() => {
        setIsCreateModalOpen(false);
      }, 700);
    } catch (err: any) {
      setFormError(err?.data?.message || err?.message || "Failed to create subscription contract");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedSubForDetail) return;
    try {
      const updated = await updateSubscription({
        id: selectedSubForDetail.id,
        data: { status: newStatus },
      }).unwrap();
      setSelectedSubForDetail(updated.data);
    } catch (err: any) {
      alert(err?.data?.message || "Failed to update subscription status");
    }
  };

  const handleAddItemToSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForDetail || !newAddOnCode) return;
    try {
      const updated = await addSubscriptionItem({
        id: selectedSubForDetail.id,
        body: { addOnCode: newAddOnCode, quantity: newAddOnQty },
      }).unwrap();
      setSelectedSubForDetail(updated.data);
      setNewAddOnCode("");
      setNewAddOnQty(1);
    } catch (err: any) {
      alert(err?.data?.message || "Failed to attach add-on item");
    }
  };

  const handleRemoveItemFromSubscription = async (itemId: string) => {
    if (!selectedSubForDetail) return;
    if (confirm("Are you sure you want to remove this contracted add-on?")) {
      try {
        await removeSubscriptionItem({
          id: selectedSubForDetail.id,
          itemId,
        }).unwrap();

        // Refresh detail state
        const remainingItems = (selectedSubForDetail.items || []).filter((it) => it.id !== itemId);
        setSelectedSubForDetail({ ...selectedSubForDetail, items: remainingItems });
      } catch (err: any) {
        alert(err?.data?.message || "Failed to remove add-on item");
      }
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Metrics summary
  const activeCount = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const trialCount = subscriptions.filter((s) => s.status === "TRIAL").length;
  const suspendedCount = subscriptions.filter((s) => s.status === "SUSPENDED" || s.status === "PAST_DUE").length;
  const totalValueMonthly = subscriptions.reduce((sum, s) => {
    if (s.status !== "ACTIVE" && s.status !== "TRIAL") return sum;
    const planCost = Number(s.planPriceAmount);
    const itemsCost = (s.items || []).reduce((iSum, it) => iSum + Number(it.unitPrice) * it.quantity, 0);
    return sum + (s.billingCycle === "YEARLY" ? (planCost + itemsCost) / 12 : planCost + itemsCost);
  }, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              SaaS Commercial Subscriptions
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Contractual subscription management linking customer Organizations to Plan tiers and contracted Add-ons.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Subscription Contract
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Contracts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-text-primary">{activeCount}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Live paying organizations</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Trial Subscriptions</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-text-primary">{trialCount}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Evaluation periods</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Suspended / Past Due</span>
            <Ban className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-text-primary">{suspendedCount}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Pending resolution</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Run Rate</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-primary truncate">{formatCurrency(totalValueMonthly)}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Normalized monthly recurring</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["ALL", "ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "CANCELLED", "EXPIRED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:bg-surface-secondary border border-border"
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
            placeholder="Search organization or plan..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-secondary border-b border-border text-xs font-bold text-text-muted uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Plan & Tier</th>
                <th className="px-5 py-3">Billing Cycle</th>
                <th className="px-5 py-3">Contract Snapshot</th>
                <th className="px-5 py-3">Attached Add-Ons</th>
                <th className="px-5 py-3">Current Period End</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subsLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-text-muted">
                    Loading subscription contracts...
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-text-muted">
                    No subscriptions found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const planCost = Number(sub.planPriceAmount);
                  const itemsCost = (sub.items || []).reduce(
                    (sum, it) => sum + Number(it.unitPrice) * it.quantity,
                    0
                  );
                  const totalCost = planCost + itemsCost;

                  return (
                    <tr key={sub.id} className="hover:bg-surface-secondary/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-text-primary">{sub.organization?.name || "Unknown"}</div>
                        <div className="text-xs font-mono text-text-muted">{sub.organization?.code || sub.organizationId}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          {sub.plan?.name || sub.planCode}
                        </span>
                        <div className="text-[11px] font-mono text-text-muted mt-0.5">{sub.plan?.tier}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-surface-secondary text-text-secondary border border-border">
                          {sub.billingCycle}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-bold text-text-primary">{formatCurrency(totalCost)}</div>
                        <div className="text-[11px] text-text-muted">
                          Base: {formatCurrency(planCost)} / {sub.billingCycle === "YEARLY" ? "yr" : "mo"}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {sub.items && sub.items.length > 0 ? (
                            sub.items.map((it) => (
                              <span
                                key={it.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                title={`${it.addOnCode} x${it.quantity} (${formatCurrency(it.unitPrice)})`}
                              >
                                {it.addOn?.name || it.addOnCode} (x{it.quantity})
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-text-muted">None</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-text-secondary">
                        {formatDate(sub.currentPeriodEnd)}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            sub.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : sub.status === "TRIAL"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : sub.status === "SUSPENDED" || sub.status === "PAST_DUE"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedSubForDetail(sub)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
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
      {/* MODAL: CREATE SUBSCRIPTION */}
      {/* ==================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-secondary">
              <h2 className="text-base font-bold text-text-primary">Establish New Subscription Contract</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-text-muted hover:text-text-primary text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Target Organization</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                  required
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.code}) [{org.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Base Plan Package</label>
                  <select
                    value={selectedPlanCode}
                    onChange={(e) => setSelectedPlanCode(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                    required
                  >
                    {plans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.tier})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="MONTHLY">MONTHLY (30 Days)</option>
                    <option value="YEARLY">YEARLY (365 Days)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Contract Start Date</label>
                <input
                  type="date"
                  value={startDateField}
                  onChange={(e) => setStartDateField(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Attach Optional Add-Ons ({selectedAddOns.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto p-2 bg-surface-secondary border border-border rounded-lg space-y-2">
                  {addOns.map((addon) => {
                    const existing = selectedAddOns.find((it) => it.addOnCode === addon.code);
                    const isChecked = !!existing;
                    const ap = prices?.addOnPrices?.find(
                      (p) => p.addOnCode === addon.code && p.billingCycle === billingCycle && p.isActive
                    );
                    const priceFormatted = ap ? formatCurrency(ap.amount) : "No active price";

                    return (
                      <div
                        key={addon.code}
                        className="flex items-center justify-between p-2 rounded bg-surface border border-border/60 text-xs"
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAddOns([...selectedAddOns, { addOnCode: addon.code, quantity: 1 }]);
                              } else {
                                setSelectedAddOns(selectedAddOns.filter((it) => it.addOnCode !== addon.code));
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-primary border-border focus:ring-primary"
                          />
                          <div>
                            <div className="font-bold text-text-primary">{addon.name}</div>
                            <div className="text-[11px] text-text-secondary">{priceFormatted} / cycle</div>
                          </div>
                        </label>

                        {isChecked && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-text-muted">Qty:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={existing?.quantity || 1}
                              onChange={(e) => {
                                const q = Math.max(1, parseInt(e.target.value) || 1);
                                setSelectedAddOns(
                                  selectedAddOns.map((it) =>
                                    it.addOnCode === addon.code ? { ...it, quantity: q } : it
                                  )
                                );
                              }}
                              className="w-14 px-2 py-0.5 bg-surface-secondary border border-border rounded text-center text-xs font-bold text-text-primary"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Contract Price Snapshot Box */}
              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Base Plan Snapshot ({selectedPlanCode}):</span>
                  <span className="font-semibold text-text-primary">{formatCurrency(activePlanPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Contracted Add-ons Total:</span>
                  <span className="font-semibold text-text-primary">{formatCurrency(activeAddOnsTotal)}</span>
                </div>
                <div className="pt-2 border-t border-primary/20 flex items-center justify-between text-sm font-bold text-primary">
                  <span>Total Contract Snapshot ({billingCycle}):</span>
                  <span>{formatCurrency(totalContractPrice)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-surface-secondary hover:bg-surface border border-border text-text-secondary rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSub}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {creatingSub ? "Establishing Contract..." : "Confirm & Establish Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DRAWER: SUBSCRIPTION DETAIL & MANAGEMENT */}
      {/* ==================================================================== */}
      {selectedSubForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border-l border-border shadow-2xl w-full max-w-xl h-full flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-secondary">
              <div>
                <h2 className="text-base font-bold text-text-primary">Subscription Contract Details</h2>
                <p className="text-xs text-text-muted mt-0.5 font-mono">ID: {selectedSubForDetail.id}</p>
              </div>
              <button
                onClick={() => setSelectedSubForDetail(null)}
                className="text-text-muted hover:text-text-primary text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Organization & Status Block */}
              <div className="p-4 rounded-xl bg-surface-secondary/50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-muted">Subscribed Tenant</div>
                    <div className="text-base font-bold text-text-primary">
                      {selectedSubForDetail.organization?.name || selectedSubForDetail.organizationId}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedSubForDetail.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : selectedSubForDetail.status === "TRIAL"
                        ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                        : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    }`}
                  >
                    {selectedSubForDetail.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60 text-xs">
                  <div>
                    <span className="text-text-muted">Billing Cycle:</span>
                    <div className="font-bold text-text-primary">{selectedSubForDetail.billingCycle}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Contracted Plan Base:</span>
                    <div className="font-bold text-text-primary">
                      {formatCurrency(selectedSubForDetail.planPriceAmount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-text-muted">Period Started:</span>
                    <div className="text-text-primary">{formatDate(selectedSubForDetail.startedAt)}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">Period Renews/Ends:</span>
                    <div className="text-text-primary">{formatDate(selectedSubForDetail.currentPeriodEnd)}</div>
                  </div>
                </div>
              </div>

              {/* Status Management Actions */}
              {canManage && (
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-2">
                    Contract Lifecycle Transitions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"].map((st) => (
                      <button
                        key={st}
                        disabled={selectedSubForDetail.status === st || updatingSub}
                        onClick={() => handleStatusChange(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer disabled:opacity-40 ${
                          st === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                            : st === "SUSPENDED"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                            : "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20"
                        }`}
                      >
                        Set {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contracted Add-ons List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Contracted Add-On Items ({selectedSubForDetail.items?.length || 0})
                  </h3>
                </div>

                <div className="space-y-2">
                  {selectedSubForDetail.items && selectedSubForDetail.items.length > 0 ? (
                    selectedSubForDetail.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-text-primary">{item.addOn?.name || item.addOnCode}</div>
                          <div className="text-xs text-text-muted">
                            Snapshot Unit Price: {formatCurrency(item.unitPrice)} | Quantity: {item.quantity}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-text-primary">
                              {formatCurrency(Number(item.unitPrice) * item.quantity)}
                            </div>
                            <div className="text-[10px] text-text-muted">per {selectedSubForDetail.billingCycle}</div>
                          </div>

                          {canManage && (
                            <button
                              onClick={() => handleRemoveItemFromSubscription(item.id)}
                              disabled={removingItem}
                              className="p-1.5 text-text-muted hover:text-red-600 transition cursor-pointer"
                              title="Remove Add-on Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-text-muted border border-dashed border-border rounded-lg">
                      No add-on items contracted for this subscription.
                    </div>
                  )}
                </div>
              </div>

              {/* Attach New Add-on Form */}
              {canManage &&
                (selectedSubForDetail.status === "ACTIVE" || selectedSubForDetail.status === "TRIAL") && (
                  <form onSubmit={handleAddItemToSubscription} className="p-4 rounded-xl border border-border bg-surface-secondary/40 space-y-3">
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Attach Additional Add-On to Active Contract
                    </h4>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <select
                          value={newAddOnCode}
                          onChange={(e) => setNewAddOnCode(e.target.value)}
                          className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                          required
                        >
                          <option value="">Select Add-on to attach...</option>
                          {addOns.map((a) => (
                            <option key={a.code} value={a.code}>
                              {a.name} ({a.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={newAddOnQty}
                          onChange={(e) => setNewAddOnQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-bold text-center text-text-primary"
                          placeholder="Qty"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!newAddOnCode || addingItem}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition cursor-pointer disabled:opacity-50"
                      >
                        {addingItem ? "Attaching..." : "Attach Add-On"}
                      </button>
                    </div>
                  </form>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
