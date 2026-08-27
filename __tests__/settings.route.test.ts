import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const auth = vi.hoisted(() => ({
  userId: null as string | null,
  email: null as string | null,
}));

vi.mock("@/app/config/backend", () => ({
  ensureSuperTokensInit: vi.fn(),
}));

vi.mock("supertokens-node", () => ({
  default: {
    getUser: vi.fn(async () =>
      auth.email === null ? undefined : { emails: [auth.email] }
    ),
  },
}));

vi.mock("supertokens-node/nextjs", () => ({
  withSession: vi.fn(
    async (
      _request: NextRequest,
      callback: (
        error: undefined,
        session: { getUserId: () => string } | undefined
      ) => Promise<Response>
    ) =>
      callback(
        undefined,
        auth.userId === null
          ? undefined
          : { getUserId: () => auth.userId as string }
      )
  ),
}));

import { GET } from "@/app/api/settings/route";
import { POST } from "@/app/api/settings/countries/route";

const validSetting = {
  countryCode: "IT",
  displayCurrencyCode: "EUR",
  timeZone: "Europe/Rome",
  timeZoneMode: "SYSTEM",
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/settings/countries", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("country settings API", () => {
  beforeEach(async () => {
    auth.userId = null;
    auth.email = null;
    await prisma.userCountrySetting.deleteMany();
    await prisma.userProfile.deleteMany();
  });

  it("returns 401 without an authenticated session", async () => {
    const getResponse = await GET(
      new NextRequest("http://localhost/api/settings")
    );
    const postResponse = await POST(postRequest(validSetting));

    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
    expect(await prisma.userCountrySetting.count()).toBe(0);
  });

  it("saves the browser timezone and activates the first setting", async () => {
    auth.userId = "first-user";
    auth.email = "first@example.com";

    const response = await POST(postRequest(validSetting));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      activeCountrySetting: {
        userId: "first-user",
        ...validSetting,
      },
    });
    await expect(
      prisma.userProfile.findUniqueOrThrow({ where: { id: "first-user" } })
    ).resolves.toMatchObject({
      activeCountrySettingId: expect.any(String),
    });
  });

  it("persists a custom timezone across a new authenticated request", async () => {
    auth.userId = "first-user";
    auth.email = "first@example.com";
    await POST(
      postRequest({
        ...validSetting,
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
      })
    );

    auth.userId = null;
    expect(
      await GET(new NextRequest("http://localhost/api/settings"))
    ).toMatchObject({ status: 401 });

    auth.userId = "first-user";
    const response = await GET(
      new NextRequest("http://localhost/api/settings")
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      complete: true,
      activeCountrySetting: {
        userId: "first-user",
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
      },
    });
  });

  it("returns associated field errors for invalid values", async () => {
    auth.userId = "first-user";

    const response = await POST(
      postRequest({
        countryCode: "XX",
        displayCurrencyCode: "XXX",
        timeZone: "Mars/Olympus",
        timeZoneMode: "AUTOMATIC",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        countryCode: "Select a valid ISO 3166-1 country.",
        displayCurrencyCode:
          "Select a currency supported by this application.",
        timeZoneMode: "Select system or custom timezone mode.",
        timeZone: "Enter a valid IANA timezone.",
      },
    });
    expect(await prisma.userProfile.count()).toBe(0);
  });

  it("does not replace an existing initial setting", async () => {
    auth.userId = "first-user";
    await POST(postRequest(validSetting));

    const response = await POST(
      postRequest({
        ...validSetting,
        countryCode: "US",
        displayCurrencyCode: "USD",
      })
    );

    expect(response.status).toBe(409);
    await expect(
      prisma.userCountrySetting.findMany({ where: { userId: "first-user" } })
    ).resolves.toMatchObject([validSetting]);
  });

  it("keeps settings isolated by authenticated user", async () => {
    auth.userId = "first-user";
    await POST(postRequest(validSetting));
    auth.userId = "second-user";
    await POST(
      postRequest({
        ...validSetting,
        countryCode: "US",
        displayCurrencyCode: "USD",
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
      })
    );

    const response = await GET(
      new NextRequest("http://localhost/api/settings")
    );
    expect(await response.json()).toMatchObject({
      activeCountrySetting: {
        userId: "second-user",
        countryCode: "US",
      },
    });
    await expect(prisma.userCountrySetting.count()).resolves.toBe(2);
  });
});
