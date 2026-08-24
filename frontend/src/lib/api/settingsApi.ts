import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface SystemSettings {
  platform_name: string;
  timezone: string;
  currency: string;
  date_format: string;
  time_format: string;
}

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<ApiResponse<SystemSettings>, void>({
      query: () => "/api/settings",
      providesTags: ["Settings"],
    }),
    updateSettings: builder.mutation<ApiResponse<SystemSettings>, SystemSettings>({
      query: (settings) => ({
        url: "/api/settings",
        method: "PATCH",
        body: settings,
      }),
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
