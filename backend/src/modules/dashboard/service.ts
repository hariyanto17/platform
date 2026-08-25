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

export const getDashboardOperations = async (dateStr?: string) => {
  const date = dateStr || new Date().toISOString().split("T")[0];

  const concessionUrl = process.env.CONCESSION_API_URL || "http://localhost:5050";
  const ticketingUrl = process.env.TICKETING_API_URL || "http://localhost:5011";
  const apiKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";

  const [concessionRes, ticketingRes] = await Promise.all([
    fetch(`${concessionUrl}/api/internal/summary?date=${date}`, {
      headers: { "x-platform-internal-key": apiKey },
      signal: AbortSignal.timeout(2000),
    }).catch(err => {
      console.error("Concession unreachable for summary", err);
      return null;
    }),
    fetch(`${ticketingUrl}/api/internal/summary?date=${date}`, {
      headers: { "x-platform-internal-key": apiKey },
      signal: AbortSignal.timeout(2000),
    }).catch(err => {
      console.error("Ticketing unreachable for summary", err);
      return null;
    }),
  ]);

  let concessionData = {
    status: "UNAVAILABLE",
    revenue: 0,
    transactions: 0,
    itemsSold: 0,
    averageTransaction: 0,
  };

  let ticketingData = {
    status: "UNAVAILABLE",
    revenue: 0,
    transactions: 0,
    ticketsSold: 0,
    averageTransaction: 0,
  };

  if (concessionRes && concessionRes.ok) {
    try {
      const body = await concessionRes.json() as any;
      concessionData = {
        status: "CONNECTED",
        ...body.data,
      };
    } catch (e) {
      console.error("Concession summary body parse error", e);
    }
  }

  if (ticketingRes && ticketingRes.ok) {
    try {
      const body = await ticketingRes.json() as any;
      ticketingData = {
        status: "CONNECTED",
        ...body.data,
      };
    } catch (e) {
      console.error("Ticketing summary body parse error", e);
    }
  }

  const summary = {
    totalRevenue: (concessionData.status === "CONNECTED" ? concessionData.revenue : 0) +
                  (ticketingData.status === "CONNECTED" ? ticketingData.revenue : 0),
    totalTransactions: (concessionData.status === "CONNECTED" ? concessionData.transactions : 0) +
                       (ticketingData.status === "CONNECTED" ? ticketingData.transactions : 0),
  };

  return {
    date,
    currency: "IDR",
    summary,
    ticketing: ticketingData,
    concession: concessionData,
  };
};
