import { prisma } from "../../utils/prisma";

export const listOrganizations = async () => {
  return prisma.organization.findMany({
    orderBy: { name: "asc" },
  });
};

export const getOrganizationById = async (id: string) => {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
    },
  });

  if (!org) {
    throw new Error("Organisasi tidak ditemukan");
  }

  // Get enabled applications list for this organization
  const accesses = await prisma.userApplicationAccess.findMany({
    where: { organizationId: id },
    select: {
      applicationCode: true,
    },
    distinct: ["applicationCode"],
  });

  const enabledApps = await prisma.application.findMany({
    where: {
      code: { in: accesses.map((a) => a.applicationCode) },
    },
  });

  return {
    ...org,
    enabledApplications: enabledApps,
  };
};
