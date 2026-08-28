"use client";

import { useState } from "react";

function filenameFrom(response: Response) {
  const disposition = response.headers.get("Content-Disposition");
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? "stamp-inventory-export.json";
}

export function AccountDataDownload() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        throw new Error("Your data export could not be created. Try again.");
      }

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFrom(response);
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Your data export could not be created. Try again.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <div>
        <h2 className="text-xl font-semibold">Download your data</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Save your account, settings, inventory, proposals, and linked shared data as JSON.
        </p>
      </div>
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className="h-10 w-fit rounded-full border border-zinc-300 px-5 text-sm font-medium disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700"
      >
        {downloading ? "Preparing download…" : "Download my data as JSON"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
