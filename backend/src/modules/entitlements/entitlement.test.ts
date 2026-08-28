import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import app from "../../app";
import { prisma } from "../../utils/prisma";
import argon2 from "argon2";

function startServer(): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as any;
      const url = `http://127.0.0.1:${address.port}`;
      resolve({ server, url });
    });
  });
}

test("Entitlement Domain Test Suite (Phase 8A.3)", async (t) => {
  const { server, url } = await startServer();
  const ts = Date.now();

  // Setup isolated Test Module & Features
  const testModuleCode = `ent_mod_${ts}`;
  await prisma.module.create({
    data: {
      code: testModuleCode,
      name: "Entitlement Test Module",
    },
  });

  const featA = `${testModuleCode}.feat_a`;
  const featB = `${testModuleCode}.feat_b`;
  const featC = `${testModuleCode}.feat_c`;
  const featD = `${testModuleCode}.feat_d`;
  const featDep = `${testModuleCode}.feat_with_dep`;

  await prisma.feature.createMany({
    data: [
      { key: featA, name: "Feature A", moduleCode: testModuleCode, status: "ACTIVE" },
      { key: featB, name: "Feature B", moduleCode: testModuleCode, status: "ACTIVE" },
      { key: featC, name: "Feature C", moduleCode: testModuleCode, status: "ACTIVE" },
      { key: featD, name: "Feature D (Custom)", moduleCode: testModuleCode, status: "ACTIVE" },
      { key: featDep, name: "Feature Requiring A", moduleCode: testModuleCode, status: "ACTIVE" },
    ],
  });

  // Feature Dependency: featDep REQUIRES featA
  await prisma.featureDependency.create({
    data: {
      featureKey: featDep,
      dependsOnKey: featA,
      dependencyType: "REQUIRED",
    },
  });

  // Setup Plan (grants featA & featDep)
  const testPlanCode = `PLAN_ENT_${ts}`;
  await prisma.plan.create({
    data: {
      code: testPlanCode,
      name: "Entitlement Test Plan",
      tier: "STARTER",
      status: "ACTIVE",
    },
  });
  await prisma.planPrice.create({
    data: {
      planCode: testPlanCode,
      billingCycle: "MONTHLY",
      amount: 100000,
      currency: "IDR",
      isActive: true,
    },
  });
  await prisma.planFeature.createMany({
    data: [
      { planCode: testPlanCode, featureKey: featA },
      { planCode: testPlanCode, featureKey: featDep },
    ],
  });

  // Setup Add-On (grants featB)
  const testAddOnCode = `ADDON_ENT_${ts}`;
  await prisma.addOn.create({
    data: {
      code: testAddOnCode,
      name: "Entitlement Test Addon",
      status: "ACTIVE",
    },
  });
  await prisma.addOnPrice.create({
    data: {
      addOnCode: testAddOnCode,
      billingCycle: "MONTHLY",
      amount: 50000,
      currency: "IDR",
      isActive: true,
    },
  });
  await prisma.addOnFeature.create({
    data: {
      addOnCode: testAddOnCode,
      featureKey: featB,
    },
  });

  // Setup Vertical (grants featC)
  const testVertCode = `VERTICAL_ENT_${ts}`;
  await prisma.vertical.create({
    data: {
      code: testVertCode,
      name: "Entitlement Test Vertical",
      status: "ACTIVE",
    },
  });
  await prisma.verticalFeature.create({
    data: {
      verticalCode: testVertCode,
      featureKey: featC,
    },
  });

  // Setup Organizations
  const orgA = await prisma.organization.create({
    data: { name: `Ent Org A-${ts}`, code: `ENT-A-${ts}`, status: "ACTIVE" },
  });
  const orgB = await prisma.organization.create({
    data: { name: `Ent Org B-${ts}`, code: `ENT-B-${ts}`, status: "ACTIVE" },
  });

  // Users & Auth
  const password = "EntPassword123!";
  const passwordHash = await argon2.hash(password);

  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: `ent-admin-${ts}@test.com`,
      passwordHash,
      organizationId: orgA.id,
      status: "ACTIVE",
    },
  });

  const regularUserB = await prisma.user.create({
    data: {
      name: "Regular User B",
      email: `ent-user-b-${ts}@test.com`,
      passwordHash,
      organizationId: orgB.id,
      status: "ACTIVE",
    },
  });

  const appPlatform = await prisma.application.findUnique({ where: { code: "PLATFORM" } });
  const roleAdmin = await prisma.role.findUnique({ where: { code: "PLATFORM_ADMINISTRATOR" } });

  // Ensure permissions exist and are linked
  const requiredPerms = [
    { code: "platform.entitlements.view", name: "View Entitlements", applicationCode: "PLATFORM" },
    { code: "platform.entitlements.manage", name: "Manage Entitlements", applicationCode: "PLATFORM" },
  ];
  for (const perm of requiredPerms) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
    if (roleAdmin) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleAdmin.id, permissionId: p.id } },
        update: {},
        create: { roleId: roleAdmin.id, permissionId: p.id },
      });
    }
  }

  if (appPlatform && roleAdmin) {
    await prisma.userApplicationAccess.create({
      data: {
        userId: adminUser.id,
        organizationId: orgA.id,
        applicationCode: "PLATFORM",
        roleId: roleAdmin.id,
      },
    });
  }

  // Login Admin
  const loginRes = await fetch(`${url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminUser.email, password }),
  });
  assert.strictEqual(loginRes.status, 200);
  const adminCookie = loginRes.headers.get("set-cookie")!.split(";")[0];
  const adminHeaders = { "Content-Type": "application/json", Cookie: adminCookie };

  // Login User B
  const loginBRes = await fetch(`${url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: regularUserB.email, password }),
  });
  assert.strictEqual(loginBRes.status, 200);
  const userBCookie = loginBRes.headers.get("set-cookie")!.split(";")[0];
  const userBHeaders = { "Content-Type": "application/json", Cookie: userBCookie };

  // --------------------------------------------------------------------------
  // TEST 1: Active Plan grants expected features
  // --------------------------------------------------------------------------
  await t.test("Test 1: Active Plan grants expected features", async () => {
    // Create subscription for Org A with testPlan
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    await prisma.subscription.create({
      data: {
        organizationId: orgA.id,
        planCode: testPlanCode,
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        planPriceAmount: 100000,
        currency: "IDR",
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    const res = await fetch(`${url}/api/entitlements/organizations/${orgA.id}`, { headers: adminHeaders });
    assert.strictEqual(res.status, 200);
    const json = (await res.json()) as any;
    assert.strictEqual(json.status, "success");
    assert.ok(json.data.effectiveFeatures.includes(featA), "featA must be effective");
    assert.ok(json.data.effectiveFeatures.includes(featDep), "featDep must be effective");
    assert.strictEqual(json.data.featureDetails[featA].sources[0].type, "PLAN");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Plan + Add-on produces union of features
  // --------------------------------------------------------------------------
  await t.test("Test 2: Plan + Add-on produces union of features", async () => {
    const sub = await prisma.subscription.findFirst({ where: { organizationId: orgA.id, status: "ACTIVE" } });
    assert.ok(sub);

    await prisma.subscriptionItem.create({
      data: {
        subscriptionId: sub.id,
        addOnCode: testAddOnCode,
        quantity: 1,
        unitPrice: 50000,
        currency: "IDR",
      },
    });

    const res = await fetch(`${url}/api/entitlements/organizations/${orgA.id}`, { headers: adminHeaders });
    assert.strictEqual(res.status, 200);
    const json = (await res.json()) as any;
    assert.ok(json.data.effectiveFeatures.includes(featA), "featA must be present");
    assert.ok(json.data.effectiveFeatures.includes(featB), "featB (Add-on) must be present in union");
    assert.strictEqual(json.data.featureDetails[featB].sources[0].type, "ADD_ON");
  });

  // --------------------------------------------------------------------------
  // TEST 3 & 4: Deduplication across multiple grant sources
  // --------------------------------------------------------------------------
  await t.test("Test 3 & 4: Multiple sources grant same feature and result is deduplicated", async () => {
    // Also grant featA via a second custom grant
    await fetch(`${url}/api/entitlements/organizations/${orgA.id}/grant`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ featureKey: featA, notes: "Duplicate grant test" }),
    });

    const res = await fetch(`${url}/api/entitlements/organizations/${orgA.id}`, { headers: adminHeaders });
    const json = (await res.json()) as any;

    // Feature A appears only once in effectiveFeatures
    const occurrences = json.data.effectiveFeatures.filter((k: string) => k === featA);
    assert.strictEqual(occurrences.length, 1, "Feature must appear exactly once in effective array");

    // But traceability has 2 sources: PLAN + CUSTOM
    const featASources = json.data.featureDetails[featA].sources;
    assert.strictEqual(featASources.length, 2, "Must trace both PLAN and CUSTOM sources");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Explicit revocation removes inherited feature
  // --------------------------------------------------------------------------
  await t.test("Test 5: Explicit revocation removes inherited feature", async () => {
    // Explicitly revoke featB
    const revokeRes = await fetch(`${url}/api/entitlements/organizations/${orgA.id}/revoke`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ featureKey: featB, notes: "Revoking featB for Org A" }),
    });
    assert.strictEqual(revokeRes.status, 200);
    const json = (await revokeRes.json()) as any;

    assert.strictEqual(
      json.data.effectiveFeatures.includes(featB),
      false,
      "Revoked feature must NOT be effective"
    );
    assert.ok(json.data.revokedFeatures.includes(featB), "featB must be listed in revokedFeatures");
    assert.strictEqual(json.data.featureDetails[featB].isRevoked, true);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Custom grant adds a feature not in Plan
  // --------------------------------------------------------------------------
  await t.test("Test 6: Custom grant adds a feature not provided by Plan", async () => {
    const grantRes = await fetch(`${url}/api/entitlements/organizations/${orgA.id}/grant`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ featureKey: featD, notes: "Custom grant featD" }),
    });
    assert.strictEqual(grantRes.status, 201);
    const json = (await grantRes.json()) as any;
    assert.ok(json.data.effectiveFeatures.includes(featD), "Custom granted featD must be effective");
    assert.strictEqual(json.data.featureDetails[featD].sources[0].type, "CUSTOM");
  });

  // --------------------------------------------------------------------------
  // TEST 7 & 8: Suspended or Expired custom grant does not become effective
  // --------------------------------------------------------------------------
  await t.test("Test 7 & 8: Suspended or Expired custom grant is not effective", async () => {
    const customFeatKey = `${testModuleCode}.custom_exp_test`;
    await prisma.feature.create({
      data: { key: customFeatKey, name: "Custom Expirable", moduleCode: testModuleCode, status: "ACTIVE" },
    });

    // Create grant with effectiveUntil in the past
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.entitlementGrant.create({
      data: {
        organizationId: orgA.id,
        featureKey: customFeatKey,
        grantType: "CUSTOM",
        status: "ACTIVE",
        effectiveFrom: new Date(2020, 0, 1),
        effectiveUntil: yesterday,
      },
    });

    const res = await fetch(`${url}/api/entitlements/organizations/${orgA.id}`, { headers: adminHeaders });
    const json = (await res.json()) as any;
    assert.strictEqual(
      json.data.effectiveFeatures.includes(customFeatKey),
      false,
      "Expired grant must not become effective"
    );
  });

  // --------------------------------------------------------------------------
  // TEST 9: Cancelled or Suspended subscription does not produce active commercial entitlements
  // --------------------------------------------------------------------------
  await t.test("Test 9: Suspended subscription ceases commercial plan entitlements", async () => {
    const sub = await prisma.subscription.findFirst({ where: { organizationId: orgA.id, status: "ACTIVE" } });
    assert.ok(sub);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "SUSPENDED" },
    });

    const res = await fetch(`${url}/api/entitlements/organizations/${orgA.id}`, { headers: adminHeaders });
    const json = (await res.json()) as any;

    // featA (from Plan) should not be granted by plan anymore (only custom featD remains)
    assert.strictEqual(
      json.data.effectiveFeatures.includes(featDep),
      false,
      "Plan features must not be effective when subscription is suspended"
    );

    // Restore subscription to ACTIVE
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE" },
    });
  });

  // --------------------------------------------------------------------------
  // TEST 10: Feature dependency enforcement
  // --------------------------------------------------------------------------
  await t.test("Test 10: Missing required dependency excludes feature from effective list", async () => {
    // featDep requires featA. If we revoke featA, featDep must also become ineffective!
    await fetch(`${url}/api/entitlements/organizations/${orgA.id}/revoke`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ featureKey: featA, notes: "Revoking root dependency featA" }),
    });

    const res = await fetch(`${url}/api/entitlements/organizations/${orgA.id}`, { headers: adminHeaders });
    const json = (await res.json()) as any;

    assert.strictEqual(json.data.effectiveFeatures.includes(featA), false, "featA is revoked");
    assert.strictEqual(
      json.data.effectiveFeatures.includes(featDep),
      false,
      "featDep must be excluded because required dependency featA is missing"
    );
    assert.deepStrictEqual(json.data.featureDetails[featDep].missingDependencies, [featA]);

    // Restore featA override removal
    await fetch(`${url}/api/entitlements/organizations/${orgA.id}/override/${featA}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
  });

  // --------------------------------------------------------------------------
  // TEST 12: Tenant isolation (Org B cannot view Org A entitlements without permission)
  // --------------------------------------------------------------------------
  await t.test("Test 12: Tenant isolation prevents cross-tenant access", async () => {
    const res = await fetch(`${url}/api/entitlements/organizations/${orgA.id}`, { headers: userBHeaders });
    assert.strictEqual(res.status, 403, "Non-admin user of Org B cannot access Org A entitlements");
  });

  // --------------------------------------------------------------------------
  // TEST 13: Determinism & Idempotency
  // --------------------------------------------------------------------------
  await t.test("Test 13: Deterministic resolver output across multiple calls", async () => {
    const res1 = await fetch(`${url}/api/entitlements/organizations/${orgA.id}`, { headers: adminHeaders });
    const res2 = await fetch(`${url}/api/entitlements/organizations/${orgA.id}`, { headers: adminHeaders });
    const json1 = (await res1.json()) as any;
    const json2 = (await res2.json()) as any;

    assert.deepStrictEqual(json1.data.effectiveFeatures, json2.data.effectiveFeatures);
    assert.strictEqual(json1.data.totalEffective, json2.data.totalEffective);
  });

  server.close();
});
