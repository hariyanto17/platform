import test from "node:test";
import assert from "node:assert";
import { prisma } from "../../utils/prisma";
import * as alertsService from "./service";
import { AlertSeverity, AlertStatus } from "@prisma/client";

test("Alerts Service Test Suite", async (t) => {
  // Clear alerts table before testing
  await prisma.executiveAlert.deleteMany();

  // Ensure a test user and organization exist for foreign key relations
  const testOrg = await prisma.organization.upsert({
    where: { id: "test-alerts-org" },
    update: {},
    create: {
      id: "test-alerts-org",
      name: "Test Alerts Org",
      code: "TEST-ALERTS-ORG",
      status: "ACTIVE",
    },
  });

  const testUser = await prisma.user.upsert({
    where: { email: "test-alerts-user@example.com" },
    update: {},
    create: {
      id: "test-alerts-user-id",
      name: "Test Alerts User",
      email: "test-alerts-user@example.com",
      passwordHash: "dummy-hash",
      organizationId: testOrg.id,
      status: "ACTIVE",
    },
  });

  await t.test("Incident Deduplication on Sweep Detection", async () => {
    // Initial Sweep Trigger
    await alertsService.triggerAlertDetection();

    // Verify system alerts created (since downstream mock servers are not running or return error)
    const activeAlerts = await prisma.executiveAlert.findMany({
      where: { status: AlertStatus.OPEN },
    });

    assert.ok(activeAlerts.length >= 2, "Should create SYSTEM unavailability alerts");
    const firstCount = activeAlerts.length;

    // Run sweep again
    await alertsService.triggerAlertDetection();

    // Verify count did not increase (no duplicate active alerts)
    const secondCount = await prisma.executiveAlert.count({
      where: { status: AlertStatus.OPEN },
    });
    assert.strictEqual(firstCount, secondCount, "No duplicate active alerts should be created for same fingerprints");
  });

  await t.test("Alert Summary Calculations", async () => {
    const summary = await alertsService.getAlertSummary();
    assert.ok(summary.total >= 2, "Summary total should reflect created alerts");
    assert.ok(summary.open >= 2, "Summary open should reflect created alerts");
  });

  await t.test("Acknowledge and Resolve States", async () => {
    const alertsList = await prisma.executiveAlert.findMany({
      where: { status: AlertStatus.OPEN },
    });
    const target = alertsList[0];
    assert.ok(target, "An active alert must exist");

    // Acknowledge
    const acked = await alertsService.acknowledgeAlert(target.id, testUser.id);
    assert.strictEqual(acked?.status, AlertStatus.ACKNOWLEDGED, "Alert status should transition to ACKNOWLEDGED");

    // Detail check
    const details = await alertsService.getAlertDetail(target.id);
    assert.strictEqual(details?.status, AlertStatus.ACKNOWLEDGED, "Details status should be ACKNOWLEDGED");
    assert.ok(details.recommendedAction, "Details should include recommended action instructions");

    // Resolve
    const resolved = await alertsService.resolveAlert(target.id, testUser.id);
    assert.strictEqual(resolved?.status, AlertStatus.RESOLVED, "Alert status should transition to RESOLVED");
  });
});
