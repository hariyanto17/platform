import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

// ============================================================================
// MODULES SERVICE
// ============================================================================

export const listModules = async () => {
  return prisma.module.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    include: {
      _count: {
        select: { features: true },
      },
    },
  });
};

export const getModuleByCode = async (code: string) => {
  const mod = await prisma.module.findUnique({
    where: { code },
    include: {
      features: {
        orderBy: { key: "asc" },
      },
    },
  });
  if (!mod) {
    throw new AppError("NOT_FOUND", `Module '${code}' not found`);
  }
  return mod;
};

export const createModule = async (userId: string, data: {
  code: string;
  name: string;
  description?: string | null;
  isShared?: boolean;
  status?: string;
  sortOrder?: number;
}) => {
  const existing = await prisma.module.findUnique({ where: { code: data.code } });
  if (existing) {
    throw new AppError("CONFLICT", `Module with code '${data.code}' already exists`);
  }

  const mod = await prisma.module.create({ data });
  await logActivity(userId, "CATALOG_MODULE_CREATED", "Module", mod.id, { code: mod.code, name: mod.name });
  return mod;
};

export const updateModule = async (userId: string, code: string, data: {
  name?: string;
  description?: string | null;
  isShared?: boolean;
  status?: string;
  sortOrder?: number;
}) => {
  const mod = await prisma.module.findUnique({ where: { code } });
  if (!mod) {
    throw new AppError("NOT_FOUND", `Module '${code}' not found`);
  }

  const updated = await prisma.module.update({
    where: { code },
    data,
  });
  await logActivity(userId, "CATALOG_MODULE_UPDATED", "Module", updated.id, { code, updates: data });
  return updated;
};

// ============================================================================
// FEATURES SERVICE
// ============================================================================

export const listFeatures = async (filter?: { moduleCode?: string; status?: string; isCore?: boolean }) => {
  return prisma.feature.findMany({
    where: {
      ...(filter?.moduleCode ? { moduleCode: filter.moduleCode } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.isCore !== undefined ? { isCore: filter.isCore } : {}),
    },
    orderBy: { key: "asc" },
    include: {
      module: {
        select: { code: true, name: true },
      },
      dependencies: {
        include: {
          dependsOn: { select: { key: true, name: true } },
        },
      },
      requiredBy: {
        include: {
          feature: { select: { key: true, name: true } },
        },
      },
      _count: {
        select: {
          planFeatures: true,
          addOnFeatures: true,
          verticalFeatures: true,
        },
      },
    },
  });
};

export const getFeatureByKey = async (key: string) => {
  const feature = await prisma.feature.findUnique({
    where: { key },
    include: {
      module: true,
      dependencies: {
        include: {
          dependsOn: { select: { key: true, name: true, moduleCode: true } },
        },
      },
      requiredBy: {
        include: {
          feature: { select: { key: true, name: true, moduleCode: true } },
        },
      },
      planFeatures: {
        include: { plan: { select: { code: true, name: true, tier: true } } },
      },
      addOnFeatures: {
        include: { addOn: { select: { code: true, name: true } } },
      },
      verticalFeatures: {
        include: { vertical: { select: { code: true, name: true } } },
      },
    },
  });
  if (!feature) {
    throw new AppError("NOT_FOUND", `Feature '${key}' not found`);
  }
  return feature;
};

export const createFeature = async (userId: string, data: {
  key: string;
  name: string;
  description?: string | null;
  moduleCode: string;
  isCore?: boolean;
  status?: string;
}) => {
  const existing = await prisma.feature.findUnique({ where: { key: data.key } });
  if (existing) {
    throw new AppError("CONFLICT", `Feature with key '${data.key}' already exists`);
  }

  const mod = await prisma.module.findUnique({ where: { code: data.moduleCode } });
  if (!mod) {
    throw new AppError("BAD_REQUEST", `Module with code '${data.moduleCode}' does not exist`);
  }

  const feature = await prisma.feature.create({ data });
  await logActivity(userId, "CATALOG_FEATURE_CREATED", "Feature", feature.id, { key: feature.key, name: feature.name });
  return feature;
};

