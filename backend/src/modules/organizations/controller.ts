import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as orgService from "./service";

export const listOrganizationsHandler = async (req: Request, res: Response) => {
  const orgs = await orgService.listOrganizations();
  return responseHandler.ok(res, orgs, "Organizations retrieved successfully");
};

export const getOrganizationByIdHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const org = await orgService.getOrganizationById(id);
  return responseHandler.ok(res, org, "Organization details retrieved successfully");
};
