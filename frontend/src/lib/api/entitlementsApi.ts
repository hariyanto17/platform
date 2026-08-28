import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface GrantSource {
  type: "PLAN" | "ADD_ON" | "VERTICAL" | "CUSTOM";
  code: string;
  name?: string;
  grantId?: string;
}

export interface EffectiveFeatureDetail {
  key: string;
  name: string;
  moduleCode: string;
  isCore: boolean;
  active: boolean;
  sources: GrantSource[];
  isRevoked: boolean;
  missingDependencies?: string[];
}

export interface ResolvedEntitlements {
  organizationId: string;
  organizationName: string;
  subscriptionId: string | null;
  planCode: string | null;
  subscriptionStatus: string | null;
  effectiveFeatures: string[];
  featureDetails: Record<string, EffectiveFeatureDetail>;
  revokedFeatures: string[];
  totalEffective: number;
  totalRevoked: number;
}

export interface RawEntitlementGrant {
  id: string;
  organizationId: string;
  featureKey: string;
  grantType: string;
  grantSourceCode: string | null;
  status: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  notes: string | null;
  createdAt: string;
  feature?: {
    key: string;
    name: string;
    moduleCode: string;
  };
}

export const entitlementsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEffectiveEntitlements: builder.query<ApiResponse<ResolvedEntitlements>, { organizationId?: string } | void>({
      query: (params) => ({
        url: "/api/entitlements",
        params: params || undefined,
      }),
      providesTags: ["Entitlement"],
    }),

    getOrganizationEntitlements: builder.query<ApiResponse<ResolvedEntitlements>, string>({
      query: (organizationId) => `/api/entitlements/organizations/${organizationId}`,
      providesTags: (result, error, id) => [{ type: "Entitlement", id }],
    }),

    getOrganizationGrants: builder.query<ApiResponse<RawEntitlementGrant[]>, string>({
      query: (organizationId) => `/api/entitlements/organizations/${organizationId}/grants`,
      providesTags: (result, error, id) => [{ type: "Entitlement", id: `GRANTS_${id}` }],
    }),

    grantCustomEntitlement: builder.mutation<
      ApiResponse<ResolvedEntitlements>,
      { organizationId: string; body: { featureKey: string; effectiveUntil?: string | null; notes?: string } }
    >({
      query: ({ organizationId, body }) => ({
        url: `/api/entitlements/organizations/${organizationId}/grant`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Entitlement"],
    }),

    revokeEntitlement: builder.mutation<
      ApiResponse<ResolvedEntitlements>,
      { organizationId: string; body: { featureKey: string; notes?: string } }
    >({
      query: ({ organizationId, body }) => ({
        url: `/api/entitlements/organizations/${organizationId}/revoke`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Entitlement"],
    }),

    removeOverride: builder.mutation<ApiResponse<ResolvedEntitlements>, { organizationId: string; featureKey: string }>({
      query: ({ organizationId, featureKey }) => ({
        url: `/api/entitlements/organizations/${organizationId}/override/${featureKey}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Entitlement"],
    }),
  }),
});

export const {
  useGetEffectiveEntitlementsQuery,
  useGetOrganizationEntitlementsQuery,
  useGetOrganizationGrantsQuery,
  useGrantCustomEntitlementMutation,
  useRevokeEntitlementMutation,
  useRemoveOverrideMutation,
} = entitlementsApi;