export const updateFeature = async (userId: string, key: string, data: {
  name?: string;
  description?: string | null;
  moduleCode?: string;
  isCore?: boolean;
  status?: string;
}) => {
  const feature = await prisma.feature.findUnique({ where: { key } });
  if (!feature) {
    throw new AppError("NOT_FOUND", `Feature '${key}' not found`);
  }

  if (data.moduleCode) {
    const mod = await prisma.module.findUnique({ where: { code: data.moduleCode } });
    if (!mod) {
      throw new AppError("BAD_REQUEST", `Module with code '${data.moduleCode}' does not exist`);
    }
  }

  const updated = await prisma.feature.update({
    where: { key },
    data,
  });
  await logActivity(userId, "CATALOG_FEATURE_UPDATED", "Feature", updated.id, { key, updates: data });
  return updated;
};

// ============================================================================
// FEATURE DEPENDENCIES
// ============================================================================

export const addFeatureDependency = async (userId: string, data: {
  featureKey: string;
  dependsOnKey: string;
  dependencyType?: string;
}) => {
  if (data.featureKey === data.dependsOnKey) {
    throw new AppError("BAD_REQUEST", "A feature cannot depend on itself");
  }

  const [feature, dependsOn] = await Promise.all([
    prisma.feature.findUnique({ where: { key: data.featureKey } }),
    prisma.feature.findUnique({ where: { key: data.dependsOnKey } }),
  ]);

  if (!feature) {
    throw new AppError("BAD_REQUEST", `Feature '${data.featureKey}' not found`);
  }
  if (!dependsOn) {
    throw new AppError("BAD_REQUEST", `Dependent feature '${data.dependsOnKey}' not found`);
  }

  // Check circular dependency: check if dependsOn already depends on feature directly or indirectly
  const isCircular = await checkCircularDependency(data.dependsOnKey, data.featureKey);
  if (isCircular) {
    throw new AppError("BAD_REQUEST", `Circular dependency detected: '${data.dependsOnKey}' already depends on '${data.featureKey}'`);
  }

  const dep = await prisma.featureDependency.upsert({
    where: {
      featureKey_dependsOnKey: {
        featureKey: data.featureKey,
        dependsOnKey: data.dependsOnKey,
      },
    },
    update: {
      dependencyType: data.dependencyType || "REQUIRED",
    },
    create: {
      featureKey: data.featureKey,
      dependsOnKey: data.dependsOnKey,
      dependencyType: data.dependencyType || "REQUIRED",
    },
  });

  await logActivity(userId, "CATALOG_DEPENDENCY_ADDED", "FeatureDependency", dep.id, data);
  return dep;
};

export const removeFeatureDependency = async (userId: string, featureKey: string, dependsOnKey: string) => {
  const dep = await prisma.featureDependency.findUnique({
    where: {
      featureKey_dependsOnKey: {
        featureKey,
        dependsOnKey,
      },
    },
  });

  if (!dep) {
    throw new AppError("NOT_FOUND", "Dependency relationship not found");
  }

  await prisma.featureDependency.delete({
    where: { id: dep.id },
  });

  await logActivity(userId, "CATALOG_DEPENDENCY_REMOVED", "FeatureDependency", dep.id, { featureKey, dependsOnKey });
  return { success: true };
};

const checkCircularDependency = async (fromKey: string, targetKey: string): Promise<boolean> => {
  const visited = new Set<string>();
  const queue = [fromKey];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetKey) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const deps = await prisma.featureDependency.findMany({
      where: { featureKey: current },
      select: { dependsOnKey: true },
    });

    for (const d of deps) {
      queue.push(d.dependsOnKey);
    }
  }

  return false;
};

// ============================================================================
// PLANS SERVICE
// ============================================================================

export const listPlans = async () => {
  return prisma.plan.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    include: {
      planFeatures: {
        include: {
          feature: {
            select: { key: true, name: true, moduleCode: true, isCore: true, status: true },
          },
        },
      },
    },
  });
};

export const getPlanByCode = async (code: string) => {
  const plan = await prisma.plan.findUnique({
    where: { code },
    include: {
      planFeatures: {
        include: {
          feature: {
            include: {
              module: { select: { code: true, name: true } },
              dependencies: { select: { dependsOnKey: true, dependencyType: true } },
            },
          },
        },
      },
    },
  });
  if (!plan) {
    throw new AppError("NOT_FOUND", `Plan '${code}' not found`);
  }
  return plan;
};

