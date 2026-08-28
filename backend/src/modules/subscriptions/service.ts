import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";
import { Prisma } from "@prisma/client";

// ============================================================================
// PRICING RESOLUTION SERVICE
// ============================================================================

export const resolvePlanPrice = async (planCode: string, billingCycle: string) => {
  const plan = await prisma.plan.findUnique({
    where: { code: planCode },
  });

  if (!plan) {
    throw new AppError("BAD_REQUEST", `Plan '${planCode}' not found`);
  }

  if (plan.status !== "ACTIVE") {
    throw new AppError("BAD_REQUEST", `Plan '${planCode}' is not active (status: ${plan.status})`);
  }

  const price = await prisma.planPrice.findFirst({
    where: {
      planCode,
      billingCycle,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!price) {
    throw new AppError(
      "BAD_REQUEST",
      `No active price configured for Plan '${planCode}' with billing cycle '${billingCycle}'`
    );
  }

  return { plan, price };
};

export const resolveAddOnPrice = async (addOnCode: string, billingCycle: string) => {
  const addOn = await prisma.addOn.findUnique({
    where: { code: addOnCode },
  });

  if (!addOn) {
    throw new AppError("BAD_REQUEST", `Add-on '${addOnCode}' not found`);
  }

  if (addOn.status !== "ACTIVE") {
    throw new AppError("BAD_REQUEST", `Add-on '${addOnCode}' is not active (status: ${addOn.status})`);
  }

  const price = await prisma.addOnPrice.findFirst({
    where: {
      addOnCode,
      billingCycle,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!price) {
    throw new AppError(
      "BAD_REQUEST",
      `No active price configured for Add-on '${addOnCode}' with billing cycle '${billingCycle}'`
    );
  }

  return { addOn, price };
};

// ============================================================================
// SUBSCRIPTION SERVICE
// ============================================================================

export const listSubscriptions = async (filter?: {
  organizationId?: string;
  status?: string;
  planCode?: string;
}) => {
  return prisma.subscription.findMany({
    where: {
      ...(filter?.organizationId ? { organizationId: filter.organizationId } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.planCode ? { planCode: filter.planCode } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      organization: {
        select: { id: true, name: true, code: true, status: true },
      },
      plan: {
        select: { code: true, name: true, tier: true },
      },
      items: {
        include: {
          addOn: { select: { code: true, name: true } },
        },
      },
    },
  });
};

export const getSubscriptionById = async (id: string, userOrgId?: string, isSuperadmin: boolean = false) => {
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      organization: {
        select: { id: true, name: true, code: true, status: true },
      },
      plan: {
        include: {
          planFeatures: {
            include: {
              feature: { select: { key: true, name: true, moduleCode: true } },
            },
          },
        },
      },
      items: {
        include: {
          addOn: {
            include: {
              addOnFeatures: {
                include: {
                  feature: { select: { key: true, name: true, moduleCode: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!subscription) {
    throw new AppError("NOT_FOUND", `Subscription '${id}' not found`);
  }

  // Cross-organization access isolation
  if (!isSuperadmin && userOrgId && subscription.organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You do not have permission to access subscriptions for this organization");
  }

  return subscription;
};

export const createSubscription = async (userId: string, data: {
  organizationId: string;
  planCode: string;
  billingCycle?: string;
  startedAt?: string | Date;
  currentPeriodEnd?: string | Date;
  addOns?: Array<{ addOnCode: string; quantity?: number }>;
}) => {
  const billingCycle = data.billingCycle || "MONTHLY";

  // 1. Validate Organization
  const org = await prisma.organization.findUnique({
    where: { id: data.organizationId },
  });

  if (!org) {
    throw new AppError("BAD_REQUEST", `Organization '${data.organizationId}' not found`);
  }

  if (org.status !== "ACTIVE") {
    throw new AppError("BAD_REQUEST", `Organization '${org.name}' is disabled`);
  }

  // 2. Reject duplicate active subscription for the same organization
  const existingActive = await prisma.subscription.findFirst({
    where: {
      organizationId: data.organizationId,
      status: { in: ["ACTIVE", "TRIAL"] },
    },
  });

  if (existingActive) {
    throw new AppError(
      "CONFLICT",
      `Organization '${org.name}' already has an active subscription (${existingActive.planCode} - ${existingActive.status})`
    );
  }

  // 3. Resolve Plan & PlanPrice snapshot
  const { plan, price: planPrice } = await resolvePlanPrice(data.planCode, billingCycle);

  // 4. Resolve AddOns & AddOnPrices snapshots
  const resolvedItems: Array<{ addOnCode: string; quantity: number; unitPrice: Prisma.Decimal; currency: string }> = [];

  if (data.addOns && data.addOns.length > 0) {
    for (const item of data.addOns) {
      if (!item.quantity || item.quantity < 1) {
        throw new AppError("BAD_REQUEST", `Quantity for add-on '${item.addOnCode}' must be at least 1`);
      }
      const { price: addOnPrice } = await resolveAddOnPrice(item.addOnCode, billingCycle);
      resolvedItems.push({
        addOnCode: item.addOnCode,
        quantity: item.quantity,
        unitPrice: addOnPrice.amount,
        currency: addOnPrice.currency,
      });
    }
  }

  // 5. Calculate Period Dates
  const startDate = data.startedAt ? new Date(data.startedAt) : new Date();
  let endDate: Date;
  if (data.currentPeriodEnd) {
    endDate = new Date(data.currentPeriodEnd);
  } else {
    endDate = new Date(startDate);
    if (billingCycle === "YEARLY") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setDate(endDate.getDate() + 30);
    }
  }

  // 6. Transactional Creation with Price Snapshots
  const subscription = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.create({
      data: {
        organizationId: data.organizationId,
        planCode: plan.code,
        status: "ACTIVE",
        billingCycle,
        planPriceAmount: planPrice.amount,
        currency: planPrice.currency,
        startedAt: startDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
      },
    });

    for (const item of resolvedItems) {
      await tx.subscriptionItem.create({
        data: {
          subscriptionId: sub.id,
          addOnCode: item.addOnCode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: item.currency,
        },
      });
    }

    return sub;
  });

  await logActivity(userId, "SUBSCRIPTION_CREATED", "Subscription", subscription.id, {
    organizationId: org.id,
    planCode: plan.code,
    billingCycle,
    planPriceAmount: planPrice.amount.toString(),
    itemsCount: resolvedItems.length,
  });

  return getSubscriptionById(subscription.id, undefined, true);
};

export const updateSubscription = async (userId: string, id: string, data: {
  status?: string;
  currentPeriodEnd?: string | Date;
  cancelledAt?: string | Date | null;
  endedAt?: string | Date | null;
}, userOrgId?: string, isSuperadmin: boolean = false) => {
  const subscription = await prisma.subscription.findUnique({ where: { id } });
  if (!subscription) {
    throw new AppError("NOT_FOUND", `Subscription '${id}' not found`);
  }

  if (!isSuperadmin && userOrgId && subscription.organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You do not have permission to update subscriptions for this organization");
  }

  const updateData: any = {};
  if (data.status) {
    updateData.status = data.status;
    if (data.status === "CANCELLED" && !data.cancelledAt && !subscription.cancelledAt) {
      updateData.cancelledAt = new Date();
    }
    if (data.status === "EXPIRED" && !data.endedAt && !subscription.endedAt) {
      updateData.endedAt = new Date();
    }
  }
  if (data.currentPeriodEnd) updateData.currentPeriodEnd = new Date(data.currentPeriodEnd);
  if (data.cancelledAt !== undefined) updateData.cancelledAt = data.cancelledAt ? new Date(data.cancelledAt) : null;
  if (data.endedAt !== undefined) updateData.endedAt = data.endedAt ? new Date(data.endedAt) : null;

  const updated = await prisma.subscription.update({
    where: { id },
    data: updateData,
  });

  await logActivity(userId, "SUBSCRIPTION_UPDATED", "Subscription", updated.id, { id, updates: data });
  return getSubscriptionById(updated.id, undefined, true);
};

export const addSubscriptionItem = async (userId: string, subscriptionId: string, data: {
  addOnCode: string;
  quantity?: number;
}, userOrgId?: string, isSuperadmin: boolean = false) => {
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription) {
    throw new AppError("NOT_FOUND", `Subscription '${subscriptionId}' not found`);
  }

  if (!isSuperadmin && userOrgId && subscription.organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You do not have permission to modify this subscription");
  }

  if (subscription.status !== "ACTIVE" && subscription.status !== "TRIAL") {
    throw new AppError("BAD_REQUEST", `Cannot add items to subscription with status '${subscription.status}'`);
  }

  const quantity = data.quantity && data.quantity >= 1 ? data.quantity : 1;
  const { addOn, price } = await resolveAddOnPrice(data.addOnCode, subscription.billingCycle);

  const item = await prisma.subscriptionItem.upsert({
    where: {
      subscriptionId_addOnCode: {
        subscriptionId,
        addOnCode: addOn.code,
      },
    },
    update: {
      quantity,
    },
    create: {
      subscriptionId,
      addOnCode: addOn.code,
      quantity,
      unitPrice: price.amount, // snapshot contracted price
      currency: price.currency,
    },
  });

  await logActivity(userId, "SUBSCRIPTION_ITEM_ADDED", "SubscriptionItem", item.id, {
    subscriptionId,
    addOnCode: addOn.code,
    quantity,
    unitPrice: price.amount.toString(),
  });

  return getSubscriptionById(subscriptionId, undefined, true);
};

export const removeSubscriptionItem = async (userId: string, subscriptionId: string, itemId: string, userOrgId?: string, isSuperadmin: boolean = false) => {
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription) {
    throw new AppError("NOT_FOUND", `Subscription '${subscriptionId}' not found`);
  }

  if (!isSuperadmin && userOrgId && subscription.organizationId !== userOrgId) {
    throw new AppError("FORBIDDEN", "You do not have permission to modify this subscription");
  }

  const item = await prisma.subscriptionItem.findUnique({ where: { id: itemId } });
  if (!item || item.subscriptionId !== subscriptionId) {
    throw new AppError("NOT_FOUND", `Subscription item '${itemId}' not found on this subscription`);
  }

  await prisma.subscriptionItem.delete({ where: { id: itemId } });

  await logActivity(userId, "SUBSCRIPTION_ITEM_REMOVED", "SubscriptionItem", itemId, {
    subscriptionId,
    addOnCode: item.addOnCode,
  });

  return { success: true };
};

// ============================================================================
// CATALOG PRICING MANAGEMENT (DEV / ADMIN CONFIG)
// ============================================================================

export const listAllPrices = async () => {
  const [planPrices, addOnPrices] = await Promise.all([
    prisma.planPrice.findMany({
      orderBy: [{ planCode: "asc" }, { billingCycle: "asc" }],
      include: { plan: { select: { code: true, name: true, tier: true } } },
    }),
    prisma.addOnPrice.findMany({
      orderBy: [{ addOnCode: "asc" }, { billingCycle: "asc" }],
      include: { addOn: { select: { code: true, name: true } } },
    }),
  ]);

  return { planPrices, addOnPrices };
};

export const upsertPlanPrice = async (userId: string, data: {
  planCode: string;
  billingCycle: string;
  amount: number;
  currency?: string;
  isActive?: boolean;
}) => {
  const plan = await prisma.plan.findUnique({ where: { code: data.planCode } });
  if (!plan) {
    throw new AppError("BAD_REQUEST", `Plan '${data.planCode}' not found`);
  }

  // Deactivate existing active prices for same plan & cycle if setting isActive=true
  if (data.isActive !== false) {
    await prisma.planPrice.updateMany({
      where: { planCode: data.planCode, billingCycle: data.billingCycle },
      data: { isActive: false },
    });
  }

  const price = await prisma.planPrice.create({
    data: {
      planCode: data.planCode,
      billingCycle: data.billingCycle,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency || "IDR",
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  await logActivity(userId, "PLAN_PRICE_CREATED", "PlanPrice", price.id, data);
  return price;
};

export const upsertAddOnPrice = async (userId: string, data: {
  addOnCode: string;
  billingCycle: string;
  amount: number;
  currency?: string;
  isActive?: boolean;
}) => {
  const addOn = await prisma.addOn.findUnique({ where: { code: data.addOnCode } });
  if (!addOn) {
    throw new AppError("BAD_REQUEST", `Add-on '${data.addOnCode}' not found`);
  }

  if (data.isActive !== false) {
    await prisma.addOnPrice.updateMany({
      where: { addOnCode: data.addOnCode, billingCycle: data.billingCycle },
      data: { isActive: false },
    });
  }

  const price = await prisma.addOnPrice.create({
    data: {
      addOnCode: data.addOnCode,
      billingCycle: data.billingCycle,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency || "IDR",
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  await logActivity(userId, "ADDON_PRICE_CREATED", "AddOnPrice", price.id, data);
  return price;
};
