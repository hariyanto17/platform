import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface OrganizationContext {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "DISABLED";
}

export interface OrganizationItem {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  userCount: number;
  applicationCount: number;
}

export interface PaginatedOrganizationsResponse {
  items: OrganizationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrganizationDetail {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
  userCount: number;
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
  applications: Array<{
    id: string;
    code: string;
    name: string;
    description?: string;
    status: string;
    launchEnabled: boolean;
    mappingStatus: string;
  }>;
}

export const organizationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listOrganizations: builder.query<ApiResponse<PaginatedOrganizationsResponse | OrganizationContext[]>, { page?: number; limit?: number; search?: string; status?: string } | void>({
      query: (params) => ({
        url: "/api/organizations",
        params: params || undefined,
      }),
      providesTags: (result) => [
        { type: "Organization" as const, id: "LIST" },
        ...(result?.data && "items" in result.data
          ? (result.data.items as OrganizationItem[]).map((org) => ({ type: "Organization" as const, id: org.id }))
          : []),
      ],
    }),
    getOrganizationById: builder.query<ApiResponse<OrganizationDetail>, string>({
      query: (id) => `/api/organizations/${id}`,
      providesTags: (result, error, id) => [{ type: "Organization" as const, id }],
    }),
    createOrganization: builder.mutation<ApiResponse<unknown>, { name: string; code: string; status: string }>({
      query: (body) => ({
        url: "/api/organizations",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Organization" as const, id: "LIST" }],
    }),
    updateOrganization: builder.mutation<ApiResponse<unknown>, { id: string; name?: string; code?: string; status?: string }>({
      query: ({ id, ...body }) => ({
        url: `/api/organizations/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Organization" as const, id },
        { type: "Organization" as const, id: "LIST" },
      ],
    }),
    mapApplication: builder.mutation<ApiResponse<unknown>, { organizationId: string; applicationCode: string }>({
      query: ({ organizationId, applicationCode }) => ({
        url: `/api/organizations/${organizationId}/applications`,
        method: "POST",
        body: { applicationCode },
      }),
      invalidatesTags: (result, error, { organizationId }) => [
        { type: "Organization" as const, id: organizationId },
        { type: "Organization" as const, id: "LIST" },
        { type: "Application" as const, id: "LIST" },
      ],
    }),
    unmapApplication: builder.mutation<ApiResponse<unknown>, { organizationId: string; applicationCode: string }>({
      query: ({ organizationId, applicationCode }) => ({
        url: `/api/organizations/${organizationId}/applications/${applicationCode}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { organizationId }) => [
        { type: "Organization" as const, id: organizationId },
        { type: "Organization" as const, id: "LIST" },
        { type: "Application" as const, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListOrganizationsQuery,
  useGetOrganizationByIdQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useMapApplicationMutation,
  useUnmapApplicationMutation,
} = organizationsApi;
