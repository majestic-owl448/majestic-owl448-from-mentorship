"use client";

import { useEffect } from "react";
import Link from "next/link";
import { redirectToAuth } from "supertokens-auth-react";
import SuperTokens from "supertokens-auth-react/ui";
import { PreBuiltUIList } from "@/app/config/frontend";
import { useIsMounted } from "@/app/hooks/useIsMounted";
import { isDevelopmentAuthClientEnabled } from "@/lib/developmentAuth";

export default function Auth() {
  const isMounted = useIsMounted();
  const developmentAuth = isDevelopmentAuthClientEnabled();
  const canHandleRoute =
    !developmentAuth && isMounted && SuperTokens.canHandleRoute(PreBuiltUIList);

  useEffect(() => {
    // Anything under /auth that SuperTokens does not own (e.g. /auth/random)
    // goes back to the sign-in screen.
    if (!developmentAuth && isMounted && !canHandleRoute) {
      redirectToAuth({ redirectBack: false });
    }
  }, [canHandleRoute, developmentAuth, isMounted]);

  if (developmentAuth) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6 py-16">
        <h1 className="text-3xl font-semibold">Choose a local test user</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Open each user in a separate browser or browser profile to keep both
          test sessions active at the same time.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            className="rounded-full bg-foreground px-5 py-3 text-center font-medium text-background"
            href="/api/dev-auth/user"
            prefetch={false}
          >
            Normal test user
          </Link>
          <Link
            className="rounded-full border border-zinc-300 px-5 py-3 text-center font-medium dark:border-zinc-700"
            href="/api/dev-auth/moderator"
            prefetch={false}
          >
            Moderator test user
          </Link>
        </div>
      </main>
    );
  }

  if (!canHandleRoute) {
    return null;
  }

  return <>{SuperTokens.getRoutingComponent(PreBuiltUIList)}</>;
}
