import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const auth = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/app/config/backend", () => ({ ensureSuperTokensInit: vi.fn() }));
vi.mock("supertokens-node", () => ({
  default: { getUser: vi.fn(async () => undefined) },
}));
vi.mock("supertokens-node/nextjs", () => ({
  withSession: vi.fn(
    async (
      _request: NextRequest,
      callback: (
        error: undefined,
        session: { getUserId: () => string } | undefined,
      ) => Promise<Response>,
    ) =>
      callback(
        undefined,
        auth.userId === null
          ? undefined
          : { getUserId: () => auth.userId as string },
      ),
  ),
}));

import { GET as GET_QUEUE } from "@/app/api/moderation/proposals/route";
import {
  GET as GET_DETAIL,
  POST as APPROVE,
} from "@/app/api/moderation/proposals/[proposalType]/[proposalId]/route";
import { approveModerationProposal } from "@/lib/moderationApproval";
import { resolveNamedFaceValueById, searchNamedFaceValues } from "@/lib/namedFaceValue";
import { listStamps } from "@/lib/stampInventory";

function queueRequest(query = "") {
  return new NextRequest(`http://localhost/api/moderation/proposals${query}`);
}

function detailRequest(proposalType: string, proposalId: string) {
  return GET_DETAIL(
    new NextRequest(
      `http://localhost/api/moderation/proposals/${proposalType}/${proposalId}`,
    ),
    { params: Promise.resolve({ proposalType, proposalId }) },
  );
}

