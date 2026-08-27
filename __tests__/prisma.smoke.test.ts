import { prisma } from "@/lib/db";

describe("prisma smoke", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("writes and reads a user profile", async () => {
    const created = await prisma.userProfile.create({
      data: { id: "smoke-profile", email: "smoke@example.com" },
    });
    expect(created.id).toBe("smoke-profile");
    expect(created.role).toBe("USER");
    expect(created.createdAt).toBeInstanceOf(Date);

    const found = await prisma.userProfile.findMany({
      orderBy: { createdAt: "desc" },
    });
    expect(found.some((u) => u.id === created.id)).toBe(true);
  });

  it("associates a country setting with its user profile", async () => {
    const profile = await prisma.userProfile.create({
      data: { id: "country-setting-profile" },
    });
    const setting = await prisma.userCountrySetting.create({
      data: {
        userId: profile.id,
        countryCode: "IT",
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "SYSTEM",
      },
    });

    const updated = await prisma.userProfile.update({
      where: { id: profile.id },
      data: { activeCountrySettingId: setting.id },
      include: { activeCountrySetting: true, countrySettings: true },
    });

    expect(updated.activeCountrySetting).toMatchObject({
      id: setting.id,
      countryCode: "IT",
      displayCurrencyCode: "EUR",
      timeZone: "Europe/Rome",
      timeZoneMode: "SYSTEM",
    });
    expect(updated.countrySettings).toHaveLength(1);
  });
});
