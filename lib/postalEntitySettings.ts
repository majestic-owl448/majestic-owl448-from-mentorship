import { prisma } from "@/lib/db";

export type InitialPostalEntitySettingInput = {
  postalEntityName: string;
  normalizedPostalEntityName: string;
  countryCode: string;
  displayCurrencyCode: string;
  timeZone: string;
  timeZoneMode: "SYSTEM" | "CUSTOM";
};

export class PostalEntitySettingAlreadyExistsError extends Error {
  constructor() {
    super("The initial postal entity setting has already been saved.");
    this.name = "PostalEntitySettingAlreadyExistsError";
  }
}

export class PostalEntitySettingRequiredError extends Error {
  constructor() {
    super("Complete the required postal entity settings before using inventory.");
    this.name = "PostalEntitySettingRequiredError";
  }
}

export async function requireActivePostalEntitySetting(userId: string) {
  const profile = await prisma.userProfile.findFirst({
    where: {
      id: userId,
      activePostalEntitySetting: {
        userId,
        postalEntity: {
          status: "PENDING",
          submittedById: userId,
        },
      },
    },
    select: {
      activePostalEntitySetting: {
        include: { postalEntity: true },
      },
    },
  });

  if (!profile?.activePostalEntitySetting) {
    throw new PostalEntitySettingRequiredError();
  }

  return profile.activePostalEntitySetting;
}

export async function createInitialPostalEntitySetting(
  userId: string,
  input: InitialPostalEntitySettingInput
) {
  return prisma.$transaction(async (transaction) => {
    const profile = await transaction.userProfile.findUniqueOrThrow({
      where: { id: userId },
      select: { activePostalEntitySettingId: true },
    });

    const settingCount = await transaction.userPostalEntitySetting.count({
      where: { userId },
    });

    if (profile.activePostalEntitySettingId !== null || settingCount > 0) {
      throw new PostalEntitySettingAlreadyExistsError();
    }

    const postalEntity = await transaction.postalEntity.create({
      data: {
        name: input.postalEntityName,
        normalizedName: input.normalizedPostalEntityName,
        countryCode: input.countryCode,
        submittedById: userId,
      },
    });
    const setting = await transaction.userPostalEntitySetting.create({
      data: {
        userId,
        postalEntityId: postalEntity.id,
        displayCurrencyCode: input.displayCurrencyCode,
        timeZone: input.timeZone,
        timeZoneMode: input.timeZoneMode,
      },
    });
    const activation = await transaction.userProfile.updateMany({
      where: { id: userId, activePostalEntitySettingId: null },
      data: { activePostalEntitySettingId: setting.id },
    });

    if (activation.count !== 1) {
      throw new PostalEntitySettingAlreadyExistsError();
    }

    return { ...setting, postalEntity };
  });
}
