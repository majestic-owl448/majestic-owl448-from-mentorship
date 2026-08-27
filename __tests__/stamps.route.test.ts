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

import { GET, POST } from "@/app/api/stamps/route";
import { GET as SEARCH_NAMED_FACE_VALUES } from "@/app/api/named-face-values/route";

const validStamp = {
  countryCode: "IT",
  postalEntityId: "first-user-postal-entity",
  name: "Italian monetary stamp",
  yearOfIssue: "",
  faceValueType: "MONETARY",
  faceAmount: "2.50",
  faceCurrencyCode: "EUR",
  manualPostageAmount: "",
  manualPostageCurrencyCode: "",
  quantityOwned: "3",
  quantityAnnulled: "1",
  expired: false,
};

const validNamedStamp = {
  ...validStamp,
  name: "Italian named stamp",
  faceValueType: "NAMED",
  faceAmount: "",
  faceCurrencyCode: "",
  namedFaceValueId: "italy-b-zone-one",
};

function request(method: "GET" | "POST", body?: unknown) {
  return new NextRequest("http://localhost/api/stamps", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

function namedFaceValueSearch(countryCode = "", query = "") {
  const parameters = new URLSearchParams({ countryCode, query });
  return new NextRequest(
    `http://localhost/api/named-face-values?${parameters}`,
  );
}

async function createActiveSetting(
  userId: string,
  countryCode = "IT",
  displayCurrencyCode = "EUR",
) {
  await prisma.userProfile.create({ data: { id: userId } });
  const postalEntity = await prisma.postalEntity.create({
    data: {
      id: `${userId}-postal-entity`,
      name: `${userId} Post`,
      normalizedName: `${userId} post`,
      countryCode,
      submittedById: userId,
    },
  });
  const setting = await prisma.userPostalEntitySetting.create({
    data: {
      userId,
      postalEntityId: postalEntity.id,
      displayCurrencyCode,
      timeZone: "Europe/Rome",
      timeZoneMode: "SYSTEM",
    },
  });
  await prisma.userProfile.update({
    where: { id: userId },
    data: { activePostalEntitySettingId: setting.id },
  });
}

async function createNamedFaceValue(
  id: string,
  countryCode: string,
  displayCode: string,
  amount?: string,
) {
  return prisma.valueSchedule.create({
    data: {
      id: `${id}-schedule`,
      countryCode,
      currencyCode: "EUR",
      values: amount
        ? { create: { id: `${id}-value`, amount } }
        : undefined,
      namedFaceValues: {
        create: {
          id,
          displayCode,
          normalizedCode: displayCode.toLowerCase(),
        },
      },
    },
  });
}

describe("stamp inventory API", () => {
  beforeEach(async () => {
    auth.userId = null;
    await prisma.currencyConversion.deleteMany();
    await prisma.stampInventoryEntry.deleteMany();
    await prisma.namedFaceValue.deleteMany();
    await prisma.valueScheduleValue.deleteMany();
    await prisma.valueSchedule.deleteMany();
    await prisma.userPostalEntitySetting.deleteMany();
    await prisma.postalEntity.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.currency.deleteMany();
    await prisma.currency.createMany({
      data: [
        { code: "EUR", displayName: "Euro" },
        { code: "GBP", displayName: "Pound sterling" },
        { code: "ITL", displayName: "Italian lira" },
      ],
    });
  });

  it("requires authentication for creating and listing stamps", async () => {
    expect((await GET(request("GET"))).status).toBe(401);
    expect((await POST(request("POST", validStamp))).status).toBe(401);
    expect(await prisma.stampInventoryEntry.count()).toBe(0);
  });

  it("requires authentication and a country for named face value search", async () => {
    expect(
      (await SEARCH_NAMED_FACE_VALUES(namedFaceValueSearch("IT"))).status,
    ).toBe(401);

    auth.userId = "first-user";
    const response = await SEARCH_NAMED_FACE_VALUES(namedFaceValueSearch());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: { countryCode: "Select a country before searching." },
    });
  });

  it("searches named face values by country and normalized text", async () => {
    auth.userId = "first-user";
    await createNamedFaceValue("italy-b-zone-one", "IT", "B Zona 1", "1.35");
    await createNamedFaceValue("swiss-b-zone-one", "CH", "B Zona 1", "2.00");

    const response = await SEARCH_NAMED_FACE_VALUES(
      namedFaceValueSearch("it", "  B   ZONA "),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      namedFaceValues: [
        {
          id: "italy-b-zone-one",
          countryCode: "IT",
          displayCode: "B Zona 1",
        },
      ],
    });
  });

  it("creates and retrieves a stamp in the active display currency", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");

    const created = await POST(request("POST", validStamp));
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      stamp: {
        countryCode: "IT",
        postalEntityId: "first-user-postal-entity",
        postalEntity: {
          id: "first-user-postal-entity",
          name: "first-user Post",
          countryCode: "IT",
        },
        yearOfIssue: null,
        faceAmount: "2.50",
        quantityOwned: 3,
        quantityAnnulled: 1,
        usableQuantity: 2,
        unitPostageValue: {
          amount: "2.5",
          currencyCode: "EUR",
          source: "FACE_AMOUNT",
        },
        totalPostageValue: { amount: "5", currencyCode: "EUR" },
      },
    });

    const listed = await GET(request("GET"));
    expect(await listed.json()).toMatchObject({
      activeCountryCode: "IT",
      displayCurrencyCode: "EUR",
      stamps: [{ name: "Italian monetary stamp" }],
    });
  });

  it("stores a named face value reference and resolves its schedule", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    await createNamedFaceValue("italy-b-zone-one", "IT", "B Zona 1", "1.35");

    const response = await POST(request("POST", validNamedStamp));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      stamp: {
        faceValueType: "NAMED",
        faceAmount: null,
        faceCurrencyCode: null,
        namedFaceValueId: "italy-b-zone-one",
        namedFaceValue: {
          id: "italy-b-zone-one",
          countryCode: "IT",
          displayCode: "B Zona 1",
        },
        unitPostageValue: {
          amount: "1.35",
          currencyCode: "EUR",
          source: "NAMED_SCHEDULE",
        },
      },
    });
    expect(await prisma.stampInventoryEntry.findFirst()).toMatchObject({
      namedFaceValueId: "italy-b-zone-one",
      faceAmount: null,
      faceCurrencyCode: null,
    });
  });

  it("recalculates a named stamp after its referenced schedule changes", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    await createNamedFaceValue("italy-b-zone-one", "IT", "B Zona 1", "1.35");
    await POST(request("POST", validNamedStamp));
    const storedBefore = await prisma.stampInventoryEntry.findFirstOrThrow();

    await prisma.valueScheduleValue.update({
      where: { id: "italy-b-zone-one-value" },
      data: { amount: "1.40" },
    });
    const response = await GET(request("GET"));
    const storedAfter = await prisma.stampInventoryEntry.findFirstOrThrow();

    expect(await response.json()).toMatchObject({
      stamps: [
        {
          namedFaceValueId: "italy-b-zone-one",
          unitPostageValue: {
            amount: "1.4",
            source: "NAMED_SCHEDULE",
          },
        },
      ],
    });
    expect(storedAfter).toEqual(storedBefore);
  });

  it("uses a manual fallback when a named schedule has no current value", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    await createNamedFaceValue("italy-b-zone-one", "IT", "B Zona 1");

    const response = await POST(
      request("POST", {
        ...validNamedStamp,
        manualPostageAmount: "1.25",
        manualPostageCurrencyCode: "EUR",
      }),
    );

    expect(await response.json()).toMatchObject({
      stamp: {
        unitPostageValue: {
          amount: "1.25",
          currencyCode: "EUR",
          source: "MANUAL_FALLBACK",
        },
      },
    });
  });

  it("prefers an eligible named schedule over the manual fallback", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    await createNamedFaceValue("italy-b-zone-one", "IT", "B Zona 1", "1.35");

    const response = await POST(
      request("POST", {
        ...validNamedStamp,
        manualPostageAmount: "9.99",
        manualPostageCurrencyCode: "EUR",
      }),
    );

    expect(await response.json()).toMatchObject({
      stamp: {
        unitPostageValue: { amount: "1.35", source: "NAMED_SCHEDULE" },
      },
    });
  });

  it("rejects unavailable and country-mismatched named face values", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    await createNamedFaceValue("swiss-a-post", "CH", "A Post", "1.20");

    for (const namedFaceValueId of ["unavailable-pending-value", "swiss-a-post"]) {
      const response = await POST(
        request("POST", { ...validNamedStamp, namedFaceValueId }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errors: {
          namedFaceValueId:
            "Select a named face value available for the stamp country.",
        },
      });
    }
    expect(await prisma.stampInventoryEntry.count()).toBe(0);
  });

  it("uses an approved conversion without floating-point artifacts", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    await prisma.currencyConversion.create({
      data: {
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.000516456899089",
      },
    });

    const response = await POST(
      request("POST", {
        ...validStamp,
        faceAmount: "1936.27",
        faceCurrencyCode: "ITL",
      }),
    );
    expect(await response.json()).toMatchObject({
      stamp: {
        unitPostageValue: {
          amount: "0.99999999999905803",
          currencyCode: "EUR",
          source: "FIXED_CONVERSION",
        },
      },
    });
  });

  it("uses a manual fallback only while the face conversion is missing", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    await POST(
      request("POST", {
        ...validStamp,
        faceCurrencyCode: "ITL",
        manualPostageAmount: "1.25",
        manualPostageCurrencyCode: "EUR",
      }),
    );

    let response = await GET(request("GET"));
    expect(await response.json()).toMatchObject({
      stamps: [
        {
          unitPostageValue: {
            amount: "1.25",
            currencyCode: "EUR",
            source: "MANUAL_FALLBACK",
          },
        },
      ],
    });

    await prisma.currencyConversion.create({
      data: {
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.5",
      },
    });
    response = await GET(request("GET"));
    expect(await response.json()).toMatchObject({
      stamps: [
        {
          unitPostageValue: {
            amount: "1.25",
            currencyCode: "EUR",
            source: "FIXED_CONVERSION",
          },
        },
      ],
    });
  });

  it("resolves a manual fallback into the active display currency", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    await prisma.currencyConversion.create({
      data: {
        fromCurrencyCode: "GBP",
        toCurrencyCode: "EUR",
        multiplier: "1.25",
      },
    });
    await POST(
      request("POST", {
        ...validStamp,
        faceCurrencyCode: "ITL",
        manualPostageAmount: "2",
        manualPostageCurrencyCode: "GBP",
      }),
    );

    const response = await GET(request("GET"));
    expect(await response.json()).toMatchObject({
      stamps: [
        {
          unitPostageValue: {
            amount: "2.5",
            currencyCode: "EUR",
            source: "MANUAL_FALLBACK",
          },
        },
      ],
    });
  });

  it("leaves a manual fallback unresolved without a display conversion", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    await POST(
      request("POST", {
        ...validStamp,
        faceCurrencyCode: "ITL",
        manualPostageAmount: "2",
        manualPostageCurrencyCode: "GBP",
      }),
    );

    const response = await GET(request("GET"));
    expect(await response.json()).toMatchObject({
      stamps: [{ unitPostageValue: null, totalPostageValue: null }],
    });
  });

  it("returns zero usable quantity and postage total for an expired stamp", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    const response = await POST(
      request("POST", {
        ...validStamp,
        expired: true,
      }),
    );

    expect(await response.json()).toMatchObject({
      stamp: {
        quantityOwned: 3,
        quantityAnnulled: 1,
        usableQuantity: 0,
        unitPostageValue: {
          amount: "0",
          currencyCode: "EUR",
          source: "EXPIRED",
        },
        totalPostageValue: { amount: "0", currencyCode: "EUR" },
      },
    });
  });

  it("returns a known zero total when every unresolved stamp is annulled", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    const response = await POST(
      request("POST", {
        ...validStamp,
        faceCurrencyCode: "ITL",
        quantityOwned: "3",
        quantityAnnulled: "3",
      }),
    );

    expect(await response.json()).toMatchObject({
      stamp: {
        usableQuantity: 0,
        unitPostageValue: null,
        totalPostageValue: { amount: "0", currencyCode: "EUR" },
      },
    });
  });

  it("returns field errors for invalid decimals and owned quantities", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    const response = await POST(
      request("POST", {
        ...validStamp,
        countryCode: "",
        faceAmount: "1.2.3",
        quantityOwned: "0",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        countryCode: "Select a valid ISO 3166-1 country.",
        faceAmount: "Enter a non-negative decimal amount.",
        quantityOwned: "Enter an owned quantity from 1 to 2,147,483,647.",
      },
    });
  });

  it("preserves every accepted decimal digit in unit and total values", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    const response = await POST(
      request("POST", {
        ...validStamp,
        faceAmount: "0.123456789012345678901",
        quantityOwned: "3",
        quantityAnnulled: "0",
      }),
    );

    expect(await response.json()).toMatchObject({
      stamp: {
        unitPostageValue: { amount: "0.123456789012345678901" },
        totalPostageValue: {
          amount: "0.370370367037037036703",
          currencyCode: "EUR",
        },
      },
    });
  });

  it("rejects a postal entity that does not belong to the stamp country", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");
    const response = await POST(
      request("POST", { ...validStamp, countryCode: "CH" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        postalEntityId:
          "Select a postal entity that belongs to the stamp country.",
      },
    });
    expect(await prisma.stampInventoryEntry.count()).toBe(0);
  });

  it("rejects another user's postal entity", async () => {
    await createActiveSetting("first-user");
    await createActiveSetting("second-user");
    auth.userId = "first-user";
    const response = await POST(
      request("POST", {
        ...validStamp,
        postalEntityId: "second-user-postal-entity",
      }),
    );

    expect(response.status).toBe(400);
    expect(await prisma.stampInventoryEntry.count()).toBe(0);
  });

  it("lists only the authenticated user's stamps", async () => {
    await createActiveSetting("first-user");
    await createActiveSetting("second-user");
    auth.userId = "first-user";
    await POST(request("POST", { ...validStamp, name: "First stamp" }));
    auth.userId = "second-user";
    await POST(
      request("POST", {
        ...validStamp,
        postalEntityId: "second-user-postal-entity",
        name: "Second stamp",
      }),
    );

    auth.userId = "first-user";
    const response = await GET(request("GET"));
    expect((await response.json()).stamps).toMatchObject([
      { name: "First stamp" },
    ]);
  });
});
