import { prisma } from "@/lib/db";

export const moderationProposalTypes = [
  "NAMED_DEFINITION",
  "NAMED_VALUE",
  "FIXED_CONVERSION",
] as const;

export const moderationProposalStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "MERGED",
] as const;

export type ModerationProposalType =
  (typeof moderationProposalTypes)[number];
export type ModerationProposalStatus =
  (typeof moderationProposalStatuses)[number];

type QueueFilters = {
  proposalType: ModerationProposalType | null;
  status: ModerationProposalStatus | null;
};

function queueItem(
  proposal: {
    id: string;
    status: ModerationProposalStatus;
    createdAt: Date;
    submittedBy: { id: string; email: string | null };
  },
  proposalType: ModerationProposalType,
  summary: string,
) {
  return {
    id: proposal.id,
    proposalType,
    status: proposal.status,
    summary,
    proposer: proposal.submittedBy,
    submittedAt: proposal.createdAt.toISOString(),
    detailUrl: `/api/moderation/proposals/${proposalType}/${proposal.id}`,
  };
}

export async function listModerationProposals(filters: QueueFilters) {
  const where = filters.status ? { status: filters.status } : undefined;
  const [definitions, values, conversions] = await Promise.all([
    filters.proposalType && filters.proposalType !== "NAMED_DEFINITION"
      ? []
      : prisma.namedFaceValueDefinitionProposal.findMany({
          where,
          select: {
            id: true,
            countryCode: true,
            displayCode: true,
            status: true,
            createdAt: true,
            submittedBy: { select: { id: true, email: true } },
          },
        }),
    filters.proposalType && filters.proposalType !== "NAMED_VALUE"
      ? []
      : prisma.namedFaceValueValueProposal.findMany({
          where,
          select: {
            id: true,
            amount: true,
            effectiveOn: true,
            status: true,
            createdAt: true,
            submittedBy: { select: { id: true, email: true } },
          },
        }),
    filters.proposalType && filters.proposalType !== "FIXED_CONVERSION"
      ? []
      : prisma.currencyConversionProposal.findMany({
          where,
          select: {
            id: true,
            fromCurrencyCode: true,
            toCurrencyCode: true,
            multiplier: true,
            status: true,
            createdAt: true,
            submittedBy: { select: { id: true, email: true } },
          },
        }),
  ]);

  return [
    ...definitions.map((proposal) =>
      queueItem(
        proposal,
        "NAMED_DEFINITION",
        `${proposal.countryCode} ${proposal.displayCode}`,
      ),
    ),
    ...values.map((proposal) =>
      queueItem(
        proposal,
        "NAMED_VALUE",
        `${proposal.amount}${proposal.effectiveOn ? ` from ${proposal.effectiveOn}` : " current"}`,
      ),
    ),
    ...conversions.map((proposal) =>
      queueItem(
        proposal,
        "FIXED_CONVERSION",
        `${proposal.fromCurrencyCode} to ${proposal.toCurrencyCode} at ${proposal.multiplier}`,
      ),
    ),
  ].sort(
    (left, right) =>
      right.submittedAt.localeCompare(left.submittedAt) ||
      right.id.localeCompare(left.id),
  );
}

function sharedDetail(
  proposal: {
    id: string;
    status: ModerationProposalStatus;
    sourceUrl: string | null;
    sourceNote: string | null;
    createdAt: Date;
    submittedBy: { id: string; email: string | null };
  },
  proposalType: ModerationProposalType,
) {
  return {
    id: proposal.id,
    proposalType,
    status: proposal.status,
    proposer: proposal.submittedBy,
    submittedAt: proposal.createdAt.toISOString(),
    source: {
      url: proposal.sourceUrl,
      note: proposal.sourceNote,
    },
  };
}

async function namedDefinitionDetail(proposalId: string) {
  const proposal = await prisma.namedFaceValueDefinitionProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      targetNamedFaceValueId: true,
      countryCode: true,
      displayCode: true,
      normalizedCode: true,
      currencyCode: true,
      sourceUrl: true,
      sourceNote: true,
      status: true,
      createdAt: true,
      submittedBy: { select: { id: true, email: true } },
    },
  });
  if (!proposal) return null;

  const possibleMatches = await prisma.namedFaceValue.findMany({
    where: {
      OR: [
        {
          countryCode: proposal.countryCode,
          normalizedCode: proposal.normalizedCode,
        },
        ...(proposal.targetNamedFaceValueId
          ? [{ id: proposal.targetNamedFaceValueId }]
          : []),
      ],
    },
    select: {
      id: true,
      countryCode: true,
      displayCode: true,
      normalizedCode: true,
      valueSchedule: { select: { currencyCode: true } },
    },
    orderBy: { id: "asc" },
  });

  return {
    ...sharedDetail(proposal, "NAMED_DEFINITION"),
    proposedValues: {
      targetNamedFaceValueId: proposal.targetNamedFaceValueId,
      countryCode: proposal.countryCode,
      displayCode: proposal.displayCode,
      normalizedCode: proposal.normalizedCode,
      currencyCode: proposal.currencyCode,
    },
    possibleMatches: possibleMatches.map(({ valueSchedule, ...match }) => ({
      ...match,
      currencyCode: valueSchedule.currencyCode,
    })),
  };
}

