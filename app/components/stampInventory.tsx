"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SettingOption } from "@/app/components/initialPostalEntitySettingForm";

type StampValue = {
  amount: string;
  currencyCode: string;
};

type SavedStamp = {
  id: string;
  countryCode: string;
  name: string;
  yearOfIssue: number | null;
  faceAmount: string;
  faceCurrencyCode: string;
  manualPostageAmount: string | null;
  manualPostageCurrencyCode: string | null;
  quantityOwned: number;
  quantityAnnulled: number;
  usableQuantity: number;
  expired: boolean;
  unitPostageValue: (StampValue & { source: string }) | null;
  totalPostageValue: StampValue | null;
};

type InventoryResponse = {
  activeCountryCode: string;
  displayCurrencyCode: string;
  stamps: SavedStamp[];
};

type StampErrors = Partial<
  Record<
    | "countryCode"
    | "name"
    | "yearOfIssue"
    | "faceAmount"
    | "faceCurrencyCode"
    | "manualPostageAmount"
    | "manualPostageCurrencyCode"
    | "quantityOwned"
    | "quantityAnnulled",
    string
  >
>;

function Money({ value }: { value: StampValue }) {
  const amount = Number(value.amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: value.currencyCode,
      maximumFractionDigits: 20,
    }).format(amount);
  } catch {
    return `${value.amount} ${value.currencyCode}`;
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-red-700 dark:text-red-300">
      {message}
    </p>
  ) : null;
}

