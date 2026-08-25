import Joi from "joi";

export const createOrganizationSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  code: Joi.string().required().pattern(/^[A-Z0-9_-]+$/).min(2).max(50),
  status: Joi.string().valid("ACTIVE", "DISABLED").default("ACTIVE"),
});

export const updateOrganizationSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  code: Joi.string().pattern(/^[A-Z0-9_-]+$/).min(2).max(50),
  status: Joi.string().valid("ACTIVE", "DISABLED"),
}).min(1);

export const mapApplicationSchema = Joi.object({
  applicationCode: Joi.string().required(),
});
