import argon2 from "argon2";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const listUsers = async (
  page: number,
  limit: number,
  search?: string,
  status?: string,
  organizationId?: string,
  applicationCode?: string
) => {
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (organizationId) {
    where.organizationId = organizationId;
  }

  if (applicationCode) {
    where.applicationAccesses = {
      some: {
        applicationCode,
      },
    };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        applicationAccesses: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const items = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    organization: u.organization,
    applications: u.applicationAccesses.map((access) => ({
      code: access.applicationCode,
      role: access.role.code,
    })),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      applicationAccesses: {
        include: {
          application: {
            select: {
              name: true,
            },
          },
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: {
                    select: {
                      code: true,
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

  if (!user) {
    throw new AppError("NOT_FOUND", "User tidak ditemukan");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    organization: user.organization,
    applications: user.applicationAccesses.map((access) => ({
      code: access.applicationCode,
      name: access.application.name,
      role: access.role.code,
      permissions: access.role.rolePermissions.map((rp) => rp.permission.code),
      status: "ACTIVE",
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const createUser = async (
  adminUserId: string,
  data: { name: string; email: string; passwordHash: string; organizationId: string; status?: "ACTIVE" | "DISABLED" }
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError("CONFLICT", "Alamat email sudah terdaftar");
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      organizationId: data.organizationId,
      status: data.status || "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      organizationId: true,
      createdAt: true,
    },
  });

  await logActivity(adminUserId, "USER_CREATED", "User", user.id, { email: user.email });
  return user;
};

export const updateUser = async (adminUserId: string, id: string, data: { name?: string; email?: string }) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User tidak ditemukan");
  }

  if (data.email && data.email.toLowerCase() !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      throw new AppError("CONFLICT", "Alamat email sudah terdaftar");
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email ? data.email.toLowerCase() : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      organizationId: true,
      updatedAt: true,
    },
  });

  await logActivity(adminUserId, "USER_UPDATED", "User", updated.id, { email: updated.email });
  return updated;
};

export const updateUserStatus = async (adminUserId: string, id: string, status: "ACTIVE" | "DISABLED") => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User tidak ditemukan");
  }

  if (id === adminUserId && status === "DISABLED") {
    throw new AppError("BAD_REQUEST", "Anda tidak dapat menonaktifkan akun Anda sendiri");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  });

  // If status is changed to DISABLED, instantly revoke all active sessions for this user!
  if (status === "DISABLED") {
    await prisma.session.deleteMany({
      where: { userId: id },
    });
  }

  const { propagateUserSyncAll } = require("../../utils/ssoSync");
  await propagateUserSyncAll(id);

  const action = status === "ACTIVE" ? "USER_ENABLED" : "USER_DISABLED";
  await logActivity(adminUserId, action, "User", updated.id, { email: updated.email });
  return updated;
};
