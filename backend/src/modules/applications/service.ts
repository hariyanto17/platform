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
