import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import app from "./app";
import { prisma } from "./utils/prisma";
import argon2 from "argon2";

// Helper to start/stop server
function startServer(): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as any;
      const url = `http://127.0.0.1:${address.port}`;
      resolve({ server, url });
    });
  });
}

test("API Test Suite", async (t) => {
  const { server, url } = await startServer();

  // Create clean test organization and users
  const testOrg = await prisma.organization.create({
    data: { name: `Test Org-${Date.now()}` },
  });

  const testPassword = "SecurePassword123!";
  const testPasswordHash = await argon2.hash(testPassword);

  const activeUser = await prisma.user.create({
    data: {
      name: "Active User",
      email: `active-${Date.now()}@test.com`,
      passwordHash: testPasswordHash,
      organizationId: testOrg.id,
      status: "ACTIVE",
    },
  });

  const disabledUser = await prisma.user.create({
    data: {
      name: "Disabled User",
      email: `disabled-${Date.now()}@test.com`,
      passwordHash: testPasswordHash,
      organizationId: testOrg.id,
      status: "DISABLED",
    },
  });

  // Assign application access to active user
  const appPlatform = await prisma.application.findUnique({ where: { code: "PLATFORM" } });
  const roleAdmin = await prisma.role.findUnique({ where: { code: "PLATFORM_ADMINISTRATOR" } });
  if (appPlatform && roleAdmin) {
    await prisma.userApplicationAccess.create({
      data: {
        userId: activeUser.id,
        organizationId: testOrg.id,
        applicationCode: "PLATFORM",
        roleId: roleAdmin.id,
      },
    });
  }

  await t.test("GET /health returns 200 OK", async () => {
    const res = await fetch(`${url}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    assert.strictEqual(body.data.status, "OK");
  });

  await t.test("GET /ping returns 200 pong", async () => {
    const res = await fetch(`${url}/ping`);
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.strictEqual(body, "pong");
  });

  await t.test("POST /api/auth/login rejects invalid credentials", async () => {
    const res = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: "WrongPassword" }),
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "error");
    assert.strictEqual(body.message, "Invalid email or password");
  });

  await t.test("POST /api/auth/login rejects disabled user", async () => {
    const res = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: disabledUser.email, password: testPassword }),
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "error");
    assert.strictEqual(body.message, "User account is disabled");
  });

  await t.test("POST /api/auth/login sets cookie and returns sanitized user", async () => {
    const res = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    assert.strictEqual(res.status, 200);

    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    assert.strictEqual(body.data.email, activeUser.email);
    assert.ok(!body.data.passwordHash); // Should never return password hash

    // Extract cookie
    const setCookie = res.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.ok(setCookie.includes("session_token"));
    assert.ok(setCookie.includes("HttpOnly"));
  });

  await t.test("GET /api/auth/me unauthenticated returns 401", async () => {
    const res = await fetch(`${url}/api/auth/me`);
    assert.strictEqual(res.status, 401);
  });

  await t.test("GET /api/auth/me authenticated returns user context", async () => {
    // Login to get session cookie
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const meRes = await fetch(`${url}/api/auth/me`, {
      headers: { cookie },
    });
    assert.strictEqual(meRes.status, 200);
    const body = await meRes.json() as any;
    assert.strictEqual(body.data.email, activeUser.email);
    assert.ok(body.data.access);
  });

  await t.test("GET /api/users unauthenticated returns 401", async () => {
    const res = await fetch(`${url}/api/users`);
    assert.strictEqual(res.status, 401);
  });

  await t.test("GET /api/users authenticated returns user list", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/users`, { headers: { cookie } });
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    assert.ok(Array.isArray(body.data));
    assert.ok(body.meta.total >= 1);
  });

  await t.test("POST /api/users creates a new user", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const newUserEmail = `newuser-${Date.now()}@test.com`;
    const res = await fetch(`${url}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        name: "New Admin Member",
        email: newUserEmail,
        password: "SecretNewPassword123!",
        organizationId: testOrg.id,
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    assert.strictEqual(body.data.email, newUserEmail);
    assert.ok(!body.data.passwordHash); // Ensure passwordHash not exposed

    // Duplicate check
    const dupRes = await fetch(`${url}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        name: "New Admin Member",
        email: newUserEmail,
        password: "SecretNewPassword123!",
        organizationId: testOrg.id,
      }),
    });
    assert.strictEqual(dupRes.status, 409); // CONFLICT
  });

  await t.test("POST /api/access checks permissions and prevents duplicate grants", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    // Let's create a target user first
    const targetUserEmail = `target-${Date.now()}@test.com`;
    const userRes = await fetch(`${url}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        name: "Target Cashier",
        email: targetUserEmail,
        password: "TargetPassword123!",
        organizationId: testOrg.id,
      }),
    });
    const targetUser = (await userRes.json() as any).data;

    // Get Concession Cashier Role
    const roleRes = await fetch(`${url}/api/roles`, { headers: { cookie } });
    const roles = (await roleRes.json() as any).data;
    const concessionCashierRole = roles.find((r: any) => r.code === "CONCESSION_CASHIER");

    assert.ok(concessionCashierRole);

    // Grant access
    const grantRes = await fetch(`${url}/api/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        userId: targetUser.id,
        applicationCode: "CONCESSION",
        roleId: concessionCashierRole.id,
      }),
    });
    assert.strictEqual(grantRes.status, 201);

    // Check duplicate grant
    const dupGrantRes = await fetch(`${url}/api/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        userId: targetUser.id,
        applicationCode: "CONCESSION",
        roleId: concessionCashierRole.id,
      }),
    });
    assert.strictEqual(dupGrantRes.status, 409); // CONFLICT

    // Check role mismatched application validation
    const mismatchedRole = roles.find((r: any) => r.code === "TICKETING_CASHIER");
    const mismatchRes = await fetch(`${url}/api/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        userId: targetUser.id,
        applicationCode: "CONCESSION",
        roleId: mismatchedRole.id,
      }),
    });
    assert.strictEqual(mismatchRes.status, 400); // BAD_REQUEST
  });

  await t.test("GET /api/audit-logs returns audit logs with metadata", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/audit-logs`, { headers: { cookie } });
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    assert.ok(Array.isArray(body.data));
    assert.ok(body.meta.total >= 1);
  });

  await t.test("PATCH /api/users/:id/status prevents self-lockout/disabling own account", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    // Attempt to disable self
    const res = await fetch(`${url}/api/users/${activeUser.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "DISABLED" }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "error");
    assert.strictEqual(body.message, "Anda tidak dapat menonaktifkan akun Anda sendiri");

    // Verify status remains ACTIVE
    const freshUser = await prisma.user.findUnique({ where: { id: activeUser.id } });
    assert.strictEqual(freshUser?.status, "ACTIVE");

    // Verify no USER_DISABLED audit log
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId: activeUser.id,
        action: "USER_DISABLED",
      },
    });
    assert.strictEqual(auditLogs.length, 0);
  });

  await t.test("GET /api/dashboard/overview returns overview counts", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/dashboard/overview`, { headers: { cookie } });
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    assert.ok(body.data.totalUsers >= 1);
    assert.ok(body.data.totalOrgs >= 1);
  });

  await t.test("GET /api/organizations/:id returns detailed organization properties", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/organizations/${testOrg.id}`, { headers: { cookie } });
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    assert.strictEqual(body.data.id, testOrg.id);
    assert.ok(Array.isArray(body.data.users));
    assert.ok(Array.isArray(body.data.enabledApplications));
  });

  // Clean up
  server.close();
  await prisma.user.deleteMany({
    where: {
      email: { contains: "test.com" }
    },
  });
  await prisma.organization.delete({
    where: { id: testOrg.id },
  });
});
