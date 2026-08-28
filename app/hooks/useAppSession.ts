"use client";

import { useEffect, useState } from "react";
import {
  signOut,
  useSessionContext,
} from "supertokens-auth-react/recipe/session";
import { isDevelopmentAuthClientEnabled } from "@/lib/developmentAuth";

type AppSession =
  | { loading: true; doesSessionExist: false; userId: null }
  | { loading: false; doesSessionExist: false; userId: null }
  | { loading: false; doesSessionExist: true; userId: string };

export function useAppSession(): AppSession {
  const session = useSessionContext();
  const developmentAuth = isDevelopmentAuthClientEnabled();
  const [developmentSession, setDevelopmentSession] = useState<AppSession>({
    loading: true,
    doesSessionExist: false,
    userId: null,
  });

  useEffect(() => {
    if (!developmentAuth) return;

    const controller = new AbortController();
    fetch("/api/me", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { userId: string };
      })
      .then((profile) => {
        if (profile) {
          setDevelopmentSession({
            loading: false,
            doesSessionExist: true,
            userId: profile.userId,
          });
        } else {
          setDevelopmentSession({
            loading: false,
            doesSessionExist: false,
            userId: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          setDevelopmentSession({
            loading: false,
            doesSessionExist: false,
            userId: null,
          });
        }
      });

    return () => controller.abort();
  }, [developmentAuth]);

  if (developmentAuth) return developmentSession;
  if (session.loading) {
    return { loading: true, doesSessionExist: false, userId: null };
  }
  if (!session.doesSessionExist) {
    return { loading: false, doesSessionExist: false, userId: null };
  }
  return {
    loading: false,
    doesSessionExist: true,
    userId: session.userId,
  };
}

export async function signOutAppSession() {
  if (isDevelopmentAuthClientEnabled()) {
    await fetch("/api/dev-auth/logout", { method: "POST" });
    return;
  }
  await signOut();
}
