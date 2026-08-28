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

import { GET as GET_SETTINGS } from "@/app/api/settings/route";
import { POST } from "@/app/api/settings/postal-entities/route";
import { PATCH as PATCH_SETTING } from "@/app/api/settings/postal-entities/[settingId]/route";
import { PATCH as PATCH_ACTIVE } from "@/app/api/settings/active-postal-entity/route";
import { GET as GET_INVENTORY } from "@/app/api/inventory/route";

const validSetting = {
  postalEntityName: "Poste Italiane",
  countryCode: "IT",
  issuingAuthority: "Italian Republic",
  scope: "Italy",
  sourceUrl: "https://example.com/poste-italiane",
  sourceNote: "",
  displayCurrencyCode: "EUR",
  timeZone: "Europe/Rome",
  timeZoneMode: "SYSTEM",
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/settings/postal-entities", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("postal entity settings API", () => {
  beforeEach(async () => {
    auth.userId = null;
    auth.email = null;
    await prisma.userPostalEntitySetting.deleteMany();
    await prisma.postalEntity.deleteMany();
    await prisma.userProfile.deleteMany();
  });

  it("returns 401 without an authenticated session", async () => {
    const getResponse = await GET_SETTINGS(
      new NextRequest("http://localhost/api/settings")
    );
    const postResponse = await POST(postRequest(validSetting));
    const inventoryResponse = await GET_INVENTORY(
      new NextRequest("http://localhost/api/inventory")
    );

    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
    expect(inventoryResponse.status).toBe(401);
    expect(await prisma.postalEntity.count()).toBe(0);
  });

  it("submits a pending entity and activates its first setting", async () => {
    auth.userId = "first-user";
    auth.email = "first@example.com";

    const response = await POST(postRequest(validSetting));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      postalEntitySetting: {
        userId: "first-user",
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "SYSTEM",
        postalEntity: {
          name: "Poste Italiane",
          normalizedName: "poste italiane",
          countryCode: "IT",
          issuingAuthority: "Italian Republic",
          scope: "Italy",
          status: "PENDING",
          submittedById: "first-user",
        },
      },
    });
    await expect(
      prisma.userProfile.findUniqueOrThrow({ where: { id: "first-user" } })
    ).resolves.toMatchObject({
      activePostalEntitySettingId: expect.any(String),
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
      await GET_SETTINGS(new NextRequest("http://localhost/api/settings"))
    ).toMatchObject({ status: 401 });

    auth.userId = "first-user";
    const response = await GET_SETTINGS(
      new NextRequest("http://localhost/api/settings")
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      complete: true,
      activePostalEntitySetting: {
        userId: "first-user",
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
        postalEntity: {
          name: "Poste Italiane",
          countryCode: "IT",
          status: "PENDING",
        },
      },
    });
  });

  it("returns associated field errors for invalid values", async () => {
    auth.userId = "first-user";

    const response = await POST(
      postRequest({
        postalEntityName: " ",
        countryCode: "XX",
        issuingAuthority: "",
        scope: "",
        sourceUrl: "ftp://example.com/entity",
        sourceNote: "",
        displayCurrencyCode: "XXX",
        timeZone: "Mars/Olympus",
        timeZoneMode: "AUTOMATIC",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        postalEntityName: "Enter the postal entity name.",
        countryCode: "Select a valid ISO 3166-1 country.",
        issuingAuthority: "Enter the issuing authority.",
        scope: "Enter the geographic or office scope.",
        sourceUrl: "Enter an HTTP or HTTPS URL.",
        sourceNote: "Enter a source URL or source note.",
        displayCurrencyCode:
          "Select a currency supported by this application.",
        timeZoneMode: "Select system or custom timezone mode.",
        timeZone: "Enter a valid IANA timezone.",
      },
    });
    expect(await prisma.userProfile.count()).toBe(0);
  });

  it("adds a second setting without replacing the active setting", async () => {
    auth.userId = "first-user";
    const firstResponse = await POST(postRequest(validSetting));
    const first = (await firstResponse.json()).postalEntitySetting;

    const response = await POST(
      postRequest({
        ...validSetting,
        postalEntityName: "Friend Post",
      })
    );

    expect(response.status).toBe(201);
    await expect(
      prisma.userPostalEntitySetting.count({ where: { userId: "first-user" } })
    ).resolves.toBe(2);
    await expect(
      prisma.userProfile.findUniqueOrThrow({ where: { id: "first-user" } })
    ).resolves.toMatchObject({ activePostalEntitySettingId: first.id });
  });

  it("keeps pending submissions isolated by authenticated user", async () => {
    auth.userId = "first-user";
    await POST(postRequest(validSetting));
    auth.userId = "second-user";
    await POST(postRequest(validSetting));

    const response = await GET_SETTINGS(
      new NextRequest("http://localhost/api/settings")
    );
    expect(await response.json()).toMatchObject({
      activePostalEntitySetting: {
        userId: "second-user",
        postalEntity: {
          name: "Poste Italiane",
          submittedById: "second-user",
        },
      },
    });
    const submissions = await prisma.postalEntity.findMany({
      orderBy: { submittedById: "asc" },
    });
    expect(submissions).toMatchObject([
      { submittedById: "first-user", status: "PENDING" },
      { submittedById: "second-user", status: "PENDING" },
    ]);
    expect(submissions[0].id).not.toBe(submissions[1].id);
  });

  it("rejects inventory until an eligible setting is active", async () => {
    auth.userId = "first-user";

    const incomplete = await GET_INVENTORY(
      new NextRequest("http://localhost/api/inventory")
    );
    expect(incomplete.status).toBe(409);
    expect(await incomplete.json()).toEqual({
      error: "Complete the required postal entity settings before using inventory.",
      settingsUrl: "/dashboard",
    });

    await POST(postRequest(validSetting));
    const complete = await GET_INVENTORY(
      new NextRequest("http://localhost/api/inventory")
    );
    expect(complete.status).toBe(200);
    expect(await complete.json()).toMatchObject({
      activePostalEntitySetting: {
        userId: "first-user",
        postalEntity: {
          name: "Poste Italiane",
          status: "PENDING",
          submittedById: "first-user",
        },
      },
    });
  });

  it("lists, edits, and activates settings without cross-setting changes", async () => {
    auth.userId = "first-user";
    const first = (await (await POST(postRequest(validSetting))).json())
      .postalEntitySetting;
    const second = (
      await (
        await POST(
          postRequest({
            ...validSetting,
            postalEntityName: "Vatican Post",
            displayCurrencyCode: "USD",
          })
        )
      ).json()
    ).postalEntitySetting;

    const editResponse = await PATCH_SETTING(
      new NextRequest(
        `http://localhost/api/settings/postal-entities/${second.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            displayCurrencyCode: "CHF",
            timeZone: "Europe/Zurich",
            timeZoneMode: "CUSTOM",
          }),
        }
      ),
      { params: Promise.resolve({ settingId: second.id }) }
    );
    expect(editResponse.status).toBe(200);

    const activateResponse = await PATCH_ACTIVE(
      new NextRequest("http://localhost/api/settings/active-postal-entity", {
        method: "PATCH",
        body: JSON.stringify({ settingId: second.id }),
      })
    );
    expect(activateResponse.status).toBe(200);

    const response = await GET_SETTINGS(
      new NextRequest("http://localhost/api/settings")
    );
    expect(await response.json()).toMatchObject({
      activePostalEntitySetting: {
        id: second.id,
        displayCurrencyCode: "CHF",
        timeZone: "Europe/Zurich",
      },
      postalEntitySettings: expect.arrayContaining([
        expect.objectContaining({
          id: first.id,
          displayCurrencyCode: "EUR",
          timeZone: "Europe/Rome",
        }),
        expect.objectContaining({
          id: second.id,
          displayCurrencyCode: "CHF",
          timeZone: "Europe/Zurich",
        }),
      ]),
    });
  });

  it("rejects duplicate, foreign, and private pending entity selections", async () => {
    auth.userId = "first-user";
    const first = (await (await POST(postRequest(validSetting))).json())
      .postalEntitySetting;
    const duplicate = await POST(
      postRequest({
        postalEntityId: first.postalEntityId,
        displayCurrencyCode: "USD",
        timeZone: "America/New_York",
        timeZoneMode: "CUSTOM",
      })
    );
    expect(duplicate.status).toBe(409);

    auth.userId = "second-user";
    const second = (await (await POST(postRequest(validSetting))).json())
      .postalEntitySetting;
    const privatePending = await POST(
      postRequest({
        postalEntityId: first.postalEntityId,
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "SYSTEM",
      })
    );
    expect(privatePending.status).toBe(404);

    const foreignActivation = await PATCH_ACTIVE(
      new NextRequest("http://localhost/api/settings/active-postal-entity", {
        method: "PATCH",
        body: JSON.stringify({ settingId: first.id }),
      })
    );
    expect(foreignActivation.status).toBe(404);
    await expect(
      prisma.userProfile.findUniqueOrThrow({ where: { id: "second-user" } })
    ).resolves.toMatchObject({ activePostalEntitySettingId: second.id });
  });

  it("uses the active setting timezone for the inventory local date", async () => {
    auth.userId = "first-user";
    await POST(
      postRequest({
        ...validSetting,
        timeZone: "America/Los_Angeles",
        timeZoneMode: "CUSTOM",
      })
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:30:00.000Z"));
    try {
      const response = await GET_INVENTORY(
        new NextRequest("http://localhost/api/inventory")
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        localDate: "2025-12-31",
        activePostalEntitySetting: {
          timeZone: "America/Los_Angeles",
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
