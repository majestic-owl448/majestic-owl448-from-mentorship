import { prisma } from "@/lib/db";
import {
  CountrySettingAlreadyExistsError,
  createInitialCountrySetting,
} from "@/lib/countrySettings";

describe("initial country settings", () => {
  beforeEach(async () => {
    await prisma.userCountrySetting.deleteMany();
    await prisma.userProfile.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and activates the first setting in one transaction", async () => {
    await prisma.userProfile.create({ data: { id: "first-user" } });

    const setting = await createInitialCountrySetting("first-user", {
      countryCode: "IT",
      displayCurrencyCode: "EUR",
      timeZone: "Europe/Rome",
      timeZoneMode: "SYSTEM",
    });

    await expect(
      prisma.userProfile.findUniqueOrThrow({
        where: { id: "first-user" },
        include: { activeCountrySetting: true },
      })
    ).resolves.toMatchObject({
      activeCountrySettingId: setting.id,
      activeCountrySetting: {
        id: setting.id,
        countryCode: "IT",
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "SYSTEM",
      },
    });
  });

  it("does not create a second initial setting", async () => {
    await prisma.userProfile.create({ data: { id: "first-user" } });
    await createInitialCountrySetting("first-user", {
      countryCode: "IT",
      displayCurrencyCode: "EUR",
      timeZone: "Europe/Rome",
      timeZoneMode: "SYSTEM",
    });

    await expect(
      createInitialCountrySetting("first-user", {
        countryCode: "US",
        displayCurrencyCode: "USD",
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
      })
    ).rejects.toBeInstanceOf(CountrySettingAlreadyExistsError);
    await expect(
      prisma.userCountrySetting.count({ where: { userId: "first-user" } })
    ).resolves.toBe(1);
  });

  it("keeps each user's setting and active selection separate", async () => {
    await prisma.userProfile.createMany({
      data: [{ id: "first-user" }, { id: "second-user" }],
    });

    const [firstSetting, secondSetting] = await Promise.all([
      createInitialCountrySetting("first-user", {
        countryCode: "IT",
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "SYSTEM",
      }),
      createInitialCountrySetting("second-user", {
        countryCode: "US",
        displayCurrencyCode: "USD",
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
      }),
    ]);

    const profiles = await prisma.userProfile.findMany({
      orderBy: { id: "asc" },
    });
    expect(profiles).toMatchObject([
      { id: "first-user", activeCountrySettingId: firstSetting.id },
      { id: "second-user", activeCountrySettingId: secondSetting.id },
    ]);
  });
});
