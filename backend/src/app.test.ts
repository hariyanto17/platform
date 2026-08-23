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

  // Clean up
  server.close();
  await prisma.user.deleteMany({
    where: {
      id: { in: [activeUser.id, disabledUser.id] },
    },
  });
  await prisma.organization.delete({
    where: { id: testOrg.id },
  });
});
