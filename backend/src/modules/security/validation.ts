import Joi from "joi";

export const getSecurityActivitySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow("").optional(),
  eventType: Joi.string().allow("").optional(),
  severity: Joi.string().valid("INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL").optional(),
  status: Joi.string().allow("").optional(),
  userId: Joi.string().allow("").optional(),
  applicationCode: Joi.string().allow("").optional(),
  organizationId: Joi.string().allow("").optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
});
