import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AppError } from "../utils/errorHandler";
import { prisma } from "../utils/prisma";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req.cookies?.session_token;

  if (!sessionToken) {
    return next(new AppError("UNAUTHORIZED", "Missing session cookie"));
  }

  try {
    // Hash token to compare with database id
    const hashedToken = crypto.createHash("sha256").update(sessionToken).digest("hex");

    const session = await prisma.session.findUnique({
      where: { id: hashedToken },
      include: {
        user: {
          include: {
            organization: true,
            applicationAccesses: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return next(new AppError("UNAUTHORIZED", "Session not found"));
    }

    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: hashedToken } });
      return next(new AppError("UNAUTHORIZED", "Session expired"));
    }

    if (session.user.status === "DISABLED") {
      return next(new AppError("UNAUTHORIZED", "User account is disabled"));
    }

    // Map accesses, roles, and permissions
    const access = session.user.applicationAccesses.map((acc) => {
      const permissions = acc.role.rolePermissions.map((rp) => rp.permission.code);
      return {
        applicationCode: acc.applicationCode,
        role: {
          code: acc.role.code,
          name: acc.role.name,
        },
        permissions,
      };
    });

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      status: session.user.status,
      organizationId: session.user.organizationId,
      organization: {
        id: session.user.organization.id,
        name: session.user.organization.name,
      },
      access,
    };

    // Optionally update session lastUsedAt
    await prisma.session.update({
      where: { id: hashedToken },
      data: { lastUsedAt: new Date() },
    });

    next();
  } catch (error) {
    return next(new AppError("UNAUTHORIZED", "Session validation failed"));
  }
};

export const requireApplicationAccess = (appCode: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHORIZED", "Not authenticated"));
    }

    const hasAccess = req.user.access.some((acc) => acc.applicationCode === appCode);
    if (!hasAccess) {
      return next(new AppError("FORBIDDEN", `Access denied to application: ${appCode}`));
    }

    next();
  };
};

export const requirePermission = (permissionCode: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHORIZED", "Not authenticated"));
    }

    const hasPermission = req.user.access.some((acc) =>
      acc.permissions.includes(permissionCode)
    );
    if (!hasPermission) {
      return next(new AppError("FORBIDDEN", `Missing required permission: ${permissionCode}`));
    }

    next();
  };
};
