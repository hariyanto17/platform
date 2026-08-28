"use client";

import React, { useState } from "react";
import {
  Package,
  Layers,
  Sparkles,
  Puzzle,
  Building,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  GitFork,
  Boxes,
  ShieldCheck,
  Edit2,
  Trash2,
  Info,
} from "lucide-react";
import {
  useGetCatalogOverviewQuery,
  useGetPlansQuery,
  useGetModulesQuery,
  useGetFeaturesQuery,
  useGetAddOnsQuery,
  useGetVerticalsQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
  useAddFeatureDependencyMutation,
  useRemoveFeatureDependencyMutation,
  useCreateAddOnMutation,
  useUpdateAddOnMutation,
  useCreateVerticalMutation,
  useUpdateVerticalMutation,
  CatalogPlanItem,
  CatalogModuleItem,
  CatalogFeatureItem,
  CatalogAddOnItem,
  CatalogVerticalItem,
} from "@/lib/api/catalogApi";
import { useGetMeQuery } from "@/lib/api/authApi";

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState<"plans" | "modules" | "features" | "addons" | "verticals" | "dependencies">("plans");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("ALL");

  // Query Hooks
  const { data: overviewRes } = useGetCatalogOverviewQuery();
  const { data: plansRes, isLoading: plansLoading } = useGetPlansQuery();
  const { data: modulesRes, isLoading: modulesLoading } = useGetModulesQuery();
  const { data: featuresRes, isLoading: featuresLoading } = useGetFeaturesQuery();
  const { data: addOnsRes, isLoading: addOnsLoading } = useGetAddOnsQuery();
  const { data: verticalsRes, isLoading: verticalsLoading } = useGetVerticalsQuery();
  const { data: meRes } = useGetMeQuery();

  // Mutation Hooks
  const [createPlan, { isLoading: creatingPlan }] = useCreatePlanMutation();
  const [updatePlan, { isLoading: updatingPlan }] = useUpdatePlanMutation();
  const [createModule, { isLoading: creatingModule }] = useCreateModuleMutation();
  const [updateModule, { isLoading: updatingModule }] = useUpdateModuleMutation();
  const [createFeature, { isLoading: creatingFeature }] = useCreateFeatureMutation();
  const [updateFeature, { isLoading: updatingFeature }] = useUpdateFeatureMutation();
  const [addDependency, { isLoading: addingDep }] = useAddFeatureDependencyMutation();
  const [removeDependency, { isLoading: removingDep }] = useRemoveFeatureDependencyMutation();
  const [createAddOn, { isLoading: creatingAddOn }] = useCreateAddOnMutation();
  const [updateAddOn, { isLoading: updatingAddOn }] = useUpdateAddOnMutation();
  const [createVertical, { isLoading: creatingVertical }] = useCreateVerticalMutation();
  const [updateVertical, { isLoading: updatingVertical }] = useUpdateVerticalMutation();

  // Permission Check
  const platformAccess = meRes?.data?.access?.find((a) => a.applicationCode === "PLATFORM");
  const permissions = platformAccess?.permissions || [];
  const canManage = permissions.includes("platform.catalog.manage") || permissions.includes("platform.settings.update");

  // Modal State
  const [modalType, setModalType] = useState<"PLAN" | "MODULE" | "FEATURE" | "ADDON" | "VERTICAL" | "DEPENDENCY" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields State
  const [codeField, setCodeField] = useState("");
  const [nameField, setNameField] = useState("");
  const [tierField, setTierField] = useState<string>("STARTER");
  const [descField, setDescField] = useState("");
  const [moduleCodeField, setModuleCodeField] = useState("");
  const [isCoreField, setIsCoreField] = useState(false);
  const [isSharedField, setIsSharedField] = useState(true);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [depFeatureKey, setDepFeatureKey] = useState("");
  const [depDependsOnKey, setDepDependsOnKey] = useState("");
  const [depType, setDepType] = useState("REQUIRED");

  const overview = overviewRes?.data;
  const plans = plansRes?.data || [];
  const modules = modulesRes?.data || [];
  const features = featuresRes?.data || [];
  const addOns = addOnsRes?.data || [];
  const verticals = verticalsRes?.data || [];

  const openCreateModal = (type: "PLAN" | "MODULE" | "FEATURE" | "ADDON" | "VERTICAL" | "DEPENDENCY") => {
    setModalType(type);
    setEditingItem(null);
    setFormError(null);
    setFormSuccess(null);
    setCodeField("");
    setNameField("");
    setTierField("STARTER");
    setDescField("");
    setModuleCodeField(modules[0]?.code || "pos");
    setIsCoreField(false);
    setIsSharedField(true);
    setSelectedFeatures([]);
    setDepFeatureKey(features[0]?.key || "");
    setDepDependsOnKey(features[1]?.key || "");
    setDepType("REQUIRED");
  };

  const openEditModal = (type: "PLAN" | "MODULE" | "FEATURE" | "ADDON" | "VERTICAL", item: any) => {
    setModalType(type);
    setEditingItem(item);
    setFormError(null);
    setFormSuccess(null);
    setCodeField(item.code || item.key || "");
    setNameField(item.name || "");
    setTierField(item.tier || "STARTER");
    setDescField(item.description || "");
    setModuleCodeField(item.moduleCode || "");
    setIsCoreField(item.isCore || false);
    setIsSharedField(item.isShared !== undefined ? item.isShared : true);

    if (type === "PLAN") {
      setSelectedFeatures(item.planFeatures?.map((pf: any) => pf.featureKey) || []);
    } else if (type === "ADDON") {
      setSelectedFeatures(item.addOnFeatures?.map((af: any) => af.featureKey) || []);
    } else if (type === "VERTICAL") {
      setSelectedFeatures(item.verticalFeatures?.map((vf: any) => vf.featureKey) || []);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      if (modalType === "MODULE") {
        if (editingItem) {
          await updateModule({
            code: editingItem.code,
            data: { name: nameField, description: descField, isShared: isSharedField },
          }).unwrap();
        } else {
          await createModule({
            code: codeField.toLowerCase().trim(),
            name: nameField.trim(),
            description: descField,
            isShared: isSharedField,
          }).unwrap();
        }
      } else if (modalType === "FEATURE") {
        if (editingItem) {
          await updateFeature({
            key: editingItem.key,
            data: { name: nameField, description: descField, isCore: isCoreField, moduleCode: moduleCodeField },
          }).unwrap();
        } else {
          await createFeature({
            key: codeField.toLowerCase().trim(),
            name: nameField.trim(),
            description: descField,
            moduleCode: moduleCodeField,
            isCore: isCoreField,
          }).unwrap();
        }
      } else if (modalType === "PLAN") {
        if (editingItem) {
          await updatePlan({
            code: editingItem.code,
            data: { name: nameField, tier: tierField, description: descField, featureKeys: selectedFeatures },
          }).unwrap();
        } else {
          await createPlan({
            code: codeField.toUpperCase().trim(),
            name: nameField.trim(),
            tier: tierField,
            description: descField,
            featureKeys: selectedFeatures,
          }).unwrap();
        }
      } else if (modalType === "ADDON") {
        if (editingItem) {
          await updateAddOn({
            code: editingItem.code,
            data: { name: nameField, description: descField, featureKeys: selectedFeatures },
          }).unwrap();
        } else {
          await createAddOn({
            code: codeField.toUpperCase().trim(),
            name: nameField.trim(),
            description: descField,
            featureKeys: selectedFeatures,
          }).unwrap();
        }
      } else if (modalType === "VERTICAL") {
        if (editingItem) {
          await updateVertical({
            code: editingItem.code,
            data: { name: nameField, description: descField, featureKeys: selectedFeatures },
          }).unwrap();
        } else {
          await createVertical({
            code: codeField.toUpperCase().trim(),
            name: nameField.trim(),
            description: descField,
            featureKeys: selectedFeatures,
          }).unwrap();
        }
      } else if (modalType === "DEPENDENCY") {
        await addDependency({
          featureKey: depFeatureKey,
          dependsOnKey: depDependsOnKey,
          dependencyType: depType,
        }).unwrap();
      }

      setFormSuccess("Catalog record updated successfully");
      setTimeout(() => {
        setModalType(null);
      }, 700);
    } catch (err: any) {
      setFormError(err?.data?.message || err?.message || "Operation failed. Check input constraints.");
    }
  };

  const handleRemoveDependency = async (featureKey: string, dependsOnKey: string) => {
    if (confirm(`Remove dependency: ${featureKey} -> ${dependsOnKey}?`)) {
      try {
        await removeDependency({ featureKey, dependsOnKey }).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to remove dependency");
      }
    }
  };

  // Filtered Lists
  const filteredPlans = plans.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredModules = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFeatures = features.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = selectedModuleFilter === "ALL" || f.moduleCode === selectedModuleFilter;
    return matchesSearch && matchesModule;
  });

  const filteredAddOns = addOns.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVerticals = verticals.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allDependencies = features.flatMap((f) =>
    (f.dependencies || []).map((d) => ({
      featureKey: f.key,
      featureName: f.name,
      dependsOnKey: d.dependsOnKey,
      dependsOnName: d.dependsOn?.name || d.dependsOnKey,
      dependencyType: d.dependencyType,
    }))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Commercial Product Catalog
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Master repository of commercial plans, pluggable verticals, composable add-ons, and technical feature capabilities.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === "plans") openCreateModal("PLAN");
                else if (activeTab === "modules") openCreateModal("MODULE");
                else if (activeTab === "features") openCreateModal("FEATURE");
                else if (activeTab === "addons") openCreateModal("ADDON");
                else if (activeTab === "verticals") openCreateModal("VERTICAL");
                else if (activeTab === "dependencies") openCreateModal("DEPENDENCY");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add {activeTab.slice(0, -1).toUpperCase()}
            </button>
          </div>
        )}
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setActiveTab("plans")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === "plans"
              ? "border-primary bg-primary/5 shadow-xs"
              : "border-border bg-surface hover:bg-surface-secondary"
          }`}
        >
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Plans</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-text-primary">{overview?.plansCount ?? plans.length}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Tiered subscription packages</div>
        </div>

        <div
          onClick={() => setActiveTab("modules")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === "modules"
              ? "border-primary bg-primary/5 shadow-xs"
              : "border-border bg-surface hover:bg-surface-secondary"
          }`}
        >
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Modules</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-text-primary">{overview?.modulesCount ?? modules.length}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Domain functional units</div>
        </div>

        <div
          onClick={() => setActiveTab("features")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === "features"
              ? "border-primary bg-primary/5 shadow-xs"
              : "border-border bg-surface hover:bg-surface-secondary"
          }`}
        >
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Features</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-text-primary">{overview?.featuresCount ?? features.length}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Canonical technical keys</div>
        </div>

        <div
          onClick={() => setActiveTab("addons")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === "addons"
              ? "border-primary bg-primary/5 shadow-xs"
              : "border-border bg-surface hover:bg-surface-secondary"
          }`}
        >
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Add-Ons</span>
            <Puzzle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-text-primary">{overview?.addOnsCount ?? addOns.length}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Composable capabilities</div>
        </div>

        <div
          onClick={() => setActiveTab("verticals")}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === "verticals"
              ? "border-primary bg-primary/5 shadow-xs"
              : "border-border bg-surface hover:bg-surface-secondary"
          }`}
        >
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Verticals</span>
            <Building className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-text-primary">{overview?.verticalsCount ?? verticals.length}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Industry specific solutions</div>
        </div>
      </div>

      {/* Tabs Navigation & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "plans", label: "Plans", icon: <Layers className="w-4 h-4" /> },
            { id: "modules", label: "Modules", icon: <Package className="w-4 h-4" /> },
            { id: "features", label: "Features", icon: <Sparkles className="w-4 h-4" /> },
            { id: "addons", label: "Add-Ons", icon: <Puzzle className="w-4 h-4" /> },
            { id: "verticals", label: "Verticals", icon: <Building className="w-4 h-4" /> },
            { id: "dependencies", label: "Dependencies", icon: <GitFork className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchTerm("");
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-72">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          {activeTab === "features" && (
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Modules</option>
              {modules.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB: PLANS */}
      {/* ==================================================================== */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plansLoading ? (
            <div className="col-span-full py-12 text-center text-text-muted">Loading commercial plans...</div>
          ) : filteredPlans.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-muted">No plans found.</div>
          ) : (
            filteredPlans.map((plan) => (
              <div
                key={plan.code}
                className="p-5 bg-surface border border-border rounded-xl shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      {plan.tier}
                    </span>
                    <span className="text-xs font-mono text-text-muted">{plan.code}</span>
                  </div>

                  <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">{plan.description}</p>

                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                      <span>Included Features</span>
                      <span className="font-semibold text-text-primary">
                        {plan.planFeatures?.length || 0} features
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                      {plan.planFeatures?.map((pf) => (
                        <span
                          key={pf.featureKey}
                          className="px-2 py-0.5 bg-surface-secondary text-[11px] font-mono text-text-secondary rounded border border-border truncate"
                          title={pf.featureKey}
                        >
                          {pf.featureKey}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-end">
                    <button
                      onClick={() => openEditModal("PLAN", plan)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Configure Plan
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: MODULES */}
      {/* ==================================================================== */}
      {activeTab === "modules" && (
        <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary border-b border-border text-xs font-bold text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Module Code</th>
                  <th className="px-5 py-3">Name & Description</th>
                  <th className="px-5 py-3">Classification</th>
                  <th className="px-5 py-3">Features Count</th>
                  <th className="px-5 py-3">Status</th>
                  {canManage && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modulesLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-text-muted">
                      Loading modules...
                    </td>
                  </tr>
                ) : filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-text-muted">
                      No modules found.
                    </td>
                  </tr>
                ) : (
                  filteredModules.map((m) => (
                    <tr key={m.code} className="hover:bg-surface-secondary/50 transition">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-primary">{m.code}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-text-primary">{m.name}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{m.description}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            m.isShared
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                          }`}
                        >
                          {m.isShared ? "Shared Core" : "Vertical Module"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-text-primary">
                        {m._count?.features ?? 0} features
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            m.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => openEditModal("MODULE", m)}
                            className="p-1 text-text-muted hover:text-primary transition cursor-pointer"
                            title="Edit Module"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: FEATURES */}
      {/* ==================================================================== */}
      {activeTab === "features" && (
        <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary border-b border-border text-xs font-bold text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Canonical Key</th>
                  <th className="px-5 py-3">Feature Name & Description</th>
                  <th className="px-5 py-3">Module</th>
                  <th className="px-5 py-3">Core?</th>
                  <th className="px-5 py-3">Dependencies</th>
                  <th className="px-5 py-3">Status</th>
                  {canManage && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {featuresLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-text-muted">
                      Loading features...
                    </td>
                  </tr>
                ) : filteredFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-text-muted">
                      No features found.
                    </td>
                  </tr>
                ) : (
                  filteredFeatures.map((f) => (
                    <tr key={f.key} className="hover:bg-surface-secondary/50 transition">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-text-primary">{f.key}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-text-primary">{f.name}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{f.description}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-secondary text-text-secondary border border-border">
                          {f.module?.name || f.moduleCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {f.isCore ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            CORE
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {f.dependencies && f.dependencies.length > 0 ? (
                            f.dependencies.map((d) => (
                              <span
                                key={d.dependsOnKey}
                                className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 font-mono text-[10px]"
                                title={`Depends on: ${d.dependsOnKey}`}
                              >
                                ↳ {d.dependsOnKey}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-text-muted">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            f.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => openEditModal("FEATURE", f)}
                            className="p-1 text-text-muted hover:text-primary transition cursor-pointer"
                            title="Edit Feature"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: ADD-ONS */}
      {/* ==================================================================== */}
      {activeTab === "addons" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {addOnsLoading ? (
            <div className="col-span-full py-12 text-center text-text-muted">Loading add-ons...</div>
          ) : filteredAddOns.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-muted">No add-ons found.</div>
          ) : (
            filteredAddOns.map((addon) => (
              <div
                key={addon.code}
                className="p-5 bg-surface border border-border rounded-xl shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      ADD-ON
                    </span>
                    <span className="text-xs font-mono text-text-muted">{addon.code}</span>
                  </div>

                  <h3 className="text-lg font-bold text-text-primary">{addon.name}</h3>
                  <p className="text-xs text-text-secondary mt-1">{addon.description}</p>

                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="text-xs text-text-muted mb-2">Attached Features ({addon.addOnFeatures?.length || 0}):</div>
                    <div className="flex flex-wrap gap-1">
                      {addon.addOnFeatures?.map((af) => (
                        <span
                          key={af.featureKey}
                          className="px-2 py-0.5 bg-surface-secondary text-[11px] font-mono text-text-secondary rounded border border-border"
                        >
                          {af.featureKey}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-end">
                    <button
                      onClick={() => openEditModal("ADDON", addon)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Configure Add-On
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: VERTICALS */}
      {/* ==================================================================== */}
      {activeTab === "verticals" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {verticalsLoading ? (
            <div className="col-span-full py-12 text-center text-text-muted">Loading industry verticals...</div>
          ) : filteredVerticals.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-muted">No industry verticals found.</div>
          ) : (
            filteredVerticals.map((vert) => (
              <div
                key={vert.code}
                className="p-5 bg-surface border border-border rounded-xl shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                      VERTICAL PACK
                    </span>
                    <span className="text-xs font-mono text-text-muted">{vert.code}</span>
                  </div>

                  <h3 className="text-lg font-bold text-text-primary">{vert.name}</h3>
                  <p className="text-xs text-text-secondary mt-1">{vert.description}</p>

                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="text-xs text-text-muted mb-2">Vertical Features ({vert.verticalFeatures?.length || 0}):</div>
                    <div className="flex flex-wrap gap-1">
                      {vert.verticalFeatures?.map((vf) => (
                        <span
                          key={vf.featureKey}
                          className="px-2 py-0.5 bg-surface-secondary text-[11px] font-mono text-text-secondary rounded border border-border"
                        >
                          {vf.featureKey}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-end">
                    <button
                      onClick={() => openEditModal("VERTICAL", vert)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Configure Vertical
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: DEPENDENCIES */}
      {/* ==================================================================== */}
      {activeTab === "dependencies" && (
        <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-secondary/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-text-secondary">
                Feature dependencies prevent broken operational states. Circular dependencies are strictly rejected by the validator.
              </span>
            </div>
            {canManage && (
              <button
                onClick={() => openCreateModal("DEPENDENCY")}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Dependency
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary border-b border-border text-xs font-bold text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Dependent Feature</th>
                  <th className="px-5 py-3">Requires Target Feature</th>
                  <th className="px-5 py-3">Dependency Type</th>
                  {canManage && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allDependencies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-text-muted">
                      No feature dependencies defined.
                    </td>
                  </tr>
                ) : (
                  allDependencies.map((dep, idx) => (
                    <tr key={`${dep.featureKey}-${dep.dependsOnKey}-${idx}`} className="hover:bg-surface-secondary/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-xs font-bold text-text-primary">{dep.featureKey}</div>
                        <div className="text-[11px] text-text-secondary">{dep.featureName}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-xs font-bold text-blue-600">↳ {dep.dependsOnKey}</div>
                        <div className="text-[11px] text-text-secondary">{dep.dependsOnName}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          {dep.dependencyType}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleRemoveDependency(dep.featureKey, dep.dependsOnKey)}
                            disabled={removingDep}
                            className="p-1 text-text-muted hover:text-red-600 transition cursor-pointer"
                            title="Remove Dependency"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DIALOG */}
      {/* ==================================================================== */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-secondary">
              <h2 className="text-base font-bold text-text-primary">
                {editingItem ? `Edit ${modalType}` : `Create New ${modalType}`}
              </h2>
              <button
                onClick={() => setModalType(null)}
                className="text-text-muted hover:text-text-primary text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
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

              {modalType === "DEPENDENCY" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Dependent Feature (Feature Key)
                    </label>
                    <select
                      value={depFeatureKey}
                      onChange={(e) => setDepFeatureKey(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary font-mono text-xs"
                      required
                    >
                      {features.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.key} ({f.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Required Target Feature (Depends On)
                    </label>
                    <select
                      value={depDependsOnKey}
                      onChange={(e) => setDepDependsOnKey(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary font-mono text-xs"
                      required
                    >
                      {features.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.key} ({f.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Dependency Constraint Type
                    </label>
                    <select
                      value={depType}
                      onChange={(e) => setDepType(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="REQUIRED">REQUIRED (Strict Enforcement)</option>
                      <option value="RECOMMENDED">RECOMMENDED</option>
                      <option value="OPTIONAL">OPTIONAL</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      {modalType === "FEATURE" ? "Canonical Feature Key" : "Entity Code"}
                    </label>
                    <input
                      type="text"
                      disabled={!!editingItem}
                      value={codeField}
                      onChange={(e) => setCodeField(e.target.value)}
                      placeholder={
                        modalType === "FEATURE"
                          ? "pos.checkout.cash (lowercase dot-separated)"
                          : modalType === "MODULE"
                          ? "pos, inventory"
                          : "PLAN_PRO, ADDON_KDS"
                      }
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary font-mono disabled:opacity-60"
                      required
                    />
                    <p className="text-[11px] text-text-muted mt-1">
                      {modalType === "FEATURE"
                        ? "Must follow canonical pattern: <module>.<subdomain>.<action>"
                        : "Unique identifier across commercial catalog."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Display Name</label>
                    <input
                      type="text"
                      value={nameField}
                      onChange={(e) => setNameField(e.target.value)}
                      placeholder="e.g. Cash Checkout, Pro Plan, Kitchen Display"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  {modalType === "PLAN" && (
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Commercial Tier</label>
                      <select
                        value={tierField}
                        onChange={(e) => setTierField(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                      >
                        <option value="FREE">FREE</option>
                        <option value="STARTER">STARTER</option>
                        <option value="PRO">PRO</option>
                        <option value="BUSINESS">BUSINESS</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </div>
                  )}

                  {modalType === "FEATURE" && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-text-primary mb-1">Parent Module</label>
                        <select
                          value={moduleCodeField}
                          onChange={(e) => setModuleCodeField(e.target.value)}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                        >
                          {modules.map((m) => (
                            <option key={m.code} value={m.code}>
                              {m.name} ({m.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="isCore"
                          checked={isCoreField}
                          onChange={(e) => setIsCoreField(e.target.checked)}
                          className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                        />
                        <label htmlFor="isCore" className="text-xs font-semibold text-text-primary cursor-pointer">
                          Mark as Essential Core Feature
                        </label>
                      </div>
                    </>
                  )}

                  {modalType === "MODULE" && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isShared"
                        checked={isSharedField}
                        onChange={(e) => setIsSharedField(e.target.checked)}
                        className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                      />
                      <label htmlFor="isShared" className="text-xs font-semibold text-text-primary cursor-pointer">
                        Shared Core Module (Available across all industry verticals)
                      </label>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={descField}
                      onChange={(e) => setDescField(e.target.value)}
                      placeholder="Operational description or value proposition"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                    />
                  </div>

                  {(modalType === "PLAN" || modalType === "ADDON" || modalType === "VERTICAL") && (
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">
                        Attached Feature Capabilities ({selectedFeatures.length} selected)
                      </label>
                      <div className="max-h-44 overflow-y-auto p-2 bg-surface-secondary border border-border rounded-lg space-y-1.5">
                        {features.map((f) => {
                          const isChecked = selectedFeatures.includes(f.key);
                          return (
                            <label
                              key={f.key}
                              className="flex items-start gap-2 p-1.5 rounded hover:bg-surface cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFeatures([...selectedFeatures, f.key]);
                                  } else {
                                    setSelectedFeatures(selectedFeatures.filter((k) => k !== f.key));
                                  }
                                }}
                                className="mt-0.5 w-3.5 h-3.5 rounded text-primary border-border focus:ring-primary"
                              />
                              <div>
                                <div className="font-mono font-bold text-[11px] text-text-primary">{f.key}</div>
                                <div className="text-[10px] text-text-secondary">{f.name}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 bg-surface-secondary hover:bg-surface border border-border text-text-secondary rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    creatingPlan ||
                    updatingPlan ||
                    creatingModule ||
                    updatingModule ||
                    creatingFeature ||
                    updatingFeature ||
                    addingDep ||
                    creatingAddOn ||
                    updatingAddOn ||
                    creatingVertical ||
                    updatingVertical
                  }
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {editingItem ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
