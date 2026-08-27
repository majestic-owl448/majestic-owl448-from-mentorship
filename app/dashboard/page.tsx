"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSessionContext } from "supertokens-auth-react/recipe/session";
import {
  InitialPostalEntitySettingForm,
  type SavedPostalEntitySetting,
  type SettingOption,
} from "@/app/components/initialPostalEntitySettingForm";
import { SessionAuthForNextJS } from "@/app/components/sessionAuthForNextJS";

type SettingsResponse = {
  complete: boolean;
  activePostalEntitySetting: SavedPostalEntitySetting | null;
  options: {
    countries: SettingOption[];
    currencies: SettingOption[];
  };
};

function DashboardContent() {
  const router = useRouter();
  const session = useSessionContext();
  const userId =
    !session.loading && session.doesSessionExist ? session.userId : null;
  const [loaded, setLoaded] = useState<{
    userId: string;
    data: SettingsResponse;
  } | null>(null);
  const [loadError, setLoadError] = useState<{
    userId: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/settings", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Postal entity settings could not be loaded.");
        }
        return (await response.json()) as SettingsResponse;
      })
      .then((data) => setLoaded({ userId, data }))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setLoadError({ userId, message: error.message });
        }
      });

    return () => controller.abort();
  }, [userId]);

  const settings = loaded?.userId === userId ? loaded.data : null;
  const currentLoadError =
    loadError?.userId === userId ? loadError.message : null;

  if (session.loading || !settings) {
    return (
      <p role={currentLoadError ? "alert" : undefined} className="text-zinc-600 dark:text-zinc-400">
        {currentLoadError ?? "Loading postal entity settings…"}
      </p>
    );
  }

  async function onSignOut() {
    await signOut();
    router.push("/auth");
  }

  const activeSetting = settings.activePostalEntitySetting;

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Stamp Inventory
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {activeSetting ? "Active postal entity" : "Set up your inventory"}
        </h1>
        <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
          {activeSetting
            ? "This postal entity controls which stamps and rates can contribute to inventory value."
            : "Submit a postal entity and save its country, display currency, and timezone before opening inventory features."}
        </p>
      </div>

      {activeSetting ? (
        <dl className="grid max-w-lg grid-cols-[max-content_1fr] gap-x-5 gap-y-3">
          <dt className="font-medium">Postal entity</dt>
          <dd>{activeSetting.postalEntity.name}</dd>
          <dt className="font-medium">Country</dt>
          <dd>{activeSetting.postalEntity.countryCode}</dd>
          <dt className="font-medium">Registry status</dt>
          <dd className="lowercase">{activeSetting.postalEntity.status}</dd>
          <dt className="font-medium">Display currency</dt>
          <dd>{activeSetting.displayCurrencyCode}</dd>
          <dt className="font-medium">Timezone</dt>
          <dd>{activeSetting.timeZone}</dd>
          <dt className="font-medium">Timezone mode</dt>
          <dd className="lowercase">{activeSetting.timeZoneMode}</dd>
        </dl>
      ) : (
        <InitialPostalEntitySettingForm
          countries={settings.options.countries}
          currencies={settings.options.currencies}
          onSaved={(savedSetting) =>
            setLoaded((current) =>
              current?.userId === userId
                ? {
                    ...current,
                    data: {
                      ...current.data,
                      complete: true,
                      activePostalEntitySetting: savedSetting,
                    },
                  }
                : current
            )
          }
        />
      )}

      <button
        onClick={onSignOut}
        className="h-10 w-32 rounded-full border border-zinc-300 text-sm font-medium dark:border-zinc-700"
      >
        Sign out
      </button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SessionAuthForNextJS>
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16 sm:px-16 sm:py-32">
        <DashboardContent />
      </main>
    </SessionAuthForNextJS>
  );
}
