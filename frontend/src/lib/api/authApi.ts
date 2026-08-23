import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";
import { UserContext } from "@/types/auth";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<UserContext>, Record<string, string>>({
      query: (credentials) => ({
        url: "/api/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["User"],
    }),
    logout: builder.mutation<ApiResponse<null>, void>({
      query: () => ({
        url: "/api/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    getMe: builder.query<ApiResponse<UserContext>, void>({
      query: () => "/api/auth/me",
      providesTags: ["User"],
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useGetMeQuery } = authApi;
