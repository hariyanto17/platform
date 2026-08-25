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

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardOverview: builder.query<ApiResponse<DashboardOverviewData>, void>({
      query: () => "/api/dashboard/overview",
    }),
  }),
});

export const { useGetDashboardOverviewQuery } = dashboardApi;
