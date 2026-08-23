import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface OrganizationContext {
  id: string;
  name: string;
}

export const organizationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listOrganizations: builder.query<ApiResponse<OrganizationContext[]>, void>({
      query: () => "/api/organizations",
    }),
  }),
});

export const { useListOrganizationsQuery } = organizationsApi;
