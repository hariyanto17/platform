import crypto from "crypto";
import argon2 from "argon2";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { ILoginInput, ILoginResult } from "./interface";
import { logActivity } from "../../utils/activityLogger";

export const login = async (input: ILoginInput): Promise<ILoginResult> => {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
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
  });

  // Generic credential error to prevent email enumeration
  if (!user) {
    const fallbackUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const fallbackId = fallbackUser ? fallbackUser.id : "system-user-fallback-id";
    await logActivity(fallbackId, "LOGIN_FAILED", "User", "unknown", { email: input.email.toLowerCase() });
    throw new AppError("UNAUTHORIZED", "Invalid email or password");
  }

  if (user.status === "DISABLED") {
    await logActivity(user.id, "LOGIN_FAILED", "User", user.id, { email: user.email, reason: "ACCOUNT_DISABLED" });
    throw new AppError("UNAUTHORIZED", "User account is disabled");
  }

  const isPasswordValid = await argon2.verify(user.passwordHash, input.password);
  if (!isPasswordValid) {
    await logActivity(user.id, "LOGIN_FAILED", "User", user.id, { email: user.email, reason: "INVALID_PASSWORD" });
    throw new AppError("UNAUTHORIZED", "Invalid email or password");
  }

  // Create secure random session token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Session duration: 24 hours
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.session.create({
    data: {
      id: hashedToken,
      userId: user.id,
      expiresAt,
    },
  });

  // Map accesses
  const access = user.applicationAccesses.map((acc) => {
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

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
      access,
    },
    sessionToken: rawToken,
  };
};

export const logout = async (sessionToken: string): Promise<void> => {
  const hashedToken = crypto.createHash("sha256").update(sessionToken).digest("hex");
  await prisma.session.delete({
    where: { id: hashedToken },
  }).catch(() => {
    // Ignore if already deleted/expired
  });
};
