"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { redirectToAuth } from "supertokens-auth-react";
import { signOut, useSessionContext } from "supertokens-auth-react/recipe/session";

const buttonClass =
  "flex h-12 w-full items-center justify-center rounded-full px-5 text-base font-medium transition-colors md:w-[158px]";
const primaryClass = `${buttonClass} bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc]`;
const secondaryClass = `${buttonClass} border border-solid border-black/[.08] hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]`;

export function AuthButtons() {
  const router = useRouter();
  const session = useSessionContext();
  const [displayName, setDisplayName] = useState<string | null>(null);

  const signedIn = !session.loading && session.doesSessionExist;

  useEffect(() => {
    if (!signedIn) {
      setDisplayName(null);
      return;
    }

    let active = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setDisplayName(data.email ?? data.userId);
        }
      })
      .catch(() => {
        // Falls back to the session's user id below.
      });

    return () => {
      active = false;
    };
  }, [signedIn]);

  if (session.loading) {
    return <div className="h-12" />;
  }

  if (!session.doesSessionExist) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row">
        <button className={primaryClass} onClick={() => redirectToAuth({ show: "signup" })}>
          Sign up
        </button>
        <button className={secondaryClass} onClick={() => redirectToAuth({ show: "signin" })}>
          Log in
        </button>
      </div>
    );
  }

  async function onSignOut() {
    await signOut();
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-lg text-zinc-950 dark:text-zinc-50">
        Welcome! <span className="font-medium break-all">{displayName ?? session.userId}</span>
      </p>
      <button className={secondaryClass} onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
