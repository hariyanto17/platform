import { prisma } from "../../utils/prisma";
import { logActivity } from "../../utils/activityLogger";
import { AlertSeverity, AlertStatus } from "@prisma/client";

// process-level serialization for detection runs
let currentDetectionPromise: Promise<void> | null = null;

export const triggerAlertDetection = async (): Promise<void> => {
  if (currentDetectionPromise) {
    return currentDetectionPromise;
  }
  currentDetectionPromise = (async () => {
    try {
      await detectCurrentConditions();
    } finally {
      currentDetectionPromise = null;
    }
  })();
  return currentDetectionPromise;
};

const detectCurrentConditions = async () => {
  const dateStr = new Date().toISOString().split("T")[0];

  const concessionUrl = process.env.CONCESSION_API_URL || "http://localhost:5050";
  const ticketingUrl = process.env.TICKETING_API_URL || "http://localhost:5011";
  const apiKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";

  // Downstream Health Checks
  const [concessionRes, ticketingRes] = await Promise.all([
    fetch(`${concessionUrl}/api/internal/summary?date=${dateStr}`, {
      headers: { "x-platform-internal-key": apiKey },
      signal: AbortSignal.timeout(2000),
    }).catch(err => {
      console.error("Concession health check fetch failed", err);
      return null;
    }),
    fetch(`${ticketingUrl}/api/internal/summary?date=${dateStr}`, {
      headers: { "x-platform-internal-key": apiKey },
      signal: AbortSignal.timeout(2000),
    }).catch(err => {
      console.error("Ticketing health check fetch failed", err);
      return null;
    }),
  ]);

  // 1. Ticketing Health Alert
  const ticketingFingerprint = "SYSTEM:TICKETING:UNAVAILABLE";
  if (!ticketingRes || !ticketingRes.ok) {
    await upsertActiveAlert({
      fingerprint: ticketingFingerprint,
      severity: AlertSeverity.CRITICAL,
      category: "SYSTEM",
      title: "Ticketing Service Unavailable",
      description: "Platform failed to retrieve telemetry from Ticketing endpoint inside the 2-second timeout window.",
      source: "TICKETING",
      applicationCode: "TICKETING",
    });
  } else {
    await resolveActiveAlert(ticketingFingerprint);
  }

  // 2. Concession Health Alert
  const concessionFingerprint = "SYSTEM:CONCESSION:UNAVAILABLE";
  if (!concessionRes || !concessionRes.ok) {
    await upsertActiveAlert({
      fingerprint: concessionFingerprint,
      severity: AlertSeverity.CRITICAL,
      category: "SYSTEM",
      title: "Concession Service Unavailable",
      description: "Platform failed to retrieve telemetry from Concession endpoint inside the 2-second timeout window.",
      source: "CONCESSION",
      applicationCode: "CONCESSION",
    });
  } else {
    await resolveActiveAlert(concessionFingerprint);
  }

  // 3. Business Anomalies Checks (if online but returns 0 revenue)
  if (ticketingRes && ticketingRes.ok) {
    try {
      const body = await ticketingRes.json() as any;
      if (body?.data?.revenue === 0) {
        await upsertActiveAlert({
          fingerprint: `BUSINESS:TICKETING:NO_TRANSACTIONS:${dateStr}`,
          severity: AlertSeverity.HIGH,
          category: "BUSINESS",
          title: "Ticketing Zero Revenue Alert",
          description: `No Ticketing revenue has been recorded for the operational date: ${dateStr}.`,
          source: "TICKETING",
          applicationCode: "TICKETING",
        });
      }
    } catch (e) {
      console.error("Failed to parse ticketing health response body", e);
    }
  }

  if (concessionRes && concessionRes.ok) {
    try {
      const body = await concessionRes.json() as any;
      if (body?.data?.revenue === 0) {
        await upsertActiveAlert({
          fingerprint: `BUSINESS:CONCESSION:NO_TRANSACTIONS:${dateStr}`,
          severity: AlertSeverity.HIGH,
          category: "BUSINESS",
          title: "Concession Zero Revenue Alert",
          description: `No Concession revenue has been recorded for the operational date: ${dateStr}.`,
          source: "CONCESSION",
          applicationCode: "CONCESSION",
        });
      }
    } catch (e) {
      console.error("Failed to parse concession health response body", e);
    }
  }

  // 4. Security & Operational Events from Platform AuditLog (last 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: oneHourAgo },
      action: {
        in: [
          "USER_DISABLED",
          "ORGANIZATION_DISABLED",
          "APPLICATION_DISABLED",
          "USER_ACCESS_REVOKED",
          "ROLE_CHANGED",
          "SSO_FAILURE",
          "INVALID_INTERNAL_API_KEY_ATTEMPT"
        ],
      },
    },
    take: 50,
  });

  for (const log of logs) {
    if (log.action === "USER_DISABLED") {
      await upsertActiveAlert({
        fingerprint: `SECURITY:USER_DISABLED:${log.entityId}`,
        severity: AlertSeverity.MEDIUM,
        category: "SECURITY",
        title: "User Disabled",
        description: `User account with identifier ${log.entityId} was disabled.`,
        source: "PLATFORM",
        metadata: { auditLogId: log.id, entityId: log.entityId },
      });
    } else if (log.action === "ORGANIZATION_DISABLED") {
      await upsertActiveAlert({
        fingerprint: `OPERATIONAL:ORGANIZATION_DISABLED:${log.entityId}`,
        severity: AlertSeverity.MEDIUM,
        category: "OPERATIONAL",
        title: "Organization Disabled",
        description: `Organization ${log.entityId} has been disabled.`,
        source: "PLATFORM",
        metadata: { auditLogId: log.id, entityId: log.entityId },
      });
    } else if (log.action === "APPLICATION_DISABLED") {
      await upsertActiveAlert({
        fingerprint: `OPERATIONAL:APPLICATION_DISABLED:${log.entityId}`,
        severity: AlertSeverity.MEDIUM,
        category: "OPERATIONAL",
        title: "Application Launch Disabled",
        description: `Application launch availability ${log.entityId} was disabled.`,
        source: "PLATFORM",
        metadata: { auditLogId: log.id, entityId: log.entityId },
      });
    } else if (log.action === "USER_ACCESS_REVOKED") {
      await upsertActiveAlert({
        fingerprint: `SECURITY:ACCESS_REVOKED:${log.entityId}`,
        severity: AlertSeverity.MEDIUM,
        category: "SECURITY",
        title: "User Application Access Revoked",
        description: `User access mapping ${log.entityId} was revoked.`,
        source: "PLATFORM",
        metadata: { auditLogId: log.id, entityId: log.entityId },
      });
    } else if (log.action === "ROLE_CHANGED") {
      await upsertActiveAlert({
        fingerprint: `SECURITY:ROLE_CHANGED:${log.entityId}`,
        severity: AlertSeverity.MEDIUM,
        category: "SECURITY",
        title: "User Access Role Changed",
        description: `User role permissions update recorded for user ${log.entityId}.`,
        source: "PLATFORM",
        metadata: { auditLogId: log.id, entityId: log.entityId },
      });
    } else if (log.action === "SSO_FAILURE") {
      await upsertActiveAlert({
        fingerprint: `SECURITY:SSO_FAILURE:${log.id}`,
        severity: AlertSeverity.HIGH,
        category: "SECURITY",
        title: "SSO Exchange Authentication Failed",
        description: "Failed validation attempt detected during one-time code exchange.",
        source: "PLATFORM",
        metadata: { auditLogId: log.id },
      });
    } else if (log.action === "INVALID_INTERNAL_API_KEY_ATTEMPT") {
      await upsertActiveAlert({
        fingerprint: `SECURITY:INVALID_API_KEY:${log.id}`,
        severity: AlertSeverity.CRITICAL,
        category: "SECURITY",
        title: "Invalid Internal Credential Attempt",
        description: "An unauthorized request tried to connect using an invalid internal service header.",
        source: "PLATFORM",
        metadata: { auditLogId: log.id },
      });
    }
  }
};

const getSystemUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  return user ? user.id : "system-user-fallback-id";
};

const upsertActiveAlert = async (params: {
  fingerprint: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  description: string;
  source: string;
  applicationCode?: string;
  metadata?: any;
}) => {
  const activeAlert = await prisma.executiveAlert.findFirst({
    where: {
      fingerprint: params.fingerprint,
      status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
    },
  });

  if (activeAlert) {
    // Update existing active alert to record that condition continues
    await prisma.executiveAlert.update({
      where: { id: activeAlert.id },
      data: {
        updatedAt: new Date(),
        metadata: params.metadata ? { ...(activeAlert.metadata as any || {}), ...params.metadata } : undefined,
      },
    });
  } else {
    // Create new incident
    const newAlert = await prisma.executiveAlert.create({
      data: {
        fingerprint: params.fingerprint,
        severity: params.severity,
        category: params.category,
        title: params.title,
        description: params.description,
        source: params.source,
        applicationCode: params.applicationCode,
        metadata: params.metadata || {},
        status: AlertStatus.OPEN,
      },
    });

    // Write audit log only on new creation
    const sysUserId = await getSystemUserId();
    await logActivity(
      sysUserId,
      "EXECUTIVE_ALERT_CREATED",
      "ExecutiveAlert",
      newAlert.id,
      { fingerprint: newAlert.fingerprint, title: newAlert.title }
    );
  }
};

