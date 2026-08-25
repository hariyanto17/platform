import Joi from "joi";

export const getAlertsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  severity: Joi.string().valid("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"),
  category: Joi.string().valid("SYSTEM", "BUSINESS", "SECURITY", "OPERATIONAL"),
  status: Joi.string().valid("OPEN", "ACKNOWLEDGED", "RESOLVED"),
  application: Joi.string(),
  startDate: Joi.string().isoDate(),
  endDate: Joi.string().isoDate(),
  search: Joi.string().allow("").optional(),
});
