import { Request, Response } from "express";
import argon2 from "argon2";
import { responseHandler } from "../../utils/responeHandler";
import { AppError } from "../../utils/errorHandler";
import * as usersService from "./service";
import { createUserSchema, updateUserSchema, updateUserStatusSchema } from "./validation";

export const listUsersHandler = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const organizationId = req.query.organizationId as string | undefined;
  const application = req.query.application as string | undefined;

  const result = await usersService.listUsers(page, limit, search, status, organizationId, application);
  return responseHandler.ok(res, result.items, "Users retrieved successfully", {
    total: result.pagination.total,
    page: result.pagination.page,
    limit: result.pagination.limit,
    totalPages: result.pagination.totalPages,
    pagination: result.pagination,
  });
};

export const getUserByIdHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await usersService.getUserById(id);
  return responseHandler.ok(res, user, "User retrieved successfully");
};

export const createUserHandler = async (req: Request, res: Response) => {
  const { error, value } = createUserSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  // Hash password using argon2
  const passwordHash = await argon2.hash(value.password);

  const user = await usersService.createUser(req.user.id, {
    name: value.name,
    email: value.email,
    passwordHash,
    organizationId: value.organizationId,
    status: value.status,
  });

  return responseHandler.created(res, user, "User created successfully");
};

export const updateUserHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateUserSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const user = await usersService.updateUser(req.user.id, id, value);
  return responseHandler.ok(res, user, "User updated successfully");
};

export const updateUserStatusHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = updateUserStatusSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const user = await usersService.updateUserStatus(req.user.id, id, value.status);
  return responseHandler.ok(res, user, "User status updated successfully");
};
