import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";

export const moderationProposalTypes = [
  "NAMED_DEFINITION",
  "NAMED_VALUE",
  "FIXED_CONVERSION",
  "POSTAL_ENTITY",
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

function sameDecimal(left: string, right: string): boolean {
  return new Prisma.Decimal(left).equals(new Prisma.Decimal(right));
}

function queueItem(
  proposal: {
    id: string;
    status: ModerationProposalStatus;
    createdAt: Date;
    submittedBy: { id: string; email: string | null } | null;
  },
  proposalType: ModerationProposalType,
  summary: string,
) {
  return {
    id: proposal.id,
    proposalType,
    status: proposal.status,
    summary,
    proposer: proposal.submittedBy ?? { id: "Deleted account", email: null },
    submittedAt: proposal.createdAt.toISOString(),
    detailUrl: `/api/moderation/proposals/${proposalType}/${proposal.id}`,
  };
}

export async function listModerationProposals(filters: QueueFilters) {
  const where = filters.status ? { status: filters.status } : undefined;
  const [definitions, values, conversions, postalEntities] = await Promise.all([
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
            namedFaceValue: {
              select: {
                valueSchedule: { select: { currencyCode: true } },
              },
            },
            definitionProposal: { select: { currencyCode: true } },
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
    filters.proposalType && filters.proposalType !== "POSTAL_ENTITY"
      ? []
      : prisma.postalEntity.findMany({
          where,
          select: {
            id: true,
            countryCode: true,
            name: true,
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
    ...values.map((proposal) => ({
      ...queueItem(proposal, "NAMED_VALUE", "Named/code schedule value"),
      amount: proposal.amount,
      currencyCode:
        proposal.namedFaceValue?.valueSchedule.currencyCode ??
        proposal.definitionProposal?.currencyCode,
      effectiveOn: proposal.effectiveOn,
    })),
    ...conversions.map((proposal) =>
      queueItem(
        proposal,
        "FIXED_CONVERSION",
        `${proposal.fromCurrencyCode} to ${proposal.toCurrencyCode} at ${proposal.multiplier}`,
      ),
    ),
    ...postalEntities.map((proposal) =>
      queueItem(
        proposal,
        "POSTAL_ENTITY",
        `${proposal.name} (${proposal.countryCode})`,
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
    submittedBy: { id: string; email: string | null } | null;
    moderatedBy: { id: string; email: string | null } | null;
    decidedAt: Date | null;
    decisionNote: string | null;
  },
  proposalType: ModerationProposalType,
) {
  return {
    id: proposal.id,
    proposalType,
    status: proposal.status,
    proposer: proposal.submittedBy ?? { id: "Deleted account", email: null },
    submittedAt: proposal.createdAt.toISOString(),
    source: {
      url: proposal.sourceUrl,
      note: proposal.sourceNote,
    },
    decision: proposal.decidedAt
      ? {
          moderator: proposal.moderatedBy,
          decidedAt: proposal.decidedAt.toISOString(),
          note: proposal.decisionNote,
        }
      : null,
  };
}

async function namedDefinitionDetail(proposalId: string) {
  const proposal = await prisma.namedFaceValueDefinitionProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      targetNamedFaceValueId: true,
      approvedNamedFaceValueId: true,
      countryCode: true,
      displayCode: true,
      normalizedCode: true,
      currencyCode: true,
      sourceUrl: true,
      sourceNote: true,
      status: true,
      createdAt: true,
      submittedBy: { select: { id: true, email: true } },
      moderatedBy: { select: { id: true, email: true } },
      decidedAt: true,
      decisionNote: true,
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
    canonicalTargetId:
      proposal.status === "MERGED" ? proposal.approvedNamedFaceValueId : null,
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
    compatibleMergeTargets: possibleMatches
      .filter(
        (match) =>
          match.countryCode === proposal.countryCode &&
          match.normalizedCode === proposal.normalizedCode &&
          match.valueSchedule.currencyCode === proposal.currencyCode,
      )
      .map(({ valueSchedule, ...match }) => ({
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
      mergedValueScheduleValueId: true,
      amount: true,
      effectiveOn: true,
      eligibleOn: true,
      sourceUrl: true,
      sourceNote: true,
      status: true,
      createdAt: true,
      submittedBy: { select: { id: true, email: true } },
      moderatedBy: { select: { id: true, email: true } },
      decidedAt: true,
      decisionNote: true,
      definitionProposal: {
        select: {
          targetNamedFaceValueId: true,
          approvedNamedFaceValueId: true,
          countryCode: true,
          normalizedCode: true,
          currencyCode: true,
        },
      },
      namedFaceValue: {
        select: {
          valueSchedule: { select: { currencyCode: true } },
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
  const mergeNamedTargetId =
    proposal.namedFaceValueId ??
    proposal.definitionProposal?.approvedNamedFaceValueId ??
    proposal.definitionProposal?.targetNamedFaceValueId ??
    null;
  const mergeCountryCode = proposal.definitionProposal?.countryCode ?? null;
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
          countryCode: true,
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
    canonicalTargetId:
      proposal.status === "MERGED"
        ? proposal.mergedValueScheduleValueId
        : null,
    proposedValues: {
      namedFaceValueId: proposal.namedFaceValueId,
      definitionProposalId: proposal.definitionProposalId,
      amount: proposal.amount,
      currencyCode:
        proposal.namedFaceValue?.valueSchedule.currencyCode ??
        proposal.definitionProposal?.currencyCode,
      effectiveOn: proposal.effectiveOn,
      eligibleOn: proposal.eligibleOn,
    },
    possibleMatches: possibleMatches.map(({ valueSchedule, ...match }) => ({
      ...match,
      currencyCode: valueSchedule.currencyCode,
      namedFaceValues: valueSchedule.namedFaceValues,
    })),
    compatibleMergeTargets: possibleMatches
      .filter(
        (match) =>
          mergeNamedTargetId !== null &&
          sameDecimal(match.amount, proposal.amount) &&
          (mergeCountryCode === null ||
            match.valueSchedule.countryCode === mergeCountryCode) &&
          match.valueSchedule.namedFaceValues.some(
            (definition) => definition.id === mergeNamedTargetId,
          ),
      )
      .map(({ valueSchedule, ...match }) => ({
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
      moderatedBy: { select: { id: true, email: true } },
      decidedAt: true,
      decisionNote: true,
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
    canonicalTargetId:
      proposal.status === "MERGED"
        ? proposal.targetCurrencyConversionId
        : null,
    proposedValues: {
      targetCurrencyConversionId: proposal.targetCurrencyConversionId,
      fromCurrencyCode: proposal.fromCurrencyCode,
      toCurrencyCode: proposal.toCurrencyCode,
      multiplier: proposal.multiplier,
    },
    possibleMatches,
    compatibleMergeTargets: possibleMatches.filter(
      (match) =>
        match.fromCurrencyCode === proposal.fromCurrencyCode &&
        match.toCurrencyCode === proposal.toCurrencyCode &&
        sameDecimal(match.multiplier, proposal.multiplier),
    ),
  };
}

async function postalEntityDetail(proposalId: string) {
  const proposal = await prisma.postalEntity.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      name: true,
      normalizedName: true,
      countryCode: true,
      issuingAuthority: true,
      scope: true,
      sourceUrl: true,
      sourceNote: true,
      submittedName: true,
      submittedNormalizedName: true,
      submittedCountryCode: true,
      submittedIssuingAuthority: true,
      submittedScope: true,
      submittedSourceUrl: true,
      submittedSourceNote: true,
      status: true,
      mergedIntoId: true,
      createdAt: true,
      submittedBy: { select: { id: true, email: true } },
      moderatedBy: { select: { id: true, email: true } },
      decidedAt: true,
      decisionNote: true,
    },
  });
  if (!proposal) return null;
  const possibleMatches = await prisma.postalEntity.findMany({
    where: {
      status: "APPROVED",
      id: { not: proposal.id },
    },
    select: {
      id: true,
      name: true,
      countryCode: true,
      issuingAuthority: true,
      scope: true,
    },
    orderBy: [{ countryCode: "asc" }, { name: "asc" }, { id: "asc" }],
  });
  return {
    ...sharedDetail(
      {
        ...proposal,
        sourceUrl: proposal.submittedSourceUrl,
        sourceNote: proposal.submittedSourceNote,
      },
      "POSTAL_ENTITY",
    ),
    canonicalTargetId: proposal.status === "MERGED" ? proposal.mergedIntoId : null,
    proposedValues: {
      postalEntityName: proposal.submittedName,
      normalizedPostalEntityName: proposal.submittedNormalizedName,
      countryCode: proposal.submittedCountryCode,
      issuingAuthority: proposal.submittedIssuingAuthority,
      scope: proposal.submittedScope,
      sourceUrl: proposal.submittedSourceUrl,
      sourceNote: proposal.submittedSourceNote,
    },
    currentValues: {
      postalEntityName: proposal.name,
      normalizedPostalEntityName: proposal.normalizedName,
      countryCode: proposal.countryCode,
      issuingAuthority: proposal.issuingAuthority,
      scope: proposal.scope,
      sourceUrl: proposal.sourceUrl,
      sourceNote: proposal.sourceNote,
    },
    possibleMatches,
    compatibleMergeTargets: possibleMatches,
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
    case "POSTAL_ENTITY":
      return postalEntityDetail(proposalId);
  }
}
