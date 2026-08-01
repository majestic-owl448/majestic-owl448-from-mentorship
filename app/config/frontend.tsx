import Passwordless from "supertokens-auth-react/recipe/passwordless";
import { PasswordlessPreBuiltUI } from "supertokens-auth-react/recipe/passwordless/prebuiltui";
import Session from "supertokens-auth-react/recipe/session";
import ThirdParty, { Github, Google } from "supertokens-auth-react/recipe/thirdparty";
import { ThirdPartyPreBuiltUI } from "supertokens-auth-react/recipe/thirdparty/prebuiltui";
import type { SuperTokensConfig } from "supertokens-auth-react/lib/build/types";
import type { useRouter } from "next/navigation";
import { appInfo } from "./appInfo";

// The prebuilt UI needs to know about Next's router so that its internal
// redirects go through client-side navigation instead of a full page load.
const routerInfo: { router?: ReturnType<typeof useRouter>; pathName?: string } = {};

export function setRouter(router: ReturnType<typeof useRouter>, pathName: string) {
  routerInfo.router = router;
  routerInfo.pathName = pathName;
}

export function frontendConfig(): SuperTokensConfig {
  return {
    appInfo,
    recipeList: [
      Passwordless.init({ contactMethod: "EMAIL" }),
      ThirdParty.init({
        signInAndUpFeature: {
          providers: [Google.init(), Github.init()],
        },
      }),
      Session.init(),
    ],
    windowHandler: (original) => ({
      ...original,
      location: {
        ...original.location,
        getPathName: () => routerInfo.pathName!,
        assign: (url) => routerInfo.router!.push(url.toString()),
        setHref: (url) => routerInfo.router!.push(url.toString()),
      },
    }),
  };
}

export const PreBuiltUIList = [PasswordlessPreBuiltUI, ThirdPartyPreBuiltUI];
