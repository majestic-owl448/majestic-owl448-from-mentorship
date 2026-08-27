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

  it("associates a pending postal entity setting with its user profile", async () => {
    const profile = await prisma.userProfile.create({
      data: { id: "postal-entity-setting-profile" },
    });
    const postalEntity = await prisma.postalEntity.create({
      data: {
        name: "Poste Italiane",
        normalizedName: "poste italiane",
        countryCode: "IT",
        submittedById: profile.id,
      },
    });
    const setting = await prisma.userPostalEntitySetting.create({
      data: {
        userId: profile.id,
        postalEntityId: postalEntity.id,
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "SYSTEM",
      },
    });

    const updated = await prisma.userProfile.update({
      where: { id: profile.id },
      data: { activePostalEntitySettingId: setting.id },
      include: {
        activePostalEntitySetting: { include: { postalEntity: true } },
        postalEntitySettings: true,
      },
    });

    expect(updated.activePostalEntitySetting).toMatchObject({
      id: setting.id,
      displayCurrencyCode: "EUR",
      timeZone: "Europe/Rome",
      timeZoneMode: "SYSTEM",
      postalEntity: {
        id: postalEntity.id,
        name: "Poste Italiane",
        countryCode: "IT",
        status: "PENDING",
      },
    });
    expect(updated.postalEntitySettings).toHaveLength(1);
  });
});
