import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const grantAccess = async (
  adminUserId: string,
  data: { userId: string; applicationCode: string; roleId: string }
) => {
  // 1. User exists
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User tidak ditemukan");
  }

  // 2. Application exists
  const app = await prisma.application.findUnique({ where: { code: data.applicationCode } });
  if (!app) {
    throw new AppError("NOT_FOUND", "Aplikasi tidak ditemukan");
  }

  // 3. Role exists
  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role) {
    throw new AppError("NOT_FOUND", "Role tidak ditemukan");
  }

  // 4. Role belongs to the selected application
  if (role.applicationCode !== data.applicationCode) {
    throw new AppError("BAD_REQUEST", "Role tidak sesuai dengan aplikasi yang dipilih");
  }

  // 5. User does not already have duplicate access
  const existingAccess = await prisma.userApplicationAccess.findUnique({
    where: {
      userId_applicationCode: {
        userId: data.userId,
        applicationCode: data.applicationCode,
      },
    },
  });

  if (existingAccess) {
    throw new AppError("CONFLICT", "User sudah memiliki akses ke aplikasi ini");
  }

  const access = await prisma.userApplicationAccess.create({
    data: {
      userId: data.userId,
      organizationId: user.organizationId,
      applicationCode: data.applicationCode,
      roleId: data.roleId,
    },
  });

  await logActivity(adminUserId, "APPLICATION_ACCESS_GRANTED", "UserApplicationAccess", access.id, {
    userId: data.userId,
    applicationCode: data.applicationCode,
    roleCode: role.code,
  });

  return access;
};

export const revokeAccess = async (adminUserId: string, id: string) => {
  const access = await prisma.userApplicationAccess.findUnique({
    where: { id },
    include: {
      role: true,
    },
  });

  if (!access) {
    throw new AppError("NOT_FOUND", "Akses aplikasi tidak ditemukan");
  }

  await prisma.userApplicationAccess.delete({ where: { id } });

  await logActivity(adminUserId, "APPLICATION_ACCESS_REVOKED", "UserApplicationAccess", id, {
    userId: access.userId,
    applicationCode: access.applicationCode,
    roleCode: access.role.code,
  });
};
