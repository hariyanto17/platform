import Joi from "joi";

export const updateSettingsSchema = Joi.object({
  platform_name: Joi.string().min(1).max(100).required(),
  timezone: Joi.string().min(1).max(50).required(),
  currency: Joi.string().min(1).max(10).required(),
  date_format: Joi.string().min(1).max(20).required(),
  time_format: Joi.string().min(1).max(20).required(),
});
