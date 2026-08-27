"use client";

import { FormEvent, useState } from "react";
import {
  InitialPostalEntitySettingForm,
  type SavedPostalEntitySetting,
  type SettingOption,
} from "@/app/components/initialPostalEntitySettingForm";
import { useIsMounted } from "@/app/hooks/useIsMounted";
import type { PostalEntitySettingFieldErrors } from "@/lib/postalEntitySettingValidation";

type Props = {
  activeSettingId: string | null;
  countries: SettingOption[];
  currencies: SettingOption[];
  settings: SavedPostalEntitySetting[];
  onAdded: (setting: SavedPostalEntitySetting) => void;
  onActivated: (setting: SavedPostalEntitySetting) => void;
  onUpdated: (setting: SavedPostalEntitySetting) => void;
};

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-950 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900";

function SettingEditor({
  currencies,
  setting,
  onUpdated,
}: {
  currencies: SettingOption[];
  setting: SavedPostalEntitySetting;
  onUpdated: (setting: SavedPostalEntitySetting) => void;
}) {
  const isMounted = useIsMounted();
  const systemTimeZone = isMounted
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    : "UTC";
  const [displayCurrencyCode, setDisplayCurrencyCode] = useState(
    setting.displayCurrencyCode
  );
  const [timeZoneMode, setTimeZoneMode] = useState<"SYSTEM" | "CUSTOM">(
    setting.timeZoneMode
  );
  const [customTimeZone, setCustomTimeZone] = useState(
    setting.timeZoneMode === "CUSTOM" ? setting.timeZone : ""
  );
  const [errors, setErrors] = useState<PostalEntitySettingFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const prefix = `setting-${setting.id}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSubmitError(null);

    try {
      const response = await fetch(
        `/api/settings/postal-entities/${setting.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayCurrencyCode,
            timeZoneMode,
            timeZone:
              timeZoneMode === "SYSTEM" ? systemTimeZone : customTimeZone,
          }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setSubmitError(result.error ?? "The setting could not be updated.");
        }
        return;
      }

      onUpdated(result.postalEntitySetting);
    } catch {
      setSubmitError("The setting could not be updated.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${prefix}-currency`} className="font-medium">
          Display currency
        </label>
        <select
          id={`${prefix}-currency`}
          value={displayCurrencyCode}
          onChange={(event) => setDisplayCurrencyCode(event.target.value)}
          aria-invalid={Boolean(errors.displayCurrencyCode)}
          aria-describedby={
            errors.displayCurrencyCode ? `${prefix}-currency-error` : undefined
          }
          className={inputClass}
        >
          {currencies.map((currency) => (
            <option key={currency.value} value={currency.value}>
              {currency.label}
            </option>
          ))}
        </select>
        {errors.displayCurrencyCode ? (
          <p id={`${prefix}-currency-error`} className="text-sm text-red-700 dark:text-red-400">
            {errors.displayCurrencyCode}
          </p>
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">Timezone mode</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`${prefix}-timeZoneMode`}
            value="SYSTEM"
            checked={timeZoneMode === "SYSTEM"}
            onChange={() => setTimeZoneMode("SYSTEM")}
          />
          System ({systemTimeZone})
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`${prefix}-timeZoneMode`}
            value="CUSTOM"
            checked={timeZoneMode === "CUSTOM"}
            onChange={() => setTimeZoneMode("CUSTOM")}
          />
          Custom
        </label>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${prefix}-time-zone`} className="font-medium">
          IANA timezone
        </label>
        <input
          id={`${prefix}-time-zone`}
          type="text"
          value={timeZoneMode === "SYSTEM" ? systemTimeZone : customTimeZone}
          onChange={(event) => setCustomTimeZone(event.target.value)}
          readOnly={timeZoneMode === "SYSTEM"}
          aria-invalid={Boolean(errors.timeZone)}
          aria-describedby={
            errors.timeZone ? `${prefix}-time-zone-error` : undefined
          }
          className={inputClass}
          required
        />
        {errors.timeZone ? (
          <p id={`${prefix}-time-zone-error`} className="text-sm text-red-700 dark:text-red-400">
            {errors.timeZone}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="h-10 self-start rounded-full border border-zinc-300 px-5 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
      >
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function PostalEntitySettingsManager({
  activeSettingId,
  countries,
  currencies,
  settings,
  onAdded,
  onActivated,
  onUpdated,
}: Props) {
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const activeSetting = settings.find((setting) => setting.id === activeSettingId);

  async function activate(settingId: string) {
    setActivating(true);
    setActivationError(null);
    try {
      const response = await fetch("/api/settings/active-postal-entity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setActivationError(result.error ?? "The active setting could not be changed.");
        return;
      }
      onActivated(result.activePostalEntitySetting);
    } catch {
      setActivationError("The active setting could not be changed.");
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {settings.length > 0 ? (
        <section className="flex max-w-lg flex-col gap-3" aria-labelledby="active-setting-heading">
          <h2 id="active-setting-heading" className="text-xl font-semibold">
            Active postal entity
          </h2>
          <label htmlFor="activePostalEntitySetting" className="font-medium">
            Postal entity used for valuation
          </label>
          <select
            id="activePostalEntitySetting"
            value={activeSettingId ?? ""}
            onChange={(event) => void activate(event.target.value)}
            disabled={activating}
            className={inputClass}
          >
            {settings.map((setting) => (
              <option key={setting.id} value={setting.id}>
                {setting.postalEntity.name} ({setting.postalEntity.countryCode})
              </option>
            ))}
          </select>
          <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
            Current selection: {activeSetting?.postalEntity.name ?? "None"}
          </p>
          {activationError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {activationError}
            </p>
          ) : null}
        </section>
      ) : null}

      {settings.length > 0 ? (
        <section className="flex flex-col gap-6" aria-labelledby="saved-settings-heading">
          <h2 id="saved-settings-heading" className="text-xl font-semibold">
            Saved settings
          </h2>
          {settings.map((setting) => (
            <article key={setting.id} className="flex max-w-lg flex-col gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold">{setting.postalEntity.name}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Country: {setting.postalEntity.countryCode}. Registry status: {setting.postalEntity.status.toLowerCase()}.
                  {setting.id === activeSettingId ? " Active for valuation." : ""}
                </p>
              </div>
              <SettingEditor
                currencies={currencies}
                setting={setting}
                onUpdated={onUpdated}
              />
            </article>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-5" aria-labelledby="add-setting-heading">
        <div className="flex flex-col gap-2">
          <h2 id="add-setting-heading" className="text-xl font-semibold">
            {settings.length === 0 ? "Add your first postal entity" : "Add another postal entity"}
          </h2>
          <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
            Each postal entity keeps its own display currency and timezone.
          </p>
        </div>
        <InitialPostalEntitySettingForm
          key={settings.length}
          countries={countries}
          currencies={currencies}
          onSaved={onAdded}
          submitLabel="Add postal entity"
        />
      </section>
    </div>
  );
}
