import { prisma } from "../src/utils/prisma";
import argon2 from "argon2";
import dotenv from "dotenv";

dotenv.config();

export async function seedUat() {
  console.log("==================================================");
  console.log("  Seeding Planet Cinema Ecosystem for Local UAT   ");
  console.log("==================================================");

  // 1. Ensure UAT Organization
  const uatOrg = await prisma.organization.upsert({
    where: { code: "PLANET-UAT" },
    update: {
      name: "Planet Cinema UAT",
      status: "ACTIVE",
    },
    create: {
      name: "Planet Cinema UAT",
      code: "PLANET-UAT",
      status: "ACTIVE",
    },
  });
  console.log(`✓ Organization UAT: ${uatOrg.name} (${uatOrg.code})`);

  // 2. Ensure Applications with launchEnabled = true
  const appsData = [
    { code: "PLATFORM", name: "Planet Cinema Platform Portal", description: "Central management control plane" },
    { code: "TICKETING", name: "Kasir Ticket (Ticketing)", description: "Box office counter application" },
    { code: "CONCESSION", name: "Concession POS (Consession)", description: "Food & Beverage sales counter" },
  ];

  const appsMap: Record<string, any> = {};
  for (const app of appsData) {
    const dbApp = await prisma.application.upsert({
      where: { code: app.code },
      update: {
        name: app.name,
        description: app.description,
        status: "ACTIVE",
        launchEnabled: true,
      },
      create: {
        code: app.code,
        name: app.name,
        description: app.description,
        status: "ACTIVE",
        launchEnabled: true,
      },
    });
    appsMap[app.code] = dbApp;

    // Map Application to UAT Organization
    await prisma.organizationApplication.upsert({
      where: {
        organizationId_applicationId: {
          organizationId: uatOrg.id,
          applicationId: dbApp.id,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        organizationId: uatOrg.id,
        applicationId: dbApp.id,
        status: "ACTIVE",
      },
    });
  }
  console.log("✓ Applications & Organization Mappings configured");

  // 3. Ensure Permissions
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

  // 4. Ensure Roles
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

  // 5. Create Dedicated UAT Accounts (Password: Uat12345!)
  const uatPasswordPlain = "Uat12345!";
  const uatPasswordHash = await argon2.hash(uatPasswordPlain);

  const uatAccounts = [
    {
      email: "uat.admin@planetcinema.local",
      name: "UAT Platform Administrator",
      roleCode: "PLATFORM_ADMINISTRATOR",
      appCode: "PLATFORM",
    },
    {
      email: "uat.ticketadmin@planetcinema.local",
      name: "UAT Ticketing Administrator",
      roleCode: "TICKETING_ADMINISTRATOR",
      appCode: "TICKETING",
    },
    {
      email: "uat.ticketkasir@planetcinema.local",
      name: "UAT Ticketing Kasir",
      roleCode: "TICKETING_CASHIER",
      appCode: "TICKETING",
    },
    {
      email: "uat.concessionadmin@planetcinema.local",
      name: "UAT Concession Administrator",
      roleCode: "CONCESSION_ADMINISTRATOR",
      appCode: "CONCESSION",
    },
    {
      email: "uat.concessionkasir@planetcinema.local",
      name: "UAT Concession Kasir",
      roleCode: "CONCESSION_CASHIER",
      appCode: "CONCESSION",
    },
    // Multi-role General Manager for complete SSO testing
    {
      email: "uat.executive@planetcinema.local",
      name: "UAT Executive General Manager",
      multiAccess: [
        { appCode: "PLATFORM", roleCode: "PLATFORM_ADMINISTRATOR" },
        { appCode: "TICKETING", roleCode: "TICKETING_ADMINISTRATOR" },
        { appCode: "CONCESSION", roleCode: "CONCESSION_ADMINISTRATOR" },
      ],
    },
  ];

  for (const acc of uatAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email.toLowerCase() },
      update: {
        name: acc.name,
        passwordHash: uatPasswordHash,
        organizationId: uatOrg.id,
        status: "ACTIVE",
      },
      create: {
        email: acc.email.toLowerCase(),
        name: acc.name,
        passwordHash: uatPasswordHash,
        organizationId: uatOrg.id,
        status: "ACTIVE",
      },
    });

    if (acc.multiAccess) {
      for (const m of acc.multiAccess) {
        const role = rolesMap[m.roleCode];
        await prisma.userApplicationAccess.upsert({
          where: {
            userId_applicationCode: {
              userId: user.id,
              applicationCode: m.appCode,
            },
          },
          update: {
            roleId: role.id,
            organizationId: uatOrg.id,
          },
          create: {
            userId: user.id,
            applicationCode: m.appCode,
            roleId: role.id,
            organizationId: uatOrg.id,
          },
        });
      }
    } else if (acc.appCode && acc.roleCode) {
      const role = rolesMap[acc.roleCode];
      await prisma.userApplicationAccess.upsert({
        where: {
          userId_applicationCode: {
            userId: user.id,
            applicationCode: acc.appCode,
          },
        },
        update: {
          roleId: role.id,
          organizationId: uatOrg.id,
        },
        create: {
          userId: user.id,
          applicationCode: acc.appCode,
          roleId: role.id,
          organizationId: uatOrg.id,
        },
      });
    }

    console.log(`✓ User Seeded: ${user.email} (${acc.name})`);
  }

  // 6. Log UAT Seeding Activity
  const adminUser = await prisma.user.findUnique({ where: { email: "uat.admin@planetcinema.local" } });
  if (adminUser) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: "UAT_ENVIRONMENT_SEEDED",
        entity: "System",
        entityId: "UAT-SEED",
        payload: {
          seededAccounts: uatAccounts.map((a) => a.email),
          organizationCode: uatOrg.code,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  console.log("==================================================");
  console.log("  Local UAT Database Seeding Completed Successfully ");
  console.log("==================================================");
}

if (require.main === module) {
  seedUat()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
