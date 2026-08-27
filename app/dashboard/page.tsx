"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSessionContext } from "supertokens-auth-react/recipe/session";
import type {
  SavedPostalEntitySetting,
  SettingOption,
} from "@/app/components/initialPostalEntitySettingForm";
import { PostalEntitySettingsManager } from "@/app/components/postalEntitySettingsManager";
import { NamedFaceValueProposals } from "@/app/components/namedFaceValueProposals";
import { SessionAuthForNextJS } from "@/app/components/sessionAuthForNextJS";
import { StampInventory } from "@/app/components/stampInventory";

type SettingsResponse = {
  complete: boolean;
  activePostalEntitySetting: SavedPostalEntitySetting | null;
  activeLocalDate: string | null;
  postalEntitySettings: SavedPostalEntitySetting[];
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
      <p
        role={currentLoadError ? "alert" : undefined}
        className="text-zinc-600 dark:text-zinc-400"
      >
        {currentLoadError ?? "Loading postal entity settings…"}
      </p>
    );
  }

  async function onSignOut() {
    await signOut();
    router.push("/auth");
  }

  function replaceSetting(updated: SavedPostalEntitySetting) {
    setLoaded((current) =>
      current?.userId === userId
        ? {
            ...current,
            data: {
              ...current.data,
              activePostalEntitySetting:
                current.data.activePostalEntitySetting?.id === updated.id
                  ? updated
                  : current.data.activePostalEntitySetting,
              postalEntitySettings: current.data.postalEntitySettings.map(
                (setting) => (setting.id === updated.id ? updated : setting)
              ),
            },
          }
        : current
    );
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Stamp Inventory
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Postal entity settings
        </h1>
        <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
          Choose the postal entity used for valuation and manage each entity&apos;s display currency and timezone.
        </p>
      </div>

      <PostalEntitySettingsManager
        activeSettingId={settings.activePostalEntitySetting?.id ?? null}
        countries={settings.options.countries}
        currencies={settings.options.currencies}
        settings={settings.postalEntitySettings}
        onAdded={(added) =>
          setLoaded((current) =>
            current?.userId === userId
              ? {
                  ...current,
                  data: {
                    ...current.data,
                    complete: true,
                    activePostalEntitySetting:
                      current.data.activePostalEntitySetting ?? added,
                    postalEntitySettings: [
                      ...current.data.postalEntitySettings,
                      added,
                    ],
                  },
                }
              : current
          )
        }
        onActivated={(active) =>
          setLoaded((current) =>
            current?.userId === userId
              ? {
                  ...current,
                  data: {
                    ...current.data,
                    activePostalEntitySetting: active,
                  },
                }
              : current
          )
        }
        onUpdated={replaceSetting}
      />

      {settings.activePostalEntitySetting && (
        <>
          <NamedFaceValueProposals
            activeCountryCode={settings.activePostalEntitySetting.postalEntity.countryCode}
            countries={settings.options.countries}
            currencies={settings.options.currencies}
          />
          <StampInventory
            activeCountryCode={
              settings.activePostalEntitySetting.postalEntity.countryCode
            }
            activeDisplayCurrencyCode={
              settings.activePostalEntitySetting.displayCurrencyCode
            }
            activePostalEntityId={
              settings.activePostalEntitySetting.postalEntity.id
            }
            countries={settings.options.countries}
            currencies={settings.options.currencies}
            postalEntities={settings.postalEntitySettings.map(
              (setting) => setting.postalEntity,
            )}
          />
        </>
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
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16 sm:px-16 sm:py-24">
        <DashboardContent />
      </main>
    </SessionAuthForNextJS>
  );
}
