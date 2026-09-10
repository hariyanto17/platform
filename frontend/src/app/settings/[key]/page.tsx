"use client";

import React, { useState, use } from "react";
import {
  useGetSettingQuery,
  useUpdateSettingMutation,
  useResetSettingMutation,
} from "@/lib/api/settingsApi";
import { useListOrganizationsQuery } from "@/lib/api/organizationsApi";
import { useListApplicationsQuery } from "@/lib/api/applicationsApi";
import { useListAuditLogsQuery } from "@/lib/api/auditLogsApi";
import {
  ArrowLeft,
  Layers,
  AlertTriangle,
  RotateCcw,
  Save,
  CheckCircle2,
  Loader2,
  History,
  Building,
  Tv
} from "lucide-react";
import Link from "next/link";

export default function SettingDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const resolvedParams = use(params);
  const settingKey = decodeURIComponent(resolvedParams.key);

  // Scope selection
  const [selectedScope, setSelectedScope] = useState<"GLOBAL" | "ORGANIZATION" | "APPLICATION">("GLOBAL");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedAppCode, setSelectedAppCode] = useState<string>("");

  // Editor states
  const [inputValue, setInputValue] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const {
    data: settingResponse,
    isLoading: settingLoading,
    refetch: refetchSetting
  } = useGetSettingQuery({
    key: settingKey,
    orgId: selectedScope === "ORGANIZATION" ? selectedOrgId : undefined,
    appCode: selectedScope === "APPLICATION" ? selectedAppCode : undefined,
  });

  const { data: orgsResponse } = useListOrganizationsQuery({ page: 1, limit: 100 });
  const { data: appsResponse } = useListApplicationsQuery();
  const { data: auditsResponse } = useListAuditLogsQuery({ page: 1, limit: 50 });

  const [updateSetting, { isLoading: isUpdating }] = useUpdateSettingMutation();
  const [resetSetting, { isLoading: isResetting }] = useResetSettingMutation();

  const setting = settingResponse?.data;
  const rawOrgs = orgsResponse?.data;
  const organizations: Array<{ id: string; name: string; code: string }> = Array.isArray(rawOrgs)
    ? rawOrgs
    : rawOrgs && "items" in rawOrgs
    ? rawOrgs.items
    : [];
  const applications = appsResponse?.data || [];
  const auditLogs = auditsResponse?.data || [];

  // Filter audits for this setting
  const settingAudits = auditLogs.filter(
    (log) =>
      log.action.includes("SETTING") &&
      (log.entityId === setting?.id || JSON.stringify(log.payload || {}).includes(settingKey))
  );

  const handleApplyClick = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!inputValue && inputValue !== "0") {
      setErrorMessage("Value cannot be empty.");
      return;
    }

    if (selectedScope === "ORGANIZATION" && !selectedOrgId) {
      setErrorMessage("Please select a target organization for this override.");
      return;
    }

    if (selectedScope === "APPLICATION" && !selectedAppCode) {
      setErrorMessage("Please select a target application for this override.");
      return;
    }

    // If sensitive or security category, show confirmation dialog
    if (setting?.isSensitive || setting?.category === "SECURITY") {
      setShowConfirmModal(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    try {
      setShowConfirmModal(false);
      setErrorMessage(null);

      const targetScopeId =
        selectedScope === "ORGANIZATION"
          ? selectedOrgId
          : selectedScope === "APPLICATION"
          ? selectedAppCode
          : "";

      await updateSetting({
        key: settingKey,
        value: inputValue,
        scope: selectedScope,
        scopeId: targetScopeId,
        reason: reason || undefined,
      }).unwrap();

      setSuccessMessage("Setting updated successfully!");
      setReason("");
      refetchSetting();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string } };
      setErrorMessage(errorObj.data?.message || "Failed to update setting.");
    }
  };

  const handleResetOverride = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      const targetScopeId =
        selectedScope === "ORGANIZATION"
          ? selectedOrgId
          : selectedScope === "APPLICATION"
          ? selectedAppCode
          : "";

      await resetSetting({
        key: settingKey,
        scope: selectedScope,
        scopeId: targetScopeId,
      }).unwrap();

      setSuccessMessage("Override removed. Configuration restored to inherited default.");
      refetchSetting();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string } };
      setErrorMessage(errorObj.data?.message || "Failed to reset override.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-100 font-mono">{settingKey}</h1>
            {setting?.category && (
              <span className="text-[9px] font-black uppercase tracking-wider bg-slate-900 border border-slate-800 text-indigo-400 px-2 py-0.5 rounded">
                {setting.category}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{setting?.description || "Platform configuration parameter."}</p>
        </div>
      </div>

      {/* Scope Target Selection Bar */}
      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-3">
        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
          Configuration Resolution Scope
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedScope("GLOBAL");
              setSelectedOrgId("");
              setSelectedAppCode("");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedScope === "GLOBAL"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Global Scope (Default)
          </button>

          <button
            onClick={() => setSelectedScope("ORGANIZATION")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedScope === "ORGANIZATION"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Organization Override
          </button>

          <button
            onClick={() => setSelectedScope("APPLICATION")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedScope === "APPLICATION"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Application Override
          </button>
        </div>

        {/* Dynamic target pickers */}
        {selectedScope === "ORGANIZATION" && (
          <div className="pt-2">
            <label className="text-xs text-slate-400 block mb-1">Target Organization:</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none w-full max-w-sm"
            >
              <option value="">-- Select Organization --</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedScope === "APPLICATION" && (
          <div className="pt-2">
            <label className="text-xs text-slate-400 block mb-1">Target Application:</label>
            <select
              value={selectedAppCode}
              onChange={(e) => setSelectedAppCode(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none w-full max-w-sm"
            >
              <option value="">-- Select Application --</option>
              {applications.map((app) => (
                <option key={app.id} value={app.code}>
                  {app.name} ({app.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Configuration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Effective Configuration
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                {settingLoading ? (
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                ) : (
                  <>
                    <span className="text-2xl font-black font-mono text-slate-100">
                      {setting?.isSensitive ? "••••••••" : setting?.value}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({setting?.inherited ? "Inherited from Global" : `Overridden at ${setting?.effectiveScope}`})
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Reset Override Button */}
            {!setting?.inherited && selectedScope !== "GLOBAL" && (
              <button
                disabled={isResetting}
                onClick={handleResetOverride}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/40 text-rose-400 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Override
              </button>
            )}
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg text-xs text-rose-400 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-xs text-emerald-400 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Form Input */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                New Value ({setting?.valueType || "STRING"}):
              </label>
              <input
                type={setting?.isSensitive ? "password" : "text"}
                placeholder={`Enter new ${setting?.valueType || "value"}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Audit Reason / Context (Optional):
              </label>
              <input
                type="text"
                placeholder="E.g. Security policy adjustment for branch expansion"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
              />
            </div>

            <button
              disabled={isUpdating}
              onClick={handleApplyClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration Change
            </button>
          </div>
        </div>

        {/* Setting Attributes & Metadata Info Card */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs uppercase font-black text-slate-400 tracking-wider">Setting Metadata</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-500">Value Type:</span>
              <span className="font-mono text-slate-300 font-bold">{setting?.valueType || "STRING"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-500">Category:</span>
              <span className="text-slate-300 font-bold">{setting?.category || "GENERAL"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-500">Sensitive Secret:</span>
              <span className={`font-bold ${setting?.isSensitive ? "text-amber-400" : "text-slate-400"}`}>
                {setting?.isSensitive ? "Yes (Masked)" : "No"}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-500">Editable:</span>
              <span className="text-slate-300 font-bold">{setting?.isEditable ? "Yes" : "Read-Only"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-2">
              <span className="text-slate-500">Last Modified:</span>
              <span className="font-mono text-[10px] text-slate-400">
                {setting?.updatedAt ? new Date(setting.updatedAt).toLocaleString("id-ID", { hour12: false }) : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Change History Section */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-xs uppercase font-black text-slate-400 tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          Configuration Audit History
        </h3>

        {settingAudits.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No audit modifications recorded for this specific setting key yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-black text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {settingAudits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-slate-800/10">
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                      {new Date(audit.createdAt).toLocaleString("id-ID", { hour12: false })}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-100">{audit.action}</td>
                    <td className="py-2.5 px-3">{audit.user?.email || "System"}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400 truncate max-w-sm">
                      {JSON.stringify(audit.payload || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-slate-100">Security Configuration Confirmation</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are updating a security-sensitive platform configuration (<span className="font-mono font-bold text-indigo-400">{settingKey}</span>). This change affects authentication policies and active administrator sessions across the selected scope (<span className="font-bold">{selectedScope}</span>).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isUpdating}
                onClick={executeSave}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-amber-600/30 cursor-pointer flex items-center gap-1.5"
              >
                {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Apply Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
