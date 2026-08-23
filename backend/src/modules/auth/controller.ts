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
  res.cookie("session_token", result.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

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
  res.clearCookie("session_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  if (req.user) {
    await logActivity(req.user.id, "LOGOUT", "User", req.user.id);
  }

  return responseHandler.ok(res, null, "Logout successful");
};

export const getMeHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }
  return responseHandler.ok(res, req.user, "Current user context retrieved");
};
