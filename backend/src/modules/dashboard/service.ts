import { prisma } from "../../utils/prisma";

export const getDashboardOverview = async () => {
  const [
    totalUsers,
    activeUsers,
    disabledUsers,
    totalOrgs,
    activeOrgs,
    totalApps,
    activeApps,
    totalAccesses,
    recentLogs,
    applications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "DISABLED" } }),
    prisma.organization.count(),
    prisma.organization.count({ where: { status: "ACTIVE" } }),
    prisma.application.count(),
    prisma.application.count({ where: { status: "ACTIVE" } }),
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
    activeOrgs,
    totalApps,
    activeApps,
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

export const getDashboardAnalytics = async (params: { startDate: string; endDate: string; compare?: boolean }) => {
  const { startDate, endDate, compare = false } = params;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const msInDay = 24 * 60 * 60 * 1000;
  const prevStart = new Date(start.getTime() - (diffDays + 1) * msInDay);
  const prevEnd = new Date(start.getTime() - 1 * msInDay);
  const prevStartDateStr = prevStart.toISOString().split("T")[0];
  const prevEndDateStr = prevEnd.toISOString().split("T")[0];

  const concessionUrl = process.env.CONCESSION_API_URL || "http://localhost:5050";
  const ticketingUrl = process.env.TICKETING_API_URL || "http://localhost:5011";
  const apiKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";
  const headers = { "x-platform-internal-key": apiKey };

  let concCurrent: any = null;
  let concPrev: any = null;
  let tickCurrent: any = null;
  let tickPrev: any = null;

  let concessionStatus: "AVAILABLE" | "UNAVAILABLE" = "AVAILABLE";
  let ticketingStatus: "AVAILABLE" | "UNAVAILABLE" = "AVAILABLE";

  const fetchConcession = async (s: string, e: string) => {
    const res = await fetch(`${concessionUrl}/api/internal/analytics?startDate=${s}&endDate=${e}`, {
      headers,
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`Concession returned ${res.status}`);
    const body = (await res.json()) as any;
    return body.data;
  };

  const fetchTicketing = async (s: string, e: string) => {
    const res = await fetch(`${ticketingUrl}/api/internal/analytics?startDate=${s}&endDate=${e}`, {
      headers,
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`Ticketing returned ${res.status}`);
    const body = (await res.json()) as any;
    return body.data;
  };

  const promises: Promise<any>[] = [];

  promises.push(
    fetchConcession(startDate, endDate)
      .then(d => { concCurrent = d; })
      .catch(err => {
        console.error("Concession current analytics failed", err);
        concessionStatus = "UNAVAILABLE";
      })
  );

  if (compare) {
    promises.push(
      fetchConcession(prevStartDateStr, prevEndDateStr)
        .then(d => { concPrev = d; })
        .catch(() => {
          concessionStatus = "UNAVAILABLE";
        })
    );
  }

  promises.push(
    fetchTicketing(startDate, endDate)
      .then(d => { tickCurrent = d; })
      .catch(err => {
        console.error("Ticketing current analytics failed", err);
        ticketingStatus = "UNAVAILABLE";
      })
  );

  if (compare) {
    promises.push(
      fetchTicketing(prevStartDateStr, prevEndDateStr)
        .then(d => { tickPrev = d; })
        .catch(() => {
          ticketingStatus = "UNAVAILABLE";
        })
    );
  }

  await Promise.all(promises);

  // Compute Current Summary Metrics
  const tickRev = (ticketingStatus === "AVAILABLE" && tickCurrent) ? tickCurrent.revenue : null;
  const concRev = (concessionStatus === "AVAILABLE" && concCurrent) ? concCurrent.revenue : null;
  let totalRevenue: number | null = null;
  if (tickRev !== null || concRev !== null) {
    totalRevenue = (tickRev || 0) + (concRev || 0);
  }

  const tickTrans = (ticketingStatus === "AVAILABLE" && tickCurrent) ? tickCurrent.transactions : null;
  const concTrans = (concessionStatus === "AVAILABLE" && concCurrent) ? concCurrent.transactions : null;
  let totalTransactions: number | null = null;
  if (tickTrans !== null || concTrans !== null) {
    totalTransactions = (tickTrans || 0) + (concTrans || 0);
  }

  const ticketsSold = (ticketingStatus === "AVAILABLE" && tickCurrent) ? tickCurrent.ticketsSold : null;
  const concessionItemsSold = (concessionStatus === "AVAILABLE" && concCurrent) ? concCurrent.itemsSold : null;

  let averageTransactionValue: number | null = null;
  if (totalRevenue !== null && totalTransactions !== null && totalTransactions > 0) {
    averageTransactionValue = Number((totalRevenue / totalTransactions).toFixed(2));
  }

  // Compute Previous Summary Metrics for comparison
  let prevTotalRevenue: number | null = null;
  let prevTotalTransactions: number | null = null;
  let prevTicketsSold: number | null = null;
  let prevConcessionItemsSold: number | null = null;
  let prevAverageTransactionValue: number | null = null;

  if (compare) {
    const tickRevPrev = (ticketingStatus === "AVAILABLE" && tickPrev) ? tickPrev.revenue : null;
    const concRevPrev = (concessionStatus === "AVAILABLE" && concPrev) ? concPrev.revenue : null;
    if (tickRevPrev !== null || concRevPrev !== null) {
      prevTotalRevenue = (tickRevPrev || 0) + (concRevPrev || 0);
    }

    const tickTransPrev = (ticketingStatus === "AVAILABLE" && tickPrev) ? tickPrev.transactions : null;
    const concTransPrev = (concessionStatus === "AVAILABLE" && concPrev) ? concPrev.transactions : null;
    if (tickTransPrev !== null || concTransPrev !== null) {
      prevTotalTransactions = (tickTransPrev || 0) + (concTransPrev || 0);
    }

    prevTicketsSold = (ticketingStatus === "AVAILABLE" && tickPrev) ? tickPrev.ticketsSold : null;
    prevConcessionItemsSold = (concessionStatus === "AVAILABLE" && concPrev) ? concPrev.itemsSold : null;

    if (prevTotalRevenue !== null && prevTotalTransactions !== null && prevTotalTransactions > 0) {
      prevAverageTransactionValue = Number((prevTotalRevenue / prevTotalTransactions).toFixed(2));
    }
  }

  // Helper helper to get percentage changes
  const getChange = (currVal: number | null, prevVal: number | null) => {
    if (currVal === null || prevVal === null) return null;
    if (prevVal === 0) return currVal === 0 ? 0 : null;
    return Number((((currVal - prevVal) / prevVal) * 100).toFixed(2));
  };

  // Compile daily sequence
  const dailyMap: Record<string, {
    date: string;
    revenue: { total: number | null; ticketing: number | null; concession: number | null };
    transactions: { total: number | null; ticketing: number | null; concession: number | null };
    volume: { tickets: number | null; concessionItems: number | null };
  }> = {};

  const curr = new Date(start);
  while (curr <= end) {
    const dStr = curr.toISOString().split("T")[0];
    dailyMap[dStr] = {
      date: dStr,
      revenue: { total: null, ticketing: null, concession: null },
      transactions: { total: null, ticketing: null, concession: null },
      volume: { tickets: null, concessionItems: null },
    };
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  if (tickCurrent && Array.isArray(tickCurrent.daily)) {
    for (const d of tickCurrent.daily) {
      if (dailyMap[d.date]) {
        dailyMap[d.date].revenue.ticketing = d.revenue;
        dailyMap[d.date].transactions.ticketing = d.transactions;
        dailyMap[d.date].volume.tickets = d.ticketsSold;
      }
    }
  }

  if (concCurrent && Array.isArray(concCurrent.daily)) {
    for (const d of concCurrent.daily) {
      if (dailyMap[d.date]) {
        dailyMap[d.date].revenue.concession = d.revenue;
        dailyMap[d.date].transactions.concession = d.transactions;
        dailyMap[d.date].volume.concessionItems = d.itemsSold;
      }
    }
  }

  for (const dStr of Object.keys(dailyMap)) {
    const d = dailyMap[dStr];
    if (ticketingStatus === "AVAILABLE" || concessionStatus === "AVAILABLE") {
      const tRev = d.revenue.ticketing || 0;
      const cRev = d.revenue.concession || 0;
      const tTran = d.transactions.ticketing || 0;
      const cTran = d.transactions.concession || 0;
      d.revenue.total = (ticketingStatus === "AVAILABLE" ? tRev : 0) + (concessionStatus === "AVAILABLE" ? cRev : 0);
      d.transactions.total = (ticketingStatus === "AVAILABLE" ? tTran : 0) + (concessionStatus === "AVAILABLE" ? cTran : 0);
    }
  }

  const dailyList = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: { startDate, endDate },
    comparison: compare ? { startDate: prevStartDateStr, endDate: prevEndDateStr } : null,
    summary: {
      revenue: totalRevenue,
      revenueChange: compare ? getChange(totalRevenue, prevTotalRevenue) : null,
      transactions: totalTransactions,
      transactionsChange: compare ? getChange(totalTransactions, prevTotalTransactions) : null,
      ticketsSold,
      ticketsSoldChange: compare ? getChange(ticketsSold, prevTicketsSold) : null,
      concessionItemsSold,
      concessionItemsSoldChange: compare ? getChange(concessionItemsSold, prevConcessionItemsSold) : null,
      averageTransactionValue,
      averageTransactionValueChange: compare ? getChange(averageTransactionValue, prevAverageTransactionValue) : null,
    },
    applications: {
      ticketing: {
        revenue: tickRev,
        transactions: tickTrans,
        volume: ticketsSold,
      },
      concession: {
        revenue: concRev,
        transactions: concTrans,
        volume: concessionItemsSold,
      },
    },
    daily: dailyList,
    sources: {
      ticketing: ticketingStatus,
      concession: concessionStatus,
    },
  };
};

export const getDashboardReport = async (params: { startDate: string; endDate: string; compare?: boolean }) => {
  const analytics = await getDashboardAnalytics(params);

  const totalRev = analytics.summary.revenue || 0;
  const tickRev = analytics.applications.ticketing.revenue || 0;
  const concRev = analytics.applications.concession.revenue || 0;

  const ticketingPercentage = totalRev > 0 ? Number(((tickRev / totalRev) * 100).toFixed(2)) : 0;
  const concessionPercentage = totalRev > 0 ? Number(((concRev / totalRev) * 100).toFixed(2)) : 0;

  return {
    period: analytics.period,
    comparison: analytics.comparison,
    summary: {
      totalRevenue: analytics.summary.revenue,
      ticketingRevenue: analytics.applications.ticketing.revenue,
      concessionRevenue: analytics.applications.concession.revenue,
      totalTransactions: analytics.summary.transactions,
      ticketingTransactions: analytics.applications.ticketing.transactions,
      concessionTransactions: analytics.applications.concession.transactions,
      ticketsSold: analytics.summary.ticketsSold,
      concessionItemsSold: analytics.summary.concessionItemsSold,
      averageTransactionValue: analytics.summary.averageTransactionValue,
      revenueChange: analytics.summary.revenueChange,
      transactionChange: analytics.summary.transactionsChange,
    },
    dailyTrend: analytics.daily.map(d => ({
      date: d.date,
      totalRevenue: d.revenue.total,
      ticketingRevenue: d.revenue.ticketing,
      concessionRevenue: d.revenue.concession,
      totalTransactions: d.transactions.total,
      ticketingTransactions: d.transactions.ticketing,
      concessionTransactions: d.transactions.concession,
      ticketsSold: d.volume.tickets,
      concessionItemsSold: d.volume.concessionItems,
    })),
    contribution: {
      ticketing: {
        revenue: tickRev,
        percentage: ticketingPercentage,
      },
      concession: {
        revenue: concRev,
        percentage: concessionPercentage,
      },
    },
    dataSources: {
      platform: "AVAILABLE" as const,
      ticketing: analytics.sources.ticketing,
      concession: analytics.sources.concession,
    },
    generatedAt: new Date().toISOString(),
  };
};

