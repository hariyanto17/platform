import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";
import { ResolvedEntitlements, EffectiveFeatureDetail, GrantSource } from "./types";

// ============================================================================
// EFFECTIVE ENTITLEMENT RESOLVER
// ============================================================================

export const resolveEffectiveEntitlements = async (
  organizationId: string
): Promise<ResolvedEntitlements> => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, code: true, status: true },
  });

  if (!org) {
    throw new AppError("NOT_FOUND", `Organization '${organizationId}' not found`);
  }

  // Feature map to accumulate sources
  const featureDetailMap: Record<string, EffectiveFeatureDetail> = {};
  const revokedKeys = new Set<string>();
  const now = new Date();

  // 1. Fetch all active catalog features for metadata lookup
  const allFeatures = await prisma.feature.findMany({
    where: { status: "ACTIVE" },
    select: { key: true, name: true, moduleCode: true, isCore: true },
  });
  const catalogFeatureMap = new Map(allFeatures.map((f) => [f.key, f]));

  // Helper to register a candidate grant source
  const addGrantSource = (
    key: string,
    source: GrantSource
  ) => {
    const meta = catalogFeatureMap.get(key);
    if (!meta) return; // Ignore if feature is inactive/unknown

    if (!featureDetailMap[key]) {
      featureDetailMap[key] = {
        key,
        name: meta.name,
        moduleCode: meta.moduleCode,
        isCore: meta.isCore,
        active: false,
        sources: [],
        isRevoked: false,
      };
    }
    // Avoid duplicate source entries
    const exists = featureDetailMap[key].sources.some(
      (s) => s.type === source.type && s.code === source.code
    );
    if (!exists) {
      featureDetailMap[key].sources.push(source);
    }
  };

  // 2. Fetch Active Subscription
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: { in: ["ACTIVE", "TRIAL"] },
    },
    include: {
      plan: {
        include: {
          planFeatures: {
            include: { feature: true },
          },
        },
      },
      items: {
        include: {
          addOn: {
            include: {
              addOnFeatures: {
                include: { feature: true },
              },
            },
          },
        },
      },
    },
  });

  // 3. Process Commercial Plan & Add-ons Grants if active subscription exists
  if (activeSubscription && activeSubscription.plan) {
    // 3a. Plan Grants
    for (const pf of activeSubscription.plan.planFeatures) {
      if (pf.feature.status === "ACTIVE") {
        addGrantSource(pf.featureKey, {
          type: "PLAN",
          code: activeSubscription.plan.code,
          name: activeSubscription.plan.name,
        });
      }
    }

    // 3b. Add-On Grants
    for (const item of activeSubscription.items) {
      if (item.addOn && item.addOn.status === "ACTIVE") {
        for (const af of item.addOn.addOnFeatures) {
          if (af.feature.status === "ACTIVE") {
            addGrantSource(af.featureKey, {
              type: "ADD_ON",
              code: item.addOn.code,
              name: item.addOn.name,
            });
          }
        }
      }
    }
  }

  // 4. Process Verticals Grants (Fetch mapped application verticals if applicable)
  const verticals = await prisma.vertical.findMany({
    where: { status: "ACTIVE" },
    include: { verticalFeatures: { include: { feature: true } } },
  });

  // If organization has specific vertical indicators (e.g. Cinema / FnB / Parking apps)
  const orgApps = await prisma.organizationApplication.findMany({
    where: { organizationId },
    include: { application: { select: { code: true } } },
  });
  const appCodes = new Set(orgApps.map((a) => a.application.code));

  for (const vert of verticals) {
    // Match vertical to organization applications
    const isMatched =
      (vert.code === "VERTICAL_CINEMA" && appCodes.has("TICKETING")) ||
      (vert.code === "VERTICAL_FNB" && appCodes.has("CONCESSION")) ||
      (vert.code === "VERTICAL_PARKING" && appCodes.has("PARKING"));

    if (isMatched) {
      for (const vf of vert.verticalFeatures) {
        if (vf.feature.status === "ACTIVE") {
          addGrantSource(vf.featureKey, {
            type: "VERTICAL",
            code: vert.code,
            name: vert.name,
          });
        }
      }
    }
  }

  // 5. Process Tenant EntitlementGrants (Custom Overrides & Explicit Revocations)
  const grants = await prisma.entitlementGrant.findMany({
    where: { organizationId },
  });

  for (const g of grants) {
    // Date validity check
    const isDateValid =
      now >= g.effectiveFrom &&
      (!g.effectiveUntil || now <= g.effectiveUntil);

    if (g.status === "REVOKED") {
      revokedKeys.add(g.featureKey);
    } else if (
      (g.status === "ACTIVE" || g.status === "GRANTED") &&
      isDateValid
    ) {
      addGrantSource(g.featureKey, {
        type: "CUSTOM",
        code: g.grantSourceCode || "MANUAL_OVERRIDE",
        name: "Custom Enterprise Grant",
        grantId: g.id,
      });
    }
  }

  // 6. Mark explicit revocations
  for (const rKey of revokedKeys) {
    if (featureDetailMap[rKey]) {
      featureDetailMap[rKey].isRevoked = true;
    } else {
      const meta = catalogFeatureMap.get(rKey);
      if (meta) {
        featureDetailMap[rKey] = {
          key: rKey,
          name: meta.name,
          moduleCode: meta.moduleCode,
          isCore: meta.isCore,
          active: false,
          sources: [],
          isRevoked: true,
        };
      }
    }
  }

  // 7. Initial Candidate Set: has at least one source and NOT revoked
  const candidateKeys = Object.keys(featureDetailMap).filter(
    (k) => featureDetailMap[k].sources.length > 0 && !revokedKeys.has(k)
  );

  // 8. Dependency Validation
  const candidateSet = new Set(candidateKeys);
  const dependencies = await prisma.featureDependency.findMany({
    where: {
      featureKey: { in: candidateKeys },
      dependencyType: "REQUIRED",
    },
  });

  const dependencyMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!dependencyMap.has(dep.featureKey)) {
      dependencyMap.set(dep.featureKey, []);
    }
    dependencyMap.get(dep.featureKey)!.push(dep.dependsOnKey);
  }

  const effectiveKeys: string[] = [];

  for (const key of candidateKeys) {
    const requiredDeps = dependencyMap.get(key) || [];
    const missing = requiredDeps.filter((depKey) => !candidateSet.has(depKey));

    if (missing.length > 0) {
      featureDetailMap[key].active = false;
      featureDetailMap[key].missingDependencies = missing;
    } else {
      featureDetailMap[key].active = true;
      effectiveKeys.push(key);
    }
  }

  // 9. Deterministic Sort
  effectiveKeys.sort();
  const sortedRevokedKeys = Array.from(revokedKeys).sort();

  return {
    organizationId: org.id,
    organizationName: org.name,
    subscriptionId: activeSubscription?.id || null,
    planCode: activeSubscription?.planCode || null,
    subscriptionStatus: activeSubscription?.status || null,
    effectiveFeatures: effectiveKeys,
    featureDetails: featureDetailMap,
    revokedFeatures: sortedRevokedKeys,
    totalEffective: effectiveKeys.length,
    totalRevoked: sortedRevokedKeys.length,
  };
};

