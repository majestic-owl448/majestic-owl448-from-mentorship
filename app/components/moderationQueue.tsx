"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProposalType =
  | "NAMED_DEFINITION"
  | "NAMED_VALUE"
  | "FIXED_CONVERSION"
  | "POSTAL_ENTITY";
type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "MERGED";

type QueueItem = {
  id: string;
  proposalType: ProposalType;
  status: ProposalStatus;
  summary: string;
  proposer: { id: string; email: string | null };
  submittedAt: string;
};

const typeLabels: Record<ProposalType, string> = {
  NAMED_DEFINITION: "Named/code definition",
  NAMED_VALUE: "Named/code value",
  FIXED_CONVERSION: "Fixed conversion",
  POSTAL_ENTITY: "Postal entity",
};

export function ModerationQueue() {
  const [proposalType, setProposalType] = useState("ALL");
  const [status, setStatus] = useState("PENDING");
  const [result, setResult] = useState<{
    key: string;
    proposals: QueueItem[] | null;
    error: string | null;
  }>({ key: "", proposals: null, error: null });

  const filterKey = `${proposalType}:${status}`;

  useEffect(() => {
    const controller = new AbortController();
    const parameters = new URLSearchParams({ type: proposalType, status });
    fetch(`/api/moderation/proposals?${parameters}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          proposals?: QueueItem[];
          error?: string;
        };
        if (!response.ok || !Array.isArray(result.proposals)) {
          throw new Error(result.error ?? "The proposal queue could not be loaded.");
        }
        return result.proposals;
      })
      .then((proposals) =>
        setResult({ key: filterKey, proposals, error: null }),
      )
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name !== "AbortError") {
          setResult({ key: filterKey, proposals: null, error: caught.message });
        }
      });
    return () => controller.abort();
  }, [filterKey, proposalType, status]);

  const proposals = result.key === filterKey ? result.proposals : null;
  const error = result.key === filterKey ? result.error : null;

  return (
    <section className="grid gap-6" aria-labelledby="proposal-queue-heading">
      <div>
        <h1 id="proposal-queue-heading" className="text-3xl font-semibold tracking-tight">
          Proposal queue
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Inspect submitted shared data before it becomes public.
        </p>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" aria-label="Proposal queue filters">
        <div>
          <label htmlFor="moderation-proposal-type" className="block font-medium">
            Proposal type
          </label>
          <select
            id="moderation-proposal-type"
            value={proposalType}
            onChange={(event) => setProposalType(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2"
          >
            <option value="ALL">All proposal types</option>
            <option value="NAMED_DEFINITION">Named/code definitions</option>
            <option value="NAMED_VALUE">Named/code values</option>
            <option value="FIXED_CONVERSION">Fixed conversions</option>
            <option value="POSTAL_ENTITY">Postal entities</option>
          </select>
        </div>
        <div>
          <label htmlFor="moderation-proposal-status" className="block font-medium">
            Status
          </label>
          <select
            id="moderation-proposal-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 h-10 w-full rounded border border-zinc-400 bg-transparent px-2"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="MERGED">Merged</option>
          </select>
        </div>
      </form>

      {error ? (
        <p role="alert">{error}</p>
      ) : proposals === null ? (
        <p role="status">Loading proposal queue…</p>
      ) : proposals.length === 0 ? (
        <p role="status">No proposals match these filters.</p>
      ) : (
        <ul className="grid gap-3" aria-label="Matching proposals">
          {proposals.map((proposal) => (
            <li key={`${proposal.proposalType}:${proposal.id}`}>
              <Link
                href={`/moderation/${proposal.proposalType}/${proposal.id}`}
                className="block rounded-lg border border-zinc-300 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-700"
              >
                <span className="font-medium">{proposal.summary}</span>
                <span className="mt-1 block text-sm">
                  {typeLabels[proposal.proposalType]} · Status: {proposal.status}
                </span>
                <span className="block text-sm text-zinc-600 dark:text-zinc-400">
                  Submitted by {proposal.proposer.email ?? proposal.proposer.id} on{" "}
                  {new Date(proposal.submittedAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
