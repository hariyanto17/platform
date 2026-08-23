import { prisma } from "../../utils/prisma";

export const listRoles = async () => {
  return prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: { code: "asc" },
  });
};

export const listPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: { code: "asc" },
  });
};
