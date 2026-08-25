import Joi from "joi";

export const getTransactionsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  date: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).message("Date must be in YYYY-MM-DD format").optional(),
  status: Joi.string().valid("PAID", "CANCELLED", "COMPLETED", "PENDING").optional(),
  application: Joi.string().valid("TICKETING", "CONCESSION").optional(),
  search: Joi.string().allow("").optional(),
});

export const getAnalyticsSchema = Joi.object({
  startDate: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).message("startDate must be in YYYY-MM-DD format").required(),
  endDate: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).message("endDate must be in YYYY-MM-DD format").required(),
  compare: Joi.boolean().optional().default(false),
});

export const getReportSchema = Joi.object({
  startDate: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).message("startDate must be in YYYY-MM-DD format").required(),
  endDate: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).message("endDate must be in YYYY-MM-DD format").required(),
  compare: Joi.boolean().optional().default(false),
  organizationId: Joi.string().uuid().optional(),
  applicationCode: Joi.string().optional(),
});

export const exportReportSchema = Joi.object({
  format: Joi.string().valid("CSV", "XLSX", "PDF").required(),
  startDate: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).message("startDate must be in YYYY-MM-DD format").required(),
  endDate: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).message("endDate must be in YYYY-MM-DD format").required(),
  organizationId: Joi.string().uuid().optional(),
  applicationCode: Joi.string().optional(),
});

