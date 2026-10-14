import { prisma } from "../../utils/prisma";

export interface IAuditLogFilter {
  page: number;
  limit: number;
  source?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const listAuditLogs = async (filters: IAuditLogFilter) => {
  const { page, limit, source = "ALL", search, startDate, endDate } = filters;
  const skip = (page - 1) * limit;

  const ticketingUrl = process.env.TICKETING_API_URL || "http://localhost:5011";
  const apiKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";

  // Helper to fetch Platform local logs
  const fetchPlatformLogs = async (targetLimit: number, targetSkip: number) => {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, localLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: targetSkip,
        take: targetLimit,
      }),
    ]);

    return {
      total,
      logs: localLogs.map((l) => ({
        id: l.id,
        source: "PLATFORM",
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        module: l.entity,
        payload: l.payload,
        createdAt: l.createdAt.toISOString(),
        user: l.user
          ? {
              id: l.user.id,
              name: l.user.name,
              email: l.user.email,
            }
          : null,
      })),
    };
  };

  // Helper to fetch Ticketing logs
  const fetchTicketingLogs = async (targetPage: number, targetLimit: number) => {
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: targetLimit.toString(),
      });
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`${ticketingUrl}/api/internal/audit-logs?${params}`, {
        headers: { "x-platform-internal-key": apiKey },
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) {
        return { total: 0, logs: [] };
      }

      const body = (await res.json()) as any;
      return {
        total: body.meta?.total || 0,
        logs: body.data || [],
      };
    } catch (err) {
      console.error("Failed to fetch ticketing audit logs:", err);
      return { total: 0, logs: [] };
    }
  };

  if (source === "PLATFORM") {
    const { total, logs } = await fetchPlatformLogs(limit, skip);
    return {
      logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        source: "PLATFORM",
      },
    };
  }

  if (source === "TICKETING") {
    const { total, logs } = await fetchTicketingLogs(page, limit);
    return {
      logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        source: "TICKETING",
      },
    };
  }

  // ALL: Fetch from both and aggregate
  const fetchSize = page * limit;
  const [platformData, ticketingData] = await Promise.all([
    fetchPlatformLogs(fetchSize, 0),
    fetchTicketingLogs(1, fetchSize),
  ]);

  const combined = [...platformData.logs, ...ticketingData.logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const paginatedLogs = combined.slice(skip, skip + limit);
  const total = platformData.total + ticketingData.total;

  return {
    logs: paginatedLogs,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      source: "ALL",
      counts: {
        platform: platformData.total,
        ticketing: ticketingData.total,
      },
    },
  };
};

