"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SettingOption } from "@/app/components/initialPostalEntitySettingForm";

type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "MERGED";

type ApprovedConversion = {
  id: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  multiplier: string;
};

type FixedConversionProposal = {
  id: string;
  targetCurrencyConversionId: string | null;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  multiplier: string;
  sourceUrl: string | null;
  sourceNote: string | null;
  status: ProposalStatus;
  decidedAt?: string | null;
  decisionNote?: string | null;
  createdAt: string;
};

type WorkflowResponse = {
  approvedConversions: ApprovedConversion[];
  proposals: FixedConversionProposal[];
};

type ProposalErrors = Partial<
  Record<
    | "targetCurrencyConversionId"
    | "proposalKind"
    | "fromCurrencyCode"
    | "toCurrencyCode"
    | "multiplier"
    | "sourceUrl"
    | "sourceNote",
    string
  >
>;

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="text-sm text-red-700 dark:text-red-300">
      {message}
    </p>
  ) : null;
}

export function FixedConversionProposalStatusList({
  proposals,
}: {
  proposals: FixedConversionProposal[];
}) {
  return proposals.length === 0 ? (
    <p>You have not submitted a fixed-conversion proposal.</p>
  ) : (
    <ul className="grid gap-3">
      {proposals.map((proposal) => (
        <li
          key={proposal.id}
          className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700"
        >
          <p className="font-medium">
            {proposal.fromCurrencyCode} to {proposal.toCurrencyCode} at {proposal.multiplier}
          </p>
          <p>
            Type: {proposal.targetCurrencyConversionId ? "Correction" : "Missing conversion"}
          </p>
          <p>Status: {proposal.status}</p>
          {proposal.status === "REJECTED" && (
            <>
              <p>Decision note: {proposal.decisionNote}</p>
              <p>
                Submit a corrected conversion above, or choose a fallback on
                each affected inventory row.
              </p>
            </>
          )}
          <p>Source: {proposal.sourceUrl ?? proposal.sourceNote}</p>
        </li>
      ))}
    </ul>
  );
}

