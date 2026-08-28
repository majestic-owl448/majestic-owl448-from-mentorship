import Link from "next/link";
import { ModerationQueue } from "@/app/components/moderationQueue";
import { SessionAuthForNextJS } from "@/app/components/sessionAuthForNextJS";

export default function ModerationPage() {
  return (
    <SessionAuthForNextJS>
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16 sm:px-16 sm:py-24">
        <nav aria-label="Moderation navigation" className="mb-8">
          <Link href="/dashboard" className="underline underline-offset-4">
            Dashboard
          </Link>
        </nav>
        <ModerationQueue />
      </main>
    </SessionAuthForNextJS>
  );
}
