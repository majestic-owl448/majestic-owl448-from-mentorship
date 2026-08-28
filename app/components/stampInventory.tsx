"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { SettingOption } from "@/app/components/initialPostalEntitySettingForm";
import { FixedConversionProposals } from "@/app/components/fixedConversionProposals";

export type StampValue = {
  amount: string;
  currencyCode: string;
};

export type SavedStamp = {
  id: string;
  countryCode: string;
  postalEntityId: string;
  postalEntity: { id: string; name: string; countryCode: string };
  name: string;
  yearOfIssue: number | null;
  faceValueType: "MONETARY" | "NAMED" | "NONE";
  faceAmount: string | null;
  faceCurrencyCode: string | null;
  namedFaceValueId: string | null;
  namedFaceValueProposalId: string | null;
  namedFaceValue: {
    id: string;
    countryCode: string;
    displayCode: string;
    proposalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "MERGED";
  } | null;
  upcomingNamedFaceValue: {
    amount: string;
    currencyCode: string;
    effectiveOn: string;
    daysUntil: number;
  } | null;
  manualPostageAmount: string | null;
  manualPostageCurrencyCode: string | null;
  quantityOwned: number;
  quantityAnnulled: number;
  usableQuantity: number;
  expired: boolean;
  actionRequired?: boolean;
  proposalActions?: Array<{
    proposalType: "NAMED_DEFINITION" | "NAMED_VALUE" | "FIXED_CONVERSION";
    proposalId: string;
  }>;
  availableFallback?: (StampValue & { source: string }) | null;
  unitPostageValue: (StampValue & { source: string }) | null;
  totalPostageValue: StampValue | null;
  valuation:
    | { status: "RESOLVED"; source: string }
    | { status: "UNRESOLVED" | "ACTION_REQUIRED"; source: null };
  createdAt: string;
};

export type InventoryResponse = {
  activeCountryCode: string;
  displayCurrencyCode: string;
  stamps: SavedStamp[];
  inventoryTotal: StampValue;
};

type StampErrors = Partial<
  Record<
    | "countryCode"
    | "postalEntityId"
    | "name"
    | "yearOfIssue"
    | "faceValueType"
    | "faceAmount"
    | "faceCurrencyCode"
    | "namedFaceValueId"
    | "manualPostageAmount"
    | "manualPostageCurrencyCode"
    | "quantityOwned"
    | "quantityAnnulled"
    | "expired"
    | "actionResolution",
    string
  >
>;

type NamedFaceValueOption = {
  id: string;
  countryCode: string;
  displayCode: string;
  namedFaceValueProposalId?: string;
  proposalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "MERGED";
};

export function formatMoney(value: StampValue) {
  try {
    const [integer, fraction = ""] = value.amount.split(".");
    const formattedFractionLength = Math.min(fraction.length, 20);
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: value.currencyCode,
      minimumFractionDigits: formattedFractionLength,
      maximumFractionDigits: 20,
    });
    const formattedValue = fraction
      ? `${integer}.${fraction.slice(0, formattedFractionLength)}`
      : integer;
    const remainingFraction = fraction.slice(formattedFractionLength);
    return formatter
      .formatToParts(formattedValue as unknown as number)
      .map((part) =>
        part.type === "fraction" ? `${part.value}${remainingFraction}` : part.value,
      )
      .join("");
  } catch {
    return `${value.amount} ${value.currencyCode}`;
  }
}

export function formatInventoryDate(value: string, locale?: string) {
  return new Intl.DateTimeFormat(locale).format(new Date(value));
}

const valuationSourceLabels: Record<string, string> = {
  FACE_AMOUNT: "Face amount",
  FIXED_CONVERSION: "Fixed currency conversion",
  PENDING_CONVERSION_PROPOSAL: "Your pending fixed-conversion proposal",
  NAMED_SCHEDULE: "Named/code schedule",
  MANUAL_FALLBACK: "Manual postage value",
  EXPIRED: "Expired stamp",
  OUTSIDE_ACTIVE_COUNTRY: "Outside active country",
};

