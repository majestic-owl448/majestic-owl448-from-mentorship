"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { SettingOption } from "@/app/components/initialPostalEntitySettingForm";

type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "MERGED";

type NamedOption = {
  id: string;
  countryCode: string;
  displayCode: string;
  namedFaceValueProposalId?: string;
  proposalStatus?: ProposalStatus;
};

type ProposalErrors = Partial<
  Record<
    | "proposalType"
    | "targetNamedFaceValueId"
    | "definitionProposalId"
    | "replacesRejectedProposalId"
    | "countryCode"
    | "displayCode"
    | "normalizedCode"
    | "currencyCode"
    | "amount"
    | "effectiveOn"
    | "sourceUrl"
    | "sourceNote",
    string
  >
>;

type DefinitionProposal = {
  id: string;
  proposalType: "DEFINITION";
  targetNamedFaceValueId: string | null;
  countryCode: string;
  displayCode: string;
  normalizedCode: string;
  currencyCode: string;
  sourceUrl: string | null;
  sourceNote: string | null;
  status: ProposalStatus;
  decidedAt?: string | null;
  decisionNote?: string | null;
  createdAt: string;
};

type ValueProposal = {
  id: string;
  proposalType: "VALUE";
  namedFaceValueId: string | null;
  definitionProposalId: string | null;
  amount: string;
  effectiveOn: string | null;
  sourceUrl: string | null;
  sourceNote: string | null;
  status: ProposalStatus;
  decidedAt?: string | null;
  decisionNote?: string | null;
  actionRequired?: boolean;
  createdAt: string;
};

type ProposalsResponse = {
  definitions: DefinitionProposal[];
  values: ValueProposal[];
};

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="text-sm text-red-700 dark:text-red-300">
      {message}
    </p>
  ) : null;
}

