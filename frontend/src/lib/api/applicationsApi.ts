import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface ApplicationContext {
  id: string;
  code: string;
  name: string;
  description?: string;
  assignedUsersCount?: number;
}

export interface ApplicationDetail extends ApplicationContext {
  createdAt: string;
  updatedAt: string;
  roles: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  permissions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

export const applicationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listApplications: builder.query<ApiResponse<ApplicationContext[]>, void>({
      query: () => "/api/applications",
    }),
    getApplicationByCode: builder.query<ApiResponse<ApplicationDetail>, string>({
      query: (code) => `/api/applications/${code}`,
    }),
  }),
});

export const { useListApplicationsQuery, useGetApplicationByCodeQuery } = applicationsApi;
