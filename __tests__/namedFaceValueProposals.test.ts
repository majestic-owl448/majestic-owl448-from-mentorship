import { prisma } from "@/lib/db";
import {
  resolveNamedFaceValueById,
  resolveNamedFaceValueProposalById,
  searchNamedFaceValues,
} from "@/lib/namedFaceValue";
import {
  createDefinitionProposal,
  createValueProposal,
  listUserNamedFaceValueProposals,
} from "@/lib/namedFaceValueProposals";
import { validateNamedFaceValueProposal } from "@/lib/namedFaceValueProposalValidation";
import { localDateInTimeZone } from "@/lib/postalEntitySettings";
import {
  createStamp,
  presentStamp,
  StampNamedFaceValueError,
} from "@/lib/stampInventory";

const source = { sourceUrl: "https://example.com/rates", sourceNote: null };

async function createUser(userId: string) {
  await prisma.userProfile.create({ data: { id: userId } });
  const postalEntity = await prisma.postalEntity.create({
    data: {
      id: `${userId}-post`,
      name: `${userId} Post`,
      normalizedName: `${userId} post`,
      countryCode: "IT",
      submittedById: userId,
    },
  });
  const setting = await prisma.userPostalEntitySetting.create({
    data: {
      userId,
      postalEntityId: postalEntity.id,
      displayCurrencyCode: "EUR",
      timeZone: "Europe/Rome",
      timeZoneMode: "SYSTEM",
    },
  });
  await prisma.userProfile.update({
    where: { id: userId },
    data: { activePostalEntitySettingId: setting.id },
  });
}

async function createApprovedDefinition() {
  return prisma.valueSchedule.create({
    data: {
      id: "italy-zone-one-schedule",
      countryCode: "IT",
      currencyCode: "EUR",
      values: {
        create: [
          { id: "italy-zone-one-current", amount: "1.35" },
          {
            id: "italy-zone-one-future",
            amount: "1.40",
            effectiveOn: "2028-10-01",
          },
        ],
      },
      namedFaceValues: {
        create: {
          id: "italy-zone-one",
          displayCode: "B Zona 1",
          normalizedCode: "b zona 1",
        },
      },
    },
  });
}

