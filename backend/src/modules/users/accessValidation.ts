import Joi from "joi";

export const grantAccessSchema = Joi.object({
  applicationCode: Joi.string().valid("CONCESSION", "TICKETING").required().messages({
    "any.required": "Aplikasi wajib dipilih",
    "any.only": "Aplikasi yang didukung hanya CONCESSION atau TICKETING",
  }),
  role: Joi.string().required().messages({
    "any.required": "Role wajib ditentukan",
  }),
});

export const changeRoleSchema = Joi.object({
  role: Joi.string().required().messages({
    "any.required": "Role wajib ditentukan",
  }),
});