async function namedValueDetail(proposalId: string) {
  const proposal = await prisma.namedFaceValueValueProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      namedFaceValueId: true,
      definitionProposalId: true,
      amount: true,
      effectiveOn: true,
      eligibleOn: true,
      sourceUrl: true,
      sourceNote: true,
      status: true,
      createdAt: true,
      submittedBy: { select: { id: true, email: true } },
      definitionProposal: {
        select: {
          targetNamedFaceValueId: true,
          countryCode: true,
          normalizedCode: true,
        },
      },
    },
  });
  if (!proposal) return null;

  const namedTargets = proposal.namedFaceValueId
    ? [{ id: proposal.namedFaceValueId }]
    : await prisma.namedFaceValue.findMany({
        where: {
          OR: [
            {
              countryCode: proposal.definitionProposal?.countryCode,
              normalizedCode: proposal.definitionProposal?.normalizedCode,
            },
            ...(proposal.definitionProposal?.targetNamedFaceValueId
              ? [{ id: proposal.definitionProposal.targetNamedFaceValueId }]
              : []),
          ],
        },
        select: { id: true },
      });
  const possibleMatches = await prisma.valueScheduleValue.findMany({
    where: {
      effectiveOn: proposal.effectiveOn,
      valueSchedule: {
        namedFaceValues: { some: { id: { in: namedTargets.map(({ id }) => id) } } },
      },
    },
    select: {
      id: true,
      amount: true,
      effectiveOn: true,
      valueSchedule: {
        select: {
          currencyCode: true,
          namedFaceValues: {
            select: { id: true, countryCode: true, displayCode: true },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return {
    ...sharedDetail(proposal, "NAMED_VALUE"),
    proposedValues: {
      namedFaceValueId: proposal.namedFaceValueId,
      definitionProposalId: proposal.definitionProposalId,
      amount: proposal.amount,
      effectiveOn: proposal.effectiveOn,
      eligibleOn: proposal.eligibleOn,
    },
    possibleMatches: possibleMatches.map(({ valueSchedule, ...match }) => ({
      ...match,
      currencyCode: valueSchedule.currencyCode,
      namedFaceValues: valueSchedule.namedFaceValues,
    })),
  };
}

async function fixedConversionDetail(proposalId: string) {
  const proposal = await prisma.currencyConversionProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      targetCurrencyConversionId: true,
      fromCurrencyCode: true,
      toCurrencyCode: true,
      multiplier: true,
      sourceUrl: true,
      sourceNote: true,
      status: true,
      createdAt: true,
      submittedBy: { select: { id: true, email: true } },
    },
  });
  if (!proposal) return null;

  const possibleMatches = await prisma.currencyConversion.findMany({
    where: {
      OR: [
        {
          fromCurrencyCode: proposal.fromCurrencyCode,
          toCurrencyCode: proposal.toCurrencyCode,
        },
        ...(proposal.targetCurrencyConversionId
          ? [{ id: proposal.targetCurrencyConversionId }]
          : []),
      ],
    },
    select: {
      id: true,
      fromCurrencyCode: true,
      toCurrencyCode: true,
      multiplier: true,
    },
    orderBy: { id: "asc" },
  });

  return {
    ...sharedDetail(proposal, "FIXED_CONVERSION"),
    proposedValues: {
      targetCurrencyConversionId: proposal.targetCurrencyConversionId,
      fromCurrencyCode: proposal.fromCurrencyCode,
      toCurrencyCode: proposal.toCurrencyCode,
      multiplier: proposal.multiplier,
    },
    possibleMatches,
  };
}

export function getModerationProposalDetail(
  proposalType: ModerationProposalType,
  proposalId: string,
) {
  switch (proposalType) {
    case "NAMED_DEFINITION":
      return namedDefinitionDetail(proposalId);
    case "NAMED_VALUE":
      return namedValueDetail(proposalId);
    case "FIXED_CONVERSION":
      return fixedConversionDetail(proposalId);
  }
}
