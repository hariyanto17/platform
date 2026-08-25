import { prisma } from "../../utils/prisma";
import { AlertSeverity, AlertStatus } from "@prisma/client";

// Mappings from AuditLog to Security Category and Severity
export const mapEventToSecurityInfo = (action: string) => {
  let category = "ADMINISTRATION";
  let severity = "INFO";

  switch (action) {
    case "LOGIN":
    case "LOGOUT":
      category = "AUTHENTICATION";
      severity = "INFO";
      break;
    case "LOGIN_FAILED":
      category = "AUTHENTICATION";
      severity = "MEDIUM";
      break;
    case "APPLICATION_LAUNCH_REQUESTED":
    case "APPLICATION_LAUNCH_EXCHANGED":
      category = "SSO";
      severity = "INFO";
      break;
    case "SSO_LAUNCH_FAILED":
    case "SSO_FAILURE":
      category = "SSO";
      severity = "HIGH";
      break;
    case "APPLICATION_ACCESS_GRANTED":
      category = "USER_ACCESS";
      severity = "MEDIUM";
      break;
    case "APPLICATION_ACCESS_REVOKED":
      category = "USER_ACCESS";
      severity = "HIGH";
      break;
    case "USER_CREATED":
    case "USER_UPDATED":
      category = "USER_ACCESS";
      severity = "LOW";
      break;
    case "USER_DISABLED":
      category = "USER_ACCESS";
      severity = "HIGH";
      break;
    case "ORGANIZATION_DISABLED":
      category = "ORGANIZATION";
      severity = "HIGH";
      break;
    case "APPLICATION_DISABLED":
      category = "APPLICATION";
      severity = "HIGH";
      break;
    case "ROLE_CHANGED":
      category = "AUTHORIZATION";
      severity = "MEDIUM";
      break;
    case "INVALID_INTERNAL_API_KEY_ATTEMPT":
      category = "SYSTEM";
      severity = "CRITICAL";
      break;
    case "EXECUTIVE_ALERT_CREATED":
      category = "SYSTEM";
      severity = "MEDIUM";
      break;
    case "EXECUTIVE_ALERT_RESOLVED":
    case "EXECUTIVE_ALERT_ACKNOWLEDGED":
      category = "SYSTEM";
      severity = "INFO";
      break;
    case "EXECUTIVE_REPORT_GENERATED":
      category = "ADMINISTRATION";
      severity = "LOW";
      break;
    case "EXECUTIVE_REPORT_EXPORTED":
      category = "ADMINISTRATION";
      severity = "MEDIUM";
      break;
  }

  return { category, severity };
};

// Suffix helper for safety metadata filtering
export const sanitizePayload = (payload: any): any => {
  if (!payload) return null;
  const copy = JSON.parse(JSON.stringify(payload));
  const sensitiveKeys = [
    "password",
    "passwordHash",
    "password_hash",
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "launchCode",
    "launch_code",
    "internalKey",
    "secret",
    "cookie",
    "authorization"
  ];

  const redact = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        obj[key] = "[REDACTED]";
      } else if (typeof obj[key] === "object") {
        redact(obj[key]);
      }
    }
  };

  redact(copy);
  return copy;
};

export const getSecurityScore = async () => {
  // 1. Critical alerts penalty: -5 pts each (capped at 30 pts)
  const openAlertsCount = await prisma.executiveAlert.count({
    where: {
      severity: { in: [AlertSeverity.CRITICAL, AlertSeverity.HIGH] },
      status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
    },
  });
  const alertsPenalty = Math.min(openAlertsCount * 5, 30);

  // 2. Failed logins/SSO last 24h: -2 pts each (capped at 20 pts)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const failedEventsCount = await prisma.auditLog.count({
    where: {
      action: { in: ["LOGIN_FAILED", "SSO_LAUNCH_FAILED", "SSO_FAILURE"] },
      createdAt: { gte: oneDayAgo },
    },
  });
  const failedPenalty = Math.min(failedEventsCount * 2, 20);

  // 3. Disabled application/organizations: -1 pt each (capped at 10 pts)
  const disabledAppsCount = await prisma.application.count({ where: { status: "DISABLED" } });
  const disabledOrgsCount = await prisma.organization.count({ where: { status: "ACTIVE" } }); // wait, organization status disabled count
  const disabledOrgsCountReal = await prisma.organization.count({
    where: { status: { not: "ACTIVE" } },
  });
  const disabledPenalty = Math.min((disabledAppsCount + disabledOrgsCountReal) * 1, 10);

  const totalPenalty = alertsPenalty + failedPenalty + disabledPenalty;
  const scoreValue = Math.max(0, 100 - totalPenalty);

  const status = scoreValue >= 80 ? "HEALTHY" : scoreValue >= 50 ? "WARNING" : "CRITICAL";

  const factors = [
    {
      key: "OPEN_CRITICAL_ALERTS",
      label: "Open Critical/High Alerts",
      count: openAlertsCount,
      impact: -alertsPenalty,
    },
    {
      key: "FAILED_AUTHENTICATION_SSO",
      label: "Recent Failed Authentication & SSO launches",
      count: failedEventsCount,
      impact: -failedPenalty,
    },
    {
      key: "DISABLED_INFRASTRUCTURE",
      label: "Disabled Applications & Organizations",
      count: disabledAppsCount + disabledOrgsCountReal,
      impact: -disabledPenalty,
    },
  ];

  return {
    value: scoreValue,
    status,
    factors,
  };
};

