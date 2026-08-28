import Joi from "joi";

// Canonical Feature Key Regex: lowercase letters/numbers, dot-separated (e.g. pos.checkout.cash)
export const canonicalKeyPattern = /^[a-z0-9]+(\.[a-z0-9_]+)+$/;

export const createModuleSchema = Joi.object({
  code: Joi.string().required().pattern(/^[a-z0-9_-]+$/).min(2).max(50),
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().allow("", null).max(500),
  isShared: Joi.boolean().default(true),
  status: Joi.string().valid("ACTIVE", "DISABLED").default("ACTIVE"),
  sortOrder: Joi.number().integer().default(0),
});

export const updateModuleSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().allow("", null).max(500),
  isShared: Joi.boolean(),
  status: Joi.string().valid("ACTIVE", "DISABLED"),
  sortOrder: Joi.number().integer(),
}).min(1);

export const createFeatureSchema = Joi.object({
  key: Joi.string().required().pattern(canonicalKeyPattern).min(3).max(100).messages({
    "string.pattern.base": "Feature key must follow canonical format (e.g. pos.checkout.cash)",
  }),
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().allow("", null).max(500),
  moduleCode: Joi.string().required().min(2).max(50),
  isCore: Joi.boolean().default(false),
  status: Joi.string().valid("ACTIVE", "DISABLED").default("ACTIVE"),
});

export const updateFeatureSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().allow("", null).max(500),
  moduleCode: Joi.string().min(2).max(50),
  isCore: Joi.boolean(),
  status: Joi.string().valid("ACTIVE", "DISABLED"),
}).min(1);

export const createDependencySchema = Joi.object({
  featureKey: Joi.string().required().pattern(canonicalKeyPattern),
  dependsOnKey: Joi.string().required().pattern(canonicalKeyPattern),
  dependencyType: Joi.string().valid("REQUIRED", "OPTIONAL", "RECOMMENDED").default("REQUIRED"),
});

export const createPlanSchema = Joi.object({
  code: Joi.string().required().pattern(/^[A-Z0-9_-]+$/).min(2).max(50),
  name: Joi.string().required().min(2).max(100),
  tier: Joi.string().valid("FREE", "STARTER", "PRO", "BUSINESS", "ENTERPRISE").required(),
  description: Joi.string().allow("", null).max(500),
  status: Joi.string().valid("ACTIVE", "DISABLED", "ARCHIVED").default("ACTIVE"),
  sortOrder: Joi.number().integer().default(0),
  featureKeys: Joi.array().items(Joi.string()).default([]),
});

export const updatePlanSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  tier: Joi.string().valid("FREE", "STARTER", "PRO", "BUSINESS", "ENTERPRISE"),
  description: Joi.string().allow("", null).max(500),
  status: Joi.string().valid("ACTIVE", "DISABLED", "ARCHIVED"),
  sortOrder: Joi.number().integer(),
  featureKeys: Joi.array().items(Joi.string()),
}).min(1);

export const createAddOnSchema = Joi.object({
  code: Joi.string().required().pattern(/^[A-Z0-9_-]+$/).min(2).max(50),
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().allow("", null).max(500),
  status: Joi.string().valid("ACTIVE", "DISABLED", "ARCHIVED").default("ACTIVE"),
  featureKeys: Joi.array().items(Joi.string()).default([]),
});

export const updateAddOnSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().allow("", null).max(500),
  status: Joi.string().valid("ACTIVE", "DISABLED", "ARCHIVED"),
  featureKeys: Joi.array().items(Joi.string()),
}).min(1);

export const createVerticalSchema = Joi.object({
  code: Joi.string().required().pattern(/^[A-Z0-9_-]+$/).min(2).max(50),
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().allow("", null).max(500),
  status: Joi.string().valid("ACTIVE", "DISABLED", "ARCHIVED").default("ACTIVE"),
  featureKeys: Joi.array().items(Joi.string()).default([]),
});

export const updateVerticalSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().allow("", null).max(500),
  status: Joi.string().valid("ACTIVE", "DISABLED", "ARCHIVED"),
  featureKeys: Joi.array().items(Joi.string()),
}).min(1);

export const assignFeaturesSchema = Joi.object({
  featureKeys: Joi.array().items(Joi.string().required()).required(),
});
