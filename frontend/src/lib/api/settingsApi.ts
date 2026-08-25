import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  valueType: "STRING" | "INTEGER" | "BOOLEAN" | "DECIMAL" | "JSON";
  category: "GENERAL" | "SECURITY" | "SESSION" | "APPLICATION" | "FEATURE" | "GOVERNANCE";
  scope: "GLOBAL" | "APPLICATION" | "ORGANIZATION";
  scopeId: string;
  description: string | null;
  isSensitive: boolean;
  isEditable: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface SettingsFilters {
  category?: string;
  scope?: string;
  scopeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EffectiveSetting extends AppSetting {
  inherited: boolean;
  effectiveScope: "GLOBAL" | "APPLICATION" | "ORGANIZATION";
}

export interface SettingPreviewResult {
  key: string;
  scope: string;
  scopeId: string;
  currentEffectiveValue: string;
  currentEffectiveScope: string;
  proposedValue: string;
  willChange: boolean;
}

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<ApiResponse<AppSetting[]>, SettingsFilters>({
      query: (filters) => ({
        url: "/api/settings",
        params: filters,
      }),
      providesTags: ["Settings"],
    }),
    getSetting: builder.query<ApiResponse<EffectiveSetting>, { key: string; orgId?: string; appCode?: string }>({
      query: ({ key, orgId, appCode }) => ({
        url: `/api/settings/${key}`,
        params: { orgId, appCode },
      }),
      providesTags: (result, error, { key }) => [{ type: "Settings" as const, id: key }],
    }),
    previewSetting: builder.query<ApiResponse<SettingPreviewResult>, { key: string; proposedValue: string; scope: string; scopeId?: string }>({
      query: ({ key, proposedValue, scope, scopeId }) => ({
        url: `/api/settings/${key}/preview`,
        params: { proposedValue, scope, scopeId },
      }),
    }),
    updateSetting: builder.mutation<ApiResponse<AppSetting>, { key: string; value: string; scope: string; scopeId?: string; reason?: string }>({
      query: ({ key, ...body }) => ({
        url: `/api/settings/${key}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { key }) => ["Settings", { type: "Settings" as const, id: key }],
    }),
    resetSetting: builder.mutation<ApiResponse<EffectiveSetting>, { key: string; scope: string; scopeId?: string }>({
      query: ({ key, scope, scopeId }) => ({
        url: `/api/settings/${key}`,
        method: "DELETE",
        params: { scope, scopeId },
      }),
      invalidatesTags: (result, error, { key }) => ["Settings", { type: "Settings" as const, id: key }],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useGetSettingQuery,
  usePreviewSettingQuery,
  useUpdateSettingMutation,
  useResetSettingMutation,
} = settingsApi;
