import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface ApplicationContext {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  assignedUsersCount?: number;
}

export const applicationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listApplications: builder.query<ApiResponse<ApplicationContext[]>, void>({
      query: () => "/api/applications",
    }),
  }),
});

export const { useListApplicationsQuery } = applicationsApi;
