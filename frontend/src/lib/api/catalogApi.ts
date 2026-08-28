import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface CatalogOverviewData {
  plansCount: number;
  modulesCount: number;
  featuresCount: number;
  addOnsCount: number;
  verticalsCount: number;
}

export interface CatalogModuleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isShared: boolean;
  status: "ACTIVE" | "DISABLED";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    features: number;
  };
}

export interface CatalogFeatureItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  moduleCode: string;
  isCore: boolean;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
  module?: {
    code: string;
    name: string;
  };
  dependencies?: Array<{
    dependsOnKey: string;
    dependencyType: string;
    dependsOn: {
      key: string;
      name: string;
    };
  }>;
  requiredBy?: Array<{
    featureKey: string;
    feature: {
      key: string;
      name: string;
    };
  }>;
  _count?: {
    planFeatures: number;
    addOnFeatures: number;
    verticalFeatures: number;
  };
}

export interface CatalogPlanItem {
  id: string;
  code: string;
  name: string;
  tier: "FREE" | "STARTER" | "PRO" | "BUSINESS" | "ENTERPRISE";
  description: string | null;
  status: "ACTIVE" | "DISABLED" | "ARCHIVED";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  planFeatures?: Array<{
    featureKey: string;
    feature: {
      key: string;
      name: string;
      moduleCode: string;
      isCore: boolean;
      status: string;
    };
  }>;
}

export interface CatalogAddOnItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "DISABLED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  addOnFeatures?: Array<{
    featureKey: string;
    feature: {
      key: string;
      name: string;
      moduleCode: string;
    };
  }>;
}

export interface CatalogVerticalItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "DISABLED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  verticalFeatures?: Array<{
    featureKey: string;
    feature: {
      key: string;
      name: string;
      moduleCode: string;
    };
  }>;
}

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCatalogOverview: builder.query<ApiResponse<CatalogOverviewData>, void>({
      query: () => "/api/catalog/overview",
      providesTags: ["CatalogOverview"],
    }),

    // MODULES
    getModules: builder.query<ApiResponse<CatalogModuleItem[]>, void>({
      query: () => "/api/catalog/modules",
      providesTags: ["CatalogModule"],
    }),
    createModule: builder.mutation<ApiResponse<CatalogModuleItem>, Partial<CatalogModuleItem>>({
      query: (body) => ({
        url: "/api/catalog/modules",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CatalogModule", "CatalogOverview"],
    }),
    updateModule: builder.mutation<ApiResponse<CatalogModuleItem>, { code: string; data: Partial<CatalogModuleItem> }>({
      query: ({ code, data }) => ({
        url: `/api/catalog/modules/${code}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["CatalogModule"],
    }),

    // FEATURES
    getFeatures: builder.query<ApiResponse<CatalogFeatureItem[]>, { moduleCode?: string; status?: string } | void>({
      query: (params) => ({
        url: "/api/catalog/features",
        params: params || undefined,
      }),
      providesTags: ["CatalogFeature"],
    }),
    createFeature: builder.mutation<ApiResponse<CatalogFeatureItem>, any>({
      query: (body) => ({
        url: "/api/catalog/features",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CatalogFeature", "CatalogOverview", "CatalogModule"],
    }),
    updateFeature: builder.mutation<ApiResponse<CatalogFeatureItem>, { key: string; data: any }>({
      query: ({ key, data }) => ({
        url: `/api/catalog/features/${key}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["CatalogFeature", "CatalogPlan", "CatalogAddOn", "CatalogVertical"],
    }),

    // DEPENDENCIES
    addFeatureDependency: builder.mutation<ApiResponse<any>, { featureKey: string; dependsOnKey: string; dependencyType?: string }>({
      query: (body) => ({
        url: "/api/catalog/dependencies",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CatalogFeature"],
    }),
    removeFeatureDependency: builder.mutation<ApiResponse<any>, { featureKey: string; dependsOnKey: string }>({
      query: ({ featureKey, dependsOnKey }) => ({
        url: `/api/catalog/dependencies/${featureKey}/${dependsOnKey}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CatalogFeature"],
    }),

    // PLANS
    getPlans: builder.query<ApiResponse<CatalogPlanItem[]>, void>({
      query: () => "/api/catalog/plans",
      providesTags: ["CatalogPlan"],
    }),
    createPlan: builder.mutation<ApiResponse<CatalogPlanItem>, any>({
      query: (body) => ({
        url: "/api/catalog/plans",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CatalogPlan", "CatalogOverview"],
    }),
    updatePlan: builder.mutation<ApiResponse<CatalogPlanItem>, { code: string; data: any }>({
      query: ({ code, data }) => ({
        url: `/api/catalog/plans/${code}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["CatalogPlan"],
    }),

    // ADD-ONS
    getAddOns: builder.query<ApiResponse<CatalogAddOnItem[]>, void>({
      query: () => "/api/catalog/addons",
      providesTags: ["CatalogAddOn"],
    }),
    createAddOn: builder.mutation<ApiResponse<CatalogAddOnItem>, any>({
      query: (body) => ({
        url: "/api/catalog/addons",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CatalogAddOn", "CatalogOverview"],
    }),
    updateAddOn: builder.mutation<ApiResponse<CatalogAddOnItem>, { code: string; data: any }>({
      query: ({ code, data }) => ({
        url: `/api/catalog/addons/${code}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["CatalogAddOn"],
    }),

    // VERTICALS
    getVerticals: builder.query<ApiResponse<CatalogVerticalItem[]>, void>({
      query: () => "/api/catalog/verticals",
      providesTags: ["CatalogVertical"],
    }),
    createVertical: builder.mutation<ApiResponse<CatalogVerticalItem>, any>({
      query: (body) => ({
        url: "/api/catalog/verticals",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CatalogVertical", "CatalogOverview"],
    }),
    updateVertical: builder.mutation<ApiResponse<CatalogVerticalItem>, { code: string; data: any }>({
      query: ({ code, data }) => ({
        url: `/api/catalog/verticals/${code}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["CatalogVertical"],
    }),
  }),
});

export const {
  useGetCatalogOverviewQuery,
  useGetModulesQuery,
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useGetFeaturesQuery,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
  useAddFeatureDependencyMutation,
  useRemoveFeatureDependencyMutation,
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useGetAddOnsQuery,
  useCreateAddOnMutation,
  useUpdateAddOnMutation,
  useGetVerticalsQuery,
  useCreateVerticalMutation,
  useUpdateVerticalMutation,
} = catalogApi;
