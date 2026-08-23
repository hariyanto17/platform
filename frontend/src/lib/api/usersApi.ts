import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";
import { UserContext } from "@/types/auth";

export interface PaginatedUsers {
  users: UserContext[];
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<ApiResponse<UserContext[]>, { page: number; limit: number; search?: string }>({
      query: ({ page, limit, search }) => {
        let url = `/api/users?page=${page}&limit=${limit}`;
        if (search) {
          url += `&search=${encodeURIComponent(search)}`;
        }
        return url;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "User" as const, id })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }],
    }),
    getUserById: builder.query<ApiResponse<UserContext>, string>({
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
  }),
});

export const {
  useListUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
} = usersApi;
