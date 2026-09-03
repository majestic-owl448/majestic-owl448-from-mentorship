"use client";

import { FormEvent, useEffect, useState } from "react";
import { useIsMounted } from "@/app/hooks/useIsMounted";

type Preference = { timeZone: string; timeZoneMode: "SYSTEM" | "CUSTOM" };

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

async function savePreference(preference: Preference) {
  const response = await fetch("/api/settings/timezone", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preference),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? body.errors?.timeZone ?? "Timezone could not be saved.");
  return body as Preference;
}

export function SystemTimeZoneSync({ preference }: { preference: Preference }) {
  const mounted = useIsMounted();
  useEffect(() => {
    if (!mounted || preference.timeZoneMode !== "SYSTEM") return;
    const timeZone = browserTimeZone();
    if (timeZone !== preference.timeZone) void savePreference({ timeZone, timeZoneMode: "SYSTEM" });
  }, [mounted, preference]);
  return null;
}

export function TimeZoneSettings() {
  const mounted = useIsMounted();
  const systemTimeZone = mounted ? browserTimeZone() : "UTC";
  const [preference, setPreference] = useState<Preference | null>(null);
  const [customTimeZone, setCustomTimeZone] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) throw new Error("Timezone settings could not be loaded.");
        return response.json() as Promise<Preference>;
      })
      .then((next) => {
        setPreference(next);
        setCustomTimeZone(next.timeZoneMode === "CUSTOM" ? next.timeZone : "");
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Timezone settings could not be loaded."));
  }, []);

  useEffect(() => {
    if (!mounted || preference?.timeZoneMode !== "SYSTEM" || preference.timeZone === systemTimeZone) return;
    void savePreference({ timeZone: systemTimeZone, timeZoneMode: "SYSTEM" })
      .then(setPreference)
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Timezone could not be saved."));
  }, [mounted, preference, systemTimeZone]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preference) return;
    setStatus(null);
    try {
      const next = await savePreference({
        timeZone: preference.timeZoneMode === "SYSTEM" ? systemTimeZone : customTimeZone,
        timeZoneMode: preference.timeZoneMode,
      });
      setPreference(next);
      setStatus("Timezone saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Timezone could not be saved.");
    }
  }

  if (!preference) return <p role={status ? "alert" : undefined}>{status ?? "Loading timezone settings…"}</p>;

  return (
    <form onSubmit={submit} className="flex max-w-lg flex-col gap-3" noValidate>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Scheduled postage values use this timezone.</p>
      <label className="flex items-center gap-2">
        <input type="radio" checked={preference.timeZoneMode === "SYSTEM"} onChange={() => setPreference({ ...preference, timeZoneMode: "SYSTEM" })} />
        Use this browser&apos;s timezone ({systemTimeZone})
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" checked={preference.timeZoneMode === "CUSTOM"} onChange={() => setPreference({ ...preference, timeZoneMode: "CUSTOM" })} />
        Use another timezone
      </label>
      {preference.timeZoneMode === "CUSTOM" ? (
        <label className="flex flex-col gap-1" htmlFor="timeZone">IANA timezone
          <input id="timeZone" value={customTimeZone} onChange={(event) => setCustomTimeZone(event.target.value)} className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50" required />
        </label>
      ) : null}
      <button type="submit" className="h-10 w-fit rounded-full border border-zinc-300 px-5 text-sm font-medium dark:border-zinc-700">Save timezone</button>
      {status ? <p role="status">{status}</p> : null}
    </form>
  );
}
