import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { getOrganizationById } from "../organizations/service";
import { getApplicationByCode } from "../applications/service";

// Known settings metadata registry
export const KNOWN_SETTINGS: Record<string, {
  valueType: string;
  category: string;
  isSensitive: boolean;
  isEditable: boolean;
  description: string;
  defaultValue: string;
}> = {
  platform_name: {
    valueType: "STRING",
    category: "GENERAL",
    isSensitive: false,
    isEditable: true,
    description: "The display name of the Cinema Platform.",
    defaultValue: "Planet Cinema Premium",
  },
  timezone: {
    valueType: "STRING",
    category: "GENERAL",
    isSensitive: false,
    isEditable: true,
    description: "System timezone for schedule calculation.",
    defaultValue: "Asia/Makassar",
  },
  currency: {
    valueType: "STRING",
    category: "GENERAL",
    isSensitive: false,
    isEditable: true,
    description: "System base currency denomination.",
    defaultValue: "IDR",
  },
  date_format: {
    valueType: "STRING",
    category: "GENERAL",
    isSensitive: false,
    isEditable: true,
    description: "Date presentation layout.",
    defaultValue: "DD-MM-YYYY",
  },
  time_format: {
    valueType: "STRING",
    category: "GENERAL",
    isSensitive: false,
    isEditable: true,
    description: "Time presentation layout.",
    defaultValue: "HH:mm",
  },
  SESSION_TIMEOUT_MINUTES: {
    valueType: "INTEGER",
    category: "SESSION",
    isSensitive: false,
    isEditable: true,
    description: "Duration before active platform admin session expires.",
    defaultValue: "30",
  },
  MAX_LOGIN_ATTEMPTS: {
    valueType: "INTEGER",
    category: "SECURITY",
    isSensitive: false,
    isEditable: true,
    description: "Allowed failed login password attempts before lockout.",
    defaultValue: "5",
  },
  LOGIN_LOCKOUT_MINUTES: {
    valueType: "INTEGER",
    category: "SECURITY",
    isSensitive: false,
    isEditable: true,
    description: "Duration of lockout enforcement on failure limit.",
    defaultValue: "15",
  },
  SSO_SESSION_TIMEOUT: {
    valueType: "INTEGER",
    category: "SESSION",
    isSensitive: false,
    isEditable: true,
    description: "SSO assertion exchange token validation window.",
    defaultValue: "60",
  },
  INTERNAL_API_KEY: {
    valueType: "STRING",
    category: "SECURITY",
    isSensitive: true,
    isEditable: true,
    description: "Gateway communication token validation key.",
    defaultValue: "gateway-secret-token-key-source",
  },
};

// Ensure default seeds exist in database
const ensureDefaultSeeds = async () => {
  for (const key of Object.keys(KNOWN_SETTINGS)) {
    const meta = KNOWN_SETTINGS[key];
    await prisma.appSetting.upsert({
      where: {
        key_scope_scopeId: {
          key,
          scope: "GLOBAL",
          scopeId: "",
        },
      },
      update: {},
      create: {
        key,
        value: meta.defaultValue,
        valueType: meta.valueType,
        category: meta.category,
        scope: "GLOBAL",
        scopeId: "",
        description: meta.description,
        isSensitive: meta.isSensitive,
        isEditable: meta.isEditable,
      },
    });
  }
};

