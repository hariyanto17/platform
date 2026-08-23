import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface AuditLogContext {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  action: string;
  entity: string;
  entityId: string;
  payload?: unknown;
  createdAt: string;
}

export const auditLogsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAuditLogs: builder.query<ApiResponse<AuditLogContext[]>, { page: number; limit: number }>({
      query: ({ page, limit }) => `/api/audit-logs?page=${page}&limit=${limit}`,
    }),
  }),
});

export const { useListAuditLogsQuery } = auditLogsApi;
