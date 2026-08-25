import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface DashboardOverviewData {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  totalOrgs: number;
  activeOrgs: number;
  totalApps: number;
  activeApps: number;
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

export interface DashboardAnalyticsData {
  period: { startDate: string; endDate: string };
  comparison: { startDate: string; endDate: string } | null;
  summary: {
    revenue: number | null;
    revenueChange: number | null;
    transactions: number | null;
    transactionsChange: number | null;
    ticketsSold: number | null;
    ticketsSoldChange: number | null;
    concessionItemsSold: number | null;
    concessionItemsSoldChange: number | null;
    averageTransactionValue: number | null;
    averageTransactionValueChange: number | null;
  };
  applications: {
    ticketing: {
      revenue: number | null;
      transactions: number | null;
      volume: number | null;
    };
    concession: {
      revenue: number | null;
      transactions: number | null;
      volume: number | null;
    };
  };
  daily: Array<{
    date: string;
    revenue: { total: number | null; ticketing: number | null; concession: number | null };
    transactions: { total: number | null; ticketing: number | null; concession: number | null };
    volume: { tickets: number | null; concessionItems: number | null };
  }>;
  sources: {
    ticketing: "AVAILABLE" | "UNAVAILABLE";
    concession: "AVAILABLE" | "UNAVAILABLE";
  };
}

export interface AnalyticsQueryFilters {
  startDate: string;
  endDate: string;
  compare?: boolean;
}

export interface DashboardReportData {
  period: { startDate: string; endDate: string };
  comparison: { startDate: string; endDate: string } | null;
  summary: {
    totalRevenue: number | null;
    ticketingRevenue: number | null;
    concessionRevenue: number | null;
    totalTransactions: number | null;
    ticketingTransactions: number | null;
    concessionTransactions: number | null;
    ticketsSold: number | null;
    concessionItemsSold: number | null;
    averageTransactionValue: number | null;
    revenueChange: number | null;
    transactionChange: number | null;
  };
  dailyTrend: Array<{
    date: string;
    totalRevenue: number | null;
    ticketingRevenue: number | null;
    concessionRevenue: number | null;
    totalTransactions: number | null;
    ticketingTransactions: number | null;
    concessionTransactions: number | null;
    ticketsSold: number | null;
    concessionItemsSold: number | null;
  }>;
  contribution: {
    ticketing: { revenue: number; percentage: number };
    concession: { revenue: number; percentage: number };
  };
  dataSources: {
    platform: "AVAILABLE";
    ticketing: "AVAILABLE" | "UNAVAILABLE";
    concession: "AVAILABLE" | "UNAVAILABLE";
  };
  generatedAt: string;
}

export interface ReportQueryFilters {
  startDate: string;
  endDate: string;
  compare?: boolean;
  organizationId?: string;
  applicationCode?: string;
}

export interface ReportExportPayload {
  format: "CSV" | "XLSX" | "PDF";
  startDate: string;
  endDate: string;
  organizationId?: string;
  applicationCode?: string;
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
    getDashboardAnalytics: builder.query<ApiResponse<DashboardAnalyticsData>, AnalyticsQueryFilters>({
      query: (filters) => ({
        url: "/api/dashboard/analytics",
        params: filters,
      }),
    }),
    getDashboardReport: builder.query<ApiResponse<DashboardReportData>, ReportQueryFilters>({
      query: (filters) => ({
        url: "/api/dashboard/reports/summary",
        params: filters,
      }),
    }),
    logReportExport: builder.mutation<ApiResponse<null>, ReportExportPayload>({
      query: (payload) => ({
        url: "/api/dashboard/reports/export",
        method: "POST",
        body: payload,
      }),
    }),
    getDashboardAlerts: builder.query<ApiResponse<ExecutiveAlert[]>, AlertQueryFilters>({
      query: (filters) => ({
        url: "/api/dashboard/alerts",
        params: filters,
      }),
      providesTags: ["ExecutiveAlerts"],
    }),
    getDashboardAlertSummary: builder.query<ApiResponse<AlertSummary>, void>({
      query: () => "/api/dashboard/alerts/summary",
      providesTags: ["ExecutiveAlerts"],
    }),
    getDashboardAlertDetail: builder.query<ApiResponse<ExecutiveAlert>, string>({
      query: (id) => `/api/dashboard/alerts/${id}`,
      providesTags: (result, error, id) => [{ type: "ExecutiveAlerts" as const, id }],
    }),
    acknowledgeDashboardAlert: builder.mutation<ApiResponse<ExecutiveAlert>, string>({
      query: (id) => ({
        url: `/api/dashboard/alerts/${id}/acknowledge`,
        method: "PATCH",
      }),
      invalidatesTags: ["ExecutiveAlerts"],
    }),
    resolveDashboardAlert: builder.mutation<ApiResponse<ExecutiveAlert>, string>({
      query: (id) => ({
        url: `/api/dashboard/alerts/${id}/resolve`,
        method: "PATCH",
      }),
      invalidatesTags: ["ExecutiveAlerts"],
    }),
    getSecurityOverview: builder.query<ApiResponse<SecurityOverviewData>, void>({
      query: () => "/api/security/overview",
      providesTags: ["Security"],
    }),
    getSecurityActivity: builder.query<ApiResponse<SecurityActivity[]>, SecurityActivityFilters>({
      query: (filters) => ({
        url: "/api/security/activity",
        params: filters,
      }),
      providesTags: ["Security"],
    }),
    getSecurityActivityDetail: builder.query<ApiResponse<SecurityActivityDetail>, string>({
      query: (id) => `/api/security/activity/${id}`,
      providesTags: (result, error, id) => [{ type: "Security" as const, id }],
    }),
  }),
});

