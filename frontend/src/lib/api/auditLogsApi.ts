import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface AuditLogContext {
  id: string;
  source?: "PLATFORM" | "TICKETING" | "CONCESSION" | string;
  userId?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
  action: string;
  entity: string;
  entityId?: string;
  module?: string;
  description?: string | null;
  ipAddress?: string | null;
  payload?: unknown;
  oldData?: unknown;
  newData?: unknown;
  createdAt: string;
}

export interface ListAuditLogsParams {
  page: number;
  limit: number;
  source?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const auditLogsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAuditLogs: builder.query<ApiResponse<AuditLogContext[]>, ListAuditLogsParams>({
      query: (params) => {
        const query = new URLSearchParams({
          page: params.page.toString(),
          limit: params.limit.toString(),
        });
        if (params.source && params.source !== "ALL") query.set("source", params.source);
        if (params.search) query.set("search", params.search);
        if (params.startDate) query.set("startDate", params.startDate);
        if (params.endDate) query.set("endDate", params.endDate);
        return `/api/audit-logs?${query.toString()}`;
      },
    }),
  }),
});

export const { useListAuditLogsQuery } = auditLogsApi;