// ============================================================================
// MANUAL GRANTS & REVOCATIONS (TENANT OVERRIDES)
// ============================================================================

export const grantCustomEntitlement = async (
  userId: string,
  organizationId: string,
  data: {
    featureKey: string;
    effectiveUntil?: string | Date | null;
    notes?: string;
  }
) => {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new AppError("NOT_FOUND", `Organization '${organizationId}' not found`);

  const feature = await prisma.feature.findUnique({ where: { key: data.featureKey } });
  if (!feature) throw new AppError("BAD_REQUEST", `Feature '${data.featureKey}' not found in catalog`);
  if (feature.status !== "ACTIVE") {
    throw new AppError("BAD_REQUEST", `Feature '${data.featureKey}' is disabled in catalog`);
  }

  // Upsert custom grant
  const existing = await prisma.entitlementGrant.findFirst({
    where: {
      organizationId,
      featureKey: data.featureKey,
      grantType: "CUSTOM",
    },
  });

  const grant = existing
    ? await prisma.entitlementGrant.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          effectiveUntil: data.effectiveUntil ? new Date(data.effectiveUntil) : null,
          notes: data.notes || "Manual Enterprise Custom Grant",
          createdBy: userId,
        },
      })
    : await prisma.entitlementGrant.create({
        data: {
          organizationId,
          featureKey: data.featureKey,
          grantType: "CUSTOM",
          grantSourceCode: "MANUAL_OVERRIDE",
          status: "ACTIVE",
          effectiveFrom: new Date(),
          effectiveUntil: data.effectiveUntil ? new Date(data.effectiveUntil) : null,
          notes: data.notes || "Manual Enterprise Custom Grant",
          createdBy: userId,
        },
      });

  await logActivity(userId, "ENTITLEMENT_GRANTED", "EntitlementGrant", grant.id, {
    organizationId,
    featureKey: data.featureKey,
    notes: data.notes,
  });

  return resolveEffectiveEntitlements(organizationId);
};

export const revokeEntitlement = async (
  userId: string,
  organizationId: string,
  data: {
    featureKey: string;
    notes?: string;
  }
) => {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new AppError("NOT_FOUND", `Organization '${organizationId}' not found`);

  const feature = await prisma.feature.findUnique({ where: { key: data.featureKey } });
  if (!feature) throw new AppError("BAD_REQUEST", `Feature '${data.featureKey}' not found in catalog`);

  const existing = await prisma.entitlementGrant.findFirst({
    where: {
      organizationId,
      featureKey: data.featureKey,
      grantType: "CUSTOM",
    },
  });

  const grant = existing
    ? await prisma.entitlementGrant.update({
        where: { id: existing.id },
        data: {
          status: "REVOKED",
          notes: data.notes || "Explicit Tenant Revocation",
          createdBy: userId,
        },
      })
    : await prisma.entitlementGrant.create({
        data: {
          organizationId,
          featureKey: data.featureKey,
          grantType: "CUSTOM",
          grantSourceCode: "MANUAL_OVERRIDE",
          status: "REVOKED",
          effectiveFrom: new Date(),
          notes: data.notes || "Explicit Tenant Revocation",
          createdBy: userId,
        },
      });

  await logActivity(userId, "ENTITLEMENT_REVOKED", "EntitlementGrant", grant.id, {
    organizationId,
    featureKey: data.featureKey,
    notes: data.notes,
  });

  return resolveEffectiveEntitlements(organizationId);
};

export const removeOverride = async (
  userId: string,
  organizationId: string,
  featureKey: string
) => {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new AppError("NOT_FOUND", `Organization '${organizationId}' not found`);

  await prisma.entitlementGrant.deleteMany({
    where: {
      organizationId,
      featureKey,
      grantType: "CUSTOM",
    },
  });

  await logActivity(userId, "ENTITLEMENT_OVERRIDE_REMOVED", "EntitlementGrant", `${organizationId}:${featureKey}`, {
    organizationId,
    featureKey,
  });

  return resolveEffectiveEntitlements(organizationId);
};

export const listOrganizationGrants = async (organizationId: string) => {
  return prisma.entitlementGrant.findMany({
    where: { organizationId },
    include: {
      feature: { select: { key: true, name: true, moduleCode: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};
