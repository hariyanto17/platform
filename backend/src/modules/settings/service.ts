import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";

const AUDIT_LOG_ACTION = "SETTINGS_UPDATED";

export const getSettings = async () => {
  const settingsList = await prisma.appSetting.findMany();
  const settings: Record<string, string> = {};
  for (const s of settingsList) {
    settings[s.key] = s.value;
  }
  return settings;
};

export const updateSettings = async (adminUserId: string, payload: Record<string, string>) => {
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw new AppError("BAD_REQUEST", "Payload pengaturan tidak boleh kosong");
  }

  // Update in a transaction
  const updatedSettings = await prisma.$transaction(
    keys.map((key) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value: payload[key] },
        create: { key, value: payload[key] },
      })
    )
  );

  // Log activity
  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: AUDIT_LOG_ACTION,
      entity: "AppSetting",
      entityId: "SYSTEM",
      payload: JSON.stringify(payload),
    },
  });

  const settingsMap: Record<string, string> = {};
  for (const s of updatedSettings) {
    settingsMap[s.key] = s.value;
  }
  return settingsMap;
};
