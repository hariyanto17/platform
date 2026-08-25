import test from "node:test";
import assert from "node:assert";
import { prisma } from "../../utils/prisma";
import * as settingsService from "./service";
import { validateSettingValue } from "./validation";

test("Platform Settings Integration Test Suite", async (t) => {
  // Clear overrides settings
  await prisma.appSetting.deleteMany({
    where: {
      scope: { not: "GLOBAL" }
    }
  });

  const testOrg = await prisma.organization.upsert({
    where: { id: "settings-test-org" },
    update: {},
    create: {
      id: "settings-test-org",
      name: "Settings Test Org",
      code: "SET-TEST-ORG",
      status: "ACTIVE",
    },
  });

  const testUser = await prisma.user.upsert({
    where: { email: "settings-admin@example.com" },
    update: {},
    create: {
      id: "settings-admin-id",
      name: "Settings Admin",
      email: "settings-admin@example.com",
      passwordHash: "dummy-hash",
      organizationId: testOrg.id,
      status: "ACTIVE",
    },
  });

  await t.test("Defaults settings seeds resolution fallback check", async () => {
    const effective = await settingsService.getEffectiveSetting("SESSION_TIMEOUT_MINUTES");
    assert.strictEqual(effective.value, "30", "Default global value is 30 minutes");
    assert.strictEqual(effective.effectiveScope, "GLOBAL", "Should fall back to GLOBAL");
  });

  await t.test("Validating boundary rules for session timeout value", async () => {
    assert.strictEqual(validateSettingValue("SESSION_TIMEOUT_MINUTES", "0"), "Must be an integer between 5 and 1440 minutes");
    assert.strictEqual(validateSettingValue("SESSION_TIMEOUT_MINUTES", "1500"), "Must be an integer between 5 and 1440 minutes");
    assert.strictEqual(validateSettingValue("SESSION_TIMEOUT_MINUTES", "60"), null);
  });

  await t.test("Creating organization override setting and resolving precedence", async () => {
    const updated = await settingsService.updateSetting({
      adminUserId: testUser.id,
      key: "SESSION_TIMEOUT_MINUTES",
      value: "45",
      scope: "ORGANIZATION",
      scopeId: testOrg.id,
      reason: "Custom org policy change",
    });

    assert.strictEqual(updated.value, "45", "Updated value returned is 45");

    // Retrieve effective configuration for org
    const effective = await settingsService.getEffectiveSetting("SESSION_TIMEOUT_MINUTES", testOrg.id);
    assert.strictEqual(effective.value, "45", "Resolves to org-specific override value");
    assert.strictEqual(effective.effectiveScope, "ORGANIZATION", "Effective scope is ORGANIZATION");

    // Query global settings list
    const globalEffective = await settingsService.getEffectiveSetting("SESSION_TIMEOUT_MINUTES");
    assert.strictEqual(globalEffective.value, "30", "Global default remains untouched");
  });

  await t.test("Masking and redacting sensitive settings values", async () => {
    // Read sensitive key check
    const listRes = await settingsService.listSettings({ page: 1, limit: 10 });
    const apiKey = listRes.settings.find(s => s.key === "INTERNAL_API_KEY");
    assert.ok(apiKey, "INTERNAL_API_KEY setting must exist");
    assert.strictEqual(apiKey.value, "[REDACTED]", "Value must be masked in list");

    // Assert updates
    const updated = await settingsService.updateSetting({
      adminUserId: testUser.id,
      key: "INTERNAL_API_KEY",
      value: "my-highly-secure-token",
      scope: "GLOBAL",
      scopeId: "",
    });
    assert.strictEqual(updated.value, "[REDACTED]", "Updates output must mask raw secret value");
  });

  await t.test("Resetting override settings returns back to default inherited configuration", async () => {
    // Verify override exists
    const beforeReset = await settingsService.getEffectiveSetting("SESSION_TIMEOUT_MINUTES", testOrg.id);
    assert.strictEqual(beforeReset.value, "45");

    // Perform reset
    await settingsService.resetSetting({
      adminUserId: testUser.id,
      key: "SESSION_TIMEOUT_MINUTES",
      scope: "ORGANIZATION",
      scopeId: testOrg.id,
    });

    // Verify resolved configuration falls back
    const afterReset = await settingsService.getEffectiveSetting("SESSION_TIMEOUT_MINUTES", testOrg.id);
    assert.strictEqual(afterReset.value, "30", "Effective configuration restored to GLOBAL default value");
    assert.strictEqual(afterReset.effectiveScope, "GLOBAL");
  });
});
