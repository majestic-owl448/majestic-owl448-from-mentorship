"use client";

import { useEffect } from "react";
import { redirectToAuth } from "supertokens-auth-react";
import SuperTokens from "supertokens-auth-react/ui";
import { PreBuiltUIList } from "@/app/config/frontend";
import { useIsMounted } from "@/app/hooks/useIsMounted";

export default function Auth() {
  const isMounted = useIsMounted();
  const canHandleRoute =
    isMounted && SuperTokens.canHandleRoute(PreBuiltUIList);

  useEffect(() => {
    // Anything under /auth that SuperTokens does not own (e.g. /auth/random)
    // goes back to the sign-in screen.
    if (isMounted && !canHandleRoute) {
      redirectToAuth({ redirectBack: false });
    }
  }, [canHandleRoute, isMounted]);

  if (!canHandleRoute) {
    return null;
  }

  return <>{SuperTokens.getRoutingComponent(PreBuiltUIList)}</>;
}
