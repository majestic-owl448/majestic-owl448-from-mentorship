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

const validStamp = {
  countryCode: "IT",
  name: "Italian monetary stamp",
  yearOfIssue: "",
  faceAmount: "2.50",
  faceCurrencyCode: "EUR",
  manualPostageAmount: "",
  manualPostageCurrencyCode: "",
  quantityOwned: "3",
  quantityAnnulled: "1",
  expired: false,
};

function request(method: "GET" | "POST", body?: unknown) {
  return new NextRequest("http://localhost/api/stamps", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

async function createActiveSetting(
  userId: string,
  countryCode = "IT",
  displayCurrencyCode = "EUR",
) {
  await prisma.userProfile.create({ data: { id: userId } });
  const postalEntity = await prisma.postalEntity.create({
    data: {
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

describe("stamp inventory API", () => {
  beforeEach(async () => {
    auth.userId = null;
    await prisma.currencyConversion.deleteMany();
    await prisma.stampInventoryEntry.deleteMany();
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

  it("creates and retrieves a stamp in the active display currency", async () => {
    auth.userId = "first-user";
    await createActiveSetting("first-user");

    const created = await POST(request("POST", validStamp));
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      stamp: {
        countryCode: "IT",
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
        quantityOwned: "Enter a whole owned quantity greater than zero.",
      },
    });
  });

  it("lists only the authenticated user's stamps", async () => {
    await createActiveSetting("first-user");
    await createActiveSetting("second-user");
    auth.userId = "first-user";
    await POST(request("POST", { ...validStamp, name: "First stamp" }));
    auth.userId = "second-user";
    await POST(request("POST", { ...validStamp, name: "Second stamp" }));

    auth.userId = "first-user";
    const response = await GET(request("GET"));
    expect((await response.json()).stamps).toMatchObject([
      { name: "First stamp" },
    ]);
  });
});
