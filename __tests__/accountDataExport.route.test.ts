import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const auth = vi.hoisted(() => ({
  userId: null as string | null,
  account: undefined as unknown,
}));

vi.mock("@/app/config/backend", () => ({ ensureSuperTokensInit: vi.fn() }));
vi.mock("supertokens-node", () => ({
  default: { getUser: vi.fn(async () => auth.account) },
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

import { GET } from "@/app/api/account/export/route";

async function clearDatabase() {
  await prisma.stampProposalAction.deleteMany();
  await prisma.stampInventoryEntry.deleteMany();
  await prisma.namedFaceValueValueProposal.deleteMany();
  await prisma.namedFaceValueDefinitionProposal.deleteMany();
  await prisma.namedFaceValue.deleteMany();
  await prisma.valueScheduleValue.deleteMany();
  await prisma.valueSchedule.deleteMany();
  await prisma.currencyConversionProposal.deleteMany();
  await prisma.currencyConversion.deleteMany();
  await prisma.userPostalEntitySetting.deleteMany();
  await prisma.postalEntity.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.currency.deleteMany();
}

function request(path = "/api/account/export") {
  return new NextRequest(`http://localhost${path}`);
}

describe("GET /api/account/export", () => {
  beforeEach(async () => {
    auth.userId = null;
    auth.account = undefined;
    await clearDatabase();
  });

  it("requires a session and prevents cross-account export requests", async () => {
    const unauthenticated = await GET(request());
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("Cache-Control")).toContain("no-store");

    auth.userId = "export-user";
    const crossAccount = await GET(request("/api/account/export?userId=other-user"));
    expect(crossAccount.status).toBe(404);
    expect(await prisma.userProfile.count()).toBe(0);
  });

  it("downloads complete linked data without secrets or another user's private data", async () => {
    auth.userId = "export-user";
    auth.account = {
      id: "export-user",
      timeJoined: Date.UTC(2024, 0, 2),
      isPrimaryUser: true,
      tenantIds: ["public"],
      emails: ["export@example.com"],
      phoneNumbers: [],
      thirdParty: [{ id: "github", userId: "external-export-user" }],
      webauthn: { credentialIds: ["secret-credential"] },
      loginMethods: [
        {
          recipeId: "emailpassword",
          recipeUserId: "secret-recipe-user-id",
          tenantIds: ["public"],
          email: "export@example.com",
          verified: true,
          timeJoined: Date.UTC(2024, 0, 2),
        },
      ],
      toJson: () => ({ accessToken: "secret-token" }),
    };

    await prisma.currency.createMany({
      data: [
        { code: "EUR", displayName: "Euro" },
        { code: "ITL", displayName: "Italian lira" },
        { code: "USD", displayName: "US dollar" },
      ],
    });
    await prisma.userProfile.createMany({
      data: [
        { id: "export-user", email: "export@example.com", role: "MODERATOR" },
        { id: "other-user", email: "other-private@example.com" },
      ],
    });
    const postalEntity = await prisma.postalEntity.create({
      data: {
        id: "own-entity",
        name: "Poste Italiane",
        normalizedName: "poste italiane",
        countryCode: "IT",
        issuingAuthority: "Italy",
        scope: "Italy",
        sourceUrl: "https://example.com/postal-source",
        submittedName: "Poste Italiane",
        submittedNormalizedName: "poste italiane",
        submittedCountryCode: "IT",
        submittedIssuingAuthority: "Italy",
        submittedScope: "Italy",
        status: "APPROVED",
        submittedById: "export-user",
        moderatedById: "other-user",
      },
    });
    await prisma.postalEntity.create({
      data: {
        id: "other-private-entity",
        name: "Other private entity",
        normalizedName: "other private entity",
        countryCode: "US",
        submittedName: "Other private entity",
        submittedNormalizedName: "other private entity",
        submittedCountryCode: "US",
        submittedById: "other-user",
      },
    });
    const setting = await prisma.userPostalEntitySetting.create({
      data: {
        id: "own-setting",
        userId: "export-user",
        postalEntityId: postalEntity.id,
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "CUSTOM",
      },
    });
    await prisma.userProfile.update({
      where: { id: "export-user" },
      data: { activePostalEntitySettingId: setting.id },
    });
    await prisma.userPostalEntitySetting.create({
      data: {
        id: "other-setting",
        userId: "other-user",
        postalEntityId: "other-private-entity",
        displayCurrencyCode: "USD",
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
      },
    });
    const schedule = await prisma.valueSchedule.create({
      data: { id: "linked-schedule", countryCode: "IT", currencyCode: "EUR" },
    });
    const scheduleValue = await prisma.valueScheduleValue.create({
      data: {
        id: "linked-schedule-value",
        valueScheduleId: schedule.id,
        amount: "1.2300",
        effectiveOn: "2026-07-01",
      },
    });
    const namedValue = await prisma.namedFaceValue.create({
      data: {
        id: "linked-named-value",
        countryCode: "IT",
        displayCode: "B",
        normalizedCode: "b",
        valueScheduleId: schedule.id,
      },
    });
    const stamp = await prisma.stampInventoryEntry.create({
      data: {
        id: "own-stamp",
        userId: "export-user",
        countryCode: "IT",
        postalEntityId: postalEntity.id,
        name: "Exact decimal stamp",
        faceValueType: "NAMED",
        namedFaceValueId: namedValue.id,
        manualPostageAmount: "0.5000",
        manualPostageCurrencyCode: "EUR",
        quantityOwned: 2,
      },
    });
    await prisma.stampInventoryEntry.create({
      data: {
        id: "own-monetary-stamp",
        userId: "export-user",
        countryCode: "IT",
        postalEntityId: postalEntity.id,
        name: "Converted stamp",
        faceAmount: "2.5000",
        faceCurrencyCode: "USD",
        quantityOwned: 1,
      },
    });
    await prisma.stampInventoryEntry.create({
      data: {
        id: "other-private-stamp",
        userId: "other-user",
        countryCode: "US",
        postalEntityId: "other-private-entity",
        name: "Other private stamp",
        faceAmount: "99.99",
        faceCurrencyCode: "USD",
        quantityOwned: 1,
      },
    });
    const conversion = await prisma.currencyConversion.create({
      data: {
        id: "linked-conversion",
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.000516456899089",
      },
    });
    await prisma.currencyConversion.create({
      data: {
        id: "inventory-linked-conversion",
        fromCurrencyCode: "USD",
        toCurrencyCode: "EUR",
        multiplier: "0.8500",
      },
    });
    for (const [index, status] of ["PENDING", "REJECTED", "APPROVED", "MERGED"].entries()) {
      await prisma.currencyConversionProposal.create({
        data: {
          id: `conversion-${status.toLowerCase()}`,
          submittedById: "export-user",
          targetCurrencyConversionId: conversion.id,
          fromCurrencyCode: "ITL",
          toCurrencyCode: "EUR",
          multiplier: `0.000${index + 1}`,
          sourceNote: `Source ${status}`,
          status: status as "PENDING" | "REJECTED" | "APPROVED" | "MERGED",
          moderatedById: status === "PENDING" ? null : "other-user",
        },
      });
    }
    await prisma.namedFaceValueDefinitionProposal.create({
      data: {
        id: "moderated-definition",
        submittedById: "other-user",
        targetNamedFaceValueId: namedValue.id,
        countryCode: "IT",
        displayCode: "B Post",
        normalizedCode: "b post",
        currencyCode: "EUR",
        sourceUrl: "https://example.com/named-source",
        status: "REJECTED",
        moderatedById: "export-user",
      },
    });
    await prisma.namedFaceValueValueProposal.create({
      data: {
        id: "own-value-proposal",
        submittedById: "export-user",
        namedFaceValueId: namedValue.id,
        mergedValueScheduleValueId: scheduleValue.id,
        amount: "1.2300",
        effectiveOn: "2026-07-01",
        eligibleOn: "2026-06-21",
        sourceNote: "Published tariff",
        status: "MERGED",
      },
    });
    await prisma.stampProposalAction.create({
      data: {
        id: "own-action",
        stampId: stamp.id,
        namedValueProposalId: "own-value-proposal",
        resolution: "REPLACE",
      },
    });

    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="stamp-inventory-export-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");

    const document = await response.json();
    expect(document.schemaVersion).toBe(1);
    expect(new Date(document.generatedAt).toISOString()).toBe(document.generatedAt);
    expect(document.account.superTokens).toMatchObject({
      id: "export-user",
      emails: ["export@example.com"],
      loginMethods: [{ recipeId: "emailpassword", verified: true }],
    });
    expect(document.privateData.postalEntitySettings).toHaveLength(1);
    expect(document.privateData.stampInventory).toEqual([
      expect.objectContaining({
        id: "own-monetary-stamp",
        faceValueType: "MONETARY",
        faceAmount: "2.5000",
      }),
      expect.objectContaining({
        id: "own-stamp",
        faceValueType: "NAMED",
        manualPostageAmount: "0.5000",
      }),
    ]);
    expect(document.privateData.stampProposalActions).toEqual([
      expect.objectContaining({ id: "own-action" }),
    ]);
    expect(document.proposalsAndModeration.currencyConversions.map((item: { status: string }) => item.status).sort()).toEqual([
      "APPROVED",
      "MERGED",
      "PENDING",
      "REJECTED",
    ]);
    expect(document.proposalsAndModeration.namedFaceValueDefinitions).toEqual([
      expect.objectContaining({
        id: "moderated-definition",
        submittedById: null,
        moderatedById: "export-user",
        sourceUrl: "https://example.com/named-source",
        accountLinks: ["MODERATED"],
      }),
    ]);
    expect(document.proposalsAndModeration.namedFaceValueValues).toEqual([
      expect.objectContaining({
        amount: "1.2300",
        effectiveOn: "2026-07-01",
        eligibleOn: "2026-06-21",
      }),
    ]);
    expect(document.linkedSharedData).toMatchObject({
      postalEntities: [expect.objectContaining({ sourceUrl: "https://example.com/postal-source" })],
      namedFaceValues: [expect.objectContaining({ id: "linked-named-value" })],
      valueSchedules: [expect.objectContaining({ id: "linked-schedule" })],
      valueScheduleValues: [
        expect.objectContaining({ amount: "1.2300", effectiveOn: "2026-07-01" }),
      ],
      currencyConversions: expect.arrayContaining([
        expect.objectContaining({ multiplier: "0.000516456899089" }),
        expect.objectContaining({
          id: "inventory-linked-conversion",
          multiplier: "0.8500",
        }),
      ]),
    });

    const serialized = JSON.stringify(document);
    expect(serialized).not.toContain("other-private@example.com");
    expect(serialized).not.toContain("other-private-stamp");
    expect(serialized).not.toContain("other-private-entity");
    expect(serialized).not.toContain("secret-credential");
    expect(serialized).not.toContain("secret-recipe-user-id");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain('"moderatedById":"other-user"');
    expect(serialized).not.toContain('"submittedById":"other-user"');
  });
});
