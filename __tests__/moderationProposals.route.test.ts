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
import { GET as GET_DETAIL } from "@/app/api/moderation/proposals/[proposalType]/[proposalId]/route";

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
});
