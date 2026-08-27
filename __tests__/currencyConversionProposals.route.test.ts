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

import { GET, POST } from "@/app/api/fixed-conversion-proposals/route";

function request(method: "GET" | "POST", body?: unknown) {
  return new NextRequest("http://localhost/api/fixed-conversion-proposals", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

describe("fixed-conversion proposal API", () => {
  beforeEach(async () => {
    auth.userId = null;
    await prisma.currencyConversionProposal.deleteMany();
    await prisma.currencyConversion.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.currency.deleteMany();
    await prisma.currency.createMany({
      data: [
        { code: "EUR", displayName: "Euro" },
        { code: "ITL", displayName: "Italian lira" },
      ],
    });
  });

  it("requires authentication for submission and status listing", async () => {
    expect((await GET(request("GET"))).status).toBe(401);
    expect((await POST(request("POST", {}))).status).toBe(401);
  });

  it("lists only the authenticated user's pending proposals", async () => {
    await prisma.userProfile.createMany({
      data: [{ id: "first-user" }, { id: "second-user" }],
    });
    auth.userId = "first-user";
    const created = await POST(
      request("POST", {
        proposalKind: "MISSING",
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.000516456899089",
        sourceUrl: "https://example.com/conversion",
      }),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      proposal: { status: "PENDING", fromCurrencyCode: "ITL" },
    });

    auth.userId = "second-user";
    expect(await (await GET(request("GET"))).json()).toMatchObject({
      proposals: [],
    });
    auth.userId = "first-user";
    expect(await (await GET(request("GET"))).json()).toMatchObject({
      proposals: [{ status: "PENDING", fromCurrencyCode: "ITL" }],
    });
  });

  it("rejects invalid and non-positive multipliers", async () => {
    auth.userId = "first-user";
    for (const multiplier of ["not-a-decimal", "0", "-0.5"]) {
      const response = await POST(
        request("POST", {
          proposalKind: "MISSING",
          fromCurrencyCode: "ITL",
          toCurrencyCode: "EUR",
          multiplier,
          sourceNote: "Tariff",
        }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errors: { multiplier: "Enter a positive decimal multiplier." },
      });
    }
    expect(await prisma.currencyConversionProposal.count()).toBe(0);
  });

  it("directs an approved pair to the correction workflow", async () => {
    auth.userId = "first-user";
    await prisma.currencyConversion.create({
      data: {
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.0005",
      },
    });

    const response = await POST(
      request("POST", {
        proposalKind: "MISSING",
        fromCurrencyCode: "ITL",
        toCurrencyCode: "EUR",
        multiplier: "0.0006",
        sourceNote: "Tariff",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: {
        proposalKind:
          "An approved conversion already exists for this pair. Submit a correction.",
      },
    });
  });
});
