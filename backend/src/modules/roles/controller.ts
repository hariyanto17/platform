import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as rolesService from "./service";

export const listRolesHandler = async (req: Request, res: Response) => {
  const roles = await rolesService.listRoles();
  return responseHandler.ok(res, roles, "Roles retrieved successfully");
};

export const listPermissionsHandler = async (req: Request, res: Response) => {
  const permissions = await rolesService.listPermissions();
  return responseHandler.ok(res, permissions, "Permissions retrieved successfully");
};