export interface SecurityOverviewData {
  summary: {
    totalEvents: number;
    successfulLogins: number;
    failedLogins: number;
    ssoLaunches: number;
    failedSsoLaunches: number;
    accessChanges: number;
    administrativeChanges: number;
  };
  securityScore: {
    value: number;
    status: "HEALTHY" | "WARNING" | "CRITICAL";
    factors: Array<{
      key: string;
      label: string;
      count: number;
      impact: number;
    }>;
  };
  activityTrend: Array<{ date: string; value: number }>;
  eventDistribution: Array<{ category: string; count: number }>;
  topUsers: Array<{ id: string; name: string; email: string; count: number }>;
  topApplications: Array<{ code: string; count: number }>;
  recentCriticalEvents: Array<{
    id: string;
    eventType: string;
    category: string;
    severity: string;
    timestamp: string;
    description: string;
    user: { id: string; name: string; email: string } | null;
  }>;
  alerts: {
    open: number;
    acknowledged: number;
    resolved: number;
  };
}

export interface SecurityActivityFilters {
  page?: number;
  limit?: number;
  search?: string;
  eventType?: string;
  severity?: string;
  category?: string;
  userId?: string;
  applicationCode?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SecurityActivity {
  id: string;
  eventType: string;
  category: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  user: { id: string; name: string; email: string } | null;
  application: { code: string } | null;
  organization: { id: string } | null;
  description: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface SecurityActivityDetail {
  id: string;
  eventType: string;
  category: string;
  severity: string;
  timestamp: string;
  actor: { id: string; name: string; email: string } | null;
  targetUser: { id: string } | null;
  targetOrganization: { id: string } | null;
  targetApplication: { code: string } | null;
  ipAddress: string;
  userAgent: string;
  description: string;
  metadata: Record<string, unknown> | null;
  correlatedEvents: Array<{
    id: string;
    eventType: string;
    category: string;
    severity: string;
    timestamp: string;
  }>;
  relatedAlert: {
    id: string;
    title: string;
    severity: string;
    status: string;
  } | null;
}

export interface ExecutiveAlert {
  id: string;
  fingerprint: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: "SYSTEM" | "BUSINESS" | "SECURITY" | "OPERATIONAL";
  title: string;
  description: string;
  source: string;
  applicationCode: string | null;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  detectedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown> | null;
  recommendedAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertQueryFilters {
  page?: number;
  limit?: number;
  severity?: string;
  category?: string;
  status?: string;
  application?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  open: number;
  acknowledged: number;
  resolved: number;
}

export const {
  useGetDashboardOverviewQuery,
  useGetDashboardOperationsQuery,
  useGetDashboardActivityQuery,
  useGetDashboardTransactionsQuery,
  useGetDashboardAnalyticsQuery,
  useGetDashboardReportQuery,
  useLogReportExportMutation,
  useGetDashboardAlertsQuery,
  useGetDashboardAlertSummaryQuery,
  useGetDashboardAlertDetailQuery,
  useAcknowledgeDashboardAlertMutation,
  useResolveDashboardAlertMutation,
  useGetSecurityOverviewQuery,
  useGetSecurityActivityQuery,
  useGetSecurityActivityDetailQuery,
} = dashboardApi;


