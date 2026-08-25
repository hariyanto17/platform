import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface ApplicationContext {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "DISABLED";
  launchEnabled: boolean;
  userCount: number;
  organizationCount: number;
}

export interface ApplicationDetail {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "DISABLED";
  launchEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  roles: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  organizations: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
  }>;
  userCount: number;
}

export const applicationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listApplications: builder.query<ApiResponse<ApplicationContext[]>, void>({
      query: () => "/api/applications",
      providesTags: ["Application"],
    }),
    getApplicationByCode: builder.query<ApiResponse<ApplicationDetail>, string>({
      query: (code) => `/api/applications/${code}`,
      providesTags: (result, error, code) => [{ type: "Application" as const, id: code }],
    }),
    updateApplicationStatus: builder.mutation<ApiResponse<unknown>, { code: string; status?: string; launchEnabled?: boolean }>({
      query: ({ code, ...body }) => ({
        url: `/api/applications/${code}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { code }) => [
        { type: "Application" as const, id: code },
        "Application",
      ],
    }),
    launchApplication: builder.mutation<ApiResponse<{ code: string; application: string; expiresAt: string }>, string>({
      query: (code) => ({
        url: `/api/applications/${code}/launch`,
        method: "POST",
      }),
    }),
  }),
});

export const {
  useListApplicationsQuery,
  useGetApplicationByCodeQuery,
  useUpdateApplicationStatusMutation,
  useLaunchApplicationMutation,
} = applicationsApi;
