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

export const getDashboardActivity = async () => {
  const concessionUrl = process.env.CONCESSION_API_URL || "http://localhost:5050";
  const ticketingUrl = process.env.TICKETING_API_URL || "http://localhost:5011";
  const apiKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";

  // Fetch Platform logs
  const localLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const platformActivities = localLogs.map((log) => ({
    id: `platform-${log.id}`,
    source: "PLATFORM",
    type: "SECURITY",
    title: log.action,
    description: `${log.user?.name || "System"} performed ${log.action} on ${log.entity}`,
    timestamp: log.createdAt.toISOString(),
    user: { id: log.userId, name: log.user?.name },
  }));

  // Fetch sub-app activities in parallel
  const [concessionRes, ticketingRes] = await Promise.all([
    fetch(`${concessionUrl}/api/internal/activity`, {
      headers: { "x-platform-internal-key": apiKey },
      signal: AbortSignal.timeout(2000),
    }).catch((err) => {
      console.error("Concession unreachable for activity", err);
      return null;
    }),
    fetch(`${ticketingUrl}/api/internal/activity`, {
      headers: { "x-platform-internal-key": apiKey },
      signal: AbortSignal.timeout(2000),
    }).catch((err) => {
      console.error("Ticketing unreachable for activity", err);
      return null;
    }),
  ]);

  let concessionActivities: any[] = [];
  let concessionStatus = "CONNECTED";
  if (concessionRes && concessionRes.ok) {
    try {
      const body = await concessionRes.json() as any;
      concessionActivities = body.data || [];
    } catch {
      concessionStatus = "UNAVAILABLE";
    }
  } else {
    concessionStatus = "UNAVAILABLE";
  }

  let ticketingActivities: any[] = [];
  let ticketingStatus = "CONNECTED";
  if (ticketingRes && ticketingRes.ok) {
    try {
      const body = await ticketingRes.json() as any;
      ticketingActivities = body.data || [];
    } catch {
      ticketingStatus = "UNAVAILABLE";
    }
  } else {
    ticketingStatus = "UNAVAILABLE";
  }

  // Merge and sort
  const combined = [
    ...platformActivities,
    ...concessionActivities,
    ...ticketingActivities,
  ];

  combined.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    if (tA !== tB) return tB - tA;
    return `${a.source}-${a.id}`.localeCompare(`${b.source}-${b.id}`);
  });

  return {
    activities: combined.slice(0, 20),
    concessionStatus,
    ticketingStatus,
  };
};

export const getDashboardTransactions = async (filters: {
  page?: number;
  limit?: number;
  date?: string;
  status?: string;
  application?: string;
  search?: string;
}) => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const { date, status, application, search } = filters;

  const concessionUrl = process.env.CONCESSION_API_URL || "http://localhost:5050";
  const ticketingUrl = process.env.TICKETING_API_URL || "http://localhost:5011";
  const apiKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";

  const queryParams = new URLSearchParams();
  queryParams.append("page", "1");
  queryParams.append("limit", (page * limit).toString());
  if (date) queryParams.append("date", date);
  if (status) queryParams.append("status", status);
  if (search) queryParams.append("search", search);

  const fetchConcession = async () => {
    if (application && application !== "CONCESSION") return { transactions: [], total: 0, status: "CONNECTED" };
    try {
      const res = await fetch(`${concessionUrl}/api/internal/transactions?${queryParams.toString()}`, {
        headers: { "x-platform-internal-key": apiKey },
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return { transactions: [], total: 0, status: "UNAVAILABLE" };
      const body = await res.json() as any;
      return {
        transactions: body.data.transactions || [],
        total: body.data.pagination.total || 0,
        status: "CONNECTED",
      };
    } catch {
      return { transactions: [], total: 0, status: "UNAVAILABLE" };
    }
  };

  const fetchTicketing = async () => {
    if (application && application !== "TICKETING") return { transactions: [], total: 0, status: "CONNECTED" };
    try {
      const res = await fetch(`${ticketingUrl}/api/internal/transactions?${queryParams.toString()}`, {
        headers: { "x-platform-internal-key": apiKey },
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return { transactions: [], total: 0, status: "UNAVAILABLE" };
      const body = await res.json() as any;
      return {
        transactions: body.data.transactions || [],
        total: body.data.pagination.total || 0,
        status: "CONNECTED",
      };
    } catch {
      return { transactions: [], total: 0, status: "UNAVAILABLE" };
    }
  };

  const [concessionData, ticketingData] = await Promise.all([
    fetchConcession(),
    fetchTicketing(),
  ]);

  const combined = [
    ...concessionData.transactions,
    ...ticketingData.transactions,
  ];

  combined.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    if (tA !== tB) return tB - tA;
    return `${a.source}-${a.id}`.localeCompare(`${b.source}-${b.id}`);
  });

  const offset = (page - 1) * limit;
  const paginated = combined.slice(offset, offset + limit);
  const total = concessionData.total + ticketingData.total;

  return {
    transactions: paginated,
    concessionStatus: concessionData.status,
    ticketingStatus: ticketingData.status,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
