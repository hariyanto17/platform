import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as auditService from "./service";

export const listAuditLogsHandler = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const source = req.query.source ? req.query.source.toString().toUpperCase() : "ALL";
  const search = req.query.search ? req.query.search.toString() : undefined;
  const startDate = req.query.startDate ? req.query.startDate.toString() : undefined;
  const endDate = req.query.endDate ? req.query.endDate.toString() : undefined;

  const result = await auditService.listAuditLogs({
    page,
    limit,
    source,
    search,
    startDate,
    endDate,
  });

  return responseHandler.ok(res, result.logs, "Audit logs retrieved successfully", result.meta);
};
