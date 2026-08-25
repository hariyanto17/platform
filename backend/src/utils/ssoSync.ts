import { prisma } from "./prisma";

export const propagateUserSync = async (userId: string, appCode: string) => {
  if (process.env.NODE_ENV === "test" || process.argv.some((arg) => arg.includes("test"))) {
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        applicationAccesses: {
          where: { applicationCode: appCode },
          include: { role: true },
        },
      },
    });

    if (!user) return;

    const access = user.applicationAccesses[0];
    const roleCode = access ? access.role.code : null;

    let subAppUrl = "";
    if (appCode === "CONCESSION") {
      subAppUrl = process.env.CONCESSION_API_URL || "http://localhost:5050";
    } else if (appCode === "TICKETING") {
      subAppUrl = process.env.TICKETING_API_URL || "http://localhost:5011";
    }

    if (subAppUrl) {
      await fetch(`${subAppUrl}/api/auth/sso/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformUserId: userId,
          status: user.status,
          role: roleCode,
        }),
      }).catch(() => {
        // Ignore failure
      });
    }
  } catch (err) {
    console.error("SSO sync propagation failed", err);
  }
};

export const propagateUserSyncAll = async (userId: string) => {
  await propagateUserSync(userId, "CONCESSION");
  await propagateUserSync(userId, "TICKETING");
};
