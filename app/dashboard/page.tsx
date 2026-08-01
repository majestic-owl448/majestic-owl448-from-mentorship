"use client";

import { useRouter } from "next/navigation";
import { signOut } from "supertokens-auth-react/recipe/session";
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { SessionAuthForNextJS } from "@/app/components/sessionAuthForNextJS";

function DashboardContent() {
  const router = useRouter();
  const session = useSessionContext();

  if (session.loading) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>;
  }

  async function onSignOut() {
    await signOut();
    router.push("/auth");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Signed in</h1>
      <dl className="flex flex-col gap-2 text-sm">
        <div>
          <dt className="text-zinc-500">User ID</dt>
          <dd className="font-mono break-all">{session.userId}</dd>
        </div>
      </dl>
      <button
        onClick={onSignOut}
        className="h-10 w-32 rounded-full bg-foreground text-background text-sm font-medium"
      >
        Sign out
      </button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SessionAuthForNextJS>
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-16 py-32">
        <DashboardContent />
      </main>
    </SessionAuthForNextJS>
  );
}
