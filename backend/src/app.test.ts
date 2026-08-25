import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import crypto from "node:crypto";
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
    assert.ok(body.data.applications);
    assert.ok(Array.isArray(body.data.applications));
    assert.ok(body.data.recentLogs);
    
    // Verify sensitive data is not returned
    const str = JSON.stringify(body.data);
    assert.ok(!str.includes("passwordHash"));
  });

  await t.test("GET /api/dashboard/overview unauthenticated returns 401", async () => {
    const res = await fetch(`${url}/api/dashboard/overview`);
    assert.strictEqual(res.status, 401);
  });

  await t.test("GET /api/dashboard/overview unauthorized returns 403", async () => {
    // Create a target user without platform permissions
    const adminLoginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const adminCookie = adminLoginRes.headers.get("set-cookie") || "";

    const targetUserEmail = `target-dash-${Date.now()}@test.com`;
    const userRes = await fetch(`${url}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({
        name: "Ordinary Cashier",
        email: targetUserEmail,
        password: "CashierPassword123!",
        organizationId: testOrg.id,
      }),
    });
    assert.strictEqual(userRes.status, 201);

    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetUserEmail, password: "CashierPassword123!" }),
    });
    const cashierCookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/dashboard/overview`, { headers: { cookie: cashierCookie } });
    assert.strictEqual(res.status, 403);
  });

  await t.test("GET /api/dashboard/operations returns aggregated operations summary even when offline", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/dashboard/operations`, { headers: { cookie } });
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    
    assert.ok(body.data.summary);
    assert.strictEqual(body.data.ticketing.status, "UNAVAILABLE");
    assert.strictEqual(body.data.concession.status, "UNAVAILABLE");
    assert.strictEqual(body.data.summary.totalRevenue, 0);
  });
  await t.test("GET /api/dashboard/operations unauthenticated returns 401", async () => {
    const res = await fetch(`${url}/api/dashboard/operations`);
    assert.strictEqual(res.status, 401);
  });

  await t.test("GET /api/dashboard/activity returns aggregated platform activities even when downstream is offline", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/dashboard/activity`, { headers: { cookie } });
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    
    assert.ok(Array.isArray(body.data.activities));
    assert.strictEqual(body.data.ticketingStatus, "UNAVAILABLE");
    assert.strictEqual(body.data.concessionStatus, "UNAVAILABLE");
  });

  await t.test("GET /api/dashboard/transactions returns paginated list of transactions even when downstream is offline", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/dashboard/transactions?page=1&limit=10`, { headers: { cookie } });
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    
    assert.ok(Array.isArray(body.data.transactions));
    assert.strictEqual(body.data.pagination.page, 1);
    assert.strictEqual(body.data.pagination.limit, 10);
    assert.strictEqual(body.data.ticketingStatus, "UNAVAILABLE");
    assert.strictEqual(body.data.concessionStatus, "UNAVAILABLE");
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

  await t.test("GET /api/settings returns settings object", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/settings`, { headers: { cookie } });
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    assert.ok(body.data.platform_name);
  });

  await t.test("GET /api/settings unauthorized returns 401", async () => {
    const res = await fetch(`${url}/api/settings`);
    assert.strictEqual(res.status, 401);
  });

  await t.test("PATCH /api/settings updates config and creates audit log", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const payload = {
      platform_name: "Planet Cinema Premium",
      timezone: "Asia/Makassar",
      currency: "IDR",
      date_format: "DD-MM-YYYY",
      time_format: "HH:mm",
    };

    const res = await fetch(`${url}/api/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.status, "success");
    assert.strictEqual(body.data.platform_name, "Planet Cinema Premium");

    // Verify audit log
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId: activeUser.id,
        action: "SETTINGS_UPDATED",
      },
    });
    assert.strictEqual(auditLogs.length, 1);
  });

  await t.test("PATCH /api/settings with invalid payload returns 400", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const res = await fetch(`${url}/api/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        platform_name: "", // Invalid: empty
      }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test("POST /api/applications/:code/launch flow tests", async () => {
    // 1. Unauthenticated launch
    const unauthLaunch = await fetch(`${url}/api/applications/CONCESSION/launch`, { method: "POST" });
    assert.strictEqual(unauthLaunch.status, 401);

    // Login activeUser
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    // 2. Launch application without access
    const forbiddenLaunch = await fetch(`${url}/api/applications/CONCESSION/launch`, {
      method: "POST",
      headers: { cookie },
    });
    assert.strictEqual(forbiddenLaunch.status, 403);

    // Grant access to CONCESSION
    const roleConcessionAdmin = await prisma.role.findUnique({ where: { code: "CONCESSION_ADMINISTRATOR" } });
    if (roleConcessionAdmin) {
      await prisma.userApplicationAccess.create({
        data: {
          userId: activeUser.id,
          organizationId: testOrg.id,
          applicationCode: "CONCESSION",
          roleId: roleConcessionAdmin.id,
        },
      });
    }

    // 3. Launch application with access
    const successLaunch = await fetch(`${url}/api/applications/CONCESSION/launch`, {
      method: "POST",
      headers: { cookie },
    });
    assert.strictEqual(successLaunch.status, 200);
    const launchBody = await successLaunch.json() as any;
    assert.strictEqual(launchBody.status, "success");
    assert.ok(launchBody.data.code);

    const ssoCode = launchBody.data.code;

    // 4. Exchange code for application context
    const exchangeRes = await fetch(`${url}/api/applications/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ssoCode, application: "CONCESSION" }),
    });
    assert.strictEqual(exchangeRes.status, 200);
    const exchangeBody = await exchangeRes.json() as any;
    assert.strictEqual(exchangeBody.status, "success");
    assert.strictEqual(exchangeBody.data.email, activeUser.email);
    assert.strictEqual(exchangeBody.data.application.code, "CONCESSION");
    assert.strictEqual(exchangeBody.data.application.role, "CONCESSION_ADMINISTRATOR");

    // 5. Replay attack: try exchanging same code again
    const replayExchange = await fetch(`${url}/api/applications/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ssoCode, application: "CONCESSION" }),
    });
    assert.strictEqual(replayExchange.status, 401);
  });

  await t.test("POST /api/applications/exchange concurrent requests", async () => {
    // Login activeUser
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    // Generate launch code
    const successLaunch = await fetch(`${url}/api/applications/CONCESSION/launch`, {
      method: "POST",
      headers: { cookie },
    });
    assert.strictEqual(successLaunch.status, 200);
    const launchBody = await successLaunch.json() as any;
    const ssoCode = launchBody.data.code;

    // Send two concurrent exchange requests using Promise.all
    const [res1, res2] = await Promise.all([
      fetch(`${url}/api/applications/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: ssoCode, application: "CONCESSION" }),
      }),
      fetch(`${url}/api/applications/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: ssoCode, application: "CONCESSION" }),
      }),
    ]);

    // Exactly one should succeed (200), and the other should fail (401)
    const statuses = [res1.status, res2.status].sort();
    assert.deepStrictEqual(statuses, [200, 401]);

    // Check usedAt in database
    const codeHash = crypto.createHash("sha256").update(ssoCode).digest("hex");
    const dbRecord = await prisma.applicationLaunchCode.findUnique({
      where: { codeHash },
    });
    assert.ok(dbRecord);
    assert.ok(dbRecord.usedAt);
  });

  await t.test("PATCH /api/users/:id/status propagates user state sync", async () => {
    // Login admin
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    // Disable a user and ensure no errors are thrown during propagation
    const testUser = await prisma.user.create({
      data: {
        name: "Sync Test User",
        email: `synctest-${Date.now()}@test.com`,
        passwordHash: "hash",
        organizationId: testOrg.id,
      }
    });

    const res = await fetch(`${url}/api/users/${testUser.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ status: "DISABLED" }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json() as any;
    assert.strictEqual(body.data.status, "DISABLED");
  });

  await t.test("GET /api/auth/application-context/:applicationCode", async () => {
    // 1. Unauthenticated context check
    const unauthRes = await fetch(`${url}/api/auth/application-context/CONCESSION`);
    assert.strictEqual(unauthRes.status, 401);

    // Login activeUser
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    // 2. Active user with access gets 200
    const successRes = await fetch(`${url}/api/auth/application-context/CONCESSION`, {
      headers: { cookie },
    });
    assert.strictEqual(successRes.status, 200);
    const successBody = await successRes.json() as any;
    assert.strictEqual(successBody.status, "success");
    assert.strictEqual(successBody.data.user.id, activeUser.id);
    assert.strictEqual(successBody.data.application.code, "CONCESSION");

    // 3. Requesting access for non-assigned app gets 403
    const forbiddenRes = await fetch(`${url}/api/auth/application-context/TICKETING`, {
      headers: { cookie },
    });
    assert.strictEqual(forbiddenRes.status, 403);
  });

  await t.test("GET /api/applications/users/:platformUserId/context (internal API)", async () => {
    // 1. Unauthenticated internal call (missing header)
    const noHeaderRes = await fetch(`${url}/api/applications/users/${activeUser.id}/context?application=CONCESSION`);
    assert.strictEqual(noHeaderRes.status, 401);

    // 2. Unauthenticated internal call (invalid header)
    const badHeaderRes = await fetch(`${url}/api/applications/users/${activeUser.id}/context?application=CONCESSION`, {
      headers: { "x-platform-internal-key": "wrong-secret-key" },
    });
    assert.strictEqual(badHeaderRes.status, 401);

    // 3. Valid credentials check
    const internalKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";
    const successRes = await fetch(`${url}/api/applications/users/${activeUser.id}/context?application=CONCESSION`, {
      headers: { "x-platform-internal-key": internalKey },
    });
    assert.strictEqual(successRes.status, 200);
    const successBody = await successRes.json() as any;
    assert.strictEqual(successBody.status, "success");
    assert.strictEqual(successBody.data.id, activeUser.id);
    assert.strictEqual(successBody.data.application.role, "CONCESSION_ADMINISTRATOR");

    // 4. Revoked app / no access user returns 403
    const forbiddenRes = await fetch(`${url}/api/applications/users/${activeUser.id}/context?application=TICKETING`, {
      headers: { "x-platform-internal-key": internalKey },
    });
    assert.strictEqual(forbiddenRes.status, 403);
  });

  await t.test("Phase 7D User Access Management Tests", async () => {
    const loginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: activeUser.email, password: testPassword }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";

    const targetUserEmail = `access-test-${Date.now()}@test.com`;
    const userRes = await fetch(`${url}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        name: "Access Test User",
        email: targetUserEmail,
        password: "Password123!",
        organizationId: testOrg.id,
      }),
    });
    assert.strictEqual(userRes.status, 201);
    const targetUser = (await userRes.json() as any).data;

    const grantRes = await fetch(`${url}/api/users/${targetUser.id}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        applicationCode: "CONCESSION",
        role: "CONCESSION_CASHIER",
      }),
    });
    assert.strictEqual(grantRes.status, 201);
    const grantBody = await grantRes.json() as any;
    assert.strictEqual(grantBody.status, "success");

    const dupRes = await fetch(`${url}/api/users/${targetUser.id}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        applicationCode: "CONCESSION",
        role: "CONCESSION_CASHIER",
      }),
    });
    assert.strictEqual(dupRes.status, 409);

    const changeRes = await fetch(`${url}/api/users/${targetUser.id}/applications/CONCESSION`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        role: "CONCESSION_ADMINISTRATOR",
      }),
    });
    assert.strictEqual(changeRes.status, 200);

    const invalidRoleRes = await fetch(`${url}/api/users/${targetUser.id}/applications/CONCESSION`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({
        role: "TICKETING_CASHIER",
      }),
    });
    assert.strictEqual(invalidRoleRes.status, 400);

    const detailRes = await fetch(`${url}/api/users/${targetUser.id}`, { headers: { cookie } });
    assert.strictEqual(detailRes.status, 200);
    const detailBody = await detailRes.json() as any;
    assert.strictEqual(detailBody.data.applications[0].role, "CONCESSION_ADMINISTRATOR");
    assert.ok(detailBody.data.applications[0].permissions.length > 0);

    const revokeRes = await fetch(`${url}/api/users/${targetUser.id}/applications/CONCESSION`, {
      method: "DELETE",
      headers: { cookie },
    });
    assert.strictEqual(revokeRes.status, 200);

    const detailRes2 = await fetch(`${url}/api/users/${targetUser.id}`, { headers: { cookie } });
    const detailBody2 = await detailRes2.json() as any;
    assert.strictEqual(detailBody2.data.applications.length, 0);

    const normalLoginRes = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetUserEmail, password: "Password123!" }),
    });
    const normalCookie = normalLoginRes.headers.get("set-cookie") || "";
    const idorRes = await fetch(`${url}/api/users/${activeUser.id}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: normalCookie },
      body: JSON.stringify({
        applicationCode: "CONCESSION",
        role: "CONCESSION_CASHIER",
      }),
    });
    assert.strictEqual(idorRes.status, 403);
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
