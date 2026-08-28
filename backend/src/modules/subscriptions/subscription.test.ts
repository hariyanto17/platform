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

test("Subscription Domain Test Suite (Phase 8A.2)", async (t) => {
  const { server, url } = await startServer();
  const timestamp = Date.now();

  // 1. Create two test organizations
  const testOrgA = await prisma.organization.create({
    data: {
      name: `Sub Org A-${timestamp}`,
      code: `SUB-ORG-A-${timestamp}`,
      status: "ACTIVE",
    },
  });

  const testOrgB = await prisma.organization.create({
    data: {
      name: `Sub Org B-${timestamp}`,
      code: `SUB-ORG-B-${timestamp}`,
      status: "ACTIVE",
    },
  });

  // 2. Create isolated test plan and add-ons
  const testPlanCode = `PLAN_TEST_PRO_${timestamp}`;
  await prisma.plan.create({
    data: {
      code: testPlanCode,
      name: "Test Pro Plan",
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

  const testAddOnCode1 = `ADDON_TEST_KDS_${timestamp}`;
  await prisma.addOn.create({
    data: {
      code: testAddOnCode1,
      name: "Test KDS",
      status: "ACTIVE",
    },
  });
  await prisma.addOnPrice.create({
    data: {
      addOnCode: testAddOnCode1,
      billingCycle: "MONTHLY",
      amount: 150000,
      currency: "IDR",
      isActive: true,
    },
  });

  const testAddOnCode2 = `ADDON_TEST_SO_${timestamp}`;
  await prisma.addOn.create({
    data: {
      code: testAddOnCode2,
      name: "Test Self Order",
      status: "ACTIVE",
    },
  });
  await prisma.addOnPrice.create({
    data: {
      addOnCode: testAddOnCode2,
      billingCycle: "MONTHLY",
      amount: 200000,
      currency: "IDR",
      isActive: true,
    },
  });

  const testPassword = "SubTestPassword123!";
  const passwordHash = await argon2.hash(testPassword);

  // 3. Create Platform Admin (Superadmin)
  const superAdminUser = await prisma.user.create({
    data: {
      name: "Superadmin User",
      email: `sub-superadmin-${timestamp}@test.com`,
      passwordHash,
      organizationId: testOrgA.id,
      status: "ACTIVE",
    },
  });

  const appPlatform = await prisma.application.findUnique({ where: { code: "PLATFORM" } });
  const roleAdmin = await prisma.role.findUnique({ where: { code: "PLATFORM_ADMINISTRATOR" } });

  if (appPlatform && roleAdmin) {
    await prisma.userApplicationAccess.create({
      data: {
        userId: superAdminUser.id,
        organizationId: testOrgA.id,
        applicationCode: "PLATFORM",
        roleId: roleAdmin.id,
      },
    });
  }

  // Login as Superadmin
  const superLoginRes = await fetch(`${url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: superAdminUser.email, password: testPassword }),
  });
  assert.strictEqual(superLoginRes.status, 200);
  const superCookie = superLoginRes.headers.get("set-cookie")!.split(";")[0];

  const superHeaders = {
    "Content-Type": "application/json",
    Cookie: superCookie,
  };

  // Test 1: Pricing Resolution & Active Price Listing
  await t.test("GET /api/subscriptions/prices returns active catalog prices", async () => {
    const res = await fetch(`${url}/api/subscriptions/prices`, { headers: superHeaders });
    assert.strictEqual(res.status, 200);
    const json = (await res.json()) as any;
    assert.strictEqual(json.status, "success");
    assert.ok(json.data.planPrices.length >= 1, "Must have plan prices");
    assert.ok(json.data.addOnPrices.length >= 1, "Must have addon prices");
  });

  // Test 2: Validation of Plan & Inactive Plan Rejection
  await t.test("Subscription creation validates Plan and prevents invalid/missing plans", async () => {
    // Missing plan
    const missingPlanRes = await fetch(`${url}/api/subscriptions`, {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        organizationId: testOrgA.id,
        planCode: "NONEXISTENT_PLAN_XYZ",
        billingCycle: "MONTHLY",
      }),
    });
    assert.strictEqual(missingPlanRes.status, 400);

    // Inactive plan
    const inactivePlanCode = `PLAN_INACTIVE_${Date.now()}`;
    await prisma.plan.create({
      data: {
        code: inactivePlanCode,
        name: "Inactive Test Plan",
        tier: "STARTER",
        status: "DISABLED",
      },
    });

    const inactivePlanRes = await fetch(`${url}/api/subscriptions`, {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        organizationId: testOrgA.id,
        planCode: inactivePlanCode,
        billingCycle: "MONTHLY",
      }),
    });
    assert.strictEqual(inactivePlanRes.status, 400, "Inactive plan must be rejected");
  });

  // Test 3: Transactional Creation with Price Snapshots
  let createdSubId = "";
  await t.test("Create subscription with Add-ons and verify exact price snapshotting", async () => {
    const res = await fetch(`${url}/api/subscriptions`, {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        organizationId: testOrgA.id,
        planCode: testPlanCode,
        billingCycle: "MONTHLY",
        addOns: [{ addOnCode: testAddOnCode1, quantity: 2 }],
      }),
    });

    assert.strictEqual(res.status, 201);
    const json = (await res.json()) as any;
    assert.strictEqual(json.status, "success");
    assert.strictEqual(json.data.planCode, testPlanCode);
    assert.strictEqual(json.data.status, "ACTIVE");
    assert.strictEqual(json.data.billingCycle, "MONTHLY");
    assert.strictEqual(Number(json.data.planPriceAmount), 499000);
    assert.strictEqual(json.data.items.length, 1);

    createdSubId = json.data.id;
  });

  // Test 4: Duplicate Active Subscription Rejection
  await t.test("Reject duplicate active subscription for the same organization", async () => {
    const dupRes = await fetch(`${url}/api/subscriptions`, {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        organizationId: testOrgA.id,
        planCode: testPlanCode,
        billingCycle: "MONTHLY",
      }),
    });

    assert.strictEqual(dupRes.status, 409, "Must return 409 Conflict when active subscription already exists");
  });

  // Test 5: Price Snapshot Immutability
  await t.test("Changing catalog AddOnPrice or PlanPrice must NOT modify existing subscription snapshots", async () => {
    // 1. Change catalog price for testAddOnCode1 from 150.000 to 999.000
    await fetch(`${url}/api/subscriptions/prices/addon`, {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        addOnCode: testAddOnCode1,
        billingCycle: "MONTHLY",
        amount: 999000,
        currency: "IDR",
        isActive: true,
      }),
    });

    // 2. Change catalog price for testPlanCode from 499.000 to 888.000
    await fetch(`${url}/api/subscriptions/prices/plan`, {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        planCode: testPlanCode,
        billingCycle: "MONTHLY",
        amount: 888000,
        currency: "IDR",
        isActive: true,
      }),
    });

    // 3. Retrieve previously created subscription
    const subRes = await fetch(`${url}/api/subscriptions/${createdSubId}`, { headers: superHeaders });
    assert.strictEqual(subRes.status, 200);
    const subJson = (await subRes.json()) as any;

    // Verify snapshots remain untouched at 499.000 and 150.000
    assert.strictEqual(
      Number(subJson.data.planPriceAmount),
      499000,
      "Existing subscription Plan price snapshot must remain 499.000"
    );

    const kdsItem = subJson.data.items.find((it: any) => it.addOnCode === testAddOnCode1);
    assert.ok(kdsItem, "KDS item must exist");
    assert.strictEqual(
      Number(kdsItem.unitPrice),
      150000,
      "Existing subscription item price snapshot must remain 150.000"
    );
  });

  // Test 6: Subscription Items Management (Add, Update Quantity, Remove)
  await t.test("Subscription items addition, quantity validation, and removal", async () => {
    // 1. Reject invalid quantity 0
    const invalidQtyRes = await fetch(`${url}/api/subscriptions/${createdSubId}/items`, {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        addOnCode: testAddOnCode2,
        quantity: 0,
      }),
    });
    assert.strictEqual(invalidQtyRes.status, 400, "Quantity 0 must be rejected");

    // 2. Add new item testAddOnCode2
    const addItemRes = await fetch(`${url}/api/subscriptions/${createdSubId}/items`, {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        addOnCode: testAddOnCode2,
        quantity: 3,
      }),
    });
    assert.strictEqual(addItemRes.status, 201);
    const addedJson = (await addItemRes.json()) as any;
    assert.strictEqual(addedJson.data.items.length, 2);

    const selfOrderItem = addedJson.data.items.find((it: any) => it.addOnCode === testAddOnCode2);
    assert.strictEqual(selfOrderItem.quantity, 3);

    // 3. Remove item
    const removeRes = await fetch(`${url}/api/subscriptions/${createdSubId}/items/${selfOrderItem.id}`, {
      method: "DELETE",
      headers: superHeaders,
    });
    assert.strictEqual(removeRes.status, 200);

    const afterRemoveRes = await fetch(`${url}/api/subscriptions/${createdSubId}`, { headers: superHeaders });
    const afterJson = (await afterRemoveRes.json()) as any;
    assert.strictEqual(afterJson.data.items.length, 1);
  });

  // Test 7: Subscription Lifecycle Updates
  await t.test("Update subscription status to SUSPENDED and CANCELLED", async () => {
    const suspendRes = await fetch(`${url}/api/subscriptions/${createdSubId}`, {
      method: "PATCH",
      headers: superHeaders,
      body: JSON.stringify({
        status: "SUSPENDED",
      }),
    });
    assert.strictEqual(suspendRes.status, 200);
    const suspendJson = (await suspendRes.json()) as any;
    assert.strictEqual(suspendJson.data.status, "SUSPENDED");

    // Cancel subscription
    const cancelRes = await fetch(`${url}/api/subscriptions/${createdSubId}`, {
      method: "PATCH",
      headers: superHeaders,
      body: JSON.stringify({
        status: "CANCELLED",
      }),
    });
    assert.strictEqual(cancelRes.status, 200);
    const cancelJson = (await cancelRes.json()) as any;
    assert.strictEqual(cancelJson.data.status, "CANCELLED");
    assert.ok(cancelJson.data.cancelledAt, "Cancelled timestamp must be set");

    // After cancellation, a new active subscription can be created for Org A
    const newSubRes = await fetch(`${url}/api/subscriptions`, {
      method: "POST",
      headers: superHeaders,
      body: JSON.stringify({
        organizationId: testOrgA.id,
        planCode: testPlanCode,
        billingCycle: "MONTHLY",
      }),
    });
    assert.strictEqual(newSubRes.status, 201, "New active subscription should succeed after previous is CANCELLED");
  });

  server.close();
});
