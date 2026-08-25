import Joi from "joi";

export const getSettingsQuerySchema = Joi.object({
  category: Joi.string().valid("GENERAL", "SECURITY", "SESSION", "APPLICATION", "FEATURE", "GOVERNANCE").optional(),
  scope: Joi.string().valid("GLOBAL", "APPLICATION", "ORGANIZATION").optional(),
  scopeId: Joi.string().allow("").optional(),
  search: Joi.string().allow("").optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const updateSettingPayloadSchema = Joi.object({
  value: Joi.string().required(),
  scope: Joi.string().valid("GLOBAL", "APPLICATION", "ORGANIZATION").default("GLOBAL"),
  scopeId: Joi.string().allow("").default(""),
  reason: Joi.string().allow("").optional(),
});

export const legacyUpdateSettingsSchema = Joi.object({
  platform_name: Joi.string().min(1).max(100).required(),
  timezone: Joi.string().min(1).max(50).required(),
  currency: Joi.string().min(1).max(10).required(),
  date_format: Joi.string().min(1).max(20).required(),
  time_format: Joi.string().min(1).max(20).required(),
});

// Helper validation function for specific key value constraints
export const validateSettingValue = (key: string, value: string) => {
  switch (key) {
    case "SESSION_TIMEOUT_MINUTES":
    case "SSO_SESSION_TIMEOUT": {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 5 || parsed > 1440) {
        return "Must be an integer between 5 and 1440 minutes";
      }
      break;
    }
    case "MAX_LOGIN_ATTEMPTS": {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 3 || parsed > 20) {
        return "Must be an integer between 3 and 20 attempts";
      }
      break;
    }
    case "LOGIN_LOCKOUT_MINUTES": {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 1440) {
        return "Must be an integer between 1 and 1440 minutes";
      }
      break;
    }
    case "INTERNAL_API_KEY": {
      if (!value || value.trim().length < 8) {
        return "Must be at least 8 characters";
      }
      break;
    }
    case "platform_name":
    case "timezone":
    case "currency":
    case "date_format":
    case "time_format": {
      if (!value || value.trim().length === 0) {
        return "Value cannot be empty";
      }
      break;
    }
    default:
      return "Unknown setting key";
  }
  return null;
};
