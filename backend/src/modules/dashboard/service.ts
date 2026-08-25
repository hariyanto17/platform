import { prisma } from "../../utils/prisma";

export const getDashboardOverview = async () => {
  const [
    totalUsers,
    activeUsers,
    disabledUsers,
    totalOrgs,
    totalApps,
    totalAccesses,
    recentLogs,
    applications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "DISABLED" } }),
    prisma.organization.count(),
    prisma.application.count(),
    prisma.userApplicationAccess.count(),
    prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.application.findMany({
      include: {
        _count: {
          select: {
            applicationAccesses: true,
          },
        },
      },
      orderBy: { code: "asc" },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    disabledUsers,
    totalOrgs,
    totalApps,
    totalAccesses,
    recentLogs,
    applications: applications.map(app => ({
      code: app.code,
      name: app.name,
      description: app.description,
      status: app.status,
      userCount: app._count.applicationAccesses,
    })),
  };
};
