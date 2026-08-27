"use client";

import { FormEvent, useState } from "react";
import { useIsMounted } from "@/app/hooks/useIsMounted";
import type {
  CountrySettingField,
  CountrySettingFieldErrors,
} from "@/lib/countrySettingValidation";

export type SettingOption = {
  value: string;
  label: string;
};

export type SavedCountrySetting = {
  id: string;
  userId: string;
  countryCode: string;
  displayCurrencyCode: string;
  timeZone: string;
  timeZoneMode: "SYSTEM" | "CUSTOM";
};

type Props = {
  countries: SettingOption[];
  currencies: SettingOption[];
  onSaved: (setting: SavedCountrySetting) => void;
};

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-950 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900";

function describedBy(field: CountrySettingField, hasError: boolean) {
  const ids = [`${field}-hint`];
  if (hasError) {
    ids.push(`${field}-error`);
  }
  return ids.join(" ");
}

function FieldError({
  field,
  errors,
}: {
  field: CountrySettingField;
  errors: CountrySettingFieldErrors;
}) {
  const message = errors[field];
  if (!message) {
    return null;
  }

  return (
    <p id={`${field}-error`} className="text-sm text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}

export function InitialCountrySettingForm({
  countries,
  currencies,
  onSaved,
}: Props) {
  const isMounted = useIsMounted();
  const systemTimeZone = isMounted
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    : "UTC";
  const [countryCode, setCountryCode] = useState("");
  const [displayCurrencyCode, setDisplayCurrencyCode] = useState("");
  const [timeZoneMode, setTimeZoneMode] = useState<"SYSTEM" | "CUSTOM">(
    "SYSTEM"
  );
  const [customTimeZone, setCustomTimeZone] = useState("");
  const [errors, setErrors] = useState<CountrySettingFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSubmitError(null);

    try {
      const response = await fetch("/api/settings/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode,
          displayCurrencyCode,
          timeZoneMode,
          timeZone:
            timeZoneMode === "SYSTEM" ? systemTimeZone : customTimeZone,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setSubmitError(result.error ?? "The country setting could not be saved.");
        }
        return;
      }

      onSaved(result.activeCountrySetting);
    } catch {
      setSubmitError("The country setting could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="countryCode" className="font-medium">
          Country
        </label>
        <p id="countryCode-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose the country whose stamps you want to value first.
        </p>
        <select
          id="countryCode"
          name="countryCode"
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
          aria-invalid={Boolean(errors.countryCode)}
          aria-describedby={describedBy("countryCode", Boolean(errors.countryCode))}
          className={inputClass}
          required
        >
          <option value="">Select a country</option>
          {countries.map((country) => (
            <option key={country.value} value={country.value}>
              {country.label}
            </option>
          ))}
        </select>
        <FieldError field="countryCode" errors={errors} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="displayCurrencyCode" className="font-medium">
          Display currency
        </label>
        <p
          id="displayCurrencyCode-hint"
          className="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Inventory values will be shown in this currency.
        </p>
        <select
          id="displayCurrencyCode"
          name="displayCurrencyCode"
          value={displayCurrencyCode}
          onChange={(event) => setDisplayCurrencyCode(event.target.value)}
          aria-invalid={Boolean(errors.displayCurrencyCode)}
          aria-describedby={describedBy(
            "displayCurrencyCode",
            Boolean(errors.displayCurrencyCode)
          )}
          className={inputClass}
          required
        >
          <option value="">Select a currency</option>
          {currencies.map((currency) => (
            <option key={currency.value} value={currency.value}>
              {currency.label}
            </option>
          ))}
        </select>
        <FieldError field="displayCurrencyCode" errors={errors} />
      </div>

      <fieldset
        aria-invalid={Boolean(errors.timeZoneMode)}
        aria-describedby={describedBy(
          "timeZoneMode",
          Boolean(errors.timeZoneMode)
        )}
        className="flex flex-col gap-2"
      >
        <legend className="font-medium">Timezone mode</legend>
        <p id="timeZoneMode-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          Use the browser timezone or enter another IANA timezone.
        </p>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="timeZoneMode"
            value="SYSTEM"
            checked={timeZoneMode === "SYSTEM"}
            onChange={() => setTimeZoneMode("SYSTEM")}
          />
          System ({systemTimeZone})
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="timeZoneMode"
            value="CUSTOM"
            checked={timeZoneMode === "CUSTOM"}
            onChange={() => setTimeZoneMode("CUSTOM")}
          />
          Custom
        </label>
        <FieldError field="timeZoneMode" errors={errors} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="timeZone" className="font-medium">
          IANA timezone
        </label>
        <p id="timeZone-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          Examples: Europe/Rome, America/New_York, or UTC.
        </p>
        <input
          id="timeZone"
          name="timeZone"
          type="text"
          value={timeZoneMode === "SYSTEM" ? systemTimeZone : customTimeZone}
          onChange={(event) => setCustomTimeZone(event.target.value)}
          readOnly={timeZoneMode === "SYSTEM"}
          aria-invalid={Boolean(errors.timeZone)}
          aria-describedby={describedBy("timeZone", Boolean(errors.timeZone))}
          className={inputClass}
          required
        />
        <FieldError field="timeZone" errors={errors} />
      </div>

      {submitError ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="h-11 rounded-full bg-foreground px-5 text-sm font-medium text-background disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save country setting"}
      </button>
    </form>
  );
}
