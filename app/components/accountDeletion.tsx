"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOutAppSession } from "@/app/hooks/useAppSession";

export function AccountDeletion() {
  const router = useRouter();
  const openButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    dialog.current?.close();
    setConfirmation("");
    setError(null);
    openButton.current?.focus();
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ?? "Account deletion could not be completed.",
        );
      }

      await signOutAppSession().catch(() => undefined);
      router.replace("/auth?accountDeleted=true");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Account deletion could not be completed.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 border-t border-red-200 pt-8 dark:border-red-950">
      <div>
        <h2 className="text-xl font-semibold text-red-800 dark:text-red-300">
          Delete your account
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Permanently remove your account and private data. Approved and merged
          shared contributions will remain without your identity.
        </p>
      </div>
      <button
        ref={openButton}
        type="button"
        onClick={() => {
          setConfirmation("");
          setError(null);
          dialog.current?.showModal();
        }}
        className="h-10 w-fit rounded-full border border-red-700 px-5 text-sm font-medium text-red-800 dark:border-red-400 dark:text-red-300"
      >
        Delete my account
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="account-deletion-title"
        aria-describedby="account-deletion-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!deleting) cancel();
        }}
        className="m-auto max-w-lg rounded-2xl border border-red-300 bg-background p-5 text-foreground backdrop:bg-black/50 dark:border-red-900"
      >
        <h3 id="account-deletion-title" className="text-lg font-semibold">
          Permanently delete your account?
        </h3>
        <p
          id="account-deletion-description"
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
        >
          This removes your sign-in, settings, inventory, and private proposals.
          This action cannot be undone.
        </p>
        <label className="mt-4 flex max-w-sm flex-col gap-2 text-sm font-medium">
          Type DELETE to confirm
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={deleting}
            autoComplete="off"
            className="h-10 rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={cancel}
            disabled={deleting}
            className="h-10 rounded-full border border-zinc-300 px-5 text-sm font-medium dark:border-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={deleteAccount}
            disabled={confirmation !== "DELETE" || deleting}
            className="h-10 rounded-full bg-red-700 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting account…" : "Permanently delete my account"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
      </dialog>
    </section>
  );
}
