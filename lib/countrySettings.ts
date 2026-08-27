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

export async function createInitialCountrySetting(
  userId: string,
  input: InitialCountrySettingInput
) {
  return prisma.$transaction(async (transaction) => {
    const profile = await transaction.userProfile.findUniqueOrThrow({
      where: { id: userId },
      select: { activeCountrySettingId: true },
    });

    if (profile.activeCountrySettingId !== null) {
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
