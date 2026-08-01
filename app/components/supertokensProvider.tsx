"use client";

import { usePathname, useRouter } from "next/navigation";
import SuperTokensReact, { SuperTokensWrapper } from "supertokens-auth-react";
import { frontendConfig, setRouter } from "@/app/config/frontend";

if (typeof window !== "undefined") {
  SuperTokensReact.init(frontendConfig());
}

export function SuperTokensProvider({ children }: { children: React.ReactNode }) {
  setRouter(useRouter(), usePathname() || window.location.pathname);

  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
}
