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

test("Quota Domain & Usage Metering Test Suite (Phase 8A.4)", async (t) => {
  const { server, url } = await startServer();
  const ts = Date.now();

  // 1. Setup isolated Test Quota Definitions
  const resHard = `TEST_RES_HARD_${ts}`;
  const resSoft = `TEST_RES_SOFT_${ts}`;
  const resFair = `TEST_RES_FAIR_${ts}`;
  const resCounter = `TEST_RES_CTR_${ts}`;

  await prisma.quotaDefinition.createMany({
    data: [
      {
        code: resHard,
        name: "Test Hard Limit",
        limitType: "HARD_LIMIT",
        unit: "DEVICES",
        measurementType: "GAUGE",
      },
      {
        code: resSoft,
        name: "Test Soft Limit",
        limitType: "SOFT_LIMIT",
        unit: "GIGABYTES",
        measurementType: "GAUGE",
      },
      {
        code: resFair,
        name: "Test Fair Use",
        limitType: "FAIR_USE",
        unit: "SKUS",
        measurementType: "GAUGE",
      },
      {
        code: resCounter,
        name: "Test Periodic Counter",
        limitType: "FAIR_USE",
        unit: "TRANSACTIONS",
        measurementType: "COUNTER",
      },
    ],
  });

  // 2. Setup Plan with Quota Grants
  const testPlanCode = `PLAN_QUOTA_${ts}`;
  await prisma.plan.create({
    data: {
      code: testPlanCode,
      name: "Quota Test Plan",
      tier: "PRO",
      status: "ACTIVE",
    },
  });
  await prisma.planPrice.create({
    data: {
      planCode: testPlanCode,
      billingCycle: "MONTHLY",
      amount: 499000,
      currency: "IDR",
      isActive: true,
    },
  });
  await prisma.planQuotaGrant.createMany({
    data: [
      { planCode: testPlanCode, resourceCode: resHard, quantity: 5, isUnlimited: false },
      { planCode: testPlanCode, resourceCode: resSoft, quantity: 20, isUnlimited: false },
      { planCode: testPlanCode, resourceCode: resFair, quantity: 100, isUnlimited: false },
      { planCode: testPlanCode, resourceCode: resCounter, quantity: 1000, isUnlimited: false },
    ],
  });

  // 3. Setup Add-On with Quota Grants
  const testAddOnCode = `ADDON_QUOTA_${ts}`;
  await prisma.addOn.create({
    data: {
      code: testAddOnCode,
      name: "Quota Test Addon",
      status: "ACTIVE",
    },
  });
  await prisma.addOnPrice.create({
    data: {
      addOnCode: testAddOnCode,
      billingCycle: "MONTHLY",
      amount: 100000,
      currency: "IDR",
      isActive: true,
    },
  });
  await prisma.addOnQuotaGrant.create({
    data: {
      addOnCode: testAddOnCode,
      resourceCode: resHard,
      quantity: 2, // +2 devices per addon item
      isUnlimited: false,
    },
  });

  // 4. Setup Organizations
  const orgA = await prisma.organization.create({
    data: { name: `Quota Org A-${ts}`, code: `Q-ORG-A-${ts}`, status: "ACTIVE" },
  });
  const orgB = await prisma.organization.create({
    data: { name: `Quota Org B-${ts}`, code: `Q-ORG-B-${ts}`, status: "ACTIVE" },
  });

  // 5. Auth Users & Roles
  const password = "QuotaPassword123!";
  const passwordHash = await argon2.hash(password);

  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: `quota-admin-${ts}@test.com`,
      passwordHash,
      organizationId: orgA.id,
      status: "ACTIVE",
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: "User B",
      email: `quota-user-b-${ts}@test.com`,
      passwordHash,
      organizationId: orgB.id,
      status: "ACTIVE",
    },
  });

  const appPlatform = await prisma.application.findUnique({ where: { code: "PLATFORM" } });
  const roleAdmin = await prisma.role.findUnique({ where: { code: "PLATFORM_ADMINISTRATOR" } });

  // Ensure quota permissions are linked
  const requiredPerms = [
    { code: "platform.quotas.view", name: "View Quotas", applicationCode: "PLATFORM" },
    { code: "platform.quotas.manage", name: "Manage Quotas", applicationCode: "PLATFORM" },
    { code: "platform.quotas.usage.view", name: "View Usage", applicationCode: "PLATFORM" },
    { code: "platform.quotas.usage.manage", name: "Manage Usage", applicationCode: "PLATFORM" },
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
    body: JSON.stringify({ email: userB.email, password }),
  });
  assert.strictEqual(loginBRes.status, 200);
  const userBCookie = loginBRes.headers.get("set-cookie")!.split(";")[0];
  const userBHeaders = { "Content-Type": "application/json", Cookie: userBCookie };

  // Setup Subscription for Org A
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const subA = await prisma.subscription.create({
    data: {
      organizationId: orgA.id,
      planCode: testPlanCode,
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      planPriceAmount: 499000,
      currency: "IDR",
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  // --------------------------------------------------------------------------
  // TEST 1: Active Plan returns expected base quotas
  // --------------------------------------------------------------------------
  await t.test("Test 1: Active Plan returns expected base quotas", async () => {
    const res = await fetch(`${url}/api/quotas?organizationId=${orgA.id}`, { headers: adminHeaders });
    assert.strictEqual(res.status, 200);
    const json = (await res.json()) as any;
    assert.strictEqual(json.status, "success");

    const qHard = json.data.quotas[resHard];
    assert.ok(qHard);
    assert.strictEqual(qHard.allocated, 5);
    assert.strictEqual(qHard.used, 0);
    assert.strictEqual(qHard.remaining, 5);
    assert.strictEqual(qHard.isUnlimited, false);
    assert.strictEqual(qHard.sources[0].type, "PLAN");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Plan + Add-on produces additive quota
  // --------------------------------------------------------------------------
  await t.test("Test 2: Plan + Add-on produces additive quota", async () => {
    // Add 2 quantity of testAddOn (+4 hard limit)
    await prisma.subscriptionItem.create({
      data: {
        subscriptionId: subA.id,
        addOnCode: testAddOnCode,
        quantity: 2,
        unitPrice: 100000,
        currency: "IDR",
      },
    });

    const res = await fetch(`${url}/api/quotas?organizationId=${orgA.id}`, { headers: adminHeaders });
    const json = (await res.json()) as any;

    const qHard = json.data.quotas[resHard];
    assert.strictEqual(qHard.allocated, 9); // 5 (Base Plan) + (2 x 2) = 9
    assert.strictEqual(qHard.sources.length, 2);
  });

  // --------------------------------------------------------------------------
  // TEST 3 & 4: Custom Quota Overrides (ADD vs REPLACE)
  // --------------------------------------------------------------------------
  await t.test("Test 3 & 4: Custom quota override works correctly (ADD and REPLACE)", async () => {
    // 1. ADD override (+3) -> total 12
    const addRes = await fetch(`${url}/api/quotas/organizations/${orgA.id}/override`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        resourceCode: resHard,
        quantity: 3,
        overrideMode: "ADD",
        notes: "Special enterprise expansion",
      }),
    });
    assert.strictEqual(addRes.status, 200);
    const jsonAdd = (await addRes.json()) as any;
    assert.strictEqual(jsonAdd.data.quotas[resHard].allocated, 12); // 9 + 3 = 12

    // 2. REPLACE override (25) -> total 25
    const replaceRes = await fetch(`${url}/api/quotas/organizations/${orgA.id}/override`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        resourceCode: resHard,
        quantity: 25,
        overrideMode: "REPLACE",
        notes: "Strict contract replacement",
      }),
    });
    assert.strictEqual(replaceRes.status, 200);
    const jsonReplace = (await replaceRes.json()) as any;
    assert.strictEqual(jsonReplace.data.quotas[resHard].allocated, 25);

    // 3. Remove override -> returns back to 9
    const deleteRes = await fetch(`${url}/api/quotas/organizations/${orgA.id}/override/${resHard}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    assert.strictEqual(deleteRes.status, 200);
    const jsonDelete = (await deleteRes.json()) as any;
    assert.strictEqual(jsonDelete.data.quotas[resHard].allocated, 9);
  });

  // --------------------------------------------------------------------------
  // TEST 5: HARD_LIMIT rejects usage exceeding quota
  // --------------------------------------------------------------------------
  await t.test("Test 5: HARD_LIMIT rejects usage exceeding quota", async () => {
    // Current allocated = 9. Record 8 devices.
    await fetch(`${url}/api/quotas/usage`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resHard,
        quantity: 8,
        mode: "SET",
      }),
    });

    // Check +1 device -> allowed = true
    const check1 = await fetch(`${url}/api/quotas/check`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resHard,
        requestedAmount: 1,
      }),
    });
    const jsonCheck1 = (await check1.json()) as any;
    assert.strictEqual(jsonCheck1.data.allowed, true);
    assert.strictEqual(jsonCheck1.data.remaining, 0);

    // Check +2 devices -> allowed = false (HARD_LIMIT rejection)
    const check2 = await fetch(`${url}/api/quotas/check`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resHard,
        requestedAmount: 2,
      }),
    });
    const jsonCheck2 = (await check2.json()) as any;
    assert.strictEqual(jsonCheck2.data.allowed, false);
    assert.strictEqual(jsonCheck2.data.status, "REJECTED_HARD_LIMIT");
    assert.ok(jsonCheck2.data.reason.includes("exceeded"));
  });

  // --------------------------------------------------------------------------
  // TEST 6: SOFT_LIMIT allows usage beyond quota and records overage
  // --------------------------------------------------------------------------
  await t.test("Test 6: SOFT_LIMIT allows usage beyond quota and records overage", async () => {
    // resSoft has allocated = 20 GB. Record usage = 25 GB.
    await fetch(`${url}/api/quotas/usage`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resSoft,
        quantity: 25,
        mode: "SET",
      }),
    });

    const check = await fetch(`${url}/api/quotas/check`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resSoft,
        requestedAmount: 2,
      }),
    });
    const json = (await check.json()) as any;
    assert.strictEqual(json.data.allowed, true);
    assert.strictEqual(json.data.status, "ALLOWED_WITH_OVERAGE");
    assert.strictEqual(json.data.overage, 7); // (25 + 2) - 20 = 7 GB overage
  });

  // --------------------------------------------------------------------------
  // TEST 7: FAIR_USE allows usage beyond threshold while exposing overage
  // --------------------------------------------------------------------------
  await t.test("Test 7: FAIR_USE allows usage beyond threshold while exposing overage", async () => {
    // resFair has allocated = 100 SKUs. Record 110 SKUs.
    await fetch(`${url}/api/quotas/usage`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resFair,
        quantity: 110,
        mode: "SET",
      }),
    });

    const res = await fetch(`${url}/api/quotas/${resFair}?organizationId=${orgA.id}`, { headers: adminHeaders });
    const json = (await res.json()) as any;
    assert.strictEqual(json.data.status, "OVERAGE");
    assert.strictEqual(json.data.overage, 10);
    assert.strictEqual(json.data.enforceable, false); // Fair use is not blocking
  });

  // --------------------------------------------------------------------------
  // TEST 8 & 13: Usage Recording Consistency (SET vs INCREMENT)
  // --------------------------------------------------------------------------
  await t.test("Test 8 & 13: Usage recording is consistent (SET and INCREMENT)", async () => {
    // Set to 50
    await fetch(`${url}/api/quotas/usage`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resCounter,
        quantity: 50,
        mode: "SET",
        period: "2026-08",
      }),
    });

    // Increment by 25
    await fetch(`${url}/api/quotas/usage`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resCounter,
        quantity: 25,
        mode: "INCREMENT",
        period: "2026-08",
      }),
    });

    const res = await fetch(`${url}/api/quotas/usage?organizationId=${orgA.id}&resourceCode=${resCounter}&period=2026-08`, {
      headers: adminHeaders,
    });
    const json = (await res.json()) as any;
    assert.strictEqual(Number(json.data[0].quantity), 75);
  });

  // --------------------------------------------------------------------------
  // TEST 9: Period Isolation
  // --------------------------------------------------------------------------
  await t.test("Test 9: Monthly usage is isolated by period", async () => {
    // Record in 2026-09
    await fetch(`${url}/api/quotas/usage`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resCounter,
        quantity: 10,
        mode: "SET",
        period: "2026-09",
      }),
    });

    const res08 = await fetch(`${url}/api/quotas?organizationId=${orgA.id}&period=2026-08`, { headers: adminHeaders });
    const json08 = (await res08.json()) as any;
    assert.strictEqual(json08.data.quotas[resCounter].used, 75);

    const res09 = await fetch(`${url}/api/quotas?organizationId=${orgA.id}&period=2026-09`, { headers: adminHeaders });
    const json09 = (await res09.json()) as any;
    assert.strictEqual(json09.data.quotas[resCounter].used, 10);
  });

  // --------------------------------------------------------------------------
  // TEST 10: Unlimited Quota Never Produces Hard-Limit Rejection
  // --------------------------------------------------------------------------
  await t.test("Test 10: Unlimited quota never produces a false hard-limit rejection", async () => {
    // Set custom override isUnlimited = true
    await fetch(`${url}/api/quotas/organizations/${orgA.id}/override`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        resourceCode: resHard,
        isUnlimited: true,
        overrideMode: "REPLACE",
        notes: "Unlimited enterprise devices",
      }),
    });

    const check = await fetch(`${url}/api/quotas/check`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resHard,
        requestedAmount: 999999,
      }),
    });
    const json = (await check.json()) as any;
    assert.strictEqual(json.data.allowed, true);
    assert.strictEqual(json.data.isUnlimited, true);
    assert.strictEqual(json.data.status, "ALLOWED");

    // Clean up override
    await fetch(`${url}/api/quotas/organizations/${orgA.id}/override/${resHard}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
  });

  // --------------------------------------------------------------------------
  // TEST 11: Cross-Tenant Isolation
  // --------------------------------------------------------------------------
  await t.test("Test 11: Cross-tenant access is rejected for unprivileged users", async () => {
    const res = await fetch(`${url}/api/quotas?organizationId=${orgA.id}`, { headers: userBHeaders });
    assert.strictEqual(res.status, 403, "User B cannot query Org A quotas");
  });

  // --------------------------------------------------------------------------
  // TEST 12: Inactive / Suspended Subscription Ceases Commercial Quota Grants
  // --------------------------------------------------------------------------
  await t.test("Test 12: Suspended subscription ceases commercial plan quota grants", async () => {
    await prisma.subscription.update({
      where: { id: subA.id },
      data: { status: "SUSPENDED" },
    });

    const res = await fetch(`${url}/api/quotas?organizationId=${orgA.id}`, { headers: adminHeaders });
    const json = (await res.json()) as any;

    // Commercial grants should be 0 since subscription is suspended
    assert.strictEqual(json.data.quotas[resHard].allocated, 0);

    // Restore subscription to ACTIVE
    await prisma.subscription.update({
      where: { id: subA.id },
      data: { status: "ACTIVE" },
    });
  });

  // --------------------------------------------------------------------------
  // TEST 14 & 15: Check Quota Non-mutation & Resolver Idempotency
  // --------------------------------------------------------------------------
  await t.test("Test 14 & 15: Quota check does not mutate usage and resolver is idempotent", async () => {
    const res1 = await fetch(`${url}/api/quotas?organizationId=${orgA.id}`, { headers: adminHeaders });
    const json1 = (await res1.json()) as any;

    // Perform check
    await fetch(`${url}/api/quotas/check`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        organizationId: orgA.id,
        resourceCode: resHard,
        requestedAmount: 1,
      }),
    });

    const res2 = await fetch(`${url}/api/quotas?organizationId=${orgA.id}`, { headers: adminHeaders });
    const json2 = (await res2.json()) as any;

    assert.deepStrictEqual(json1.data.quotas, json2.data.quotas, "Quota check must not mutate recorded usage");
  });

  server.close();
});
