import SuperTokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import type { TypeInput } from "supertokens-node/types";
import {
  isAccountDeletionPending,
  processAccountDeletionJob,
} from "@/lib/accountDeletion";
import { appInfo } from "./appInfo";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function backendConfig(): TypeInput {
  return {
    framework: "custom",
    supertokens: {
      connectionURI: requireEnv("SUPERTOKENS_CONNECTION_URI"),
      apiKey: requireEnv("SUPERTOKENS_API_KEY"),
    },
    appInfo,
    recipeList: [
      ThirdParty.init({
        signInAndUpFeature: {
          providers: [
            {
              config: {
                thirdPartyId: "google",
                clients: [
                  {
                    clientId: requireEnv("GOOGLE_CLIENT_ID"),
                    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
                  },
                ],
              },
            },
            {
              config: {
                thirdPartyId: "apple",
                clients: [
                  {
                    clientId: requireEnv("APPLE_CLIENT_ID"),
                    additionalConfig: {
                      keyId: requireEnv("APPLE_KEY_ID"),
                      teamId: requireEnv("APPLE_TEAM_ID"),
                      // Stored on one line in .env, so turn the escapes back
                      // into the real newlines a PEM key needs.
                      privateKey: requireEnv("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
      Session.init({
        override: {
          functions: (original) => ({
            ...original,
            createNewSession: async (input) => {
              if (await isAccountDeletionPending(input.userId)) {
                await processAccountDeletionJob(input.userId).catch(() => undefined);
                throw new Error("Account deletion is in progress.");
              }
              return original.createNewSession(input);
            },
            getSession: async (input) => {
              const session = await original.getSession(input);
              if (
                session &&
                (await isAccountDeletionPending(session.getUserId()))
              ) {
                return undefined;
              }
              return session;
            },
            refreshSession: async (input) => {
              const session = await original.refreshSession(input);
              if (await isAccountDeletionPending(session.getUserId())) {
                await processAccountDeletionJob(session.getUserId()).catch(
                  () => undefined,
                );
                throw new Error("Account deletion is in progress.");
              }
              return session;
            },
          }),
        },
      }),
    ],
    // Route handlers are short-lived, so SuperTokens should not keep background
    // work alive between requests.
    isInServerlessEnv: true,
  };
}

let initialized = false;

export function ensureSuperTokensInit() {
  if (!initialized) {
    SuperTokens.init(backendConfig());
    initialized = true;
  }
}
