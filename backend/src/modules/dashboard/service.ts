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
  ]);

  return {
    totalUsers,
    activeUsers,
    disabledUsers,
    totalOrgs,
    totalApps,
    totalAccesses,
    recentLogs,
  };
};
