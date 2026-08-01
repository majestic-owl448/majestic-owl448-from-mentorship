"use client";

import { useEffect, useState } from "react";
import { redirectToAuth } from "supertokens-auth-react";
import SuperTokens from "supertokens-auth-react/ui";
import { PreBuiltUIList } from "@/app/config/frontend";

export default function Auth() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Anything under /auth that SuperTokens does not own (e.g. /auth/random)
    // goes back to the sign-in screen.
    if (SuperTokens.canHandleRoute(PreBuiltUIList) === false) {
      redirectToAuth({ redirectBack: false });
    } else {
      setLoaded(true);
    }
  }, []);

  if (!loaded) {
    return null;
  }

  return <>{SuperTokens.getRoutingComponent(PreBuiltUIList)}</>;
}
