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

test("Product Catalog Domain Test Suite (Phase 8A.1)", async (t) => {
  const { server, url } = await startServer();

  // Create clean admin user with PLATFORM_ADMINISTRATOR role
  const testOrg = await prisma.organization.create({
    data: {
      name: `Catalog Test Org-${Date.now()}`,
      code: `CATALOG-TEST-ORG-${Date.now()}`,
      status: "ACTIVE",
    },
  });

  const testPassword = "CatalogPassword123!";
  const passwordHash = await argon2.hash(testPassword);

  const adminUser = await prisma.user.create({
    data: {
      name: "Catalog Admin",
      email: `catalog-admin-${Date.now()}@test.com`,
      passwordHash,
      organizationId: testOrg.id,
      status: "ACTIVE",
    },
  });

  const appPlatform = await prisma.application.findUnique({ where: { code: "PLATFORM" } });
  const roleAdmin = await prisma.role.findUnique({ where: { code: "PLATFORM_ADMINISTRATOR" } });

  if (appPlatform && roleAdmin) {
    await prisma.userApplicationAccess.create({
      data: {
        userId: adminUser.id,
        organizationId: testOrg.id,
        applicationCode: "PLATFORM",
        roleId: roleAdmin.id,
      },
    });
  }

  // Login to obtain session cookie
  const loginRes = await fetch(`${url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: adminUser.email,
      password: testPassword,
    }),
  });

  assert.strictEqual(loginRes.status, 200, "Admin login should succeed");
  const rawCookie = loginRes.headers.get("set-cookie") || "";
  const sessionCookie = rawCookie.split(";")[0];
  assert.ok(sessionCookie.includes("session_token"), "Session cookie must be present");

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: sessionCookie,
  };

  // Test 1: Get Catalog Overview
  await t.test("GET /api/catalog/overview should return catalog statistics", async () => {
    const res = await fetch(`${url}/api/catalog/overview`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const json = await res.json() as any;
    assert.strictEqual(json.status, "success");
    assert.ok(json.data.plansCount >= 5, "Should have at least 5 plans");
    assert.ok(json.data.modulesCount >= 8, "Should have at least 8 modules");
    assert.ok(json.data.featuresCount >= 20, "Should have at least 20 features");
  });

  // Test 2: Modules CRUD & Validation
  await t.test("Module CRUD and validation rules", async (mt) => {
    const testModuleCode = `test_mod_${Date.now()}`;

    // Create module
    const createRes = await fetch(`${url}/api/catalog/modules`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        code: testModuleCode,
        name: "Test Logistics Module",
        description: "Test module for logistics",
        isShared: true,
        sortOrder: 10,
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createdJson = await createRes.json() as any;
    assert.strictEqual(createdJson.data.code, testModuleCode);

    // Duplicate rejection
    const dupRes = await fetch(`${url}/api/catalog/modules`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        code: testModuleCode,
        name: "Duplicate Module",
      }),
    });
    assert.strictEqual(dupRes.status, 409, "Duplicate module code must return 409 Conflict");

    // Update module
    const updateRes = await fetch(`${url}/api/catalog/modules/${testModuleCode}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Updated Logistics Module",
      }),
    });
    assert.strictEqual(updateRes.status, 200);
    const updatedJson = await updateRes.json() as any;
    assert.strictEqual(updatedJson.data.name, "Updated Logistics Module");
  });

  // Test 3: Feature Canonical Key Validation & CRUD
  await t.test("Feature canonical format validation and CRUD", async () => {
    // Rejection for non-canonical format
    const invalidKeyRes = await fetch(`${url}/api/catalog/features`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        key: "INVALID_KEY_UPPERCASE",
        name: "Invalid Feature",
        moduleCode: "pos",
      }),
    });
    assert.strictEqual(invalidKeyRes.status, 400, "Non-canonical key must be rejected");

    // Rejection for missing dot separator
    const singleWordKeyRes = await fetch(`${url}/api/catalog/features`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        key: "singlewordkey",
        name: "Invalid Feature",
        moduleCode: "pos",
      }),
    });
    assert.strictEqual(singleWordKeyRes.status, 400, "Key without dot separator must be rejected");

    // Valid canonical feature creation
    const validKey = `pos.custom.test_action_${Date.now()}`;
    const createRes = await fetch(`${url}/api/catalog/features`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        key: validKey,
        name: "Custom Test Action",
        description: "Test canonical feature",
        moduleCode: "pos",
        isCore: false,
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createJson = await createRes.json() as any;
    assert.strictEqual(createJson.data.key, validKey);

    // Duplicate feature rejection
    const dupRes = await fetch(`${url}/api/catalog/features`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        key: validKey,
        name: "Duplicate Feature",
        moduleCode: "pos",
      }),
    });
    assert.strictEqual(dupRes.status, 409, "Duplicate feature key must return 409 Conflict");
  });

  // Test 4: Feature Dependencies & Circular Dependency Prevention
  await t.test("Feature dependency constraints and circular detection", async () => {
    const featA = `test.mod.feat_a_${Date.now()}`;
    const featB = `test.mod.feat_b_${Date.now()}`;
    const featC = `test.mod.feat_c_${Date.now()}`;

    // Create 3 test features
    for (const key of [featA, featB, featC]) {
      await fetch(`${url}/api/catalog/features`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          key,
          name: `Feature ${key}`,
          moduleCode: "pos",
        }),
      });
    }

    // 1. Self-dependency rejection
    const selfDepRes = await fetch(`${url}/api/catalog/dependencies`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        featureKey: featA,
        dependsOnKey: featA,
      }),
    });
    assert.strictEqual(selfDepRes.status, 400, "Self-dependency must be rejected");

    // 2. Add valid dependency: A depends on B
    const depABRes = await fetch(`${url}/api/catalog/dependencies`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        featureKey: featA,
        dependsOnKey: featB,
      }),
    });
    assert.strictEqual(depABRes.status, 201, "Dependency A -> B should succeed");

    // 3. Add valid dependency: B depends on C
    const depBCRes = await fetch(`${url}/api/catalog/dependencies`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        featureKey: featB,
        dependsOnKey: featC,
      }),
    });
    assert.strictEqual(depBCRes.status, 201, "Dependency B -> C should succeed");

    // 4. Circular dependency rejection: C depends on A (creating C -> A -> B -> C cycle)
    const circularRes = await fetch(`${url}/api/catalog/dependencies`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        featureKey: featC,
        dependsOnKey: featA,
      }),
    });
    assert.strictEqual(circularRes.status, 400, "Circular dependency C -> A must be rejected with 400");
    const circularJson = await circularRes.json() as any;
    assert.ok(circularJson.message.includes("Circular dependency"), "Must specify circular dependency in error message");

    // 5. Remove dependency
    const removeRes = await fetch(`${url}/api/catalog/dependencies/${featA}/${featB}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    assert.strictEqual(removeRes.status, 200, "Removing dependency should succeed");
  });

  // Test 5: Plan Model CRUD & Feature Compositions
  await t.test("Plan model creation, updates, and feature assignments", async () => {
    const planCode = `PLAN_TEST_${Date.now()}`;

    const createRes = await fetch(`${url}/api/catalog/plans`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        code: planCode,
        name: "Test Custom Plan",
        tier: "PRO",
        description: "A customized testing plan",
        sortOrder: 15,
        featureKeys: ["pos.checkout.cash", "pos.checkout.qris", "inventory.stock.basic"],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const planJson = await createRes.json() as any;
    assert.strictEqual(planJson.data.code, planCode);
    assert.strictEqual(planJson.data.planFeatures.length, 3);

    // Update plan features
    const updateRes = await fetch(`${url}/api/catalog/plans/${planCode}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Updated Custom Plan",
        featureKeys: ["pos.checkout.cash"],
      }),
    });
    assert.strictEqual(updateRes.status, 200);
    const updatedPlan = await updateRes.json() as any;
    assert.strictEqual(updatedPlan.data.name, "Updated Custom Plan");
    assert.strictEqual(updatedPlan.data.planFeatures.length, 1);
  });

  // Test 6: Add-on and Vertical CRUD
  await t.test("Add-ons and Verticals management", async () => {
    const addOnCode = `ADDON_TEST_${Date.now()}`;
    const vertCode = `VERTICAL_TEST_${Date.now()}`;

    // Add-on
    const addOnRes = await fetch(`${url}/api/catalog/addons`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        code: addOnCode,
        name: "Test Custom Add-on",
        description: "Test add-on description",
        featureKeys: ["pos.receipt.digital"],
      }),
    });
    assert.strictEqual(addOnRes.status, 201);

    // Vertical
    const vertRes = await fetch(`${url}/api/catalog/verticals`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        code: vertCode,
        name: "Test Sports Vertical",
        description: "Test sports vertical",
        featureKeys: ["pos.bill.open_hold"],
      }),
    });
    assert.strictEqual(vertRes.status, 201);
  });

  server.close();
});
