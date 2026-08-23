import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as appService from "./service";

export const listApplicationsHandler = async (req: Request, res: Response) => {
  const apps = await appService.listApplications();
  return responseHandler.ok(res, apps, "Applications retrieved successfully");
};