export const listSettings = async (filters: {
  category?: string;
  scope?: string;
  scopeId?: string;
  search?: string;
  page: number;
  limit: number;
}) => {
  await ensureDefaultSeeds();

  const { category, scope, scopeId, search, page, limit } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (category) where.category = category;
  if (scope) where.scope = scope;
  if (scopeId !== undefined) where.scopeId = scopeId;

  if (search) {
    where.OR = [
      { key: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [settings, total] = await Promise.all([
    prisma.appSetting.findMany({
      where,
      orderBy: [{ scope: "asc" }, { key: "asc" }],
      skip,
      take: limit,
    }),
    prisma.appSetting.count({ where }),
  ]);

  // Sanitize and map secrets
  const sanitized = settings.map(s => ({
    id: s.id,
    key: s.key,
    value: s.isSensitive ? "[REDACTED]" : s.value,
    valueType: s.valueType,
    category: s.category,
    scope: s.scope,
    scopeId: s.scopeId,
    description: s.description,
    isSensitive: s.isSensitive,
    isEditable: s.isEditable,
    updatedAt: s.updatedAt,
    updatedBy: s.updatedBy,
  }));

  return {
    settings: sanitized,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getEffectiveSetting = async (key: string, orgId?: string, appCode?: string) => {
  await ensureDefaultSeeds();

  // Precedence Override Scan logic
  // 1. Organization Override
  if (orgId) {
    const orgOverride = await prisma.appSetting.findUnique({
      where: {
        key_scope_scopeId: {
          key,
          scope: "ORGANIZATION",
          scopeId: orgId,
        },
      },
    });
    if (orgOverride) {
      return { ...orgOverride, inherited: false, effectiveScope: "ORGANIZATION" };
    }
  }

  // 2. Application Override
  if (appCode) {
    const appOverride = await prisma.appSetting.findUnique({
      where: {
        key_scope_scopeId: {
          key,
          scope: "APPLICATION",
          scopeId: appCode,
        },
      },
    });
    if (appOverride) {
      return { ...appOverride, inherited: false, effectiveScope: "APPLICATION" };
    }
  }

  // 3. Global Default fallback
  const globalDefault = await prisma.appSetting.findUnique({
    where: {
      key_scope_scopeId: {
        key,
        scope: "GLOBAL",
        scopeId: "",
      },
    },
  });

  if (!globalDefault) {
    throw new AppError("NOT_FOUND", `Configuration setting key ${key} not found.`);
  }

  return { ...globalDefault, inherited: true, effectiveScope: "GLOBAL" };
};

export const updateSetting = async (params: {
  adminUserId: string;
  key: string;
  value: string;
  scope: string;
  scopeId: string;
  reason?: string;
}) => {
  await ensureDefaultSeeds();
  const { adminUserId, key, value, scope, scopeId, reason } = params;

  // Strict Scope Authorization & Verification checks
  if (scope === "ORGANIZATION") {
    if (!scopeId) throw new AppError("BAD_REQUEST", "scopeId is required for ORGANIZATION scope.");
    const org = await getOrganizationById(scopeId);
    if (!org) throw new AppError("BAD_REQUEST", `Organization ID ${scopeId} does not exist.`);
  } else if (scope === "APPLICATION") {
    if (!scopeId) throw new AppError("BAD_REQUEST", "scopeId is required for APPLICATION scope.");
    const app = await getApplicationByCode(scopeId);
    if (!app) throw new AppError("BAD_REQUEST", `Application code ${scopeId} does not exist.`);
  } else if (scope === "GLOBAL") {
    if (scopeId !== "") {
      throw new AppError("BAD_REQUEST", "scopeId must be empty for GLOBAL scope.");
    }
  }

  // Retrieve setting attributes definitions
  const meta = KNOWN_SETTINGS[key];
  if (!meta) {
    throw new AppError("BAD_REQUEST", `Setting key ${key} is not registered in platform configs.`);
  }

  // Find previous value to audit change records
  const existing = await prisma.appSetting.findUnique({
    where: {
      key_scope_scopeId: {
        key,
        scope,
        scopeId,
      },
    },
  });

  const previousValue = existing ? existing.value : null;

  // Run atomic write inside Transaction boundary block
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.appSetting.upsert({
      where: {
        key_scope_scopeId: {
          key,
          scope,
          scopeId,
        },
      },
      update: {
        value,
        updatedBy: adminUserId,
      },
      create: {
        key,
        value,
        valueType: meta.valueType,
        category: meta.category,
        scope,
        scopeId,
        description: meta.description,
        isSensitive: meta.isSensitive,
        isEditable: meta.isEditable,
        updatedBy: adminUserId,
      },
    });

    // Write audit event
    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: meta.category === "SECURITY" ? "SECURITY_SETTING_UPDATED" : "PLATFORM_SETTING_UPDATED",
        entity: "AppSetting",
        entityId: updated.id,
        payload: {
          settingKey: key,
          scope,
          scopeId,
          previousValue: meta.isSensitive ? "[REDACTED]" : previousValue,
          newValue: meta.isSensitive ? "[REDACTED]" : value,
          reason: reason || "Administrative update",
        },
      },
    });

    return updated;
  });

  return {
    ...result,
    value: result.isSensitive ? "[REDACTED]" : result.value,
  };
};

