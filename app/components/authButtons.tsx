"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { redirectToAuth } from "supertokens-auth-react";
import {
  signOutAppSession,
  useAppSession,
} from "@/app/hooks/useAppSession";
import { isDevelopmentAuthClientEnabled } from "@/lib/developmentAuth";

const buttonClass =
  "flex h-12 w-full items-center justify-center rounded-full px-5 text-base font-medium transition-colors md:w-[158px]";
const primaryClass = `${buttonClass} bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc]`;
const secondaryClass = `${buttonClass} border border-solid border-black/[.08] hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]`;

export function AuthButtons() {
  const router = useRouter();
  const session = useAppSession();
  const [displayName, setDisplayName] = useState<{
    userId: string;
    value: string;
  } | null>(null);

  const userId =
    !session.loading && session.doesSessionExist ? session.userId : null;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setDisplayName({ userId, value: data.email ?? data.userId });
        }
      })
      .catch(() => {
        // Falls back to the session's user id below.
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (session.loading) {
    return <div className="h-12" />;
  }

  if (!session.doesSessionExist) {
    if (isDevelopmentAuthClientEnabled()) {
      return (
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            className={primaryClass}
            href="/api/dev-auth/user"
            prefetch={false}
          >
            Use normal test user
          </Link>
          <Link
            className={secondaryClass}
            href="/api/dev-auth/moderator"
            prefetch={false}
          >
            Use moderator test user
          </Link>
        </div>
      );
    }

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
    await signOutAppSession();
    router.refresh();
  }

  const currentDisplayName =
    displayName?.userId === session.userId ? displayName.value : session.userId;

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-lg text-zinc-950 dark:text-zinc-50">
        Welcome! <span className="font-medium break-all">{currentDisplayName}</span>
      </p>
      <button className={secondaryClass} onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
