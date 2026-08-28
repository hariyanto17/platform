import Joi from "joi";

export const createSubscriptionSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
  planCode: Joi.string().required().min(2).max(50),
  billingCycle: Joi.string().valid("MONTHLY", "YEARLY").default("MONTHLY"),
  startedAt: Joi.date().iso(),
  currentPeriodEnd: Joi.date().iso(),
  addOns: Joi.array()
    .items(
      Joi.object({
        addOnCode: Joi.string().required(),
        quantity: Joi.number().integer().min(1).default(1),
      })
    )
    .default([]),
});

export const updateSubscriptionSchema = Joi.object({
  status: Joi.string().valid("TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED", "EXPIRED"),
  currentPeriodEnd: Joi.date().iso(),
  cancelledAt: Joi.date().iso().allow(null),
  endedAt: Joi.date().iso().allow(null),
}).min(1);

export const addSubscriptionItemSchema = Joi.object({
  addOnCode: Joi.string().required(),
  quantity: Joi.number().integer().min(1).default(1),
});

export const updateSubscriptionItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});

export const createPlanPriceSchema = Joi.object({
  planCode: Joi.string().required(),
  billingCycle: Joi.string().valid("MONTHLY", "YEARLY").required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().default("IDR"),
  isActive: Joi.boolean().default(true),
});

export const createAddOnPriceSchema = Joi.object({
  addOnCode: Joi.string().required(),
  billingCycle: Joi.string().valid("MONTHLY", "YEARLY").required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().default("IDR"),
  isActive: Joi.boolean().default(true),
});