export const getSecurityOverview = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Query stats concurrently
  const [
    totalEvents,
    successfulLogins,
    failedLogins,
    ssoLaunches,
    failedSsoLaunches,
    accessChanges,
    alertCounts,
    recentLogs,
    disabledOrgsCountReal,
    disabledAppsCount
  ] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { action: "LOGIN" } }),
    prisma.auditLog.count({ where: { action: "LOGIN_FAILED" } }),
    prisma.auditLog.count({ where: { action: "APPLICATION_LAUNCH_EXCHANGED" } }),
    prisma.auditLog.count({ where: { action: { in: ["SSO_FAILURE", "SSO_LAUNCH_FAILED"] } } }),
    prisma.auditLog.count({ where: { action: { in: ["APPLICATION_ACCESS_GRANTED", "APPLICATION_ACCESS_REVOKED"] } } }),
    prisma.executiveAlert.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200, // retrieve a bounded limit to normalize severities
    }),
    prisma.organization.count({ where: { status: { not: "ACTIVE" } } }),
    prisma.application.count({ where: { status: "DISABLED" } }),
  ]);

  // Aggregate Alert status
  let openAlerts = 0;
  let ackAlerts = 0;
  let resolvedAlerts = 0;
  for (const ac of alertCounts) {
    if (ac.status === AlertStatus.OPEN) openAlerts += ac._count;
    if (ac.status === AlertStatus.ACKNOWLEDGED) ackAlerts += ac._count;
    if (ac.status === AlertStatus.RESOLVED) resolvedAlerts += ac._count;
  }

  // Map and filter critical events
  const normalizedEvents = recentLogs.map(log => {
    const { category, severity } = mapEventToSecurityInfo(log.action);
    return {
      id: log.id,
      eventType: log.action,
      category,
      severity,
      timestamp: log.createdAt,
      description: `Action ${log.action} registered on entity ${log.entity}`,
      user: log.user ? { id: log.userId, name: log.user.name, email: log.user.email } : null,
    };
  });

  const recentCriticalEvents = normalizedEvents
    .filter(ev => ev.severity === "HIGH" || ev.severity === "CRITICAL")
    .slice(0, 5);

  // Distribution calculations
  const distributionMap: Record<string, number> = {};
  normalizedEvents.forEach(e => {
    distributionMap[e.category] = (distributionMap[e.category] || 0) + 1;
  });
  const eventDistribution = Object.keys(distributionMap).map(cat => ({
    category: cat,
    count: distributionMap[cat],
  }));

  // Top users actor
  const userCounts: Record<string, { name: string; email: string; count: number }> = {};
  recentLogs.forEach(log => {
    if (log.user) {
      const entry = userCounts[log.userId] || { name: log.user.name, email: log.user.email, count: 0 };
      entry.count++;
      userCounts[log.userId] = entry;
    }
  });
  const topUsers = Object.keys(userCounts)
    .map(uid => ({ id: uid, ...userCounts[uid] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top targeted application code aggregates
  const appCounts: Record<string, number> = {};
  recentLogs.forEach(log => {
    if (log.action.includes("APPLICATION") && log.entityId) {
      appCounts[log.entityId] = (appCounts[log.entityId] || 0) + 1;
    }
  });
  const topApplications = Object.keys(appCounts)
    .map(code => ({ code, count: appCounts[code] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Dynamic 7 Days Trend count aggregates
  const activityTrend: Array<{ date: string; value: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dailyCount = normalizedEvents.filter(ev => 
      new Date(ev.timestamp).toISOString().split("T")[0] === dateStr
    ).length;
    activityTrend.push({ date: dateStr, value: dailyCount });
  }

  const score = await getSecurityScore();

  return {
    summary: {
      totalEvents,
      successfulLogins,
      failedLogins,
      ssoLaunches,
      failedSsoLaunches,
      accessChanges,
      administrativeChanges: disabledOrgsCountReal + disabledAppsCount,
    },
    securityScore: score,
    activityTrend,
    eventDistribution,
    topUsers,
    topApplications,
    recentCriticalEvents,
    alerts: {
      open: openAlerts,
      acknowledged: ackAlerts,
      resolved: resolvedAlerts,
    },
  };
};

export const getSecurityActivity = async (filters: {
  page: number;
  limit: number;
  search?: string;
  eventType?: string;
  severity?: string;
  category?: string;
  userId?: string;
  applicationCode?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const {
    page,
    limit,
    search,
    eventType,
    severity,
    category,
    userId,
    applicationCode,
    organizationId,
    startDate,
    endDate
  } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (userId) where.userId = userId;
  if (eventType) where.action = eventType;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Filter application targeted
  if (applicationCode) {
    where.entityId = applicationCode;
  }

  // Search filter
  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entity: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Normalize results dynamically
  const normalized = logs.map(log => {
    const { category: cat, severity: sev } = mapEventToSecurityInfo(log.action);
    return {
      id: log.id,
      eventType: log.action,
      category: cat,
      severity: sev,
      status: "COMPLETED",
      user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null,
      application: log.action.includes("APPLICATION") ? { code: log.entityId } : null,
      organization: log.action.includes("ORGANIZATION") ? { id: log.entityId } : null,
      description: `System activity event ${log.action} registered on entity ${log.entity}.`,
      ipAddress: "127.0.0.1", // Standard platform gateway source
      userAgent: "Mozilla/5.0 (Platform Control Plane)",
      timestamp: log.createdAt,
      metadata: sanitizePayload(log.payload),
    };
  });

  // Apply filters that reside only in the mapped/normalized properties
  let filtered = normalized;
  if (severity) {
    filtered = filtered.filter(f => f.severity === severity);
  }
  if (category) {
    filtered = filtered.filter(f => f.category === category);
  }

  return {
    activities: filtered,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getSecurityActivityDetail = async (id: string) => {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!log) return null;

  const { category, severity } = mapEventToSecurityInfo(log.action);

  // Time-bounded correlation search window: 15 minutes before and after
  const logTime = new Date(log.createdAt);
  const minTime = new Date(logTime.getTime() - 15 * 60 * 1000);
  const maxTime = new Date(logTime.getTime() + 15 * 60 * 1000);

  const relatedLogs = await prisma.auditLog.findMany({
    where: {
      id: { not: log.id },
      createdAt: { gte: minTime, lte: maxTime },
      OR: [
        { userId: log.userId },
        { entityId: log.entityId },
      ],
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const correlatedEvents = relatedLogs.map(rl => {
    const mapped = mapEventToSecurityInfo(rl.action);
    return {
      id: rl.id,
      eventType: rl.action,
      category: mapped.category,
      severity: mapped.severity,
      timestamp: rl.createdAt,
    };
  });

  // Correlate with Executive Alert matching targeted entityId
  const relatedAlert = await prisma.executiveAlert.findFirst({
    where: {
      OR: [
        { id: log.entityId },
        { fingerprint: { contains: log.entityId } },
      ],
    },
  });

  return {
    id: log.id,
    eventType: log.action,
    category,
    severity,
    timestamp: log.createdAt,
    actor: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null,
    targetUser: log.entity === "User" ? { id: log.entityId } : null,
    targetOrganization: log.entity === "Organization" ? { id: log.entityId } : null,
    targetApplication: log.entity === "Application" ? { code: log.entityId } : null,
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Platform Control Plane)",
    description: `Audit Log registration for entity ${log.entity} with action ${log.action}.`,
    metadata: sanitizePayload(log.payload),
    correlatedEvents,
    relatedAlert: relatedAlert ? {
      id: relatedAlert.id,
      title: relatedAlert.title,
      severity: relatedAlert.severity,
      status: relatedAlert.status,
    } : null,
  };
};
