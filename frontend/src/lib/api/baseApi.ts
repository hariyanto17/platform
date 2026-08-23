import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  credentials: "include", // Ensure session cookies are sent
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && api.endpoint !== "login") {
    // Perform state cleanup only
    api.dispatch(baseApi.util.resetApiState());
    
    // Global redirect on 401 Unauthorized
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  // Unwrap response data if it is wrapped in our custom API envelope
  if (result.data && typeof result.data === "object" && "data" in result.data) {
    return { ...result, data: (result.data as Record<string, unknown>).data };
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["User"],
  endpoints: () => ({}),
});
