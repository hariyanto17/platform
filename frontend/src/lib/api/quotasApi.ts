import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface QuotaGrantSource {
  type: "PLAN" | "ADD_ON" | "CUSTOM";
  code: string;
  name?: string;
  quantity?: number | null;
  isUnlimited?: boolean;
  overrideMode?: "ADD" | "REPLACE";
}

export interface EffectiveQuotaDetail {
  resourceCode: string;
  name: string;
  description: string | null;
  limitType: "HARD_LIMIT" | "SOFT_LIMIT" | "FAIR_USE";
  unit: string;
  measurementType: "GAUGE" | "COUNTER";
  isUnlimited: boolean;
  allocated: number | null;
  used: number;
  remaining: number | null;
  overage: number;
  percentageUsed: number | null;
  period: string;
  enforceable: boolean;
  status: "HEALTHY" | "NEAR_LIMIT" | "LIMIT_REACHED" | "OVERAGE";
  sources: QuotaGrantSource[];
  lastRecordedAt?: string;
}

export interface ResolvedEffectiveQuotas {
  organizationId: string;
  organizationName: string;
  subscriptionId: string | null;
  planCode: string | null;
  subscriptionStatus: string | null;
  period: string;
  quotas: Record<string, EffectiveQuotaDetail>;
  quotaList: EffectiveQuotaDetail[];
  totalResources: number;
  nearLimitCount: number;
  hardLimitViolationsCount: number;
  totalOverageCount: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  resourceCode: string;
  limitType: "HARD_LIMIT" | "SOFT_LIMIT" | "FAIR_USE";
  isUnlimited: boolean;
  effectiveLimit: number | null;
  currentUsage: number;
  requestedAmount: number;
  projectedUsage: number;
  remaining: number | null;
  overage: number;
  status: "ALLOWED" | "REJECTED_HARD_LIMIT" | "ALLOWED_WITH_OVERAGE";
  reason?: string;
}

export interface QuotaUsageRecord {
  id: string;
  organizationId: string;
  resourceCode: string;
  period: string;
  quantity: number | string;
  lastRecordedAt: string;
  metadata?: Record<string, any>;
  resource?: {
    code: string;
    name: string;
    unit: string;
    limitType: string;
  };
}

export const quotasApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEffectiveQuotas: builder.query<
      ApiResponse<ResolvedEffectiveQuotas>,
      { organizationId?: string; period?: string } | void
    >({
      query: (params) => ({
        url: "/api/quotas",
        params: params || undefined,
      }),
      providesTags: ["Quota"],
    }),

    getOrganizationQuotas: builder.query<
      ApiResponse<ResolvedEffectiveQuotas>,
      { organizationId: string; period?: string }
    >({
      query: ({ organizationId, period }) => ({
        url: `/api/quotas/organizations/${organizationId}`,
        params: period ? { period } : undefined,
      }),
      providesTags: (result, error, arg) => [{ type: "Quota", id: arg.organizationId }],
    }),

    getQuotaUsageHistory: builder.query<
      ApiResponse<QuotaUsageRecord[]>,
      { organizationId?: string; resourceCode?: string; period?: string } | void
    >({
      query: (params) => ({
        url: "/api/quotas/usage",
        params: params || undefined,
      }),
      providesTags: ["Quota"],
    }),

    checkQuota: builder.mutation<
      ApiResponse<QuotaCheckResult>,
      { organizationId?: string; resourceCode: string; requestedAmount?: number; period?: string }
    >({
      query: (body) => ({
        url: "/api/quotas/check",
        method: "POST",
        body,
      }),
    }),

    recordUsage: builder.mutation<
      ApiResponse<QuotaUsageRecord>,
      { organizationId: string; resourceCode: string; quantity: number; mode?: "SET" | "INCREMENT"; period?: string }
    >({
      query: (body) => ({
        url: "/api/quotas/usage",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Quota"],
    }),

    setTenantQuotaOverride: builder.mutation<
      ApiResponse<ResolvedEffectiveQuotas>,
      {
        organizationId: string;
        body: {
          resourceCode: string;
          quantity?: number | null;
          isUnlimited?: boolean;
          overrideMode?: "ADD" | "REPLACE";
          effectiveUntil?: string | null;
          notes?: string;
        };
      }
    >({
      query: ({ organizationId, body }) => ({
        url: `/api/quotas/organizations/${organizationId}/override`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Quota"],
    }),

    removeTenantQuotaOverride: builder.mutation<
      ApiResponse<ResolvedEffectiveQuotas>,
      { organizationId: string; resourceCode: string }
    >({
      query: ({ organizationId, resourceCode }) => ({
        url: `/api/quotas/organizations/${organizationId}/override/${resourceCode}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Quota"],
    }),
  }),
});

export const {
  useGetEffectiveQuotasQuery,
  useGetOrganizationQuotasQuery,
  useGetQuotaUsageHistoryQuery,
  useCheckQuotaMutation,
  useRecordUsageMutation,
  useSetTenantQuotaOverrideMutation,
  useRemoveTenantQuotaOverrideMutation,
} = quotasApi;
