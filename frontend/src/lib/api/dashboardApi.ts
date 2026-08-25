import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface DashboardOverviewData {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  totalOrgs: number;
  totalApps: number;
  totalAccesses: number;
  recentLogs: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    } | null;
  }>;
  applications: Array<{
    code: string;
    name: string;
    description: string | null;
    status: string;
    userCount: number;
  }>;
}

export interface OperationsOverviewData {
  date: string;
  currency: string;
  summary: {
    totalRevenue: number;
    totalTransactions: number;
  };
  ticketing: {
    status: "CONNECTED" | "UNAVAILABLE";
    revenue: number;
    ticketsSold: number;
    transactions: number;
    averageTransaction: number;
  };
  concession: {
    status: "CONNECTED" | "UNAVAILABLE";
    revenue: number;
    transactions: number;
    itemsSold: number;
    averageTransaction: number;
  };
}

export interface DashboardActivity {
  id: string;
  source: "PLATFORM" | "CONCESSION" | "TICKETING";
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  status?: string;
  amount?: number;
  referenceId?: string;
  user?: {
    id?: string;
    name?: string;
  };
}

export interface DashboardActivityResponse {
  activities: DashboardActivity[];
  concessionStatus: "CONNECTED" | "UNAVAILABLE";
  ticketingStatus: "CONNECTED" | "UNAVAILABLE";
}

export interface DashboardTransaction {
  id: string;
  source: "CONCESSION" | "TICKETING";
  transactionNumber: string;
  status: string;
  amount: number;
  currency: string;
  itemCount: number;
  timestamp: string;
  customerName?: string;
  cashierName?: string;
}

export interface DashboardTransactionsResponse {
  transactions: DashboardTransaction[];
  concessionStatus: "CONNECTED" | "UNAVAILABLE";
  ticketingStatus: "CONNECTED" | "UNAVAILABLE";
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TransactionsQueryFilters {
  page?: number;
  limit?: number;
  date?: string;
  status?: string;
  application?: string;
  search?: string;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardOverview: builder.query<ApiResponse<DashboardOverviewData>, void>({
      query: () => "/api/dashboard/overview",
    }),
    getDashboardOperations: builder.query<ApiResponse<OperationsOverviewData>, string | void>({
      query: (date) => ({
        url: "/api/dashboard/operations",
        params: date ? { date } : undefined,
      }),
    }),
    getDashboardActivity: builder.query<ApiResponse<DashboardActivityResponse>, void>({
      query: () => "/api/dashboard/activity",
    }),
    getDashboardTransactions: builder.query<ApiResponse<DashboardTransactionsResponse>, TransactionsQueryFilters>({
      query: (filters) => ({
        url: "/api/dashboard/transactions",
        params: filters,
      }),
    }),
  }),
});

export const {
  useGetDashboardOverviewQuery,
  useGetDashboardOperationsQuery,
  useGetDashboardActivityQuery,
  useGetDashboardTransactionsQuery,
} = dashboardApi;
