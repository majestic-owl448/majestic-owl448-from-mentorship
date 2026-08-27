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

import { GET } from "@/app/api/me/route";

describe("GET /api/me", () => {
  beforeEach(async () => {
    auth.userId = null;
    auth.email = null;
    await prisma.userPostalEntitySetting.deleteMany();
    await prisma.postalEntity.deleteMany();
    await prisma.userProfile.deleteMany();
  });

  it("returns 401 without an authenticated session", async () => {
    const response = await GET(new NextRequest("http://localhost/api/me"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
    expect(await prisma.userProfile.count()).toBe(0);
  });

  it("creates a profile from the authenticated SuperTokens user", async () => {
    auth.userId = "primary-user-id";
    auth.email = "first@example.com";

    const response = await GET(new NextRequest("http://localhost/api/me"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      userId: "primary-user-id",
      email: "first@example.com",
      role: "USER",
    });
    await expect(
      prisma.userProfile.findUniqueOrThrow({
        where: { id: "primary-user-id" },
      })
    ).resolves.toMatchObject({
      id: "primary-user-id",
      email: "first@example.com",
      role: "USER",
    });
  });

  it("reuses the profile and updates known email data", async () => {
    auth.userId = "primary-user-id";
    auth.email = "first@example.com";
    await GET(new NextRequest("http://localhost/api/me"));

    auth.email = "updated@example.com";
    const response = await GET(new NextRequest("http://localhost/api/me"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      userId: "primary-user-id",
      email: "updated@example.com",
    });
    expect(
      await prisma.userProfile.count({ where: { id: "primary-user-id" } })
    ).toBe(1);
  });

  it("keeps stored email data when SuperTokens has no email", async () => {
    await prisma.userProfile.create({
      data: { id: "primary-user-id", email: "stored@example.com" },
    });
    auth.userId = "primary-user-id";

    const response = await GET(new NextRequest("http://localhost/api/me"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      userId: "primary-user-id",
      email: "stored@example.com",
    });
  });

  it("returns 404 instead of accessing a client-supplied user profile", async () => {
    await prisma.userProfile.create({
      data: { id: "other-user", email: "private@example.com" },
    });
    auth.userId = "signed-in-user";
    auth.email = "signed-in@example.com";

    const response = await GET(
      new NextRequest("http://localhost/api/me?userId=other-user")
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Profile not found" });
    expect(await prisma.userProfile.findMany()).toEqual([
      expect.objectContaining({
        id: "other-user",
        email: "private@example.com",
      }),
    ]);
  });
});
