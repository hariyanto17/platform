import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface OrganizationContext {
  id: string;
  name: string;
}

export interface OrganizationDetail extends OrganizationContext {
  users: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
  }>;
  enabledApplications: Array<{
    id: string;
    code: string;
    name: string;
    description?: string;
  }>;
}

export const organizationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listOrganizations: builder.query<ApiResponse<OrganizationContext[]>, void>({
      query: () => "/api/organizations",
    }),
    getOrganizationById: builder.query<ApiResponse<OrganizationDetail>, string>({
      query: (id) => `/api/organizations/${id}`,
    }),
  }),
});

export const { useListOrganizationsQuery, useGetOrganizationByIdQuery } = organizationsApi;
