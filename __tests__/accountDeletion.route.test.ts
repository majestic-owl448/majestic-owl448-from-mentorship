import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({ userId: null as string | null }));
const deletion = vi.hoisted(() => ({ deleteAccount: vi.fn() }));

vi.mock("@/app/config/backend", () => ({ ensureSuperTokensInit: vi.fn() }));
vi.mock("supertokens-node", () => ({
  default: { getUser: vi.fn(async () => ({ emails: ["user@example.com"] })) },
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
vi.mock("@/lib/userProfile", () => ({ upsertUserProfile: vi.fn() }));
vi.mock("@/lib/accountDeletion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/accountDeletion")>();
  return { ...actual, deleteAccount: deletion.deleteAccount };
});

import { DELETE } from "@/app/api/account/route";
import { AccountDeletionIncompleteError } from "@/lib/accountDeletion";

function request(body?: unknown) {
  return new NextRequest("http://localhost/api/account", {
    method: "DELETE",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

describe("DELETE /api/account", () => {
  beforeEach(() => {
    auth.userId = null;
    deletion.deleteAccount.mockReset();
  });

  it("requires an authenticated session", async () => {
    const response = await DELETE(request({ confirmation: "DELETE" }));
    expect(response.status).toBe(401);
    expect(deletion.deleteAccount).not.toHaveBeenCalled();
  });

  it("requires the exact explicit confirmation", async () => {
    auth.userId = "user-id";
    const response = await DELETE(request({ confirmation: "delete" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Type DELETE to confirm permanent account deletion.",
    });
    expect(deletion.deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes only the authenticated account", async () => {
    auth.userId = "user-id";
    const response = await DELETE(request({ confirmation: "DELETE" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(deletion.deleteAccount).toHaveBeenCalledWith("user-id");
  });

  it("reports a queued retry while keeping the account blocked", async () => {
    auth.userId = "user-id";
    deletion.deleteAccount.mockRejectedValueOnce(
      new AccountDeletionIncompleteError(),
    );
    const response = await DELETE(request({ confirmation: "DELETE" }));
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(await response.json()).toEqual({
      error:
        "Account deletion is still in progress. Access remains blocked while the deletion is retried.",
    });
  });
});