const resolveActiveAlert = async (fingerprint: string) => {
  const activeAlert = await prisma.executiveAlert.findFirst({
    where: {
      fingerprint,
      status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] },
    },
  });

  if (activeAlert) {
    await prisma.executiveAlert.update({
      where: { id: activeAlert.id },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    const sysUserId = await getSystemUserId();
    await logActivity(
      sysUserId,
      "EXECUTIVE_ALERT_RESOLVED",
      "ExecutiveAlert",
      activeAlert.id,
      { fingerprint, title: activeAlert.title, method: "AUTO" }
    );
  }
};

// Main Service Query Mappings
export const getAlerts = async (filters: {
  page: number;
  limit: number;
  severity?: AlertSeverity;
  category?: string;
  status?: AlertStatus;
  application?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  const { page, limit, severity, category, status, application, startDate, endDate, search } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (severity) where.severity = severity;
  if (category) where.category = category;
  if (status) where.status = status;
  if (application) where.applicationCode = application;

  if (startDate || endDate) {
    where.detectedAt = {};
    if (startDate) where.detectedAt.gte = new Date(startDate);
    if (endDate) where.detectedAt.lte = new Date(endDate);
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [alerts, total] = await Promise.all([
    prisma.executiveAlert.findMany({
      where,
      orderBy: { detectedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.executiveAlert.count({ where }),
  ]);

  return {
    alerts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAlertSummary = async () => {
  const counts = await prisma.executiveAlert.groupBy({
    by: ["severity", "status"],
    _count: true,
  });

  let total = 0;
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let info = 0;
  let open = 0;
  let acknowledged = 0;
  let resolved = 0;

  for (const c of counts) {
    const count = c._count;
    total += count;

    if (c.status === AlertStatus.OPEN) open += count;
    if (c.status === AlertStatus.ACKNOWLEDGED) acknowledged += count;
    if (c.status === AlertStatus.RESOLVED) resolved += count;

    if (c.severity === AlertSeverity.CRITICAL) critical += count;
    if (c.severity === AlertSeverity.HIGH) high += count;
    if (c.severity === AlertSeverity.MEDIUM) medium += count;
    if (c.severity === AlertSeverity.LOW) low += count;
    if (c.severity === AlertSeverity.INFO) info += count;
  }

  return {
    total,
    critical,
    high,
    medium,
    low,
    info,
    open,
    acknowledged,
    resolved,
  };
};

export const getAlertDetail = async (id: string) => {
  const alert = await prisma.executiveAlert.findUnique({
    where: { id },
  });

  if (!alert) return null;

  // Determine Safe Recommended Action
  let recommendedAction = "Review incident parameters and affected context.";
  if (alert.fingerprint.includes("TICKETING:UNAVAILABLE")) {
    recommendedAction = "Check Ticketing backend availability and internal API connectivity.";
  } else if (alert.fingerprint.includes("CONCESSION:UNAVAILABLE")) {
    recommendedAction = "Check Concession backend availability and internal API connectivity.";
  } else if (alert.category === "BUSINESS") {
    recommendedAction = "Open Executive Analytics and compare the affected period.";
  } else if (alert.fingerprint.includes("USER_DISABLED") || alert.fingerprint.includes("ROLE_CHANGED")) {
    recommendedAction = "Review the affected user's access configuration.";
  } else if (alert.fingerprint.includes("ORGANIZATION_DISABLED")) {
    recommendedAction = "Review the organization config status in Platform settings.";
  } else if (alert.fingerprint.includes("APPLICATION_DISABLED")) {
    recommendedAction = "Review the application availability and permission configurations.";
  }

  return {
    ...alert,
    recommendedAction,
  };
};

export const acknowledgeAlert = async (id: string, userId: string) => {
  const alert = await prisma.executiveAlert.findUnique({
    where: { id },
  });

  if (!alert) return null;
  if (alert.status !== AlertStatus.OPEN) return alert;

  const updated = await prisma.executiveAlert.update({
    where: { id },
    data: {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
    },
  });

  await logActivity(
    userId,
    "EXECUTIVE_ALERT_ACKNOWLEDGED",
    "ExecutiveAlert",
    id,
    { fingerprint: alert.fingerprint, title: alert.title }
  );

  return updated;
};

export const resolveAlert = async (id: string, userId: string) => {
  const alert = await prisma.executiveAlert.findUnique({
    where: { id },
  });

  if (!alert) return null;
  if (alert.status === AlertStatus.RESOLVED) return alert;

  const updated = await prisma.executiveAlert.update({
    where: { id },
    data: {
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(),
    },
  });

  await logActivity(
    userId,
    "EXECUTIVE_ALERT_RESOLVED",
    "ExecutiveAlert",
    id,
    { fingerprint: alert.fingerprint, title: alert.title, method: "MANUAL" }
  );

  return updated;
};