export const createPlan = async (userId: string, data: {
  code: string;
  name: string;
  tier: string;
  description?: string | null;
  status?: string;
  sortOrder?: number;
  featureKeys?: string[];
}) => {
  const existing = await prisma.plan.findUnique({ where: { code: data.code } });
  if (existing) {
    throw new AppError("CONFLICT", `Plan with code '${data.code}' already exists`);
  }

  const { featureKeys, ...planData } = data;

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.plan.create({ data: planData });

    if (featureKeys && featureKeys.length > 0) {
      // Validate features
      const features = await tx.feature.findMany({
        where: { key: { in: featureKeys } },
        select: { key: true },
      });
      const validKeys = new Set(features.map((f) => f.key));

      for (const fk of featureKeys) {
        if (validKeys.has(fk)) {
          await tx.planFeature.create({
            data: {
              planCode: created.code,
              featureKey: fk,
            },
          });
        }
      }
    }

    return created;
  });

  await logActivity(userId, "CATALOG_PLAN_CREATED", "Plan", plan.id, { code: plan.code, tier: plan.tier });
  return getPlanByCode(plan.code);
};

export const updatePlan = async (userId: string, code: string, data: {
  name?: string;
  tier?: string;
  description?: string | null;
  status?: string;
  sortOrder?: number;
  featureKeys?: string[];
}) => {
  const plan = await prisma.plan.findUnique({ where: { code } });
  if (!plan) {
    throw new AppError("NOT_FOUND", `Plan '${code}' not found`);
  }

  const { featureKeys, ...updateData } = data;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.plan.update({
        where: { code },
        data: updateData,
      });
    }

    if (featureKeys !== undefined) {
      // Replace plan features
      await tx.planFeature.deleteMany({ where: { planCode: code } });

      if (featureKeys.length > 0) {
        const features = await tx.feature.findMany({
          where: { key: { in: featureKeys } },
          select: { key: true },
        });
        const validKeys = new Set(features.map((f) => f.key));

        for (const fk of featureKeys) {
          if (validKeys.has(fk)) {
            await tx.planFeature.create({
              data: {
                planCode: code,
                featureKey: fk,
              },
            });
          }
        }
      }
    }
  });

  await logActivity(userId, "CATALOG_PLAN_UPDATED", "Plan", plan.id, { code, updates: data });
  return getPlanByCode(code);
};

// ============================================================================
// ADD-ONS SERVICE
// ============================================================================

export const listAddOns = async () => {
  return prisma.addOn.findMany({
    orderBy: { code: "asc" },
    include: {
      addOnFeatures: {
        include: {
          feature: {
            select: { key: true, name: true, moduleCode: true },
          },
        },
      },
    },
  });
};

