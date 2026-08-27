"use client";

import { SessionAuth } from "supertokens-auth-react/recipe/session";
import { useIsMounted } from "@/app/hooks/useIsMounted";

type Props = Parameters<typeof SessionAuth>[0] & {
  children?: React.ReactNode;
};

/**
 * SessionAuth reads from browser storage, so rendering it during SSR would cause
 * a hydration mismatch. Render children as-is on the server, then wrap them once
 * we are on the client.
 */
export function SessionAuthForNextJS(props: Props) {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return props.children;
  }

  return <SessionAuth {...props}>{props.children}</SessionAuth>;
}
