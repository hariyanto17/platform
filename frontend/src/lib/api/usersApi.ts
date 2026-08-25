import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";
import { UserContext } from "@/types/auth";

export interface PaginatedUsersResponse {
  items: UserContext[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListUsersParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  organizationId?: string;
  application?: string;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<ApiResponse<UserContext[]>, ListUsersParams>({
      query: ({ page, limit, search, status, organizationId, application }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (search) params.append("search", search);
        if (status) params.append("status", status);
        if (organizationId) params.append("organizationId", organizationId);
        if (application) params.append("application", application);
        return `/api/users?${params.toString()}`;
      },
      providesTags: (result) => {
        // Handle result.data if it's the PaginatedUsersResponse structure
        const items = result?.data && "items" in result.data
          ? (result.data as unknown as PaginatedUsersResponse).items
          : (Array.isArray(result?.data) ? result.data : []);

        return [
          ...items.map(({ id }) => ({ type: "User" as const, id })),
          { type: "User", id: "LIST" },
        ];
      },
    }),
    getUser: builder.query<ApiResponse<UserContext>, string>({
      query: (id) => `/api/users/${id}`,
      providesTags: (result, error, id) => [{ type: "User", id }],
    }),
    createUser: builder.mutation<ApiResponse<UserContext>, Record<string, unknown>>({
      query: (body) => ({
        url: "/api/users",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: builder.mutation<ApiResponse<UserContext>, { id: string; name?: string; email?: string }>({
      query: ({ id, ...body }) => ({
        url: `/api/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    updateUserStatus: builder.mutation<ApiResponse<UserContext>, { id: string; status: "ACTIVE" | "DISABLED" }>({
      query: ({ id, status }) => ({
        url: `/api/users/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    grantApplicationAccess: builder.mutation<ApiResponse<unknown>, { userId: string; applicationCode: string; role: string }>({
      query: ({ userId, applicationCode, role }) => ({
        url: `/api/users/${userId}/applications`,
        method: "POST",
        body: { applicationCode, role },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),
    changeApplicationRole: builder.mutation<ApiResponse<unknown>, { userId: string; applicationCode: string; role: string }>({
      query: ({ userId, applicationCode, role }) => ({
        url: `/api/users/${userId}/applications/${applicationCode}`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),
    revokeApplicationAccess: builder.mutation<ApiResponse<unknown>, { userId: string; applicationCode: string }>({
      query: ({ userId, applicationCode }) => ({
        url: `/api/users/${userId}/applications/${applicationCode}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
  useGrantApplicationAccessMutation,
  useChangeApplicationRoleMutation,
  useRevokeApplicationAccessMutation,
} = usersApi;
