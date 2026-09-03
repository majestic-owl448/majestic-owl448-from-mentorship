"use client";

import { FormEvent, useState } from "react";
import {
  InitialPostalEntitySettingForm,
  type SavedPostalEntitySetting,
  type SettingOption,
} from "@/app/components/initialPostalEntitySettingForm";
import type { PostalEntitySettingFieldErrors } from "@/lib/postalEntitySettingValidation";

type Props = {
  activeSettingId: string | null;
  countries: SettingOption[];
  currencies: SettingOption[];
  settings: SavedPostalEntitySetting[];
  availablePostalEntities?: SavedPostalEntitySetting["postalEntity"][];
  onAdded: (setting: SavedPostalEntitySetting) => void;
  onActivated: (setting: SavedPostalEntitySetting) => void;
  onUpdated: (setting: SavedPostalEntitySetting) => void;
};

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-950 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900";

function ExistingPostalEntitySettingForm({
  currencies,
  entities,
  onAdded,
}: {
  currencies: SettingOption[];
  entities: SavedPostalEntitySetting["postalEntity"][];
  onAdded: (setting: SavedPostalEntitySetting) => void;
}) {
  const [postalEntityId, setPostalEntityId] = useState("");
  const [displayCurrencyCode, setDisplayCurrencyCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/settings/postal-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postalEntityId,
          displayCurrencyCode,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.postalEntitySetting) {
        setStatus(result.error ?? "The approved postal entity could not be added.");
        return;
      }
      onAdded(result.postalEntitySetting);
      setStatus("Approved postal entity added.");
      setPostalEntityId("");
      setDisplayCurrencyCode("");
    } catch {
      setStatus("The approved postal entity could not be added.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-lg gap-4" aria-labelledby="use-approved-entity-heading">
      <h3 id="use-approved-entity-heading" className="text-lg font-semibold">Use an approved postal entity</h3>
      <div className="grid gap-1">
        <label htmlFor="approvedPostalEntity" className="font-medium">Approved postal entity</label>
        <select id="approvedPostalEntity" value={postalEntityId} onChange={(event) => setPostalEntityId(event.target.value)} className={inputClass} required>
          <option value="">Select a postal entity</option>
          {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} ({entity.countryCode})</option>)}
        </select>
      </div>
      <div className="grid gap-1">
        <label htmlFor="approvedEntityCurrency" className="font-medium">Display currency</label>
        <select id="approvedEntityCurrency" value={displayCurrencyCode} onChange={(event) => setDisplayCurrencyCode(event.target.value)} className={inputClass} required>
          <option value="">Select a currency</option>
          {currencies.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}
        </select>
      </div>
      <button type="submit" disabled={submitting || !postalEntityId || !displayCurrencyCode} className="h-10 w-fit rounded-full border border-zinc-300 px-5 disabled:opacity-60 dark:border-zinc-700">
        {submitting ? "Adding…" : "Add approved entity"}
      </button>
      {status && <p role="status">{status}</p>}
    </form>
  );
}

