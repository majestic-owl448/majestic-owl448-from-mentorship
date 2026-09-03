"use client";

import { AccountDataDownload } from "@/app/components/accountDataDownload";
import { AccountDeletion } from "@/app/components/accountDeletion";
import { AuthenticatedNavigation } from "@/app/components/authenticatedNavigation";
import { SessionAuthForNextJS } from "@/app/components/sessionAuthForNextJS";

function SettingsContent() {
  return (
    <div className="flex w-full flex-col gap-10">
      <AuthenticatedNavigation />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Stamp Inventory
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
          Manage your account and personal data.
        </p>
      </div>
      <section className="flex flex-col gap-4" aria-labelledby="account-data-heading">
        <h2 id="account-data-heading" className="text-xl font-semibold">Account data</h2>
        <AccountDataDownload />
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="delete-account-heading">
        <h2 id="delete-account-heading" className="text-xl font-semibold">Delete account</h2>
        <AccountDeletion />
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SessionAuthForNextJS>
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16 sm:px-16 sm:py-24">
        <SettingsContent />
      </main>
    </SessionAuthForNextJS>
  );
}
