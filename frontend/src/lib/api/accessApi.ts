import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export const accessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    grantAccess: builder.mutation<ApiResponse<unknown>, { userId: string; applicationCode: string; roleId: string }>({
      query: (body) => ({
        url: "/api/access",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
      ],
    }),
    revokeAccess: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/access/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const { useGrantAccessMutation, useRevokeAccessMutation } = accessApi;
