import SuperTokens from "supertokens-node";
import Passwordless from "supertokens-node/recipe/passwordless";
import Session from "supertokens-node/recipe/session";
import ThirdParty from "supertokens-node/recipe/thirdparty";
import type { TypeInput } from "supertokens-node/types";
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
      Passwordless.init({
        contactMethod: "EMAIL",
        flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
      }),
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
                thirdPartyId: "github",
                clients: [
                  {
                    clientId: requireEnv("GITHUB_CLIENT_ID"),
                    clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
                  },
                ],
              },
            },
          ],
        },
      }),
      Session.init(),
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
