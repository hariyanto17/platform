import { prisma } from "./prisma";

export const logActivity = async (
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  payload?: any
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
