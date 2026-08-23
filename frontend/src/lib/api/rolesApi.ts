import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types/api";

export interface PermissionContext {
  id: string;
  code: string;
  name: string;
  applicationCode: string;
}

export interface RoleContext {
  id: string;
  code: string;
  name: string;
  applicationCode: string;
  rolePermissions: Array<{
    permission: PermissionContext;
  }>;
}

export const rolesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listRoles: builder.query<ApiResponse<RoleContext[]>, void>({
      query: () => "/api/roles",
    }),
    listPermissions: builder.query<ApiResponse<PermissionContext[]>, void>({
      query: () => "/api/permissions",
    }),
  }),
});

export const { useListRolesQuery, useListPermissionsQuery } = rolesApi;
