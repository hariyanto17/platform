import Joi from "joi";

export const getTransactionsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  date: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).message("Date must be in YYYY-MM-DD format").optional(),
  status: Joi.string().valid("PAID", "CANCELLED", "COMPLETED", "PENDING").optional(),
  application: Joi.string().valid("TICKETING", "CONCESSION").optional(),
  search: Joi.string().allow("").optional(),
});