function Money({ value }: { value: StampValue }) {
  return formatMoney(value);
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p
      id={id}
      role="alert"
      className="text-sm text-red-700 dark:text-red-300"
    >
      {message}
    </p>
  ) : null;
}

export function applyStampUpdate(
  inventory: InventoryResponse,
  stamp: SavedStamp,
  inventoryTotal: StampValue,
): InventoryResponse {
  return {
    ...inventory,
    stamps: inventory.stamps.map((current) =>
      current.id === stamp.id ? stamp : current,
    ),
    inventoryTotal,
  };
}

export function applyStampRemoval(
  inventory: InventoryResponse,
  stampId: string,
  inventoryTotal: StampValue,
): InventoryResponse {
  return {
    ...inventory,
    stamps: inventory.stamps.filter((stamp) => stamp.id !== stampId),
    inventoryTotal,
  };
}

function StampEditor({
  stamp,
  onUpdated,
}: {
  stamp: SavedStamp;
  onUpdated(stamp: SavedStamp, inventoryTotal: StampValue): void;
}) {
  const [errors, setErrors] = useState<StampErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [replacementOptions, setReplacementOptions] = useState<
    NamedFaceValueOption[]
  >([]);
  const [replacementLoadError, setReplacementLoadError] = useState<
    string | null
  >(null);
  const ownedId = `stamp-${stamp.id}-owned-quantity`;
  const annulledId = `stamp-${stamp.id}-annulled-quantity`;
  const ownedErrorId = `${ownedId}-error`;
  const annulledErrorId = `${annulledId}-error`;
  const expiredId = `stamp-${stamp.id}-expired`;
  const expiredExplanationId = `${expiredId}-explanation`;
  const actionResolutionId = `stamp-${stamp.id}-action-resolution`;
  const actionResolutionErrorId = `${actionResolutionId}-error`;

  useEffect(() => {
    if (!stamp.actionRequired || stamp.faceValueType !== "NAMED") return;
    const controller = new AbortController();
    const parameters = new URLSearchParams({
      countryCode: stamp.countryCode,
      query: "",
    });
    fetch(`/api/named-face-values?${parameters}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as {
          namedFaceValues: NamedFaceValueOption[];
        };
      })
      .then(({ namedFaceValues }) => setReplacementOptions(namedFaceValues))
      .catch((caught: unknown) => {
        if (!(caught instanceof Error && caught.name === "AbortError")) {
          setReplacementLoadError("Eligible replacements could not be loaded.");
        }
      });
    return () => controller.abort();
  }, [stamp.actionRequired, stamp.countryCode, stamp.faceValueType]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setStatus(null);
    setSaving(true);
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/stamps/${stamp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityOwned: data.get("quantityOwned"),
          quantityAnnulled: data.get("quantityAnnulled"),
          expired: data.get("expired") === "on",
          actionResolution: data.get("actionResolution"),
        }),
      });
      const result = (await response.json()) as {
        stamp?: SavedStamp;
        inventoryTotal?: StampValue;
        errors?: StampErrors;
        error?: string;
      };
      if (!response.ok || !result.stamp || !result.inventoryTotal) {
        setErrors(result.errors ?? {});
        setStatus(result.error ?? "Correct the quantity fields.");
        return;
      }

      onUpdated(result.stamp, result.inventoryTotal);
      setStatus("Stamp updated.");
    } catch {
      setStatus("Stamp could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 grid gap-3 border-t border-zinc-300 pt-3 sm:grid-cols-2 dark:border-zinc-700"
      noValidate
    >
      <div>
        <label htmlFor={ownedId} className="block font-medium">
          Owned quantity
        </label>
        <input
          id={ownedId}
          name="quantityOwned"
          type="number"
          min="1"
          max="2147483647"
          step="1"
          defaultValue={stamp.quantityOwned}
          aria-describedby={errors.quantityOwned ? ownedErrorId : undefined}
          className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2"
        />
        <FieldError id={ownedErrorId} message={errors.quantityOwned} />
      </div>
      <div>
        <label htmlFor={annulledId} className="block font-medium">
          Annulled quantity
        </label>
        <input
          id={annulledId}
          name="quantityAnnulled"
          type="number"
          min="0"
          max="2147483647"
          step="1"
          defaultValue={stamp.quantityAnnulled}
          aria-describedby={
            errors.quantityAnnulled ? annulledErrorId : undefined
          }
          className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2"
        />
        <FieldError
          id={annulledErrorId}
          message={errors.quantityAnnulled}
        />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="font-medium">Expiration</legend>
        <div className="mt-1 flex items-center gap-2">
          <input
            id={expiredId}
            name="expired"
            type="checkbox"
            defaultChecked={stamp.expired}
            aria-describedby={expiredExplanationId}
            className="h-5 w-5"
          />
          <label htmlFor={expiredId}>Expired</label>
        </div>
        <p
          id={expiredExplanationId}
          className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"
        >
          Expired stamps have zero usable quantity and zero postage value.
          Stored stamp details and quantities stay unchanged.
        </p>
      </fieldset>
      {stamp.actionRequired && (
        <div className="sm:col-span-2">
          <label htmlFor={actionResolutionId} className="block font-medium">
            Resolve rejected proposal reference
          </label>
          <select
            id={actionResolutionId}
            name="actionResolution"
            defaultValue=""
            aria-describedby={
              errors.actionResolution
                ? actionResolutionErrorId
                : replacementLoadError
                  ? `${actionResolutionId}-load-error`
                  : undefined
            }
            className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2"
          >
            <option value="">Keep action required</option>
            {stamp.availableFallback && (
              <option value="FALLBACK">
                Use {valuationSourceLabels[stamp.availableFallback.source] ?? stamp.availableFallback.source}: {formatMoney(stamp.availableFallback)}
              </option>
            )}
            {replacementOptions.map((option) => (
              <option
                key={`${option.namedFaceValueProposalId ? "proposal" : "approved"}:${option.id}`}
                value={`${option.namedFaceValueProposalId ? "proposal" : "approved"}:${option.id}`}
              >
                Use {option.displayCode}{option.proposalStatus ? ` (${option.proposalStatus})` : ""}
              </option>
            ))}
          </select>
          <FieldError
            id={actionResolutionErrorId}
            message={errors.actionResolution}
          />
          {replacementLoadError && (
            <p id={`${actionResolutionId}-load-error`} role="alert">
              {replacementLoadError}
            </p>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="h-10 rounded-full bg-foreground px-5 font-medium text-background disabled:opacity-60 sm:w-fit"
      >
        {saving ? "Saving…" : "Save stamp"}
      </button>
      {status && <p role="status">{status}</p>}
    </form>
  );
}

function StampRemoval({
  stamp,
  onRemoved,
}: {
  stamp: SavedStamp;
  onRemoved(stampId: string, inventoryTotal: StampValue): void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const removeButtonRef = useRef<HTMLButtonElement>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmationId = `stamp-${stamp.id}-remove-confirmation`;

  function closeDialog() {
    dialogRef.current?.close();
    removeButtonRef.current?.focus();
  }

  async function confirmRemoval() {
    setRemoving(true);
    setError(null);

    try {
      const response = await fetch(`/api/stamps/${stamp.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        deletedStampId?: string;
        inventoryTotal?: StampValue;
        error?: string;
      };
      if (
        !response.ok ||
        result.deletedStampId !== stamp.id ||
        !result.inventoryTotal
      ) {
        setError(result.error ?? "Stamp could not be removed.");
        return;
      }

      onRemoved(result.deletedStampId, result.inventoryTotal);
    } catch {
      setError("Stamp could not be removed.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <button
        ref={removeButtonRef}
        type="button"
        onClick={() => {
          setError(null);
          dialogRef.current?.showModal();
        }}
        className="mt-3 h-10 rounded-full border border-red-700 px-5 font-medium text-red-700 dark:border-red-300 dark:text-red-300"
      >
        Remove stamp
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={confirmationId}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        className="m-auto max-w-md rounded-lg border border-zinc-300 bg-background p-6 text-foreground backdrop:bg-black/50 dark:border-zinc-700"
      >
        <p id={confirmationId} className="text-lg font-semibold">
          Remove {stamp.name}?
        </p>
        <p className="mt-2">This removes the entry from your inventory.</p>
        {error && (
          <p role="alert" className="mt-2 text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={removing}
            onClick={closeDialog}
            className="h-10 rounded-full border border-zinc-500 px-5 font-medium disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={removing}
            onClick={confirmRemoval}
            className="h-10 rounded-full bg-red-700 px-5 font-medium text-white disabled:opacity-60"
          >
            {removing ? "Removing…" : "Confirm removal"}
          </button>
        </div>
      </dialog>
    </>
  );
}

export function StampInventoryResults({
  inventory,
  onStampUpdated,
  onStampRemoved,
}: {
  inventory: InventoryResponse;
  onStampUpdated?: (
    stamp: SavedStamp,
    inventoryTotal: StampValue,
  ) => void;
  onStampRemoved?: (stampId: string, inventoryTotal: StampValue) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">
        Inventory total: <Money value={inventory.inventoryTotal} />
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Unresolved entries are excluded from the inventory total.
      </p>
      {inventory.stamps.length === 0 ? (
        <p>No stamps have been added yet.</p>
      ) : (
        <ul className="grid gap-3">
          {inventory.stamps.map((stamp) => (
            <li
              key={stamp.id}
              className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700"
            >
              <h3 className="font-semibold">
                {stamp.name}
                {stamp.yearOfIssue ? ` (${stamp.yearOfIssue})` : ""}
              </h3>
              <p>
                {stamp.postalEntity.name} ({stamp.countryCode}) ·{" "}
                {stamp.faceValueType === "NAMED"
                  ? stamp.namedFaceValue?.displayCode
                  : stamp.faceValueType === "MONETARY"
                    ? `${stamp.faceAmount} ${stamp.faceCurrencyCode}`
                    : "No face value"}
              </p>
              {stamp.namedFaceValue?.proposalStatus && (
                <p>Definition status: {stamp.namedFaceValue.proposalStatus}</p>
              )}
              {stamp.actionRequired && (
                <div role="alert">
                  <p>
                    Action required: rejected proposal data is no longer used.
                    Submit corrected data or choose a replacement below.
                  </p>
                  {stamp.proposalActions && stamp.proposalActions.length > 0 && (
                    <ul>
                      {stamp.proposalActions.map((action) => (
                        <li key={`${action.proposalType}:${action.proposalId}`}>
                          {action.proposalType.replaceAll("_", " ")}: {action.proposalId}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {stamp.upcomingNamedFaceValue && (
                <p>
                  Upcoming named/code value: {stamp.upcomingNamedFaceValue.amount}{" "}
                  {stamp.upcomingNamedFaceValue.currencyCode} from{" "}
                  {stamp.upcomingNamedFaceValue.effectiveOn}
                </p>
              )}
              {stamp.manualPostageAmount !== null &&
                stamp.manualPostageCurrencyCode !== null && (
                  <p>
                    Manual postage: {stamp.manualPostageAmount}{" "}
                    {stamp.manualPostageCurrencyCode}
                  </p>
                )}
              <p>
                Owned: {stamp.quantityOwned}; annulled: {stamp.quantityAnnulled};
                usable: {stamp.usableQuantity}
              </p>
              <p>{stamp.expired ? "Expired" : "Not expired"}</p>
              <p>Added: {formatInventoryDate(stamp.createdAt)}</p>
              <p>
                Unit postage:{" "}
                {stamp.unitPostageValue ? (
                  <Money value={stamp.unitPostageValue} />
                ) : (
                  "Unresolved"
                )}
              </p>
              <p>
                Total postage:{" "}
                {stamp.totalPostageValue ? (
                  <Money value={stamp.totalPostageValue} />
                ) : (
                  "Unresolved"
                )}
              </p>
              <p>
                Valuation source:{" "}
                {stamp.valuation.status !== "RESOLVED"
                  ? stamp.valuation.status === "ACTION_REQUIRED"
                    ? "Action required"
                    : "Unresolved"
                  : valuationSourceLabels[stamp.valuation.source] ??
                    stamp.valuation.source}
              </p>
              {onStampUpdated && (
                <StampEditor
                  stamp={stamp}
                  onUpdated={onStampUpdated}
                />
              )}
              {onStampRemoved && (
                <StampRemoval stamp={stamp} onRemoved={onStampRemoved} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NamedFaceValueFields({
  countryCode,
  query,
  onQueryChange,
  options,
  searchError,
  selectionError,
}: {
  countryCode: string;
  query: string;
  onQueryChange(value: string): void;
  options: NamedFaceValueOption[];
  searchError: string | null;
  selectionError?: string;
}) {
  return (
    <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="font-medium">Named face value</legend>
      <div>
        <label htmlFor="named-face-value-search" className="block font-medium">Search names and codes</label>
        <input id="named-face-value-search" type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} disabled={!countryCode} aria-describedby={searchError ? "named-face-value-search-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
        {searchError && <p id="named-face-value-search-error" role="alert" className="text-sm text-red-700 dark:text-red-300">{searchError}</p>}
      </div>
      <div>
        <label htmlFor="named-face-value" className="block font-medium">Name or code</label>
        <select id="named-face-value" name="namedFaceValueReference" defaultValue="" disabled={!countryCode} aria-describedby={selectionError ? "named-face-value-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
          <option value="">Select a named face value</option>
          {options.map((option) => <option key={`${option.namedFaceValueProposalId ? "proposal" : "approved"}:${option.id}`} value={`${option.namedFaceValueProposalId ? "proposal" : "approved"}:${option.id}`}>{option.displayCode}{option.proposalStatus ? ` (${option.proposalStatus})` : ""}</option>)}
        </select>
        <FieldError id="named-face-value-error" message={selectionError} />
      </div>
    </fieldset>
  );
}

export function StampInventory({
  activeCountryCode,
  activeDisplayCurrencyCode,
  activePostalEntityId,
  countries,
  currencies,
  postalEntities,
}: {
  activeCountryCode: string;
  activeDisplayCurrencyCode: string;
  activePostalEntityId: string;
  countries: SettingOption[];
  currencies: SettingOption[];
  postalEntities: Array<{ id: string; name: string; countryCode: string }>;
}) {
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<StampErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState(activeCountryCode);
  const [faceValueType, setFaceValueType] = useState<
    "MONETARY" | "NAMED" | "NONE"
  >("MONETARY");
  const [namedQuery, setNamedQuery] = useState("");
  const [namedOptions, setNamedOptions] = useState<NamedFaceValueOption[]>([]);
  const [namedSearchError, setNamedSearchError] = useState<string | null>(null);
  const inventoryTotalRef = useRef<HTMLDivElement>(null);

  const loadInventory = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/stamps", { signal });
    if (!response.ok) {
      throw new Error("Stamp inventory could not be loaded.");
    }
    setInventory((await response.json()) as InventoryResponse);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadInventory(controller.signal).catch((caught: unknown) => {
        if (caught instanceof Error && caught.name !== "AbortError") {
          setLoadError(caught.message);
        }
      });
    return () => controller.abort();
  }, [activeCountryCode, activeDisplayCurrencyCode, loadInventory]);

  useEffect(() => {
    setCountryCode(activeCountryCode);
  }, [activeCountryCode]);

  useEffect(() => {
    if (faceValueType !== "NAMED" || !countryCode) {
      setNamedOptions([]);
      setNamedSearchError(null);
      return;
    }

    const controller = new AbortController();
    const parameters = new URLSearchParams({ countryCode, query: namedQuery });
    fetch(`/api/named-face-values?${parameters}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Named face values could not be loaded.");
        }
        return (await response.json()) as {
          namedFaceValues: NamedFaceValueOption[];
        };
      })
      .then(({ namedFaceValues }) => {
        setNamedOptions(namedFaceValues);
        setNamedSearchError(null);
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name !== "AbortError") {
          setNamedSearchError(caught.message);
        }
      });
    return () => controller.abort();
  }, [countryCode, faceValueType, namedQuery]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setStatus(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const namedReference = String(data.get("namedFaceValueReference") ?? "");
    const [namedReferenceType, namedReferenceId = ""] =
      namedReference.split(":", 2);
    const response = await fetch("/api/stamps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: data.get("countryCode"),
        postalEntityId: data.get("postalEntityId"),
        name: data.get("name"),
        yearOfIssue: data.get("yearOfIssue"),
        faceValueType: data.get("faceValueType"),
        faceAmount: data.get("faceAmount"),
        faceCurrencyCode: data.get("faceCurrencyCode"),
        namedFaceValueId:
          namedReferenceType === "approved" ? namedReferenceId : "",
        namedFaceValueProposalId:
          namedReferenceType === "proposal" ? namedReferenceId : "",
        manualPostageAmount: data.get("manualPostageAmount"),
        manualPostageCurrencyCode: data.get("manualPostageCurrencyCode"),
        quantityOwned: data.get("quantityOwned"),
        quantityAnnulled: data.get("quantityAnnulled"),
        expired: data.get("expired") === "on",
      }),
    });
    const result = (await response.json()) as {
      stamp?: SavedStamp;
      inventoryTotal?: StampValue;
      errors?: StampErrors;
      error?: string;
    };
    if (!response.ok || !result.stamp || !result.inventoryTotal) {
      setErrors(result.errors ?? {});
      setStatus(result.error ?? "Correct the highlighted stamp fields.");
      return;
    }

    setInventory((current) =>
      current
        ? {
            ...current,
            stamps: [...current.stamps, result.stamp!],
            inventoryTotal: result.inventoryTotal!,
          }
        : current,
    );
    form.reset();
    setCountryCode(activeCountryCode);
    setFaceValueType("MONETARY");
    setNamedQuery("");
    setNamedOptions([]);
    const postalEntity = form.elements.namedItem(
      "postalEntityId",
    ) as HTMLSelectElement;
    const faceCurrency = form.elements.namedItem(
      "faceCurrencyCode",
    ) as HTMLInputElement | null;
    postalEntity.value = activePostalEntityId;
    if (faceCurrency) {
      faceCurrency.value = activeDisplayCurrencyCode;
    }
    setStatus("Stamp added to inventory.");
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="stamp-inventory-heading">
      <div>
        <h2 id="stamp-inventory-heading" className="text-2xl font-semibold">
          Stamp inventory
        </h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Add monetary, named, or no-face-value stamps and see their postage value for the active country.
        </p>
      </div>

      <FixedConversionProposals
        activeDisplayCurrencyCode={activeDisplayCurrencyCode}
        currencies={currencies}
        onProposalSubmitted={() => loadInventory()}
      />

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div>
          <label htmlFor="stamp-country" className="block font-medium">Country</label>
          <select id="stamp-country" name="countryCode" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} aria-describedby={errors.countryCode ? "stamp-country-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
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
          <label htmlFor="stamp-postal-entity" className="block font-medium">Postal entity</label>
          <select id="stamp-postal-entity" name="postalEntityId" defaultValue={activePostalEntityId} aria-describedby={errors.postalEntityId ? "stamp-postal-entity-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
            {postalEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} ({entity.countryCode})</option>)}
          </select>
          <FieldError id="stamp-postal-entity-error" message={errors.postalEntityId} />
        </div>
        <div>
          <label htmlFor="stamp-year" className="block font-medium">Year of issue (optional)</label>
          <input id="stamp-year" name="yearOfIssue" inputMode="numeric" aria-describedby={errors.yearOfIssue ? "stamp-year-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="stamp-year-error" message={errors.yearOfIssue} />
        </div>
        <div>
          <label htmlFor="face-value-type" className="block font-medium">Face value type</label>
          <select id="face-value-type" name="faceValueType" value={faceValueType} onChange={(event) => setFaceValueType(event.target.value as "MONETARY" | "NAMED" | "NONE")} aria-describedby={errors.faceValueType ? "face-value-type-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
            <option value="MONETARY">Monetary amount</option>
            <option value="NAMED">Country-specific name or code</option>
            <option value="NONE">No face value</option>
          </select>
          <FieldError id="face-value-type-error" message={errors.faceValueType} />
        </div>
        {faceValueType === "MONETARY" ? (
          <>
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
          </>
        ) : faceValueType === "NAMED" ? (
          <NamedFaceValueFields
            countryCode={countryCode}
            query={namedQuery}
            onQueryChange={setNamedQuery}
            options={namedOptions}
            searchError={namedSearchError}
            selectionError={errors.namedFaceValueId}
          />
        ) : null}
        <div>
          <label htmlFor="owned-quantity" className="block font-medium">Owned quantity</label>
          <input id="owned-quantity" name="quantityOwned" type="number" min="1" max="2147483647" step="1" defaultValue="1" aria-describedby={errors.quantityOwned ? "owned-quantity-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="owned-quantity-error" message={errors.quantityOwned} />
        </div>
        <div>
          <label htmlFor="annulled-quantity" className="block font-medium">Annulled quantity</label>
          <input id="annulled-quantity" name="quantityAnnulled" type="number" min="0" max="2147483647" step="1" defaultValue="0" aria-describedby={errors.quantityAnnulled ? "annulled-quantity-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="annulled-quantity-error" message={errors.quantityAnnulled} />
        </div>
        <div className="flex items-center gap-2 self-end pb-2">
          <input id="stamp-expired" name="expired" type="checkbox" className="h-5 w-5" />
          <label htmlFor="stamp-expired" className="font-medium">Expired</label>
        </div>
        <fieldset className="grid gap-4 border-t border-zinc-300 pt-4 sm:col-span-2 sm:grid-cols-2 dark:border-zinc-700">
          <legend className="px-1 font-medium">
            {faceValueType === "NONE"
              ? "Manual postage value"
              : "Manual postage fallback (optional)"}
          </legend>
          <div>
            <label htmlFor="manual-amount" className="block font-medium">Manual postage amount</label>
            <input id="manual-amount" name="manualPostageAmount" inputMode="decimal" required={faceValueType === "NONE"} aria-describedby={errors.manualPostageAmount ? "manual-amount-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
            <FieldError id="manual-amount-error" message={errors.manualPostageAmount} />
          </div>
          <div>
            <label htmlFor="manual-currency" className="block font-medium">Manual postage currency</label>
            <input id="manual-currency" name="manualPostageCurrencyCode" list="stamp-currency-options" maxLength={3} autoCapitalize="characters" placeholder={activeDisplayCurrencyCode} required={faceValueType === "NONE"} aria-describedby={errors.manualPostageCurrencyCode ? "manual-currency-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
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
      {inventory && (
        <div ref={inventoryTotalRef} tabIndex={-1}>
          <StampInventoryResults
            inventory={inventory}
            onStampUpdated={(stamp, inventoryTotal) =>
              setInventory((current) =>
                current
                  ? applyStampUpdate(current, stamp, inventoryTotal)
                  : current,
              )
            }
            onStampRemoved={(stampId, inventoryTotal) => {
              setInventory((current) =>
                current
                  ? applyStampRemoval(current, stampId, inventoryTotal)
                  : current,
              );
              requestAnimationFrame(() => inventoryTotalRef.current?.focus());
            }}
          />
        </div>
      )}
    </section>
  );
}