export function FixedConversionProposals({
  activeDisplayCurrencyCode,
  currencies,
  onProposalSubmitted,
}: {
  activeDisplayCurrencyCode: string;
  currencies: SettingOption[];
  onProposalSubmitted(): void | Promise<void>;
}) {
  const [workflow, setWorkflow] = useState<WorkflowResponse | null>(null);
  const [proposalKind, setProposalKind] = useState<"MISSING" | "CORRECTION">(
    "MISSING",
  );
  const [targetId, setTargetId] = useState("");
  const [fromCurrencyCode, setFromCurrencyCode] = useState("");
  const [toCurrencyCode, setToCurrencyCode] = useState(
    activeDisplayCurrencyCode,
  );
  const [multiplier, setMultiplier] = useState("");
  const [errors, setErrors] = useState<ProposalErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadWorkflow(signal?: AbortSignal) {
    const response = await fetch("/api/fixed-conversion-proposals", { signal });
    if (!response.ok) {
      throw new Error("Fixed-conversion proposals could not be loaded.");
    }
    const result = (await response.json()) as Partial<WorkflowResponse>;
    if (
      !Array.isArray(result.approvedConversions) ||
      !Array.isArray(result.proposals)
    ) {
      throw new Error("Fixed-conversion proposals could not be loaded.");
    }
    setWorkflow({
      approvedConversions: result.approvedConversions,
      proposals: result.proposals,
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    loadWorkflow(controller.signal).catch((caught: unknown) => {
      if (caught instanceof Error && caught.name !== "AbortError") {
        setLoadError(caught.message);
      }
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setToCurrencyCode(activeDisplayCurrencyCode);
  }, [activeDisplayCurrencyCode]);

  function selectCorrection(value: string) {
    setTargetId(value);
    const selected = workflow?.approvedConversions.find(
      (conversion) => conversion.id === value,
    );
    if (selected) {
      setFromCurrencyCode(selected.fromCurrencyCode);
      setToCurrencyCode(selected.toCurrencyCode);
      setMultiplier(selected.multiplier);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setStatus(null);
    setSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/fixed-conversion-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalKind,
          targetCurrencyConversionId:
            proposalKind === "CORRECTION" ? targetId : "",
          fromCurrencyCode,
          toCurrencyCode,
          multiplier,
          sourceUrl: data.get("sourceUrl"),
          sourceNote: data.get("sourceNote"),
        }),
      });
      const result = (await response.json()) as {
        proposal?: FixedConversionProposal;
        errors?: ProposalErrors;
        error?: string;
      };
      if (!response.ok || !result.proposal) {
        setErrors(result.errors ?? {});
        setStatus(result.error ?? "Correct the proposal fields.");
        return;
      }

      form.reset();
      setProposalKind("MISSING");
      setTargetId("");
      setFromCurrencyCode("");
      setToCurrencyCode(activeDisplayCurrencyCode);
      setMultiplier("");
      setStatus("Proposal submitted with PENDING status. Your stamps now use this multiplier.");
      try {
        await Promise.all([loadWorkflow(), onProposalSubmitted()]);
        setLoadError(null);
      } catch {
        setLoadError(
          "Proposal submitted, but proposal status or stamp values could not be refreshed.",
        );
      }
    } catch {
      setStatus("The proposal could not be submitted or refreshed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
      <div>
        <h3 className="text-lg font-semibold">Fixed-conversion proposals</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Submit a missing conversion or correct an approved conversion. Only your stamps use a pending multiplier.
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div>
          <label htmlFor="conversion-proposal-kind" className="block font-medium">Proposal type</label>
          <select id="conversion-proposal-kind" value={proposalKind} onChange={(event) => { const kind = event.target.value as "MISSING" | "CORRECTION"; setProposalKind(kind); if (kind === "MISSING") { setTargetId(""); } }} aria-invalid={Boolean(errors.proposalKind)} aria-describedby={errors.proposalKind ? "conversion-proposal-kind-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
            <option value="MISSING">Missing conversion</option>
            <option value="CORRECTION">Correction</option>
          </select>
          <FieldError id="conversion-proposal-kind-error" message={errors.proposalKind} />
        </div>
        {proposalKind === "CORRECTION" && (
          <div>
            <label htmlFor="conversion-to-correct" className="block font-medium">Approved conversion to correct</label>
            <select id="conversion-to-correct" value={targetId} onChange={(event) => selectCorrection(event.target.value)} aria-invalid={Boolean(errors.targetCurrencyConversionId)} aria-describedby={errors.targetCurrencyConversionId ? "conversion-to-correct-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
              <option value="">Select an approved conversion</option>
              {workflow?.approvedConversions.map((conversion) => <option key={conversion.id} value={conversion.id}>{conversion.fromCurrencyCode} to {conversion.toCurrencyCode} at {conversion.multiplier}</option>)}
            </select>
            <FieldError id="conversion-to-correct-error" message={errors.targetCurrencyConversionId} />
          </div>
        )}
        <div>
          <label htmlFor="proposal-source-currency" className="block font-medium">Proposed source currency</label>
          <select id="proposal-source-currency" value={fromCurrencyCode} onChange={(event) => setFromCurrencyCode(event.target.value)} aria-invalid={Boolean(errors.fromCurrencyCode)} aria-describedby={errors.fromCurrencyCode ? "proposal-source-currency-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
            <option value="">Select a source currency</option>
            {currencies.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <FieldError id="proposal-source-currency-error" message={errors.fromCurrencyCode} />
        </div>
        <div>
          <label htmlFor="proposal-target-currency" className="block font-medium">Proposed target currency</label>
          <select id="proposal-target-currency" value={toCurrencyCode} onChange={(event) => setToCurrencyCode(event.target.value)} aria-invalid={Boolean(errors.toCurrencyCode)} aria-describedby={errors.toCurrencyCode ? "proposal-target-currency-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2">
            <option value="">Select a target currency</option>
            {currencies.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <FieldError id="proposal-target-currency-error" message={errors.toCurrencyCode} />
        </div>
        <div>
          <label htmlFor="proposal-multiplier" className="block font-medium">Exact multiplier</label>
          <input id="proposal-multiplier" value={multiplier} onChange={(event) => setMultiplier(event.target.value)} inputMode="decimal" aria-invalid={Boolean(errors.multiplier)} aria-describedby={errors.multiplier ? "proposal-multiplier-error" : undefined} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="proposal-multiplier-error" message={errors.multiplier} />
        </div>
        <div>
          <label htmlFor="conversion-source-url" className="block font-medium">Source URL</label>
          <input id="conversion-source-url" name="sourceUrl" type="url" aria-invalid={Boolean(errors.sourceUrl)} aria-describedby={`conversion-source-help${errors.sourceUrl ? " conversion-source-url-error" : ""}`} className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2" />
          <FieldError id="conversion-source-url-error" message={errors.sourceUrl} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="conversion-source-note" className="block font-medium">Source note</label>
          <textarea id="conversion-source-note" name="sourceNote" rows={3} aria-invalid={Boolean(errors.sourceNote)} aria-describedby={`conversion-source-help${errors.sourceNote ? " conversion-source-note-error" : ""}`} className="mt-1 w-full rounded border border-zinc-400 bg-transparent p-2" />
          <p id="conversion-source-help" className="text-sm text-zinc-600 dark:text-zinc-400">Enter a source URL, a source note, or both.</p>
          <FieldError id="conversion-source-note-error" message={errors.sourceNote} />
        </div>
        <button type="submit" disabled={submitting} className="h-10 rounded-full bg-foreground px-5 font-medium text-background disabled:opacity-60 sm:w-fit">{submitting ? "Submitting…" : "Submit conversion proposal"}</button>
      </form>
      {status && <p role="status">{status}</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {!workflow && !loadError && <p>Loading fixed-conversion proposals…</p>}
      {workflow && <FixedConversionProposalStatusList proposals={workflow.proposals} />}
    </div>
  );
}
