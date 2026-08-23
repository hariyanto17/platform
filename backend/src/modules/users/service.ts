import argon2 from "argon2";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const listUsers = async (page: number, limit: number, search?: string) => {
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
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

  const totalPages = Math.ceil(total / limit);

  return {
    users,
    meta: {
      total,
      page,
      limit,
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
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "User tidak ditemukan");
  }

  return user;
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

  const action = status === "ACTIVE" ? "USER_ENABLED" : "USER_DISABLED";
  await logActivity(adminUserId, action, "User", updated.id, { email: updated.email });
  return updated;
};
