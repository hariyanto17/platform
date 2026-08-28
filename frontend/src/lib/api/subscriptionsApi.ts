import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface SubscriptionPlanPrice {
  id: string;
  planCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  amount: number | string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  plan?: {
    code: string;
    name: string;
    tier: string;
  };
}

export interface SubscriptionAddOnPrice {
  id: string;
  addOnCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  amount: number | string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  addOn?: {
    code: string;
    name: string;
  };
}

export interface SubscriptionItemData {
  id: string;
  subscriptionId: string;
  addOnCode: string;
  quantity: number;
  unitPrice: number | string;
  currency: string;
  createdAt: string;
  addOn?: {
    code: string;
    name: string;
  };
}

export interface SubscriptionDetailData {
  id: string;
  organizationId: string;
  planCode: string;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED" | "EXPIRED";
  billingCycle: "MONTHLY" | "YEARLY";
  planPriceAmount: number | string;
  currency: string;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
  plan?: {
    code: string;
    name: string;
    tier: string;
    planFeatures?: Array<{
      feature: {
        key: string;
        name: string;
        moduleCode: string;
      };
    }>;
  };
  items?: SubscriptionItemData[];
}

export interface AllPricesResponse {
  planPrices: SubscriptionPlanPrice[];
  addOnPrices: SubscriptionAddOnPrice[];
}

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptions: builder.query<
      ApiResponse<SubscriptionDetailData[]>,
      { organizationId?: string; status?: string; planCode?: string } | void
    >({
      query: (params) => ({
        url: "/api/subscriptions",
        params: params || undefined,
      }),
      providesTags: ["Subscription"],
    }),

    getSubscriptionById: builder.query<ApiResponse<SubscriptionDetailData>, string>({
      query: (id) => `/api/subscriptions/${id}`,
      providesTags: (result, error, id) => [{ type: "Subscription", id }],
    }),

    createSubscription: builder.mutation<ApiResponse<SubscriptionDetailData>, any>({
      query: (body) => ({
        url: "/api/subscriptions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Subscription"],
    }),

    updateSubscription: builder.mutation<ApiResponse<SubscriptionDetailData>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/api/subscriptions/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Subscription", id }, "Subscription"],
    }),

    addSubscriptionItem: builder.mutation<
      ApiResponse<SubscriptionDetailData>,
      { id: string; body: { addOnCode: string; quantity: number } }
    >({
      query: ({ id, body }) => ({
        url: `/api/subscriptions/${id}/items`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Subscription", id }, "Subscription"],
    }),

    removeSubscriptionItem: builder.mutation<ApiResponse<any>, { id: string; itemId: string }>({
      query: ({ id, itemId }) => ({
        url: `/api/subscriptions/${id}/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Subscription", id }, "Subscription"],
    }),

    getPrices: builder.query<ApiResponse<AllPricesResponse>, void>({
      query: () => "/api/subscriptions/prices",
      providesTags: ["SubscriptionPrice"],
    }),

    createPlanPrice: builder.mutation<ApiResponse<SubscriptionPlanPrice>, any>({
      query: (body) => ({
        url: "/api/subscriptions/prices/plan",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SubscriptionPrice"],
    }),

    createAddOnPrice: builder.mutation<ApiResponse<SubscriptionAddOnPrice>, any>({
      query: (body) => ({
        url: "/api/subscriptions/prices/addon",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SubscriptionPrice"],
    }),
  }),
});

export const {
  useGetSubscriptionsQuery,
  useGetSubscriptionByIdQuery,
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
  useAddSubscriptionItemMutation,
  useRemoveSubscriptionItemMutation,
  useGetPricesQuery,
  useCreatePlanPriceMutation,
  useCreateAddOnPriceMutation,
} = subscriptionsApi;
