import { prisma } from "@/lib/db";
import {
  createPostalEntitySetting,
  addExistingPostalEntitySetting,
  listAvailablePostalEntities,
  replaceRejectedPostalEntity,
  requireActivePostalEntitySetting,
  PostalEntitySettingRequiredError,
  PostalEntityCountryChangeError,
} from "@/lib/postalEntitySettings";
import {
  approvePostalEntity,
  mergePostalEntity,
  rejectPostalEntity,
} from "@/lib/postalEntityModeration";
import { getModerationProposalDetail, listModerationProposals } from "@/lib/moderationProposals";

const baseSubmission = {
  postalEntityName: "UN-NY",
  normalizedPostalEntityName: "un-ny",
  countryCode: "US",
  issuingAuthority: "United Nations Postal Administration",
  scope: "UN Headquarters in New York",
  sourceUrl: "https://unstamps.org/",
  sourceNote: null,
  displayCurrencyCode: "USD",
  timeZone: "America/New_York",
  timeZoneMode: "CUSTOM" as const,
};

async function createUser(id: string, role: "USER" | "MODERATOR" = "USER") {
  return prisma.userProfile.create({ data: { id, role } });
}

describe("postal entity moderation", () => {
  beforeEach(async () => {
    await prisma.stampInventoryEntry.deleteMany();
    await prisma.namedFaceValueValueProposal.deleteMany();
    await prisma.namedFaceValueDefinitionProposal.deleteMany();
    await prisma.namedFaceValue.deleteMany();
    await prisma.valueScheduleValue.deleteMany();
    await prisma.valueSchedule.deleteMany();
    await prisma.currency.deleteMany();
    await prisma.userProfile.updateMany({ data: { activePostalEntitySettingId: null } });
    await prisma.userPostalEntitySetting.deleteMany();
    await prisma.postalEntity.updateMany({ data: { mergedIntoId: null } });
    await prisma.postalEntity.deleteMany();
    await prisma.userProfile.deleteMany();
  });

  it("keeps a submission private until corrected approval and preserves its submitted payload", async () => {
    await Promise.all([createUser("proposer"), createUser("other"), createUser("moderator", "MODERATOR")]);
    const setting = await createPostalEntitySetting("proposer", baseSubmission);

    await expect(listAvailablePostalEntities("proposer")).resolves.toEqual([
      expect.objectContaining({ id: setting.postalEntityId, status: "PENDING" }),
    ]);
    await expect(listAvailablePostalEntities("other")).resolves.toEqual([]);

    await approvePostalEntity(
      setting.postalEntityId,
      "moderator",
      "Verified against the issuing authority.",
      {
        postalEntityName: "United Nations Postal Administration, New York",
        countryCode: "US",
        issuingAuthority: "United Nations Postal Administration",
        scope: "United Nations Headquarters, New York",
        sourceUrl: "https://unstamps.org/",
        sourceNote: "Official issuing-authority site.",
      },
    );

    await expect(listAvailablePostalEntities("other")).resolves.toEqual([
      expect.objectContaining({
        id: setting.postalEntityId,
        name: "United Nations Postal Administration, New York",
        status: "APPROVED",
      }),
    ]);
    await expect(
      addExistingPostalEntitySetting("other", setting.postalEntityId, {
        displayCurrencyCode: "USD",
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
      }),
    ).resolves.toMatchObject({
      userId: "other",
      postalEntityId: setting.postalEntityId,
    });
    await expect(prisma.postalEntity.findUniqueOrThrow({ where: { id: setting.postalEntityId } })).resolves.toMatchObject({
      submittedName: "UN-NY",
      submittedCountryCode: "US",
      submittedScope: "UN Headquarters in New York",
      name: "United Nations Postal Administration, New York",
      decisionNote: "Verified against the issuing authority.",
    });
  });

  it("keeps UN offices separate in their ISO countries and exposes them in the moderation queue", async () => {
    await Promise.all([createUser("proposer"), createUser("moderator", "MODERATOR")]);
    const inputs = [
      baseSubmission,
      { ...baseSubmission, postalEntityName: "UN-GE", normalizedPostalEntityName: "un-ge", countryCode: "CH", scope: "UN Office at Geneva", timeZone: "Europe/Zurich" },
      { ...baseSubmission, postalEntityName: "UN-VI", normalizedPostalEntityName: "un-vi", countryCode: "AT", scope: "UN Office at Vienna", timeZone: "Europe/Vienna" },
    ];
    for (const input of inputs) await createPostalEntitySetting("proposer", input);

    const queue = await listModerationProposals({ proposalType: "POSTAL_ENTITY", status: "PENDING" });
    expect(queue.map(({ summary }) => summary).sort()).toEqual([
      "UN-GE (CH)",
      "UN-NY (US)",
      "UN-VI (AT)",
    ]);
    const detail = await getModerationProposalDetail("POSTAL_ENTITY", queue[0].id);
    expect(detail).toMatchObject({
      proposalType: "POSTAL_ENTITY",
      proposedValues: expect.objectContaining({ issuingAuthority: "United Nations Postal Administration" }),
    });
  });

  it("merges a duplicate and repoints only the proposer's settings and stamps", async () => {
    await Promise.all([createUser("proposer"), createUser("moderator", "MODERATOR")]);
    const target = await prisma.postalEntity.create({
      data: {
        name: "United States Postal Service",
        normalizedName: "united states postal service",
        countryCode: "US",
        status: "APPROVED",
      },
    });
    const sourceSetting = await createPostalEntitySetting("proposer", {
      ...baseSubmission,
      postalEntityName: "USPS",
      normalizedPostalEntityName: "usps",
      countryCode: "CA",
    });
    const existingTargetSetting = await addExistingPostalEntitySetting(
      "proposer",
      target.id,
      {
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "CUSTOM",
      },
    );
    const stamp = await prisma.stampInventoryEntry.create({
      data: {
        userId: "proposer",
        countryCode: "CA",
        postalEntityId: sourceSetting.postalEntityId,
        name: "Forever stamp",
        faceAmount: "1",
        faceCurrencyCode: "USD",
        quantityOwned: 2,
      },
    });

    await mergePostalEntity(sourceSetting.postalEntityId, target.id, "moderator", "Duplicate of USPS.");

    await expect(prisma.stampInventoryEntry.findUniqueOrThrow({ where: { id: stamp.id } })).resolves.toMatchObject({
      postalEntityId: target.id,
      countryCode: "US",
      faceAmount: "1",
      faceCurrencyCode: "USD",
      quantityOwned: 2,
    });
    await expect(prisma.userPostalEntitySetting.findUniqueOrThrow({ where: { id: sourceSetting.id } })).resolves.toMatchObject({
      postalEntityId: target.id,
      displayCurrencyCode: "USD",
      timeZone: "America/New_York",
    });
    await expect(prisma.userPostalEntitySetting.findUnique({ where: { id: existingTargetSetting.id } })).resolves.toBeNull();
    await expect(prisma.postalEntity.findUniqueOrThrow({ where: { id: sourceSetting.postalEntityId } })).resolves.toMatchObject({ status: "MERGED", mergedIntoId: target.id });
  });

  it("rejects resolution until every existing private reference is replaced", async () => {
    await Promise.all([createUser("proposer"), createUser("moderator", "MODERATOR")]);
    const setting = await createPostalEntitySetting("proposer", baseSubmission);
    const stamp = await prisma.stampInventoryEntry.create({
      data: {
        userId: "proposer",
        countryCode: "US",
        postalEntityId: setting.postalEntityId,
        name: "UN stamp",
        faceAmount: "1",
        faceCurrencyCode: "USD",
        quantityOwned: 1,
      },
    });
    await rejectPostalEntity(setting.postalEntityId, "moderator", "Source does not support the submission.");

    await expect(requireActivePostalEntitySetting("proposer")).rejects.toBeInstanceOf(PostalEntitySettingRequiredError);
    const replacement = await replaceRejectedPostalEntity("proposer", setting.id, {
      submission: {
        postalEntityName: "UNPA New York",
        normalizedPostalEntityName: "unpa new york",
        countryCode: "US",
        issuingAuthority: "United Nations Postal Administration",
        scope: "United Nations Headquarters, New York",
        sourceUrl: "https://unstamps.org/",
        sourceNote: null,
      },
    });
    expect(replacement.postalEntity.status).toBe("PENDING");
    await expect(requireActivePostalEntitySetting("proposer")).resolves.toMatchObject({ id: setting.id });
    await expect(prisma.stampInventoryEntry.findUniqueOrThrow({ where: { id: stamp.id } })).resolves.toMatchObject({ postalEntityId: replacement.postalEntityId, countryCode: "US" });
  });

  it("blocks country changes while linked stamps retain country-bound named references", async () => {
    await Promise.all([createUser("proposer"), createUser("moderator", "MODERATOR")]);
    await prisma.currency.create({ data: { code: "CAD", displayName: "Canadian Dollar" } });
    const schedule = await prisma.valueSchedule.create({
      data: { countryCode: "CA", currencyCode: "CAD" },
    });
    const approvedNamed = await prisma.namedFaceValue.create({
      data: {
        countryCode: "CA",
        displayCode: "P",
        normalizedCode: "p",
        valueScheduleId: schedule.id,
      },
    });
    const pendingNamed = await prisma.namedFaceValueDefinitionProposal.create({
      data: {
        submittedById: "proposer",
        countryCode: "CA",
        displayCode: "Oversize",
        normalizedCode: "oversize",
        currencyCode: "CAD",
        sourceNote: "Postal bulletin",
      },
    });
    const setting = await createPostalEntitySetting("proposer", {
      ...baseSubmission,
      countryCode: "CA",
    });
    await prisma.stampInventoryEntry.createMany({
      data: [
        {
          userId: "proposer",
          countryCode: "CA",
          postalEntityId: setting.postalEntityId,
          name: "Approved named stamp",
          faceValueType: "NAMED",
          namedFaceValueId: approvedNamed.id,
          quantityOwned: 1,
        },
        {
          userId: "proposer",
          countryCode: "CA",
          postalEntityId: setting.postalEntityId,
          name: "Pending named stamp",
          faceValueType: "NAMED",
          namedFaceValueProposalId: pendingNamed.id,
          quantityOwned: 1,
        },
      ],
    });
    const target = await prisma.postalEntity.create({
      data: {
        name: "United States Postal Service",
        normalizedName: "united states postal service",
        countryCode: "US",
        status: "APPROVED",
      },
    });

    await expect(
      approvePostalEntity(
        setting.postalEntityId,
        "moderator",
        "Correct submitted country.",
        { ...baseSubmission, sourceNote: "Verified correction." },
      ),
    ).rejects.toBeInstanceOf(PostalEntityCountryChangeError);
    await expect(
      mergePostalEntity(
        setting.postalEntityId,
        target.id,
        "moderator",
        "Match corrected canonical entity.",
      ),
    ).rejects.toBeInstanceOf(PostalEntityCountryChangeError);
    await expect(prisma.postalEntity.findUniqueOrThrow({ where: { id: setting.postalEntityId } })).resolves.toMatchObject({ status: "PENDING", countryCode: "CA" });

    await rejectPostalEntity(setting.postalEntityId, "moderator", "User must replace named references first.");
    await expect(
      replaceRejectedPostalEntity("proposer", setting.id, { postalEntityId: target.id }),
    ).rejects.toBeInstanceOf(PostalEntityCountryChangeError);
    await expect(prisma.stampInventoryEntry.findMany({
      where: { postalEntityId: setting.postalEntityId },
      orderBy: { name: "asc" },
    })).resolves.toHaveLength(2);
  });
});
