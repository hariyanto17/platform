import test from "node:test";
import assert from "node:assert";
import { prisma } from "../../utils/prisma";
import * as securityService from "./service";

test("Security Module Service Test Suite", async (t) => {
  // Create a test user for actor reference
  const testOrg = await prisma.organization.upsert({
    where: { id: "test-security-org" },
    update: {},
    create: {
      id: "test-security-org",
      name: "Test Security Org",
      code: "TEST-SEC-ORG",
      status: "ACTIVE",
    },
  });

  const testUser = await prisma.user.upsert({
    where: { email: "sec-user-isolated@example.com" },
    update: {},
    create: {
      id: "sec-user-isolated-id",
      name: "Sec Actor",
      email: "sec-user-isolated@example.com",
      passwordHash: "dummy-hash",
      organizationId: testOrg.id,
      status: "ACTIVE",
    },
  });

  // Clean previous test state for idempotency
  await prisma.auditLog.deleteMany({
    where: { userId: testUser.id },
  });

  // Seed standard activity logs for this user
  await prisma.auditLog.createMany({
    data: [
      {
        userId: testUser.id,
        action: "LOGIN",
        entity: "User",
        entityId: testUser.id,
        createdAt: new Date(),
      },
      {
        userId: testUser.id,
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: "unknown",
        createdAt: new Date(),
      },
      {
        userId: testUser.id,
        action: "APPLICATION_LAUNCH_EXCHANGED",
        entity: "Application",
        entityId: "TICKETING",
        createdAt: new Date(),
      },
      {
        userId: testUser.id,
        action: "INVALID_INTERNAL_API_KEY_ATTEMPT",
        entity: "System",
        entityId: "platform-gateway",
        createdAt: new Date(),
      },
    ],
  });

  await t.test("Security Score Deterministic Calculation", async () => {
    const score = await securityService.getSecurityScore();
    assert.ok(score.value >= 0 && score.value <= 100, "Score must be bounded between 0 and 100");
    assert.ok(score.factors.length > 0, "Should contain factor breakdown lists");
  });

  await t.test("Security Overview Data Aggregates", async () => {
    const overview = await securityService.getSecurityOverview();
    assert.ok(overview.summary.totalEvents >= 4, "Should count at least 4 events");
    assert.ok(overview.summary.successfulLogins >= 1, "Should count at least 1 login");
    assert.ok(overview.summary.failedLogins >= 1, "Should count at least 1 login failure");
    assert.ok(overview.summary.ssoLaunches >= 1, "Should count at least 1 SSO launch");
    assert.ok(overview.recentCriticalEvents.length >= 1, "Should identify critical events");
  });

  await t.test("Security Activity List and Pagination", async () => {
    const activity = await securityService.getSecurityActivity({
      userId: testUser.id,
      page: 1,
      limit: 10,
    });
    assert.strictEqual(activity.activities.length, 4, "Should return 4 normalized entries for test user");
    assert.strictEqual(activity.pagination.total, 4, "Pagination total matches test user entries");
  });

  await t.test("Security Activity Detail and Time-Bounded Correlations", async () => {
    const logs = await prisma.auditLog.findMany({ where: { userId: testUser.id } });
    const target = logs.find(l => l.action === "LOGIN");
    assert.ok(target, "Target login log must exist");

    const detail = await securityService.getSecurityActivityDetail(target.id);
    assert.ok(detail, "Detail object should return successfully");
    assert.strictEqual(detail.eventType, "LOGIN", "Mapped eventType matches database key");
    assert.ok(detail.correlatedEvents.length > 0, "Correlations must return events within the 30-minute window");
  });
});
