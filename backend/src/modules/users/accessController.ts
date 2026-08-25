import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { responseHandler } from "../../utils/responeHandler";
import { grantAccessSchema, changeRoleSchema } from "./accessValidation";
import { propagateUserSync } from "../../utils/ssoSync";

export const grantUserAccessHandler = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { error, value } = grantAccessSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const adminUserId = req.user?.id;
  if (!adminUserId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  // 1. User exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User tidak ditemukan");
  }

  // 2. Application exists
  const app = await prisma.application.findUnique({ where: { code: value.applicationCode } });
  if (!app) {
    throw new AppError("NOT_FOUND", "Aplikasi tidak ditemukan");
  }

  // 3. Role exists
  const role = await prisma.role.findUnique({ where: { code: value.role } });
  if (!role) {
    throw new AppError("NOT_FOUND", "Role tidak ditemukan");
  }

  // 4. Role belongs to application
  if (role.applicationCode !== value.applicationCode) {
    throw new AppError("BAD_REQUEST", "Role tidak sesuai dengan aplikasi yang dipilih");
  }

  // 5. Prevent duplicate access
  const existingAccess = await prisma.userApplicationAccess.findUnique({
    where: {
      userId_applicationCode: {
        userId,
        applicationCode: value.applicationCode,
      },
    },
  });
  if (existingAccess) {
    throw new AppError("CONFLICT", "User sudah memiliki akses ke aplikasi ini");
  }

  const access = await prisma.$transaction(async (tx) => {
    const acc = await tx.userApplicationAccess.create({
      data: {
        userId,
        organizationId: user.organizationId,
        applicationCode: value.applicationCode,
        roleId: role.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: "USER_APPLICATION_ACCESS_GRANTED",
        entity: "UserApplicationAccess",
        entityId: acc.id,
        payload: {
          userId,
          applicationCode: value.applicationCode,
          roleCode: role.code,
        },
      },
    });

    return acc;
  });

  await propagateUserSync(userId, value.applicationCode);

  return responseHandler.created(res, access, "Akses aplikasi berhasil diberikan");
};

export const changeUserRoleHandler = async (req: Request, res: Response) => {
  const { userId, applicationCode } = req.params;
  const { error, value } = changeRoleSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const adminUserId = req.user?.id;
  if (!adminUserId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  // 1. User exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User tidak ditemukan");
  }

  // 2. Access exists
  const existingAccess = await prisma.userApplicationAccess.findUnique({
    where: {
      userId_applicationCode: {
        userId,
        applicationCode,
      },
    },
    include: {
      role: true,
    },
  });
  if (!existingAccess) {
    throw new AppError("NOT_FOUND", "Akses aplikasi tidak ditemukan");
  }

  // 3. New role exists
  const role = await prisma.role.findUnique({ where: { code: value.role } });
  if (!role) {
    throw new AppError("NOT_FOUND", "Role tidak ditemukan");
  }

  // 4. Role belongs to application
  if (role.applicationCode !== applicationCode) {
    throw new AppError("BAD_REQUEST", "Role tidak sesuai dengan aplikasi yang dipilih");
  }

  await prisma.$transaction(async (tx) => {
    await tx.userApplicationAccess.update({
      where: { id: existingAccess.id },
      data: { roleId: role.id },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: "USER_APPLICATION_ROLE_CHANGED",
        entity: "UserApplicationAccess",
        entityId: existingAccess.id,
        payload: {
          userId,
          applicationCode,
          previousRole: existingAccess.role.code,
          newRole: role.code,
        },
      },
    });
  });

  await propagateUserSync(userId, applicationCode);

  return responseHandler.ok(res, null, "Role aplikasi berhasil diubah");
};

export const revokeUserAccessHandler = async (req: Request, res: Response) => {
  const { userId, applicationCode } = req.params;

  const adminUserId = req.user?.id;
  if (!adminUserId) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }

  // 1. User exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User tidak ditemukan");
  }

  // 2. Access exists
  const existingAccess = await prisma.userApplicationAccess.findUnique({
    where: {
      userId_applicationCode: {
        userId,
        applicationCode,
      },
    },
    include: {
      role: true,
    },
  });
  if (!existingAccess) {
    throw new AppError("NOT_FOUND", "Akses aplikasi tidak ditemukan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.userApplicationAccess.delete({
      where: { id: existingAccess.id },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: "USER_APPLICATION_ACCESS_REVOKED",
        entity: "UserApplicationAccess",
        entityId: existingAccess.id,
        payload: {
          userId,
          applicationCode,
          roleCode: existingAccess.role.code,
        },
      },
    });
  });

  await propagateUserSync(userId, applicationCode);

  return responseHandler.ok(res, null, "Akses aplikasi berhasil dicabut");
};