export function StampInventory({
  activeCountryCode,
  activeDisplayCurrencyCode,
  countries,
  currencies,
}: {
  activeCountryCode: string;
  activeDisplayCurrencyCode: string;
  countries: SettingOption[];
  currencies: SettingOption[];
}) {
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<StampErrors>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stamps", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Stamp inventory could not be loaded.");
        }
        return (await response.json()) as InventoryResponse;
      })
      .then(setInventory)
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name !== "AbortError") {
          setLoadError(caught.message);
        }
      });
    return () => controller.abort();
  }, [activeCountryCode, activeDisplayCurrencyCode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setStatus(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/stamps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: data.get("countryCode"),
        name: data.get("name"),
        yearOfIssue: data.get("yearOfIssue"),
        faceAmount: data.get("faceAmount"),
        faceCurrencyCode: data.get("faceCurrencyCode"),
        manualPostageAmount: data.get("manualPostageAmount"),
        manualPostageCurrencyCode: data.get("manualPostageCurrencyCode"),
        quantityOwned: data.get("quantityOwned"),
        quantityAnnulled: data.get("quantityAnnulled"),
        expired: data.get("expired") === "on",
      }),
    });
    const result = (await response.json()) as {
      stamp?: SavedStamp;
      errors?: StampErrors;
      error?: string;
    };
    if (!response.ok || !result.stamp) {
      setErrors(result.errors ?? {});
      setStatus(result.error ?? "Correct the highlighted stamp fields.");
      return;
    }

    setInventory((current) =>
      current ? { ...current, stamps: [...current.stamps, result.stamp!] } : current,
    );
    form.reset();
    const country = form.elements.namedItem("countryCode") as HTMLSelectElement;
    const faceCurrency = form.elements.namedItem(
      "faceCurrencyCode",
    ) as HTMLInputElement;
    country.value = activeCountryCode;
    faceCurrency.value = activeDisplayCurrencyCode;
    setStatus("Stamp added to inventory.");
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="stamp-inventory-heading">
      <div>
        <h2 id="stamp-inventory-heading" className="text-2xl font-semibold">
          Stamp inventory
        </h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Add monetary stamps and see their postage value for the active country.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div>
          <label htmlFor="stamp-country" className="block font-medium">Country</label>
          <select id="stamp-country" name="countryCode" defaultValue={activeCountryCode} aria-describedby={errors.countryCode ? "stamp-country-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
            {countries.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <FieldError id="stamp-country-error" message={errors.countryCode} />
        </div>
        <div>
          <label htmlFor="stamp-name" className="block font-medium">Stamp name</label>
          <input id="stamp-name" name="name" aria-describedby={errors.name ? "stamp-name-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="stamp-name-error" message={errors.name} />
        </div>
        <div>
          <label htmlFor="stamp-year" className="block font-medium">Year of issue (optional)</label>
          <input id="stamp-year" name="yearOfIssue" inputMode="numeric" aria-describedby={errors.yearOfIssue ? "stamp-year-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="stamp-year-error" message={errors.yearOfIssue} />
        </div>
        <div>
          <label htmlFor="face-amount" className="block font-medium">Monetary face amount</label>
          <input id="face-amount" name="faceAmount" inputMode="decimal" aria-describedby={errors.faceAmount ? "face-amount-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="face-amount-error" message={errors.faceAmount} />
        </div>
        <div>
          <label htmlFor="face-currency" className="block font-medium">Face currency</label>
          <input id="face-currency" name="faceCurrencyCode" list="stamp-currency-options" defaultValue={activeDisplayCurrencyCode} maxLength={3} autoCapitalize="characters" aria-describedby={errors.faceCurrencyCode ? "face-currency-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="face-currency-error" message={errors.faceCurrencyCode} />
        </div>
        <div>
          <label htmlFor="owned-quantity" className="block font-medium">Owned quantity</label>
          <input id="owned-quantity" name="quantityOwned" type="number" min="1" step="1" defaultValue="1" aria-describedby={errors.quantityOwned ? "owned-quantity-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="owned-quantity-error" message={errors.quantityOwned} />
        </div>
        <div>
          <label htmlFor="annulled-quantity" className="block font-medium">Annulled quantity</label>
          <input id="annulled-quantity" name="quantityAnnulled" type="number" min="0" step="1" defaultValue="0" aria-describedby={errors.quantityAnnulled ? "annulled-quantity-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="annulled-quantity-error" message={errors.quantityAnnulled} />
        </div>
        <div className="flex items-center gap-2 self-end pb-2">
          <input id="stamp-expired" name="expired" type="checkbox" className="h-5 w-5" />
          <label htmlFor="stamp-expired" className="font-medium">Expired</label>
        </div>
        <fieldset className="grid gap-4 border-t border-zinc-300 pt-4 sm:col-span-2 sm:grid-cols-2 dark:border-zinc-700">
          <legend className="px-1 font-medium">Manual postage fallback (optional)</legend>
          <div>
            <label htmlFor="manual-amount" className="block font-medium">Manual postage amount</label>
            <input id="manual-amount" name="manualPostageAmount" inputMode="decimal" aria-describedby={errors.manualPostageAmount ? "manual-amount-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
            <FieldError id="manual-amount-error" message={errors.manualPostageAmount} />
          </div>
          <div>
            <label htmlFor="manual-currency" className="block font-medium">Manual postage currency</label>
            <input id="manual-currency" name="manualPostageCurrencyCode" list="stamp-currency-options" maxLength={3} autoCapitalize="characters" placeholder={activeDisplayCurrencyCode} aria-describedby={errors.manualPostageCurrencyCode ? "manual-currency-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
            <FieldError id="manual-currency-error" message={errors.manualPostageCurrencyCode} />
          </div>
        </fieldset>
        <datalist id="stamp-currency-options">
          {currencies.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </datalist>
        <button type="submit" className="h-10 rounded-full bg-foreground px-5 font-medium text-background sm:w-fit">Add stamp</button>
      </form>

      {status && <p role="status">{status}</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {!inventory && !loadError && <p>Loading stamp inventory…</p>}
      {inventory?.stamps.length === 0 && <p>No stamps have been added yet.</p>}
      {inventory && inventory.stamps.length > 0 && (
        <ul className="grid gap-3">
          {inventory.stamps.map((stamp) => (
            <li key={stamp.id} className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
              <h3 className="font-semibold">{stamp.name}{stamp.yearOfIssue ? ` (${stamp.yearOfIssue})` : ""}</h3>
              <p>{stamp.countryCode} · {stamp.faceAmount} {stamp.faceCurrencyCode}</p>
              <p>Owned: {stamp.quantityOwned}; annulled: {stamp.quantityAnnulled}; usable: {stamp.usableQuantity}</p>
              <p>{stamp.expired ? "Expired" : "Not expired"}</p>
              <p>Unit postage: {stamp.unitPostageValue ? <Money value={stamp.unitPostageValue} /> : "Unresolved"}</p>
              <p>Total postage: {stamp.totalPostageValue ? <Money value={stamp.totalPostageValue} /> : "Unresolved"}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