export const getAddOnByCode = async (code: string) => {
  const addOn = await prisma.addOn.findUnique({
    where: { code },
    include: {
      addOnFeatures: {
        include: {
          feature: {
            include: {
              module: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!addOn) {
    throw new AppError("NOT_FOUND", `Add-on '${code}' not found`);
  }
  return addOn;
};

export const createAddOn = async (userId: string, data: {
  code: string;
  name: string;
  description?: string | null;
  status?: string;
  featureKeys?: string[];
}) => {
  const existing = await prisma.addOn.findUnique({ where: { code: data.code } });
  if (existing) {
    throw new AppError("CONFLICT", `Add-on with code '${data.code}' already exists`);
  }

  const { featureKeys, ...addOnData } = data;

  const addOn = await prisma.$transaction(async (tx) => {
    const created = await tx.addOn.create({ data: addOnData });

    if (featureKeys && featureKeys.length > 0) {
      const features = await tx.feature.findMany({
        where: { key: { in: featureKeys } },
        select: { key: true },
      });
      const validKeys = new Set(features.map((f) => f.key));

      for (const fk of featureKeys) {
        if (validKeys.has(fk)) {
          await tx.addOnFeature.create({
            data: {
              addOnCode: created.code,
              featureKey: fk,
            },
          });
        }
      }
    }

    return created;
  });

  await logActivity(userId, "CATALOG_ADDON_CREATED", "AddOn", addOn.id, { code: addOn.code });
  return getAddOnByCode(addOn.code);
};

export const updateAddOn = async (userId: string, code: string, data: {
  name?: string;
  description?: string | null;
  status?: string;
  featureKeys?: string[];
}) => {
  const addOn = await prisma.addOn.findUnique({ where: { code } });
  if (!addOn) {
    throw new AppError("NOT_FOUND", `Add-on '${code}' not found`);
  }

  const { featureKeys, ...updateData } = data;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.addOn.update({
        where: { code },
        data: updateData,
      });
    }

    if (featureKeys !== undefined) {
      await tx.addOnFeature.deleteMany({ where: { addOnCode: code } });

      if (featureKeys.length > 0) {
        const features = await tx.feature.findMany({
          where: { key: { in: featureKeys } },
          select: { key: true },
        });
        const validKeys = new Set(features.map((f) => f.key));

        for (const fk of featureKeys) {
          if (validKeys.has(fk)) {
            await tx.addOnFeature.create({
              data: {
                addOnCode: code,
                featureKey: fk,
              },
            });
          }
        }
      }
    }
  });

  await logActivity(userId, "CATALOG_ADDON_UPDATED", "AddOn", addOn.id, { code, updates: data });
  return getAddOnByCode(code);
};

// ============================================================================
// VERTICALS SERVICE
// ============================================================================

export const listVerticals = async () => {
  return prisma.vertical.findMany({
    orderBy: { code: "asc" },
    include: {
      verticalFeatures: {
        include: {
          feature: {
            select: { key: true, name: true, moduleCode: true },
          },
        },
      },
    },
  });
};

export const getVerticalByCode = async (code: string) => {
  const vertical = await prisma.vertical.findUnique({
    where: { code },
    include: {
      verticalFeatures: {
        include: {
          feature: {
            include: {
              module: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!vertical) {
    throw new AppError("NOT_FOUND", `Vertical '${code}' not found`);
  }
  return vertical;
};

export const createVertical = async (userId: string, data: {
  code: string;
  name: string;
  description?: string | null;
  status?: string;
  featureKeys?: string[];
}) => {
  const existing = await prisma.vertical.findUnique({ where: { code: data.code } });
  if (existing) {
    throw new AppError("CONFLICT", `Vertical with code '${data.code}' already exists`);
  }

  const { featureKeys, ...verticalData } = data;

  const vertical = await prisma.$transaction(async (tx) => {
    const created = await tx.vertical.create({ data: verticalData });

    if (featureKeys && featureKeys.length > 0) {
      const features = await tx.feature.findMany({
        where: { key: { in: featureKeys } },
        select: { key: true },
      });
      const validKeys = new Set(features.map((f) => f.key));

      for (const fk of featureKeys) {
        if (validKeys.has(fk)) {
          await tx.verticalFeature.create({
            data: {
              verticalCode: created.code,
              featureKey: fk,
            },
          });
        }
      }
    }

    return created;
  });

  await logActivity(userId, "CATALOG_VERTICAL_CREATED", "Vertical", vertical.id, { code: vertical.code });
  return getVerticalByCode(vertical.code);
};

export const updateVertical = async (userId: string, code: string, data: {
  name?: string;
  description?: string | null;
  status?: string;
  featureKeys?: string[];
}) => {
  const vertical = await prisma.vertical.findUnique({ where: { code } });
  if (!vertical) {
    throw new AppError("NOT_FOUND", `Vertical '${code}' not found`);
  }

  const { featureKeys, ...updateData } = data;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.vertical.update({
        where: { code },
        data: updateData,
      });
    }

    if (featureKeys !== undefined) {
      await tx.verticalFeature.deleteMany({ where: { verticalCode: code } });

      if (featureKeys.length > 0) {
        const features = await tx.feature.findMany({
          where: { key: { in: featureKeys } },
          select: { key: true },
        });
        const validKeys = new Set(features.map((f) => f.key));

        for (const fk of featureKeys) {
          if (validKeys.has(fk)) {
            await tx.verticalFeature.create({
              data: {
                verticalCode: code,
                featureKey: fk,
              },
            });
          }
        }
      }
    }
  });

  await logActivity(userId, "CATALOG_VERTICAL_UPDATED", "Vertical", vertical.id, { code, updates: data });
  return getVerticalByCode(code);
};

// ============================================================================
// CATALOG SUMMARY OVERVIEW
// ============================================================================

export const getCatalogOverview = async () => {
  const [plansCount, modulesCount, featuresCount, addOnsCount, verticalsCount] = await Promise.all([
    prisma.plan.count(),
    prisma.module.count(),
    prisma.feature.count(),
    prisma.addOn.count(),
    prisma.vertical.count(),
  ]);

  return {
    plansCount,
    modulesCount,
    featuresCount,
    addOnsCount,
    verticalsCount,
  };
};