describe("named/code proposals", () => {
  beforeEach(async () => {
    await prisma.stampInventoryEntry.deleteMany();
    await prisma.namedFaceValueValueProposal.deleteMany();
    await prisma.namedFaceValueDefinitionProposal.deleteMany();
    await prisma.namedFaceValue.deleteMany();
    await prisma.valueScheduleValue.deleteMany();
    await prisma.valueSchedule.deleteMany();
    await prisma.userPostalEntitySetting.deleteMany();
    await prisma.postalEntity.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.currency.deleteMany();
    await prisma.currency.create({
      data: { code: "EUR", displayName: "Euro" },
    });
  });

  it("requires a source and validates definition and value fields", () => {
    expect(
      validateNamedFaceValueProposal({
        proposalType: "DEFINITION",
        countryCode: "IT",
        displayCode: "B Zona 2",
        normalizedCode: "B ZONA 2",
        currencyCode: "EUR",
      }),
    ).toEqual({ errors: { sourceNote: "Enter a source URL or source note." } });

    expect(
      validateNamedFaceValueProposal({
        proposalType: "VALUE",
        targetNamedFaceValueId: "italy-zone-one",
        amount: "1.50",
        effectiveOn: "2028-02-30",
        sourceNote: "Published tariff",
      }),
    ).toEqual({ errors: { effectiveOn: "Enter a valid effective date." } });
  });

  it("keeps submitted definition data unchanged when approved data changes", async () => {
    await createUser("first-user");
    await createApprovedDefinition();
    const proposal = await createDefinitionProposal("first-user", {
      proposalType: "DEFINITION",
      targetNamedFaceValueId: "italy-zone-one",
      countryCode: "IT",
      displayCode: "B Zona Uno",
      normalizedCode: "b zona uno",
      currencyCode: "EUR",
      ...source,
    });
    await prisma.namedFaceValue.update({
      where: { id: "italy-zone-one" },
      data: { displayCode: "Approved edit" },
    });

    expect(
      await prisma.namedFaceValueDefinitionProposal.findUnique({
        where: { id: proposal.id },
        select: { displayCode: true, normalizedCode: true, status: true },
      }),
    ).toEqual({
      displayCode: "B Zona Uno",
      normalizedCode: "b zona uno",
      status: "PENDING",
    });
  });

  it("shows a pending definition only in its proposer's search and status list", async () => {
    await createUser("first-user");
    await createUser("second-user");
    const proposal = await createDefinitionProposal("first-user", {
      proposalType: "DEFINITION",
      targetNamedFaceValueId: null,
      countryCode: "IT",
      displayCode: "B Zona 2",
      normalizedCode: "b zona 2",
      currencyCode: "EUR",
      ...source,
    });

    expect(await searchNamedFaceValues("IT", "zona 2", "first-user"))
      .toEqual([
        {
          id: proposal.id,
          countryCode: "IT",
          displayCode: "B Zona 2",
          namedFaceValueProposalId: proposal.id,
          proposalStatus: "PENDING",
        },
      ]);
    expect(await searchNamedFaceValues("IT", "zona 2", "second-user"))
      .toEqual([]);
    expect(await listUserNamedFaceValueProposals("first-user"))
      .toMatchObject({
        definitions: [{ id: proposal.id, status: "PENDING" }],
        values: [],
      });
  });

  it("keeps a pending match when twenty approved definitions also match", async () => {
    await createUser("first-user");
    await prisma.valueSchedule.create({
      data: {
        id: "approved-matches-schedule",
        countryCode: "IT",
        currencyCode: "EUR",
        namedFaceValues: {
          create: Array.from({ length: 20 }, (_, index) => ({
            id: `approved-match-${index}`,
            displayCode: `Approved Match ${index}`,
            normalizedCode: `approved match ${index}`,
          })),
        },
      },
    });
    const pending = await createDefinitionProposal("first-user", {
      proposalType: "DEFINITION",
      targetNamedFaceValueId: null,
      countryCode: "IT",
      displayCode: "Pending Match",
      normalizedCode: "pending match",
      currencyCode: "EUR",
      ...source,
    });

    const results = await searchNamedFaceValues("IT", "match", "first-user");
    expect(results).toHaveLength(21);
    expect(results).toContainEqual({
      id: pending.id,
      countryCode: "IT",
      displayCode: "Pending Match",
      namedFaceValueProposalId: pending.id,
      proposalStatus: "PENDING",
    });
  });

  it("lets only the proposer reference a pending definition in inventory", async () => {
    await createUser("first-user");
    await createUser("second-user");
    const proposal = await createDefinitionProposal("first-user", {
      proposalType: "DEFINITION",
      targetNamedFaceValueId: null,
      countryCode: "IT",
      displayCode: "B Zona 2",
      normalizedCode: "b zona 2",
      currencyCode: "EUR",
      ...source,
    });
    await createValueProposal(
      "first-user",
      {
        proposalType: "VALUE",
        targetNamedFaceValueId: null,
        definitionProposalId: proposal.id,
        amount: "2.10",
        effectiveOn: null,
        ...source,
      },
      localDateInTimeZone("Europe/Rome"),
    );
    const input = {
      countryCode: "IT",
      postalEntityId: "first-user-post",
      name: "Pending definition stamp",
      yearOfIssue: null,
      faceValueType: "NAMED" as const,
      faceAmount: null,
      faceCurrencyCode: null,
      namedFaceValueId: null,
      namedFaceValueProposalId: proposal.id,
      manualPostageAmount: "0",
      manualPostageCurrencyCode: "EUR",
      quantityOwned: 1,
      quantityAnnulled: 0,
      expired: false,
    };

    const stamp = await createStamp("first-user", input);
    expect(stamp.namedFaceValueProposalId).toBe(proposal.id);
    expect(
      await presentStamp(stamp, {
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        postalEntity: { countryCode: "IT" },
      }),
    ).toMatchObject({
      namedFaceValue: {
        displayCode: "B Zona 2",
        proposalStatus: "PENDING",
      },
      unitPostageValue: {
        amount: "2.1",
        currencyCode: "EUR",
        source: "NAMED_SCHEDULE",
      },
    });
    await expect(
      createStamp("second-user", {
        ...input,
        postalEntityId: "second-user-post",
      }),
    ).rejects.toBeInstanceOf(StampNamedFaceValueError);
  });

  it("applies a pending current correction only for its proposer", async () => {
    await createUser("first-user");
    await createUser("second-user");
    await createApprovedDefinition();
    await prisma.valueScheduleValue.create({
      data: {
        id: "italy-zone-one-later",
        valueScheduleId: "italy-zone-one-schedule",
        amount: "1.60",
        effectiveOn: "2028-12-01",
      },
    });
    await createValueProposal(
      "first-user",
      {
        proposalType: "VALUE",
        targetNamedFaceValueId: "italy-zone-one",
        definitionProposalId: null,
        amount: "1.50",
        effectiveOn: null,
        ...source,
      },
      "2028-10-05",
    );

    const proposer = await resolveNamedFaceValueById(
      "italy-zone-one",
      "IT",
      "2028-10-06",
      "first-user",
    );
    const otherUser = await resolveNamedFaceValueById(
      "italy-zone-one",
      "IT",
      "2028-10-06",
      "second-user",
    );
    expect(proposer.status === "RESOLVED" && proposer.amount.toFixed()).toBe(
      "1.5",
    );
    expect(otherUser.status === "RESOLVED" && otherUser.amount.toFixed()).toBe(
      "1.4",
    );
    const afterLaterSchedule = await resolveNamedFaceValueById(
      "italy-zone-one",
      "IT",
      "2028-12-01",
      "first-user",
    );
    expect(
      afterLaterSchedule.status === "RESOLVED" &&
        afterLaterSchedule.amount.toFixed(),
    ).toBe("1.6");
  });

  it("keeps a future pending value inactive and exposes it in the ten-day notice window", async () => {
    await createUser("first-user");
    await createApprovedDefinition();
    await createValueProposal(
      "first-user",
      {
        proposalType: "VALUE",
        targetNamedFaceValueId: "italy-zone-one",
        definitionProposalId: null,
        amount: "1.55",
        effectiveOn: "2028-09-11",
        ...source,
      },
      "2028-08-01",
    );

    const elevenDaysBefore = await resolveNamedFaceValueById(
      "italy-zone-one",
      "IT",
      "2028-08-31",
      "first-user",
    );
    const tenDaysBefore = await resolveNamedFaceValueById(
      "italy-zone-one",
      "IT",
      "2028-09-01",
      "first-user",
    );
    const effective = await resolveNamedFaceValueById(
      "italy-zone-one",
      "IT",
      "2028-09-11",
      "first-user",
    );

    expect(
      elevenDaysBefore.status === "RESOLVED" && elevenDaysBefore.upcoming,
    ).toBeNull();
    expect(
      tenDaysBefore.status === "RESOLVED" && {
        amount: tenDaysBefore.amount.toFixed(),
        upcoming: tenDaysBefore.upcoming?.amount.toFixed(),
      },
    ).toEqual({ amount: "1.35", upcoming: "1.55" });
    expect(
      effective.status === "RESOLVED" && effective.amount.toFixed(),
    ).toBe("1.55");
  });

  it("resolves a value submitted for the proposer's pending definition", async () => {
    await createUser("first-user");
    const definition = await createDefinitionProposal("first-user", {
      proposalType: "DEFINITION",
      targetNamedFaceValueId: null,
      countryCode: "IT",
      displayCode: "B Zona 2",
      normalizedCode: "b zona 2",
      currencyCode: "EUR",
      ...source,
    });
    await createValueProposal(
      "first-user",
      {
        proposalType: "VALUE",
        targetNamedFaceValueId: null,
        definitionProposalId: definition.id,
        amount: "2.10",
        effectiveOn: null,
        ...source,
      },
      "2028-09-01",
    );

    const result = await resolveNamedFaceValueProposalById(
      definition.id,
      "IT",
      "2028-09-01",
      "first-user",
    );
    expect(result.status === "RESOLVED" && result.amount.toFixed()).toBe("2.1");
    expect(
      await resolveNamedFaceValueProposalById(
        definition.id,
        "IT",
        "2028-09-01",
        "second-user",
      ),
    ).toMatchObject({
      status: "UNRESOLVED",
      reason: "MISSING_NAMED_FACE_VALUE",
    });
  });
});
