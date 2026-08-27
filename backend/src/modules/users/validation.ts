import Joi from "joi";

export const createUserSchema = Joi.object({
  name: Joi.string().required().messages({
    "any.required": "Nama lengkap wajib diisi",
  }),
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    "string.email": "Format email tidak valid",
    "any.required": "Alamat email wajib diisi",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password minimal berukuran 6 karakter",
    "any.required": "Password wajib diisi",
  }),
  organizationId: Joi.string().uuid().required().messages({
    "any.required": "Organisasi wajib dipilih",
  }),
  status: Joi.string().valid("ACTIVE", "DISABLED").optional(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email({ tlds: { allow: false } }).optional().messages({
    "string.email": "Format email tidak valid",
  }),
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid("ACTIVE", "DISABLED").required().messages({
    "any.required": "Status wajib ditentukan",
  }),
});
