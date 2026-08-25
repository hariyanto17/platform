import { prisma } from "../../utils/prisma";
import crypto from "crypto";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const listApplications = async () => {
  const apps = await prisma.application.findMany({
    orderBy: { code: "asc" },
  });

  // Calculate assigned users count per application
  const mappedApps = await Promise.all(
    apps.map(async (app) => {
      const assignedUsersCount = await prisma.userApplicationAccess.count({
        where: { applicationCode: app.code },
      });
      return {
        ...app,
        assignedUsersCount,
      };
    })
  );

  return mappedApps;
};

export const getApplicationByCode = async (code: string) => {
  const app = await prisma.application.findUnique({
    where: { code },
    include: {
      roles: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      permissions: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!app) {
    return null;
  }

  const assignedUsersCount = await prisma.userApplicationAccess.count({
    where: { applicationCode: code },
  });

  return {
    ...app,
    assignedUsersCount,
  };
};

export const createLaunchCode = async (userId: string, appCode: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new AppError("BAD_REQUEST", "User is disabled or does not exist");
  }

  const app = await prisma.application.findUnique({
    where: { code: appCode },
  });

  if (!app || app.status !== "ACTIVE") {
    throw new AppError("BAD_REQUEST", "Target application is disabled or does not exist");
  }

  const access = await prisma.userApplicationAccess.findUnique({
    where: {
      userId_applicationCode: {
        userId,
        applicationCode: appCode,
      },
    },
  });

  if (!access) {
    throw new AppError("FORBIDDEN", `Access denied to application: ${appCode}`);
  }

  const rawCode = crypto.randomBytes(32).toString("hex");
  const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

  await prisma.applicationLaunchCode.create({
    data: {
      codeHash,
      userId,
      applicationCode: appCode,
      expiresAt,
    },
  });

  await logActivity(userId, "APPLICATION_LAUNCH_REQUESTED", "Application", app.id, {
    application: appCode,
  });

  return {
    application: appCode,
    code: rawCode,
    expiresAt,
  };
};

export const exchangeLaunchCode = async (rawCode: string, appCode: string) => {
  const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");

  const updatedCode = await prisma.$transaction(async (tx) => {
    const launchCode = await tx.applicationLaunchCode.findUnique({
      where: { codeHash },
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

    if (!launchCode) {
      throw new AppError("UNAUTHORIZED", "Invalid or expired launch code");
    }

    if (launchCode.usedAt !== null) {
      throw new AppError("UNAUTHORIZED", "Launch code has already been used");
    }

    if (new Date() > launchCode.expiresAt) {
      throw new AppError("UNAUTHORIZED", "Launch code has expired");
    }

    if (launchCode.applicationCode !== appCode) {
      throw new AppError("UNAUTHORIZED", "Launch code is not valid for this application");
    }

    if (launchCode.user.status !== "ACTIVE") {
      throw new AppError("UNAUTHORIZED", "User account is disabled");
    }

    const userAccess = launchCode.user.applicationAccesses.find(
      (acc: any) => acc.applicationCode === appCode
    );

    if (!userAccess) {
      throw new AppError("FORBIDDEN", `Access has been revoked for application: ${appCode}`);
    }

    const updateResult = await tx.applicationLaunchCode.updateMany({
      where: {
        id: launchCode.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new AppError("UNAUTHORIZED", "Launch code has already been used");
    }

    return launchCode;
  });

  await logActivity(updatedCode.userId, "APPLICATION_LAUNCH_EXCHANGED", "Application", updatedCode.applicationCode, {
    application: appCode,
  });

  const activeAccess = updatedCode.user.applicationAccesses.find(
    (acc: any) => acc.applicationCode === appCode
  )!;

  const permissions = activeAccess.role.rolePermissions.map((rp: any) => rp.permission.code);

  return {
    id: updatedCode.user.id,
    email: updatedCode.user.email,
    name: updatedCode.user.name,
    status: updatedCode.user.status,
    organization: {
      id: updatedCode.user.organization.id,
      name: updatedCode.user.organization.name,
    },
    application: {
      code: appCode,
      role: activeAccess.role.code,
      permissions,
    },
  };
};

export const getPlatformUserContext = async (platformUserId: string, appCode: string) => {
  const user = await prisma.user.findUnique({
    where: { id: platformUserId },
    include: {
      applicationAccesses: {
        where: { applicationCode: appCode },
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

  if (!user) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("UNAUTHORIZED", "User account is disabled");
  }

  const access = user.applicationAccesses[0];
  if (!access) {
    throw new AppError("FORBIDDEN", `Access has been revoked for application: ${appCode}`);
  }

  const permissions = access.role.rolePermissions.map((rp: any) => rp.permission.code);

  return {
    id: user.id,
    status: user.status,
    application: {
      code: appCode,
      role: access.role.code,
      permissions,
    },
  };
};
