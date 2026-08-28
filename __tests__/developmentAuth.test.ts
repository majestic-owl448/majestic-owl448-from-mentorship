import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

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
        session: undefined,
      ) => Promise<Response>,
    ) => callback(undefined, undefined),
  ),
}));

import { GET as GET_ME } from "@/app/api/me/route";
import { GET as SELECT_USER } from "@/app/api/dev-auth/[user]/route";
import { POST as SIGN_OUT } from "@/app/api/dev-auth/logout/route";
import {
  DEVELOPMENT_AUTH_COOKIE,
  DEVELOPMENT_USERS,
} from "@/lib/developmentAuth";
import { seedDevelopmentUsers } from "@/lib/developmentUserProfiles";

async function selectedClient(user: "user" | "moderator") {
  const response = await SELECT_USER(
    new NextRequest(`http://localhost/api/dev-auth/${user}`),
    { params: Promise.resolve({ user }) },
  );
  const cookie = response.cookies.get(DEVELOPMENT_AUTH_COOKIE);
  if (!cookie) throw new Error("Development login did not set its user cookie.");
  return new NextRequest("http://localhost/api/me", {
    headers: { Cookie: `${cookie.name}=${cookie.value}` },
  });
}

describe("development authentication", () => {
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_AUTH_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_DEV_AUTH_ENABLED", "true");
    await seedDevelopmentUsers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("seeds one normal user and one moderator in the same database", async () => {
    await prisma.currency.create({
      data: { code: "EUR", displayName: "Euro" },
    });
    await prisma.userProfile.create({ data: { id: "old-user" } });
    await prisma.postalEntity.create({
      data: {
        id: "old-postal-entity",
        name: "Old postal entity",
        normalizedName: "old postal entity",
        countryCode: "IT",
        submittedName: "Old postal entity",
        submittedNormalizedName: "old postal entity",
        submittedCountryCode: "IT",
        submittedById: "old-user",
      },
    });
    await prisma.userPostalEntitySetting.create({
      data: {
        id: "old-setting",
        userId: "old-user",
        postalEntityId: "old-postal-entity",
        displayCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
        timeZoneMode: "CUSTOM",
      },
    });
    await prisma.stampInventoryEntry.create({
      data: {
        id: "old-stamp",
        userId: "old-user",
        countryCode: "IT",
        postalEntityId: "old-postal-entity",
        name: "Old stamp",
        faceAmount: "1",
        faceCurrencyCode: "EUR",
        quantityOwned: 1,
      },
    });
    await seedDevelopmentUsers();

    await expect(
      prisma.userProfile.findMany({
        where: { id: { in: Object.values(DEVELOPMENT_USERS).map(({ id }) => id) } },
        orderBy: { id: "asc" },
        select: { id: true, email: true, role: true },
      }),
    ).resolves.toEqual([
      {
        id: DEVELOPMENT_USERS.moderator.id,
        email: DEVELOPMENT_USERS.moderator.email,
        role: "MODERATOR",
      },
      {
        id: DEVELOPMENT_USERS.user.id,
        email: DEVELOPMENT_USERS.user.email,
        role: "USER",
      },
    ]);
    await expect(
      Promise.all([
        prisma.stampInventoryEntry.count(),
        prisma.postalEntity.count(),
        prisma.userPostalEntitySetting.count(),
        prisma.currency.count(),
        prisma.currencyConversion.count(),
        prisma.currencyConversionProposal.count(),
        prisma.valueSchedule.count(),
        prisma.valueScheduleValue.count(),
        prisma.namedFaceValue.count(),
        prisma.namedFaceValueDefinitionProposal.count(),
        prisma.namedFaceValueValueProposal.count(),
        prisma.stampProposalAction.count(),
        prisma.accountDeletionJob.count(),
        prisma.deletedAccountTombstone.count(),
      ]),
    ).resolves.toEqual(Array(14).fill(0));
  });

  it("keeps normal and moderator identities separate between two clients", async () => {
    await seedDevelopmentUsers();
    const normalResponse = await GET_ME(await selectedClient("user"));
    const moderatorResponse = await GET_ME(await selectedClient("moderator"));

    expect(await normalResponse.json()).toEqual({
      userId: DEVELOPMENT_USERS.user.id,
      email: DEVELOPMENT_USERS.user.email,
      role: "USER",
    });
    expect(await moderatorResponse.json()).toEqual({
      userId: DEVELOPMENT_USERS.moderator.id,
      email: DEVELOPMENT_USERS.moderator.email,
      role: "MODERATOR",
    });
    expect(await prisma.userProfile.count()).toBe(2);
  });

  it("requires a selected client and rejects unknown fixture names", async () => {
    const unauthenticated = await GET_ME(
      new NextRequest("http://localhost/api/me"),
    );
    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({
      error: "Select a local test user before continuing.",
    });

    const unknown = await SELECT_USER(
      new NextRequest("http://localhost/api/dev-auth/admin"),
      { params: Promise.resolve({ user: "admin" }) },
    );
    expect(unknown.status).toBe(404);
  });

  it("does not expose the bypass outside an explicitly enabled dev server", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await SELECT_USER(
      new NextRequest("http://localhost/api/dev-auth/user"),
      { params: Promise.resolve({ user: "user" }) },
    );
    expect(response.status).toBe(404);
  });

  it("clears the selected client cookie on sign-out", async () => {
    const response = await SIGN_OUT();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      `${DEVELOPMENT_AUTH_COOKIE}=`,
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