function RejectedEntityReplacement({
  availablePostalEntities,
  countries,
  setting,
  onUpdated,
  onActivated,
}: {
  availablePostalEntities: SavedPostalEntitySetting["postalEntity"][];
  countries: SettingOption[];
  setting: SavedPostalEntitySetting;
  onUpdated: (setting: SavedPostalEntitySetting) => void;
  onActivated: (setting: SavedPostalEntitySetting) => void;
}) {
  const [mode, setMode] = useState<"EXISTING" | "RESUBMIT">("EXISTING");
  const [postalEntityId, setPostalEntityId] = useState("");
  const [values, setValues] = useState({
    postalEntityName: setting.postalEntity.name,
    countryCode: setting.postalEntity.countryCode,
    issuingAuthority: setting.postalEntity.issuingAuthority ?? "",
    scope: setting.postalEntity.scope ?? "",
    sourceUrl: "",
    sourceNote: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setStatus(null);
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/settings/postal-entities/${setting.id}/replacement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mode === "EXISTING" ? { postalEntityId } : values),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.postalEntitySetting) {
        setErrors(result.errors ?? {});
        setStatus(result.error ?? "Choose or submit a replacement postal entity.");
        return;
      }
      onUpdated(result.postalEntitySetting);
      if (result.isActive) onActivated(result.postalEntitySetting);
      setStatus("Postal entity references replaced.");
    } catch {
      setStatus("The postal entity references could not be replaced.");
    } finally {
      setSubmitting(false);
    }
  }

  const fields = [
    ["postalEntityName", "Postal entity name"],
    ["issuingAuthority", "Issuing authority"],
    ["scope", "Geographic or office scope"],
    ["sourceUrl", "Source URL"],
    ["sourceNote", "Source note"],
  ] as const;

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-red-300 p-4 dark:border-red-800" noValidate>
      <p role="alert">
        This submission was rejected. Its linked settings and stamps cannot resolve until you replace it or resubmit corrected information.
      </p>
      <fieldset className="grid gap-2">
        <legend className="font-medium">Replacement method</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name={`replacement-${setting.id}`} checked={mode === "EXISTING"} onChange={() => setMode("EXISTING")} />
          Use an available postal entity
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name={`replacement-${setting.id}`} checked={mode === "RESUBMIT"} onChange={() => setMode("RESUBMIT")} />
          Resubmit corrected entity information
        </label>
      </fieldset>
      {mode === "EXISTING" ? (
        <div className="grid gap-1">
          <label htmlFor={`replacement-entity-${setting.id}`} className="font-medium">Replacement postal entity</label>
          <select id={`replacement-entity-${setting.id}`} value={postalEntityId} onChange={(event) => setPostalEntityId(event.target.value)} className={inputClass} required>
            <option value="">Select a postal entity</option>
            {availablePostalEntities.filter((entity) => entity.id !== setting.postalEntity.id).map((entity) => (
              <option key={entity.id} value={entity.id}>{entity.name} ({entity.countryCode})</option>
            ))}
          </select>
        </div>
      ) : (
        <>
          {fields.map(([field, label]) => (
            <div className="grid gap-1" key={field}>
              <label htmlFor={`${field}-${setting.id}`} className="font-medium">{label}</label>
              {field === "sourceNote" ? (
                <textarea id={`${field}-${setting.id}`} value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-${setting.id}-error` : undefined} className="min-h-20 rounded-lg border border-zinc-300 bg-transparent p-3" />
              ) : (
                <input id={`${field}-${setting.id}`} type={field === "sourceUrl" ? "url" : "text"} value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-${setting.id}-error` : undefined} className={inputClass} />
              )}
              {errors[field] && <p id={`${field}-${setting.id}-error`} role="alert">{errors[field]}</p>}
            </div>
          ))}
          <div className="grid gap-1">
            <label htmlFor={`replacement-country-${setting.id}`} className="font-medium">Country</label>
            <select id={`replacement-country-${setting.id}`} value={values.countryCode} onChange={(event) => setValues((current) => ({ ...current, countryCode: event.target.value }))} aria-invalid={Boolean(errors.countryCode)} aria-describedby={errors.countryCode ? `replacement-country-${setting.id}-error` : undefined} className={inputClass}>
              <option value="">Select a country</option>
              {countries.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}
            </select>
            {errors.countryCode && <p id={`replacement-country-${setting.id}-error`} role="alert">{errors.countryCode}</p>}
          </div>
        </>
      )}
      <button type="submit" disabled={submitting || (mode === "EXISTING" && !postalEntityId)} className="h-10 w-fit rounded-full bg-foreground px-5 text-background disabled:opacity-60">
        {submitting ? "Replacing…" : mode === "EXISTING" ? "Replace references" : "Resubmit and replace references"}
      </button>
      {status && <p role={errors && Object.keys(errors).length ? "alert" : "status"}>{status}</p>}
    </form>
  );
}

function SettingEditor({
  currencies,
  setting,
  onUpdated,
}: {
  currencies: SettingOption[];
  setting: SavedPostalEntitySetting;
  onUpdated: (setting: SavedPostalEntitySetting) => void;
}) {
  const [displayCurrencyCode, setDisplayCurrencyCode] = useState(
    setting.displayCurrencyCode
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
  availablePostalEntities = [],
  onAdded,
  onActivated,
  onUpdated,
}: Props) {
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const usableSettings = settings.filter((setting) => setting.postalEntity.status === "PENDING" || setting.postalEntity.status === "APPROVED");
  const activeSetting = usableSettings.find((setting) => setting.id === activeSettingId);
  const approvedEntitiesToAdd = availablePostalEntities.filter(
    (entity) =>
      entity.status === "APPROVED" &&
      !settings.some((setting) => setting.postalEntity.id === entity.id),
  );
  const [addMethod, setAddMethod] = useState<"EXISTING" | "CREATE">(
    approvedEntitiesToAdd.length > 0 ? "EXISTING" : "CREATE",
  );

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

  function handleAdded(setting: SavedPostalEntitySetting) {
    onAdded(setting);
    if (approvedEntitiesToAdd.length === 1) {
      setAddMethod("CREATE");
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {usableSettings.length > 0 ? (
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
            {usableSettings.map((setting) => (
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
            Postal entity details
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
              {(setting.postalEntity.status === "PENDING" || setting.postalEntity.status === "APPROVED") && (
                <SettingEditor currencies={currencies} setting={setting} onUpdated={onUpdated} />
              )}
              {setting.postalEntity.status === "REJECTED" && (
                <RejectedEntityReplacement availablePostalEntities={availablePostalEntities} countries={countries} setting={setting} onUpdated={onUpdated} onActivated={onActivated} />
              )}
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
            Select an available postal entity, or create one for this stamp workflow.
          </p>
        </div>
        {approvedEntitiesToAdd.length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium">Postal entity option</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="postal-entity-method" checked={addMethod === "EXISTING"} onChange={() => setAddMethod("EXISTING")} />
              Choose an available postal entity
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="postal-entity-method" checked={addMethod === "CREATE"} onChange={() => setAddMethod("CREATE")} />
              Create a postal entity
            </label>
          </fieldset>
        ) : null}
        {addMethod === "EXISTING" && approvedEntitiesToAdd.length > 0 ? (
          <ExistingPostalEntitySettingForm currencies={currencies} entities={approvedEntitiesToAdd} onAdded={handleAdded} />
        ) : null}
        {addMethod === "CREATE" ? (
          <InitialPostalEntitySettingForm key={settings.length} countries={countries} currencies={currencies} onSaved={handleAdded} submitLabel="Add postal entity" />
        ) : null}
      </section>
    </div>
  );
}
