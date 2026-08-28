import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import {
  CANONICAL_RESOURCE_DEFINITIONS,
  QuotaLimitType,
  QuotaMeasurementType,
} from "./constants";
import {
  EffectiveQuotaDetail,
  ResolvedEffectiveQuotas,
  QuotaCheckResult,
  UsageRecordInput,
  TenantQuotaOverrideInput,
  QuotaGrantSource,
} from "./types";

/**
 * Deterministically computes the current calendar period (e.g. "2026-08") in UTC.
 */
export function getCurrentCalendarPeriod(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export const QuotaService = {
  /**
   * Resolves all effective quotas for an organization.
   */
  async resolveEffectiveQuotas(
    organizationId: string,
    customPeriod?: string
  ): Promise<ResolvedEffectiveQuotas> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new AppError("NOT_FOUND", `Organization with id '${organizationId}' not found`);
    }

    const now = new Date();
    const defaultPeriod = getCurrentCalendarPeriod(now);
    const resolvedPeriod = customPeriod || defaultPeriod;

    // 1. Fetch active subscription with plan quota grants and add-on quota grants
    const activeSub = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ["ACTIVE", "TRIAL"] },
      },
      include: {
        plan: {
          include: {
            planQuotaGrants: true,
          },
        },
        items: {
          include: {
            addOn: {
              include: {
                addOnQuotaGrants: true,
              },
            },
          },
        },
      },
    });

    // 2. Fetch all canonical Quota Definitions
    const quotaDefinitions = await prisma.quotaDefinition.findMany({
      where: { status: "ACTIVE" },
      orderBy: { code: "asc" },
    });

    // 3. Fetch active custom tenant quota grants
    const customGrants = await prisma.tenantQuotaGrant.findMany({
      where: {
        organizationId,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
      },
    });
    const customGrantsMap = new Map(customGrants.map((g: any) => [g.resourceCode, g]));

    // 4. Fetch recorded usages for this organization
    const usageRecords = await prisma.quotaUsage.findMany({
      where: {
        organizationId,
        period: { in: ["GLOBAL", resolvedPeriod] },
      },
    });
    const usageMap = new Map<string, { quantity: number; lastRecordedAt: string }>();
    for (const u of usageRecords) {
      usageMap.set(`${u.resourceCode}:${u.period}`, {
        quantity: Number(u.quantity),
        lastRecordedAt: u.lastRecordedAt.toISOString(),
      });
    }

    const quotaDetails: Record<string, EffectiveQuotaDetail> = {};
    const quotaList: EffectiveQuotaDetail[] = [];

    let nearLimitCount = 0;
    let hardLimitViolationsCount = 0;
    let totalOverageCount = 0;

    for (const def of quotaDefinitions) {
      const isGauge = def.measurementType === "GAUGE";
      const resourcePeriod = isGauge ? "GLOBAL" : resolvedPeriod;
      const sources: QuotaGrantSource[] = [];

      let planAllocated: number | null = null;
      let planIsUnlimited = false;

      // Commercial Plan Quota
      if (activeSub && activeSub.plan) {
        const pGrant = activeSub.plan.planQuotaGrants.find((g: any) => g.resourceCode === def.code);
        if (pGrant) {
          if (pGrant.isUnlimited) {
            planIsUnlimited = true;
          } else {
            planAllocated = pGrant.quantity;
          }
          sources.push({
            type: "PLAN",
            code: activeSub.planCode,
            name: activeSub.plan.name,
            quantity: pGrant.quantity,
            isUnlimited: pGrant.isUnlimited,
          });
        }
      }

      // Add-on Quotas
      let addOnAllocated = 0;
      let addOnIsUnlimited = false;

      if (activeSub && activeSub.items) {
        for (const item of activeSub.items) {
          const aGrant = item.addOn.addOnQuotaGrants.find((g: any) => g.resourceCode === def.code);
          if (aGrant) {
            if (aGrant.isUnlimited) {
              addOnIsUnlimited = true;
            } else if (aGrant.quantity !== null) {
              const grantContribution = aGrant.quantity * item.quantity;
              addOnAllocated += grantContribution;
              sources.push({
                type: "ADD_ON",
                code: item.addOnCode,
                name: item.addOn.name,
                quantity: grantContribution,
                isUnlimited: false,
              });
            }
          }
        }
      }

      // Custom Tenant Override
      const cGrant: any = customGrantsMap.get(def.code);
      if (cGrant) {
        sources.push({
          type: "CUSTOM",
          code: "MANUAL_OVERRIDE",
          name: cGrant.notes || "Tenant Enterprise Quota Override",
          quantity: cGrant.quantity,
          isUnlimited: cGrant.isUnlimited,
          overrideMode: cGrant.overrideMode as "ADD" | "REPLACE",
        });
      }

      // Resolve final Effective Allocation
      let finalAllocated: number | null = null;
      let finalIsUnlimited = false;

      if (cGrant && cGrant.overrideMode === "REPLACE") {
        if (cGrant.isUnlimited) {
          finalIsUnlimited = true;
        } else {
          finalAllocated = cGrant.quantity ?? 0;
        }
      } else {
        if (planIsUnlimited || addOnIsUnlimited || (cGrant && cGrant.isUnlimited)) {
          finalIsUnlimited = true;
        } else {
          const baseSum = (planAllocated ?? 0) + addOnAllocated;
          const customExtra = cGrant && cGrant.quantity ? cGrant.quantity : 0;
          finalAllocated = baseSum + customExtra;
        }
      }

      // Resolve Recorded Usage
      const usageEntry = usageMap.get(`${def.code}:${resourcePeriod}`);
      const used = usageEntry ? usageEntry.quantity : 0;
      const lastRecordedAt = usageEntry ? usageEntry.lastRecordedAt : undefined;

      const remaining = finalIsUnlimited
        ? null
        : Math.max(0, (finalAllocated ?? 0) - used);

      const overage = finalIsUnlimited
        ? 0
        : Math.max(0, used - (finalAllocated ?? 0));

      const percentageUsed = finalIsUnlimited
        ? null
        : finalAllocated && finalAllocated > 0
        ? Math.round((used / finalAllocated) * 100)
        : used > 0
        ? 100
        : 0;

      let status: "HEALTHY" | "NEAR_LIMIT" | "LIMIT_REACHED" | "OVERAGE" = "HEALTHY";
      if (!finalIsUnlimited) {
        if (used > (finalAllocated ?? 0)) {
          status = "OVERAGE";
          totalOverageCount++;
          if (def.limitType === "HARD_LIMIT") {
            hardLimitViolationsCount++;
          }
        } else if (used === (finalAllocated ?? 0) && (finalAllocated ?? 0) > 0) {
          status = "LIMIT_REACHED";
        } else if ((percentageUsed ?? 0) >= 85) {
          status = "NEAR_LIMIT";
          nearLimitCount++;
        }
      }

      const enforceable = def.limitType === "HARD_LIMIT" && !finalIsUnlimited;

      const detail: EffectiveQuotaDetail = {
        resourceCode: def.code,
        name: def.name,
        description: def.description,
        limitType: def.limitType as QuotaLimitType,
        unit: def.unit,
        measurementType: def.measurementType as QuotaMeasurementType,
        isUnlimited: finalIsUnlimited,
        allocated: finalAllocated,
        used,
        remaining,
        overage,
        percentageUsed,
        period: resourcePeriod,
        enforceable,
        status,
        sources,
        lastRecordedAt,
      };

      quotaDetails[def.code] = detail;
      quotaList.push(detail);
    }

    return {
      organizationId: org.id,
      organizationName: org.name,
      subscriptionId: activeSub?.id || null,
      planCode: activeSub?.planCode || null,
      subscriptionStatus: activeSub?.status || null,
      period: resolvedPeriod,
      quotas: quotaDetails,
      quotaList,
      totalResources: quotaList.length,
      nearLimitCount,
      hardLimitViolationsCount,
      totalOverageCount,
    };
  },

  /**
   * Retrieves single effective quota detail for a resource.
   */
  async getEffectiveQuota(
    organizationId: string,
    resourceCode: string,
    period?: string
  ): Promise<EffectiveQuotaDetail> {
    const resolved = await this.resolveEffectiveQuotas(organizationId, period);
    const quota = resolved.quotas[resourceCode];
    if (!quota) {
      throw new AppError("NOT_FOUND", `Quota definition for resource '${resourceCode}' not found`);
    }
    return quota;
  },

  /**
   * Evaluates if a requested resource consumption quantity is permitted.
   */
  async checkQuota(
    organizationId: string,
    resourceCode: string,
    requestedAmount: number = 1,
    period?: string
  ): Promise<QuotaCheckResult> {
    const effective = await this.getEffectiveQuota(organizationId, resourceCode, period);
    const projectedUsage = effective.used + requestedAmount;

    if (effective.isUnlimited) {
      return {
        allowed: true,
        resourceCode,
        limitType: effective.limitType,
        isUnlimited: true,
        effectiveLimit: null,
        currentUsage: effective.used,
        requestedAmount,
        projectedUsage,
        remaining: null,
        overage: 0,
        status: "ALLOWED",
      };
    }

    const limit = effective.allocated ?? 0;

    if (projectedUsage <= limit) {
      return {
        allowed: true,
        resourceCode,
        limitType: effective.limitType,
        isUnlimited: false,
        effectiveLimit: limit,
        currentUsage: effective.used,
        requestedAmount,
        projectedUsage,
        remaining: Math.max(0, limit - projectedUsage),
        overage: 0,
        status: "ALLOWED",
      };
    }

    // Exceeds limit
    if (effective.limitType === "HARD_LIMIT") {
      return {
        allowed: false,
        resourceCode,
        limitType: effective.limitType,
        isUnlimited: false,
        effectiveLimit: limit,
        currentUsage: effective.used,
        requestedAmount,
        projectedUsage,
        remaining: 0,
        overage: 0,
        status: "REJECTED_HARD_LIMIT",
        reason: `Quota limit of ${limit} ${effective.unit} exceeded. Current usage: ${effective.used}, requested: ${requestedAmount}.`,
      };
    }

    // SOFT_LIMIT or FAIR_USE allows usage and notes overage
    const overageAmount = projectedUsage - limit;
    return {
      allowed: true,
      resourceCode,
      limitType: effective.limitType,
      isUnlimited: false,
      effectiveLimit: limit,
      currentUsage: effective.used,
      requestedAmount,
      projectedUsage,
      remaining: 0,
      overage: overageAmount,
      status: "ALLOWED_WITH_OVERAGE",
      reason: `${effective.limitType} threshold of ${limit} ${effective.unit} reached with overage of ${overageAmount}.`,
    };
  },

  /**
   * Internal/administrative metering endpoint to record usage.
   */
  async recordUsage(userId: string, input: UsageRecordInput) {
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
    });
    if (!org) {
      throw new AppError("NOT_FOUND", `Organization '${input.organizationId}' not found`);
    }

    const def = await prisma.quotaDefinition.findUnique({
      where: { code: input.resourceCode },
    });
    if (!def) {
      throw new AppError("NOT_FOUND", `Quota resource definition '${input.resourceCode}' not found`);
    }

    const resolvedPeriod =
      def.measurementType === "GAUGE"
        ? "GLOBAL"
        : input.period || getCurrentCalendarPeriod();

    let usageRecord;
    const now = new Date();

    if (input.mode === "SET") {
      usageRecord = await prisma.quotaUsage.upsert({
        where: {
          organizationId_resourceCode_period: {
            organizationId: input.organizationId,
            resourceCode: input.resourceCode,
            period: resolvedPeriod,
          },
        },
        update: {
          quantity: input.quantity,
          lastRecordedAt: now,
          metadata: input.metadata || undefined,
        },
        create: {
          organizationId: input.organizationId,
          resourceCode: input.resourceCode,
          period: resolvedPeriod,
          quantity: input.quantity,
          lastRecordedAt: now,
          metadata: input.metadata || undefined,
        },
      });
    } else {
      // INCREMENT mode
      usageRecord = await prisma.quotaUsage.upsert({
        where: {
          organizationId_resourceCode_period: {
            organizationId: input.organizationId,
            resourceCode: input.resourceCode,
            period: resolvedPeriod,
          },
        },
        update: {
          quantity: { increment: input.quantity },
          lastRecordedAt: now,
          metadata: input.metadata || undefined,
        },
        create: {
          organizationId: input.organizationId,
          resourceCode: input.resourceCode,
          period: resolvedPeriod,
          quantity: input.quantity,
          lastRecordedAt: now,
          metadata: input.metadata || undefined,
        },
      });
    }

    return usageRecord;
  },

  /**
   * Fetches usage history records for an organization.
   */
  async getUsageHistory(organizationId: string, resourceCode?: string, period?: string) {
    const where: any = { organizationId };
    if (resourceCode) where.resourceCode = resourceCode;
    if (period) where.period = period;

    return prisma.quotaUsage.findMany({
      where,
      include: {
        resource: true,
      },
      orderBy: [{ period: "desc" }, { resourceCode: "asc" }],
    });
  },

  /**
   * Sets or updates custom tenant quota override.
   */
  async setTenantQuotaOverride(
    userId: string,
    organizationId: string,
    input: TenantQuotaOverrideInput
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new AppError("NOT_FOUND", `Organization '${organizationId}' not found`);
    }

    const def = await prisma.quotaDefinition.findUnique({
      where: { code: input.resourceCode },
    });
    if (!def) {
      throw new AppError("NOT_FOUND", `Quota resource '${input.resourceCode}' not found`);
    }

    const now = new Date();
    await prisma.tenantQuotaGrant.upsert({
      where: {
        organizationId_resourceCode: {
          organizationId,
          resourceCode: input.resourceCode,
        },
      },
      update: {
        quantity: input.isUnlimited ? null : input.quantity,
        isUnlimited: input.isUnlimited ?? false,
        overrideMode: input.overrideMode || "ADD",
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : now,
        effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : null,
        notes: input.notes,
        createdBy: userId,
      },
      create: {
        organizationId,
        resourceCode: input.resourceCode,
        quantity: input.isUnlimited ? null : input.quantity,
        isUnlimited: input.isUnlimited ?? false,
        overrideMode: input.overrideMode || "ADD",
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : now,
        effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : null,
        notes: input.notes,
        createdBy: userId,
      },
    });

    return this.resolveEffectiveQuotas(organizationId);
  },

  /**
   * Removes custom tenant quota override.
   */
  async removeTenantQuotaOverride(
    userId: string,
    organizationId: string,
    resourceCode: string
  ) {
    await prisma.tenantQuotaGrant.deleteMany({
      where: {
        organizationId,
        resourceCode,
      },
    });

    return this.resolveEffectiveQuotas(organizationId);
  },
};
