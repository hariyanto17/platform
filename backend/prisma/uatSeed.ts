import { prisma } from "../src/utils/prisma";
import argon2 from "argon2";
import dotenv from "dotenv";

dotenv.config();

export async function resetUat() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing destructive UAT reset in production environment!");
    process.exit(1);
  }

  console.log("⚠️  Resetting UAT Data in Planet Cinema Platform...");
  
  // Clean up UAT-specific data safely
  await prisma.applicationLaunchCode.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.executiveAlert.deleteMany();
  await prisma.userApplicationAccess.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@planetcinema.local" } },
  });
  
  console.log("✓ UAT data cleaned successfully.");
}

export async function seedUat() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing UAT seed execution in production environment!");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("  Seeding Planet Cinema Platform for Local UAT    ");
  console.log("==================================================");

  // 1. Organizations
  const organizationsData = [
    {
      code: "PLANET-HQ",
      name: "Planet Cinema Head Office",
      status: "ACTIVE" as const,
    },
    {
      code: "PLANET-BONE",
      name: "Planet Cinema Bone Branch",
      status: "ACTIVE" as const,
    },
    {
      code: "PLANET-DISABLED",
      name: "Planet Cinema Inactive Branch",
      status: "DISABLED" as const,
    },
  ];

  const orgsMap: Record<string, any> = {};
  for (const orgDef of organizationsData) {
    const org = await prisma.organization.upsert({
      where: { code: orgDef.code },
      update: {
        name: orgDef.name,
        status: orgDef.status,
      },
      create: orgDef,
    });
    orgsMap[orgDef.code] = org;
    console.log(`✓ Organization Seeded: ${org.name} (${org.code}) [${org.status}]`);
  }

  // Also support legacy/alias code if exists
  await prisma.organization.upsert({
    where: { code: "PLANET-UAT" },
    update: { name: "Planet Cinema UAT", status: "ACTIVE" },
    create: { name: "Planet Cinema UAT", code: "PLANET-UAT", status: "ACTIVE" },
  });

  // 2. Ensure Applications
  const appsData = [
    { code: "PLATFORM", name: "Planet Cinema Platform Portal", description: "Central management control plane", status: "ACTIVE" as const, launchEnabled: true },
    { code: "TICKETING", name: "Kasir Ticket (Ticketing)", description: "Box office counter application", status: "ACTIVE" as const, launchEnabled: true },
    { code: "CONCESSION", name: "Concession POS (Consession)", description: "Food & Beverage sales counter", status: "ACTIVE" as const, launchEnabled: true },
  ];

  const appsMap: Record<string, any> = {};
  for (const app of appsData) {
    const dbApp = await prisma.application.upsert({
      where: { code: app.code },
      update: {
        name: app.name,
        description: app.description,
        status: app.status,
        launchEnabled: app.launchEnabled,
      },
      create: app,
    });
    appsMap[app.code] = dbApp;

    // Map Application to Organizations
    for (const org of Object.values(orgsMap)) {
      await prisma.organizationApplication.upsert({
        where: {
          organizationId_applicationId: {
            organizationId: org.id,
            applicationId: dbApp.id,
          },
        },
        update: { status: org.status === "DISABLED" ? "DISABLED" : "ACTIVE" },
        create: {
          organizationId: org.id,
          applicationId: dbApp.id,
          status: org.status === "DISABLED" ? "DISABLED" : "ACTIVE",
        },
      });
    }
  }
  console.log("✓ Applications & Organization Mappings configured");

  // 3. Permissions
  const permissionsData = [
    // Platform permissions
    { code: "platform.dashboard.view", name: "View Platform Dashboard", applicationCode: "PLATFORM" },
    { code: "platform.users.view", name: "View Users list", applicationCode: "PLATFORM" },
    { code: "platform.users.create", name: "Create new user accounts", applicationCode: "PLATFORM" },
    { code: "platform.users.update", name: "Update user profile details", applicationCode: "PLATFORM" },
    { code: "platform.users.disable", name: "Block or disable user sessions", applicationCode: "PLATFORM" },
    { code: "platform.organizations.view", name: "View tenant settings", applicationCode: "PLATFORM" },
    { code: "platform.organizations.manage", name: "Manage organization settings", applicationCode: "PLATFORM" },
    { code: "platform.applications.view", name: "View system integrations", applicationCode: "PLATFORM" },
    { code: "platform.applications.manage", name: "Manage system integrations", applicationCode: "PLATFORM" },
    { code: "platform.organization_applications.manage", name: "Manage organization application mapping", applicationCode: "PLATFORM" },
    { code: "platform.audit_logs.view", name: "Access security audit logs", applicationCode: "PLATFORM" },
    { code: "platform.access.manage", name: "Manage user application access", applicationCode: "PLATFORM" },
    { code: "platform.roles.view", name: "View role registry", applicationCode: "PLATFORM" },
    { code: "platform.permissions.view", name: "View permission mapping rules", applicationCode: "PLATFORM" },
    { code: "platform.settings.view", name: "View platform configurations", applicationCode: "PLATFORM" },
    { code: "platform.settings.update", name: "Update platform configurations", applicationCode: "PLATFORM" },

    // Ticketing permissions
    { code: "ticketing.dashboard.view", name: "View Ticket Dashboard", applicationCode: "TICKETING" },
    { code: "ticketing.movies.view", name: "View catalog list", applicationCode: "TICKETING" },
    { code: "ticketing.movies.create", name: "Add catalog items", applicationCode: "TICKETING" },
    { code: "ticketing.movies.update", name: "Edit catalog details", applicationCode: "TICKETING" },
    { code: "ticketing.showtimes.view", name: "View scheduling lists", applicationCode: "TICKETING" },
    { code: "ticketing.ticket_sales.view", name: "Access loket ticket module", applicationCode: "TICKETING" },

    // Concession permissions
    { code: "concession.dashboard.view", name: "View Concession Dashboard", applicationCode: "CONCESSION" },
    { code: "concession.products.view", name: "View retail product catalog", applicationCode: "CONCESSION" },
    { code: "concession.products.create", name: "Add products", applicationCode: "CONCESSION" },
    { code: "concession.products.update", name: "Edit products", applicationCode: "CONCESSION" },
    { code: "concession.inventory.view", name: "Access stock inventory flows", applicationCode: "CONCESSION" },
    { code: "concession.transactions.view", name: "View retail transactions", applicationCode: "CONCESSION" },
  ];

  const permissionsMap: Record<string, any> = {};
  for (const perm of permissionsData) {
    const dbPerm = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, applicationCode: perm.applicationCode },
      create: perm,
    });
    permissionsMap[perm.code] = dbPerm;
  }
  console.log("✓ System Permissions verified");

  // 4. Roles
  const rolesData = [
    { code: "PLATFORM_ADMINISTRATOR", name: "Platform Administrator", applicationCode: "PLATFORM" },
    { code: "TICKETING_ADMINISTRATOR", name: "Ticketing Administrator", applicationCode: "TICKETING" },
    { code: "TICKETING_CASHIER", name: "Ticketing Cashier", applicationCode: "TICKETING" },
    { code: "CONCESSION_ADMINISTRATOR", name: "Consession Administrator", applicationCode: "CONCESSION" },
    { code: "CONCESSION_CASHIER", name: "Consession Cashier", applicationCode: "CONCESSION" },
  ];

  const rolesMap: Record<string, any> = {};
  for (const role of rolesData) {
    const dbRole = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, applicationCode: role.applicationCode },
      create: role,
    });
    rolesMap[role.code] = dbRole;
  }

  // Connect Roles to Permissions
  const rolePermissionsConnections: Record<string, string[]> = {
    PLATFORM_ADMINISTRATOR: [
      "platform.dashboard.view", "platform.users.view", "platform.users.create",
      "platform.users.update", "platform.users.disable", "platform.organizations.view",
      "platform.organizations.manage", "platform.applications.view", "platform.applications.manage",
      "platform.organization_applications.manage", "platform.audit_logs.view", "platform.access.manage",
      "platform.roles.view", "platform.permissions.view", "platform.settings.view",
      "platform.settings.update"
    ],
    TICKETING_ADMINISTRATOR: [
      "ticketing.dashboard.view", "ticketing.movies.view", "ticketing.movies.create",
      "ticketing.movies.update", "ticketing.showtimes.view", "ticketing.ticket_sales.view"
    ],
    TICKETING_CASHIER: [
      "ticketing.dashboard.view", "ticketing.ticket_sales.view"
    ],
    CONCESSION_ADMINISTRATOR: [
      "concession.dashboard.view", "concession.products.view", "concession.products.create",
      "concession.products.update", "concession.inventory.view", "concession.transactions.view"
    ],
    CONCESSION_CASHIER: [
      "concession.dashboard.view", "concession.transactions.view"
    ],
  };

  for (const [roleCode, permCodes] of Object.entries(rolePermissionsConnections)) {
    const role = rolesMap[roleCode];
    for (const permCode of permCodes) {
      const perm = permissionsMap[permCode];
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }
  console.log("✓ System Roles & Role-Permission mappings verified");

  // 5. UAT Accounts Creation (Password: test1234)
  const uatPasswordPlain = "test1234";
  const uatPasswordHash = await argon2.hash(uatPasswordPlain);

  const hqOrg = orgsMap["PLANET-HQ"];
  const boneOrg = orgsMap["PLANET-BONE"];
  const disabledOrg = orgsMap["PLANET-DISABLED"];

  const uatAccounts = [
    // 1. Administrator (Platform Superadmin + All App Access)
    {
      email: "uat.admin@planetcinema.local",
      name: "UAT Platform Administrator",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "PLATFORM", roleCode: "PLATFORM_ADMINISTRATOR" },
        { appCode: "TICKETING", roleCode: "TICKETING_ADMINISTRATOR" },
        { appCode: "CONCESSION", roleCode: "CONCESSION_ADMINISTRATOR" },
      ],
    },
    // 2. Kasir (Multi-loket: Cashier on Ticketing and Concession)
    {
      email: "uat.kasir@planetcinema.local",
      name: "UAT Kasir Counter",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "TICKETING", roleCode: "TICKETING_CASHIER" },
        { appCode: "CONCESSION", roleCode: "CONCESSION_CASHIER" },
      ],
    },
    // 3. Admin Bone (Branch Administrator for Bone Branch)
    {
      email: "uat.adminbone@planetcinema.local",
      name: "UAT Admin Cabang Bone",
      org: boneOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "TICKETING", roleCode: "TICKETING_ADMINISTRATOR" },
        { appCode: "CONCESSION", roleCode: "CONCESSION_ADMINISTRATOR" },
      ],
    },
    // 4. Supplier (Inventory & Purchasing Officer)
    {
      email: "uat.supplier@planetcinema.local",
      name: "UAT Supplier / Inventory Officer",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "CONCESSION", roleCode: "CONCESSION_ADMINISTRATOR" },
      ],
    },
    // 5. Production House (Distributor & Movie Performance Auditor)
    {
      email: "uat.productionhouse@planetcinema.local",
      name: "UAT Production House Auditor",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "TICKETING", roleCode: "TICKETING_ADMINISTRATOR" },
      ],
    },
    // 6. Khusus Laporan (Executive Financial Analyst)
    {
      email: "uat.laporan@planetcinema.local",
      name: "UAT Eksekutif Laporan",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "PLATFORM", roleCode: "PLATFORM_ADMINISTRATOR" },
      ],
    },
    // 7. Dedicated Ticketing Cashier
    {
      email: "uat.ticketkasir@planetcinema.local",
      name: "UAT Ticketing Kasir",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "TICKETING", roleCode: "TICKETING_CASHIER" },
      ],
    },
    // 8. Dedicated Concession Cashier
    {
      email: "uat.concessionkasir@planetcinema.local",
      name: "UAT Concession Kasir",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "CONCESSION", roleCode: "CONCESSION_CASHIER" },
      ],
    },
    // 9. Concession Accounting
    {
      email: "uat.accounting@planetcinema.local",
      name: "UAT Accounting Officer",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "CONCESSION", roleCode: "CONCESSION_ADMINISTRATOR" },
      ],
    },
    // 10. Concession Kitchen
    {
      email: "uat.kitchen@planetcinema.local",
      name: "UAT Kitchen Cook",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "CONCESSION", roleCode: "CONCESSION_CASHIER" },
      ],
    },
    // 11. Concession Warehouse
    {
      email: "uat.warehouse@planetcinema.local",
      name: "UAT Warehouse Officer",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "CONCESSION", roleCode: "CONCESSION_ADMINISTRATOR" },
      ],
    },
    // 12. Executive GM (SSO Multi-app)
    {
      email: "uat.executive@planetcinema.local",
      name: "UAT Executive General Manager",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "PLATFORM", roleCode: "PLATFORM_ADMINISTRATOR" },
        { appCode: "TICKETING", roleCode: "TICKETING_ADMINISTRATOR" },
        { appCode: "CONCESSION", roleCode: "CONCESSION_ADMINISTRATOR" },
      ],
    },
    // 10. Negative Test - Disabled User Account
    {
      email: "uat.disabled@planetcinema.local",
      name: "UAT Inactive User (Disabled)",
      org: hqOrg,
      status: "DISABLED" as const,
      multiAccess: [
        { appCode: "PLATFORM", roleCode: "PLATFORM_ADMINISTRATOR" },
      ],
    },
    // 11. Negative Test - User with Revoked Application Access
    {
      email: "uat.revoked@planetcinema.local",
      name: "UAT Revoked Access User",
      org: hqOrg,
      status: "ACTIVE" as const,
      multiAccess: [],
    },
    // 12. Negative Test - User in Disabled Organization
    {
      email: "uat.disabledorg@planetcinema.local",
      name: "UAT User Inactive Organization",
      org: disabledOrg,
      status: "ACTIVE" as const,
      multiAccess: [
        { appCode: "PLATFORM", roleCode: "PLATFORM_ADMINISTRATOR" },
      ],
    },
  ];

  for (const acc of uatAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email.toLowerCase() },
      update: {
        name: acc.name,
        passwordHash: uatPasswordHash,
        organizationId: acc.org.id,
        status: acc.status,
      },
      create: {
        email: acc.email.toLowerCase(),
        name: acc.name,
        passwordHash: uatPasswordHash,
        organizationId: acc.org.id,
        status: acc.status,
      },
    });

    // Clear and reset access mappings
    await prisma.userApplicationAccess.deleteMany({ where: { userId: user.id } });

    for (const m of acc.multiAccess) {
      const role = rolesMap[m.roleCode];
      await prisma.userApplicationAccess.create({
        data: {
          userId: user.id,
          applicationCode: m.appCode,
          roleId: role.id,
          organizationId: acc.org.id,
        },
      });
    }

    console.log(`✓ User Seeded: ${user.email} (${acc.name}) -> ${acc.multiAccess.map(a => `${a.appCode}:${a.roleCode}`).join(", ") || "NO_ACCESS"}`);
  }

  // 6. Platform App Settings (Testing Inheritance, Overrides, and Masking)
  const uatSettings = [
    // Global Settings
    { key: "platform_name", value: "Planet Cinema Unified Platform", scope: "GLOBAL", scopeId: "", valueType: "STRING", category: "GENERAL", description: "Default platform display name" },
    { key: "session_timeout_minutes", value: "60", scope: "GLOBAL", scopeId: "", valueType: "INTEGER", category: "SECURITY", description: "Inactivity timeout in minutes" },
    { key: "currency_code", value: "IDR", scope: "GLOBAL", scopeId: "", valueType: "STRING", category: "GENERAL", description: "Default currency" },
    { key: "default_timezone", value: "Asia/Makassar", scope: "GLOBAL", scopeId: "", valueType: "STRING", category: "GENERAL", description: "Standard operating timezone" },
    { key: "payment_gateway_api_secret", value: "sec_uat_99x88y77z_prod_mask_test", scope: "GLOBAL", scopeId: "", valueType: "STRING", category: "SECURITY", isSensitive: true, description: "Sensitive payment credentials" },
    
    // Application Override (TICKETING & CONCESSION have shorter session timeout)
    { key: "session_timeout_minutes", value: "15", scope: "APPLICATION", scopeId: "TICKETING", valueType: "INTEGER", category: "SECURITY", description: "POS counter session timeout override" },
    { key: "session_timeout_minutes", value: "15", scope: "APPLICATION", scopeId: "CONCESSION", valueType: "INTEGER", category: "SECURITY", description: "Concession POS counter session timeout override" },
    
    // Organization Override (Bone branch custom display name & notification setting)
    { key: "platform_name", value: "Planet Cinema Bone Control Hub", scope: "ORGANIZATION", scopeId: boneOrg.id, valueType: "STRING", category: "GENERAL", description: "Bone branch tenant platform name" },
    { key: "branch_operating_hours", value: "10:00 - 23:00 WITA", scope: "ORGANIZATION", scopeId: boneOrg.id, valueType: "STRING", category: "GENERAL", description: "Bone operational schedule" },
  ];

  for (const s of uatSettings) {
    await prisma.appSetting.upsert({
      where: {
        key_scope_scopeId: {
          key: s.key,
          scope: s.scope,
          scopeId: s.scopeId,
        },
      },
      update: {
        value: s.value,
        valueType: s.valueType,
        category: s.category,
        isSensitive: s.isSensitive || false,
        description: s.description,
      },
      create: {
        key: s.key,
        value: s.value,
        valueType: s.valueType,
        category: s.category,
        scope: s.scope,
        scopeId: s.scopeId,
        isSensitive: s.isSensitive || false,
        description: s.description,
      },
    });
  }
  console.log("✓ AppSettings seeded (Global, Application overrides, Org overrides, Sensitive values)");

  // 7. Executive Alerts (Open, Acknowledged, Resolved)
  const uatAlerts = [
    {
      fingerprint: "CONCESSION_SYNC_TIMEOUT_WH_MAIN",
      severity: "HIGH" as const,
      category: "OPERATIONAL",
      title: "Concession Stock Movement Latency",
      description: "Batch inventory sync between Kitchen Storage and Sales Counter experienced retry delay.",
      source: "CONCESSION",
      applicationCode: "CONCESSION",
      status: "OPEN" as const,
      detectedAt: new Date(Date.now() - 3600 * 1000 * 2),
      metadata: { warehouse: "WH_MAIN", retryCount: 3, latencyMs: 1420 },
    },
    {
      fingerprint: "TICKETING_QRIS_SETTLEMENT_ALERT",
      severity: "MEDIUM" as const,
      category: "BUSINESS",
      title: "QRIS Payment Settlement Spike",
      description: "High volume of QRIS transactions recorded during peak weekend showtime.",
      source: "TICKETING",
      applicationCode: "TICKETING",
      status: "ACKNOWLEDGED" as const,
      detectedAt: new Date(Date.now() - 3600 * 1000 * 6),
      acknowledgedAt: new Date(Date.now() - 3600 * 1000 * 4),
      metadata: { transactionCount: 148, totalVolume: 8140000 },
    },
    {
      fingerprint: "PLATFORM_SSO_SECURITY_SWEEP",
      severity: "INFO" as const,
      category: "SECURITY",
      title: "Automated SSO Session Token Sweep",
      description: "Periodic token sweep verified 0 expired orphan launch codes.",
      source: "PLATFORM",
      applicationCode: "PLATFORM",
      status: "RESOLVED" as const,
      detectedAt: new Date(Date.now() - 3600 * 1000 * 12),
      acknowledgedAt: new Date(Date.now() - 3600 * 1000 * 11),
      resolvedAt: new Date(Date.now() - 3600 * 1000 * 10),
      metadata: { purgedCodes: 12, status: "CLEAN" },
    },
  ];

  for (const alert of uatAlerts) {
    const existing = await prisma.executiveAlert.findFirst({ where: { fingerprint: alert.fingerprint } });
    if (existing) {
      await prisma.executiveAlert.update({
        where: { id: existing.id },
        data: alert,
      });
    } else {
      await prisma.executiveAlert.create({
        data: alert,
      });
    }
  }
  console.log("✓ Executive Alerts seeded (OPEN, ACKNOWLEDGED, RESOLVED)");

  // 8. Audit Logs
  const adminUser = await prisma.user.findUnique({ where: { email: "uat.admin@planetcinema.local" } });
  if (adminUser) {
    const uatAuditLogs = [
      {
        userId: adminUser.id,
        action: "AUTHENTICATION_SUCCESS",
        entity: "User",
        entityId: adminUser.id,
        payload: { ipAddress: "127.0.0.1", userAgent: "UAT Test Agent / Chrome 124", loginMethod: "PASSWORD" },
        createdAt: new Date(Date.now() - 3600 * 1000 * 5),
      },
      {
        userId: adminUser.id,
        action: "SSO_LAUNCH_GENERATED",
        entity: "ApplicationLaunchCode",
        entityId: "LAUNCH_TICKETING_UAT",
        payload: { targetApplication: "TICKETING", destinationUrl: "http://localhost:3011/sso/callback" },
        createdAt: new Date(Date.now() - 3600 * 1000 * 4),
      },
      {
        userId: adminUser.id,
        action: "SETTING_OVERRIDE_UPDATED",
        entity: "AppSetting",
        entityId: "session_timeout_minutes:APPLICATION:TICKETING",
        payload: { previousValue: "60", newValue: "15", reason: "UAT Security Compliance" },
        createdAt: new Date(Date.now() - 3600 * 1000 * 3),
      },
      {
        userId: adminUser.id,
        action: "REPORT_EXPORT_GENERATED",
        entity: "ExecutiveReport",
        entityId: "BOX_OFFICE_CONCESSION_CONSOLIDATED",
        payload: { format: "PDF", period: "7d", recordCount: 48 },
        createdAt: new Date(Date.now() - 3600 * 1000 * 1),
      },
    ];

    for (const log of uatAuditLogs) {
      await prisma.auditLog.create({
        data: log,
      });
    }
    console.log("✓ Security Audit Logs populated");
  }

  // Seed Commercial Product Catalog
  const { seedProductCatalog } = await import("./catalogSeed");
  await seedProductCatalog();

  console.log("==================================================");
  console.log("  Platform UAT Database Seeding Completed!        ");
  console.log("==================================================");
}

if (require.main === module) {
  const isReset = process.argv.includes("--reset");
  const action = isReset ? resetUat() : seedUat();

  action
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
