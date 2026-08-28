import Joi from "joi";

export const grantFeatureSchema = Joi.object({
  featureKey: Joi.string().required(),
  effectiveUntil: Joi.date().iso().allow(null),
  notes: Joi.string().max(255).allow(null, "").default(""),
});

export const revokeFeatureSchema = Joi.object({
  featureKey: Joi.string().required(),
  notes: Joi.string().max(255).allow(null, "").default(""),
});

export const updateGrantSchema = Joi.object({
  status: Joi.string().valid("GRANTED", "ACTIVE", "SUSPENDED", "EXPIRED", "REVOKED"),
  effectiveUntil: Joi.date().iso().allow(null),
  notes: Joi.string().max(255).allow(null, ""),
}).min(1);