export function ProposalStatusList({
  proposals,
  onResubmitDefinition,
}: {
  proposals: ProposalsResponse;
  onResubmitDefinition?(proposal: DefinitionProposal): void;
}) {
  const entries = [...proposals.definitions, ...proposals.values].sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) ||
      right.id.localeCompare(left.id),
  );

  return entries.length === 0 ? (
    <p>You have not submitted a named/code proposal.</p>
  ) : (
    <ul className="grid gap-3">
      {entries.map((proposal) => (
        <li
          key={`${proposal.proposalType}:${proposal.id}`}
          className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700"
        >
          <p className="font-medium">
            {proposal.proposalType === "DEFINITION"
              ? proposal.displayCode
              : `${proposal.amount} from ${proposal.effectiveOn ?? "the current schedule"}`}
          </p>
          <p>Type: {proposal.proposalType === "DEFINITION" ? "Named definition" : "Schedule value"}</p>
          <p>Status: {proposal.status}</p>
          {"actionRequired" in proposal && proposal.actionRequired && (
            <p>
              Action required: the linked definition was rejected. Submit a
              new value proposal against an eligible definition.
            </p>
          )}
          {proposal.status === "REJECTED" && (
            <>
              <p>Decision note: {proposal.decisionNote}</p>
              <p>
                Submit corrected data with the form above, or replace each
                affected inventory reference.
              </p>
              {proposal.proposalType === "DEFINITION" &&
                onResubmitDefinition && (
                  <button
                    type="button"
                    onClick={() => onResubmitDefinition(proposal)}
                    className="mt-2 rounded-full border border-zinc-500 px-4 py-2 font-medium"
                  >
                    Resubmit corrected definition
                  </button>
                )}
            </>
          )}
          <p>
            Source: {proposal.sourceUrl ?? proposal.sourceNote}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function NamedFaceValueProposals({
  activeCountryCode,
  countries,
  currencies,
}: {
  activeCountryCode: string;
  countries: SettingOption[];
  currencies: SettingOption[];
}) {
  const [proposalType, setProposalType] = useState<"DEFINITION" | "VALUE">(
    "DEFINITION",
  );
  const [countryCode, setCountryCode] = useState(activeCountryCode);
  const [targetCountryCode, setTargetCountryCode] =
    useState(activeCountryCode);
  const [targetReference, setTargetReference] = useState("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<NamedOption[]>([]);
  const [proposals, setProposals] = useState<ProposalsResponse | null>(null);
  const [errors, setErrors] = useState<ProposalErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replacesRejectedProposalId, setReplacesRejectedProposalId] =
    useState("");
  const displayCodeRef = useRef<HTMLInputElement>(null);

  async function loadProposals(signal?: AbortSignal) {
    const response = await fetch("/api/named-face-value-proposals", { signal });
    if (!response.ok) {
      throw new Error("Named/code proposals could not be loaded.");
    }
    setProposals((await response.json()) as ProposalsResponse);
  }

  useEffect(() => {
    const controller = new AbortController();
    loadProposals(controller.signal).catch((caught: unknown) => {
      if (caught instanceof Error && caught.name !== "AbortError") {
        setLoadError(caught.message);
      }
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const parameters = new URLSearchParams({
      countryCode: targetCountryCode,
      query,
    });
    fetch(`/api/named-face-values?${parameters}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Named definitions could not be loaded.");
        }
        return (await response.json()) as { namedFaceValues: NamedOption[] };
      })
      .then(({ namedFaceValues }) => {
        setOptions(namedFaceValues);
        setSearchError(null);
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name !== "AbortError") {
          setSearchError(caught.message);
        }
      });
    return () => controller.abort();
  }, [query, targetCountryCode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setStatus(null);
    setSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const target = String(data.get("proposalTarget") ?? "");
    const [targetType, targetId = ""] = target.split(":", 2);
    const body =
      proposalType === "DEFINITION"
        ? {
            proposalType,
            targetNamedFaceValueId:
              targetType === "approved" ? targetId : "",
            replacesRejectedProposalId: data.get(
              "replacesRejectedProposalId",
            ),
            countryCode: data.get("countryCode"),
            displayCode: data.get("displayCode"),
            normalizedCode: data.get("normalizedCode"),
            currencyCode: data.get("currencyCode"),
            sourceUrl: data.get("sourceUrl"),
            sourceNote: data.get("sourceNote"),
          }
        : {
            proposalType,
            targetNamedFaceValueId:
              targetType === "approved" ? targetId : "",
            definitionProposalId:
              targetType === "proposal" ? targetId : "",
            amount: data.get("amount"),
            effectiveOn: data.get("effectiveOn"),
            sourceUrl: data.get("sourceUrl"),
            sourceNote: data.get("sourceNote"),
          };

    try {
      const response = await fetch("/api/named-face-value-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        proposal?: DefinitionProposal | ValueProposal;
        errors?: ProposalErrors;
        error?: string;
      };
      if (!response.ok || !result.proposal) {
        setErrors(result.errors ?? {});
        setStatus(result.error ?? "Correct the proposal fields.");
        return;
      }

      form.reset();
      setProposalType("DEFINITION");
      setCountryCode(activeCountryCode);
      setTargetCountryCode(activeCountryCode);
      setTargetReference("");
      setQuery("");
      setReplacesRejectedProposalId("");
      setStatus("Proposal submitted with PENDING status.");
      try {
        await loadProposals();
        setLoadError(null);
      } catch {
        setLoadError(
          "Proposal submitted, but the status list could not be refreshed.",
        );
      }
    } catch {
      setStatus("The proposal could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  const targetOptions =
    proposalType === "DEFINITION"
      ? options.filter((option) => !option.namedFaceValueProposalId)
      : options;
  const sourceHelpId = "proposal-source-help";

  return (
    <section className="flex flex-col gap-6" aria-labelledby="named-proposals-heading">
      <div>
        <h2 id="named-proposals-heading" className="text-2xl font-semibold">
          Named/code proposals
        </h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Submit a missing definition, a corrected definition, or a current or future schedule value.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {replacesRejectedProposalId && (
          <>
            <input
              type="hidden"
              name="replacesRejectedProposalId"
              value={replacesRejectedProposalId}
            />
            <p role="status" className="sm:col-span-2">
              Correcting rejected definition {replacesRejectedProposalId}.
              Linked inventory references will use the new pending proposal.
            </p>
            <FieldError
              id="replaces-rejected-proposal-error"
              message={errors.replacesRejectedProposalId}
            />
          </>
        )}
        <div>
          <label htmlFor="proposal-type" className="block font-medium">Proposal type</label>
          <select id="proposal-type" name="proposalType" value={proposalType} onChange={(event) => setProposalType(event.target.value as "DEFINITION" | "VALUE")} aria-invalid={Boolean(errors.proposalType)} aria-describedby={errors.proposalType ? "proposal-type-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
            <option value="DEFINITION">Named definition</option>
            <option value="VALUE">Schedule value</option>
          </select>
          <FieldError id="proposal-type-error" message={errors.proposalType} />
        </div>
        {proposalType === "DEFINITION" && (
          <div>
            <label htmlFor="proposal-country" className="block font-medium">Proposed country</label>
            <select id="proposal-country" name="countryCode" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} aria-invalid={Boolean(errors.countryCode)} aria-describedby={errors.countryCode ? "proposal-country-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
              {countries.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <FieldError id="proposal-country-error" message={errors.countryCode} />
          </div>
        )}
        <div>
          <label htmlFor="proposal-target-country" className="block font-medium">Existing definition country</label>
          <select id="proposal-target-country" value={targetCountryCode} onChange={(event) => { setTargetCountryCode(event.target.value); setTargetReference(""); }} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
            {countries.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="proposal-search" className="block font-medium">Search existing definitions</label>
          <input id="proposal-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-invalid={Boolean(searchError)} aria-describedby={searchError ? "proposal-search-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="proposal-search-error" message={searchError ?? undefined} />
        </div>
        <div>
          <label htmlFor="proposal-target" className="block font-medium">
            {proposalType === "DEFINITION" ? "Definition to correct (optional)" : "Definition for this value"}
          </label>
          <select id="proposal-target" name="proposalTarget" value={targetReference} onChange={(event) => setTargetReference(event.target.value)} aria-invalid={Boolean(errors.targetNamedFaceValueId || errors.definitionProposalId)} aria-describedby={errors.targetNamedFaceValueId || errors.definitionProposalId ? "proposal-target-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
            <option value="">{proposalType === "DEFINITION" ? "Create a new definition" : "Select a definition"}</option>
            {targetOptions.map((option) => <option key={`${option.namedFaceValueProposalId ? "proposal" : "approved"}:${option.id}`} value={`${option.namedFaceValueProposalId ? "proposal" : "approved"}:${option.id}`}>{option.displayCode}{option.proposalStatus ? ` (${option.proposalStatus})` : ""}</option>)}
          </select>
          <FieldError id="proposal-target-error" message={errors.targetNamedFaceValueId ?? errors.definitionProposalId} />
        </div>

        {proposalType === "DEFINITION" ? (
          <>
            <div>
              <label htmlFor="proposal-display-code" className="block font-medium">Proposed display name or code</label>
              <input ref={displayCodeRef} id="proposal-display-code" name="displayCode" aria-invalid={Boolean(errors.displayCode)} aria-describedby={errors.displayCode ? "proposal-display-code-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
              <FieldError id="proposal-display-code-error" message={errors.displayCode} />
            </div>
            <div>
              <label htmlFor="proposal-normalized-code" className="block font-medium">Proposed normalized code</label>
              <input id="proposal-normalized-code" name="normalizedCode" aria-invalid={Boolean(errors.normalizedCode)} aria-describedby={errors.normalizedCode ? "proposal-normalized-code-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
              <FieldError id="proposal-normalized-code-error" message={errors.normalizedCode} />
            </div>
            <div>
              <label htmlFor="proposal-currency" className="block font-medium">Schedule currency</label>
              <select id="proposal-currency" name="currencyCode" defaultValue="" aria-invalid={Boolean(errors.currencyCode)} aria-describedby={errors.currencyCode ? "proposal-currency-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
                <option value="">Select a currency</option>
                {currencies.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <FieldError id="proposal-currency-error" message={errors.currencyCode} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="proposal-amount" className="block font-medium">Proposed amount</label>
              <input id="proposal-amount" name="amount" inputMode="decimal" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? "proposal-amount-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
              <FieldError id="proposal-amount-error" message={errors.amount} />
            </div>
            <div>
              <label htmlFor="proposal-effective-on" className="block font-medium">Effective date (leave blank for current)</label>
              <input id="proposal-effective-on" name="effectiveOn" type="date" aria-invalid={Boolean(errors.effectiveOn)} aria-describedby={errors.effectiveOn ? "proposal-effective-on-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
              <FieldError id="proposal-effective-on-error" message={errors.effectiveOn} />
            </div>
          </>
        )}

        <p id={sourceHelpId} className="text-sm text-zinc-600 sm:col-span-2 dark:text-zinc-400">
          Enter a source URL, a source note, or both.
        </p>
        <div>
          <label htmlFor="proposal-source-url" className="block font-medium">Source URL</label>
          <input id="proposal-source-url" name="sourceUrl" type="url" aria-invalid={Boolean(errors.sourceUrl)} aria-describedby={`${sourceHelpId}${errors.sourceUrl ? " proposal-source-url-error" : ""}`} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="proposal-source-url-error" message={errors.sourceUrl} />
        </div>
        <div>
          <label htmlFor="proposal-source-note" className="block font-medium">Source note</label>
          <textarea id="proposal-source-note" name="sourceNote" aria-invalid={Boolean(errors.sourceNote)} aria-describedby={`${sourceHelpId}${errors.sourceNote ? " proposal-source-note-error" : ""}`} className="mt-1 min-h-24 w-full rounded border border-zinc-400 bg-transparent p-2" />
          <FieldError id="proposal-source-note-error" message={errors.sourceNote} />
        </div>
        <button type="submit" disabled={submitting} className="h-10 rounded-full bg-foreground px-5 font-medium text-background disabled:opacity-60 sm:w-fit">
          {submitting ? "Submitting…" : "Submit proposal"}
        </button>
      </form>

      {status && <p role="status">{status}</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {proposals && (
        <ProposalStatusList
          proposals={proposals}
          onResubmitDefinition={(proposal) => {
            setProposalType("DEFINITION");
            setReplacesRejectedProposalId(proposal.id);
            setCountryCode(proposal.countryCode);
            setTargetCountryCode(proposal.countryCode);
            setTargetReference(
              proposal.targetNamedFaceValueId
                ? `approved:${proposal.targetNamedFaceValueId}`
                : "",
            );
            setStatus(null);
            requestAnimationFrame(() => displayCodeRef.current?.focus());
          }}
        />
      )}
    </section>
  );
}