export const resetSetting = async (params: {
  adminUserId: string;
  key: string;
  scope: string;
  scopeId: string;
}) => {
  const { adminUserId, key, scope, scopeId } = params;

  if (scope === "GLOBAL") {
    throw new AppError("BAD_REQUEST", "Global default settings cannot be deleted or reset.");
  }

  const existing = await prisma.appSetting.findUnique({
    where: {
      key_scope_scopeId: {
        key,
        scope,
        scopeId,
      },
    },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", `Setting override row for key ${key} was not found.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.appSetting.delete({
      where: {
        key_scope_scopeId: {
          key,
          scope,
          scopeId,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: "PLATFORM_SETTING_RESET",
        entity: "AppSetting",
        entityId: existing.id,
        payload: {
          settingKey: key,
          scope,
          scopeId,
          deletedValue: existing.isSensitive ? "[REDACTED]" : existing.value,
        },
      },
    });
  });

  // Return fallback inherited configuration
  return getEffectiveSetting(key, scope === "ORGANIZATION" ? scopeId : undefined, scope === "APPLICATION" ? scopeId : undefined);
};

export const previewSetting = async (params: {
  key: string;
  proposedValue: string;
  scope: string;
  scopeId: string;
}) => {
  const { key, proposedValue, scope, scopeId } = params;

  const currentEffective = await getEffectiveSetting(
    key,
    scope === "ORGANIZATION" ? scopeId : undefined,
    scope === "APPLICATION" ? scopeId : undefined
  );

  const meta = KNOWN_SETTINGS[key];
  const isSensitive = meta ? meta.isSensitive : false;

  return {
    key,
    scope,
    scopeId,
    currentEffectiveValue: isSensitive ? "[REDACTED]" : currentEffective.value,
    currentEffectiveScope: currentEffective.effectiveScope,
    proposedValue: isSensitive ? "[REDACTED]" : proposedValue,
    willChange: currentEffective.value !== proposedValue,
  };
};

export const legacyUpdateSettings = async (adminUserId: string, payload: Record<string, string>) => {
  await ensureDefaultSeeds();
  const keys = Object.keys(payload);

  const updatedSettings = await prisma.$transaction(async (tx) => {
    const records = [];
    for (const key of keys) {
      const meta = KNOWN_SETTINGS[key];
      const r = await tx.appSetting.upsert({
        where: {
          key_scope_scopeId: {
            key,
            scope: "GLOBAL",
            scopeId: "",
          },
        },
        update: {
          value: payload[key],
          updatedBy: adminUserId,
        },
        create: {
          key,
          value: payload[key],
          valueType: meta?.valueType || "STRING",
          category: meta?.category || "GENERAL",
          scope: "GLOBAL",
          scopeId: "",
          description: meta?.description,
          isSensitive: meta?.isSensitive || false,
          isEditable: meta?.isEditable ?? true,
          updatedBy: adminUserId,
        },
      });
      records.push(r);
    }

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: "SETTINGS_UPDATED",
        entity: "AppSetting",
        entityId: "SYSTEM",
        payload: payload,
      },
    });

    return records;
  });

  const settingsMap: Record<string, string> = {};
  for (const s of updatedSettings) {
    settingsMap[s.key] = s.value;
  }
  return settingsMap;
};