function approvalRequest(
  proposalType: string,
  proposalId: string,
  decisionNote = "Source checked against the published tariff.",
) {
  return APPROVE(
    new NextRequest(
      `http://localhost/api/moderation/proposals/${proposalType}/${proposalId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionNote }),
      },
    ),
    { params: Promise.resolve({ proposalType, proposalId }) },
  );
}

describe("moderation proposal API", () => {
  beforeEach(async () => {
    auth.userId = null;
    await prisma.stampInventoryEntry.deleteMany();
    await prisma.namedFaceValueValueProposal.deleteMany();
    await prisma.namedFaceValueDefinitionProposal.deleteMany();
    await prisma.currencyConversionProposal.deleteMany();
    await prisma.namedFaceValue.deleteMany();
    await prisma.valueScheduleValue.deleteMany();
    await prisma.valueSchedule.deleteMany();
    await prisma.currencyConversion.deleteMany();
    await prisma.userPostalEntitySetting.deleteMany();
    await prisma.postalEntity.deleteMany();
    await prisma.currency.deleteMany();
    await prisma.userProfile.deleteMany();

    await prisma.userProfile.createMany({
      data: [
        { id: "moderator", email: "moderator@example.com", role: "MODERATOR" },
        { id: "normal-user", email: "normal@example.com" },
        { id: "proposer", email: "proposer@example.com" },
      ],
    });
    await prisma.currency.createMany({
      data: [
        { code: "EUR", displayName: "Euro" },
        { code: "GBP", displayName: "Pound sterling" },
        { code: "USD", displayName: "US Dollar" },
      ],
    });
    await prisma.valueSchedule.create({
      data: {
        id: "italy-b-schedule",
        countryCode: "IT",
        currencyCode: "EUR",
      },
    });
    await prisma.valueScheduleValue.create({
      data: {
        id: "approved-current-value",
        valueScheduleId: "italy-b-schedule",
        amount: "1.25",
        effectiveOn: null,
      },
    });
    await prisma.namedFaceValue.create({
      data: {
        id: "approved-b",
        countryCode: "IT",
        displayCode: "B",
        normalizedCode: "b",
        valueScheduleId: "italy-b-schedule",
      },
    });
    await prisma.currencyConversion.create({
      data: {
        id: "approved-usd-eur",
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.90",
      },
    });
    await prisma.namedFaceValueDefinitionProposal.create({
      data: {
        id: "definition-proposal",
        submittedById: "proposer",
        targetNamedFaceValueId: "approved-b",
        countryCode: "FR",
        displayCode: "Lettre verte",
        normalizedCode: "lettre verte",
        currencyCode: "EUR",
        sourceNote: "Official tariff PDF, page 3",
      },
    });
    await prisma.namedFaceValueValueProposal.create({
      data: {
        id: "value-proposal",
        submittedById: "proposer",
        definitionProposalId: "definition-proposal",
        amount: "1.25",
        effectiveOn: null,
        eligibleOn: "2026-08-28",
        sourceUrl: "https://example.com/tariff",
      },
    });
    await prisma.currencyConversionProposal.create({
      data: {
        id: "conversion-proposal",
        submittedById: "proposer",
        targetCurrencyConversionId: "approved-usd-eur",
        fromCurrencyCode: "GBP",
        toCurrencyCode: "EUR",
        multiplier: "0.91",
        sourceNote: "Central bank bulletin",
      },
    });

    const postalEntity = await prisma.postalEntity.create({
      data: {
        id: "private-postal-entity",
        name: "Private Post",
        normalizedName: "private post",
        countryCode: "IT",
        submittedById: "proposer",
      },
    });
    await prisma.stampInventoryEntry.create({
      data: {
        id: "private-inventory-entry",
        userId: "proposer",
        countryCode: "IT",
        postalEntityId: postalEntity.id,
        name: "Private stamp name",
        faceValueType: "NAMED",
        namedFaceValueId: "approved-b",
        quantityOwned: 7,
      },
    });
  });

  it("requires a moderator session for queue and detail endpoints", async () => {
    expect((await GET_QUEUE(queueRequest())).status).toBe(401);

    auth.userId = "normal-user";
    const queueResponse = await GET_QUEUE(queueRequest());
    const detailResponse = await detailRequest(
      "NAMED_DEFINITION",
      "definition-proposal",
    );

    expect(queueResponse.status).toBe(403);
    expect(await queueResponse.json()).toEqual({
      error: "Moderator access required",
    });
    expect(detailResponse.status).toBe(403);
    expect(
      (await approvalRequest("FIXED_CONVERSION", "conversion-proposal")).status,
    ).toBe(403);
  });

  it("lists all proposal kinds and filters by type and status", async () => {
    auth.userId = "moderator";

    const allResponse = await GET_QUEUE(queueRequest());
    expect(allResponse.status).toBe(200);
    expect((await allResponse.json()).proposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ proposalType: "NAMED_DEFINITION" }),
        expect.objectContaining({ proposalType: "NAMED_VALUE" }),
        expect.objectContaining({ proposalType: "FIXED_CONVERSION" }),
      ]),
    );

    const typeResponse = await GET_QUEUE(
      queueRequest("?type=FIXED_CONVERSION&status=PENDING"),
    );
    expect((await typeResponse.json()).proposals).toEqual([
      expect.objectContaining({
        id: "conversion-proposal",
        proposalType: "FIXED_CONVERSION",
        status: "PENDING",
      }),
    ]);

    await prisma.namedFaceValueDefinitionProposal.update({
      where: { id: "definition-proposal" },
      data: { status: "REJECTED" },
    });
    const statusResponse = await GET_QUEUE(queueRequest("?status=REJECTED"));
    expect((await statusResponse.json()).proposals).toEqual([
      expect.objectContaining({ id: "definition-proposal", status: "REJECTED" }),
    ]);
  });

  it("returns submitted details, proposer, source, and approved matches without inventory", async () => {
    auth.userId = "moderator";

    const definitionResponse = await detailRequest(
      "NAMED_DEFINITION",
      "definition-proposal",
    );
    expect(definitionResponse.status).toBe(200);
    const definitionBody = await definitionResponse.json();
    expect(definitionBody).toMatchObject({
      proposal: {
        id: "definition-proposal",
        proposalType: "NAMED_DEFINITION",
        proposer: { id: "proposer", email: "proposer@example.com" },
        submittedAt: expect.any(String),
        source: { url: null, note: "Official tariff PDF, page 3" },
        proposedValues: {
          targetNamedFaceValueId: "approved-b",
          countryCode: "FR",
          displayCode: "Lettre verte",
          normalizedCode: "lettre verte",
          currencyCode: "EUR",
        },
        possibleMatches: [
          expect.objectContaining({ id: "approved-b", currencyCode: "EUR" }),
        ],
      },
    });
    expect(JSON.stringify(definitionBody)).not.toContain("private-inventory-entry");
    expect(JSON.stringify(definitionBody)).not.toContain("Private stamp name");
    expect(JSON.stringify(definitionBody)).not.toContain("quantityOwned");

    const valueBody = await (
      await detailRequest("NAMED_VALUE", "value-proposal")
    ).json();
    expect(valueBody.proposal.possibleMatches).toEqual([
      expect.objectContaining({ id: "approved-current-value", amount: "1.25" }),
    ]);

    const conversionBody = await (
      await detailRequest("FIXED_CONVERSION", "conversion-proposal")
    ).json();
    expect(conversionBody.proposal).toMatchObject({
      proposedValues: {
        targetCurrencyConversionId: "approved-usd-eur",
        fromCurrencyCode: "GBP",
        toCurrencyCode: "EUR",
        multiplier: "0.91",
      },
      possibleMatches: [
        {
          id: "approved-usd-eur",
          fromCurrencyCode: "USD",
          toCurrencyCode: "EUR",
          multiplier: "0.90",
        },
      ],
    });
  });

  it("rejects invalid filters and unknown proposal details", async () => {
    auth.userId = "moderator";
    expect((await GET_QUEUE(queueRequest("?type=INVENTORY"))).status).toBe(400);
    expect((await detailRequest("INVENTORY", "private-inventory-entry")).status).toBe(404);
    expect((await detailRequest("NAMED_VALUE", "missing")).status).toBe(404);
  });

  it("approves a definition for all users and preserves a linked stamp reference", async () => {
    const proposal = await prisma.namedFaceValueDefinitionProposal.create({
      data: {
        id: "new-definition",
        submittedById: "proposer",
        countryCode: "IT",
        displayCode: "B Zona 2",
        normalizedCode: "b zona 2",
        currencyCode: "EUR",
        sourceNote: "Published tariff table",
      },
    });
    await prisma.namedFaceValueValueProposal.create({
      data: {
        id: "new-definition-current-value",
        submittedById: "proposer",
        definitionProposalId: proposal.id,
        amount: "2.10",
        effectiveOn: null,
        eligibleOn: "2026-08-28",
        sourceNote: "Published tariff table",
      },
    });
    await prisma.stampInventoryEntry.create({
      data: {
        id: "proposal-linked-stamp",
        userId: "proposer",
        countryCode: "IT",
        postalEntityId: "private-postal-entity",
        name: "B Zona 2 stamp",
        faceValueType: "NAMED",
        namedFaceValueProposalId: proposal.id,
        quantityOwned: 2,
      },
    });
    const linkedStampBefore = await prisma.stampInventoryEntry.findUniqueOrThrow({
      where: { id: "proposal-linked-stamp" },
      select: {
        namedFaceValueId: true,
        namedFaceValueProposalId: true,
        updatedAt: true,
      },
    });
    auth.userId = "moderator";

    const response = await approvalRequest("NAMED_DEFINITION", proposal.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.proposal).toMatchObject({
      status: "APPROVED",
      decision: {
        moderator: { id: "moderator" },
        note: "Source checked against the published tariff.",
      },
    });
    expect(body.proposal.decision.decidedAt).toEqual(expect.any(String));
    const approved = await prisma.namedFaceValue.findUniqueOrThrow({
      where: {
        countryCode_normalizedCode: {
          countryCode: "IT",
          normalizedCode: "b zona 2",
        },
      },
    });
    expect(await searchNamedFaceValues("IT", "zona 2", "normal-user")).toEqual([
      expect.objectContaining({ id: approved.id, displayCode: "B Zona 2" }),
    ]);
    expect(
      await prisma.stampInventoryEntry.findUniqueOrThrow({
        where: { id: "proposal-linked-stamp" },
        select: {
          namedFaceValueId: true,
          namedFaceValueProposalId: true,
          updatedAt: true,
        },
      }),
    ).toEqual(linkedStampBefore);
    const proposerInventory = await listStamps("proposer", {
      displayCurrencyCode: "EUR",
      timeZone: "Europe/Rome",
      postalEntity: { countryCode: "IT" },
    });
    expect(
      proposerInventory.find(({ id }) => id === "proposal-linked-stamp"),
    ).toMatchObject({
      namedFaceValueId: null,
      namedFaceValueProposalId: proposal.id,
      unitPostageValue: { amount: "2.1", source: "NAMED_SCHEDULE" },
      totalPostageValue: { amount: "4.2" },
    });

    expect(
      (
        await approvalRequest(
          "NAMED_VALUE",
          "new-definition-current-value",
        )
      ).status,
    ).toBe(200);
    const otherUserResolution = await resolveNamedFaceValueById(
      approved.id,
      "IT",
      "2026-08-28",
      "normal-user",
    );
    expect(
      otherUserResolution.status === "RESOLVED" &&
        otherUserResolution.amount.toFixed(),
    ).toBe("2.1");
  });

  it("updates the intended named definition without creating a duplicate", async () => {
    const stampBefore = await prisma.stampInventoryEntry.findUniqueOrThrow({
      where: { id: "private-inventory-entry" },
      select: { namedFaceValueId: true, updatedAt: true },
    });
    const proposal = await prisma.namedFaceValueDefinitionProposal.create({
      data: {
        id: "definition-correction",
        submittedById: "proposer",
        targetNamedFaceValueId: "approved-b",
        countryCode: "IT",
        displayCode: "B prioritario",
        normalizedCode: "b prioritario",
        currencyCode: "EUR",
        sourceNote: "Published naming correction",
      },
    });
    auth.userId = "moderator";

    expect(
      (await approvalRequest("NAMED_DEFINITION", proposal.id)).status,
    ).toBe(200);

    expect(await prisma.namedFaceValue.count()).toBe(1);
    expect(
      await prisma.namedFaceValue.findUniqueOrThrow({
        where: { id: "approved-b" },
      }),
    ).toMatchObject({
      countryCode: "IT",
      displayCode: "B prioritario",
      normalizedCode: "b prioritario",
      valueScheduleId: "italy-b-schedule",
    });
    expect(
      await prisma.stampInventoryEntry.findUniqueOrThrow({
        where: { id: "private-inventory-entry" },
        select: { namedFaceValueId: true, updatedAt: true },
      }),
    ).toEqual(stampBefore);
  });

  it("updates one current schedule value and recalculates another user's inventory", async () => {
    await prisma.stampInventoryEntry.create({
      data: {
        id: "other-user-named-stamp",
        userId: "normal-user",
        countryCode: "IT",
        postalEntityId: "private-postal-entity",
        name: "B stamp",
        faceValueType: "NAMED",
        namedFaceValueId: "approved-b",
        quantityOwned: 2,
      },
    });
    const proposal = await prisma.namedFaceValueValueProposal.create({
      data: {
        id: "current-value-correction",
        submittedById: "proposer",
        namedFaceValueId: "approved-b",
        amount: "1.50",
        effectiveOn: null,
        eligibleOn: "2026-08-28",
        sourceNote: "Published tariff table",
      },
    });
    const activeCountry = {
      displayCurrencyCode: "EUR",
      timeZone: "Europe/Rome",
      postalEntity: { countryCode: "IT" },
    };
    expect((await listStamps("normal-user", activeCountry))[0]).toMatchObject({
      unitPostageValue: { amount: "1.25" },
      totalPostageValue: { amount: "2.5" },
    });
    auth.userId = "moderator";

    expect(
      (await approvalRequest("NAMED_VALUE", proposal.id)).status,
    ).toBe(200);

    expect((await listStamps("normal-user", activeCountry))[0]).toMatchObject({
      unitPostageValue: { amount: "1.5" },
      totalPostageValue: { amount: "3" },
    });
    expect(
      await prisma.valueScheduleValue.count({
        where: { valueScheduleId: "italy-b-schedule", effectiveOn: null },
      }),
    ).toBe(1);
    expect(
      (await approvalRequest("NAMED_VALUE", proposal.id)).status,
    ).toBe(409);
    expect(
      await prisma.valueScheduleValue.count({
        where: { valueScheduleId: "italy-b-schedule", effectiveOn: null },
      }),
    ).toBe(1);
  });

  it("stores a future approved value without activating it before its local date", async () => {
    const proposal = await prisma.namedFaceValueValueProposal.create({
      data: {
        id: "future-value",
        submittedById: "proposer",
        namedFaceValueId: "approved-b",
        amount: "1.75",
        effectiveOn: "2028-10-01",
        eligibleOn: "2028-10-01",
        sourceNote: "Published future tariff",
      },
    });
    auth.userId = "moderator";

    expect(
      (await approvalRequest("NAMED_VALUE", proposal.id)).status,
    ).toBe(200);

    expect(
      await resolveNamedFaceValueById(
        "approved-b",
        "IT",
        "2028-09-30",
        "normal-user",
      ),
    ).toMatchObject({
      status: "RESOLVED",
      amount: expect.objectContaining({}),
      effectiveOn: null,
      nextChange: { effectiveOn: "2028-10-01" },
    });
    const before = await resolveNamedFaceValueById(
      "approved-b",
      "IT",
      "2028-09-30",
      "normal-user",
    );
    const onDate = await resolveNamedFaceValueById(
      "approved-b",
      "IT",
      "2028-10-01",
      "normal-user",
    );
    expect(before.status === "RESOLVED" && before.amount.toFixed()).toBe("1.25");
    expect(onDate.status === "RESOLVED" && onDate.amount.toFixed()).toBe("1.75");
  });

  it("updates one conversion record and rejects a second approval", async () => {
    const proposal = await prisma.currencyConversionProposal.create({
      data: {
        id: "conversion-correction",
        submittedById: "proposer",
        targetCurrencyConversionId: "approved-usd-eur",
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.95",
        sourceNote: "Published fixed rate",
      },
    });
    auth.userId = "moderator";

    expect(
      (await approvalRequest("FIXED_CONVERSION", proposal.id)).status,
    ).toBe(200);
    expect(
      await prisma.currencyConversion.findMany({
        where: { fromCurrencyCode: "USD", toCurrencyCode: "EUR" },
      }),
    ).toEqual([
      expect.objectContaining({ id: "approved-usd-eur", multiplier: "0.95" }),
    ]);
    expect(
      (await approvalRequest("FIXED_CONVERSION", proposal.id)).status,
    ).toBe(409);
    expect(await prisma.currencyConversion.count()).toBe(1);
  });

  it("rolls back proposal status when the shared-data write fails", async () => {
    await prisma.currencyConversionProposal.create({
      data: {
        id: "duplicate-conversion",
        submittedById: "proposer",
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.95",
        sourceNote: "Published fixed rate",
      },
    });

    await expect(
      approveModerationProposal(
        "FIXED_CONVERSION",
        "duplicate-conversion",
        "moderator",
        "Source checked.",
      ),
    ).rejects.toThrow();
    expect(
      await prisma.currencyConversionProposal.findUniqueOrThrow({
        where: { id: "duplicate-conversion" },
        select: {
          status: true,
          moderatedById: true,
          decidedAt: true,
          decisionNote: true,
        },
      }),
    ).toEqual({
      status: "PENDING",
      moderatedById: null,
      decidedAt: null,
      decisionNote: null,
    });
  });
});
