import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050",
  credentials: "include", // Ensure session cookies are sent
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && api.endpoint !== "login") {
    // If already on the login page, do not reset or redirect to prevent infinite loops
    if (typeof window !== "undefined" && window.location.pathname === "/login") {
      return result;
    }

    // Perform state cleanup only
    api.dispatch(baseApi.util.resetApiState());

    // Global redirect on 401 Unauthorized
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["User", "Settings"],
  endpoints: () => ({}),
});
