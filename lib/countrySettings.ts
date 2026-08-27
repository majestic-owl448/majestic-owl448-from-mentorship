import { prisma } from "@/lib/db";

export type InitialCountrySettingInput = {
  countryCode: string;
  displayCurrencyCode: string;
  timeZone: string;
  timeZoneMode: "SYSTEM" | "CUSTOM";
};

export class CountrySettingAlreadyExistsError extends Error {
  constructor() {
    super("The initial country setting has already been saved.");
    this.name = "CountrySettingAlreadyExistsError";
  }
}

export class CountrySettingRequiredError extends Error {
  constructor() {
    super("Complete the required country settings before using inventory.");
    this.name = "CountrySettingRequiredError";
  }
}

export async function requireActiveCountrySetting(userId: string) {
  const profile = await prisma.userProfile.findFirst({
    where: {
      id: userId,
      activeCountrySetting: { userId },
    },
    select: { activeCountrySetting: true },
  });

  if (!profile?.activeCountrySetting) {
    throw new CountrySettingRequiredError();
  }

  return profile.activeCountrySetting;
}

export async function createInitialCountrySetting(
  userId: string,
  input: InitialCountrySettingInput
) {
  return prisma.$transaction(async (transaction) => {
    const profile = await transaction.userProfile.findUniqueOrThrow({
      where: { id: userId },
      select: { activeCountrySettingId: true },
    });

    const settingCount = await transaction.userCountrySetting.count({
      where: { userId },
    });

    if (profile.activeCountrySettingId !== null || settingCount > 0) {
      throw new CountrySettingAlreadyExistsError();
    }

    const setting = await transaction.userCountrySetting.create({
      data: { userId, ...input },
    });
    const activation = await transaction.userProfile.updateMany({
      where: { id: userId, activeCountrySettingId: null },
      data: { activeCountrySettingId: setting.id },
    });

    if (activation.count !== 1) {
      throw new CountrySettingAlreadyExistsError();
    }

    return setting;
  });
}
