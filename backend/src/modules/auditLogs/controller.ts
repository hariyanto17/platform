import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as auditService from "./service";

export const listAuditLogsHandler = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  const result = await auditService.listAuditLogs(page, limit);

  return responseHandler.ok(res, result.logs, "Audit logs retrieved successfully", result.meta);
};
