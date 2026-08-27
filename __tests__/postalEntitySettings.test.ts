import { prisma } from "@/lib/db";
import {
  PostalEntitySettingAlreadyExistsError,
  PostalEntitySettingRequiredError,
  createInitialPostalEntitySetting,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";

const firstSettingInput = {
  postalEntityName: "Poste Italiane",
  normalizedPostalEntityName: "poste italiane",
  countryCode: "IT",
  displayCurrencyCode: "EUR",
  timeZone: "Europe/Rome",
  timeZoneMode: "SYSTEM" as const,
};

describe("initial postal entity settings", () => {
  beforeEach(async () => {
    await prisma.userPostalEntitySetting.deleteMany();
    await prisma.postalEntity.deleteMany();
    await prisma.userProfile.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("submits, saves, and activates the first pending entity in one transaction", async () => {
    await prisma.userProfile.create({ data: { id: "first-user" } });

    const setting = await createInitialPostalEntitySetting(
      "first-user",
      firstSettingInput
    );

    await expect(
      prisma.userProfile.findUniqueOrThrow({
        where: { id: "first-user" },
        include: {
          activePostalEntitySetting: { include: { postalEntity: true } },
        },
      })
    ).resolves.toMatchObject({
      activePostalEntitySettingId: setting.id,
      activePostalEntitySetting: {
        id: setting.id,
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "SYSTEM",
        postalEntity: {
          name: "Poste Italiane",
          normalizedName: "poste italiane",
          countryCode: "IT",
          status: "PENDING",
          submittedById: "first-user",
        },
      },
    });
  });

  it("rolls back a second initial submission and setting", async () => {
    await prisma.userProfile.create({ data: { id: "first-user" } });
    await createInitialPostalEntitySetting("first-user", firstSettingInput);

    await expect(
      createInitialPostalEntitySetting("first-user", {
        postalEntityName: "Friend Post",
        normalizedPostalEntityName: "friend post",
        countryCode: "IT",
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "CUSTOM",
      })
    ).rejects.toBeInstanceOf(PostalEntitySettingAlreadyExistsError);
    await expect(
      prisma.userPostalEntitySetting.count({ where: { userId: "first-user" } })
    ).resolves.toBe(1);
    await expect(prisma.postalEntity.count()).resolves.toBe(1);
  });

  it("keeps pending entities and active selections isolated by user", async () => {
    await prisma.userProfile.createMany({
      data: [{ id: "first-user" }, { id: "second-user" }],
    });

    const [firstSetting, secondSetting] = await Promise.all([
      createInitialPostalEntitySetting("first-user", firstSettingInput),
      createInitialPostalEntitySetting("second-user", firstSettingInput),
    ]);

    const profiles = await prisma.userProfile.findMany({
      orderBy: { id: "asc" },
    });
    expect(profiles).toMatchObject([
      { id: "first-user", activePostalEntitySettingId: firstSetting.id },
      { id: "second-user", activePostalEntitySettingId: secondSetting.id },
    ]);
    expect(firstSetting.postalEntity.id).not.toBe(secondSetting.postalEntity.id);
    await expect(requireActivePostalEntitySetting("first-user")).resolves.toMatchObject(
      {
        userId: "first-user",
        postalEntity: { submittedById: "first-user", status: "PENDING" },
      }
    );
  });

  it("rejects access through another user's setting", async () => {
    await prisma.userProfile.createMany({
      data: [{ id: "first-user" }, { id: "second-user" }],
    });
    const secondSetting = await createInitialPostalEntitySetting(
      "second-user",
      firstSettingInput
    );
    await prisma.userProfile.update({
      where: { id: "second-user" },
      data: { activePostalEntitySettingId: null },
    });
    await prisma.userProfile.update({
      where: { id: "first-user" },
      data: { activePostalEntitySettingId: secondSetting.id },
    });

    await expect(
      requireActivePostalEntitySetting("first-user")
    ).rejects.toBeInstanceOf(PostalEntitySettingRequiredError);
  });
});
