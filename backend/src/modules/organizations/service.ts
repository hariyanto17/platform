import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { OrganizationStatus } from "@prisma/client";

export const listOrganizations = async (
  page: number,
  limit: number,
  search?: string,
  status?: string,
) => {
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) {
    where.status = status as OrganizationStatus;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            users: true,
            applications: true,
          },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  const formattedItems = items.map((org) => ({
    id: org.id,
    name: org.name,
    code: org.code,
    status: org.status,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    userCount: org._count.users,
    applicationCount: org._count.applications,
  }));

  return {
    items: formattedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getOrganizationById = async (id: string) => {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
      applications: {
        include: {
          application: true,
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!org) {
    throw new AppError("NOT_FOUND", "Organisasi tidak ditemukan");
  }

  // Get distinct enabled applications list for this organization (legacy test compatibility)
  const accesses = await prisma.userApplicationAccess.findMany({
    where: { organizationId: id },
    select: {
      applicationCode: true,
    },
    distinct: ["applicationCode"],
  });

  const enabledApps = await prisma.application.findMany({
    where: {
      code: { in: accesses.map((a) => a.applicationCode) },
    },
  });

  return {
    id: org.id,
    name: org.name,
    code: org.code,
    status: org.status,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    userCount: org._count.users,
    users: org.users,
    enabledApplications: enabledApps,
    applications: org.applications.map((oa) => ({
      id: oa.application.id,
      code: oa.application.code,
      name: oa.application.name,
      description: oa.application.description,
      status: oa.application.status,
      launchEnabled: oa.application.launchEnabled,
      mappingStatus: oa.status,
    })),
  };
};

export const createOrganization = async (
  name: string,
  code: string,
  status: "ACTIVE" | "DISABLED",
  actorUserId: string,
) => {
  const normalizedCode = code.trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.organization.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { code: { equals: normalizedCode, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      throw new AppError("CONFLICT", "Nama organisasi atau kode sudah terdaftar");
    }

    const org = await tx.organization.create({
      data: {
        name,
        code: normalizedCode,
        status,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        action: "ORGANIZATION_CREATED",
        entity: "Organization",
        entityId: org.id,
        payload: {
          organizationId: org.id,
          code: org.code,
          name: org.name,
          status: org.status,
        },
      },
    });

    return org;
  });
};

export const updateOrganization = async (
  id: string,
  name: string | undefined,
  code: string | undefined,
  status: "ACTIVE" | "DISABLED" | undefined,
  actorUserId: string,
) => {
  const normalizedCode = code?.trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new AppError("NOT_FOUND", "Organisasi tidak ditemukan");
    }

    const orConditions: any[] = [];
    if (name) orConditions.push({ name: { equals: name, mode: "insensitive" } });
    if (normalizedCode) orConditions.push({ code: { equals: normalizedCode, mode: "insensitive" } });

    if (orConditions.length > 0) {
      const existing = await tx.organization.findFirst({
        where: {
          id: { not: id },
          OR: orConditions,
        },
      });

      if (existing) {
        throw new AppError("CONFLICT", "Nama organisasi atau kode sudah digunakan");
      }
    }

    const updated = await tx.organization.update({
      where: { id },
      data: {
        name,
        code: normalizedCode,
        status,
      },
    });

    const isStatusChanged = status !== undefined && status !== org.status;
    const auditAction = isStatusChanged
      ? status === "ACTIVE"
        ? "ORGANIZATION_ENABLED"
        : "ORGANIZATION_DISABLED"
      : "ORGANIZATION_UPDATED";

    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        action: auditAction,
        entity: "Organization",
        entityId: updated.id,
        payload: {
          organizationId: updated.id,
          code: updated.code,
          name: updated.name,
          previousStatus: org.status,
          status: updated.status,
        },
      },
    });

    return updated;
  });
};

export const mapApplication = async (
  organizationId: string,
  applicationCode: string,
  actorUserId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const [org, app] = await Promise.all([
      tx.organization.findUnique({ where: { id: organizationId } }),
      tx.application.findUnique({ where: { code: applicationCode } }),
    ]);

    if (!org) {
      throw new AppError("NOT_FOUND", "Organisasi tidak ditemukan");
    }
    if (org.status !== "ACTIVE") {
      throw new AppError("BAD_REQUEST", "Organisasi tidak aktif");
    }
    if (!app) {
      throw new AppError("NOT_FOUND", "Aplikasi tidak ditemukan");
    }
    if (app.status !== "ACTIVE") {
      throw new AppError("BAD_REQUEST", "Aplikasi tidak aktif");
    }

    const existing = await tx.organizationApplication.findUnique({
      where: {
        organizationId_applicationId: {
          organizationId,
          applicationId: app.id,
        },
      },
    });

    if (existing) {
      throw new AppError("CONFLICT", "Aplikasi sudah terdaftar pada organisasi ini");
    }

    const mapping = await tx.organizationApplication.create({
      data: {
        organizationId,
        applicationId: app.id,
        status: "ACTIVE",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        action: "ORGANIZATION_APPLICATION_ENABLED",
        entity: "Organization",
        entityId: organizationId,
        payload: {
          organizationId,
          applicationId: app.id,
          applicationCode,
        },
      },
    });

    return mapping;
  });
};

export const unmapApplication = async (
  organizationId: string,
  applicationCode: string,
  actorUserId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { code: applicationCode },
    });

    if (!app) {
      throw new AppError("NOT_FOUND", "Aplikasi tidak ditemukan");
    }

    const existing = await tx.organizationApplication.findUnique({
      where: {
        organizationId_applicationId: {
          organizationId,
          applicationId: app.id,
        },
      },
    });

    if (!existing) {
      throw new AppError("NOT_FOUND", "Pemetaan organisasi-aplikasi tidak ditemukan");
    }

    await tx.organizationApplication.delete({
      where: {
        organizationId_applicationId: {
          organizationId,
          applicationId: app.id,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        action: "ORGANIZATION_APPLICATION_DISABLED",
        entity: "Organization",
        entityId: organizationId,
        payload: {
          organizationId,
          applicationId: app.id,
          applicationCode,
        },
      },
    });
  });
};
