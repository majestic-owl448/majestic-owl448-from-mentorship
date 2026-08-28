import { prisma } from "@/lib/db";
import {
  PostalEntitySettingNotFoundError,
  PostalEntityUnavailableError,
  PostalEntitySettingAlreadyExistsError,
  PostalEntitySettingRequiredError,
  activatePostalEntitySetting,
  addExistingPostalEntitySetting,
  createInitialPostalEntitySetting,
  listPostalEntitySettings,
  localDateInTimeZone,
  requireActivePostalEntitySetting,
  updatePostalEntitySetting,
} from "@/lib/postalEntitySettings";

const firstSettingInput = {
  postalEntityName: "Poste Italiane",
  normalizedPostalEntityName: "poste italiane",
  countryCode: "IT",
  displayCurrencyCode: "EUR",
  timeZone: "Europe/Rome",
  timeZoneMode: "SYSTEM" as const,
};

describe("postal entity settings", () => {
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

  it("adds a second entity in the same country without changing the first", async () => {
    await prisma.userProfile.create({ data: { id: "first-user" } });
    const first = await createInitialPostalEntitySetting(
      "first-user",
      firstSettingInput
    );

    const second = await createInitialPostalEntitySetting("first-user", {
      postalEntityName: "Vatican Post",
      normalizedPostalEntityName: "vatican post",
      countryCode: "IT",
      displayCurrencyCode: "USD",
      timeZone: "Europe/Vatican",
      timeZoneMode: "CUSTOM",
    });

    expect(second.id).not.toBe(first.id);
    await expect(
      prisma.userPostalEntitySetting.count({ where: { userId: "first-user" } })
    ).resolves.toBe(2);
    await expect(
      prisma.userProfile.findUniqueOrThrow({ where: { id: "first-user" } })
    ).resolves.toMatchObject({ activePostalEntitySettingId: first.id });
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
        postalEntity: { name: "Poste Italiane", status: "PENDING" },
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

  it("rejects a duplicate setting for the same user and postal entity", async () => {
    await prisma.userProfile.create({ data: { id: "first-user" } });
    const setting = await createInitialPostalEntitySetting(
      "first-user",
      firstSettingInput
    );

    await expect(
      addExistingPostalEntitySetting("first-user", setting.postalEntityId, {
        displayCurrencyCode: "USD",
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
      })
    ).rejects.toBeInstanceOf(PostalEntitySettingAlreadyExistsError);
  });

  it("edits one setting without changing another", async () => {
    await prisma.userProfile.create({ data: { id: "first-user" } });
    const first = await createInitialPostalEntitySetting(
      "first-user",
      firstSettingInput
    );
    const second = await createInitialPostalEntitySetting("first-user", {
      ...firstSettingInput,
      postalEntityName: "Vatican Post",
      normalizedPostalEntityName: "vatican post",
    });

    await updatePostalEntitySetting("first-user", first.id, {
      displayCurrencyCode: "USD",
      timeZone: "America/New_York",
      timeZoneMode: "CUSTOM",
    });

    await expect(listPostalEntitySettings("first-user")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: first.id,
          displayCurrencyCode: "USD",
          timeZone: "America/New_York",
        }),
        expect.objectContaining({
          id: second.id,
          displayCurrencyCode: "EUR",
          timeZone: "Europe/Rome",
        }),
      ])
    );
  });

  it("persists an eligible active selection and rejects foreign settings", async () => {
    await prisma.userProfile.createMany({
      data: [{ id: "first-user" }, { id: "second-user" }],
    });
    const first = await createInitialPostalEntitySetting(
      "first-user",
      firstSettingInput
    );
    const second = await createInitialPostalEntitySetting("first-user", {
      ...firstSettingInput,
      postalEntityName: "Vatican Post",
      normalizedPostalEntityName: "vatican post",
    });
    const foreign = await createInitialPostalEntitySetting(
      "second-user",
      firstSettingInput
    );

    await activatePostalEntitySetting("first-user", second.id);
    await expect(requireActivePostalEntitySetting("first-user")).resolves.toMatchObject({
      id: second.id,
    });
    await expect(
      activatePostalEntitySetting("first-user", foreign.id)
    ).rejects.toBeInstanceOf(PostalEntitySettingNotFoundError);
    await expect(
      addExistingPostalEntitySetting(
        "first-user",
        foreign.postalEntityId,
        firstSettingInput
      )
    ).rejects.toBeInstanceOf(PostalEntityUnavailableError);
    await expect(requireActivePostalEntitySetting("first-user")).resolves.toMatchObject({
      id: second.id,
    });
    expect(first.id).not.toBe(second.id);
  });

  it("derives the local date from the saved timezone", () => {
    const instant = new Date("2026-01-01T00:30:00.000Z");

    expect(localDateInTimeZone("America/Los_Angeles", instant)).toBe(
      "2025-12-31"
    );
    expect(localDateInTimeZone("Asia/Tokyo", instant)).toBe("2026-01-01");
  });
});
