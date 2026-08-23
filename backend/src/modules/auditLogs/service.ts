import { prisma } from "../../utils/prisma";

export const listAuditLogs = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
    logs,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};
