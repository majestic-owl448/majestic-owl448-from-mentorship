import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  ProposalAlreadyDecidedError,
  ProposalNotFoundError,
} from "@/lib/moderationApproval";
import type { ModerationProposalType } from "@/lib/moderationProposals";

export class MergeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MergeInputError";
  }
}

export class MergeTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MergeTargetError";
  }
}

export function validateMergeTargetId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MergeInputError("Select a compatible merge target.");
  }
  return value.trim();
}

type Transaction = Prisma.TransactionClient;

function sameDecimal(left: string, right: string): boolean {
  return new Prisma.Decimal(left).equals(new Prisma.Decimal(right));
}

async function mergeDefinition(
  tx: Transaction,
  proposalId: string,
  targetId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  const claimed = await tx.namedFaceValueDefinitionProposal.updateMany({
    where: { id: proposalId, status: "PENDING" },
    data: {
      status: "MERGED",
      moderatedById: moderatorId,
      decidedAt,
      decisionNote,
    },
  });
  if (claimed.count !== 1) {
    const proposal = await tx.namedFaceValueDefinitionProposal.findUnique({
      where: { id: proposalId },
      select: { id: true },
    });
    if (!proposal) throw new ProposalNotFoundError();
    throw new ProposalAlreadyDecidedError();
  }

  const [proposal, target] = await Promise.all([
    tx.namedFaceValueDefinitionProposal.findUniqueOrThrow({
      where: { id: proposalId },
    }),
    tx.namedFaceValue.findUnique({
      where: { id: targetId },
      include: { valueSchedule: true },
    }),
  ]);
  if (
    !target ||
    target.countryCode !== proposal.countryCode ||
    target.normalizedCode !== proposal.normalizedCode ||
    target.valueSchedule.currencyCode !== proposal.currencyCode
  ) {
    throw new MergeTargetError(
      "The selected definition does not match the proposed country, code, and currency.",
    );
  }

  await tx.stampInventoryEntry.updateMany({
    where: {
      userId: proposal.submittedById,
      namedFaceValueProposalId: proposal.id,
    },
    data: {
      namedFaceValueId: target.id,
      namedFaceValueProposalId: null,
    },
  });
  await tx.namedFaceValueValueProposal.updateMany({
    where: {
      submittedById: proposal.submittedById,
      definitionProposalId: proposal.id,
    },
    data: {
      namedFaceValueId: target.id,
      definitionProposalId: null,
    },
  });
  await tx.namedFaceValueDefinitionProposal.update({
    where: { id: proposal.id },
    data: { approvedNamedFaceValueId: target.id },
  });
}

async function mergeValue(
  tx: Transaction,
  proposalId: string,
  targetId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  const claimed = await tx.namedFaceValueValueProposal.updateMany({
    where: { id: proposalId, status: "PENDING" },
    data: {
      status: "MERGED",
      moderatedById: moderatorId,
      decidedAt,
      decisionNote,
    },
  });
  if (claimed.count !== 1) {
    const proposal = await tx.namedFaceValueValueProposal.findUnique({
      where: { id: proposalId },
      select: { id: true },
    });
    if (!proposal) throw new ProposalNotFoundError();
    throw new ProposalAlreadyDecidedError();
  }

  const [proposal, target] = await Promise.all([
    tx.namedFaceValueValueProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: {
        definitionProposal: {
          select: {
            approvedNamedFaceValueId: true,
            targetNamedFaceValueId: true,
          },
        },
      },
    }),
    tx.valueScheduleValue.findUnique({
      where: { id: targetId },
      include: {
        valueSchedule: {
          include: { namedFaceValues: { select: { id: true } } },
        },
      },
    }),
  ]);
  const namedFaceValueId =
    proposal.namedFaceValueId ??
    proposal.definitionProposal?.approvedNamedFaceValueId ??
    proposal.definitionProposal?.targetNamedFaceValueId;
  if (!namedFaceValueId) {
    throw new MergeTargetError(
      "Merge or approve the linked named definition before merging its value.",
    );
  }
  if (
    !target ||
    target.effectiveOn !== proposal.effectiveOn ||
    !sameDecimal(target.amount, proposal.amount) ||
    !target.valueSchedule.namedFaceValues.some(
      (definition) => definition.id === namedFaceValueId,
    )
  ) {
    throw new MergeTargetError(
      "The selected schedule value does not match the proposed definition, amount, and effective date.",
    );
  }
  await tx.namedFaceValueValueProposal.update({
    where: { id: proposal.id },
    data: { mergedValueScheduleValueId: target.id },
  });
}

async function mergeConversion(
  tx: Transaction,
  proposalId: string,
  targetId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  const claimed = await tx.currencyConversionProposal.updateMany({
    where: { id: proposalId, status: "PENDING" },
    data: {
      status: "MERGED",
      moderatedById: moderatorId,
      decidedAt,
      decisionNote,
    },
  });
  if (claimed.count !== 1) {
    const proposal = await tx.currencyConversionProposal.findUnique({
      where: { id: proposalId },
      select: { id: true },
    });
    if (!proposal) throw new ProposalNotFoundError();
    throw new ProposalAlreadyDecidedError();
  }

  const [proposal, target] = await Promise.all([
    tx.currencyConversionProposal.findUniqueOrThrow({
      where: { id: proposalId },
    }),
    tx.currencyConversion.findUnique({ where: { id: targetId } }),
  ]);
  if (
    !target ||
    target.fromCurrencyCode !== proposal.fromCurrencyCode ||
    target.toCurrencyCode !== proposal.toCurrencyCode ||
    !sameDecimal(target.multiplier, proposal.multiplier)
  ) {
    throw new MergeTargetError(
      "The selected conversion does not match the proposed currency pair and multiplier.",
    );
  }
  await tx.currencyConversionProposal.update({
    where: { id: proposal.id },
    data: { targetCurrencyConversionId: target.id },
  });
}

export async function mergeModerationProposal(
  proposalType: ModerationProposalType,
  proposalId: string,
  targetId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt = new Date(),
) {
  await prisma.$transaction(async (tx) => {
    switch (proposalType) {
      case "NAMED_DEFINITION":
        await mergeDefinition(
          tx,
          proposalId,
          targetId,
          moderatorId,
          decisionNote,
          decidedAt,
        );
        return;
      case "NAMED_VALUE":
        await mergeValue(
          tx,
          proposalId,
          targetId,
          moderatorId,
          decisionNote,
          decidedAt,
        );
        return;
      case "FIXED_CONVERSION":
        await mergeConversion(
          tx,
          proposalId,
          targetId,
          moderatorId,
          decisionNote,
          decidedAt,
        );
    }
  });
}
