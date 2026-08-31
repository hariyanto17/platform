import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as authService from "./service";
import { loginSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const loginHandler = async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const result = await authService.login(value);

  // Set secure HTTP-only cookie
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions: any = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };
  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  res.cookie("session_token", result.sessionToken, cookieOptions);

  // Log activity
  await logActivity(result.user.id, "LOGIN", "User", result.user.id, { email: result.user.email });

  return responseHandler.ok(res, result.user, "Login successful");
};

export const logoutHandler = async (req: Request, res: Response) => {
  const sessionToken = req.cookies?.session_token;

  if (sessionToken) {
    await authService.logout(sessionToken);
  }

  // Clear cookie
  const isProd = process.env.NODE_ENV === "production";
  const clearCookieOptions: any = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  };
  if (process.env.COOKIE_DOMAIN) {
    clearCookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  res.clearCookie("session_token", clearCookieOptions);

  if (req.user) {
    await logActivity(req.user.id, "LOGOUT", "User", req.user.id);
  }

  return responseHandler.ok(res, null, "Logout successful");
};

export const getMeHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const applications = req.user.access.map((acc) => ({
    code: acc.applicationCode,
    role: acc.role.code,
    permissions: acc.permissions,
  }));

  const responseData = {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    status: req.user.status,
    organization: req.user.organization,
    applications,
    // Keep access for compatibility with current frontend components
    access: req.user.access,
  };

  return responseHandler.ok(res, responseData, "Current user context retrieved");
};

export const getApplicationContextHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  const { applicationCode } = req.params;
  const appCode = applicationCode.toUpperCase();

  if (req.user.status !== "ACTIVE") {
    throw new AppError("UNAUTHORIZED", "User is disabled");
  }

  const access = req.user.access.find((acc) => acc.applicationCode === appCode);
  if (!access) {
    throw new AppError("FORBIDDEN", `Access denied to application: ${appCode}`);
  }

  const responseData = {
    user: {
      id: req.user.id,
      status: req.user.status,
    },
    application: {
      code: appCode,
      role: access.role.code,
      permissions: access.permissions,
    },
  };

  return responseHandler.ok(res, responseData, "Application context retrieved successfully");
};
