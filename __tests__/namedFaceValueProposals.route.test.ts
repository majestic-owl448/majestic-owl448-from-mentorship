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

import { GET, POST } from "@/app/api/named-face-value-proposals/route";

function request(method: "GET" | "POST", body?: unknown) {
  return new NextRequest("http://localhost/api/named-face-value-proposals", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

describe("named/code proposal API", () => {
  beforeEach(async () => {
    auth.userId = null;
    await prisma.stampInventoryEntry.deleteMany();
    await prisma.namedFaceValueValueProposal.deleteMany();
    await prisma.namedFaceValueDefinitionProposal.deleteMany();
    await prisma.namedFaceValue.deleteMany();
    await prisma.valueScheduleValue.deleteMany();
    await prisma.valueSchedule.deleteMany();
    await prisma.userPostalEntitySetting.deleteMany();
    await prisma.postalEntity.deleteMany();
    await prisma.userProfile.deleteMany();
  });

  it("requires authentication for submission and status listing", async () => {
    expect((await GET(request("GET"))).status).toBe(401);
    expect((await POST(request("POST", {}))).status).toBe(401);
  });

  it("submits immutable definition and value payloads and lists their status", async () => {
    auth.userId = "first-user";
    const definitionResponse = await POST(
      request("POST", {
        proposalType: "DEFINITION",
        countryCode: "IT",
        displayCode: "B Zona 2",
        normalizedCode: "b zona 2",
        currencyCode: "EUR",
        sourceNote: "Published tariff table",
      }),
    );
    expect(definitionResponse.status).toBe(201);
    const definition = (await definitionResponse.json()).proposal;
    expect(definition).toMatchObject({
      proposalType: "DEFINITION",
      displayCode: "B Zona 2",
      status: "PENDING",
    });

    const valueResponse = await POST(
      request("POST", {
        proposalType: "VALUE",
        definitionProposalId: definition.id,
        amount: "2.10",
        effectiveOn: "2028-10-01",
        sourceUrl: "https://example.com/rates",
      }),
    );
    expect(valueResponse.status).toBe(201);
    expect(await valueResponse.json()).toMatchObject({
      proposal: {
        proposalType: "VALUE",
        definitionProposalId: definition.id,
        amount: "2.10",
        status: "PENDING",
      },
    });

    const listResponse = await GET(request("GET"));
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toMatchObject({
      definitions: [{ id: definition.id, status: "PENDING" }],
      values: [{ definitionProposalId: definition.id, status: "PENDING" }],
    });
  });
});
