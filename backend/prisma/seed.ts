import { prisma } from "../src/utils/prisma";
import argon2 from "argon2";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Seeding Planet Cinema database...");

  // 1. Organization: Planet Cinema
  const org = await prisma.organization.upsert({
    where: { name: "Planet Cinema" },
    update: {},
    create: { name: "Planet Cinema" },
  });
  console.log(`- Organization seeded: ${org.name}`);

  // 2. Applications
  const appsData = [
    { code: "PLATFORM", name: "Planet Cinema Platform Portal", description: "Central management panel" },
    { code: "TICKETING", name: "Kasir Ticket (Ticketing)", description: "Box office counter application" },
    { code: "CONCESSION", name: "Concession POS (Consession)", description: "Food & Beverage sales counter" },
  ];

  const appsMap: Record<string, any> = {};
  for (const app of appsData) {
    const dbApp = await prisma.application.upsert({
      where: { code: app.code },
      update: { name: app.name, description: app.description },
      create: app,
    });
    appsMap[app.code] = dbApp;
  }
  console.log("- Applications seeded");

  // 3. Permissions
  const permissionsData = [
    // Platform permissions
    { code: "platform.dashboard.view", name: "View Platform Dashboard", applicationCode: "PLATFORM" },
    { code: "platform.users.view", name: "View Users list", applicationCode: "PLATFORM" },
    { code: "platform.users.create", name: "Create new user accounts", applicationCode: "PLATFORM" },
    { code: "platform.users.update", name: "Update user profile details", applicationCode: "PLATFORM" },
    { code: "platform.users.disable", name: "Block or disable user sessions", applicationCode: "PLATFORM" },
    { code: "platform.organizations.view", name: "View tenant settings", applicationCode: "PLATFORM" },
    { code: "platform.applications.view", name: "View system integrations", applicationCode: "PLATFORM" },
    { code: "platform.audit_logs.view", name: "Access security audit logs", applicationCode: "PLATFORM" },
    { code: "platform.access.manage", name: "Manage user application access", applicationCode: "PLATFORM" },
    { code: "platform.roles.view", name: "View role registry", applicationCode: "PLATFORM" },
    { code: "platform.permissions.view", name: "View permission mapping rules", applicationCode: "PLATFORM" },

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
  console.log("- Permissions seeded");

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
  console.log("- Roles seeded");

  // 5. Connect Roles to Permissions
  const rolePermissionsConnections: Record<string, string[]> = {
    PLATFORM_ADMINISTRATOR: [
      "platform.dashboard.view", "platform.users.view", "platform.users.create",
      "platform.users.update", "platform.users.disable", "platform.organizations.view",
      "platform.applications.view", "platform.audit_logs.view", "platform.access.manage",
      "platform.roles.view", "platform.permissions.view"
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
  console.log("- Role-Permission links established");

  // 6. Admin Account creation
  const seedEmail = process.env.PLATFORM_SEED_ADMIN_EMAIL || "admin@planetcinema.co.id";
  const seedPassword = process.env.PLATFORM_SEED_ADMIN_PASSWORD;

  if (!seedPassword) {
    console.error("CRITICAL WARNING: PLATFORM_SEED_ADMIN_PASSWORD environment variable is missing!");
    process.exit(1);
  }

  const passwordHash = await argon2.hash(seedPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: seedEmail.toLowerCase() },
    update: { passwordHash },
    create: {
      name: "Admin Platform",
      email: seedEmail.toLowerCase(),
      passwordHash,
      organizationId: org.id,
      status: "ACTIVE",
    },
  });
  console.log(`- Admin account seeded: ${adminUser.email}`);

  // 7. Associate Admin account with Application Access
  const adminAccesses = [
    { appCode: "PLATFORM", roleCode: "PLATFORM_ADMINISTRATOR" },
    { appCode: "TICKETING", roleCode: "TICKETING_ADMINISTRATOR" },
    { appCode: "CONCESSION", roleCode: "CONCESSION_ADMINISTRATOR" },
  ];

  for (const acc of adminAccesses) {
    const role = rolesMap[acc.roleCode];
    await prisma.userApplicationAccess.upsert({
      where: {
        userId_applicationCode: {
          userId: adminUser.id,
          applicationCode: acc.appCode,
        },
      },
      update: { roleId: role.id },
      create: {
        userId: adminUser.id,
        organizationId: org.id,
        applicationCode: acc.appCode,
        roleId: role.id,
      },
    });
  }
  console.log("- Admin application accesses mapped successfully");

  console.log("Database seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
