import { prisma } from "../../utils/prisma";

export const listApplications = async () => {
  const apps = await prisma.application.findMany({
    orderBy: { code: "asc" },
  });

  // Calculate assigned users count per application
  const mappedApps = await Promise.all(
    apps.map(async (app) => {
      const assignedUsersCount = await prisma.userApplicationAccess.count({
        where: { applicationCode: app.code },
      });
      return {
        ...app,
        assignedUsersCount,
      };
    })
  );

  return mappedApps;
};

export const getApplicationByCode = async (code: string) => {
  const app = await prisma.application.findUnique({
    where: { code },
    include: {
      roles: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      permissions: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!app) {
    return null;
  }

  const assignedUsersCount = await prisma.userApplicationAccess.count({
    where: { applicationCode: code },
  });

  return {
    ...app,
    assignedUsersCount,
  };
};
