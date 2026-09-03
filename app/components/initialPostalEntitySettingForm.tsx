"use client";

import { FormEvent, useState } from "react";
import type {
  PostalEntitySettingField,
  PostalEntitySettingFieldErrors,
} from "@/lib/postalEntitySettingValidation";

export type SettingOption = {
  value: string;
  label: string;
};

export type SavedPostalEntitySetting = {
  id: string;
  userId: string;
  displayCurrencyCode: string;
  postalEntity: {
    id: string;
    name: string;
    countryCode: string;
    issuingAuthority?: string;
    scope?: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "MERGED";
  };
};

type Props = {
  countries: SettingOption[];
  currencies: SettingOption[];
  onSaved: (setting: SavedPostalEntitySetting) => void;
  submitLabel?: string;
};

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-950 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900";

function describedBy(field: PostalEntitySettingField, hasError: boolean) {
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
  field: PostalEntitySettingField;
  errors: PostalEntitySettingFieldErrors;
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

export function InitialPostalEntitySettingForm({
  countries,
  currencies,
  onSaved,
  submitLabel = "Save postal entity setting",
}: Props) {
  const [postalEntityName, setPostalEntityName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [scope, setScope] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [displayCurrencyCode, setDisplayCurrencyCode] = useState("");
  const [errors, setErrors] = useState<PostalEntitySettingFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSubmitError(null);

    try {
      const response = await fetch("/api/settings/postal-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postalEntityName,
          countryCode,
          issuingAuthority,
          scope,
          sourceUrl,
          sourceNote,
          displayCurrencyCode,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setSubmitError(
            result.error ?? "The postal entity setting could not be saved."
          );
        }
        return;
      }

      onSaved(result.postalEntitySetting);
    } catch {
      setSubmitError("The postal entity setting could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-lg flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="postalEntityName" className="font-medium">
          Postal entity
        </label>
        <p
          id="postalEntityName-hint"
          className="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Enter the organization whose stamps you want to value first.
        </p>
        <input
          id="postalEntityName"
          name="postalEntityName"
          type="text"
          value={postalEntityName}
          onChange={(event) => setPostalEntityName(event.target.value)}
          aria-invalid={Boolean(errors.postalEntityName)}
          aria-describedby={describedBy(
            "postalEntityName",
            Boolean(errors.postalEntityName)
          )}
          className={inputClass}
          required
        />
        <FieldError field="postalEntityName" errors={errors} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="issuingAuthority" className="font-medium">
          Issuing authority
        </label>
        <p id="issuingAuthority-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          Name the organization that authorizes this entity&apos;s postage.
        </p>
        <input
          id="issuingAuthority"
          name="issuingAuthority"
          type="text"
          value={issuingAuthority}
          onChange={(event) => setIssuingAuthority(event.target.value)}
          aria-invalid={Boolean(errors.issuingAuthority)}
          aria-describedby={describedBy("issuingAuthority", Boolean(errors.issuingAuthority))}
          className={inputClass}
          required
        />
        <FieldError field="issuingAuthority" errors={errors} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="scope" className="font-medium">
          Geographic or office scope
        </label>
        <p id="scope-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          Describe the territory or office served, such as Italy or UN Office at New York.
        </p>
        <input
          id="scope"
          name="scope"
          type="text"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          aria-invalid={Boolean(errors.scope)}
          aria-describedby={describedBy("scope", Boolean(errors.scope))}
          className={inputClass}
          required
        />
        <FieldError field="scope" errors={errors} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="sourceUrl" className="font-medium">Source URL</label>
        <p id="sourceUrl-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter an HTTP or HTTPS source, or provide a source note below.
        </p>
        <input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          aria-invalid={Boolean(errors.sourceUrl)}
          aria-describedby={describedBy("sourceUrl", Boolean(errors.sourceUrl))}
          className={inputClass}
        />
        <FieldError field="sourceUrl" errors={errors} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="sourceNote" className="font-medium">Source note</label>
        <p id="sourceNote-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          Describe where the entity information came from if no URL is available.
        </p>
        <textarea
          id="sourceNote"
          name="sourceNote"
          value={sourceNote}
          onChange={(event) => setSourceNote(event.target.value)}
          aria-invalid={Boolean(errors.sourceNote)}
          aria-describedby={describedBy("sourceNote", Boolean(errors.sourceNote))}
          className="min-h-24 rounded-lg border border-zinc-300 bg-white p-3 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <FieldError field="sourceNote" errors={errors} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="countryCode" className="font-medium">
          Country
        </label>
        <p id="countryCode-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose the country where this postal entity operates.
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
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
