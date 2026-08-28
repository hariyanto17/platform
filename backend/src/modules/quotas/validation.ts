import Joi from "joi";

export const checkQuotaSchema = Joi.object({
  organizationId: Joi.string().uuid().optional(),
  resourceCode: Joi.string().trim().required(),
  requestedAmount: Joi.number().min(0).default(1),
  period: Joi.string().trim().optional(),
});

export const recordUsageSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
  resourceCode: Joi.string().trim().required(),
  quantity: Joi.number().min(0).required(),
  mode: Joi.string().valid("SET", "INCREMENT").default("INCREMENT"),
  period: Joi.string().trim().optional(),
  metadata: Joi.object().optional(),
});

export const tenantQuotaOverrideSchema = Joi.object({
  resourceCode: Joi.string().trim().required(),
  quantity: Joi.number().integer().min(0).allow(null).optional(),
  isUnlimited: Joi.boolean().default(false),
  overrideMode: Joi.string().valid("ADD", "REPLACE").default("ADD"),
  effectiveFrom: Joi.date().iso().optional(),
  effectiveUntil: Joi.date().iso().allow(null).optional(),
  notes: Joi.string().trim().max(500).allow("", null).optional(),
}).custom((value, helpers) => {
  if (!value.isUnlimited && (value.quantity === null || value.quantity === undefined)) {
    return helpers.error("any.custom", { message: "quantity must be provided when isUnlimited is false" });
  }
  return value;
});
