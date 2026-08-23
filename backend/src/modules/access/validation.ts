import Joi from "joi";

export const grantAccessSchema = Joi.object({
  userId: Joi.string().uuid().required().messages({
    "any.required": "User ID wajib ditentukan",
  }),
  applicationCode: Joi.string().required().messages({
    "any.required": "Kode aplikasi wajib ditentukan",
  }),
  roleId: Joi.string().uuid().required().messages({
    "any.required": "Role ID wajib ditentukan",
  }),
});
