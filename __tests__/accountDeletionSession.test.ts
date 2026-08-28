const account = vi.hoisted(() => ({ deleting: false, process: vi.fn() }));
const sessionRecipe = vi.hoisted(() => ({
  config: null as null | {
    override: {
      functions: (original: Record<string, unknown>) => Record<string, unknown>;
    };
  },
}));

vi.mock("@/lib/accountDeletion", () => ({
  isAccountDeletionPending: vi.fn(async () => account.deleting),
  processAccountDeletionJob: account.process,
}));
vi.mock("supertokens-node", () => ({ default: { init: vi.fn() } }));
vi.mock("supertokens-node/recipe/thirdparty", () => ({
  default: { init: vi.fn(() => ({ recipeId: "thirdparty" })) },
}));
vi.mock("supertokens-node/recipe/session", () => ({
  default: {
    init: vi.fn((config) => {
      sessionRecipe.config = config;
      return { recipeId: "session" };
    }),
  },
}));

import { backendConfig } from "@/app/config/backend";

describe("account deletion session block", () => {
  beforeAll(() => {
    Object.assign(process.env, {
      SUPERTOKENS_CONNECTION_URI: "http://supertokens.invalid",
      SUPERTOKENS_API_KEY: "test-key",
      GOOGLE_CLIENT_ID: "google-client",
      GOOGLE_CLIENT_SECRET: "google-secret",
      APPLE_CLIENT_ID: "apple-client",
      APPLE_KEY_ID: "apple-key",
      APPLE_TEAM_ID: "apple-team",
      APPLE_PRIVATE_KEY: "apple-private-key",
    });
    backendConfig();
  });

  beforeEach(() => {
    account.deleting = false;
    account.process.mockReset().mockResolvedValue(undefined);
  });

  function overriddenFunctions() {
    const original = {
      createNewSession: vi.fn(async () => ({ created: true })),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    };
    const functions = sessionRecipe.config!.override.functions(original) as {
      createNewSession: (input: { userId: string }) => Promise<unknown>;
      getSession: (input: unknown) => Promise<unknown>;
      refreshSession: (input: unknown) => Promise<unknown>;
    };
    return { functions, original };
  }

  it("rejects new sessions for an account with a deletion job", async () => {
    account.deleting = true;
    const { functions, original } = overriddenFunctions();

    await expect(
      functions.createNewSession({ userId: "deleting-user" }),
    ).rejects.toThrow("Account deletion is in progress.");
    expect(account.process).toHaveBeenCalledWith("deleting-user");
    expect(original.createNewSession).not.toHaveBeenCalled();
  });

  it("treats an existing session as unauthenticated while deletion is pending", async () => {
    account.deleting = true;
    const session = { getUserId: () => "deleting-user" };
    const { functions, original } = overriddenFunctions();
    original.getSession.mockResolvedValue(session);

    await expect(functions.getSession({})).resolves.toBeUndefined();
  });

  it("retries deletion before rejecting a refreshed session", async () => {
    account.deleting = true;
    const refreshedSession = {
      getUserId: () => "deleting-user",
      revokeSession: vi.fn(async () => undefined),
    };
    const { functions, original } = overriddenFunctions();
    original.refreshSession.mockResolvedValue(refreshedSession);

    await expect(functions.refreshSession({})).rejects.toThrow(
      "Account deletion is in progress.",
    );
    expect(account.process).toHaveBeenCalledWith("deleting-user");
  });
});
