import { prisma } from "../../utils/prisma";

export const listOrganizations = async () => {
  return prisma.organization.findMany({
    orderBy: { name: "asc" },
  });
};
