"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProposalDetail = {
  id: string;
  proposalType: "NAMED_DEFINITION" | "NAMED_VALUE" | "FIXED_CONVERSION";
  status: "PENDING" | "APPROVED" | "REJECTED" | "MERGED";
  proposer: { id: string; email: string | null };
  submittedAt: string;
  source: { url: string | null; note: string | null };
  decision: {
    moderator: { id: string; email: string | null } | null;
    decidedAt: string;
    note: string | null;
  } | null;
  canonicalTargetId: string | null;
  proposedValues: Record<string, string | null>;
  possibleMatches: Record<string, unknown>[];
  compatibleMergeTargets: Record<string, unknown>[];
};

type ModerationAction = "APPROVE" | "MERGE";

const labels: Record<string, string> = {
  targetNamedFaceValueId: "Approved definition being corrected",
  countryCode: "Country",
  displayCode: "Display code",
  normalizedCode: "Normalized code",
  currencyCode: "Currency",
  namedFaceValueId: "Approved named/code definition",
  definitionProposalId: "Pending named/code definition",
  amount: "Amount",
  effectiveOn: "Effective date",
  eligibleOn: "Eligible date",
  targetCurrencyConversionId: "Approved conversion being corrected",
  fromCurrencyCode: "Source currency",
  toCurrencyCode: "Target currency",
  multiplier: "Multiplier",
};

function displayValue(value: unknown): string {
  if (value === null || value === "") return "None";
  if (Array.isArray(value)) {
    return value.map(displayValue).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${labels[key] ?? key}: ${displayValue(item)}`)
      .join("; ");
  }
  return String(value);
}

export function ModerationProposalDetail({
  proposalType,
  proposalId,
}: {
  proposalType: string;
  proposalId: string;
}) {
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [action, setAction] = useState<ModerationAction>("APPROVE");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/moderation/proposals/${proposalType}/${proposalId}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          proposal?: ProposalDetail;
          error?: string;
        };
        if (!response.ok || !result.proposal) {
          throw new Error(result.error ?? "The proposal could not be loaded.");
        }
        return result.proposal;
      })
      .then(setProposal)
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name !== "AbortError") {
          setError(caught.message);
        }
      });
    return () => controller.abort();
  }, [proposalId, proposalType]);

  async function moderateProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setApprovalMessage(null);
    try {
      const response = await fetch(
        `/api/moderation/proposals/${proposalType}/${proposalId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            decisionNote,
            ...(action === "MERGE" ? { targetId: mergeTargetId } : {}),
          }),
        },
      );
      const result = (await response.json()) as {
        proposal?: ProposalDetail;
        error?: string;
      };
      if (!response.ok || !result.proposal) {
        throw new Error(result.error ?? "The proposal could not be decided.");
      }
      setProposal(result.proposal);
      setApprovalMessage(
        action === "MERGE"
          ? "Proposal merged. References now use the canonical record."
          : "Proposal approved. Shared data is now available.",
      );
    } catch (caught) {
      setApprovalMessage(
        caught instanceof Error
          ? caught.message
          : "The proposal could not be decided.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <p role="alert">{error}</p>;
  if (!proposal) return <p role="status">Loading proposal details…</p>;

  return (
    <article className="grid gap-8" aria-labelledby="proposal-detail-heading">
      <div>
        <Link href="/moderation" className="underline underline-offset-4">
          Back to proposal queue
        </Link>
        <h1 id="proposal-detail-heading" className="mt-4 text-3xl font-semibold tracking-tight">
          Proposal details
        </h1>
      </div>

      <dl className="grid gap-2 rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
        <div><dt className="font-medium">Type</dt><dd>{proposal.proposalType}</dd></div>
        <div><dt className="font-medium">Status</dt><dd>{proposal.status}</dd></div>
        <div><dt className="font-medium">Proposer</dt><dd>{proposal.proposer.email ?? proposal.proposer.id}</dd></div>
        <div><dt className="font-medium">Submitted</dt><dd>{new Date(proposal.submittedAt).toLocaleString()}</dd></div>
      </dl>

      <section aria-labelledby="proposed-values-heading">
        <h2 id="proposed-values-heading" className="text-xl font-semibold">Proposed values</h2>
        <dl className="mt-3 grid gap-2">
          {Object.entries(proposal.proposedValues).map(([key, value]) => (
            <div key={key}>
              <dt className="font-medium">{labels[key] ?? key}</dt>
              <dd>{displayValue(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="proposal-source-heading">
        <h2 id="proposal-source-heading" className="text-xl font-semibold">Submitted source</h2>
        {proposal.source.url && (
          <p className="mt-3">
            URL: <a href={proposal.source.url} className="underline underline-offset-4">{proposal.source.url}</a>
          </p>
        )}
        {proposal.source.note && <p className="mt-2">Note: {proposal.source.note}</p>}
      </section>

      <section aria-labelledby="possible-matches-heading">
        <h2 id="possible-matches-heading" className="text-xl font-semibold">Possible approved matches</h2>
        {proposal.possibleMatches.length === 0 ? (
          <p className="mt-3">No possible approved matches found.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {proposal.possibleMatches.map((match, index) => (
              <li key={String(match.id ?? index)} className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-700">
                {displayValue(match)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {proposal.status === "PENDING" ? (
        <section aria-labelledby="moderation-heading">
          <h2 id="moderation-heading" className="text-xl font-semibold">
            Moderate proposal
          </h2>
          <form className="mt-3 grid gap-4" onSubmit={moderateProposal}>
            <fieldset className="grid gap-2">
              <legend className="font-medium">Action</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="moderation-action"
                  value="APPROVE"
                  checked={action === "APPROVE"}
                  onChange={() => {
                    setAction("APPROVE");
                    setConfirmed(false);
                  }}
                />
                Approve as new or corrected shared data
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="moderation-action"
                  value="MERGE"
                  checked={action === "MERGE"}
                  disabled={proposal.compatibleMergeTargets.length === 0}
                  onChange={() => {
                    setAction("MERGE");
                    setConfirmed(false);
                  }}
                />
                Merge as a duplicate
              </label>
              {proposal.compatibleMergeTargets.length === 0 && (
                <p>No compatible merge targets are available.</p>
              )}
            </fieldset>

            {action === "MERGE" && (
              <fieldset className="grid gap-2">
                <legend className="font-medium">Merge target</legend>
                {proposal.compatibleMergeTargets.map((target, index) => {
                  const targetId = String(target.id ?? "");
                  return (
                    <label
                      key={targetId || index}
                      className="flex items-start gap-2 rounded-lg border border-zinc-300 p-3 dark:border-zinc-700"
                    >
                      <input
                        type="radio"
                        name="merge-target"
                        value={targetId}
                        checked={mergeTargetId === targetId}
                        onChange={(event) =>
                          setMergeTargetId(event.target.value)
                        }
                      />
                      <span>{displayValue(target)}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            <div className="grid gap-2">
              <label htmlFor="decision-note" className="font-medium">
                Decision note
              </label>
              <textarea
                id="decision-note"
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                maxLength={2000}
                required
                rows={4}
                className="rounded-md border border-zinc-400 bg-transparent p-2"
              />
            </div>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                {action === "MERGE"
                  ? "I confirm that this duplicate should use the selected canonical record."
                  : "I confirm that this proposal should update shared data for all users."}
              </span>
            </label>
            <button
              type="submit"
              disabled={
                !confirmed ||
                decisionNote.trim().length === 0 ||
                (action === "MERGE" && mergeTargetId.length === 0) ||
                submitting
              }
              className="w-fit rounded-md bg-foreground px-4 py-2 text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? action === "MERGE"
                  ? "Merging…"
                  : "Approving…"
                : action === "MERGE"
                  ? "Merge proposal"
                  : "Approve proposal"}
            </button>
          </form>
        </section>
      ) : (
        proposal.decision && (
          <section aria-labelledby="decision-heading">
            <h2 id="decision-heading" className="text-xl font-semibold">
              Decision
            </h2>
            <dl className="mt-3 grid gap-2">
              <div>
                <dt className="font-medium">Moderator</dt>
                <dd>
                  {proposal.decision.moderator?.email ??
                    proposal.decision.moderator?.id ??
                    "Deleted account"}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Decided</dt>
                <dd>{new Date(proposal.decision.decidedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="font-medium">Decision note</dt>
                <dd>{proposal.decision.note}</dd>
              </div>
              {proposal.canonicalTargetId && (
                <div>
                  <dt className="font-medium">Canonical record</dt>
                  <dd>{proposal.canonicalTargetId}</dd>
                </div>
              )}
            </dl>
          </section>
        )
      )}

      {approvalMessage && <p role="status">{approvalMessage}</p>}
    </article>
  );
}
